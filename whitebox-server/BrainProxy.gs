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
    // O proxy detectou que ainda não possui o Banco de Dados Global configurado.
    // Aciona a criação automática definida no AdminSetup.gs
    try {
      const result = setupPlanilhaGlobal(); // Função hospedada no AdminSetup.gs
      props.setProperty('ADMIN_SPREADSHEET_ID', result.id);
      
      // Auto-gerar o SHARED_TOKEN de segurança
      let generatedToken = props.getProperty('SHARED_TOKEN');
      if (!generatedToken) {
        generatedToken = 'WBX-' + Utilities.getUuid();
        props.setProperty('SHARED_TOKEN', generatedToken);
      }
      
      const msg = '✅ SUCESSO: Whitebox Auto-Provisionado!\n\n' +
                  'O Banco de Dados Admin foi criado no seu Google Drive.\n' +
                  'URL da Planilha: ' + result.url + '\n\n' +
                  '🔐 SEU TOKEN DE SEGURANÇA FOI GERADO AUTOMATICAMENTE:\n' +
                  'SHARED_TOKEN = ' + generatedToken + '\n\n' +
                  '⚠️ COPIE E GUARDE ESTE TOKEN! Você precisará colá-lo no Script do "Documento Modelo" (o código do Cliente).\n\n' +
                  '🔄 RECARREGUE ESTA PÁGINA PARA ACESSAR O DASHBOARD.';
      return ContentService.createTextOutput(msg);
    } catch (err) {
      return ContentService.createTextOutput('❌ Falha no Auto-Provisionamento:\n' + err.toString());
    }
  }
  
  // Se já provisionado, serve o Dashboard Administrativo
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Whitebox Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// =====================================================
//  ADMIN API: Funções para o Dashboard HTML
// =====================================================

function getAdminUIData() {
  const cfg = getConfig();
  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Buscar lista de professores
  const professores = [];
  const emailCol = headers.indexOf('Email');
  const escolaCol = headers.indexOf('Escola');
  const statusCol = headers.indexOf('Status');
  
  for (let i = 1; i < data.length; i++) {
    professores.push({
      email: data[i][emailCol],
      escola: data[i][escolaCol] || 'Não informada',
      status: data[i][statusCol] || 'Ativo'
    });
  }

  // Buscar Seed ID na aba Config
  const ss = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  const configSheet = ss.getSheetByName('Config');
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

function salvarSeedId(id) {
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

function distribuirMestreParaProfessor(email) {
  const uiData = getAdminUIData();
  const seedId = uiData.seedId;
  
  if (!seedId) throw new Error('ID do Documento Semente não configurado.');
  
  // 1. Clonar o Documento Semente
  const originalFile = DriveApp.getFileById(seedId);
  const newName = 'Whitebox - Modelo Mestre (' + email + ')';
  const copy = originalFile.makeCopy(newName);
  
  // 2. Dar permissão de editor ao professor
  copy.addEditor(email);
  
  // 3. (Opcional) Enviar e-mail notificando
  try {
    const subject = '📦 Seu Sistema Whitebox está pronto!';
    const body = `Olá!\n\nSeu Documento Mestre do Whitebox foi gerado e compartilhado com você.\n\n` +
                 `Link do Documento: ${copy.getUrl()}\n\n` +
                 `Lembre-se: Para usar com seus alunos, anexe este arquivo no Google Classroom e selecione "Fazer uma cópia para cada aluno".\n\n` +
                 `Equipe Whitebox`;
    MailApp.sendEmail(email, subject, body);
  } catch (err) {
    Logger.log('Erro ao enviar e-mail de notificação: ' + err);
  }
  
  return { success: true, url: copy.getUrl() };
}

// =====================================================
//  ROTEADOR PRINCIPAL (doPost)
// =====================================================

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
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
  const headers = data[0]; // Email | Escola | Status | UsaChaveGlobal | ChaveIndividual | SpreadsheetId

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
  newRow[headers.indexOf('Escola')] = 'Não informada';
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
//  LÓGICA: Resolver Chave API (Hierarquia)
// =====================================================

function resolverChaveApi(registro, geminiGlobalKey) {
  if (!registro) return null;

  // 1. Chave Global (se professor está autorizado a usá-la)
  if (registro.usaChaveGlobal === 'Sim' && geminiGlobalKey) {
    return geminiGlobalKey;
  }

  // 2. Chave Individual
  if (registro.chaveIndividual && registro.chaveIndividual.trim().length > 0) {
    return registro.chaveIndividual.trim();
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
    if (code !== 200) {
      Logger.log('[Gemini] Erro HTTP ' + code + ': ' + response.getContentText());
      return { error: 'GEMINI_API_ERROR', code: code };
    }

    const result = JSON.parse(response.getContentText());
    const text   = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { error: 'GEMINI_EMPTY_RESPONSE' };
    }

    // O prompt pede JSON estruturado
    return JSON.parse(text);
  } catch (err) {
    Logger.log('[Gemini] Exceção: ' + err);
    return { error: 'GEMINI_EXCEPTION', message: err.toString() };
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
    sheet = ss.insertSheet('Assinaturas');
    sheet.appendRow(['Email', 'Escola', 'Status', 'UsaChaveGlobal', 'ChaveIndividual', 'SpreadsheetId', 'DataCadastro']);
  }
  return sheet;
}

function buscarRegistroProfessor(email, adminSpreadsheetId) {
  try {
    const sheet = getPlanilhaGlobal(adminSpreadsheetId);
    const data  = sheet.getDataRange().getValues();
    const h     = data[0];
    const emailCol  = h.indexOf('Email');
    const escolaCol = h.indexOf('Escola');
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
