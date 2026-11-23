/**
 * ========================================================
 *  Whitebox — Brain Proxy (Script Standalone Protegido)
 *  Deploy como Web App: "Executar como: Eu", "Acesso: Qualquer pessoa"
 * ========================================================
 *
 * ATENÇÃO: Este é o núcleo protegido da solução Whitebox.
 * NÃO compartilhe este arquivo. Ele contém a lógica de licenciamento,
 * os prompts da IA e o acesso à Planilha Global.
 *
 * CONFIGURAÇÃO INICIAL (Script Properties deste script):
 *   SHARED_TOKEN        — Token secreto do Admin (Dashboard e rotas administrativas)
 *   ADMIN_SPREADSHEET_ID — ID da sua Planilha Global de administração
 *   IA_PROVIDER / IA_MODEL / IA_BASE_URL / IA_GLOBAL_KEY
 *                       — (Opcional) IA global para professores autorizados; ver IAProviders.gs
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
    const msg = '❌ Acesso Negado: Whitebox não provisionado.\n\n' +
                'Para administradores: execute a função AdminSetup.setupPlanilhaGlobal() ' +
                'manualmente no Editor do Apps Script para gerar a chave e configurar o sistema.';
    return ContentService.createTextOutput(msg);
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
  const ia = resolverConfigIA(registro, cfg);

  if (!ia) {
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
  return analisarComIA(promptFinal, {}, ia);
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
  // Escola em modo add-on recebe o mestre sem script vinculado (Escolas.gs).
  const cfg      = getConfig();
  const registro = buscarRegistroProfessor(email, cfg.adminSpreadsheetId);
  const semente  = escolherSemente(
    registro ? configEscola(registro.escola, cfg.adminSpreadsheetId) : null,
    uiData.seedId,
    lerConfigGlobal(cfg.adminSpreadsheetId, CONFIG_KEY_SEED_DOC_ID_ADDON)
  );
  if (semente.aviso) Logger.log('[distribuirMestre] ' + semente.aviso);
  const seedId = semente.seedId;

  if (!seedId) throw new Error('ID do Documento Semente não configurado.');

  try {
    // 1. Clonar o Documento Semente e colocar na pasta Admin
    const originalFile = DriveApp.getFileById(seedId);
    const newName = 'Whitebox - Modelo Mestre (' + email + ')';
    const targetFolder = getOrCreateTargetFolder();
    const copy = originalFile.makeCopy(newName, targetFolder);
    
    // 2. Gravar a Auto-Configuração no documento [ARCH-LIB]
    try {
      _gravarConfigNoDocumento(copy.getId(), email);
      Logger.log('[BrainProxy] Configuração gravada com sucesso no novo Mestre.');
    } catch (metaErr) {
      Logger.log('[BrainProxy] Erro (não-crítico) ao gravar configuração no documento: ' + metaErr);
    }

    // 3. Tentar dar permissão de dono ao professor (para ir pro Meu Drive dele)
    try {
      copy.setOwner(email);
    } catch (e) {
      // Fallback caso a transferência de propriedade entre domínios seja bloqueada pelo Workspace
      copy.addEditor(email);
    }
    
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
 *
 * Só o nível Aluno usa o `identifier`. Os demais listam todos os itens do nível
 * (uma instituição, um professor ou uma turma por item) — ver calcularHeatmapsGerais.
 */
function getHeatmapData(token, scope, identifier) {
  validateAdminAccess(token);

  if (scope === 'aluno_atividades') {
    return calcularHeatmapAluno(identifier); // identifier = email_aluno
  } else if (scope === 'turma_atividades') {
    return calcularHeatmapsGerais().turma;
  } else if (scope === 'professor') {
    return calcularHeatmapsGerais().professor;
  } else if (scope === 'instituicao') {
    return calcularHeatmapsGerais().instituicao;
  }

  throw new Error('Escopo de heatmap não suportado: ' + scope);
}

/** Risco acima deste valor, em documento entregue, conta como alerta */
const RISCO_ALERT_THRESHOLD = 60;

/**
 * Agrega as linhas de uma aba Logs por documento. Base de todos os heatmaps.
 *
 * As linhas de um documento têm duas origens: a telemetria do aluno (esforço, entrega
 * final) e as análises de IA, gravadas pelo professor com o e-mail DELE em Email_Aluno.
 * Por isso tudo é ligado pelo DocId, e não pelo e-mail. Linhas sem DocId (análises
 * gravadas por versões antigas da biblioteca) não têm como ser atribuídas e ficam de fora.
 *
 * @param {Array<Array>} logs - getValues() da aba Logs, com o cabeçalho na primeira linha
 * @param {Object<string, boolean>} professores - e-mails (lowercase) que não contam como aluno
 * @returns {Object<string, {turma: string, riscoTotal: number, analises: number, altoRisco: number,
 *           alunos: Object<string, {esforcoTotal: number, count: number, entregue: boolean}>}>}
 *          Por DocId; `alunos` é indexado pelo e-mail (lowercase) de quem enviou telemetria.
 */
