/**
 * ========================================================
 *  Whitebox — Brain Proxy (Script Standalone Protegido)
 *  Deploy como Web App: "Executar como: Eu", "Acesso: Qualquer pessoa"
 * ========================================================
 *
 * ATENÇÃO: Este é o núcleo protegido da solução Whitebox.
 * NÃO compartilhe este arquivo. Ele contém a lógica de licenciamento,
 * os prompts do Gemini e o acesso à Planilha Global.
 *
 * CONFIGURAÇÃO INICIAL (Script Properties deste script):
 *   SHARED_TOKEN        — Token secreto exigido em toda chamada (você define)
 *   ADMIN_SPREADSHEET_ID — ID da sua Planilha Global de administração
 *   GEMINI_GLOBAL_KEY   — (Opcional) Chave Gemini global para professores autorizados
 */

// =====================================================
//  CONFIGURAÇÃO: lê das Script Properties (seguro)
// =====================================================

// getConfig() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)


// =====================================================
//  ROTEADOR WEB (doGet) - AUTO-PROVISIONAMENTO
// =====================================================

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const adminId = props.getProperty('ADMIN_SPREADSHEET_ID');
  
  if (!adminId) {
    const lock = LockService.getScriptLock();
    try {
      // Tentar obter o lock por até 30 segundos
      lock.waitLock(30000);
      
      // Checar novamente se foi provisionado por outro processo simultâneo
      const reCheckAdminId = props.getProperty('ADMIN_SPREADSHEET_ID');
      if (reCheckAdminId) return serveDashboard();

      const result = setupPlanilhaGlobal(); 
      props.setProperty('ADMIN_SPREADSHEET_ID', result.id);
      
      // [ARCH-05] Registrar VersaoSchema imediatamente após o provisionamento
      migrarSchemaSeNecessario(result.id);
      
      let generatedToken = props.getProperty('SHARED_TOKEN');
      if (!generatedToken) {
        generatedToken = 'WBX-' + Utilities.getUuid();
        props.setProperty('SHARED_TOKEN', generatedToken);
      }
      
      const msg = '✅ SUCESSO: Whitebox Auto-Provisionado!\n\n' +
                  'O Banco de Dados Admin foi criado no seu Google Drive.\n' +
                  'URL: ' + result.url + '\n\n' +
                  '🔐 SHARED_TOKEN = ' + generatedToken + '\n\n' +
                  '⚠️ COPIE ESTE TOKEN! Ele é exigido no "Documento Modelo" (Cliente).\n\n' +
                  '🔄 RECARREGUE PARA ACESSAR O DASHBOARD.';
      return ContentService.createTextOutput(msg);
    } catch (err) {
      return ContentService.createTextOutput('❌ Falha no Provisionamento (Lock/Exec): ' + err.toString());
    } finally {
      lock.releaseLock();
    }
  }
  
  // [ARCH-05] Verificar schema em cada acesso — detecta divergências
  // introduzidas por edições manuais na planilha global antes de servir o Dashboard.
  try {
    const adminId = props.getProperty(PROP_ADMIN_SPREADSHEET_ID);
    if (adminId) {
      const schemaCheck = verificarSchemaGlobal(adminId);
      if (!schemaCheck.ok) {
        Logger.log('[BrainProxy] AVISO SCHEMA: ' + schemaCheck.mensagem);
      }
    }
  } catch (schemaErr) {
    Logger.log('[BrainProxy] Erro na verificação de schema: ' + schemaErr);
  }
  return serveDashboard();
}

/** Serve o Dashboard Administrativo */
function serveDashboard() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Whitebox Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// validateAdminAccess() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)


// =====================================================
//  ADMIN API: Funções para o Dashboard HTML
// =====================================================

/**
 * Ponto de entrada para análise via IA.
 * Agora considera os critérios personalizados do professor definidos na aba Config_Pedagogica.
 */
function realizarAuditoriaIA(texto, contexto, courseId, assignmentId) {
  const cfg = getConfig();
  
  // 1. Buscar Instruções Personalizadas
  let instrucoesProfessor = '';
  let rigorIA = 'Médio';
  let professorEmail = null;
  
  // Vamos buscar na Planilha Global pela tarefa.
  const infoTarefa = buscarInfoTarefa(assignmentId);
  
  if (infoTarefa) {
    professorEmail = infoTarefa.professorEmail;
    const configLocal = buscarConfigPedagogicaLocal(professorEmail, courseId, assignmentId);
    if (configLocal) {
      instrucoesProfessor = configLocal.instrucoes;
      rigorIA = configLocal.rigor;
    }
  }

  // 2. Resolver API Key (Hierarquia)
  const registro = professorEmail ? buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId) : null;
  const apiKey = resolverChaveApi(registro, cfg.geminiGlobalKey);

  if (!apiKey) {
    return { 
      error: 'NO_API_KEY', 
      message: 'Análise indisponível: nenhuma chave API encontrada para este professor ou globalmente.' 
    };
  }

  // 3. Construir o Prompt Dinâmico
  const systemPrompt = `Você é o Auditor Pedagógico Whitebox. Sua missão é analisar a originalidade e o esforço do aluno.
Critérios Adicionais do Professor: ${instrucoesProfessor || 'Nenhum específico.'}
Rigor: ${rigorIA}

Analise o texto abaixo e retorne um JSON com:
- nota_integridade: (0-100)
- justificativa: (texto sucinto)
- alertas: (array de strings)`;

  const promptFinal = `${systemPrompt}\n\nTexto do Aluno:\n${texto}\n\nContexto:\n${contexto}`;
  return analisarComGemini(promptFinal, {}, apiKey);
}

/** 
 * Busca as configurações pedagógicas na planilha individual do professor 
 */
