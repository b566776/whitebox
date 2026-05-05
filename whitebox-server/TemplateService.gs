/**
 * ========================================================
 *  Whitebox — TemplateService.gs (Servidor)
 *  Módulo de Distribuição de Doc Templates
 * ========================================================
 *
 * RESPONSABILIDADES:
 *   1. Admin → Professor: distribuir um Doc Template para
 *      um ou mais professores cadastrados (makeCopy + share).
 *   2. Professor → Turma/Aluno: criar "Levas" de cópias do
 *      template para alunos via Google Classroom (STUDENT_COPY).
 *
 * SEGURANÇA:
 *   - Funções Admin exigem validateAdminAccess(token).
 *   - Funções Professor exigem professorEmail registrado na
 *     planilha global (buscarRegistroProfessor).
 *   - Alunos nunca chegam a este módulo (bloqueio na Sidebar).
 *
 * PERSISTÊNCIA:
 *   - Distribuições Admin → aba "Historico_Templates" na Planilha Global.
 *   - Levas Professor → aba "Levas" na planilha individual do professor.
 *
 * LIMITES DO APPS SCRIPT:
 *   - Execuções limitadas a ~6 min; levas grandes são processadas
 *     em batches de MAX_ALUNOS_POR_EXECUCAO para não estourar.
 *   - O cliente pode fazer polling via ROUTE_STATUS_LEVA.
 */

// =====================================================
//  CONSTANTES LOCAIS DO MÓDULO
// =====================================================

/** Máximo de docs de alunos criados por execução (limite seguro Apps Script) */
const MAX_ALUNOS_POR_EXECUCAO = 30;

/** Nome da aba de histórico de distribuições Admin na Planilha Global */
const SHEET_HISTORICO_TEMPLATES = 'Historico_Templates';

/** Nome da aba de levas na planilha individual do professor */
const SHEET_LEVAS = 'Levas';

/** Cabeçalhos da aba Historico_Templates */
const HEADERS_HISTORICO_TEMPLATES = [
  'ID_Distribuicao', 'Admin_Email', 'Template_ID', 'Template_Nome',
  'Destinatarios', 'Docs_Criados', 'Falhas', 'Mensagem', 'Data_Criacao'
];

/** Cabeçalhos da aba Levas do professor */
const HEADERS_LEVAS = [
  'ID_Leva', 'Template_ID', 'Template_Nome', 'Titulo_Atividade',
  'Course_ID', 'Course_Nome', 'Assignment_ID', 'Total_Alunos',
  'Docs_Criados', 'Prazo', 'Instrucoes', 'Data_Criacao'
];


// =====================================================
//  HANDLER: Listar Templates Disponíveis (Admin)
// =====================================================

/**
 * Retorna a lista de templates disponíveis no Drive do Admin.
 * Busca arquivos Google Docs na pasta "whitebox/templates".
 *
 * Chamado via doPost com route = ROUTE_LISTAR_TEMPLATES.
 *
 * @param {object} body  - { token }
 * @param {object} cfg   - getConfig()
 */
function handleListarTemplates(body, cfg) {
  validateAdminAccess(body.token);

  try {
    const folder = getOrCreateTemplatesFolder();
    const files  = folder.getFilesByType(MimeType.GOOGLE_DOCS);
    const templates = [];

    while (files.hasNext()) {
      const f = files.next();
      templates.push({
        id:          f.getId(),
        nome:        f.getName(),
        url:         f.getUrl(),
        dataCriacao: f.getDateCreated().toISOString(),
        tamanho:     f.getSize()
      });
    }

    return jsonResponse({ success: true, templates });

  } catch (err) {
    Logger.log('[TemplateService] handleListarTemplates erro: ' + err);
    return jsonResponse({ error: 'LISTAR_TEMPLATES_FALHOU', message: err.toString() }, 500);
  }
}


// =====================================================
//  HANDLER: Distribuir Template Admin → Professores
// =====================================================