function _agregarLogsPorDocumento(logs, professores) {
  const docs = {};
  if (!logs || logs.length < 2) return docs;

  const h       = logs[0];
  const EMAIL   = h.indexOf('Email_Aluno');
  const DOC     = h.indexOf('DocId');
  const TURMA   = h.indexOf('Turma');
  const RISCO   = h.indexOf('RiscoScore');
  const ESFORCO = h.indexOf('Tempo_Ativo_Min');
  const FINAL   = h.indexOf('Entrega_Final');
  if (EMAIL === -1 || DOC === -1) return docs; // Headers inválidos

  for (let i = 1; i < logs.length; i++) {
    const docId = String(logs[i][DOC] || '');
    if (!docId) continue;
    if (!docs[docId]) docs[docId] = { turma: '', riscoTotal: 0, analises: 0, altoRisco: 0, alunos: {} };
    const doc = docs[docId];

    // Só linha de análise tem RiscoScore; a telemetria deixa a célula vazia.
    const risco = parseFloat(logs[i][RISCO]);
    if (!isNaN(risco)) {
      doc.riscoTotal += risco;
      doc.analises++;
      if (risco > RISCO_ALERT_THRESHOLD) doc.altoRisco++;
      continue;
    }

    const email = String(logs[i][EMAIL]).trim().toLowerCase();
    if (!email || professores[email]) continue;
    if (!doc.alunos[email]) doc.alunos[email] = { esforcoTotal: 0, count: 0, entregue: false };
    const aluno = doc.alunos[email];
    aluno.esforcoTotal += parseFloat(logs[i][ESFORCO]) || 0;
    aluno.count++;
    if (logs[i][FINAL] === 'Sim') aluno.entregue = true;
    if (!doc.turma) doc.turma = String(logs[i][TURMA] || '');
  }
  return docs;
}

/** E-mails (lowercase) da aba Assinaturas: quem é professor não conta como aluno. */
function _mapaDeProfessores(assData, emailColIdx) {
  const professores = {};
  for (let r = 1; r < assData.length; r++) {
    const email = String(assData[r][emailColIdx] || '').trim().toLowerCase();
    if (email) professores[email] = true;
  }
  return professores;
}

/**
 * Integridade = 100 - risco médio das análises (risco alto → integridade baixa).
 * Sem análise não há o que afirmar: null, e não 100.
 */