function buscarConfigPedagogicaLocal(profEmail, courseId, assignmentId) {
  try {
    const adminSheet = getPlanilhaGlobal(PropertiesService.getScriptProperties().getProperty('ADMIN_SPREADSHEET_ID'));
    const dataProf = adminSheet.getDataRange().getValues();
    const headersProf = dataProf[0];

    // [HIGH-03 FIX] Resolver coluna por nome, nunca por índice posicional
    const ssColIdx = headersProf.indexOf('SpreadsheetId');
    if (ssColIdx === -1) {
      Logger.log('[BrainProxy] CRÍTICO: Coluna "SpreadsheetId" não encontrada na aba Assinaturas.');
      return null;
    }

    let profSSId = '';
    for (let i = 1; i < dataProf.length; i++) {
      if (dataProf[i][0] === profEmail) {
        profSSId = dataProf[i][ssColIdx];
        break;
      }
    }

    if (!profSSId) return null;

    const ss = SpreadsheetApp.openById(profSSId);
    const sheet = ss.getSheetByName('Config_Pedagogica');
    const data = sheet.getDataRange().getValues();

    // Buscar por Course e Assignment usando headers para robustez
    const h = data[0];
    const courseCol      = h.indexOf('Course_ID');
    const assignmentCol  = h.indexOf('Assignment_ID');
    const instrucoesCol  = h.indexOf('Instrucoes_IA');
    const rigorCol       = h.indexOf('Nivel_Rigor_IA');

    for (let i = 1; i < data.length; i++) {
      if (data[i][courseCol] == courseId && data[i][assignmentCol] == assignmentId) {
        return {
          instrucoes: instrucoesCol !== -1 ? data[i][instrucoesCol] : '',
          rigor:      rigorCol !== -1     ? data[i][rigorCol]      : 'Médio'
        };
      }
    }
  } catch (e) {
    Logger.log('[BrainProxy] Erro ao buscar config local: ' + e);
  }
  return null;
}

function buscarInfoTarefa(assignmentId) {
  const adminId = PropertiesService.getScriptProperties().getProperty('ADMIN_SPREADSHEET_ID');
  const sheet = SpreadsheetApp.openById(adminId).getSheetByName('Tarefas_Globais');
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == assignmentId) {
      return { professorEmail: data[i][1], instituicao: data[i][2] };
    }
  }
  return null;
}

function getAdminUIData(token) {
  validateAdminAccess(token);
  
  const cfg = getConfig();
  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const professores = [];
  const emailCol  = headers.indexOf('Email');
  const escolaCol = headers.indexOf('Instituicao');
  const statusCol = headers.indexOf('Status');
  
  if (emailCol === -1) throw new Error('Estrutura da planilha inválida: Coluna "Email" não encontrada.');

  for (let i = 1; i < data.length; i++) {
    const email = data[i][emailCol];
    if (email) {
      professores.push({
        email: email,
        escola: escolaCol !== -1 ? data[i][escolaCol] : 'N/A',
        status: statusCol !== -1 ? data[i][statusCol] : 'Status N/A'
      });
    }
  }

  // Buscar Seed ID na aba Config
  const ss = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  let configSheet = ss.getSheetByName('Config');
  let seedId = '';
  if (configSheet) {
    const configData = configSheet.getDataRange().getValues();
    for (let i = 1; i < configData.length; i++) {
      if (configData[i][0] === 'seed_document_id') {
        seedId = configData[i][1];
        break;
      }
    }
  }

  return {
    sharedToken: cfg.sharedToken,
    seedId: seedId,
    professores: professores
  };
}

/**
 * Função chamada pelo Dashboard (google.script.run) para regenerar a Planilha Global.
 * Valida o token admin antes de executar a operação destrutiva.
 *
 * @param {string} token - SHARED_TOKEN do admin (validação)
 * @returns {{ success: boolean, newId: string, newUrl: string, backupId: string }}
 */
function resetPlanilhaGlobalAdmin(token) {
  validateAdminAccess(token);
  return resetPlanilhaGlobal();
}

function salvarSeedId(id, token) {
  validateAdminAccess(token);
  const cfg = getConfig();
  const ss = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  let sheet = ss.getSheetByName('Config');
  if (!sheet) {
    sheet = ss.insertSheet('Config');
    sheet.appendRow(['Parametro', 'Valor', 'Descricao']);
  }
  
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'seed_document_id') {
      sheet.getRange(i + 1, 2).setValue(id);
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow(['seed_document_id', id, 'ID do Google Doc que serve de modelo (Semente)']);
  }
  
  return { success: true };
}

function distribuirMestreParaProfessor(email, token) {
  validateAdminAccess(token);

  // [MED-06 FIX] Validar email antes de qualquer operação com ele
  validarEmail(email);

  const uiData = getAdminUIData(token);
  const seedId = uiData.seedId;

  if (!seedId) throw new Error('ID do Documento Semente não configurado.');

  try {
    // 1. Clonar o Documento Semente e colocar na pasta Admin
    const originalFile = DriveApp.getFileById(seedId);
    const newName = 'Whitebox - Modelo Mestre (' + email + ')';
    const targetFolder = getOrCreateTargetFolder();
    const copy = originalFile.makeCopy(newName, targetFolder);
    
    // 2. Injetar DeveloperMetadata de Auto-Configuração [ARCH-LIB]
    try {
      const cfg = getConfig();
      const configObj = {
        proxyUrl:    cfg.proxyUrl,
        sharedToken: cfg.sharedToken
      };
      
      const doc = DocumentApp.openById(copy.getId());
      doc.addDeveloperMetadata('WHITEBOX_CONFIG', JSON.stringify(configObj));
      Logger.log('[BrainProxy] Metadados injetados com sucesso no novo Mestre.');
    } catch (metaErr) {
      Logger.log('[BrainProxy] Erro (não-crítico) ao injetar metadados: ' + metaErr);
    }

    // 3. Dar permissão de editor ao professor
    copy.addEditor(email);
    
    // 4. Notificar via e-mail
    const subject = '📦 Seu Sistema Whitebox está pronto!';
    const body = `Olá!\n\nSeu Documento Mestre do Whitebox foi gerado e compartilhado com você.\n\n` +
                 `Link do Documento: ${copy.getUrl()}\n\n` +
                 `Equipe Whitebox`;
    MailApp.sendEmail(email, subject, body);
    
    return { success: true, url: copy.getUrl() };
  } catch (err) {
    Logger.log('[distribuirMestre] Erro: ' + err);
    throw new Error('Falha na distribuição: ' + err.toString());
  }
}