/**
 * Copia um Doc Template para o Drive de cada professor destinatário.
 * Registra o resultado no Historico_Templates da Planilha Global.
 *
 * Chamado via doPost com route = ROUTE_DISTRIBUIR_TEMPLATE.
 *
 * Payload esperado:
 * {
 *   token:         string,
 *   templateId:    string,          // Google Doc ID do template
 *   destinatarios: string[],        // emails dos professores
 *   mensagem:      string,          // mensagem opcional no e-mail
 *   notificarEmail: boolean         // true para enviar e-mail de notificação
 * }
 */
function handleDistribuirTemplate(body, cfg) {
  validateAdminAccess(body.token);

  const { templateId, destinatarios, mensagem, notificarEmail } = body;

  if (!templateId) {
    return jsonResponse({ error: 'TEMPLATE_ID_OBRIGATORIO' }, 400);
  }
  if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
    return jsonResponse({ error: 'DESTINATARIOS_OBRIGATORIOS' }, 400);
  }

  // Validar cada email antes de executar qualquer ação
  for (const email of destinatarios) {
    try {
      validarEmail(email);
    } catch (e) {
      return jsonResponse({ error: 'EMAIL_INVALIDO', email, message: e.message }, 400);
    }
  }

  let templateFile;
  try {
    templateFile = DriveApp.getFileById(templateId);
  } catch (e) {
    return jsonResponse({ error: 'TEMPLATE_NAO_ENCONTRADO', message: e.toString() }, 404);
  }

  const templateNome  = templateFile.getName();
  const adminEmail    = Session.getActiveUser().getEmail();
  const resultados    = [];
  let   docsCriados   = 0;
  let   falhas        = 0;
  const pastaDestino  = getOrCreateTemplatesFolder(); // pasta admin para referência

  const TIME_LIMIT_MS = 4.5 * 60 * 1000; // 4.5 minutos
  const startTime = Date.now();
  const pendentes = [];

  for (const email of destinatarios) {
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      pendentes.push(email);
      continue;
    }

    try {
      // 1. Copiar template para pasta do professor no Drive
      const pastaProfessor = _getOrCreatePastaProfessor(email);
      const nomeCopia      = templateNome + ' — ' + email;
      const copia          = templateFile.makeCopy(nomeCopia, pastaProfessor);

      // 2. Injetar DeveloperMetadata de Auto-Configuração [ARCH-LIB]
      try {
        const configObj = {
          proxyUrl:    cfg.proxyUrl,
          sharedToken: cfg.sharedToken
        };
        const doc = DocumentApp.openById(copia.getId());
        doc.addDeveloperMetadata('WHITEBOX_CONFIG', JSON.stringify(configObj));
      } catch (metaErr) {
        Logger.log('[TemplateService] Erro ao injetar metadados: ' + metaErr);
      }

      // 3. Compartilhar com o professor como editor
      copia.addEditor(email);

      // 4. Notificar por e-mail (opcional)
      if (notificarEmail !== false) {
        _enviarEmailTemplate(email, templateNome, copia.getUrl(), mensagem);
      }

      docsCriados++;
      resultados.push({ email, status: 'ok', url: copia.getUrl(), docId: copia.getId() });
      Logger.log('[TemplateService] Template distribuído para: ' + email);

    } catch (err) {
      falhas++;
      resultados.push({ email, status: 'erro', message: err.toString() });
      Logger.log('[TemplateService] Falha ao distribuir para ' + email + ': ' + err);
    }
  }

  // 4. Registrar no histórico da Planilha Global
  const idDistribuicao = _registrarHistoricoDistribuicao({
    adminEmail,
    templateId,
    templateNome,
    destinatarios: destinatarios.filter(e => !pendentes.includes(e)), // apenas os processados
    docsCriados,
    falhas,
    mensagem: mensagem || '',
    cfg
  });

  return jsonResponse({
    success:       true,
    idDistribuicao,
    templateNome,
    docsCriados,
    falhas,
    resultados,
    hasMore: pendentes.length > 0,
    pendentes
  });
}