function _integridadeHeatmap(riscoTotal, analises) {
  return analises > 0 ? Math.round(100 - riscoTotal / analises) : null;
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
 * Um item por documento do aluno, na mesma posição em todos os arrays:
 *   labels    — DocId
 *   valores   — integridade (100 - risco médio das análises de IA); null se não houve análise
 *   alertas   — nº de análises com risco > 60, contadas só em documento com entrega final
 *   esforcos  — minutos médios de escrita (linhas do aluno)
 *   analises  — nº de análises de IA do documento
 *   entregues — true se o aluno marcou a entrega final
 *   turmas    — turma registrada na telemetria
 * e um `resumo` do aluno: { integridadeMedia, alunosAtivos, alertas, documentos }.
 *
 * @param {string} emailAluno
 * @returns {{ labels: string[], valores: Array<number|null>, alertas: number[], esforcos: number[],
 *             analises: number[], entregues: boolean[], turmas: string[], resumo: object,
 *             _fromCache?: boolean, _cachedAt?: string, _calculatedAt?: string }}
 */
function calcularHeatmapAluno(emailAluno) {
  if (!emailAluno) return { labels: [], valores: [], alertas: [] };

  // ===== L1: Cache CacheService (1 hora) com suporte a Chunking [Patch 3] =====
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'HEATMAP_ALUNO_' + emailAluno.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      let payloadToParse = cached;
      if (cached.startsWith('CHUNKED:')) {
        const numChunks = parseInt(cached.split(':')[1], 10);
        payloadToParse = '';
        for (let i = 0; i < numChunks; i++) {
          const chunkStr = cache.get(cacheKey + '_chunk_' + i);
          if (!chunkStr) throw new Error('Chunk ' + i + ' ausente');
          payloadToParse += chunkStr;
        }
      }
      const parsed = JSON.parse(payloadToParse);
      Logger.log('[BrainProxy] calcularHeatmapAluno: cache HIT para ' + emailAluno);
      return Object.assign(parsed, { _fromCache: true });
    } catch (e) {
      Logger.log('[BrainProxy] calcularHeatmapAluno: cache inválido (' + e.message + '), recalculando...');
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

  const alvo        = String(emailAluno).trim().toLowerCase();
  const professores = _mapaDeProfessores(assData, emailColIdx);

  // docId → { riscoTotal, analises, altoRisco, esforcoTotal, count, entregue, turma }
  const aggregated = {};
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

      // Documentos em que este aluno enviou telemetria; o esforço e a entrega são os dele.
      const docs = _agregarLogsPorDocumento(logs, professores);
      Object.keys(docs).forEach(docId => {
        const doAluno = docs[docId].alunos[alvo];
        if (doAluno) aggregated[docId] = Object.assign({}, docs[docId], doAluno);
      });
    } catch (e) {
      Logger.log('[BrainProxy] calcularHeatmapAluno: erro na planilha ' + profSSId + ': ' + e);
    }
  }

  const elapsedMs = Date.now() - startMs;
  Logger.log('[BrainProxy] calcularHeatmapAluno: varreu ' + planilhasVarriadas +
             ' planilhas em ' + elapsedMs + 'ms para ' + emailAluno);

  const labels   = Object.keys(aggregated);
  const itens    = labels.map(l => aggregated[l]);
  const valores  = itens.map(a => _integridadeHeatmap(a.riscoTotal, a.analises));
  // Alerta = documento entregue que tem análise de risco alto. Entrega (linha do aluno) e
  // risco (linha do professor) nunca estão na mesma linha: a regra só fecha por documento.
  const alertas  = itens.map(a => a.entregue ? a.altoRisco : 0);
  const esforcos = itens.map(a => a.count > 0 ? Math.round(a.esforcoTotal / a.count) : 0);
  const soma     = campo => itens.reduce((total, a) => total + a[campo], 0);

  const resultado = {
    labels,
    valores,
    alertas,
    esforcos,              // Minutos médios de escrita por documento
    analises:  itens.map(a => a.analises),
    entregues: itens.map(a => a.entregue),
    turmas:    itens.map(a => a.turma),
    resumo: {
      integridadeMedia: _integridadeHeatmap(soma('riscoTotal'), soma('analises')),
      alunosAtivos:     labels.length > 0 ? 1 : 0,
      alertas:          alertas.reduce((total, n) => total + n, 0),
      documentos:       labels.length
    },
    _calculatedAt: new Date().toISOString(),
    _elapsedMs:    elapsedMs,
    _fromCache:    false
  };

  // ===== Persistir no cache com suporte a Chunking (limite nativo ~100KB) [Patch 3] =====
  try {
    const payload = Object.assign({}, resultado, { _fromCache: false });
    const serialized = JSON.stringify(payload);
    
    // Evita erro se for maior que ~90KB dividindo em chunks
    if (serialized.length < 90000) {
      cache.put(cacheKey, serialized, 3600); // TTL: 1 hora (3600s)
      Logger.log('[BrainProxy] calcularHeatmapAluno: resultado em cache por 1h.');
    } else {
      const numChunks = Math.ceil(serialized.length / 90000);
      for (let i = 0; i < numChunks; i++) {
        const chunkStr = serialized.substring(i * 90000, (i + 1) * 90000);
        cache.put(cacheKey + '_chunk_' + i, chunkStr, 3600);
      }
      cache.put(cacheKey, 'CHUNKED:' + numChunks, 3600);
      Logger.log('[BrainProxy] calcularHeatmapAluno: resultado em cache usando ' + numChunks + ' chunks.');
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
 * Invalida o heatmap de todos os alunos que têm linhas em um documento.
 * Necessário quando quem grava é o professor (análise de IA): a linha leva o e-mail dele,
 * mas o heatmap que muda é o dos alunos daquele documento.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} logSheet
 * @param {string[]} headers - Cabeçalho da aba Logs
 * @param {string} docId
 */
function invalidarCacheHeatmapDoDocumento(logSheet, headers, docId) {
  const docCol   = headers.indexOf('DocId');
  const emailCol = headers.indexOf('Email_Aluno');
  const linhas   = logSheet.getLastRow() - 1;
  if (docCol === -1 || emailCol === -1 || linhas < 1) return;

  const docs   = logSheet.getRange(2, docCol + 1, linhas, 1).getValues();
  const emails = logSheet.getRange(2, emailCol + 1, linhas, 1).getValues();
  const vistos = {};
  for (let i = 0; i < linhas; i++) {
    const email = String(emails[i][0]);
    if (String(docs[i][0]) === String(docId) && email && !vistos[email]) {
      vistos[email] = true;
      invalidarCacheHeatmap(email);
    }
  }
}

/**
 * Heatmaps agregados: um item por instituição, por professor e por turma.
 *
 * Uma única varredura das planilhas de todos os professores produz os três níveis, com as
 * mesmas regras do heatmap por aluno (ver _agregarLogsPorDocumento e calcularHeatmapAluno).
 * Só entram documentos em que algum aluno enviou telemetria.
 *
 * A turma é o nome registrado na telemetria (a pasta da turma no Drive do aluno): os logs
 * não guardam ID de curso do Classroom nem de atividade. Como o nome pode se repetir entre
 * professores, cada turma é identificada junto com o professor.
 *
 * Cada nível traz, na mesma posição em todos os arrays:
 *   labels, valores (integridade ou null), alertas, alunos, documentos, analises
 * e um `resumo` de todo o conjunto: { integridadeMedia, alunosAtivos, alertas, documentos }.
 * "Alunos ativos" = alunos distintos com telemetria.
 *
 * Cache de CACHE_HEATMAP_GERAL_TTL_SEC; nova análise ou entrega final o invalida
 * (ver logarNaPlanilhaProfessor). O custo cresce com o nº de professores — ver ARCH-07.
 *
 * @returns {{ instituicao: object, professor: object, turma: object }}
 */
function calcularHeatmapsGerais() {
  const cache  = CacheService.getScriptCache();
  const cached = cache.get(CACHE_HEATMAP_GERAL);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log('[BrainProxy] calcularHeatmapsGerais: cache inválido, recalculando...');
    }
  }

  const cfg     = getConfig();
  const assData = getPlanilhaGlobal(cfg.adminSpreadsheetId).getDataRange().getValues();
  const assH    = assData[0];
  const emailColIdx = assH.indexOf(COL_EMAIL);
  const ssColIdx    = assH.indexOf(COL_SPREADSHEET_ID);
  const instColIdx  = assH.indexOf(COL_INSTITUICAO);

  const grupos = { instituicao: {}, professor: {}, turma: {} };
  const geral  = _novoGrupoHeatmap('');

  if (emailColIdx !== -1 && ssColIdx !== -1) {
    const professores = _mapaDeProfessores(assData, emailColIdx);

    for (let r = 1; r < assData.length; r++) {
      const profSSId = assData[r][ssColIdx];
      if (!profSSId || String(profSSId).trim() === '') continue;

      const professor   = String(assData[r][emailColIdx]);
      const instituicao = String((instColIdx !== -1 && assData[r][instColIdx]) || 'Não informada');

      try {
        const logSheet = SpreadsheetApp.openById(profSSId).getSheetByName(SHEET_LOGS);
        if (!logSheet) continue;

        const docs = _agregarLogsPorDocumento(logSheet.getDataRange().getValues(), professores);
        Object.keys(docs).forEach(docId => {
          const doc    = docs[docId];
          const alunos = Object.keys(doc.alunos);
          if (alunos.length === 0) return; // só análises, nenhum aluno: sem a quem atribuir

          const turma = doc.turma || 'SEM_TURMA';
          [
            _grupoHeatmap(grupos.instituicao, instituicao, instituicao),
            _grupoHeatmap(grupos.professor, professor, professor),
            _grupoHeatmap(grupos.turma, professor + '\n' + turma, turma + ' (' + professor + ')'),
            geral
          ].forEach(grupo => {
            grupo.riscoTotal += doc.riscoTotal;
            grupo.analises   += doc.analises;
            grupo.documentos++;
            // Mesma regra do heatmap por aluno: risco alto só é alerta em documento entregue
            if (alunos.some(email => doc.alunos[email].entregue)) grupo.alertas += doc.altoRisco;
            alunos.forEach(email => { grupo.alunos[email] = true; });
          });
        });
      } catch (e) {
        Logger.log('[BrainProxy] calcularHeatmapsGerais: erro na planilha ' + profSSId + ': ' + e);
      }
    }
  } else {
    Logger.log('[BrainProxy] calcularHeatmapsGerais: colunas obrigatórias ausentes na aba Assinaturas.');
  }

  const resumo = {
    integridadeMedia: _integridadeHeatmap(geral.riscoTotal, geral.analises),
    alunosAtivos:     Object.keys(geral.alunos).length,
    alertas:          geral.alertas,
    documentos:       geral.documentos
  };
  const resultado = {
    instituicao: _nivelHeatmap(grupos.instituicao, resumo),
    professor:   _nivelHeatmap(grupos.professor, resumo),
    turma:       _nivelHeatmap(grupos.turma, resumo)
  };

  try {
    const serialized = JSON.stringify(resultado);
    if (serialized.length < 90000) cache.put(CACHE_HEATMAP_GERAL, serialized, CACHE_HEATMAP_GERAL_TTL_SEC);
  } catch (e) {
    Logger.log('[BrainProxy] calcularHeatmapsGerais: falha ao persistir no cache: ' + e);
  }

  return resultado;
}