/**
 * Retorna os dados para os mapas de calor solicitados (Snapshot).
 * Abrande os níveis: Aluno, Turma, Professor e Instituição.
 */
function getHeatmapData(token, scope, identifier) {
  validateAdminAccess(token);
  
  if (scope === 'aluno_atividades') {
    return calcularHeatmapAluno(identifier); // identifier = email_aluno
  } else if (scope === 'turma_atividades') {
    return calcularHeatmapTurma(identifier); // identifier = course_id
  } else if (scope === 'instituicao') {
    return calcularHeatmapInstituicao(identifier); // identifier = nome_instituicao
  }
  
  throw new Error('Escopo de heatmap não suportado: ' + scope);
}

/**
 * [ARCH-04] calcularHeatmapAluno com cache CacheService (TTL 1 hora).
 *
 * O cálculo real é O(n_professores × n_logs) — potencialmente centenas de
 * chamadas à Spreadsheet API. O cache elimina esse custo para chamadas
 * repetidas dentro da janela de 1h, que é aceitável para heatmaps
 * pedagógicos (não requerem dados em tempo real).
 *
 * TODO [ARCH-07] ESCALABILIDADE (MIGRAÇÃO FUTURA):
 * À medida que o sistema escalar, as iterações `SpreadsheetApp.openById`
 * estourarão a cota de 6 minutos. No futuro, será estritamente necessário
 * utilizar uma infraestrutura de Data Warehouse, como o Google BigQuery ou
 * Data Studio (Looker), com ingestão assíncrona para análises globais.
 *
 * Para forçar recalculo antes do TTL, chame invalidarCacheHeatmap(email).
 *
 * @param {string} emailAluno
 * @returns {{ labels: string[], valores: number[], alertas: number[],
 *             _fromCache?: boolean, _cachedAt?: string, _calculatedAt?: string }}
 */
function calcularHeatmapAluno(emailAluno) {
  if (!emailAluno) return { labels: [], valores: [], alertas: [] };

  // ===== L1: Cache CacheService (1 hora) =====
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'HEATMAP_ALUNO_' + emailAluno.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      Logger.log('[BrainProxy] calcularHeatmapAluno: cache HIT para ' + emailAluno);
      return Object.assign(parsed, { _fromCache: true });
    } catch (e) {
      Logger.log('[BrainProxy] calcularHeatmapAluno: cache inválido, recalculando...');
    }
  }

  Logger.log('[BrainProxy] calcularHeatmapAluno: cache MISS, varrendo planilhas...');
  const startMs = Date.now();

  // ===== Cálculo real: varre planilhas de todos os professores =====
  const cfg     = getConfig();
  const assSheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const assData    = assSheet.getDataRange().getValues();
  const assHeaders = assData[0];
  const ssColIdx   = assHeaders.indexOf(COL_SPREADSHEET_ID); // [HIGH-03] header-based
  const emailColIdx = assHeaders.indexOf(COL_EMAIL);

  if (ssColIdx === -1 || emailColIdx === -1) {
    Logger.log('[BrainProxy] calcularHeatmapAluno: colunas obrigatórias ausentes na aba Assinaturas.');
    return { labels: [], valores: [], alertas: [] };
  }

  // Índices estáveis da aba Logs (definidos em inicializarPlanilhaProfessor)
  // Timestamp | Turma | DocId | Email_Aluno | Palavras | Tempo_Ativo_Min | Colar_Eventos
  // Taxa_Edicao | Alteracoes_Estrutura | Chars_Adicionados | Chars_Deletados | Colagem_Massiva
  // Cpm_Medio | Cpm_Pico | RiscoScore | Whitebox_Risco | Conselho_Pedagogico
  // Pergunta_Socratica | Modo_IA | Entrega_Final
  const LOG_EMAIL_COL  = 3;   // Email_Aluno
  const LOG_DOC_COL    = 2;   // DocId
  const LOG_TURMA_COL  = 1;   // Turma
  const LOG_RISCO_COL  = 14;  // RiscoScore
  const LOG_ESFORCO_COL = 5;  // Tempo_Ativo_Min
  const LOG_FINAL_COL  = 19;  // Entrega_Final
  const RISCO_ALERT_THRESHOLD = 60; // Risco > 60 é alerta

  const aggregated = {}; // docId → { riscoTotal, esforcoTotal, count, alertas, turma }
  let   planilhasVarriadas = 0;

  for (let r = 1; r < assData.length; r++) {
    const profSSId = assData[r][ssColIdx];
    if (!profSSId || String(profSSId).trim() === '') continue;

    try {
      const profSS   = SpreadsheetApp.openById(profSSId);
      const logSheet = profSS.getSheetByName(SHEET_LOGS);
      if (!logSheet) continue;

      const logs = logSheet.getDataRange().getValues();
      planilhasVarriadas++;

      for (let i = 1; i < logs.length; i++) {
        if (logs[i][LOG_EMAIL_COL] !== emailAluno) continue;

        const docId   = String(logs[i][LOG_DOC_COL] || ('Doc_' + i));
        const risco   = parseFloat(logs[i][LOG_RISCO_COL]) || 0;
        const esforco = parseFloat(logs[i][LOG_ESFORCO_COL]) || 0;
        const isFinal = logs[i][LOG_FINAL_COL] === 'Sim';
        const turma   = String(logs[i][LOG_TURMA_COL] || '');

        if (!aggregated[docId]) {
          aggregated[docId] = { riscoTotal: 0, esforcoTotal: 0, count: 0, alertas: 0, turma: turma };
        }
        aggregated[docId].riscoTotal   += risco;
        aggregated[docId].esforcoTotal += esforco;
        aggregated[docId].count++;
        if (isFinal && risco > RISCO_ALERT_THRESHOLD) aggregated[docId].alertas++;
      }
    } catch (e) {
      Logger.log('[BrainProxy] calcularHeatmapAluno: erro na planilha ' + profSSId + ': ' + e);
    }
  }

  const elapsedMs = Date.now() - startMs;
  Logger.log('[BrainProxy] calcularHeatmapAluno: varreu ' + planilhasVarriadas +
             ' planilhas em ' + elapsedMs + 'ms para ' + emailAluno);

  const labels   = Object.keys(aggregated);
  const valores  = labels.map(l => {
    const { riscoTotal, count } = aggregated[l];
    // Invertemos: risco alto → score de integridade baixo (0-100)
    const mediaRisco = count > 0 ? riscoTotal / count : 0;
    return Math.round(100 - mediaRisco);
  });
  const alertas  = labels.map(l => aggregated[l].alertas);
  const esforcos = labels.map(l => {
    const { esforcoTotal, count } = aggregated[l];
    return count > 0 ? Math.round(esforcoTotal / count) : 0;
  });

  const resultado = {
    labels,
    valores,
    alertas,
    esforcos,              // Minutos médios de escrita por documento
    _calculatedAt: new Date().toISOString(),
    _elapsedMs:    elapsedMs,
    _fromCache:    false
  };

  // ===== Persistir no cache (excluindo _fromCache do payload armazenado) =====
  try {
    const payload = Object.assign({}, resultado, { _fromCache: false });
    // CacheService limita valores a 100KB; verificar tamanho antes
    const serialized = JSON.stringify(payload);
    if (serialized.length < 90000) {
      cache.put(cacheKey, serialized, 3600); // TTL: 1 hora (3600s)
      Logger.log('[BrainProxy] calcularHeatmapAluno: resultado em cache por 1h.');
    } else {
      Logger.log('[BrainProxy] calcularHeatmapAluno: resultado > 90KB, cache ignorado.');
    }
  } catch (e) {
    Logger.log('[BrainProxy] calcularHeatmapAluno: falha ao persistir no cache: ' + e);
  }

  return resultado;
}

