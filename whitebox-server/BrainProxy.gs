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

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    sharedToken:       props.getProperty('SHARED_TOKEN'),
    adminSpreadsheetId: props.getProperty('ADMIN_SPREADSHEET_ID'),
    geminiGlobalKey:   props.getProperty('GEMINI_GLOBAL_KEY') || null
  };
}

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
  
  return serveDashboard();
}

/** Serve o Dashboard Administrativo */
function serveDashboard() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Whitebox Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 
 * Validação interna para funções Admin chamadas via google.script.run
 * @param {string} token O token passado pelo frontend
 */
function validateAdminAccess(token) {
  const props = PropertiesService.getScriptProperties();
  const shared = props.getProperty('SHARED_TOKEN');
  if (!shared || token !== shared) {
    throw new Error('UNAUTHORIZED: Token Administrativo inválido ou ausente.');
  }
}

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
    // Encontrar o ID da planilha do professor
    let profSSId = '';
    for(let i=1; i<dataProf.length; i++) {
       if(dataProf[i][0] === profEmail) {
         profSSId = dataProf[i][5]; // Coluna SpreadsheetId
         break;
       }
    }
    
    if (!profSSId) return null;
    
    const ss = SpreadsheetApp.openById(profSSId);
    const sheet = ss.getSheetByName('Config_Pedagogica');
    const data = sheet.getDataRange().getValues();
    
    // Buscar por Course e Assignment
    for(let i=1; i<data.length; i++) {
      if(data[i][0] == courseId && data[i][1] == assignmentId) {
        return { instrucoes: data[i][3], rigor: data[i][4] };
      }
    }
  } catch (e) {
    Logger.log('Erro ao buscar config local: ' + e);
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
  const uiData = getAdminUIData(token);
  const seedId = uiData.seedId;
  
  if (!seedId) throw new Error('ID do Documento Semente não configurado.');
  
  try {
    // 1. Clonar o Documento Semente e colocar na pasta Admin
    const originalFile = DriveApp.getFileById(seedId);
    const newName = 'Whitebox - Modelo Mestre (' + email + ')';
    const targetFolder = getOrCreateTargetFolder();
    const copy = originalFile.makeCopy(newName, targetFolder);
    
    // 2. Dar permissão de editor ao professor
    copy.addEditor(email);
    
    // 3. Notificar via e-mail
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

function calcularHeatmapAluno(emailAluno) {
  // Mock logic for aggregation (search all logs where student email matches)
  return {
    labels: ['Tarefa 1', 'Tarefa 2', 'Tarefa 3'],
    valores: [85, 40, 92], // Scores de integridade/autonomia
    alertas: [0, 1, 0]
  };
}

function calcularHeatmapTurma(courseId) {
  const profEmail = Session.getActiveUser().getEmail();
  const ssId = buscarSpreadsheetProfessor(profEmail);
  if (!ssId) return { labels: [], media_esforco: [], media_integridade: [] };
  
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName('Logs');
  const data = sheet.getDataRange().getValues();
  
  // Agregação por Assignment_ID
  const stats = {};
  for(let i=1; i<data.length; i++) {
    const cid = data[i][3];
    if (cid != courseId) continue;
    
    const aid = data[i][2];
    if (!stats[aid]) stats[aid] = { esforco: 0, integridade: 0, count: 0 };
    stats[aid].esforco += data[i][4];
    stats[aid].integridade += data[i][6];
    stats[aid].count++;
  }
  
  const labels = Object.keys(stats);
  return {
    labels: labels,
    media_esforco: labels.map(l => stats[l].esforco / stats[l].count),
    media_integridade: labels.map(l => stats[l].integridade / stats[l].count)
  };
}

function buscarSpreadsheetProfessor(email) {
  const adminId = PropertiesService.getScriptProperties().getProperty('ADMIN_SPREADSHEET_ID');
  const sheet = SpreadsheetApp.openById(adminId).getSheetByName('Assinaturas');
  const data = sheet.getDataRange().getValues();
  for(let i=1; i<data.length; i++) {
    if(data[i][0] === email) return data[i][5];
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
      case 'registrar_chave':
        return handleRegistrarChave(body, cfg);
      case 'analisar':
        return handleAnalisar(body, cfg);
      case 'logar_metricas':
        return handleLogarMetricas(body, cfg);
      case 'status_licenca':
        return handleStatusLicenca(body, cfg);
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
//  HANDLER: Registrar / Atualizar Chave do Professor
// =====================================================

function handleRegistrarChave(body, cfg) {
  const { professorEmail, apiKey } = body;
  if (!professorEmail) return jsonResponse({ error: 'EMAIL_REQUIRED' }, 400);

  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // Email | Instituicao | Status | UsaChaveGlobal | ChaveIndividual | SpreadsheetId

  const emailCol         = headers.indexOf('Email');
  const chaveCol         = headers.indexOf('ChaveIndividual');
  const spreadsheetCol   = headers.indexOf('SpreadsheetId');

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
  const { professorEmail, fragmento, metricas } = body;
  if (!professorEmail || !fragmento) {
    return jsonResponse({ error: 'PARAMS_REQUIRED' }, 400);
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
function extrairJSON(texto) {
  try {
    // Tenta parse direto primeiro
    return JSON.parse(texto);
  } catch (e) {
    // Procura por blocos de código markdown: ```json { ... } ``` ou ``` { ... } ```
    const match = texto.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e2) {
        Logger.log('Falha ao parsear JSON dentro de blocos Markdown');
      }
    }
    // Se não encontrar blocos, tenta limpar caracteres extras antes/depois das chaves
    const fallbackMatch = texto.match(/\{[\s\S]*\}/);
    if (fallbackMatch) {
      try {
        return JSON.parse(fallbackMatch[0]);
      } catch (e3) {
        Logger.log('Falha no fallback de extração de chaves');
      }
    }
    throw new Error('Não foi possível extrair um JSON válido da resposta da IA');
  }
}

// =====================================================
//  PROMPT SOCRÁTICO PEDAGÓGICO (Lógica Proprietária)
// =====================================================

function construirPromptSocratico(fragmento, metricas) {
  const editRatio   = metricas?.editRatio ?? 'desconhecido';
  const pasteCount  = metricas?.pasteEvents?.count ?? 0;
  const activeMins  = metricas?.activeFocusTimeMinutes ?? 0;
  const peakCpm     = metricas?.typingSpeed?.peakCharsPerMinute ?? 0;

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

// =====================================================
//  PLANILHA GLOBAL (Admin / Desenvolvedor)
// =====================================================

function getPlanilhaGlobal(spreadsheetId) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName('Assinaturas');
  if (!sheet) {
    sheet = ss.getSheets()[0];
    const firstHeader = sheet.getRange('A1').getValue();
    if (firstHeader !== 'Email') {
      throw new Error('CRÍTICO: A aba principal "Assinaturas" não foi encontrada e a primeira aba foi alterada. Os dados podem ter sido perdidos.');
    }
  }
  return sheet;
}

function buscarRegistroProfessor(email, adminSpreadsheetId) {
  try {
    const sheet = getPlanilhaGlobal(adminSpreadsheetId);
    const data  = sheet.getDataRange().getValues();
    const h     = data[0];
    const emailCol  = h.indexOf('Email');
    const escolaCol = h.indexOf('Instituicao');
    const statusCol = h.indexOf('Status');
    const globalCol = h.indexOf('UsaChaveGlobal');
    const chaveCol  = h.indexOf('ChaveIndividual');
    const ssCol     = h.indexOf('SpreadsheetId');

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        return {
          email:           data[i][emailCol],
          escola:          data[i][escolaCol],
          status:          data[i][statusCol],
          usaChaveGlobal:  data[i][globalCol],
          chaveIndividual: data[i][chaveCol],
          spreadsheetId:   data[i][ssCol]
        };
      }
    }
    return null;
  } catch (err) {
    Logger.log('[BrainProxy] Erro ao buscar professor: ' + err);
    return null;
  }
}

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
    'Pergunta_Socratica', 'Modo_IA', 'Entrega_Final'
  ]);

  // Aba de Turmas
  let turmaSheet = ss.getSheetByName('Turmas');
  if (!turmaSheet) {
    turmaSheet = ss.insertSheet('Turmas');
    turmaSheet.appendRow(['Nome_Turma', 'Total_Alunos', 'Ultima_Atividade']);
  }
}

function logarNaPlanilhaProfessor(params) {
  const { spreadsheetId, turma, docId, alunoEmail, metricas, analise, isFinal } = params;

  const ss       = SpreadsheetApp.openById(spreadsheetId);
  const logSheet = ss.getSheetByName('Logs') || ss.insertSheet('Logs');

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
    isFinal ? 'Sim' : 'Não'
  ]);

  // Atualizar aba de Turmas
  atualizarTurma(ss, turma);
}

function atualizarTurma(ss, turma) {
  const sheet = ss.getSheetByName('Turmas') || ss.insertSheet('Turmas');
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === turma) {
      sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
      return;
    }
  }
  // Turma nova
  sheet.appendRow([turma, 1, new Date().toISOString()]);
}

// =====================================================
//  UTILITÁRIO: Resposta JSON Padronizada
// =====================================================

function jsonResponse(data, httpCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