function _novoGrupoHeatmap(rotulo) {
  return { rotulo: rotulo, riscoTotal: 0, analises: 0, alertas: 0, documentos: 0, alunos: {} };
}

/** Devolve o grupo da chave, criando-o na primeira vez. */
function _grupoHeatmap(grupos, chave, rotulo) {
  if (!Object.prototype.hasOwnProperty.call(grupos, chave)) grupos[chave] = _novoGrupoHeatmap(rotulo);
  return grupos[chave];
}

/** Monta os arrays de um nível, com os itens em alerta primeiro. */
function _nivelHeatmap(grupos, resumo) {
  const itens = Object.keys(grupos).map(chave => grupos[chave])
    .sort((a, b) => (b.alertas - a.alertas) || a.rotulo.localeCompare(b.rotulo));
  return {
    labels:     itens.map(g => g.rotulo),
    valores:    itens.map(g => _integridadeHeatmap(g.riscoTotal, g.analises)),
    alertas:    itens.map(g => g.alertas),
    alunos:     itens.map(g => Object.keys(g.alunos).length),
    documentos: itens.map(g => g.documentos),
    analises:   itens.map(g => g.analises),
    resumo:     resumo
  };
}

// =====================================================
//  ROTEADOR PRINCIPAL (doPost)
// =====================================================