/**
 * [ARCH-04] Invalida o cache do heatmap de um aluno específico.
 * Deve ser chamada quando novos logs são gravados para o aluno,
 * garantindo que o próximo getHeatmapData reflita os novos dados.
 *
 * @param {string} emailAluno
 */
function invalidarCacheHeatmap(emailAluno) {
  if (!emailAluno) return;
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'HEATMAP_ALUNO_' + emailAluno.toLowerCase().replace(/[^a-z0-9]/g, '_');
  cache.remove(cacheKey);
  Logger.log('[BrainProxy] Cache heatmap invalidado para: ' + emailAluno);
}

/**
 * [ARCH-04] Stub defensivo para heatmap por instituição (implementação futura).
 * Documenta a intenção sem retornar dados falsos.
 */
function calcularHeatmapInstituicao(nomeInstituicao) {
  Logger.log('[BrainProxy] calcularHeatmapInstituicao: não implementado para ' + nomeInstituicao);
  return {
    _incomplete: true,
    _reason:    'Implementação pendente: requer índice de instituições na planilha global.',
    labels:     [],
    valores:    [],
    alertas:    []
  };
}


function calcularHeatmapTurma(courseId) {
  const profEmail = Session.getActiveUser().getEmail();
  const ssId = buscarSpreadsheetProfessor(profEmail);
  if (!ssId) return { labels: [], media_esforco: [], media_integridade: [] };

  const ss    = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName('Logs');
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];

  // Resolver colunas por header para robustez
  const courseCol      = h.indexOf('Turma');          // Coluna Turma (0-based)
  const assignmentCol  = h.indexOf('DocId');           // Agrupamos por DocId como proxy de Assignment
  const esforcoCol     = h.indexOf('Tempo_Ativo_Min');
  const integridadeCol = h.indexOf('RiscoScore');

  const stats = {};
  for (let i = 1; i < data.length; i++) {
    // Filtrar pelo courseId: comparamos com a coluna Turma
    if (data[i][courseCol] != courseId) continue;

    const aid = data[i][assignmentCol] || 'SEM_DOC';
    if (!stats[aid]) stats[aid] = { esforco: 0, integridade: 0, count: 0 };
    stats[aid].esforco      += parseFloat(data[i][esforcoCol])     || 0;
    stats[aid].integridade  += parseFloat(data[i][integridadeCol]) || 0;
    stats[aid].count++;
  }

  const labels = Object.keys(stats);
  return {
    labels,
    media_esforco:     labels.map(l => stats[l].count > 0 ? stats[l].esforco     / stats[l].count : 0),
    media_integridade: labels.map(l => stats[l].count > 0 ? stats[l].integridade / stats[l].count : 0)
  };
}

/**
 * [HIGH-03 FIX] Busca SpreadsheetId do professor por nome de coluna (não índice).
 */