// =====================================================
//  HANDLER: Listar Turmas do Professor (via Classroom)
// =====================================================

/**
 * Retorna as turmas do Google Classroom onde o professor é docente.
 * Inclui contagem de alunos por turma.
 *
 * Chamado via doPost com route = ROUTE_LISTAR_TURMAS_PROFESSOR.
 *
 * Payload: { token, professorEmail }
 */
function handleListarTurmasProfessor(body, cfg) {
  const { professorEmail } = body;
  if (!professorEmail) {
    return jsonResponse({ error: 'EMAIL_OBRIGATORIO' }, 400);
  }

  // Verificar professor registrado
  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  if (!registro) {
    return jsonResponse({ error: 'PROFESSOR_NAO_CADASTRADO' }, 403);
  }

  try {
    // Buscar turmas onde o professor é owner/teacher (executa como: o Add-on)
    const turmas = getClassroomCourses(); // reutiliza ClassroomService.gs

    // Enriquecer com contagem de alunos (paginado)
    const turmasEnriquecidas = turmas.map(turma => {
      let totalAlunos = 0;
      try {
        let pageToken = null;
        do {
          const resp = Classroom.Courses.Students.list(turma.id, {
            pageSize: 100,
            pageToken
          });
          totalAlunos += (resp.students || []).length;
          pageToken = resp.nextPageToken;
        } while (pageToken);
      } catch (e) {
        Logger.log('[TemplateService] Erro ao contar alunos da turma ' + turma.id + ': ' + e);
      }
      return { ...turma, totalAlunos };
    });

    return jsonResponse({ success: true, turmas: turmasEnriquecidas });

  } catch (err) {
    Logger.log('[TemplateService] handleListarTurmasProfessor erro: ' + err);
    return jsonResponse({ error: 'LISTAR_TURMAS_FALHOU', message: err.toString() }, 500);
  }
}


// =====================================================
//  HANDLER: Criar Leva — Professor → Turma(s)/Alunos
// =====================================================

/**
 * Cria uma atividade no Google Classroom a partir de um template,
 * gerando cópia individual por aluno (STUDENT_COPY).
 * Registra a leva na planilha individual do professor.
 *
 * Chamado via doPost com route = ROUTE_CRIAR_LEVA_TEMPLATE.
 *
 * Payload:
 * {
 *   token:           string,
 *   professorEmail:  string,
 *   templateDocId:   string,
 *   turmas:          string[],
 *   titulo:          string,
 *   instrucoes:      string,
 *   prazo:           string,
 *   executionId:     string           // Opcional, para polling
 * }
 */
