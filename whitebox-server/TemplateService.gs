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
 * Busca arquivos Google Docs na pasta "WhiteBox/templates".
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

      // 2. Gravar a Auto-Configuração no documento [ARCH-LIB]
      try {
        _gravarConfigNoDocumento(copia.getId(), email); // [AUTH-01 FIX] Designa explicitamente o professor
      } catch (metaErr) {
        Logger.log('[TemplateService] Erro ao gravar configuração no documento: ' + metaErr);
      }

      // 3. Compartilhar com o professor como dono (para ficar no Meu Drive dele)
      try {
        copia.setOwner(email);
      } catch (e) {
        // Fallback caso a transferência de propriedade entre domínios seja bloqueada
        copia.addEditor(email);
      }

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
    // Usar o oauthToken do professor para listar os cursos DELE, não os do Admin.
    // O servidor roda como USER_DEPLOYING (Admin), portanto getClassroomCourses()
    // retornaria apenas os cursos do Admin — o que não é o que queremos.
    const { oauthToken } = body;
    const turmas = oauthToken
      ? _getClassroomCoursesViaOAuth(oauthToken)
      : getClassroomCourses(); // fallback legado (Admin)

    // Enriquecer com contagem de alunos
    const turmasEnriquecidas = turmas.map(turma => {
      let totalAlunos = 0;
      try {
        if (oauthToken) {
          totalAlunos = _listStudentsViaOAuth(oauthToken, turma.id);
        } else {
          let pageToken = null;
          do {
            const resp = Classroom.Courses.Students.list(turma.id, { pageSize: 100, pageToken });
            totalAlunos += (resp.students || []).length;
            pageToken = resp.nextPageToken;
          } while (pageToken);
        }
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

  // ── Injetar configuração no template ANTES de criar as cópias ──────────
  // O NamedRange faz parte do conteúdo e acompanha o STUDENT_COPY do Classroom,
  // então cada cópia de aluno carrega o professor designado.
  // Nem o SHARED_TOKEN nem a URL do proxy vão no documento.
  try {
    _gravarConfigNoDocumento(templateDocId, professorEmail);
    Logger.log('[TemplateService] WHITEBOX_CONFIG gravado no template: ' + templateDocId);
  } catch (metaErr) {
    Logger.log('[TemplateService] Aviso: falha ao gravar configuração no template: ' + metaErr);
    // Não interromper — o Classroom cria a atividade mesmo sem a configuração
  }
  // ───────────────────────────────────────────────────────────────────────



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

      // Criar atividade no Classroom como o PROFESSOR (via oauthToken),
      // não como Admin. Isso garante que a atividade apareça nos cursos
      // do professor e seja visível para os alunos matriculados neles.
      const { oauthToken } = body;
      const assignment = oauthToken
        ? _createCourseWorkViaOAuth(oauthToken, courseId, courseWorkResource)
        : Classroom.Courses.CourseWork.create(courseWorkResource, courseId);

      // Buscar nome da turma para log legível
      let courseNome = courseId;
      try {
        if (oauthToken) {
          const courseResp = UrlFetchApp.fetch(
            'https://classroom.googleapis.com/v1/courses/' + encodeURIComponent(courseId),
            { headers: { 'Authorization': 'Bearer ' + oauthToken }, muteHttpExceptions: true }
          );
          if (courseResp.getResponseCode() === 200) {
            const c = JSON.parse(courseResp.getContentText());
            courseNome = c.name + (c.section ? ' — ' + c.section : '');
          }
        } else {
          const course = Classroom.Courses.get(courseId);
          courseNome = course.name + (course.section ? ' — ' + course.section : '');
        }
      } catch (e) {}

      // Registrar na Planilha Global (Tarefas_Globais) — passa professorEmail explicitamente
      // [FIX] Session.getActiveUser().getEmail() retorna '' em doPost com acesso anônimo.
      registrarTarefaGlobal(assignment.id, titulo, courseId, body.token, professorEmail);

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
        totalAlunos = oauthToken
          ? _listStudentsViaOAuth(oauthToken, courseId)
          : (() => {
              const resp = Classroom.Courses.Students.list(courseId, { pageSize: 100 });
              return (resp.students || []).length;
            })();
      } catch (e) {
        Logger.log('[TemplateService] Erro ao contar alunos em ' + courseId + ': ' + e);
      }

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
 * Grava no documento o professor designado, lido pelo cliente em getDesignatedProfessors().
 *
 * O Docs não tem DeveloperMetadata (isso existe só no Sheets). O JSON vai no NOME de um
 * NamedRange do primeiro elemento do corpo: faz parte do conteúdo, então acompanha as
 * cópias do documento. Não é segredo — qualquer script com acesso ao documento consegue ler.
 *
 * A URL do proxy NÃO é gravada aqui de propósito: o aluno é dono da cópia e poderia
 * apontá-la para outro servidor, que receberia o OAuth token do professor quando ele
 * abrisse o documento.
 *
 * @private
 */
function _gravarConfigNoDocumento(docId, professorEmail) {
  const nome = DOC_CONFIG_RANGE_PREFIX + JSON.stringify({ professorEmail: professorEmail });
  if (nome.length > 256) {
    throw new Error('Configuração excede o limite de 256 caracteres do nome de um NamedRange.');
  }

  const doc = DocumentApp.openById(docId);
  // Remover configurações antigas para evitar duplicados
  doc.getNamedRanges()
     .filter(r => r.getName().indexOf(DOC_CONFIG_RANGE_PREFIX) === 0)
     .forEach(r => r.remove());

  doc.addNamedRange(nome, doc.newRange().addElement(doc.getBody().getChild(0)).build());
  try {
    _prepararTextoDoModelo(doc);
  } catch (textoErr) {
    Logger.log('[TemplateService] Não foi possível ajustar o texto do modelo: ' + textoErr);
  }
  doc.saveAndClose(); // gravar já: o Classroom copia o documento nesta mesma execução
}

/**
 * Ajusta o texto de um Documento Modelo/mestre para o aluno não apagar o começo:
 *   1. troca a instrução antiga "selecione e apague todo este texto" por
 *      TEXTO_INSTRUCAO_NAO_APAGAR (apagar o começo apaga junto o WHITEBOX_CONFIG);
 *   2. acrescenta no fim a linha TEXTO_LINHA_MARCADOR, se ainda não houver. A biblioteca
 *      não conta o que está acima dela em Palavras Escritas, no Radar nem como colagem.
 * Pode ser repetida: não duplica a linha nem a troca.
 *
 * @param {GoogleAppsScript.Document.Document} doc - aberto por DocumentApp.openById
 * @returns {{ instrucaoTrocada: boolean, marcadorIncluido: boolean }}
 * @private
 */
function _prepararTextoDoModelo(doc) {
  const body = doc.getBody();
  const antes = body.getText();
  body.replaceText(REGEX_INSTRUCAO_APAGAR_MODELO, TEXTO_INSTRUCAO_NAO_APAGAR);
  const instrucaoTrocada = body.getText() !== antes;

  const alvo = _normalizarMarcador(MARCADOR_INICIO_ALUNO);
  const temMarcador = body.getParagraphs().some(p => _normalizarMarcador(p.getText()).indexOf(alvo) !== -1);
  if (!temMarcador) {
    const linha = body.appendParagraph(TEXTO_LINHA_MARCADOR);
    linha.setHeading(DocumentApp.ParagraphHeading.NORMAL)
         .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    linha.editAsText().setBold(true).setForegroundColor('#4f46e5');
    // Parágrafo vazio e sem destaque logo abaixo: é onde o aluno começa a escrever.
    const inicio = body.appendParagraph('');
    try {
      const attrs = {};
      attrs[DocumentApp.Attribute.BOLD] = false;
      attrs[DocumentApp.Attribute.FOREGROUND_COLOR] = '#000000';
      attrs[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.LEFT;
      inicio.setAttributes(attrs);
    } catch (fmtErr) {
      Logger.log('[TemplateService] Formatação do parágrafo inicial do aluno: ' + fmtErr);
    }
  }
  return { instrucaoTrocada: instrucaoTrocada, marcadorIncluido: !temMarcador };
}

/** Mesma normalização de _normalizarComparacao (whitebox-lib/Logic.gs). @private */
function _normalizarMarcador(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Executar no editor do servidor (uma vez, e de novo se o Documento Semente mudar):
 * aplica _prepararTextoDoModelo ao Documento Semente e a todos os "Whitebox - Modelo
 * Mestre" desta conta. Não mexe na designação do professor.
 * @returns {{ documentos: number, alterados: string[] }}
 */
function atualizarTextoDosModelos() {
  const ids = {};
  try {
    const configTab = SpreadsheetApp.openById(getConfig().adminSpreadsheetId).getSheetByName('Config');
    const conf = configTab ? configTab.getDataRange().getValues() : [];
    for (let r = 1; r < conf.length; r++) {
      if (conf[r][0] === 'seed_document_id' && conf[r][1]) ids[String(conf[r][1]).trim()] = true;
    }
  } catch (err) {
    Logger.log('[TemplateService] Documento Semente indisponível: ' + err);
  }
  const it = DriveApp.searchFiles(
    "title contains 'Whitebox - Modelo Mestre' and mimeType = 'application/vnd.google-apps.document' " +
    "and 'me' in owners and trashed = false");
  while (it.hasNext()) ids[it.next().getId()] = true;

  const alterados = [];
  Object.keys(ids).forEach(function(id) {
    try {
      const doc = DocumentApp.openById(id);
      const r = _prepararTextoDoModelo(doc);
      if (r.instrucaoTrocada || r.marcadorIncluido) alterados.push(doc.getName());
      doc.saveAndClose();
    } catch (err) {
      Logger.log('[TemplateService] Não foi possível ajustar ' + id + ': ' + err);
    }
  });
  Logger.log('[TemplateService] Texto ajustado em ' + alterados.length + ' de ' +
             Object.keys(ids).length + ' documento(s): ' + alterados.join(', '));
  return { documentos: Object.keys(ids).length, alterados: alterados };
}

// =====================================================
//  HANDLER: Cópia do mestre com o título da atividade
// =====================================================

/**
 * O Classroom nomeia a cópia de cada aluno "<aluno> - <nome do arquivo anexado>". Anexando
 * o mestre, todas as atividades viram "<aluno> - Whitebox - Modelo Mestre (<email>)". Esta
 * rota copia o mestre com o título da atividade (com o script do documento, a designação e
 * a linha do marcador) e compartilha a cópia com o professor, que a anexa no Classroom
 * ou distribui por ela.
 *
 * Só aceita um documento desta conta designado ao próprio chamador.
 *
 * @param {object} body - { professorEmail, templateDocId, titulo }
 * @param {object} cfg
 * @param {string} callerEmail - e-mail verificado (o doPost já exigiu = professorEmail e Ativo)
 */
function handleCopiarModeloAtividade(body, cfg, callerEmail) {
  const professorEmail = String(body.professorEmail || '').trim().toLowerCase();
  const titulo = String(body.titulo || '').replace(/\s+/g, ' ').trim();
  const templateDocId = String(body.templateDocId || '').trim();
  if (!templateDocId) return jsonResponse({ error: 'TEMPLATE_ID_OBRIGATORIO', message: 'Documento não informado.' }, 400);
  if (!titulo) return jsonResponse({ error: 'TITULO_OBRIGATORIO', message: 'Preencha o título da atividade.' }, 400);
  if (titulo.length > 120) return jsonResponse({ error: 'TITULO_LONGO', message: 'Use um título de até 120 caracteres.' }, 400);
  if (!callerEmail || callerEmail !== professorEmail) {
    return jsonResponse({ error: 'UNAUTHORIZED', message: 'Token inválido ou não autorizado.' }, 401);
  }

  let file, designados;
  try {
    file = DriveApp.getFileById(templateDocId);
    designados = DocumentApp.openById(templateDocId).getNamedRanges()
      .map(r => r.getName())
      .filter(n => n.indexOf(DOC_CONFIG_RANGE_PREFIX) === 0)
      .map(n => { try { return String(JSON.parse(n.substring(DOC_CONFIG_RANGE_PREFIX.length)).professorEmail || '').toLowerCase(); } catch (e) { return ''; } });
  } catch (err) {
    return jsonResponse({
      error: 'TEMPLATE_NAO_ENCONTRADO',
      message: 'O servidor não consegue abrir este documento. Use o documento mestre recebido do Whitebox.'
    }, 404);
  }
  if (designados.indexOf(professorEmail) === -1) {
    return jsonResponse({
      error: 'TEMPLATE_DE_OUTRO_PROFESSOR',
      message: 'Este documento não está designado a você. Abra o seu documento mestre e tente de novo.'
    }, 403);
  }

  try {
    const copia = file.makeCopy(titulo, _getOrCreatePastaProfessor(professorEmail));
    _gravarConfigNoDocumento(copia.getId(), professorEmail);
    try {
      copia.setOwner(professorEmail);
    } catch (e) {
      copia.addEditor(professorEmail); // entre contas Gmail a transferência falha
    }
    Logger.log('[TemplateService] Cópia "' + titulo + '" criada para ' + professorEmail + ': ' + copia.getId());
    return jsonResponse({ success: true, docId: copia.getId(), nome: titulo, url: copia.getUrl() });
  } catch (err) {
    Logger.log('[TemplateService] handleCopiarModeloAtividade erro: ' + err);
    return jsonResponse({ error: 'COPIA_FALHOU', message: 'Não foi possível criar a cópia: ' + err }, 500);
  }
}

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
 * Retorna (ou cria) a pasta "WhiteBox/templates" no Drive do Admin.
 * @private
 */
function getOrCreateTemplatesFolder() {
  const root = getOrCreateTargetFolder();

  const subFolders = root.getFoldersByName('templates');
  if (subFolders.hasNext()) {
    return subFolders.next();
  }
  return root.createFolder('templates');
}

/**
 * Retorna (ou cria) a pasta "WhiteBox/Distribucoes/<email>" no Drive do Admin,
 * onde ficam as cópias do template de cada professor (compartilhadas com ele).
 * @private
 */
function _getOrCreatePastaProfessor(email) {
  // A execução é feita como Admin, então a pasta fica no Drive do Admin.
  // O arquivo é compartilhado com o professor via addEditor().
  // Esta é a limitação do Apps Script: não é possível criar no Drive de outro usuário.
  const root = getOrCreateTargetFolder();

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