function buscarSpreadsheetProfessor(email) {
  const adminId = PropertiesService.getScriptProperties().getProperty('ADMIN_SPREADSHEET_ID');
  const sheet   = SpreadsheetApp.openById(adminId).getSheetByName('Assinaturas');
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailIdx = headers.indexOf('Email');
  const ssIdx    = headers.indexOf('SpreadsheetId');
  if (emailIdx === -1 || ssIdx === -1) return null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIdx] === email) return data[i][ssIdx];
  }
  return null;
}

// =====================================================
//  ROTEADOR PRINCIPAL (doPost)
// =====================================================

function doPost(e) {
  try {
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ error: 'BAD_REQUEST', message: 'Payload JSON inválido.' }, 400);
    }
    const cfg  = getConfig();

    // 1. Validação do Token Compartilhado
    if (!cfg.sharedToken || body.token !== cfg.sharedToken) {
      return jsonResponse({ error: 'UNAUTHORIZED', message: 'Token inválido.' }, 401);
    }

    const route = body.route || '';

    // 2. Roteamento
    switch (route) {
      case ROUTE_REGISTRAR_CHAVE:
        return handleRegistrarChave(body, cfg);
      case ROUTE_ANALISAR:
        return handleAnalisar(body, cfg);
      case ROUTE_LOGAR_METRICAS:
        return handleLogarMetricas(body, cfg);
      case ROUTE_STATUS_LICENCA:
        return handleStatusLicenca(body, cfg);

      // ── Módulo de Distribuição de Templates ──────────────────────
      case ROUTE_LISTAR_TEMPLATES:
        return handleListarTemplates(body, cfg);
      case ROUTE_DISTRIBUIR_TEMPLATE:
        return handleDistribuirTemplate(body, cfg);
      case ROUTE_LISTAR_TURMAS_PROFESSOR:
        return handleListarTurmasProfessor(body, cfg);
      case ROUTE_CRIAR_LEVA_TEMPLATE:
        return handleCriarLevaTemplate(body, cfg);
      case ROUTE_HISTORICO_TEMPLATES:
        return handleHistoricoTemplates(body, cfg);
      case ROUTE_STATUS_DISTRIBUICAO:
        return handleStatusDistribuicao(body, cfg);

      // ── Health Check / Setup Validation ─────────────────────────
      case 'ping':
        return jsonResponse({ ok: true, message: 'Whitebox Server OK' });

      // ── Operações Administrativas ─────────────────────────────────
      case 'reset_planilha':
        return handleResetPlanilha(body, cfg);

      default:
        return jsonResponse({ error: 'ROUTE_NOT_FOUND' }, 404);
    }

  } catch (err) {
    Logger.log('[BrainProxy] Erro crítico: ' + err);
    return jsonResponse({ error: 'INTERNAL_ERROR', message: err.toString() }, 500);
  }
}

// =====================================================
//  HANDLER: Status de Licença
// =====================================================

function handleStatusLicenca(body, cfg) {
  const email = body.professorEmail;
  if (!email) return jsonResponse({ error: 'EMAIL_REQUIRED' }, 400);

  const registro = buscarRegistroProfessor(email, cfg.adminSpreadsheetId);
  if (!registro) {
    return jsonResponse({ status: 'NAO_CADASTRADO', modoIA: false });
  }

  const { status, usaChaveGlobal, chaveIndividual, escola } = registro;

  if (status !== 'Ativo') {
    return jsonResponse({ status: 'INATIVO', modoIA: false });
  }

  const usaGlobalBoolean = (usaChaveGlobal === 'Sim');
  const temChave = (usaGlobalBoolean && cfg.geminiGlobalKey) ? true : 
                   (chaveIndividual && chaveIndividual.trim().length > 0) ? true : false;

  return jsonResponse({
    status: 'ATIVO',
    escola: escola,
    modoIA: temChave,
    tipoChave: usaGlobalBoolean ? 'global' : (chaveIndividual ? 'individual' : 'nenhuma')
  });
}

// =====================================================
//  HANDLER: Reset da Planilha Global (Operação Destrutiva)
// =====================================================

/**
 * ⚠️ Requer confirmação explícita via campo 'confirmacao' = 'CONFIRMAR_RESET'
 * para evitar execução acidental pelo Dashboard.
 */
function handleResetPlanilha(body, cfg) {
  if (body.confirmacao !== 'CONFIRMAR_RESET') {
    return jsonResponse({
      error:   'CONFIRMACAO_NECESSARIA',
      message: 'Envie confirmacao: "CONFIRMAR_RESET" para executar esta operação.'
    }, 400);
  }

  try {
    const result = resetPlanilhaGlobal();
    return jsonResponse({
      success:  true,
      message:  'Planilha Global regenerada com sucesso.',
      newId:    result.newId,
      newUrl:   result.newUrl,
      backupId: result.backupId
    });
  } catch (err) {
    Logger.log('[BrainProxy] Erro no reset da planilha: ' + err);
    return jsonResponse({ error: 'RESET_FAILED', message: err.toString() }, 500);
  }
}

// =====================================================
//  HANDLER: Registrar / Atualizar Chave do Professor
// =====================================================