function handleCriarLevaTemplate(body, cfg) {
  const { professorEmail, templateDocId, turmas, titulo, instrucoes, prazo, executionId } = body;

  if (!professorEmail) return jsonResponse({ error: 'EMAIL_OBRIGATORIO' }, 400);
  if (!templateDocId)  return jsonResponse({ error: 'TEMPLATE_ID_OBRIGATORIO' }, 400);
  if (!Array.isArray(turmas) || turmas.length === 0) {
    return jsonResponse({ error: 'TURMAS_OBRIGATORIAS' }, 400);
  }
  if (!titulo || titulo.trim().length === 0) {
    return jsonResponse({ error: 'TITULO_OBRIGATORIO' }, 400);
  }

  // Helper para atualizar status no cache
  const updateStatus = (pct, msg) => {
    if (!executionId) return;
    try {
      CacheService.getUserCache().put('WB_DIST_' + executionId, JSON.stringify({ pct, msg }), 600);
    } catch (e) {}
  };

  updateStatus(5, 'Validando professor...');

  // Verificar professor registrado
  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  if (!registro) {
    return jsonResponse({ error: 'PROFESSOR_NAO_CADASTRADO' }, 403);
  }

  updateStatus(10, 'Acessando template...');

  // Verificar template acessível
  let templateFile;
  try {
    templateFile = DriveApp.getFileById(templateDocId);
  } catch (e) {
    return jsonResponse({ error: 'TEMPLATE_NAO_ENCONTRADO', message: e.toString() }, 404);
  }
  const templateNome = templateFile.getName();

  const resultadosPorTurma = [];
  let   totalDocsCriados   = 0;

  for (let i = 0; i < turmas.length; i++) {
    const courseId = turmas[i];
    const progressoAtual = 15 + Math.floor((i / turmas.length) * 80);
    updateStatus(progressoAtual, 'Processando turma ' + (i + 1) + ' de ' + turmas.length + '...');

    try {
      // Montar objeto de tarefa para o Classroom
      const courseWorkResource = _buildCourseWorkResource(
        titulo, instrucoes, templateDocId, prazo
      );

      // Criar atividade no Classroom
      const assignment = Classroom.Courses.CourseWork.create(courseWorkResource, courseId);

      // Buscar nome da turma para log legível
      let courseNome = courseId;
      try {
        const course = Classroom.Courses.get(courseId);
        courseNome = course.name + (course.section ? ' — ' + course.section : '');
      } catch (e) {}

      // Registrar na Planilha Global (Tarefas_Globais) para heatmap e auditoria
      registrarTarefaGlobal(assignment.id, titulo, courseId, body.token);

      // Registrar na planilha individual do professor (aba Levas)
      const idLeva = _registrarLevasProfessor({
        registro,
        templateDocId,
        templateNome,
        titulo,
        courseId,
        courseNome,
        assignmentId:   assignment.id,
        prazo:          prazo || '',
        instrucoes:     instrucoes || ''
      });

      // Contar alunos na turma (para relatório)
      let totalAlunos = 0;
      try {
        const resp = Classroom.Courses.Students.list(courseId, { pageSize: 100 });
        totalAlunos = (resp.students || []).length;
      } catch (e) {}

      totalDocsCriados += totalAlunos;
      resultadosPorTurma.push({
        courseId,
        courseNome,
        assignmentId:  assignment.id,
        assignmentUrl: assignment.alternateLink,
        totalAlunos,
        status:        'ok'
      });

      Logger.log('[TemplateService] Leva criada. Course: ' + courseId +
                 ', Assignment: ' + assignment.id + ', Alunos: ' + totalAlunos);

    } catch (err) {
      Logger.log('[TemplateService] Erro ao criar leva para turma ' + courseId + ': ' + err);
      resultadosPorTurma.push({ courseId, status: 'erro', message: err.toString() });
    }
  }

  updateStatus(100, 'Distribuição concluída.');

  return jsonResponse({
    success:            true,
    titulo,
    templateNome,
    turmasProcessadas:  resultadosPorTurma.length,
    docsCriados:        totalDocsCriados,
    resultadosPorTurma
  });
}

// =====================================================
//  HANDLER: Status da Distribuição (Polling)
// =====================================================

/**
 * Retorna o status de uma execução de distribuição a partir do CacheService.
 * Chamado via doPost com route = ROUTE_STATUS_DISTRIBUICAO.
 *
 * Payload: { executionId: string }
 */
function handleStatusDistribuicao(body, cfg) {
  const { executionId } = body;
  if (!executionId) {
    return jsonResponse({ error: 'EXECUTION_ID_OBRIGATORIO' }, 400);
  }

  try {
    const statusRaw = CacheService.getUserCache().get('WB_DIST_' + executionId);
    if (!statusRaw) {
      return jsonResponse({ success: true, pct: 0, msg: 'Aguardando início...' });
    }
    const status = JSON.parse(statusRaw);
    return jsonResponse({ success: true, pct: status.pct, msg: status.msg });
  } catch (err) {
    return jsonResponse({ error: 'FALHA_CACHE', message: err.toString() }, 500);
  }
}


// =====================================================
//  HANDLER: Histórico de Distribuições (Admin)
// =====================================================

/**
 * Retorna o histórico de distribuições de templates feitas pelo Admin.
 * Chamado via doPost com route = ROUTE_HISTORICO_TEMPLATES.
 *
 * @param {object} body - { token }
 */