function doPost(e) {
  try {
    // [Patch 6] Crash Payload JSON - validar e.postData
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ error: 'BAD_REQUEST', message: 'Payload vazio ou não suportado.' }, 400);
    }
    
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ error: 'BAD_REQUEST', message: 'Payload JSON inválido.' }, 400);
    }
    const cfg  = getConfig();

    // 1. Autenticação [Patch 2]
    // A. Admin via SHARED_TOKEN — credencial exclusiva do Admin, nunca distribuída a clientes.
    const isAdmin = !!cfg.sharedToken && body.token === cfg.sharedToken;
    // B. Cliente (professor ou aluno) via OAuth Token — identidade verificada pelo Google.
    const token       = isAdmin ? null : verificarTokenOAuth(body.oauthToken);
    const callerEmail = token ? token.email : null;

    if (!isAdmin && !callerEmail) {
      return jsonResponse({ error: 'UNAUTHORIZED', message: 'Token inválido ou não autorizado.' }, 401);
    }

    const route = body.route || '';

    // 2. Autorização: alunos só logam métricas (em nome do professor da turma) e
    // consultam o próprio resumo de processo (o handler filtra pelo e-mail verificado).
    // Nas demais rotas o chamador precisa ser o próprio professorEmail.
    const rotaAbertaAAlunos = (route === ROUTE_LOGAR_METRICAS || route === ROUTE_RESUMO_PROCESSO ||
                              route === ROUTE_REGISTRAR_MEDICOES || route === 'ping');
    const professorEmail = String(body.professorEmail || '').trim().toLowerCase();
    if (!isAdmin && !rotaAbertaAAlunos && callerEmail !== professorEmail) {
      return jsonResponse({ error: 'UNAUTHORIZED', message: 'Token inválido ou não autorizado.' }, 401);
    }

    // [AUTH-03] Papel de professor validado aqui, nunca pelo papel calculado no cliente:
    // estas rotas exigem cadastro com Status "Ativo" na aba Assinaturas.
    const rotaDeProfessor = [
      ROUTE_REGISTRAR_CHAVE, ROUTE_ANALISAR,
      ROUTE_LISTAR_TURMAS_PROFESSOR, ROUTE_CRIAR_LEVA_TEMPLATE, ROUTE_COPIAR_MODELO_ATIVIDADE,
      ROUTE_RADAR_DOCUMENTO
    ].indexOf(route) !== -1;
    if (rotaDeProfessor && professorEmail) {
      const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
      if (!registro) {
        return jsonResponse({
          error:   'PROFESSOR_NAO_CADASTRADO',
          message: 'Professor não cadastrado. Solicite o cadastro ao administrador.'
        }, 403);
      }
      if (registro.status !== 'Ativo') {
        return jsonResponse({
          error:   'PROFESSOR_INATIVO',
          message: 'Licença inativa. Entre em contato com o administrador.'
        }, 403);
      }
    }

    // 3. Roteamento
    switch (route) {
      case ROUTE_REGISTRAR_CHAVE:
        return handleRegistrarChave(body, cfg);
      case ROUTE_ANALISAR:
        return handleAnalisar(body, cfg);
      case ROUTE_LOGAR_METRICAS:
        return handleLogarMetricas(body, cfg);
      case ROUTE_STATUS_LICENCA:
        return handleStatusLicenca(body, cfg);
      case ROUTE_RESUMO_PROCESSO:
        return handleResumoProcesso(body, cfg, callerEmail);
      case ROUTE_REGISTRAR_MEDICOES:
        return handleRegistrarMedicoes(body, cfg, callerEmail, token ? token.clientId : '');
      case ROUTE_RADAR_DOCUMENTO:
        return handleRadarDocumento(body, cfg);

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
      case ROUTE_COPIAR_MODELO_ATIVIDADE:
        return handleCopiarModeloAtividade(body, cfg, callerEmail);

      // ── Health Check / Setup Validation ─────────────────────────
      case 'ping': {
        // Diz ao chamador qual ID de cliente OAuth veio no token e se é o do add-on
        // (ADDON_CLIENT_IDS), e registra no log: é a conferência do passo 7 do guia do add-on.
        const ping = respostaPing(callerEmail, token ? token.clientId : '', idsDoAddon());
        if (!isAdmin) Logger.log('[ping] ' + ping.email + ' | clientId=' + ping.clientId + ' | origem=' + ping.origem);
        // Etapa 3 do Radar: a conta com quem o painel compartilha a cópia (só se ligada).
        ping.contaServidor = radarRevisoesAtivas() ? radarContaServidor() : '';
        return jsonResponse(ping);
      }

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
  const temChave = (usaGlobalBoolean && iaGlobalDisponivel(cfg)) ? true :
                   (chaveIndividual && chaveIndividual.trim().length > 0) ? true : false;

  // Modo do painel da escola (Escolas.gs): o painel usa para avisar o professor.
  let modoPainel = MODO_PAINEL_SCRIPT, tipoConta = TIPO_CONTA_WORKSPACE;
  try {
    const ce = configEscola(escola, cfg.adminSpreadsheetId);
    modoPainel = ce.modoPainel;
    tipoConta  = ce.tipoConta;
  } catch (e) {
    Logger.log('[BrainProxy] configEscola falhou: ' + e);
  }

  return jsonResponse({
    status: 'ATIVO',
    escola: escola,
    modoPainel: modoPainel,
    tipoConta: tipoConta,
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
  validateAdminAccess(body.token);

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

  // [MED-06 FIX] Validar formato do email
  let emailNormalizado;
  try {
    emailNormalizado = validarEmail(professorEmail);
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
    if (String(data[i][emailCol]).trim().toLowerCase() === emailNormalizado) {
      // Grafia da planilha: é a mesma que _lerChaveIndividual usa para ler 'APIKEY_' + registro.email
      const emailRegistrado = data[i][emailCol];
      // Atualizar chave [Patch 11]
      if (apiKey) {
        if (detectarProvedorPorChave(apiKey)) {
          PropertiesService.getScriptProperties().setProperty('APIKEY_' + emailRegistrado, apiKey);
          sheet.getRange(i + 1, chaveCol + 1).setValue('SECURE_STORAGE');
        } else if (/\/d\/[-\w]{25,}/.test(apiKey) || /^[-\w]{25,}$/.test(apiKey.trim())) {
          sheet.getRange(i + 1, chaveCol + 1).setValue(apiKey); // Cofre Drive (link ou ID do arquivo)
        } else {
          // Formato desconhecido: não gravar em claro na planilha.
          return jsonResponse({
            error:   'CHAVE_FORMATO_INVALIDO',
            message: 'Formato de chave não reconhecido. Use uma chave do Gemini (AIza... ou AQ....) ou do Claude (sk-ant-...).'
          }, 400);
        }
      } else {
        PropertiesService.getScriptProperties().deleteProperty('APIKEY_' + emailRegistrado);
        sheet.getRange(i + 1, chaveCol + 1).setValue('');
      }
      // Garantir que a planilha do professor existe
      const spreadsheetId = garantirPlanilhaProfessor(emailRegistrado, sheet, i, spreadsheetCol);
      return jsonResponse({ success: true, action: 'atualizado', spreadsheetId });
    }
  }

  // [AUTH-03] Sem auto-cadastro: professores entram apenas pelo onboarding do Admin
  // (FormOnboarding / adicionarProfessor). O doPost já barra não cadastrados.
  return jsonResponse({ error: 'PROFESSOR_NAO_CADASTRADO' }, 403);
}

// =====================================================
//  HANDLER: Analisar com IA
// =====================================================

function handleAnalisar(body, cfg) {
  const { professorEmail, alunoEmail, fragmento, metricas } = body;
  if (!professorEmail || !fragmento) {
    return jsonResponse({ error: 'PARAMS_REQUIRED' }, 400);
  }

  // [AUTH-03] Auditoria de Segurança: 
  // O Auditor de IA é uma ferramenta de uso exclusivo do Professor.
  // Alunos não devem ter acesso direto a esta rota via interface.

  // [ARCH-06] Rate Limiting: previne abuso da API de IA (tokens)
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
  const ia       = resolverConfigIA(registro, cfg);

  // Modo Offline: sem IA disponível
  if (!ia) {
    return jsonResponse({
      modoIA: false,
      toneChangeDetected: false,
      riskEvidence: null,
      pedagogicalAdvice: null,
      message: 'Análise de IA não disponível (modo offline). Configure sua API Key nas configurações.'
    });
  }

  // Análise com o provedor resolvido (Patch 10: Incluir conselho pedagógico)
  const analise = analisarComIA(fragmento, metricas, ia, registro.conselhoPedagogico);
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
    return jsonResponse({
      error:   'PLANILHA_PROFESSOR_NAO_ENCONTRADA',
      message: 'O professor deste documento não está cadastrado no Whitebox ou ainda não tem planilha de registros.'
    }, 404);
  }

  // O professor do documento não é aluno: telemetria sem análise em nome dele (pré-visualização
  // da visão do aluno, painel aberto antes de o papel ser conhecido) não vai para os Logs.
  // As linhas de análise de IA continuam: elas levam o e-mail do professor como Email_Aluno.
  const alunoNorm = String(alunoEmail || '').trim().toLowerCase();
  if (!analise && alunoNorm && alunoNorm === String(professorEmail).trim().toLowerCase()) {
    return jsonResponse({ success: true, ignorado: 'PROFESSOR_NAO_E_ALUNO' });
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
//  LÓGICA: Resolver IA (Hierarquia e Cofre Drive)
// =====================================================

/**
 * Decide qual provedor, modelo e chave atendem este professor.
 *
 * @param {object|null} registro - buscarRegistroProfessor()
 * @param {object} cfg - getConfig()
 * @returns {{ provider: string, model: string, apiKey: string|null, baseUrl: string|null }|null}
 *          null = modo offline
 */
function resolverConfigIA(registro, cfg) {
  if (!registro) return null;

  // 1. IA Global (se professor está autorizado a usá-la)
  if (registro.usaChaveGlobal === 'Sim' && iaGlobalDisponivel(cfg)) {
    return {
      provider: cfg.iaProvider,
      model:    cfg.iaModel || IA_PROVIDERS[cfg.iaProvider].modeloPadrao,
      apiKey:   cfg.iaGlobalKey,
      baseUrl:  cfg.iaBaseUrl
    };
  }

  // 2. Chave Individual: o provedor é deduzido do formato da chave.
  // IA_MODEL pertence ao provedor global; só vale aqui se o provedor for o mesmo.
  const chave    = _lerChaveIndividual(registro);
  const provider = detectarProvedorPorChave(chave);

  // 3. Modo Offline
  if (!provider) return null;

  return {
    provider: provider,
    model:    (provider === cfg.iaProvider && cfg.iaModel) || IA_PROVIDERS[provider].modeloPadrao,
    apiKey:   chave,
    baseUrl:  null
  };
}

/**
 * Lê a chave individual do professor: API Key direta, SECURE_STORAGE ou ID/Link do Cofre no Drive.
 *
 * @returns {string|null}
 * @private
 */
function _lerChaveIndividual(registro) {
  let chaveRaw = registro.chaveIndividual;
  if (chaveRaw && chaveRaw.trim().length > 0) {
    chaveRaw = chaveRaw.trim();

    // [Patch 11] Se for uma chave salva no PropertiesService
    if (chaveRaw === 'SECURE_STORAGE') {
      const storedKey = PropertiesService.getScriptProperties().getProperty('APIKEY_' + registro.email);
      if (storedKey) return storedKey;
    }

    // Se for uma chave direta gravada na planilha (Legacy compatibilidade)
    if (detectarProvedorPorChave(chaveRaw)) {
      return chaveRaw;
    }
    
    // Senão, assumimos que é um Cofre no Drive (Alternativa 2)
    try {
      let fileId = chaveRaw;
      // Extrair o ID caso o admin tenha colado a URL inteira
      const matchUrl = chaveRaw.match(/\/d\/([-\w]{25,})/);
      if (matchUrl) fileId = matchUrl[1];
      
      const file = DriveApp.getFileById(fileId);
      const mimeType = file.getMimeType();
      let chaveExtraida = '';

      if (mimeType === MimeType.PLAIN_TEXT || mimeType === 'text/plain') {
        if (file.getSize() > 1024 * 50) { // Max 50KB
          Logger.log('[Cofre Drive] Arquivo texto muito grande (>50KB), abortando.');
          return null;
        }
        chaveExtraida = file.getBlob().getDataAsString().trim();
      } else if (mimeType === MimeType.GOOGLE_DOCS) {
        chaveExtraida = DocumentApp.openById(fileId).getBody().getText().trim();
        if (chaveExtraida.length > 50000) {
           Logger.log('[Cofre Drive] Documento Docs muito longo (>50K chars), abortando.');
           return null;
        }
      } else {
        Logger.log('[Cofre Drive] MimeType de cofre não suportado: ' + mimeType);
        return null;
      }
      
      if (detectarProvedorPorChave(chaveExtraida)) {
        Logger.log('[Cofre Drive] Chave API lida do cofre do professor com sucesso.');
        return chaveExtraida;
      } else {
        Logger.log('[Cofre Drive] O arquivo lido não contém uma chave de API reconhecida.');
        return null; // Força modo offline
      }
    } catch (e) {
      Logger.log('[Cofre Drive] Erro ao acessar arquivo de cofre. Arquivo inacessível ou não compartilhado. Erro: ' + e.toString());
      return null; // Força modo offline
    }
  }

  return null;
}

// analisarComIA() → ver IAProviders.gs
// A chamada ao provedor (Gemini, Claude, Ollama) foi movida para IAProviders.gs.

/**
 * Utilitário para extrair JSON de strings que podem conter Markdown
 */
// extrairJSON() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)


// =====================================================
//  PROMPT SOCRÁTICO PEDAGÓGICO (Lógica Proprietária)
// =====================================================

function construirPromptSocratico(fragmento, metricas, conselhoPedagogico) {
  const editRatio  = metricas?.editRatio ?? 'desconhecido';
  const pasteCount = metricas?.pasteEvents?.count ?? 0;
  const activeMins = metricas?.activeFocusTimeMinutes ?? 0;
  const peakCpm    = metricas?.typingSpeed?.peakCharsPerMinute ?? 0;

  const diretriz = conselhoPedagogico ? `\nDIRETRIZ PEDAGÓGICA DO PROFESSOR (priorize isto no conselho e pergunta):\n"${conselhoPedagogico}"\n` : '';

  return `
Você é um auditor pedagógico socrático do sistema Whitebox. 
Analise o trecho de texto abaixo junto com as métricas comportamentais do aluno.
Identifique padrões que possam indicar falta de autoria própria (uso não declarado de IA, plágio ou cola).
${diretriz}
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
  "justification": "Explicação detalhada dos motivos que levaram a este score",
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

  // Criar nova planilha em WhiteBox/planilhas_dos_professores/<Instituição>, já
  // compartilhada com o professor (ele não precisa pedir acesso).
  const nomePlanilha = 'Whitebox - ' + email;
  const ss = SpreadsheetApp.create(nomePlanilha);
  let instituicao = '';
  try {
    const headers = adminSheet.getRange(1, 1, 1, adminSheet.getLastColumn()).getValues()[0];
    const instCol = headers.indexOf('Instituicao');
    if (instCol !== -1) instituicao = adminSheet.getRange(rowIndex + 1, instCol + 1).getValue();
  } catch (e) {
    Logger.log('[BrainProxy] Instituição do professor ilegível: ' + e);
  }
  organizarPlanilhaProfessor(ss.getId(), email, instituicao);
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
  // e que ela é da versão por estados (a antiga lia notas 0–100 e o primeiro registro).
  const heatSheet = ss.getSheetByName('Visual_Heatmap');
  if (!heatSheet) {
    setupVisualHeatmapTab(ss.insertSheet('Visual_Heatmap'));
  } else if (heatSheet.getRange('A7').getValue() !== LEGENDA_VISUAL_HEATMAP) {
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
    analise?.riskScore        ?? '',   // ?? e não ||: risco 0 é uma análise, não ausência dela
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
  if (analise && docId) invalidarCacheHeatmapDoDocumento(logSheet, headers, docId);
  // Integridade e alertas dos heatmaps agregados só mudam com análise ou entrega final
  if (analise || isFinal) CacheService.getScriptCache().remove(CACHE_HEATMAP_GERAL);

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

/** Primeira linha da legenda da aba Visual_Heatmap (também marca a versão da aba). */
const LEGENDA_VISUAL_HEATMAP = 'Legenda (um código por parágrafo do aluno, do início ao fim):';

/**
 * [HEATMAP-03] Configura a aba Visual_Heatmap. Mostra o último registro do documento
 * (Heatmap_Scores, coluna U de Logs): um código por parágrafo do aluno, os mesmos do
 * Radar de Esforço do painel (RADAR_ESTADO_* em whitebox-lib/Constants.gs).
 */
function setupVisualHeatmapTab(sheet) {
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.getRange('A1').setValue('AUDITORIA VISUAL (RADAR DE ESFORÇO)').setFontWeight('bold').setFontSize(14);

  sheet.getRange('A4').setValue('Trabalho (DocId):');
  sheet.getRange('C4').setValue('<- Cole o ID do documento aqui');

  sheet.getRange('A6').setValue('RADAR DE ESFORÇO (ÚLTIMO REGISTRO)').setFontWeight('bold');
  sheet.getRange('A7:A12').setValues([
    [LEGENDA_VISUAL_HEATMAP],
    ['C = colagem detectada'],
    ['E = colado e depois editado'],
    ['N = escrito com o painel fechado (não observado)'],
    ['L = alerta antigo (confira o trecho)'],
    ['S = sem alerta (não prova autoria)']
  ]);

  // Último registro com Heatmap_Scores do documento (Logs: C = DocId, U = Heatmap_Scores).
  const ultimo = 'FILTER(Logs!U:U, Logs!C:C=B4, Logs!U:U<>"")';
  const formula = '=IFERROR(TRANSPOSE(SPLIT(INDEX(' + ultimo + ', ROWS(' + ultimo + ')), ",")), "Dados não encontrados")';
  sheet.getRange('B7').setFormula(formula);

  const range = sheet.getRange('B7:B1000');
  const regra = (codigo, fundo, fonte) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(codigo).setBackground(fundo).setFontColor(fonte).setRanges([range]).build();
  sheet.setConditionalFormatRules([
    regra('C', '#FDBA74', '#7C2D12'),
    regra('E', '#FED7AA', '#7C2D12'),
    regra('N', '#CBD5E1', '#1E293B'),
    regra('L', '#FDE68A', '#713F12'),
    regra('S', '#BFDBFE', '#1E3A8A')
  ]);
  sheet.setColumnWidth(1, 330);
  sheet.setColumnWidth(2, 60);
}

// jsonResponse() → ver Utils.gs
// [ARCH-02] Movida para Utils.gs (Utilitários Compartilhados)
//
// LIMITAÇÃO: ContentService sempre retorna HTTP 200 no Apps Script.
// O status real é embutido em body._httpStatus quando != 200.
// Ref: https://issuetracker.google.com/issues/36759757