function handleRegistrarChave(body, cfg) {
  const { professorEmail, apiKey } = body;
  if (!professorEmail) return jsonResponse({ error: 'EMAIL_REQUIRED' }, 400);

  // [MED-06 FIX] Validar formato do email antes de gravar na planilha
  try {
    validarEmail(professorEmail);
  } catch (validationErr) {
    return jsonResponse({ error: 'EMAIL_INVALIDO', message: validationErr.message }, 400);
  }

  const sheet   = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0]; // Email | Instituicao | Status | UsaChaveGlobal | ChaveIndividual | SpreadsheetId

  const emailCol       = headers.indexOf('Email');
  const chaveCol       = headers.indexOf('ChaveIndividual');
  const spreadsheetCol = headers.indexOf('SpreadsheetId');

  // Buscar linha existente
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === professorEmail) {
      // Atualizar chave
      sheet.getRange(i + 1, chaveCol + 1).setValue(apiKey || '');
      // Garantir que a planilha do professor existe
      const spreadsheetId = garantirPlanilhaProfessor(professorEmail, sheet, i, spreadsheetCol);
      return jsonResponse({ success: true, action: 'atualizado', spreadsheetId });
    }
  }

  // Professor não encontrado: cadastrar como novo (Status=Ativo, sem chave global)
  const newRow = new Array(headers.length).fill('');
  newRow[emailCol] = professorEmail;
  newRow[headers.indexOf('Instituicao')] = 'Não informada';
  newRow[headers.indexOf('Status')] = 'Ativo';
  newRow[headers.indexOf('UsaChaveGlobal')] = 'Não';
  newRow[chaveCol] = apiKey || '';
  sheet.appendRow(newRow);

  // Criar planilha do professor e salvar o ID
  const newRowIndex = sheet.getLastRow();
  const spreadsheetId = garantirPlanilhaProfessor(professorEmail, sheet, newRowIndex - 1, spreadsheetCol);
  return jsonResponse({ success: true, action: 'cadastrado', spreadsheetId });
}

// =====================================================
//  HANDLER: Analisar com Gemini
// =====================================================

function handleAnalisar(body, cfg) {
  const { professorEmail, alunoEmail, fragmento, metricas } = body;
  if (!professorEmail || !fragmento) {
    return jsonResponse({ error: 'PARAMS_REQUIRED' }, 400);
  }

  // [AUTH-03] Auditoria de Segurança: 
  // O Auditor de IA é uma ferramenta de uso exclusivo do Professor.
  // Alunos não devem ter acesso direto a esta rota via interface.

  // [ARCH-06] Rate Limiting: previne abuso da API Gemini (tokens)
  const usuario = alunoEmail || 'anonimo';
  if (!verificarRateLimit(professorEmail, usuario)) {
    return jsonResponse({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas análises solicitadas. Aguarde um momento antes de pedir novas análises.',
      modoIA: false,
      riskEvidence: null,
      pedagogicalAdvice: null
    }, 429); // Too Many Requests
  }

  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  const apiKey   = resolverChaveApi(registro, cfg.geminiGlobalKey);

  // Modo Offline: sem chave disponível
  if (!apiKey) {
    return jsonResponse({
      modoIA: false,
      toneChangeDetected: false,
      riskEvidence: null,
      pedagogicalAdvice: null,
      message: 'Análise de IA não disponível (modo offline). Configure sua API Key nas configurações.'
    });
  }

  // Análise com Gemini
  const analise = analisarComGemini(fragmento, metricas, apiKey);
  return jsonResponse({ modoIA: true, ...analise });
}

// =====================================================
//  HANDLER: Logar Métricas na Planilha do Professor
// =====================================================

function handleLogarMetricas(body, cfg) {
  const { professorEmail, turma, docId, alunoEmail, metricas, analise, isFinal } = body;
  if (!professorEmail) return jsonResponse({ error: 'EMAIL_REQUIRED' }, 400);

  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  if (!registro || !registro.spreadsheetId) {
    return jsonResponse({ error: 'PLANILHA_PROFESSOR_NAO_ENCONTRADA' }, 404);
  }

  logarNaPlanilhaProfessor({
    spreadsheetId: registro.spreadsheetId,
    turma:         turma || 'SEM_TURMA',
    docId:         docId || '',
    alunoEmail:    alunoEmail || '',
    metricas:      metricas || {},
    analise:       analise || null,
    isFinal:       isFinal || false
  });

  return jsonResponse({ success: true });
}

// =====================================================
//  LÓGICA: Resolver Chave API (Hierarquia e Cofre Drive)
// =====================================================

function resolverChaveApi(registro, geminiGlobalKey) {
  if (!registro) return null;

  // 1. Chave Global (se professor está autorizado a usá-la)
  if (registro.usaChaveGlobal === 'Sim' && geminiGlobalKey) {
    return geminiGlobalKey;
  }

  // 2. Chave Individual (Pode ser API Key direta ou ID/Link do Cofre no Drive)
  let chaveRaw = registro.chaveIndividual;
  if (chaveRaw && chaveRaw.trim().length > 0) {
    chaveRaw = chaveRaw.trim();
    
    // Se for uma chave direta do Gemini (padrão AIza...)
    if (chaveRaw.startsWith('AIza')) {
      return chaveRaw;
    }
    
    // Senão, assumimos que é um Cofre no Drive (Alternativa 2)
    try {
      let fileId = chaveRaw;
      // Extrair o ID caso o admin tenha colado a URL inteira
      const matchUrl = chaveRaw.match(/\/d\/([-\w]{25,})/);
      if (matchUrl) fileId = matchUrl[1];
      
      const file = DriveApp.getFileById(fileId);
      const chaveExtraida = file.getBlob().getDataAsString().trim();
      
      if (chaveExtraida.startsWith('AIza')) {
        Logger.log('[Cofre Drive] Chave API lida do cofre do professor com sucesso.');
        return chaveExtraida;
      } else {
        Logger.log('[Cofre Drive] O arquivo lido não contém uma chave Gemini válida.');
        return null; // Força modo offline
      }
    } catch (e) {
      Logger.log('[Cofre Drive] Erro ao acessar arquivo de cofre. Arquivo inacessível ou não compartilhado. Erro: ' + e.toString());
      return null; // Força modo offline
    }
  }

  // 3. Modo Offline
  return null;
}

// =====================================================
//  LÓGICA: Análise Socrática com Gemini Pro
// =====================================================