function handleHistoricoTemplates(body, cfg) {
  validateAdminAccess(body.token);

  try {
    const ss    = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
    const sheet = ss.getSheetByName(SHEET_HISTORICO_TEMPLATES);

    if (!sheet || sheet.getLastRow() < 2) {
      return jsonResponse({ success: true, historico: [] });
    }

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const historico = [];

    for (let i = 1; i < data.length; i++) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = data[i][idx]; });
      historico.push(row);
    }

    return jsonResponse({ success: true, historico: historico.reverse() }); // mais recente primeiro

  } catch (err) {
    Logger.log('[TemplateService] handleHistoricoTemplates erro: ' + err);
    return jsonResponse({ error: 'HISTORICO_FALHOU', message: err.toString() }, 500);
  }
}


// =====================================================
//  HELPERS INTERNOS
// =====================================================

/**
 * Constrói o objeto CourseWork para criação no Classroom.
 * @private
 */
function _buildCourseWorkResource(titulo, instrucoes, templateDocId, prazo) {
  const resource = {
    title:       titulo,
    description: instrucoes || 'Abra o documento e trabalhe diretamente nele com o add-on Whitebox ativo.',
    workType:    'ASSIGNMENT',
    state:       'PUBLISHED',
    materials: [
      {
        driveFile: {
          driveFile: { id: templateDocId },
          shareMode: 'STUDENT_COPY'  // cada aluno recebe sua cópia privada
        }
      }
    ]
  };

  // Prazo (dueDate/dueTime) — opcional
  if (prazo) {
    try {
      const dt = new Date(prazo);
      resource.dueDate = {
        year:  dt.getFullYear(),
        month: dt.getMonth() + 1,
        day:   dt.getDate()
      };
      resource.dueTime = {
        hours:   dt.getHours(),
        minutes: dt.getMinutes(),
        seconds: 0,
        nanos:   0
      };
    } catch (e) {
      Logger.log('[TemplateService] Prazo inválido ignorado: ' + prazo);
    }
  }

  return resource;
}

/**
 * Registra uma distribuição Admin no Historico_Templates da Planilha Global.
 * Cria a aba se ainda não existir.
 * @private
 */
function _registrarHistoricoDistribuicao({ adminEmail, templateId, templateNome,
                                           destinatarios, docsCriados, falhas,
                                           mensagem, cfg }) {
  try {
    const ss    = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
    let   sheet = ss.getSheetByName(SHEET_HISTORICO_TEMPLATES);

    // Criar aba se necessário
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_HISTORICO_TEMPLATES);
      sheet.appendRow(HEADERS_HISTORICO_TEMPLATES);
      sheet.getRange(1, 1, 1, HEADERS_HISTORICO_TEMPLATES.length).setFontWeight('bold');
    }

    const idDistribuicao = 'DIST-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    sheet.appendRow([
      idDistribuicao,
      adminEmail,
      templateId,
      templateNome,
      destinatarios.join(', '),
      docsCriados,
      falhas,
      mensagem,
      new Date().toISOString()
    ]);

    return idDistribuicao;

  } catch (err) {
    Logger.log('[TemplateService] _registrarHistoricoDistribuicao erro: ' + err);
    return 'ERRO_AO_REGISTRAR';
  }
}

/**
 * Registra uma Leva criada pelo professor na aba Levas da sua planilha individual.
 * Cria a aba se ainda não existir.
 * @private
 */