function analisarComGemini(fragmento, metricas, apiKey) {
  const prompt = construirPromptSocratico(fragmento, metricas);

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
      responseMimeType: 'application/json'
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      deadline: 25  // [EDGE-02] Timeout estendido: SpreadsheetApp.create pode levar 3-8s + Gemini 2-5s
    });

    const code = response.getResponseCode();
    const content = response.getContentText();

    if (code !== 200) {
      Logger.log('[Gemini] Erro HTTP ' + code + ': ' + content);
      return { error: 'GEMINI_API_ERROR', code: code };
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      Logger.log('[Gemini] Resposta da API não é um JSON válido: ' + content);
      return { error: 'GEMINI_INVALID_RESPONSE_FORMAT' };
    }

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { error: 'GEMINI_EMPTY_RESPONSE' };
    }

    // O prompt pede JSON estruturado - uso do extrairJSON para robustez
    try {
      return extrairJSON(text);
    } catch (e) {
      Logger.log('[Gemini] Erro ao extrair JSON do texto: ' + text);
      return { error: 'GEMINI_PARSE_ERROR', message: e.toString() };
    }
  } catch (err) {
    Logger.log('[Gemini] Exceção: ' + err);
    return { error: 'GEMINI_EXCEPTION', message: err.toString() };
  }
}

/**
 * Utilitário para extrair JSON de strings que podem conter Markdown
 */
// extrairJSON() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)


// =====================================================
//  PROMPT SOCRÁTICO PEDAGÓGICO (Lógica Proprietária)
// =====================================================

function construirPromptSocratico(fragmento, metricas) {
  const editRatio  = metricas?.editRatio ?? 'desconhecido';
  const pasteCount = metricas?.pasteEvents?.count ?? 0;
  const activeMins = metricas?.activeFocusTimeMinutes ?? 0;
  const peakCpm    = metricas?.typingSpeed?.peakCharsPerMinute ?? 0;

  return `
Você é um auditor pedagógico socrático do sistema Whitebox. 
Analise o trecho de texto abaixo junto com as métricas comportamentais do aluno.
Identifique padrões que possam indicar falta de autoria própria (uso não declarado de IA, plágio ou cola).

TRECHO DO ALUNO:
"""
${fragmento}
"""

MÉTRICAS COMPORTAMENTAIS:
- Tempo ativo de escrita: ${activeMins} minutos
- Eventos de cola detectados: ${pasteCount}
- Taxa de edição (deleções/total): ${editRatio}
- Pico de digitação: ${peakCpm} caracteres/minuto

IDIOMA: Responda SEMPRE em português brasileiro, independentemente do idioma do trecho acima.

RESPONDA SOMENTE em JSON válido com a seguinte estrutura, sem qualquer texto adicional:
{
  "toneChangeDetected": true | false,
  "riskScore": 0 a 100,
  "riskEvidence": "Descrição objetiva dos indícios encontrados ou null se não houver",
  "pedagogicalAdvice": "Orientação socrática para o professor: o que perguntar ao aluno ou como intervir pedagogicamente",
  "suggestedQuestion": "Uma pergunta socrática específica que o professor pode fazer ao aluno sobre este trecho"
}
`;
}

// getPlanilhaGlobal() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)

// buscarRegistroProfessor() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)



// =====================================================
//  PLANILHA DO PROFESSOR (Logs Individuais)
// =====================================================

function garantirPlanilhaProfessor(email, adminSheet, rowIndex, spreadsheetCol) {
  // Verificar se já existe
  const existingId = adminSheet.getRange(rowIndex + 1, spreadsheetCol + 1).getValue();
  if (existingId && existingId.trim().length > 0) return existingId;

  // Criar nova planilha
  const nomePlanilha = 'Whitebox - ' + email;
  const ss = SpreadsheetApp.create(nomePlanilha);
  inicializarPlanilhaProfessor(ss);

  // Salvar ID na planilha global
  adminSheet.getRange(rowIndex + 1, spreadsheetCol + 1).setValue(ss.getId());
  Logger.log('[BrainProxy] Planilha criada para ' + email + ': ' + ss.getId());

  return ss.getId();
}

function inicializarPlanilhaProfessor(ss) {
  // Aba de Logs
  let logSheet = ss.getSheetByName('Logs');
  if (!logSheet) {
    logSheet = ss.insertSheet('Logs');
  }
  logSheet.clearContents();
  logSheet.appendRow([
    'Timestamp', 'Turma', 'DocId', 'Email_Aluno',
    'Palavras', 'Tempo_Ativo_Min', 'Colar_Eventos',
    'Taxa_Edicao', 'Alteracoes_Estrutura',
    'Chars_Adicionados', 'Chars_Deletados', 'Colagem_Massiva',
    'Cpm_Medio', 'Cpm_Pico',
    'RiscoScore', 'Whitebox_Risco', 'Conselho_Pedagogico',
    'Pergunta_Socratica', 'Modo_IA', 'Entrega_Final', 'Heatmap_Scores'
  ]);

  // Aba de Visualização do Heatmap
  let heatSheet = ss.getSheetByName('Visual_Heatmap');
  if (!heatSheet) {
    heatSheet = ss.insertSheet('Visual_Heatmap');
    setupVisualHeatmapTab(heatSheet);
  }

  // Aba de Turmas
  let turmaSheet = ss.getSheetByName('Turmas');
  if (!turmaSheet) {
    turmaSheet = ss.insertSheet('Turmas');
    turmaSheet.appendRow(['Nome_Turma', 'Total_Alunos', 'Ultima_Atividade']);
  }

  // [TEMPLATE-04] Aba de Levas (distribuições de template para alunos)
  let levasSheet = ss.getSheetByName('Levas');
  if (!levasSheet) {
    levasSheet = ss.insertSheet('Levas');
    levasSheet.appendRow([
      'ID_Leva', 'Template_ID', 'Template_Nome', 'Titulo_Atividade',
      'Course_ID', 'Course_Nome', 'Assignment_ID', 'Total_Alunos',
      'Docs_Criados', 'Prazo', 'Instrucoes', 'Data_Criacao'
    ]);
    levasSheet.getRange(1, 1, 1, 12).setFontWeight('bold');
  }
}

function logarNaPlanilhaProfessor(params) {
  const { spreadsheetId, turma, docId, alunoEmail, metricas, analise, isFinal } = params;

  const ss       = SpreadsheetApp.openById(spreadsheetId);
  const logSheet = ss.getSheetByName('Logs') || ss.insertSheet('Logs');

  // [AUTO-REPAIR] Garantir que a aba Visual_Heatmap existe (para planilhas legadas)
  if (!ss.getSheetByName('Visual_Heatmap')) {
    const heatSheet = ss.insertSheet('Visual_Heatmap');
    setupVisualHeatmapTab(heatSheet);
  }

  // [AUTO-REPAIR] Garantir que o cabeçalho de logs tem a nova coluna de Heatmap
  const headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Heatmap_Scores') === -1) {
    logSheet.getRange(1, headers.length + 1).setValue('Heatmap_Scores');
  }

  logSheet.appendRow([
    new Date().toISOString(),
    turma,
    docId,
    alunoEmail,
    metricas.wordCount        || 0,
    metricas.activeFocusTimeMinutes || 0,
    metricas.pasteEvents?.count || 0,
    metricas.editRatio        || 0,
    metricas.structureChanges || 0,
    metricas.charsAdded       || 0,
    metricas.charsDeleted     || 0,
    metricas.pasteEvents?.massiveInsertionsDetected ? 'Sim' : 'Não',
    metricas.typingSpeed?.avgCharsPerMinute || 0,
    metricas.typingSpeed?.peakCharsPerMinute || 0,
    analise?.riskScore        || '',
    analise?.riskEvidence     || '',
    analise?.pedagogicalAdvice || '',
    analise?.suggestedQuestion || '',
    analise ? 'Sim' : 'Não',
    isFinal ? 'Sim' : 'Não',
    metricas.auraMapScores     || ''
  ]);

  // [ARCH-04] Invalidar cache do heatmap do aluno após novo log.
  // Garante que a próxima chamada a getHeatmapData reflita os dados atuais.
  invalidarCacheHeatmap(alunoEmail);

  // Atualizar aba de Turmas
  atualizarTurma(ss, turma);
}

/**
 * [HIGH-04 FIX] Registra ou atualiza a turma no dashboard do professor.
 * Incrementa Total_Alunos a cada novo log registrado.
 */
function atualizarTurma(ss, turma) {
  const sheet = ss.getSheetByName('Turmas') || ss.insertSheet('Turmas');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === turma) {
      // [HIGH-04 FIX] Incrementar Total_Alunos (coluna 2) em vez de manter sempre = 1
      const currentTotal = parseInt(data[i][1]) || 0;
      sheet.getRange(i + 1, 2).setValue(currentTotal + 1);
      sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
      return;
    }
  }
  // Turma nova: inicializar com 1
  sheet.appendRow([turma, 1, new Date().toISOString()]);
}

/**
 * [HEATMAP-03] Configura a aba Visual_Heatmap com fórmulas e formatação condicional.
 */
function setupVisualHeatmapTab(sheet) {
  sheet.clear();
  sheet.getRange('A1').setValue('AUDITORIA VISUAL (HEATMAP)').setFontWeight('bold').setFontSize(14);
  
  sheet.getRange('A3').setValue('1. Selecione o Aluno (Email):');
  sheet.getRange('A4').setValue('2. Selecione o Trabalho (DocId):');
  
  sheet.getRange('A6').setValue('RADAR DE ESFORÇO (MAPA DE CALOR)').setFontWeight('bold');
  sheet.getRange('A7').setValue('Legenda: Verde (>70) | Amarelo (40-70) | Vermelho (<40)');

  // Instrução de uso das fórmulas
  sheet.getRange('C3').setValue('<- Cole o email do aluno aqui');
  sheet.getRange('C4').setValue('<- Cole o ID do documento aqui');
  
  // Fórmula principal para desmembrar o heatmap (Assume coluna C para Email e D para DocId em Logs)
  // Nota: Heatmap_Scores é a coluna 21 (U)
  const formula = '=IFERROR(TRANSPOSE(SPLIT(VLOOKUP(B4, Logs!C:U, 19, FALSE), ",")), "Dados não encontrados")';
  sheet.getRange('B7').setFormula(formula);

  // Formatação Condicional para a coluna B (Heatmap)
  const range = sheet.getRange('B7:B500');
  
  const ruleRed = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThanOrEqualTo(40)
    .setBackground('#F8D7DA')
    .setFontColor('#721C24')
    .setRanges([range])
    .build();

  const ruleYellow = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(41, 70)
    .setBackground('#FFF3CD')
    .setFontColor('#856404')
    .setRanges([range])
    .build();

  const ruleGreen = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(70)
    .setBackground('#D4EDDA')
    .setFontColor('#155724')
    .setRanges([range])
    .build();

  sheet.setConditionalFormatRules([ruleRed, ruleYellow, ruleGreen]);
  sheet.setColumnWidth(2, 150); // Largura da barra de calor
}

// jsonResponse() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)
//
// LIMITAÇÃO: ContentService sempre retorna HTTP 200 no Apps Script.
// O status real é embutido em body._httpStatus quando != 200.
// Ref: https://issuetracker.google.com/issues/36759757