function _registrarLevasProfessor({ registro, templateDocId, templateNome,
                                    titulo, courseId, courseNome, assignmentId,
                                    prazo, instrucoes }) {
  try {
    if (!registro || !registro.spreadsheetId) {
      Logger.log('[TemplateService] _registrarLevasProfessor: planilha do professor não encontrada.');
      return null;
    }

    const ss    = SpreadsheetApp.openById(registro.spreadsheetId);
    let   sheet = ss.getSheetByName(SHEET_LEVAS);

    // Criar aba se necessário
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_LEVAS);
      sheet.appendRow(HEADERS_LEVAS);
      sheet.getRange(1, 1, 1, HEADERS_LEVAS.length).setFontWeight('bold');
    }

    const idLeva = 'LEVA-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    sheet.appendRow([
      idLeva,
      templateDocId,
      templateNome,
      titulo,
      courseId,
      courseNome,
      assignmentId,
      '',          // Total_Alunos — preenchido após confirmação
      '',          // Docs_Criados — preenchido pelo Classroom (STUDENT_COPY é assíncrono)
      prazo,
      instrucoes,
      new Date().toISOString()
    ]);

    return idLeva;

  } catch (err) {
    Logger.log('[TemplateService] _registrarLevasProfessor erro: ' + err);
    return null;
  }
}

/**
 * Retorna (ou cria) a pasta "whitebox/templates" no Drive do Admin.
 * @private
 */
function getOrCreateTemplatesFolder() {
  const rootFolders = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER_NAME);
  let root;
  if (rootFolders.hasNext()) {
    root = rootFolders.next();
  } else {
    root = DriveApp.createFolder(DRIVE_ROOT_FOLDER_NAME);
  }

  const subFolders = root.getFoldersByName('templates');
  if (subFolders.hasNext()) {
    return subFolders.next();
  }
  return root.createFolder('templates');
}

/**
 * Retorna (ou cria) a pasta "whitebox/templates" no Drive do professor.
 * Se o professor não tiver a pasta, ela é criada no root do seu Drive.
 * @private
 */
function _getOrCreatePastaProfessor(email) {
  // Tentamos colocar na pasta root "whitebox" — a execução é feita como Admin
  // então DriveApp.createFolder cria na raiz do Drive do Admin.
  // O arquivo é compartilhado com o professor via addEditor().
  // Esta é a limitação do Apps Script: não é possível criar no Drive de outro usuário.
  const rootFolders = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER_NAME);
  let root;
  if (rootFolders.hasNext()) {
    root = rootFolders.next();
  } else {
    root = DriveApp.createFolder(DRIVE_ROOT_FOLDER_NAME);
  }

  const nomePasta    = 'Distribucoes';
  const subFolders   = root.getFoldersByName(nomePasta);
  let   pastaDistrib = subFolders.hasNext()
    ? subFolders.next()
    : root.createFolder(nomePasta);
  // Sub-pasta por professor (usa o e-mail exato)
  const profFolders = pastaDistrib.getFoldersByName(email);
  return profFolders.hasNext()
    ? profFolders.next()
    : pastaDistrib.createFolder(email);
}

/**
 * Envia e-mail de notificação ao professor quando recebe um template.
 * @private
 */
function _enviarEmailTemplate(email, templateNome, templateUrl, mensagemAdmin) {
  try {
    const subject = '📄 [Whitebox] Novo template disponível: ' + templateNome;
    let body = 'Olá!\n\n';

    if (mensagemAdmin && mensagemAdmin.trim().length > 0) {
      body += '💬 Mensagem do administrador:\n' + mensagemAdmin.trim() + '\n\n';
    }

    body += 'Um novo template foi disponibilizado para você no Whitebox:\n';
    body += '📄 ' + templateNome + '\n';
    body += '🔗 Link: ' + templateUrl + '\n\n';
    body += 'Para distribuir este template para suas turmas:\n';
    body += '1. Abra o documento no Google Docs\n';
    body += '2. Acesse o add-on Whitebox na barra lateral\n';
    body += '3. Clique na aba "📤 Distribuir"\n';
    body += '4. Selecione as turmas e clique em "Distribuir Levas"\n\n';
    body += 'Whitebox — Sistema de Auditoria de Autoria Pedagógica';

    MailApp.sendEmail(email, subject, body);
    Logger.log('[TemplateService] E-mail enviado para: ' + email);
  } catch (e) {
    Logger.log('[TemplateService] Falha ao enviar e-mail para ' + email + ': ' + e);
    // Não relançar — falha de e-mail não deve interromper a distribuição
  }
}
