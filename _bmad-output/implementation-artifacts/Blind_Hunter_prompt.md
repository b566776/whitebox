Act as Blind Hunter (bmad-review-adversarial-general). You receive no project context. Review the following code adversarially for flaws, anti-patterns, and bad practices. Provide structured findings.

CODE TO REVIEW:
==== .clasp.json ====
{
  "scriptId": "1vGcyooljMaUVRPoN1gkkDfKNUb-oi65p0x1PODqnN006249US_P6iilp",
  "rootDir": "",
  "scriptExtensions": [
    ".js",
    ".gs"
  ],
  "htmlExtensions": [
    ".html"
  ],
  "jsonExtensions": [
    ".json"
  ],
  "filePushOrder": [],
  "skipSubdirectories": false
}

==== AdminSetup.gs ====
/**
 * ========================================================
 *  Whitebox - Setup da Planilha Global do Administrador
 * ========================================================
 * COMO USAR O AUTO-PROVISIONAMENTO:
 * 1. O cÃ³digo do BrainProxy.gs possui a rota doGet() embutida.
 * 2. ApÃ³s publicar o projeto como um Web App (App da Web), visite a URL do Web App no seu navegador.
 * 3. O prÃ³prio proxy detectarÃ¡ a primeira execuÃ§Ã£o e chamarÃ¡ a setupPlanilhaGlobal() automaticamente,
 *    criando o banco no seu Drive e salvando a propriedade ADMIN_SPREADSHEET_ID no Script sozinho.
 * 4. Ele tambÃ©m irÃ¡ gerar automaticamente um SHARED_TOKEN seguro e exibir na sua tela!
 */

function setupPlanilhaGlobal() {
  const ss = SpreadsheetApp.create('Whitebox - Painel Global Admin');
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(ss.getId()).moveTo(targetFolder);
  Logger.log('[AdminSetup] Planilha Global criada: ' + ss.getId());

  // ---- Aba de Assinaturas (Professores) ----
  let assinaturas = ss.getSheets()[0];
  assinaturas.setName('Assinaturas');
  assinaturas.appendRow([
    'Email', 'Instituicao', 'Status', 'UsaChaveGlobal', 'ChaveIndividual', 'SpreadsheetId', 'DataCadastro'
  ]);
  assinaturas.getRange('1:1').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');

  // ---- Aba de Tarefas Globais (VisÃ£o Admin) ----
  let tarefas = ss.insertSheet('Tarefas_Globais');
  tarefas.appendRow(['ID_Tarefa', 'Professor', 'Instituicao', 'Titulo', 'Course_ID', 'Data_Criacao']);
  tarefas.getRange('1:1').setFontWeight('bold').setBackground('#8e24aa').setFontColor('#ffffff');

  // ---- Aba de Heatmap & Rankings (VisÃ£o Admin) ----
  let rankings = ss.insertSheet('Ranking_Instituicao');
  rankings.appendRow(['Instituicao', 'Total_Professores', 'Total_Alunos', 'Media_Autonomia_IA', 'Ultima_Atualizacao']);
  rankings.getRange('1:1').setFontWeight('bold').setBackground('#f59e0b').setFontColor('#ffffff');

  // ---- Aba de ConfiguraÃ§Ãµes Globais ----
  let config = ss.getSheetByName('Config') || ss.insertSheet('Config');
  config.appendRow(['Parametro', 'Valor', 'Descricao']);
  config.getRange('1:1').setFontWeight('bold').setBackground('#444444').setFontColor('#ffffff');
  config.appendRow(['VersaoSchema',    SCHEMA_VERSION_ATUAL,  'VersÃ£o do schema da Planilha Global (ARCH-05)']);
  config.appendRow(['versao_addon',    '2.1',                 'VersÃ£o com IntegraÃ§Ã£o Classroom']);
  config.appendRow(['gemini_model',    'gemini-1.5-flash',    'Modelo Gemini']);
  config.appendRow(['seed_document_id', '',                   'Doc Semente Master']);

  return { id: ss.getId(), url: ss.getUrl() };
}

/**
 * âš ï¸ OPERAÃ‡ÃƒO DESTRUTIVA â€” Regenera a Planilha Global do Admin.
 *
 * Fluxo de seguranÃ§a:
 *  1. Faz backup do ID antigo em ADMIN_SPREADSHEET_ID_BACKUP
 *  2. Remove ADMIN_SPREADSHEET_ID das Script Properties
 *  3. Chama setupPlanilhaGlobal() para criar uma nova planilha
 *  4. Registra o novo ID e retorna as informaÃ§Ãµes
 *
 * âš ï¸ TODOS OS DADOS DA PLANILHA ANTIGA (professores, logs, rankings)
 *    serÃ£o perdidos. A planilha antiga NÃƒO Ã© excluÃ­da do Drive â€”
 *    apenas desvinculada do sistema.
 *
 * @returns {{ success: boolean, newId: string, newUrl: string, backupId: string }}
 */
function resetPlanilhaGlobal() {
  const props = PropertiesService.getScriptProperties();

  // 1. Salvar backup do ID antigo
  const oldId = props.getProperty(PROP_ADMIN_SPREADSHEET_ID) || '';
  if (oldId) {
    props.setProperty('ADMIN_SPREADSHEET_ID_BACKUP', oldId);
    Logger.log('[AdminSetup] Backup do ID antigo salvo: ' + oldId);
  }

  // 2. Remover o ID atual para forÃ§ar nova criaÃ§Ã£o
  props.deleteProperty(PROP_ADMIN_SPREADSHEET_ID);
  Logger.log('[AdminSetup] ADMIN_SPREADSHEET_ID removido. Iniciando re-provisionamento...');

  // 3. Criar nova planilha
  const result = setupPlanilhaGlobal();

  // 4. Registrar novo ID e executar migraÃ§Ã£o de schema
  props.setProperty(PROP_ADMIN_SPREADSHEET_ID, result.id);
  migrarSchemaSeNecessario(result.id);

  Logger.log('[AdminSetup] Nova planilha criada: ' + result.id);

  return {
    success:  true,
    newId:    result.id,
    newUrl:   result.url,
    backupId: oldId
  };
}

/**
 * Cria a planilha individual de um professor onde ele terÃ¡ autonomia de IA e logs locais.
 */
function criarPlanilhaProfessor(email, instituicao) {
  const ss = SpreadsheetApp.create('Whitebox - Log Professor (' + email + ')');
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(ss.getId()).moveTo(targetFolder);
  Logger.log('[AdminSetup] Planilha do professor criada: ' + email + ' | ID: ' + ss.getId());

  // 1. Aba de ConfiguraÃ§Ã£o PedagÃ³gica (Autonomia da IA)
  let configPedagogica = ss.getSheets()[0];
  configPedagogica.setName('Config_Pedagogica');
  configPedagogica.appendRow(['Course_ID', 'Assignment_ID', 'Titulo_Tarefa', 'Instrucoes_IA', 'Nivel_Rigor_IA']);
  configPedagogica.getRange('1:1').setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');

  // 2. Aba de Logs de Atividades (Unified Headers)
  let logs = ss.insertSheet('Logs');
  logs.appendRow([
    'Timestamp', 'Turma', 'DocId', 'Email_Aluno',
    'Palavras', 'Tempo_Ativo_Min', 'Colar_Eventos',
    'Taxa_Edicao', 'Alteracoes_Estrutura',
    'Chars_Adicionados', 'Chars_Deletados', 'Colagem_Massiva',
    'Cpm_Medio', 'Cpm_Pico',
    'RiscoScore', 'Whitebox_Risco', 'Conselho_Pedagogico',
    'Pergunta_Socratica', 'Modo_IA', 'Entrega_Final'
  ]);
  logs.getRange('1:1').setFontWeight('bold').setBackground('#34a853').setFontColor('#ffffff');

  // 3. Aba de Dashboard do Professor (Snapshot Heatmap)
  let dash = ss.insertSheet('Dashboard_Professor');
  dash.appendRow(['Nivel', 'Identificador', 'Media_Esforco', 'Media_IA_Score', 'Alertas_Criticos']);
  dash.getRange('1:1').setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');

  // Dar permissÃ£o ao professor
  ss.addEditor(email);

  return ss.getId();
}
/**
 * Adiciona um professor manualmente Ã  planilha global (para uso via painel ou form)
 */
function adicionarProfessor(email, escola, usaChaveGlobal, chaveIndividual = '') {
  const cfg   = getConfig();
  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  sheet.appendRow([
    email,
    escola || 'NÃ£o informada',
    'Ativo',
    usaChaveGlobal ? 'Sim' : 'NÃ£o',
    chaveIndividual, // ChaveIndividual (ID do Cofre Drive)
    '',              // SpreadsheetId (provisionado automaticamente)
    new Date().toISOString()
  ]);
  Logger.log('[AdminSetup] Professor adicionado: ' + email);
}

/**
 * Ativar/Desativar um professor
 */
function alterarStatusProfessor(email, novoStatus) {
  const cfg   = getConfig();
  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const emailCol  = h.indexOf('Email');
  const statusCol = h.indexOf('Status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      sheet.getRange(i + 1, statusCol + 1).setValue(novoStatus);
      Logger.log('[Admin] Status de ' + email + ' alterado para: ' + novoStatus);
      return true;
    }
  }
  return false;
}

/**
 * Conceder ou revogar acesso Ã  Chave Global para um professor
 */
function configurarChaveGlobal(email, usar) {
  const cfg   = getConfig();
  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const data  = sheet.getDataRange().getValues();
  const h     = data[0];
  const emailCol  = h.indexOf('Email');
  const globalCol = h.indexOf('UsaChaveGlobal');

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      sheet.getRange(i + 1, globalCol + 1).setValue(usar ? 'Sim' : 'NÃ£o');
      Logger.log('[Admin] Acesso Ã  chave global para ' + email + ': ' + (usar ? 'Concedido' : 'Revogado'));
      return true;
    }
  }
  return false;
}

/**
 * UtilitÃ¡rio: Garante a criaÃ§Ã£o ou navegaÃ§Ã£o para a pasta raiz do projeto.
 * Caminho: Meu Drive â†’ GDrive Meus Documentos â†’ Projetos â†’ whitebox
 *
 * [LOW-01 FIX] SubstituÃ­da iteraÃ§Ã£o manual O(n) por getFoldersByName(),
 * que usa a API de busca do Drive internamente â€” muito mais eficiente
 * em drives com muitas pastas.
 */
function getOrCreateTargetFolder() {
  const path = ['GDrive Meus Documentos', 'Projetos', 'whitebox'];
  let folder = DriveApp.getRootFolder();

  for (let i = 0; i < path.length; i++) {
    const name    = path[i];
    const results = folder.getFoldersByName(name);

    if (results.hasNext()) {
      folder = results.next(); // Pasta encontrada diretamente
    } else {
      folder = folder.createFolder(name);
      Logger.log('[AdminSetup] Pasta criada: ' + name);
    }
  }
  return folder;
}

==== appsscript.json ====
{
  "timeZone": "America/New_York",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Classroom",
        "serviceId": "classroom",
        "version": "v1"
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students",
    "https://www.googleapis.com/auth/classroom.rosters.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/forms",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/script.scriptapp"
  ],
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  }
}

==== BrainProxy.gs ====
/**
 * ========================================================
 *  Whitebox â€” Brain Proxy (Script Standalone Protegido)
 *  Deploy como Web App: "Executar como: Eu", "Acesso: Qualquer pessoa"
 * ========================================================
 *
 * ATENÃ‡ÃƒO: Este Ã© o nÃºcleo protegido da soluÃ§Ã£o Whitebox.
 * NÃƒO compartilhe este arquivo. Ele contÃ©m a lÃ³gica de licenciamento,
 * os prompts do Gemini e o acesso Ã  Planilha Global.
 *
 * CONFIGURAÃ‡ÃƒO INICIAL (Script Properties deste script):
 *   SHARED_TOKEN        â€” Token secreto exigido em toda chamada (vocÃª define)
 *   ADMIN_SPREADSHEET_ID â€” ID da sua Planilha Global de administraÃ§Ã£o
 *   GEMINI_GLOBAL_KEY   â€” (Opcional) Chave Gemini global para professores autorizados
 */

// =====================================================
//  CONFIGURAÃ‡ÃƒO: lÃª das Script Properties (seguro)
// =====================================================

// getConfig() â†’ ver Utils.gs
// [ARCH-02] Movida para Utils.gs (UtilitÃ¡rios Compartilhados)


// =====================================================
//  ROTEADOR WEB (doGet) - AUTO-PROVISIONAMENTO
// =====================================================

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const adminId = props.getProperty('ADMIN_SPREADSHEET_ID');
  
  if (!adminId) {
    const lock = LockService.getScriptLock();
    try {
      // Tentar obter o lock por atÃ© 30 segundos
      lock.waitLock(30000);
      
      // Checar novamente se foi provisionado por outro processo simultÃ¢neo
      const reCheckAdminId = props.getProperty('ADMIN_SPREADSHEET_ID');
      if (reCheckAdminId) return serveDashboard();

      const result = setupPlanilhaGlobal(); 
      props.setProperty('ADMIN_SPREADSHEET_ID', result.id);
      
      // [ARCH-05] Registrar VersaoSchema imediatamente apÃ³s o provisionamento
      migrarSchemaSeNecessario(result.id);
      
      let generatedToken = props.getProperty('SHARED_TOKEN');
      if (!generatedToken) {
        generatedToken = 'WBX-' + Utilities.getUuid();
        props.setProperty('SHARED_TOKEN', generatedToken);
      }
      
      const msg = 'âœ… SUCESSO: Whitebox Auto-Provisionado!\n\n' +
                  'O Banco de Dados Admin foi criado no seu Google Drive.\n' +
                  'URL: ' + result.url + '\n\n' +
                  'ðŸ” SHARED_TOKEN = ' + generatedToken + '\n\n' +
                  'âš ï¸ COPIE ESTE TOKEN! Ele Ã© exigido no "Documento Modelo" (Cliente).\n\n' +
                  'ðŸ”„ RECARREGUE PARA ACESSAR O DASHBOARD.';
      return ContentService.createTextOutput(msg);
    } catch (err) {
      return ContentService.createTextOutput('âŒ Falha no Provisionamento (Lock/Exec): ' + err.toString());
    } finally {
      lock.releaseLock();
    }
  }
  
  // [ARCH-05] Verificar schema em cada acesso â€” detecta divergÃªncias
  // introduzidas por ediÃ§Ãµes manuais na planilha global antes de servir o Dashboard.
  try {
    const adminId = props.getProperty(PROP_ADMIN_SPREADSHEET_ID);
    if (adminId) {
      const schemaCheck = verificarSchemaGlobal(adminId);
      if (!schemaCheck.ok) {
        Logger.log('[BrainProxy] AVISO SCHEMA: ' + schemaCheck.mensagem);
      }
    }
  } catch (schemaErr) {
    Logger.log('[BrainProxy] Erro na verificaÃ§Ã£o de schema: ' + schemaErr);
  }
  return serveDashboard();
}

/** Serve o Dashboard Administrativo */
function serveDashboard() {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('Whitebox Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// validateAdminAccess() â†’ ver Utils.gs
// [ARCH-02] Movida para Utils.gs (UtilitÃ¡rios Compartilhados)


// =====================================================
//  ADMIN API: FunÃ§Ãµes para o Dashboard HTML
// =====================================================

/**
 * Ponto de entrada para anÃ¡lise via IA.
 * Agora considera os critÃ©rios personalizados do professor definidos na aba Config_Pedagogica.
 */
function realizarAuditoriaIA(texto, contexto, courseId, assignmentId) {
  const cfg = getConfig();
  
  // 1. Buscar InstruÃ§Ãµes Personalizadas
  let instrucoesProfessor = '';
  let rigorIA = 'MÃ©dio';
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
      message: 'AnÃ¡lise indisponÃ­vel: nenhuma chave API encontrada para este professor ou globalmente.' 
    };
  }

  // 3. Construir o Prompt DinÃ¢mico
  const systemPrompt = `VocÃª Ã© o Auditor PedagÃ³gico Whitebox. Sua missÃ£o Ã© analisar a originalidade e o esforÃ§o do aluno.
CritÃ©rios Adicionais do Professor: ${instrucoesProfessor || 'Nenhum especÃ­fico.'}
Rigor: ${rigorIA}

Analise o texto abaixo e retorne um JSON com:
- nota_integridade: (0-100)
- justificativa: (texto sucinto)
- alertas: (array de strings)`;

  const promptFinal = `${systemPrompt}\n\nTexto do Aluno:\n${texto}\n\nContexto:\n${contexto}`;
  return analisarComGemini(promptFinal, {}, apiKey);
}

/** 
 * Busca as configuraÃ§Ãµes pedagÃ³gicas na planilha individual do professor 
 */
function buscarConfigPedagogicaLocal(profEmail, courseId, assignmentId) {
  try {
    const adminSheet = getPlanilhaGlobal(PropertiesService.getScriptProperties().getProperty('ADMIN_SPREADSHEET_ID'));
    const dataProf = adminSheet.getDataRange().getValues();
    const headersProf = dataProf[0];

    // [HIGH-03 FIX] Resolver coluna por nome, nunca por Ã­ndice posicional
    const ssColIdx = headersProf.indexOf('SpreadsheetId');
    if (ssColIdx === -1) {
      Logger.log('[BrainProxy] CRÃTICO: Coluna "SpreadsheetId" nÃ£o encontrada na aba Assinaturas.');
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
          rigor:      rigorCol !== -1     ? data[i][rigorCol]      : 'MÃ©dio'
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
  
  if (emailCol === -1) throw new Error('Estrutura da planilha invÃ¡lida: Coluna "Email" nÃ£o encontrada.');

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
 * FunÃ§Ã£o chamada pelo Dashboard (google.script.run) para regenerar a Planilha Global.
 * Valida o token admin antes de executar a operaÃ§Ã£o destrutiva.
 *
 * @param {string} token - SHARED_TOKEN do admin (validaÃ§Ã£o)
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

  // [MED-06 FIX] Validar email antes de qualquer operaÃ§Ã£o com ele
  validarEmail(email);

  const uiData = getAdminUIData(token);
  const seedId = uiData.seedId;

  if (!seedId) throw new Error('ID do Documento Semente nÃ£o configurado.');

  try {
    // 1. Clonar o Documento Semente e colocar na pasta Admin
    const originalFile = DriveApp.getFileById(seedId);
    const newName = 'Whitebox - Modelo Mestre (' + email + ')';
    const targetFolder = getOrCreateTargetFolder();
    const copy = originalFile.makeCopy(newName, targetFolder);
    
    // 2. Injetar DeveloperMetadata de Auto-ConfiguraÃ§Ã£o [ARCH-LIB]
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
      Logger.log('[BrainProxy] Erro (nÃ£o-crÃ­tico) ao injetar metadados: ' + metaErr);
    }

    // 3. Dar permissÃ£o de editor ao professor
    copy.addEditor(email);
    
    // 4. Notificar via e-mail
    const subject = 'ðŸ“¦ Seu Sistema Whitebox estÃ¡ pronto!';
    const body = `OlÃ¡!\n\nSeu Documento Mestre do Whitebox foi gerado e compartilhado com vocÃª.\n\n` +
                 `Link do Documento: ${copy.getUrl()}\n\n` +
                 `Equipe Whitebox`;
    MailApp.sendEmail(email, subject, body);
    
    return { success: true, url: copy.getUrl() };
  } catch (err) {
    Logger.log('[distribuirMestre] Erro: ' + err);
    throw new Error('Falha na distribuiÃ§Ã£o: ' + err.toString());
  }
}

/**
 * Retorna os dados para os mapas de calor solicitados (Snapshot).
 * Abrande os nÃ­veis: Aluno, Turma, Professor e InstituiÃ§Ã£o.
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
  
  throw new Error('Escopo de heatmap nÃ£o suportado: ' + scope);
}

/**
 * [ARCH-04] calcularHeatmapAluno com cache CacheService (TTL 1 hora).
 *
 * O cÃ¡lculo real Ã© O(n_professores Ã— n_logs) â€” potencialmente centenas de
 * chamadas Ã  Spreadsheet API. O cache elimina esse custo para chamadas
 * repetidas dentro da janela de 1h, que Ã© aceitÃ¡vel para heatmaps
 * pedagÃ³gicos (nÃ£o requerem dados em tempo real).
 *
 * TODO [ARCH-07] ESCALABILIDADE (MIGRAÃ‡ÃƒO FUTURA):
 * Ã€ medida que o sistema escalar, as iteraÃ§Ãµes `SpreadsheetApp.openById`
 * estourarÃ£o a cota de 6 minutos. No futuro, serÃ¡ estritamente necessÃ¡rio
 * utilizar uma infraestrutura de Data Warehouse, como o Google BigQuery ou
 * Data Studio (Looker), com ingestÃ£o assÃ­ncrona para anÃ¡lises globais.
 *
 * Para forÃ§ar recalculo antes do TTL, chame invalidarCacheHeatmap(email).
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
      Logger.log('[BrainProxy] calcularHeatmapAluno: cache invÃ¡lido, recalculando...');
    }
  }

  Logger.log('[BrainProxy] calcularHeatmapAluno: cache MISS, varrendo planilhas...');
  const startMs = Date.now();

  // ===== CÃ¡lculo real: varre planilhas de todos os professores =====
  const cfg     = getConfig();
  const assSheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  const assData    = assSheet.getDataRange().getValues();
  const assHeaders = assData[0];
  const ssColIdx   = assHeaders.indexOf(COL_SPREADSHEET_ID); // [HIGH-03] header-based
  const emailColIdx = assHeaders.indexOf(COL_EMAIL);

  if (ssColIdx === -1 || emailColIdx === -1) {
    Logger.log('[BrainProxy] calcularHeatmapAluno: colunas obrigatÃ³rias ausentes na aba Assinaturas.');
    return { labels: [], valores: [], alertas: [] };
  }

  // Ãndices estÃ¡veis da aba Logs (definidos em inicializarPlanilhaProfessor)
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
  const RISCO_ALERT_THRESHOLD = 60; // Risco > 60 Ã© alerta

  const aggregated = {}; // docId â†’ { riscoTotal, esforcoTotal, count, alertas, turma }
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
    // Invertemos: risco alto â†’ score de integridade baixo (0-100)
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
    esforcos,              // Minutos mÃ©dios de escrita por documento
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
 * [ARCH-04] Invalida o cache do heatmap de um aluno especÃ­fico.
 * Deve ser chamada quando novos logs sÃ£o gravados para o aluno,
 * garantindo que o prÃ³ximo getHeatmapData reflita os novos dados.
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
 * [ARCH-04] Stub defensivo para heatmap por instituiÃ§Ã£o (implementaÃ§Ã£o futura).
 * Documenta a intenÃ§Ã£o sem retornar dados falsos.
 */
function calcularHeatmapInstituicao(nomeInstituicao) {
  Logger.log('[BrainProxy] calcularHeatmapInstituicao: nÃ£o implementado para ' + nomeInstituicao);
  return {
    _incomplete: true,
    _reason:    'ImplementaÃ§Ã£o pendente: requer Ã­ndice de instituiÃ§Ãµes na planilha global.',
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
 * [HIGH-03 FIX] Busca SpreadsheetId do professor por nome de coluna (nÃ£o Ã­ndice).
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
      return jsonResponse({ error: 'BAD_REQUEST', message: 'Payload JSON invÃ¡lido.' }, 400);
    }
    const cfg  = getConfig();

    // 1. ValidaÃ§Ã£o do Token Compartilhado
    if (!cfg.sharedToken || body.token !== cfg.sharedToken) {
      return jsonResponse({ error: 'UNAUTHORIZED', message: 'Token invÃ¡lido.' }, 401);
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

      // â”€â”€ MÃ³dulo de DistribuiÃ§Ã£o de Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      // â”€â”€ Health Check / Setup Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'ping':
        return jsonResponse({ ok: true, message: 'Whitebox Server OK' });

      // â”€â”€ OperaÃ§Ãµes Administrativas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'reset_planilha':
        return handleResetPlanilha(body, cfg);

      default:
        return jsonResponse({ error: 'ROUTE_NOT_FOUND' }, 404);
    }

  } catch (err) {
    Logger.log('[BrainProxy] Erro crÃ­tico: ' + err);
    return jsonResponse({ error: 'INTERNAL_ERROR', message: err.toString() }, 500);
  }
}

// =====================================================
//  HANDLER: Status de LicenÃ§a
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
//  HANDLER: Reset da Planilha Global (OperaÃ§Ã£o Destrutiva)
// =====================================================

/**
 * âš ï¸ Requer confirmaÃ§Ã£o explÃ­cita via campo 'confirmacao' = 'CONFIRMAR_RESET'
 * para evitar execuÃ§Ã£o acidental pelo Dashboard.
 */
function handleResetPlanilha(body, cfg) {
  if (body.confirmacao !== 'CONFIRMAR_RESET') {
    return jsonResponse({
      error:   'CONFIRMACAO_NECESSARIA',
      message: 'Envie confirmacao: "CONFIRMAR_RESET" para executar esta operaÃ§Ã£o.'
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

  // Professor nÃ£o encontrado: cadastrar como novo (Status=Ativo, sem chave global)
  const newRow = new Array(headers.length).fill('');
  newRow[emailCol] = professorEmail;
  newRow[headers.indexOf('Instituicao')] = 'NÃ£o informada';
  newRow[headers.indexOf('Status')] = 'Ativo';
  newRow[headers.indexOf('UsaChaveGlobal')] = 'NÃ£o';
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

  // [AUTH-03] Auditoria de SeguranÃ§a: 
  // O Auditor de IA Ã© uma ferramenta de uso exclusivo do Professor.
  // Alunos nÃ£o devem ter acesso direto a esta rota via interface.

  // [ARCH-06] Rate Limiting: previne abuso da API Gemini (tokens)
  const usuario = alunoEmail || 'anonimo';
  if (!verificarRateLimit(professorEmail, usuario)) {
    return jsonResponse({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Muitas anÃ¡lises solicitadas. Aguarde um momento antes de pedir novas anÃ¡lises.',
      modoIA: false,
      riskEvidence: null,
      pedagogicalAdvice: null
    }, 429); // Too Many Requests
  }

  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  const apiKey   = resolverChaveApi(registro, cfg.geminiGlobalKey);

  // Modo Offline: sem chave disponÃ­vel
  if (!apiKey) {
    return jsonResponse({
      modoIA: false,
      toneChangeDetected: false,
      riskEvidence: null,
      pedagogicalAdvice: null,
      message: 'AnÃ¡lise de IA nÃ£o disponÃ­vel (modo offline). Configure sua API Key nas configuraÃ§Ãµes.'
    });
  }

  // AnÃ¡lise com Gemini
  const analise = analisarComGemini(fragmento, metricas, apiKey);
  return jsonResponse({ modoIA: true, ...analise });
}

// =====================================================
//  HANDLER: Logar MÃ©tricas na Planilha do Professor
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
//  LÃ“GICA: Resolver Chave API (Hierarquia e Cofre Drive)
// =====================================================

function resolverChaveApi(registro, geminiGlobalKey) {
  if (!registro) return null;

  // 1. Chave Global (se professor estÃ¡ autorizado a usÃ¡-la)
  if (registro.usaChaveGlobal === 'Sim' && geminiGlobalKey) {
    return geminiGlobalKey;
  }

  // 2. Chave Individual (Pode ser API Key direta ou ID/Link do Cofre no Drive)
  let chaveRaw = registro.chaveIndividual;
  if (chaveRaw && chaveRaw.trim().length > 0) {
    chaveRaw = chaveRaw.trim();
    
    // Se for uma chave direta do Gemini (padrÃ£o AIza...)
    if (chaveRaw.startsWith('AIza')) {
      return chaveRaw;
    }
    
    // SenÃ£o, assumimos que Ã© um Cofre no Drive (Alternativa 2)
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
        Logger.log('[Cofre Drive] O arquivo lido nÃ£o contÃ©m uma chave Gemini vÃ¡lida.');
        return null; // ForÃ§a modo offline
      }
    } catch (e) {
      Logger.log('[Cofre Drive] Erro ao acessar arquivo de cofre. Arquivo inacessÃ­vel ou nÃ£o compartilhado. Erro: ' + e.toString());
      return null; // ForÃ§a modo offline
    }
  }

  // 3. Modo Offline
  return null;
}

// =====================================================
//  LÃ“GICA: AnÃ¡lise SocrÃ¡tica com Gemini Pro
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
      Logger.log('[Gemini] Resposta da API nÃ£o Ã© um JSON vÃ¡lido: ' + content);
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
    Logger.log('[Gemini] ExceÃ§Ã£o: ' + err);
    return { error: 'GEMINI_EXCEPTION', message: err.toString() };
  }
}

/**
 * UtilitÃ¡rio para extrair JSON de strings que podem conter Markdown
 */
// extrairJSON() â†’ ver Utils.gs
// [ARCH-02] Movida para Utils.gs (UtilitÃ¡rios Compartilhados)


// =====================================================
//  PROMPT SOCRÃTICO PEDAGÃ“GICO (LÃ³gica ProprietÃ¡ria)
// =====================================================

function construirPromptSocratico(fragmento, metricas) {
  const editRatio  = metricas?.editRatio ?? 'desconhecido';
  const pasteCount = metricas?.pasteEvents?.count ?? 0;
  const activeMins = metricas?.activeFocusTimeMinutes ?? 0;
  const peakCpm    = metricas?.typingSpeed?.peakCharsPerMinute ?? 0;

  return `
VocÃª Ã© um auditor pedagÃ³gico socrÃ¡tico do sistema Whitebox. 
Analise o trecho de texto abaixo junto com as mÃ©tricas comportamentais do aluno.
Identifique padrÃµes que possam indicar falta de autoria prÃ³pria (uso nÃ£o declarado de IA, plÃ¡gio ou cola).

TRECHO DO ALUNO:
"""
${fragmento}
"""

MÃ‰TRICAS COMPORTAMENTAIS:
- Tempo ativo de escrita: ${activeMins} minutos
- Eventos de cola detectados: ${pasteCount}
- Taxa de ediÃ§Ã£o (deleÃ§Ãµes/total): ${editRatio}
- Pico de digitaÃ§Ã£o: ${peakCpm} caracteres/minuto

IDIOMA: Responda SEMPRE em portuguÃªs brasileiro, independentemente do idioma do trecho acima.

RESPONDA SOMENTE em JSON vÃ¡lido com a seguinte estrutura, sem qualquer texto adicional:
{
  "toneChangeDetected": true | false,
  "riskScore": 0 a 100,
  "riskEvidence": "DescriÃ§Ã£o objetiva dos indÃ­cios encontrados ou null se nÃ£o houver",
  "pedagogicalAdvice": "OrientaÃ§Ã£o socrÃ¡tica para o professor: o que perguntar ao aluno ou como intervir pedagogicamente",
  "suggestedQuestion": "Uma pergunta socrÃ¡tica especÃ­fica que o professor pode fazer ao aluno sobre este trecho"
}
`;
}

// getPlanilhaGlobal() â†’ ver Utils.gs
// [ARCH-02] Movida para Utils.gs (UtilitÃ¡rios Compartilhados)

// buscarRegistroProfessor() â†’ ver Utils.gs
// [ARCH-02] Movida para Utils.gs (UtilitÃ¡rios Compartilhados)



// =====================================================
//  PLANILHA DO PROFESSOR (Logs Individuais)
// =====================================================

function garantirPlanilhaProfessor(email, adminSheet, rowIndex, spreadsheetCol) {
  // Verificar se jÃ¡ existe
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

  // Aba de VisualizaÃ§Ã£o do Heatmap
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

  // [TEMPLATE-04] Aba de Levas (distribuiÃ§Ãµes de template para alunos)
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

  // [AUTO-REPAIR] Garantir que o cabeÃ§alho de logs tem a nova coluna de Heatmap
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
    metricas.pasteEvents?.massiveInsertionsDetected ? 'Sim' : 'NÃ£o',
    metricas.typingSpeed?.avgCharsPerMinute || 0,
    metricas.typingSpeed?.peakCharsPerMinute || 0,
    analise?.riskScore        || '',
    analise?.riskEvidence     || '',
    analise?.pedagogicalAdvice || '',
    analise?.suggestedQuestion || '',
    analise ? 'Sim' : 'NÃ£o',
    isFinal ? 'Sim' : 'NÃ£o',
    metricas.auraMapScores     || ''
  ]);

  // [ARCH-04] Invalidar cache do heatmap do aluno apÃ³s novo log.
  // Garante que a prÃ³xima chamada a getHeatmapData reflita os dados atuais.
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
 * [HEATMAP-03] Configura a aba Visual_Heatmap com fÃ³rmulas e formataÃ§Ã£o condicional.
 */
function setupVisualHeatmapTab(sheet) {
  sheet.clear();
  sheet.getRange('A1').setValue('AUDITORIA VISUAL (HEATMAP)').setFontWeight('bold').setFontSize(14);
  
  sheet.getRange('A3').setValue('1. Selecione o Aluno (Email):');
  sheet.getRange('A4').setValue('2. Selecione o Trabalho (DocId):');
  
  sheet.getRange('A6').setValue('RADAR DE ESFORÃ‡O (MAPA DE CALOR)').setFontWeight('bold');
  sheet.getRange('A7').setValue('Legenda: Verde (>70) | Amarelo (40-70) | Vermelho (<40)');

  // InstruÃ§Ã£o de uso das fÃ³rmulas
  sheet.getRange('C3').setValue('<- Cole o email do aluno aqui');
  sheet.getRange('C4').setValue('<- Cole o ID do documento aqui');
  
  // FÃ³rmula principal para desmembrar o heatmap (Assume coluna C para Email e D para DocId em Logs)
  // Nota: Heatmap_Scores Ã© a coluna 21 (U)
  const formula = '=IFERROR(TRANSPOSE(SPLIT(VLOOKUP(B4, Logs!C:U, 19, FALSE), ",")), "Dados nÃ£o encontrados")';
  sheet.getRange('B7').setFormula(formula);

  // FormataÃ§Ã£o Condicional para a coluna B (Heatmap)
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

// jsonResponse() â†’ ver Utils.gs
// [ARCH-02] Movida para Utils.gs (UtilitÃ¡rios Compartilhados)
//
// LIMITAÃ‡ÃƒO: ContentService sempre retorna HTTP 200 no Apps Script.
// O status real Ã© embutido em body._httpStatus quando != 200.
// Ref: https://issuetracker.google.com/issues/36759757

==== ClassroomService.gs ====
/**
 * ========================================================
 *  Whitebox - ServiÃ§o de IntegraÃ§Ã£o Google Classroom
 * ========================================================
 */

/**
 * Retorna as turmas onde o usuÃ¡rio atual Ã© professor.
 */
function getClassroomCourses() {
  try {
    let allCourses = [];
    let pageToken = null;
    do {
      const response = Classroom.Courses.list({
        teacherId: 'me',
        courseStates: ['ACTIVE'],
        pageToken: pageToken
      });
      if (response.courses) {
        allCourses = allCourses.concat(response.courses);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);
    
    return allCourses.map(c => ({
      id: c.id,
      name: c.name,
      section: c.section || ''
    }));
  } catch (err) {
    Logger.log('Erro ao buscar turmas: ' + err);
    throw new Error('Falha ao acessar o Google Classroom: ' + err.toString());
  }
}

/**
 * Cria uma atividade no Classroom com o "Doc Mestre" anexado como cÃ³pia para cada aluno.
 */
function publishToClassroom(courseId, seedDocId, title, description, token) {
  // 1. Validar acesso
  validateAdminAccess(token);
  
  if (!courseId || !seedDocId) throw new Error('Course ID e Seed ID sÃ£o obrigatÃ³rios.');

  try {
    // 2. Definir a atividade (CourseWork)
    const resource = {
        title: title || 'Atividade Whitebox',
        description: description || 'Por favor, complete esta atividade usando o editor do Google Docs.',
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED',
        materials: [
          {
            driveFile: {
              driveFile: {
                id: seedDocId
              },
              shareMode: 'STUDENT_COPY'
            }
          }
        ]
    };

    // 3. Criar no Classroom
    const assignment = Classroom.Courses.CourseWork.create(resource, courseId);
    
    // 4. Registrar na Planilha Global para rastro de auditoria
    registrarTarefaGlobal(assignment.id, title, courseId, token);

    return { 
      success: true, 
      assignmentId: assignment.id, 
      alternateLink: assignment.alternateLink 
    };
    
  } catch (err) {
    Logger.log('Erro ao publicar no Classroom: ' + err);
    throw new Error('Erro na publicaÃ§Ã£o: ' + err.toString());
  }
}

/**
 * Registra a criaÃ§Ã£o da tarefa na Planilha Global do Admin.
 */
function registrarTarefaGlobal(assignmentId, title, courseId, token) {
  const cfg = getConfig();
  const ss = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  const sheet = ss.getSheetByName('Tarefas_Globais');
  
  // Buscar nome da instituiÃ§Ã£o do professor logado (simplificado para o e-mail logado)
  const professorEmail = Session.getActiveUser().getEmail();
  const instituicao = buscarInstituicaoProfessor(professorEmail);

  sheet.appendRow([
    assignmentId,
    professorEmail,
    instituicao,
    title,
    courseId,
    new Date().toISOString()
  ]);
}

/**
 * Busca a instituiÃ§Ã£o vinculada ao professor na planilha de Assinaturas.
 */
function buscarInstituicaoProfessor(email) {
  const props = PropertiesService.getScriptProperties();
  const adminId = props.getProperty('ADMIN_SPREADSHEET_ID');
  if (!adminId) return 'N/A';
  
  const ss = SpreadsheetApp.openById(adminId);
  const sheet = ss.getSheetByName('Assinaturas');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailCol = headers.indexOf('Email');
  const instCol = headers.indexOf('Instituicao');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][emailCol] === email) {
      return data[i][instCol] || 'NÃ£o informada';
    }
  }
  return 'NÃ£o cadastrada';
}

/**
 * Tenta encontrar qual tarefa (Assignment) gerou este documento de aluno.
 * Cruza o docId com as submissÃµes das turmas onde o aluno estÃ¡ inscrito.
 *
 * [MED-05 FIX] Cache via CacheService com TTL de 6 horas.
 * O mapeamento docId â†’ assignmentId Ã© estÃ¡vel (nÃ£o muda durante o perÃ­odo escolar),
 * tornando o cache seguro e muito eficiente para reduzir chamadas Ã  Classroom API.
 */
function findAssignmentIdByDocId(docId) {
  if (!docId) return null;

  // 1. Verificar cache
  const cache     = CacheService.getDocumentCache();
  const cacheKey  = CACHE_ASSIGNMENT_PREFIX + docId;
  const cached    = cache.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      Logger.log('[ClassroomService] Cache hit para docId=' + docId);
      return parsed; // { assignmentId, courseId }
    } catch (e) {
      // Cache corrompido â€” prosseguir com busca real
      Logger.log('[ClassroomService] Cache invÃ¡lido para ' + docId + ', rebuscando...');
    }
  }

  try {
    // 2. Listar turmas do aluno (paginado)
    let courses = [];
    let coursePageToken = null;
    do {
      const coursesResponse = Classroom.Courses.list({
        studentId:    'me',
        courseStates: ['ACTIVE'],
        pageToken:    coursePageToken
      });
      if (coursesResponse.courses) courses = courses.concat(coursesResponse.courses);
      coursePageToken = coursesResponse.nextPageToken;
    } while (coursePageToken);

    for (const course of courses) {
      // 3. Listar submissÃµes do aluno nesta turma (paginado)
      let submissions = [];
      let subPageToken = null;
      do {
        const submissionsResponse = Classroom.Courses.CourseWork.StudentSubmissions.list(
          course.id, '-', { userId: 'me', pageToken: subPageToken }
        );
        if (submissionsResponse.studentSubmissions) {
          submissions = submissions.concat(submissionsResponse.studentSubmissions);
        }
        subPageToken = submissionsResponse.nextPageToken;
      } while (subPageToken);

      for (const sub of submissions) {
        if (sub.assignmentSubmission && sub.assignmentSubmission.attachments) {
          for (const att of sub.assignmentSubmission.attachments) {
            if (att.driveFile && att.driveFile.id === docId) {
              const result = { assignmentId: sub.courseWorkId, courseId: course.id };
              // 4. Armazenar no cache (TTL: 6h = 21600s)
              try { cache.put(cacheKey, JSON.stringify(result), 21600); } catch (e) {}
              Logger.log('[ClassroomService] Assignment encontrado e cacheado para docId=' + docId);
              return result;
            }
          }
        }
      }
    }
  } catch (e) {
    Logger.log('[ClassroomService] Erro ao buscar assignment via Classroom: ' + e);
  }
  return null;
}


==== Constants.gs ====
/**
 * =====================================================
 *  Whitebox â€” Constants.gs (Servidor)
 * =====================================================
 *
 * [ARCH-03] Fonte Ãºnica da verdade para todos os literais de string
 * do whitebox-server. Se um nome de aba, campo ou chave precisar
 * mudar, altere APENAS aqui â€” o restante do cÃ³digo atualiza automaticamente.
 *
 * REGRA: Nenhuma lÃ³gica ou funÃ§Ã£o aqui. Apenas `const`.
 *
 * ESCOPO: Estas constantes sÃ£o compartilhadas entre todos os arquivos
 * do whitebox-server (BrainProxy.gs, AdminSetup.gs, FormOnboarding.gs,
 * ClassroomService.gs, Utils.gs, TestRunner.gs) pois o GAS compila
 * todos os .gs do projeto em um Ãºnico escopo de execuÃ§Ã£o (V8 runtime).
 */

// =====================================================
//  PLANILHA GLOBAL: Nomes de Abas
// =====================================================

/** Aba principal â€” registro de professores licenciados */
const SHEET_ASSINATURAS        = 'Assinaturas';

/** Aba de tarefas distribuÃ­das globalmente */
const SHEET_TAREFAS_GLOBAIS    = 'Tarefas_Globais';

/** Aba de configuraÃ§Ãµes da planilha do professor */
const SHEET_CONFIG             = 'Config';

/** Aba de ranking de instituiÃ§Ãµes (futuro) */
const SHEET_RANKING            = 'Ranking_Instituicao';

/** Aba de logs de anÃ¡lise individual do aluno */
const SHEET_LOGS               = 'Logs';

/** Aba de critÃ©rios pedagÃ³gicos personalizados do professor */
const SHEET_CONFIG_PEDAGOGICA  = 'Config_Pedagogica';

/** Aba de turmas registradas pelo professor */
const SHEET_TURMAS             = 'Turmas';

/** Aba de dashboard individual do professor (futuro) */
const SHEET_DASHBOARD          = 'Dashboard_Professor';

// =====================================================
//  PLANILHA GLOBAL: CabeÃ§alhos / Colunas
// =====================================================

/** Coluna de email na aba Assinaturas */
const COL_EMAIL               = 'Email';

/** Coluna de instituiÃ§Ã£o na aba Assinaturas */
const COL_INSTITUICAO         = 'Instituicao';

/** Coluna de status de licenÃ§a */
const COL_STATUS              = 'Status';

/** Indica se o professor usa chave Gemini global */
const COL_USA_CHAVE_GLOBAL    = 'UsaChaveGlobal';

/** Chave API Gemini individual do professor (criptografada via cofre) */
const COL_CHAVE_INDIVIDUAL    = 'ChaveIndividual';

/** ID da planilha de logs individual do professor */
const COL_SPREADSHEET_ID      = 'SpreadsheetId';

// =====================================================
//  CONFIG: Chaves da aba Config da planilha do professor
// =====================================================

/**
 * ID do Google Doc que serve como Documento Modelo (semente).
 * Armazenado na aba Config da Planilha Global do admin.
 */
const CONFIG_KEY_SEED_DOC_ID  = 'seed_document_id';

/**
 * ID do Google Form de onboarding semente.
 * Armazenado na aba Config da planilha do professor.
 */
const CONFIG_KEY_SEED_FORM_ID = 'seed_form_id';

// =====================================================
//  SCRIPT PROPERTIES: Chaves do Servidor
// =====================================================

/** ID da Planilha Global de administraÃ§Ã£o */
const PROP_ADMIN_SPREADSHEET_ID = 'ADMIN_SPREADSHEET_ID';

/** Token compartilhado para autenticar chamadas do Add-on ao Proxy */
const PROP_SHARED_TOKEN         = 'SHARED_TOKEN';

/** Chave API Gemini global (para professores que nÃ£o tÃªm chave prÃ³pria) */
const PROP_GEMINI_GLOBAL_KEY    = 'GEMINI_GLOBAL_KEY';

/** URL pÃºblica deste Web App (Brain Proxy), usada para auto-configurar novos documentos */
const PROP_BRAIN_PROXY_URL      = 'BRAIN_PROXY_URL';

// =====================================================
//  SCRIPT PROPERTIES: Prefixos de deadline
// =====================================================

/**
 * Prefixo das Script Properties usadas para rastrear deadlines de formulÃ¡rios.
 * Formato: 'DEADLINE_' + triggerId â†’ formId
 * Usado em FormOnboarding.gs para fechar formulÃ¡rios vencidos.
 */
const PROP_DEADLINE_PREFIX      = 'DEADLINE_';

// =====================================================
//  ROTAS DO PROXY (doPost switch)
// =====================================================

/** Rota para registrar / atualizar chave API Gemini do professor */
const ROUTE_REGISTRAR_CHAVE     = 'registrar_chave';

/** Rota para anÃ¡lise socrÃ¡tica de um trecho do aluno */
const ROUTE_ANALISAR            = 'analisar';

/** Rota para log de mÃ©tricas comportamentais */
const ROUTE_LOGAR_METRICAS      = 'logar_metricas';

/** Rota para consulta de status de licenÃ§a do professor */
const ROUTE_STATUS_LICENCA          = 'status_licenca';

// =====================================================
//  ROTAS: DistribuiÃ§Ã£o de Templates
// =====================================================

/** [TEMPLATE-01] Rota para listar templates disponÃ­veis (Admin) */
const ROUTE_LISTAR_TEMPLATES        = 'listar_templates';

/** [TEMPLATE-02] Rota para distribuir template do Admin para professores */
const ROUTE_DISTRIBUIR_TEMPLATE     = 'distribuir_template';

/** [TEMPLATE-03] Rota para listar turmas Classroom do professor */
const ROUTE_LISTAR_TURMAS_PROFESSOR = 'listar_turmas_professor';

/** [TEMPLATE-04] Rota para criar leva de atividade do professor para alunos */
const ROUTE_CRIAR_LEVA_TEMPLATE     = 'criar_leva_template';

/** [TEMPLATE-05] Rota para histÃ³rico de distribuiÃ§Ãµes Admin */
const ROUTE_HISTORICO_TEMPLATES     = 'historico_templates';

/** [TEMPLATE-06] Rota para verificar status de uma distribuiÃ§Ã£o em andamento */
const ROUTE_STATUS_DISTRIBUICAO     = 'status_distribuicao';

// =====================================================
//  FORMULÃRIO DE ONBOARDING: TÃ­tulos dos Campos
// =====================================================

/**
 * [MED-03 FIX] TÃ­tulos EXATOS dos campos do formulÃ¡rio de onboarding.
 * DEVEM corresponder exatamente ao que estÃ¡ em setupFormularioSemente()
 * e gerarLevaOnboarding(). Se alterar o tÃ­tulo no formulÃ¡rio, altere aqui.
 */
const FORM_FIELD_NOME        = 'Seu Nome Completo';
const FORM_FIELD_INSTITUICAO = 'InstituiÃ§Ã£o / Escola';
const FORM_FIELD_LINK_COFRE  = 'Link do arquivo de Cofre (Google Drive)';

// =====================================================
//  NOMES DE FORMULÃRIOS E PLANILHAS (CriaÃ§Ã£o dinÃ¢mica)
// =====================================================

/** Nome base do formulÃ¡rio semente (fixo, Ãºnico por servidor) */
const FORM_SEED_NAME            = 'Whitebox - Onboarding (Semente)';

/** Prefixo do nome de cada leva de onboarding */
const FORM_LEVA_PREFIX          = 'Whitebox - Onboarding: ';

/** Prefixo para planilhas individuais de professor */
const SPREADSHEET_PROF_PREFIX   = 'Whitebox - ';

/** Pasta raiz no Google Drive onde tudo Ã© armazenado */
const DRIVE_ROOT_FOLDER_NAME    = 'whitebox';

// =====================================================
//  CACHE: Chaves do CacheService
// =====================================================

/**
 * Prefixo das chaves de cache para assignmentId do Classroom.
 * Formato: CACHE_ASSIGNMENT_PREFIX + docId â†’ assignmentId
 * Definido em ClassroomService.gs.
 */
const CACHE_ASSIGNMENT_PREFIX   = 'ASSIGNMENT_FOR_DOC_';

/** TTL do cache de assignmentId (6h em segundos) */
const CACHE_ASSIGNMENT_TTL_SEC  = 21600;

// =====================================================
//  TOKEN: Prefixo do SHARED_TOKEN gerado automaticamente
// =====================================================

/** Prefixo do token gerado no auto-provisionamento (ex: 'WBX-<uuid>') */
const TOKEN_PREFIX              = 'WBX-';

// =====================================================
//  VERSIONING: Schema da Planilha Global
// =====================================================

/**
 * [ARCH-05] VersÃ£o atual do schema da Planilha Global.
 * Incrementar AQUI ao adicionar novas colunas obrigatÃ³rias.
 * O SchemaManager.gs usa esta constante para detectar planilhas desatualizadas
 * e executar migraÃ§Ãµes incrementais de forma automÃ¡tica.
 *
 * HistÃ³rico:
 *   v1 - Schema base (Assinaturas, Config, Tarefas_Globais, Ranking_Instituicao)
 *   v2 - Adicionado DataCadastro na aba Assinaturas
 */
const SCHEMA_VERSION_ATUAL      = 2;

/** Chave da aba Config que armazena a versÃ£o do schema */
const CONFIG_KEY_VERSAO_SCHEMA  = 'VersaoSchema';

==== Dashboard.html ====
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Outfit:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1a73e8;
      --primary-dark: #1557b0;
      --bg-dark: #0f172a;
      --glass: rgba(255, 255, 255, 0.05);
      --glass-border: rgba(255, 255, 255, 0.1);
      --text: #f8fafc;
      --text-dim: #94a3b8;
      --success: #10b981;
      --warning: #f59e0b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
    }

    h1, h2 { font-family: 'Outfit', sans-serif; }

    .container {
      width: 100%;
      max-width: 1000px;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      width: 100%;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(to right, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .card {
      background: var(--glass);
      backdrop-filter: blur(12px);
      border: 1px solid var(--glass-border);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    label {
      display: block;
      font-size: 0.875rem;
      color: var(--text-dim);
      margin-bottom: 0.5rem;
    }

    input {
      width: 100%;
      background: rgba(0,0,0,0.2);
      border: 1px solid var(--glass-border);
      color: white;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-family: inherit;
    }

    button {
      background: var(--primary);
      color: white;
      border: none;
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    button:hover { background: var(--primary-dark); transform: translateY(-1px); }
    button:active { transform: translateY(0); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }

    th {
      text-align: left;
      padding: 1rem;
      border-bottom: 1px solid var(--glass-border);
      color: var(--text-dim);
      font-weight: 500;
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid var(--glass-border);
      font-size: 0.9375rem;
    }

    .badge {
      padding: 0.25rem 0.50rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-active { background: rgba(16, 185, 129, 0.1); color: var(--success); }
    
    .heatmap-bar {
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    .heatmap-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
      transition: width 0.5s ease-out;
    }

    select {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--glass-border);
      color: white;
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .stat-box {
      padding: 1rem;
      background: rgba(0,0,0,0.1);
      border-radius: 0.5rem;
      text-align: center;
    }
    .stat-val { font-size: 1.5rem; font-weight: 700; color: var(--success); }
    .stat-label { font-size: 0.75rem; color: var(--text-dim); }

    .loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--glass-border);
      border-top: 4px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      background: var(--success);
      color: white;
      display: none;
      animation: slideUp 0.3s ease-out;
      z-index: 1001;
    }

    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    /* â”€â”€ Zona de Perigo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .danger-card {
      border: 1px solid rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.05);
    }
    .danger-card h2 { color: #f87171; }
    .btn-danger {
      background: transparent;
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.5);
    }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.15); transform: translateY(-1px); }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    }
    .modal-overlay.active { display: flex; }
    .modal-box {
      background: #1e293b;
      border: 1px solid rgba(239,68,68,0.5);
      border-radius: 1rem;
      padding: 2rem;
      max-width: 440px;
      width: 90%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    .modal-box h3 { color: #f87171; margin-bottom: 0.75rem; font-family: 'Outfit', sans-serif; }
    .modal-box p  { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.6; }
    .modal-confirm-input {
      width: 100%;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(239,68,68,0.4);
      color: white;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-family: monospace;
      font-size: 1rem;
      margin-bottom: 1rem;
      letter-spacing: 0.05em;
    }
    .modal-confirm-input:focus { outline: none; border-color: #f87171; }
    .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .modal-actions .btn-cancel {
      background: transparent;
      color: var(--text-dim);
      border: 1px solid var(--glass-border);
    }
    .modal-actions .btn-cancel:hover { background: rgba(255,255,255,0.05); transform: none; }
    .reset-result {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(16,185,129,0.1);
      border: 1px dashed var(--success);
      border-radius: 0.5rem;
      display: none;
      font-size: 0.85rem;
      word-break: break-all;
      line-height: 1.8;
    }
  </style>
</head>
<body>

<div class="loading-overlay" id="loader">
  <div class="spinner"></div>
</div>

<div class="toast" id="toast">OperaÃ§Ã£o realizada com sucesso!</div>

<div class="container">
  <header>
    <div class="logo">WHITEBOX ADMIN</div>
    <div id="sharedTokenDisplay" style="font-size: 0.8rem; color: var(--text-dim);"></div>
  </header>

  <div class="card">
    <h2>âš™ï¸ ConfiguraÃ§Ãµes Globais</h2>
    <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.9rem;">
      Configure o ID do Documento Master que servirÃ¡ de semente para todos os professores.
    </p>
    <div style="display: flex; gap: 1rem; align-items: flex-end;">
      <div style="flex-grow: 1;">
        <label>Google Doc ID (Semente)</label>
        <input type="text" id="seedIdInput" placeholder="Ex: 1abc123... (ID do Google Doc)">
      </div>
      <button onclick="saveSeed()">ðŸ’¾ Salvar</button>
    </div>
  </div>

  <div class="card">
    <h2>IntegraÃ§Ã£o Google Classroom</h2>
    <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.9rem;">
      Selecione uma turma e envie o "Modelo Mestre" como uma atividade. O Google criarÃ¡ cÃ³pias individuais automaticamente.
    </p>
    <div class="config-grid">
      <div>
        <label>Selecione a Turma</label>
        <select id="courseSelect">
          <option value="">Carregando turmas...</option>
        </select>
      </div>
      <div>
        <label>TÃ­tulo da Atividade</label>
        <input type="text" id="assignmentTitle" placeholder="Ex: RedaÃ§Ã£o - A RevoluÃ§Ã£o Industrial">
      </div>
    </div>
    <button onclick="deployClassroom()" style="margin-top: 1rem; width: 100%;">ðŸš€ Publicar no Google Classroom</button>
  </div>

  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h2>InteligÃªncia & Mapas de Calor</h2>
      <select id="heatmapLevel" style="width: auto; margin-bottom: 0;" onchange="loadHeatmap()">
        <option value="instituicao">VisÃ£o Institucional</option>
        <option value="professor">VisÃ£o Total Professor</option>
        <option value="turma">Por Turma/Atividade</option>
      </select>
    </div>
    <div id="heatmapContent">
      <div class="stat-grid">
        <div class="stat-box">
          <div class="stat-val" id="avgIntegrity">--%</div>
          <div class="stat-label">Integridade MÃ©dia</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" id="activeStudents">--</div>
          <div class="stat-label">Alunos Ativos</div>
        </div>
      </div>
      <div id="heatmapList" style="margin-top: 1.5rem;">
        <!-- Graficos de barra serao injetados aqui -->
    </div>
    </div>
  </div>

  <div class="card">
    <h2>ðŸš€ Gerar Onboarding de Professores</h2>
    <p style="color: var(--text-dim); margin-bottom: 1rem; font-size: 0.9rem;">
      Crie um link de cadastro para uma nova leva de professores. O link expirarÃ¡ automaticamente na data configurada.
    </p>
    <div class="config-grid">
      <div>
        <label>Nome da Leva</label>
        <input type="text" id="levaName" placeholder="Ex: Professores Ingressantes 2026/1">
      </div>
      <div>
        <label>Data Limite (ExpiraÃ§Ã£o do Link)</label>
        <input type="datetime-local" id="levaDeadline">
      </div>
    </div>
    <button onclick="gerarLeva()" style="margin-top: 1rem; background: #8b5cf6;">ðŸ”— Gerar Link de InscriÃ§Ã£o Segura</button>
    <div id="levaResult" style="margin-top: 1rem; display: none; padding: 1rem; background: rgba(16, 185, 129, 0.1); border: 1px dashed var(--success); border-radius: 0.5rem; text-align: center; word-break: break-all;">
      <p style="color: var(--success); font-weight: bold; margin-bottom: 0.5rem;">Link Gerado com Sucesso!</p>
      <a id="levaLink" href="#" target="_blank" style="color: var(--text); text-decoration: none; font-family: monospace;"></a>
    </div>
  </div>

  <div class="card">
    <h2>Professores & LicenÃ§as B2B</h2>
    <div id="profList">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Escola</th>
            <th>Status</th>
            <th>AÃ§Ãµes</th>
          </tr>
        </thead>
        <tbody id="profTableBody">
          <!-- Rows will be injected here -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- â•â• ZONA DE PERIGO â•â• -->
  <div class="card danger-card">
    <h2>ðŸš¨ Zona de Perigo</h2>
    <p style="color: var(--text-dim); margin-bottom: 1.25rem; font-size: 0.9rem;">
      OperaÃ§Ãµes irreversÃ­veis. Prossiga somente se souber exatamente o que estÃ¡ fazendo.
    </p>

    <div style="display:flex; align-items:center; justify-content:space-between; padding: 1rem;
                background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2);
                border-radius: 0.5rem;">
      <div>
        <p style="font-weight:600; margin-bottom:0.25rem;">Regenerar Planilha Global</p>
        <p style="font-size:0.8rem; color:var(--text-dim); margin:0;">
          Cria uma nova planilha vazia. Todos os professores e logs serÃ£o perdidos.
          A planilha antiga permanece no Drive (apenas desvinculada).
        </p>
      </div>
      <button class="btn-danger" onclick="abrirModalReset()" style="white-space:nowrap; margin-left:1rem;">
        âš ï¸ Regenerar
      </button>
    </div>

    <div id="reset-result" class="reset-result"></div>
  </div>

</div><!-- /container -->

<!-- â•â• MODAL DE CONFIRMAÃ‡ÃƒO â•â• -->
<div class="modal-overlay" id="modal-reset">
  <div class="modal-box">
    <h3>ðŸš¨ Confirmar RegeneraÃ§Ã£o</h3>
    <p>
      Esta aÃ§Ã£o irÃ¡ <strong style="color:#f87171;">apagar todos os dados da Planilha Global</strong>
      (professores, licenÃ§as, logs e rankings) e criar uma nova vazia.<br><br>
      A planilha antiga <strong>nÃ£o serÃ¡ excluÃ­da</strong> do Google Drive, apenas desvinculada.
      Seu ID serÃ¡ salvo em <code>ADMIN_SPREADSHEET_ID_BACKUP</code>.<br><br>
      Para confirmar, digite <code style="color:#f87171; background:rgba(239,68,68,0.1); padding:2px 6px; border-radius:4px;">CONFIRMAR</code> abaixo:
    </p>
    <input
      type="text"
      id="reset-confirm-input"
      class="modal-confirm-input"
      placeholder="Digite CONFIRMAR"
      autocomplete="off"
      oninput="validarInputReset(this)"
    />
    <div class="modal-actions">
      <button class="btn-cancel" onclick="fecharModalReset()">Cancelar</button>
      <button id="btn-confirmar-reset" class="btn-danger" onclick="executarReset()" disabled
              style="border-color:rgba(239,68,68,0.5);">
        Regenerar Planilha
      </button>
    </div>
  </div>
</div>

<script>
  let adminToken = null;

  function showLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
  }

  function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.background = isError ? '#ef4444' : '#10b981';
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 4000);
  }

  function refreshData() {
    // [UI-05] Tentar recuperar token do localStorage antes de pedir ao usuÃ¡rio
    if (!adminToken) {
      adminToken = localStorage.getItem('wbx_admin_token');
    }

    showLoader(true);
    google.script.run
      .withSuccessHandler(data => {
        showLoader(false);
        adminToken = data.sharedToken; 
        // Salvar para o prÃ³ximo refresh
        localStorage.setItem('wbx_admin_token', adminToken);
        renderData(data);
        loadClassrooms();
        loadHeatmap();
      })
      .withFailureHandler(err => {
        showLoader(false);
        if (err.message && err.message.includes('UNAUTHORIZED')) {
          const newToken = prompt('Por favor, insira o SHARED_TOKEN:');
          if (newToken) {
            adminToken = newToken;
            refreshData();
          }
        } else {
          showToast('Erro: ' + err, true);
        }
      })
      .getAdminUIData(adminToken);
  }

  function loadClassrooms() {
    google.script.run
      .withSuccessHandler(courses => {
        const select = document.getElementById('courseSelect');
        select.innerHTML = courses.length ? '' : '<option>Nenhuma turma encontrada</option>';
        courses.forEach(c => {
          select.innerHTML += `<option value="${c.id}">${c.name} (${c.section})</option>`;
        });
      })
      .getClassroomCourses();
  }

  function deployClassroom() {
    const cid = document.getElementById('courseSelect').value;
    const title = document.getElementById('assignmentTitle').value;
    const seedId = document.getElementById('seedIdInput').value;
    
    if(!cid || !title || !seedId) return showToast('Preencha Turma, TÃ­tulo e Seed ID', true);
    
    showLoader(true);
    google.script.run
      .withSuccessHandler(res => {
        showLoader(false);
        showToast('Atividade publicada com sucesso!');
        window.open(res.alternateLink, '_blank');
      })
      .withFailureHandler(err => {
        showLoader(false);
        showToast('Falha: ' + err, true);
      })
      .publishToClassroom(cid, seedId, title, '', adminToken);
  }

  function loadHeatmap() {
    const level = document.getElementById('heatmapLevel').value;
    const id = (level === 'turma') ? document.getElementById('courseSelect').value : 'global';
    
    showLoader(true);
    google.script.run
      .withSuccessHandler(data => {
        showLoader(false);
        const list = document.getElementById('heatmapList');
        list.innerHTML = '<h4>DistribuiÃ§Ã£o de EsforÃ§o por Atividade</h4>';
        
        if (!data.labels || data.labels.length === 0) {
          list.innerHTML += '<p style="color: var(--text-dim); margin-top: 1rem;">Nenhum dado encontrado para este nÃ­vel.</p>';
          return;
        }

        data.labels.forEach((label, i) => {
          const val = Math.round(data.media_integridade[i] || 0);
          list.innerHTML += `
            <div style="margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
                <span>${label}</span>
                <span>${val}% Integridade</span>
              </div>
              <div class="heatmap-bar">
                <div class="heatmap-fill" style="width: ${val}%"></div>
              </div>
            </div>
          `;
        });
      })
      .withFailureHandler(err => {
        showLoader(false);
        showToast('Erro ao carregar heatmap: ' + err, true);
      })
      .getHeatmapData(adminToken, level === 'turma' ? 'turma_atividades' : 'instituicao', id);
  }

  function renderData(data) {
    document.getElementById('seedIdInput').value = data.seedId || '';
    document.getElementById('sharedTokenDisplay').innerText = 'Servidor Autenticado | Token: ' + data.sharedToken.substring(0, 8) + '...';

    const tbody = document.getElementById('profTableBody');
    tbody.innerHTML = '';

    data.professores.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.email}</td>
        <td>${p.escola}</td>
        <td><span class="badge badge-active">${p.status}</span></td>
        <td>
          <button onclick="distribute('${p.email}', this)">Distribuir Template</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function saveSeed() {
    const id = document.getElementById('seedIdInput').value;
    showLoader(true);
    google.script.run
      .withSuccessHandler(() => {
        showLoader(false);
        showToast('ID do Semente salvo com sucesso!');
      })
      .withFailureHandler(err => {
        showLoader(false);
        showToast('Erro ao salvar: ' + err, true);
      })
      .salvarSeedId(id, adminToken);
  }

  function distribute(email, btn) {
    if(!confirm('Deseja criar um Documento Mestre e enviar para ' + email + '?')) return;
    if (btn) btn.disabled = true;
    showLoader(true);
    google.script.run
      .withSuccessHandler(result => {
        showLoader(false);
        if (btn) btn.disabled = false;
        showToast('Template enviado para ' + email + '!');
      })
      .withFailureHandler(err => {
        showLoader(false);
        if (btn) btn.disabled = false;
        showToast('Falha na distribuiÃ§Ã£o: ' + err, true);
      })
      .distribuirMestreParaProfessor(email, adminToken);
  }

  function gerarLeva() {
    const nome = document.getElementById('levaName').value;
    const dataLimite = document.getElementById('levaDeadline').value;
    
    if (!nome) {
      return showToast('Preencha o Nome da Leva', true);
    }
    
    showLoader(true);
    google.script.run
      .withSuccessHandler(res => {
        showLoader(false);
        if (res.success) {
          showToast('Leva criada com sucesso!');
          const resDiv = document.getElementById('levaResult');
          const resLink = document.getElementById('levaLink');
          resLink.href = res.url;
          resLink.innerText = res.url;
          resDiv.style.display = 'block';
        }
      })
      .withFailureHandler(err => {
        showLoader(false);
        showToast('Erro ao criar Leva: ' + err, true);
      })
      .gerarLevaOnboarding(adminToken, nome, dataLimite);
  }

  // â”€â”€ Zona de Perigo: Reset da Planilha Global â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function abrirModalReset() {
    document.getElementById('modal-reset').classList.add('active');
    document.getElementById('reset-confirm-input').value = '';
    document.getElementById('btn-confirmar-reset').disabled = true;
    setTimeout(() => document.getElementById('reset-confirm-input').focus(), 100);
  }

  function fecharModalReset() {
    document.getElementById('modal-reset').classList.remove('active');
    document.getElementById('reset-confirm-input').value = '';
    document.getElementById('btn-confirmar-reset').disabled = true;
  }

  function validarInputReset(input) {
    document.getElementById('btn-confirmar-reset').disabled = (input.value !== 'CONFIRMAR');
  }

  // Fechar modal ao clicar fora da caixa
  document.getElementById('modal-reset').addEventListener('click', function(e) {
    if (e.target === this) fecharModalReset();
  });

  function executarReset() {
    fecharModalReset();
    showLoader(true);

    google.script.run
      .withSuccessHandler(function(res) {
        showLoader(false);
        const resultEl = document.getElementById('reset-result');

        if (res.success) {
          resultEl.innerHTML =
            'âœ… <strong>Planilha regenerada com sucesso!</strong><br><br>' +
            'ðŸ“„ <strong>Nova Planilha:</strong> <a href="' + res.newUrl + '" target="_blank" ' +
            'style="color:var(--success);">' + res.newUrl + '</a><br>' +
            'ðŸ†” <strong>Novo ID:</strong> ' + res.newId + '<br>' +
            (res.backupId ? 'ðŸ—‚ï¸ <strong>ID Antigo (backup):</strong> ' + res.backupId : '');
          resultEl.style.display = 'block';
          showToast('Planilha regenerada! Todos os dados foram reiniciados.');
          // Recarregar a tabela de professores (agora vazia)
          setTimeout(refreshData, 2000);
        } else {
          resultEl.innerHTML = 'âŒ Falha: ' + (res.message || JSON.stringify(res));
          resultEl.style.background = 'rgba(239,68,68,0.1)';
          resultEl.style.borderColor = '#ef4444';
          resultEl.style.display = 'block';
          showToast('Erro na regeneraÃ§Ã£o: ' + (res.message || res.error), true);
        }
      })
      .withFailureHandler(function(err) {
        showLoader(false);
        showToast('Falha crÃ­tica: ' + err, true);
      })
      .resetPlanilhaGlobalAdmin(adminToken);
  }

  // Initial load
  window.onload = refreshData;
</script>

</body>
</html>

==== DEPLOY.md ====
# Whitebox â€” Guia de ImplantaÃ§Ã£o

## VisÃ£o Geral da Arquitetura

```
[Documento Google do Aluno]
        |
        | UrlFetchApp (HTTPS + Token)
        v
[Brain Proxy â€” Script Standalone]  <-- cÃ³digo proprietÃ¡rio, sÃ³ vocÃª tem acesso
        |
        |---> Planilha Global (Admin/Dev)  â€” Assinaturas de professores por escola
        |---> Planilha do Professor        â€” Logs das turmas
        |---> API do Gemini Pro            â€” AnÃ¡lise socrÃ¡tica
```

---

## PASSO 1: Criar o Brain Proxy

1. Acesse [script.google.com](https://script.google.com) e crie um **Novo Projeto** em branco.
2. Nomeie-o como **"Whitebox BrainProxy"**.
3. Copie o conteÃºdo de `BrainProxy.gs` e `AdminSetup.gs` para o editor.
4. Salve o projeto.

---


## PASSO 3: Publicar o Brain Proxy como Web App

1. No editor do BrainProxy, clique em **Implantar â†’ Nova ImplantaÃ§Ã£o**.
2. Tipo: **Aplicativo da Web**.
3. ConfiguraÃ§Ã£o:
   - **Executar como**: Eu (seu email de administrador)
   - **Quem tem acesso**: Qualquer pessoa
4. Clique em **Implantar** e copie a **URL do Web App gerada**.

---

## PASSO 4: Configurar o Add-on (Script do Google Docs)

1. Abra o Script Editor do Documento Modelo (ou crie um novo projeto vinculado).
2. Copie os arquivos de `addonAutonomo-apps-script/` para o editor.
3. VÃ¡ em **ConfiguraÃ§Ãµes do Projeto â†’ Propriedades do Script** e adicione:

| Propriedade       | Valor                                          |
|-------------------|------------------------------------------------|
| `BRAIN_PROXY_URL` | URL copiada no Passo 3                         |
| `SHARED_TOKEN`    | O mesmo token configurado no BrainProxy        |

---

## PASSO 5: Cadastrar Professores

Existem trÃªs formas de adicionar professores Ã  base do Whitebox:

**OpÃ§Ã£o A â€” Onboarding AutomÃ¡tico (Recomendado)**
1. No `Dashboard.html`, clique em **"Gerar Link de InscriÃ§Ã£o Segura"**.
2. Defina o nome da leva e a data limite. O sistema criarÃ¡ um Google Form.
3. Envie o formulÃ¡rio aos professores. O robÃ´ validarÃ¡ a permissÃ£o do Drive deles em background e farÃ¡ o cadastro automÃ¡tico!

**OpÃ§Ã£o B â€” Via FunÃ§Ã£o (ProgramÃ¡tico)**
```javascript
// Execute no editor do BrainProxy:
// (email, escola, usaChaveGlobal, idArquivoDrive)
adicionarProfessor("professor@escola.com.br", "Escola XYZ", false, "1BxiMVs0XRY5..."); // Cofre Individual
adicionarProfessor("vip@escola.com.br", "Escola XYZ", true, ""); // Chave Global
```

**OpÃ§Ã£o C â€” Via Planilha (Manual)**
1. Abra a planilha Whitebox Admin.
2. Na aba "Assinaturas", adicione uma linha com:
   - `Email` | `Escola` | `Status: Ativo` | `UsaChaveGlobal: Sim/NÃ£o` | `ChaveIndividual: ID_DO_ARQUIVO_DRIVE`

---

## Hierarquia de Chaves API & SeguranÃ§a de Dados

Para garantir que as chaves da API nÃ£o fiquem vulnerÃ¡veis no banco de dados, utilizamos a estratÃ©gia de **Cofre no Drive (DelegaÃ§Ã£o de Acesso)**.

```
Para cada requisiÃ§Ã£o de anÃ¡lise:

1. O professor estÃ¡ na lista? Se nÃ£o â†’ retorna "NAO_CADASTRADO" (modo offline).
2. Status == "Inativo"? â†’ retorna "INATIVO".
3. UsaChaveGlobal == "Sim" E GEMINI_GLOBAL_KEY configurada? â†’ usa a chave da instituiÃ§Ã£o âœ…
4. ChaveIndividual preenchida com um ID do Google Drive? 
   â†³ O Proxy tenta ler o arquivo no Drive do professor. 
   â†³ Se conseguiu ler e tem a chave vÃ¡lida â†’ usa a chave privada do professor âœ…
5. Nenhuma das anteriores â†’ entra no MODO OFFLINE nativo.
   â†³ (As mÃ©tricas pedagÃ³gicas sÃ£o salvas na planilha do professor, mas o texto nÃ£o Ã© enviado para o Gemini).
```

---

## DistribuiÃ§Ã£o via Link

1. Abra o Documento Modelo no Google Drive.
2. Clique com o botÃ£o direito â†’ **Fazer uma cÃ³pia** para testar.
3. Para distribuir: **Compartilhar â†’ Qualquer pessoa com o link pode visualizar**.
4. Oriente os professores a fazer uma cÃ³pia do documento template para sua turma.
   - O Add-on viaja junto com o script container-bound.
   - O Brain Proxy permanece separado e oculto.

---

## SeguranÃ§a

- O cÃ³digo do Brain Proxy **nunca Ã© copiado** junto com o documento.
- Mesmo que alguÃ©m inspecione o cÃ³digo do Add-on, sÃ³ verÃ¡ chamadas para uma URL com um token.
- O token garante que apenas o seu Add-on pode chamar o Proxy.
- Cada professor tem sua prÃ³pria planilha criada automaticamente no primeiro uso.

==== FormOnboarding.gs ====
/**
 * ========================================================
 *  Whitebox - MÃ³dulo de Onboarding (FormulÃ¡rios Semente)
 * ========================================================
 */

/**
 * Cria o FormulÃ¡rio Semente original.
 * Esta funÃ§Ã£o deve ser executada apenas 1 vez para gerar o template base.
 */
function setupFormularioSemente() {
  const form = FormApp.create('Whitebox - Onboarding (Semente)');
  
  form.setTitle('Cadastro de Professor - Whitebox')
      .setDescription('Seja bem-vindo ao ecossistema Whitebox. Preencha os dados abaixo para provisionar seu ambiente de auditoria pedagÃ³gica.')
      .setConfirmationMessage('Recebemos seus dados! VocÃª receberÃ¡ um e-mail em instantes com o link da sua planilha individual.')
      .setAllowResponseEdits(false)
      .setCollectEmail(true);

  // Itens obrigatÃ³rios
  form.addTextItem().setTitle('Seu Nome Completo').setRequired(true);
  form.addTextItem().setTitle('InstituiÃ§Ã£o / Escola').setRequired(true);
  form.addTextItem().setTitle('Link do arquivo de Cofre (Google Drive)')
      .setHelpText('Crie um arquivo de texto no seu Drive com sua Chave API, compartilhe como "Leitor" e cole o link aqui. Se preferir usar a Chave Global da escola, deixe em branco.')
      .setRequired(false);

  // ForÃ§ar o Google a processar o formulÃ¡rio
  form.setAcceptingResponses(true);
  
  const formId = form.getId();
  const cfg    = getConfig();
  const ss     = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
  let configTab = ss.getSheetByName('Config');

  if (!configTab) {
    configTab = ss.insertSheet('Config');
    // [LOW-03 FIX] Usar header canÃ´nico ['Parametro', 'Valor', 'Descricao']
    // consistente com AdminSetup.gs â€” evita conflito de schema na leitura.
    configTab.appendRow(['Parametro', 'Valor', 'Descricao']);
  }

  // Verificar se a linha jÃ¡ existe para nÃ£o duplicar
  const data  = configTab.getDataRange().getValues();
  let found   = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'seed_form_id') {
      configTab.getRange(i + 1, 2).setValue(formId);
      found = true;
      break;
    }
  }

  if (!found) {
    // [LOW-03] Terceira coluna obrigatÃ³ria para manter schema ['Parametro', 'Valor', 'Descricao']
    configTab.appendRow(['seed_form_id', formId, 'ID do Form Semente para Onboarding']);
  }

  // Mover para a pasta alvo
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(formId).moveTo(targetFolder);

  Logger.log('FormulÃ¡rio Semente configurado com ID: ' + formId);
  return formId;
}

/**
 * FunÃ§Ã£o executada via Dashboard para gerar uma nova Leva (CriaÃ§Ã£o Direta)
 * @param {string} token Token do Admin
 * @param {string} nomeLeva Nome da Leva (ex: Turma 2026/1)
 * @param {string} dataLimite Data e hora limite no formato 'YYYY-MM-DDTHH:mm'
 */
function gerarLevaOnboarding(token, nomeLeva, dataLimite) {
  validateAdminAccess(token);
  
  // 1. Criar um NOVO FormulÃ¡rio do zero (Bypassa o erro de clonagem do Google)
  const novoForm = FormApp.create('Whitebox - Onboarding: ' + nomeLeva);
  
  novoForm.setTitle('Cadastro de Professor - ' + nomeLeva)
          .setDescription('Seja bem-vindo ao ecossistema Whitebox. Preencha os dados abaixo para provisionar seu ambiente de auditoria pedagÃ³gica.')
          .setConfirmationMessage('Recebemos seus dados! VocÃª receberÃ¡ um e-mail em instantes com o link da sua planilha individual.')
          .setAllowResponseEdits(false)
          .setCollectEmail(true)
          .setAcceptingResponses(true);

  // Itens do formulÃ¡rio
  novoForm.addTextItem().setTitle('Seu Nome Completo').setRequired(true);
  novoForm.addTextItem().setTitle('InstituiÃ§Ã£o / Escola').setRequired(true);
  novoForm.addTextItem().setTitle('Link do arquivo de Cofre (Google Drive)')
          .setHelpText('Crie um arquivo de texto no seu Drive com sua Chave API, compartilhe como "Leitor" e cole o link aqui. Se preferir usar a Chave Global da escola, deixe em branco.')
          .setRequired(false);

  const formId = novoForm.getId();
  const formUrl = novoForm.getPublishedUrl();

  // 2. Mover para a pasta do Whitebox
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(formId).moveTo(targetFolder);

  // 3. Criar o gatilho onSubmit para este formulÃ¡rio especÃ­fico
  ScriptApp.newTrigger('onProfessorFormSubmit')
           .forForm(novoForm)
           .onFormSubmit()
           .create();
           
  // 4. Criar o gatilho temporal para fechar o formulÃ¡rio (Deadline)
  if (dataLimite) {
    const limitDate = new Date(dataLimite);
    const triggerId = ScriptApp.newTrigger('fecharFormulariosVencidos')
                               .timeBased()
                               .at(limitDate)
                               .create()
                               .getUniqueId();
                               
    const props = PropertiesService.getScriptProperties();
    props.setProperty(PROP_DEADLINE_PREFIX + triggerId, formId);
  }

  return {
    success: true,
    url: formUrl,
    id: formId
  };
}

/**
 * FunÃ§Ã£o acionada pelo gatilho TimeBased na data limite.
 * Ela olha para as propriedades, acha qual Form venceu agora, e desativa as respostas.
 */
function fecharFormulariosVencidos(e) {
  // [HIGH-05 FIX] Guard explÃ­cito: sem triggerUid o lookup retorna 'DEADLINE_undefined'
  // e o formulÃ¡rio nunca seria fechado sem qualquer log de aviso.
  if (!e || !e.triggerUid) {
    Logger.log('[Onboarding] fecharFormulariosVencidos: e.triggerUid ausente. ' +
               'Essa funÃ§Ã£o deve ser acionada apenas por um gatilho TimeBased â€” nÃ£o manualmente.');
    return;
  }

  const triggerId = e.triggerUid;
  const props     = PropertiesService.getScriptProperties();
  const formId    = props.getProperty(PROP_DEADLINE_PREFIX + triggerId);

  if (formId) {
    try {
      const form = FormApp.openById(formId);
      form.setAcceptingResponses(false);
      form.setCustomClosedFormMessage('As inscriÃ§Ãµes para esta leva de professores foram encerradas.');
      Logger.log('[Onboarding] FormulÃ¡rio fechado automaticamente (Deadline): ' + formId);
    } catch (err) {
      Logger.log('[Onboarding] Erro ao fechar form ' + formId + ': ' + err);
    }
    // Limpeza da propriedade
    props.deleteProperty(PROP_DEADLINE_PREFIX + triggerId);
    // Remover o gatilho para evitar execuÃ§Ãµes futuras desnecessÃ¡rias
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getUniqueId() === triggerId) {
        ScriptApp.deleteTrigger(triggers[i]);
        break; // Encontrado â€” sair do loop
      }
    }
  } else {
    Logger.log('[Onboarding] fecharFormulariosVencidos: nenhum formId encontrado para triggerUid=' + triggerId);
  }
}

/**
 * FunÃ§Ã£o acionada toda vez que um professor responde o formulÃ¡rio de Onboarding.
 */

// FORM_FIELD_* â†’ ver Constants.gs
// [ARCH-03] Constantes dos campos do formulÃ¡rio movidas para Constants.gs.


function onProfessorFormSubmit(e) {
  if (!e || !e.response) return; // SeguranÃ§a contra execuÃ§Ãµes manuais acidentais

  const email        = e.response.getRespondentEmail();
  const itemResponses = e.response.getItemResponses();

  let instituicao = 'NÃ£o informada';
  let linkDrive   = '';

  for (let i = 0; i < itemResponses.length; i++) {
    const title  = itemResponses[i].getItem().getTitle();
    const answer = itemResponses[i].getResponse();

    // [MED-03 FIX] Matching exato por constante â€” nÃ£o por substring impreciso.
    // O bug anterior usava title.includes('Link do Cofre Drive') que nunca batia com
    // 'Link do arquivo de Cofre (Google Drive)', forÃ§ando todos ao modo offline.
    if (title === FORM_FIELD_INSTITUICAO) {
      instituicao = answer;
    } else if (title === FORM_FIELD_LINK_COFRE) {
      linkDrive = answer;
    }
  }

  // 1. Validar e Extrair o File ID do Link (se houver)

  let fileId = '';
  let chaveAprovada = false;
  let usouChaveGlobal = false;
  
  if (linkDrive && linkDrive.trim().length > 0) {
    fileId = linkDrive.trim();
    const matchUrl = linkDrive.match(/\/d\/([-\w]{25,})/);
    if (matchUrl) fileId = matchUrl[1];
    
    try {
      const file = DriveApp.getFileById(fileId);
      const textoChave = file.getBlob().getDataAsString().trim();
      
      if (textoChave.startsWith('AIza')) {
        chaveAprovada = true;
      }
    } catch (err) {
      Logger.log('[Onboarding] Erro de PermissÃ£o ao acessar Cofre de ' + email + ' - ' + err.toString());
    }
  } else {
    // Se o professor nÃ£o enviou o link, aprovamos o cadastro em Modo Offline (sem IA)
    chaveAprovada = true;
    usouChaveGlobal = false; // NÃ£o libera a chave global automaticamente
  }
  
  // 2. Fluxo de Sucesso ou Falha
  if (chaveAprovada) {
    // [CR-03] Serializar registros simultÃ¢neos para evitar race condition no rowIndex
    const lock = LockService.getScriptLock();
    let spreadsheetId = '';
    try {
      lock.waitLock(30000); // Aguarda atÃ© 30s por uma submissÃ£o anterior

      // Registra na planilha Global com Status Ativo
      adicionarProfessor(email, instituicao, usouChaveGlobal, fileId);

      // [CR-03 FIX] Buscar o rowIndex REAL do professor por email, nÃ£o por getLastRow()
      // Isso garante que dois professores submetendo simultaneamente nÃ£o troquem suas planilhas.
      const cfg = getConfig();
      const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
      const data = sheet.getDataRange().getValues();
      const spreadsheetCol = data[0].indexOf('SpreadsheetId');

      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === email) { rowIndex = i; break; }
      }

      if (rowIndex === -1) {
        throw new Error('[Onboarding] Professor ' + email + ' nÃ£o encontrado apÃ³s adicionarProfessor()');
      }

      spreadsheetId = garantirPlanilhaProfessor(email, sheet, rowIndex, spreadsheetCol);

    } catch (lockErr) {
      Logger.log('[Onboarding] Erro no lock/provisionamento para ' + email + ': ' + lockErr);
      MailApp.sendEmail({
        to: email,
        subject: 'âš ï¸ Erro TemporÃ¡rio - Whitebox',
        body: 'OlÃ¡!\n\nOcorreu um erro temporÃ¡rio ao processar seu cadastro. Por favor, aguarde alguns minutos e tente novamente.\n\nDesculpe o inconveniente.\n\nEquipe Whitebox'
      });
      return;
    } finally {
      lock.releaseLock();
    }
    
    let msgBody = 'OlÃ¡!\n\nSeu cadastro foi aprovado com sucesso.\n\n';
    if (fileId) {
      msgBody += 'Seu Cofre do Drive foi validado com sucesso e sua chave privada serÃ¡ utilizada para a InteligÃªncia Artificial.\n\n';
    } else {
      msgBody += 'VocÃª nÃ£o forneceu uma chave individual. Seu perfil foi configurado para o **Modo Offline**.\nVocÃª poderÃ¡ utilizar o sistema normalmente para coleta e registro de mÃ©tricas pedagÃ³gicas, mas sem as anÃ¡lises automatizadas da InteligÃªncia Artificial. Se a sua instituiÃ§Ã£o fornecer uma Chave Global no futuro, a IA serÃ¡ ativada automaticamente.\n\n';
    }
    msgBody += 'Sua Planilha de Logs e ConfiguraÃ§Ãµes PedagÃ³gicas jÃ¡ estÃ¡ pronta: https://docs.google.com/spreadsheets/d/' + spreadsheetId + '\n\nBem-vindo(a) ao Whitebox!';
    
    // Envia E-mail de Sucesso
    MailApp.sendEmail({
      to: email,
      subject: 'âœ… Cadastro Aprovado - Whitebox',
      body: msgBody
    });
    
  } else {
    // Falhou: Enviou um link mas ele nÃ£o pÃ´de ser validado
    MailApp.sendEmail({
      to: email,
      subject: 'âŒ Erro de Cadastro - PermissÃ£o do Cofre Drive (Whitebox)',
      body: 'OlÃ¡!\n\nRecebemos sua inscriÃ§Ã£o no Whitebox, porÃ©m NÃƒO conseguimos acessar a Chave de API atravÃ©s do Link do Cofre fornecido.\n\nPor favor, verifique se:\n1. O link estÃ¡ correto.\n2. O arquivo estÃ¡ compartilhado conosco com permissÃ£o de "Leitor".\n3. O arquivo contÃ©m apenas a sua chave Gemini (iniciada com AIza...).\n\nCorrija as permissÃµes no Drive e preencha o formulÃ¡rio novamente para ativar sua conta.'
    });
  }
}

==== SchemaManager.gs ====
/**
 * =====================================================
 *  Whitebox â€” SchemaManager.gs (Servidor)
 * =====================================================
 *
 * [ARCH-05] Gerenciamento de versÃ£o e integridade do schema
 * da Planilha Global de AdministraÃ§Ã£o.
 *
 * MOTIVAÃ‡ÃƒO (HIGH-03):
 *   Um Ã­ndice de coluna hardcoded `data[i][5]` causou leitura silenciosa
 *   do campo errado quando uma nova coluna foi inserida antes de
 *   'SpreadsheetId'. O sistema continuou funcionando com dados incorretos
 *   por tempo indeterminado.
 *
 * SOLUÃ‡ÃƒO:
 *   - Campo `VersaoSchema` na aba Config identifica a versÃ£o da estrutura.
 *   - `verificarSchemaGlobal()` valida que todas as colunas obrigatÃ³rias
 *     estÃ£o presentes com os nomes corretos.
 *   - `migrarSchemaSeNecessario()` executa migraÃ§Ãµes incrementais e
 *     atualiza a versÃ£o no Config.
 *
 * POLÃTICA DE VERSÃ•ES:
 *   v1 - Schema base (Assinaturas, Config, Tarefas_Globais, Ranking_Instituicao)
 *   v2 - Adicionado DataCadastro na aba Assinaturas
 *   v3 - Adicionado Historico_Templates na Planilha Global (mÃ³dulo Template Distribution)
 */

// SCHEMA_VERSION_ATUAL â†’ ver Constants.gs
// [ARCH-03/05] Definida em Constants.gs para consistÃªncia com os demais literais.

// =====================================================
//  SCHEMA ESPERADO: DefiniÃ§Ã£o canÃ´nica de cada aba
// =====================================================

/**
 * Colunas obrigatÃ³rias de cada aba da Planilha Global.
 * Chave: nome da aba. Valor: array de nomes de colunas na ordem correta.
 *
 * REGRA: Sempre usar `.indexOf()` para resolver colunas em runtime.
 * Nunca assumir um Ã­ndice numÃ©rico fixo.
 */
const SCHEMA_GLOBAL = {
  'Assinaturas': [
    'Email', 'Instituicao', 'Status',
    'UsaChaveGlobal', 'ChaveIndividual', 'SpreadsheetId', 'DataCadastro'
  ],
  'Config': [
    'Parametro', 'Valor', 'Descricao'
  ],
  'Tarefas_Globais': [
    'ID_Tarefa', 'Professor', 'Instituicao', 'Titulo', 'Course_ID', 'Data_Criacao'
  ],
  'Ranking_Instituicao': [
    'Instituicao', 'Total_Professores', 'Total_Alunos', 'Media_Autonomia_IA', 'Ultima_Atualizacao'
  ],
  // [TEMPLATE-01] v3: Aba adicionada pelo mÃ³dulo TemplateService
  'Historico_Templates': [
    'ID_Distribuicao', 'Admin_Email', 'Template_ID', 'Template_Nome',
    'Destinatarios', 'Docs_Criados', 'Falhas', 'Mensagem', 'Data_Criacao'
  ]
};

/**
 * Colunas obrigatÃ³rias da aba Logs de cada professor.
 * Usadas por verificarSchemaProfessor() para validar planilhas individuais.
 */
const SCHEMA_LOGS_PROFESSOR = [
  'Timestamp', 'Turma', 'DocId', 'Email_Aluno',
  'Palavras', 'Tempo_Ativo_Min', 'Colar_Eventos',
  'Taxa_Edicao', 'Alteracoes_Estrutura',
  'Chars_Adicionados', 'Chars_Deletados', 'Colagem_Massiva',
  'Cpm_Medio', 'Cpm_Pico',
  'RiscoScore', 'Whitebox_Risco', 'Conselho_Pedagogico',
  'Pergunta_Socratica', 'Modo_IA', 'Entrega_Final'
];

// =====================================================
//  LEITURA DO SCHEMA: VersÃ£o atual na planilha
// =====================================================

/**
 * LÃª a versÃ£o do schema armazenada na aba Config da Planilha Global.
 * Retorna 0 se a chave nÃ£o existir (planilha prÃ©-ARCH-05).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {number}
 */
function lerVersaoSchema(ss) {
  try {
    const configSheet = ss.getSheetByName(SHEET_CONFIG);
    if (!configSheet) return 0;

    const data = configSheet.getDataRange().getValues();
    const paramCol = data[0].indexOf('Parametro');
    const valorCol = data[0].indexOf('Valor');
    if (paramCol === -1 || valorCol === -1) return 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][paramCol] === 'VersaoSchema') {
        return parseInt(data[i][valorCol]) || 0;
      }
    }
    return 0;
  } catch (e) {
    Logger.log('[SchemaManager] Erro ao ler VersaoSchema: ' + e);
    return 0;
  }
}

/**
 * Grava (ou atualiza) a versÃ£o do schema na aba Config.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {number} versao
 */
function gravarVersaoSchema(ss, versao) {
  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) {
    Logger.log('[SchemaManager] Aba Config ausente â€” nÃ£o foi possÃ­vel gravar VersaoSchema.');
    return;
  }

  const data     = configSheet.getDataRange().getValues();
  const paramCol = data[0].indexOf('Parametro');
  const valorCol = data[0].indexOf('Valor');
  if (paramCol === -1 || valorCol === -1) return;

  // Atualizar linha existente
  for (let i = 1; i < data.length; i++) {
    if (data[i][paramCol] === 'VersaoSchema') {
      configSheet.getRange(i + 1, valorCol + 1).setValue(versao);
      Logger.log('[SchemaManager] VersaoSchema atualizada para: ' + versao);
      return;
    }
  }

  // Inserir nova linha
  configSheet.appendRow(['VersaoSchema', versao, 'VersÃ£o do schema da Planilha Global (ARCH-05)']);
  Logger.log('[SchemaManager] VersaoSchema inserida: ' + versao);
}

// =====================================================
//  VERIFICAÃ‡ÃƒO: Integridade das colunas
// =====================================================

/**
 * [ARCH-05] Verifica se todas as abas e colunas obrigatÃ³rias existem
 * na Planilha Global. Detecta inconsistÃªncias antes que causem bugs silenciosos.
 *
 * @param {string} adminSpreadsheetId
 * @returns {{
 *   ok: boolean,
 *   versaoAtual: number,
 *   versaoEsperada: number,
 *   abas: { nome: string, ok: boolean, colunasFaltando: string[], colunasExtras: string[] }[],
 *   mensagem: string
 * }}
 */
function verificarSchemaGlobal(adminSpreadsheetId) {
  const ss = SpreadsheetApp.openById(adminSpreadsheetId);
  const versaoAtual = lerVersaoSchema(ss);
  const resultado   = {
    ok:              true,
    versaoAtual:     versaoAtual,
    versaoEsperada:  SCHEMA_VERSION_ATUAL,
    abas:            [],
    mensagem:        ''
  };

  for (const nomeAba in SCHEMA_GLOBAL) {
    const sheet = ss.getSheetByName(nomeAba);
    const abaCheck = { nome: nomeAba, ok: true, colunasFaltando: [], colunasExtras: [] };

    if (!sheet) {
      abaCheck.ok = false;
      abaCheck.colunasFaltando = SCHEMA_GLOBAL[nomeAba];
      resultado.ok = false;
      resultado.abas.push(abaCheck);
      Logger.log('[SchemaManager] ABA AUSENTE: ' + nomeAba);
      continue;
    }

    const headersAtivos   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headersEsperados = SCHEMA_GLOBAL[nomeAba];

    // Colunas que deveriam existir mas nÃ£o existem
    abaCheck.colunasFaltando = headersEsperados.filter(h => !headersAtivos.includes(h));

    // Colunas extras (informativo â€” nÃ£o Ã© erro, apenas rastreado)
    abaCheck.colunasExtras   = headersAtivos.filter(h => h !== '' && !headersEsperados.includes(h));

    if (abaCheck.colunasFaltando.length > 0) {
      abaCheck.ok  = false;
      resultado.ok = false;
    }

    resultado.abas.push(abaCheck);
  }

  // Verificar divergÃªncia de versÃ£o
  if (versaoAtual < SCHEMA_VERSION_ATUAL) {
    resultado.ok      = false;
    resultado.mensagem = 'Schema desatualizado: v' + versaoAtual + ' â†’ v' + SCHEMA_VERSION_ATUAL +
                         '. Execute migrarSchemaSeNecessario() para atualizar.';
  } else if (resultado.ok) {
    resultado.mensagem = 'Schema v' + versaoAtual + ' âœ… Todas as colunas obrigatÃ³rias presentes.';
  } else {
    resultado.mensagem = 'Schema v' + versaoAtual + ' âš ï¸ InconsistÃªncias detectadas. Verifique as abas reportadas.';
  }

  Logger.log('[SchemaManager] verificarSchemaGlobal: ' + resultado.mensagem);
  return resultado;
}

/**
 * [ARCH-05] Verifica a aba Logs de uma planilha individual de professor.
 * Ãštil apÃ³s migrations que adicionam novas colunas ao schema de logs.
 *
 * @param {string} profSpreadsheetId
 * @returns {{ ok: boolean, colunasFaltando: string[], email: string }}
 */
function verificarSchemaProfessor(profSpreadsheetId) {
  try {
    const ss        = SpreadsheetApp.openById(profSpreadsheetId);
    const logSheet  = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) return { ok: false, colunasFaltando: SCHEMA_LOGS_PROFESSOR };

    const headers = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
    const faltando = SCHEMA_LOGS_PROFESSOR.filter(h => !headers.includes(h));

    return {
      ok:              faltando.length === 0,
      colunasFaltando: faltando,
      spreadsheetId:   profSpreadsheetId
    };
  } catch (e) {
    Logger.log('[SchemaManager] Erro ao verificar schema do professor ' + profSpreadsheetId + ': ' + e);
    return { ok: false, colunasFaltando: [], error: e.toString() };
  }
}

// =====================================================
//  MIGRAÃ‡ÃƒO: Schema incremental
// =====================================================

/**
 * [ARCH-05] Ponto de entrada para migraÃ§Ãµes de schema.
 * Executa migraÃ§Ãµes em sequÃªncia da versÃ£o atual atÃ© SCHEMA_VERSION_ATUAL.
 * Idempotente: seguro para executar mÃºltiplas vezes.
 *
 * @param {string} adminSpreadsheetId
 * @returns {{ migracoes: string[], versaoFinal: number }}
 */
function migrarSchemaSeNecessario(adminSpreadsheetId) {
  const ss          = SpreadsheetApp.openById(adminSpreadsheetId);
  const versaoAtual = lerVersaoSchema(ss);
  const migracoes   = [];

  if (versaoAtual >= SCHEMA_VERSION_ATUAL) {
    Logger.log('[SchemaManager] Nenhuma migraÃ§Ã£o necessÃ¡ria (v' + versaoAtual + ' = atual).');
    return { migracoes: [], versaoFinal: versaoAtual };
  }

  Logger.log('[SchemaManager] Iniciando migraÃ§Ã£o v' + versaoAtual + ' â†’ v' + SCHEMA_VERSION_ATUAL);

  // ---- MigraÃ§Ã£o v0 â†’ v1: schema base (criado pelo setupPlanilhaGlobal) ----
  if (versaoAtual < 1) {
    // Nada a migrar estruturalmente: schema v1 Ã© criado pelo setup.
    // Apenas registrar a versÃ£o em planilhas prÃ©-ARCH-05.
    migracoes.push('v0â†’v1: VersaoSchema registrada (schema base existente).');
    gravarVersaoSchema(ss, 1);
  }

  // ---- MigraÃ§Ã£o v1 â†’ v2: Adicionar 'DataCadastro' se ausente ----
  if (versaoAtual < 2) {
    migracoes.push(..._migrarV1ParaV2(ss));
    gravarVersaoSchema(ss, 2);
  }

  // ---- MigraÃ§Ã£o v2 â†’ v3: Criar aba Historico_Templates ----
  if (versaoAtual < 3) {
    migracoes.push(..._migrarV2ParaV3(ss));
    gravarVersaoSchema(ss, 3);
  }

  const versaoFinal = lerVersaoSchema(ss);
  Logger.log('[SchemaManager] MigraÃ§Ã£o concluÃ­da. VersÃ£o final: v' + versaoFinal);
  return { migracoes, versaoFinal };
}

/**
 * MigraÃ§Ã£o v1 â†’ v2: Adiciona a coluna 'DataCadastro' na aba Assinaturas
 * para planilhas criadas antes do ARCH-05 (que nÃ£o tinham esse campo).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {string[]} Log das aÃ§Ãµes executadas
 */
function _migrarV1ParaV2(ss) {
  const log   = [];
  const sheet = ss.getSheetByName(SHEET_ASSINATURAS);
  if (!sheet) {
    log.push('v1â†’v2: Aba Assinaturas ausente â€” migraÃ§Ã£o pulada.');
    return log;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.includes('DataCadastro')) {
    log.push('v1â†’v2: DataCadastro jÃ¡ presente â€” nada a fazer.');
    return log;
  }

  // Adicionar coluna ao final dos headers
  const novaColuna = sheet.getLastColumn() + 1;
  sheet.getRange(1, novaColuna).setValue('DataCadastro').setFontWeight('bold');

  // Preencher linhas existentes com 'N/A (prÃ©-ARCH-05)' como valor sentinel
  const numRows = sheet.getLastRow() - 1;
  if (numRows > 0) {
    const filler = Array(numRows).fill(['N/A (prÃ©-ARCH-05)']);
    sheet.getRange(2, novaColuna, numRows, 1).setValues(filler);
  }

  log.push('v1â†’v2: Coluna DataCadastro adicionada Ã  aba Assinaturas (' + numRows + ' linhas preenchidas).');
  Logger.log('[SchemaManager] ' + log[log.length - 1]);
  return log;
}

/**
 * MigraÃ§Ã£o v2 â†’ v3: Cria a aba 'Historico_Templates' na Planilha Global
 * para planilhas criadas antes do mÃ³dulo TemplateService (TEMPLATE-01).
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {string[]} Log das aÃ§Ãµes executadas
 */
function _migrarV2ParaV3(ss) {
  const log = [];

  // Verificar se aba jÃ¡ existe (idempotente)
  if (ss.getSheetByName('Historico_Templates')) {
    log.push('v2â†’v3: Aba Historico_Templates jÃ¡ existente â€” nada a fazer.');
    Logger.log('[SchemaManager] ' + log[0]);
    return log;
  }

  const sheet = ss.insertSheet('Historico_Templates');
  const headers = [
    'ID_Distribuicao', 'Admin_Email', 'Template_ID', 'Template_Nome',
    'Destinatarios', 'Docs_Criados', 'Falhas', 'Mensagem', 'Data_Criacao'
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

  log.push('v2â†’v3: Aba Historico_Templates criada com ' + headers.length + ' colunas.');
  Logger.log('[SchemaManager] ' + log[0]);
  return log;
}

// =====================================================
//  EXPOSIÃ‡ÃƒO ADMIN: Para Dashboard e doGet
// =====================================================

/**
 * [ARCH-05] Retorna o resultado de verificarSchemaGlobal para o Dashboard Admin.
 * Chamado via google.script.run pelo HTML do Dashboard.
 *
 * @param {string} token - SHARED_TOKEN para autenticaÃ§Ã£o
 * @returns {object} Resultado de verificarSchemaGlobal()
 */
function getSchemaStatus(token) {
  validateAdminAccess(token);
  const cfg = getConfig();
  return verificarSchemaGlobal(cfg.adminSpreadsheetId);
}

/**
 * [ARCH-05] Executa migraÃ§Ãµes pendentes via Dashboard Admin.
 * Chamado via google.script.run pelo HTML do Dashboard.
 *
 * @param {string} token - SHARED_TOKEN para autenticaÃ§Ã£o
 * @returns {object} Resultado de migrarSchemaSeNecessario()
 */
function executarMigracoes(token) {
  validateAdminAccess(token);
  const cfg = getConfig();
  return migrarSchemaSeNecessario(cfg.adminSpreadsheetId);
}

==== TemplateService.gs ====
/**
 * ========================================================
 *  Whitebox â€” TemplateService.gs (Servidor)
 *  MÃ³dulo de DistribuiÃ§Ã£o de Doc Templates
 * ========================================================
 *
 * RESPONSABILIDADES:
 *   1. Admin â†’ Professor: distribuir um Doc Template para
 *      um ou mais professores cadastrados (makeCopy + share).
 *   2. Professor â†’ Turma/Aluno: criar "Levas" de cÃ³pias do
 *      template para alunos via Google Classroom (STUDENT_COPY).
 *
 * SEGURANÃ‡A:
 *   - FunÃ§Ãµes Admin exigem validateAdminAccess(token).
 *   - FunÃ§Ãµes Professor exigem professorEmail registrado na
 *     planilha global (buscarRegistroProfessor).
 *   - Alunos nunca chegam a este mÃ³dulo (bloqueio na Sidebar).
 *
 * PERSISTÃŠNCIA:
 *   - DistribuiÃ§Ãµes Admin â†’ aba "Historico_Templates" na Planilha Global.
 *   - Levas Professor â†’ aba "Levas" na planilha individual do professor.
 *
 * LIMITES DO APPS SCRIPT:
 *   - ExecuÃ§Ãµes limitadas a ~6 min; levas grandes sÃ£o processadas
 *     em batches de MAX_ALUNOS_POR_EXECUCAO para nÃ£o estourar.
 *   - O cliente pode fazer polling via ROUTE_STATUS_LEVA.
 */

// =====================================================
//  CONSTANTES LOCAIS DO MÃ“DULO
// =====================================================

/** MÃ¡ximo de docs de alunos criados por execuÃ§Ã£o (limite seguro Apps Script) */
const MAX_ALUNOS_POR_EXECUCAO = 30;

/** Nome da aba de histÃ³rico de distribuiÃ§Ãµes Admin na Planilha Global */
const SHEET_HISTORICO_TEMPLATES = 'Historico_Templates';

/** Nome da aba de levas na planilha individual do professor */
const SHEET_LEVAS = 'Levas';

/** CabeÃ§alhos da aba Historico_Templates */
const HEADERS_HISTORICO_TEMPLATES = [
  'ID_Distribuicao', 'Admin_Email', 'Template_ID', 'Template_Nome',
  'Destinatarios', 'Docs_Criados', 'Falhas', 'Mensagem', 'Data_Criacao'
];

/** CabeÃ§alhos da aba Levas do professor */
const HEADERS_LEVAS = [
  'ID_Leva', 'Template_ID', 'Template_Nome', 'Titulo_Atividade',
  'Course_ID', 'Course_Nome', 'Assignment_ID', 'Total_Alunos',
  'Docs_Criados', 'Prazo', 'Instrucoes', 'Data_Criacao'
];


// =====================================================
//  HANDLER: Listar Templates DisponÃ­veis (Admin)
// =====================================================

/**
 * Retorna a lista de templates disponÃ­veis no Drive do Admin.
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
//  HANDLER: Distribuir Template Admin â†’ Professores
// =====================================================

/**
 * Copia um Doc Template para o Drive de cada professor destinatÃ¡rio.
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
 *   notificarEmail: boolean         // true para enviar e-mail de notificaÃ§Ã£o
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

  // Validar cada email antes de executar qualquer aÃ§Ã£o
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
  const pastaDestino  = getOrCreateTemplatesFolder(); // pasta admin para referÃªncia

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
      const nomeCopia      = templateNome + ' â€” ' + email;
      const copia          = templateFile.makeCopy(nomeCopia, pastaProfessor);

      // 2. Injetar DeveloperMetadata de Auto-ConfiguraÃ§Ã£o [ARCH-LIB]
      try {
        const configObj = {
          proxyUrl:       cfg.proxyUrl,
          sharedToken:    cfg.sharedToken,
          professorEmail: email // [AUTH-01 FIX] Designa explicitamente o professor
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
      Logger.log('[TemplateService] Template distribuÃ­do para: ' + email);

    } catch (err) {
      falhas++;
      resultados.push({ email, status: 'erro', message: err.toString() });
      Logger.log('[TemplateService] Falha ao distribuir para ' + email + ': ' + err);
    }
  }

  // 4. Registrar no histÃ³rico da Planilha Global
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
 * Retorna as turmas do Google Classroom onde o professor Ã© docente.
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
    // Buscar turmas onde o professor Ã© owner/teacher (executa como: o Add-on)
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
//  HANDLER: Criar Leva â€” Professor â†’ Turma(s)/Alunos
// =====================================================

/**
 * Cria uma atividade no Google Classroom a partir de um template,
 * gerando cÃ³pia individual por aluno (STUDENT_COPY).
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

  // Verificar template acessÃ­vel
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

      // Buscar nome da turma para log legÃ­vel
      let courseNome = courseId;
      try {
        const course = Classroom.Courses.get(courseId);
        courseNome = course.name + (course.section ? ' â€” ' + course.section : '');
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

      // Contar alunos na turma (para relatÃ³rio)
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

  updateStatus(100, 'DistribuiÃ§Ã£o concluÃ­da.');

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
//  HANDLER: Status da DistribuiÃ§Ã£o (Polling)
// =====================================================

/**
 * Retorna o status de uma execuÃ§Ã£o de distribuiÃ§Ã£o a partir do CacheService.
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
      return jsonResponse({ success: true, pct: 0, msg: 'Aguardando inÃ­cio...' });
    }
    const status = JSON.parse(statusRaw);
    return jsonResponse({ success: true, pct: status.pct, msg: status.msg });
  } catch (err) {
    return jsonResponse({ error: 'FALHA_CACHE', message: err.toString() }, 500);
  }
}


// =====================================================
//  HANDLER: HistÃ³rico de DistribuiÃ§Ãµes (Admin)
// =====================================================

/**
 * Retorna o histÃ³rico de distribuiÃ§Ãµes de templates feitas pelo Admin.
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
 * ConstrÃ³i o objeto CourseWork para criaÃ§Ã£o no Classroom.
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
          shareMode: 'STUDENT_COPY'  // cada aluno recebe sua cÃ³pia privada
        }
      }
    ]
  };

  // Prazo (dueDate/dueTime) â€” opcional
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
      Logger.log('[TemplateService] Prazo invÃ¡lido ignorado: ' + prazo);
    }
  }

  return resource;
}

/**
 * Registra uma distribuiÃ§Ã£o Admin no Historico_Templates da Planilha Global.
 * Cria a aba se ainda nÃ£o existir.
 * @private
 */
function _registrarHistoricoDistribuicao({ adminEmail, templateId, templateNome,
                                           destinatarios, docsCriados, falhas,
                                           mensagem, cfg }) {
  try {
    const ss    = SpreadsheetApp.openById(cfg.adminSpreadsheetId);
    let   sheet = ss.getSheetByName(SHEET_HISTORICO_TEMPLATES);

    // Criar aba se necessÃ¡rio
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
 * Cria a aba se ainda nÃ£o existir.
 * @private
 */
function _registrarLevasProfessor({ registro, templateDocId, templateNome,
                                    titulo, courseId, courseNome, assignmentId,
                                    prazo, instrucoes }) {
  try {
    if (!registro || !registro.spreadsheetId) {
      Logger.log('[TemplateService] _registrarLevasProfessor: planilha do professor nÃ£o encontrada.');
      return null;
    }

    const ss    = SpreadsheetApp.openById(registro.spreadsheetId);
    let   sheet = ss.getSheetByName(SHEET_LEVAS);

    // Criar aba se necessÃ¡rio
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
      '',          // Total_Alunos â€” preenchido apÃ³s confirmaÃ§Ã£o
      '',          // Docs_Criados â€” preenchido pelo Classroom (STUDENT_COPY Ã© assÃ­ncrono)
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
 * Se o professor nÃ£o tiver a pasta, ela Ã© criada no root do seu Drive.
 * @private
 */
function _getOrCreatePastaProfessor(email) {
  // Tentamos colocar na pasta root "whitebox" â€” a execuÃ§Ã£o Ã© feita como Admin
  // entÃ£o DriveApp.createFolder cria na raiz do Drive do Admin.
  // O arquivo Ã© compartilhado com o professor via addEditor().
  // Esta Ã© a limitaÃ§Ã£o do Apps Script: nÃ£o Ã© possÃ­vel criar no Drive de outro usuÃ¡rio.
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
 * Envia e-mail de notificaÃ§Ã£o ao professor quando recebe um template.
 * @private
 */
function _enviarEmailTemplate(email, templateNome, templateUrl, mensagemAdmin) {
  try {
    const subject = 'ðŸ“„ [Whitebox] Novo template disponÃ­vel: ' + templateNome;
    let body = 'OlÃ¡!\n\n';

    if (mensagemAdmin && mensagemAdmin.trim().length > 0) {
      body += 'ðŸ’¬ Mensagem do administrador:\n' + mensagemAdmin.trim() + '\n\n';
    }

    body += 'Um novo template foi disponibilizado para vocÃª no Whitebox:\n';
    body += 'ðŸ“„ ' + templateNome + '\n';
    body += 'ðŸ”— Link: ' + templateUrl + '\n\n';
    body += 'Para distribuir este template para suas turmas:\n';
    body += '1. Abra o documento no Google Docs\n';
    body += '2. Acesse o add-on Whitebox na barra lateral\n';
    body += '3. Clique na aba "ðŸ“¤ Distribuir"\n';
    body += '4. Selecione as turmas e clique em "Distribuir Levas"\n\n';
    body += 'Whitebox â€” Sistema de Auditoria de Autoria PedagÃ³gica';

    MailApp.sendEmail(email, subject, body);
    Logger.log('[TemplateService] E-mail enviado para: ' + email);
  } catch (e) {
    Logger.log('[TemplateService] Falha ao enviar e-mail para ' + email + ': ' + e);
    // NÃ£o relanÃ§ar â€” falha de e-mail nÃ£o deve interromper a distribuiÃ§Ã£o
  }
}

==== TestMetadata.gs ====
/**
 * Script de Teste E2E: ValidaÃ§Ã£o de InjeÃ§Ã£o de Metadados [ARCH-LIB]
 * Executar este teste no console do Apps Script do whitebox-server.
 */
function testarInjecaoMetadados() {
  const TEST_DOC_ID = '1-iOBoLbJ5JO2AdvHTnf4RUVV4WEup6KmaJVu8JbNkmM'; // ID fornecido pelo usuÃ¡rio
  const professorEmail = Session.getActiveUser().getEmail();
  
  Logger.log('ðŸš€ Iniciando Teste E2E para o Doc: ' + TEST_DOC_ID);
  
  try {
    // 1. Simular a configuraÃ§Ã£o do Proxy (garantir que temos URL e Token)
    const cfg = getConfig();
    if (!cfg.proxyUrl || !cfg.sharedToken) {
      throw new Error('Script Properties do Servidor incompleto: BRAIN_PROXY_URL ou SHARED_TOKEN ausente.');
    }
    
    // 2. Abrir o Documento
    const doc = DocumentApp.openById(TEST_DOC_ID);
    
    // 3. Limpar metadados antigos para o teste ser limpo
    const oldMeta = doc.getDeveloperMetadata().filter(m => m.getKey() === 'WHITEBOX_CONFIG');
    oldMeta.forEach(m => m.remove());
    Logger.log('ðŸ§¹ Metadados antigos removidos.');

    // 4. Injetar novos metadados (Simulando o fluxo de distribuirMestreParaProfessor)
    const configObj = {
      proxyUrl:    cfg.proxyUrl,
      sharedToken: cfg.sharedToken
    };
    
    doc.addDeveloperMetadata('WHITEBOX_CONFIG', JSON.stringify(configObj));
    Logger.log('âœ… Novos metadados injetados: ' + JSON.stringify(configObj));

    // 5. VerificaÃ§Ã£o de Leitura
    const checkMeta = doc.getDeveloperMetadata().filter(m => m.getKey() === 'WHITEBOX_CONFIG');
    if (checkMeta.length > 0) {
      const valorRecuperado = checkMeta[0].getValue();
      Logger.log('ðŸ” VerificaÃ§Ã£o de Leitura: OK! Valor: ' + valorRecuperado);
      
      if (valorRecuperado === JSON.stringify(configObj)) {
        Logger.log('ðŸ† TESTE SUCESSO: O documento estÃ¡ devidamente preparado para a auto-configuraÃ§Ã£o do Cliente.');
      } else {
        Logger.log('âŒ FALHA: O valor recuperado difere do injetado.');
      }
    } else {
      throw new Error('Falha crÃ­tica: Metadado nÃ£o encontrado apÃ³s a injeÃ§Ã£o.');
    }

  } catch (err) {
    Logger.log('âŒ ERRO NO TESTE: ' + err.toString());
  }
}

==== TestRunner.gs ====
/**
 * =====================================================
 *  Whitebox â€” TestRunner.gs
 *  Testes Manuais das FunÃ§Ãµes CrÃ­ticas
 * =====================================================
 *
 * [LOW-05] Como o GAS nÃ£o suporta frameworks de teste nativos
 * (Jest, Jasmine), este arquivo implementa um runner manual
 * leve que pode ser executado via:
 *   - Apps Script IDE â†’ Executar â†’ selecionar funÃ§Ã£o
 *   - clasp run <nomeDaFunÃ§Ã£o>
 *
 * COMO USAR:
 *   1. Execute runAllTests() para rodar todos os testes
 *   2. Execute funÃ§Ãµes individuais (test_*) para depurar casos especÃ­ficos
 *   3. Verifique o Apps Script Dashboard (ExecuÃ§Ãµes) para ver resultados
 *
 * CONVENÃ‡ÃƒO:
 *   - PASS: FunÃ§Ã£o passou
 *   - FAIL: FunÃ§Ã£o falhou com motivo
 *   - SKIP: DependÃªncia externa ausente (ex: planilha nÃ£o configurada)
 */

// =====================================================
//  RUNNER
// =====================================================

function runAllTests() {
  const results = [];
  const testFunctions = [
    test_validarEmail_valido,
    test_validarEmail_invalido,
    test_validarEmail_vazio,
    test_jsonResponse_comStatus,
    test_jsonResponse_status200,
    test_getProxyConfig_semProps,
    test_construirPromptSocratico_idiomaPtBR,
    test_getOrCreateTargetFolder_naoLancaErro,
    test_calcularHeatmapAluno_emailVazio,
    test_fecharFormulariosVencidos_semTriggerUid,
    test_getConfig_retorno
  ];

  Logger.log('[TestRunner] ========================================');
  Logger.log('[TestRunner] Iniciando suite: ' + testFunctions.length + ' testes');
  Logger.log('[TestRunner] ========================================');

  let passed = 0, failed = 0, skipped = 0;

  for (const fn of testFunctions) {
    const name = fn.name;
    try {
      const result = fn();
      if (result && result.skip) {
        Logger.log('[TestRunner] SKIP  | ' + name + ' | ' + result.reason);
        skipped++;
      } else {
        Logger.log('[TestRunner] PASS  | ' + name);
        passed++;
      }
    } catch (e) {
      Logger.log('[TestRunner] FAIL  | ' + name + ' | ' + e.message);
      failed++;
    }
  }

  Logger.log('[TestRunner] ========================================');
  Logger.log('[TestRunner] Resultado: ' + passed + ' PASS | ' + failed + ' FAIL | ' + skipped + ' SKIP');
  Logger.log('[TestRunner] ========================================');

  if (failed > 0) {
    throw new Error('[TestRunner] ' + failed + ' teste(s) falharam. Verifique os logs.');
  }
}

// =====================================================
//  HELPER: assert simples
// =====================================================

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion falhou');
}

function assertEquals(a, b, msg) {
  if (a !== b) throw new Error((msg || 'assertEquals') + ': esperado=' + b + ' obtido=' + a);
}

// =====================================================
//  TESTES: validarEmail (Utils.gs)
// =====================================================

function test_validarEmail_valido() {
  const result = validarEmail('professor@escola.edu.br');
  assertEquals(result, 'professor@escola.edu.br', 'Email vÃ¡lido deve ser retornado em lowercase');
}

function test_validarEmail_invalido() {
  let lancouErro = false;
  try {
    validarEmail('nao-eh-um-email');
  } catch (e) {
    lancouErro = true;
    assert(e.message.includes('Email invÃ¡lido'), 'Mensagem de erro deve mencionar "Email invÃ¡lido"');
  }
  assert(lancouErro, 'Deveria ter lanÃ§ado Error para email invÃ¡lido');
}

function test_validarEmail_vazio() {
  let lancouErro = false;
  try {
    validarEmail('');
  } catch (e) {
    lancouErro = true;
  }
  assert(lancouErro, 'Deveria ter lanÃ§ado Error para string vazia');
}

// =====================================================
//  TESTES: jsonResponse (BrainProxy.gs)
// =====================================================

function test_jsonResponse_comStatus() {
  const resposta = jsonResponse({ error: 'NOT_FOUND' }, 404);
  const bodyText = resposta.getContent();
  const body     = JSON.parse(bodyText);
  assertEquals(body._httpStatus, 404, 'jsonResponse com 404 deve incluir _httpStatus=404');
  assertEquals(body.error, 'NOT_FOUND', 'jsonResponse deve preservar campos originais');
}

function test_jsonResponse_status200() {
  const resposta = jsonResponse({ success: true }, 200);
  const body     = JSON.parse(resposta.getContent());
  assert(!body._httpStatus, 'jsonResponse com 200 NÃƒO deve incluir _httpStatus');
  assertEquals(body.success, true, 'Campo success deve ser preservado');
}

// =====================================================
//  TESTES: getProxyConfig (whitebox-client)
//  NOTA: Requer acesso Ã  Script Properties â€” roda no contexto do cliente
// =====================================================

function test_getProxyConfig_semProps() {
  // [FIX] Esta funÃ§Ã£o Ã© do whitebox-client. Se estivermos rodando no server, ignorar.
  if (typeof getProxyConfig !== 'function') {
    return { skip: true, reason: 'getProxyConfig() Ã© uma funÃ§Ã£o exclusiva do whitebox-client.' };
  }

  // Verificar que sem props configuradas lanÃ§a erro descritivo
  // (funciona apenas se BRAIN_PROXY_URL e SHARED_TOKEN nÃ£o estiverem definidas)
  const props     = PropertiesService.getScriptProperties();
  const savedUrl  = props.getProperty('BRAIN_PROXY_URL');
  const savedToken = props.getProperty('SHARED_TOKEN');

  if (savedUrl && savedToken) {
    return { skip: true, reason: 'Script Properties jÃ¡ configuradas â€” teste de ausÃªncia pulado.' };
  }

  let lancouErro = false;
  try {
    getProxyConfig();
  } catch (e) {
    lancouErro = true;
    assert(e.message.includes('[Whitebox]'), 'Erro deve ter prefixo [Whitebox]');
  }
  assert(lancouErro, 'getProxyConfig sem props deve lanÃ§ar Error');
}

// =====================================================
//  TESTES: construirPromptSocratico (BrainProxy.gs)
// =====================================================

function test_construirPromptSocratico_idiomaPtBR() {
  const metricas = { editRatio: 0.3, pasteEvents: { count: 2 }, activeFocusTimeMinutes: 15 };
  const prompt   = construirPromptSocratico('Texto de teste do aluno.', metricas);
  assert(typeof prompt === 'string', 'Prompt deve ser string');
  assert(prompt.includes('portuguÃªs brasileiro'), 'Prompt deve conter instruÃ§Ã£o de idioma pt-BR');
  assert(prompt.includes('riskScore'), 'Prompt deve incluir campo riskScore no JSON');
  assert(prompt.includes('suggestedQuestion'), 'Prompt deve incluir campo suggestedQuestion');
}

// =====================================================
//  TESTES: getOrCreateTargetFolder (AdminSetup.gs)
// =====================================================

function test_getOrCreateTargetFolder_naoLancaErro() {
  // Smoke test: garante que a funÃ§Ã£o nÃ£o lanÃ§a exceÃ§Ã£o ao ser chamada
  const folder = getOrCreateTargetFolder();
  assert(folder !== null && folder !== undefined, 'getOrCreateTargetFolder deve retornar um objeto Folder');
  assert(typeof folder.getName === 'function', 'Objeto retornado deve ser um Folder do Drive');
  assertEquals(folder.getName(), 'whitebox', 'Pasta retornada deve se chamar whitebox');
}

// =====================================================
//  TESTES: calcularHeatmapAluno (BrainProxy.gs)
// =====================================================

function test_calcularHeatmapAluno_emailVazio() {
  const result = calcularHeatmapAluno('');
  assert(Array.isArray(result.labels),  'Resultado deve ter labels[]');
  assert(Array.isArray(result.valores), 'Resultado deve ter valores[]');
  assert(Array.isArray(result.alertas), 'Resultado deve ter alertas[]');
  assertEquals(result.labels.length, 0, 'Email vazio deve retornar arrays vazios');
}

// =====================================================
//  TESTES: fecharFormulariosVencidos (FormOnboarding.gs)
// =====================================================

function test_fecharFormulariosVencidos_semTriggerUid() {
  // Deve retornar sem lanÃ§ar exceÃ§Ã£o quando triggerUid estÃ¡ ausente
  // Verifica que o guard [HIGH-05] funciona corretamente
  let lancouErro = false;
  try {
    fecharFormulariosVencidos({}); // e sem triggerUid
  } catch (e) {
    lancouErro = true;
  }
  assert(!lancouErro, 'fecharFormulariosVencidos sem triggerUid NÃƒO deve lanÃ§ar exceÃ§Ã£o â€” deve retornar silenciosamente');
}

// =====================================================
//  TESTES: getConfig (Utils.gs - Server)
// =====================================================

function test_getConfig_retorno() {
  const config = getConfig();
  assert(typeof config === 'object', 'getConfig deve retornar um objeto');
  // Se estiver configurado (em ambiente de prod/dev real), os campos devem existir
  // NÃ£o fazemos assert de valores especÃ­ficos para nÃ£o quebrar em ambientes limpos
}

==== Utils.gs ====
/**
 * =====================================================
 *  Whitebox â€” Utils.gs (UtilitÃ¡rios Compartilhados)
 * =====================================================
 *
 * [ARCH-02] Arquivo utilitÃ¡rio centralizado do whitebox-server.
 * ContÃ©m funÃ§Ãµes de infra-estrutura que eram duplicadas ou dispersas
 * em BrainProxy.gs e AdminSetup.gs.
 *
 * REGRA: Nenhuma lÃ³gica de negÃ³cio aqui. Apenas:
 *   - Constantes e configuraÃ§Ãµes
 *   - ValidaÃ§Ã£o de inputs
 *   - Acesso padronizado a Script Properties
 *   - ConstruÃ§Ã£o de respostas HTTP
 *   - Acesso padronizado Ã  Planilha Global
 */

// Constantes â†’ ver Constants.gs
// [ARCH-03] Todos os literais (abas, props, rotas) foram movidos para Constants.gs.

// =====================================================
//  CONFIGURAÃ‡ÃƒO (Script Properties)
// =====================================================

/**
 * [ARCH-02] LÃª as configuraÃ§Ãµes centrais das Script Properties.
 * ExtraÃ­do de BrainProxy.gs para que qualquer mÃ³dulo possa chamar
 * sem depender do contexto do roteador.
 *
 * @returns {{ sharedToken: string, adminSpreadsheetId: string, geminiGlobalKey: string|null }}
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    sharedToken:        props.getProperty(PROP_SHARED_TOKEN),
    adminSpreadsheetId: props.getProperty(PROP_ADMIN_SPREADSHEET_ID),
    geminiGlobalKey:    props.getProperty(PROP_GEMINI_GLOBAL_KEY) || null,
    proxyUrl:           props.getProperty(PROP_BRAIN_PROXY_URL) || ScriptApp.getService().getUrl()
  };
}

// =====================================================
//  AUTENTICAÃ‡ÃƒO ADMIN
// =====================================================

/**
 * [ARCH-02] Guard de autenticaÃ§Ã£o para funÃ§Ãµes Admin.
 * Chamado via google.script.run pelo Dashboard HTML.
 *
 * @param {string} token - Token passado pelo frontend
 * @throws {Error} Se o token for invÃ¡lido ou ausente
 */
function validateAdminAccess(token) {
  const props  = PropertiesService.getScriptProperties();
  const shared = props.getProperty(PROP_SHARED_TOKEN);
  if (!shared || token !== shared) {
    throw new Error('UNAUTHORIZED: Token Administrativo invÃ¡lido ou ausente.');
  }
}

// =====================================================
//  VALIDAÃ‡ÃƒO DE INPUTS
// =====================================================

/**
 * [MED-06] Valida formato de endereÃ§o de email.
 * LanÃ§a Error descritivo se o email for invÃ¡lido.
 *
 * @param {string} email
 * @returns {string} Email normalizado (trim + lowercase)
 * @throws {Error}
 */
function validarEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email invÃ¡lido: valor nulo ou nÃ£o Ã© string.');
  }
  const trimmed = email.trim().toLowerCase();
  const regex   = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!regex.test(trimmed)) {
    throw new Error('Email invÃ¡lido: "' + email + '". Formato esperado: usuario@dominio.com');
  }
  return trimmed;
}

// =====================================================
//  HTTP: Resposta JSON Padronizada
// =====================================================

/**
 * [CR-02 FIX / ARCH-02] ConstrÃ³i resposta ContentService com cÃ³digo HTTP
 * embutido no corpo (campo _httpStatus) quando diferente de 200.
 *
 * LIMITAÃ‡ÃƒO: ContentService sempre retorna HTTP 200 no Apps Script.
 * O cliente DEVE checar body._httpStatus ou body.error em vez do HTTP status.
 * Ref: https://issuetracker.google.com/issues/36759757
 *
 * @param {object} data - Payload da resposta
 * @param {number} [httpCode=200] - CÃ³digo HTTP lÃ³gico
 */
function jsonResponse(data, httpCode) {
  const statusCode = httpCode || 200;
  const body = (statusCode !== 200)
    ? Object.assign({ _httpStatus: statusCode }, data)
    : data;
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================
//  RATE LIMITING (ProteÃ§Ã£o de Quota)
// =====================================================

/**
 * [ARCH-06] Controle de Cota para evitar abuso da API Gemini.
 * Limita o nÃºmero de anÃ¡lises (tokens) que um aluno pode solicitar ao
 * professor num perÃ­odo determinado.
 * Usa CacheService (Limite configurado: 15 chamadas por hora).
 *
 * @param {string} professorEmail
 * @param {string} alunoEmail
 * @returns {boolean} true se permitido, false se bloqueado por rate limit
 */
function verificarRateLimit(professorEmail, alunoEmail) {
  const cache = CacheService.getScriptCache();
  const rawKey = 'RATELIMIT_' + professorEmail + '_' + alunoEmail;
  const key = rawKey.replace(/[^a-zA-Z0-9_]/g, ''); // Remover chars especiais da chave
  
  let count = 0;
  const cached = cache.get(key);
  if (cached) {
    count = parseInt(cached, 10) || 0;
  }
  
  const LIMITE_POR_HORA = 15;
  if (count >= LIMITE_POR_HORA) {
    Logger.log(`[RateLimit] BLOQUEADO: ${alunoEmail} excedeu cota no professor ${professorEmail} (${count} chamadas).`);
    return false;
  }
  
  cache.put(key, (count + 1).toString(), 3600); // Expira em 1 hora (3600s)
  return true;
}


// =====================================================
//  PLANILHA GLOBAL: Acesso Padronizado
// =====================================================

/**
 * [ARCH-02] Retorna a aba 'Assinaturas' da Planilha Global.
 * Se a aba nÃ£o existir mas a primeira aba tiver header 'Email',
 * usa-a como fallback. Caso contrÃ¡rio, lanÃ§a erro crÃ­tico.
 *
 * @param {string} spreadsheetId
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getPlanilhaGlobal(spreadsheetId) {
  const ss    = SpreadsheetApp.openById(spreadsheetId);
  let sheet   = ss.getSheetByName(SHEET_ASSINATURAS);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    const firstHeader = sheet.getRange('A1').getValue();
    if (firstHeader !== 'Email') {
      throw new Error(
        'CRÃTICO: Aba "' + SHEET_ASSINATURAS + '" nÃ£o encontrada e a primeira aba foi alterada. ' +
        'Os dados podem ter sido perdidos.'
      );
    }
  }
  return sheet;
}

/**
 * [ARCH-02] Busca o registro completo de um professor na Planilha Global.
 * Retorna null se nÃ£o encontrado ou em caso de erro.
 *
 * @param {string} email
 * @param {string} adminSpreadsheetId
 * @returns {{ email, escola, status, usaChaveGlobal, chaveIndividual, spreadsheetId }|null}
 */
function buscarRegistroProfessor(email, adminSpreadsheetId) {
  try {
    const sheet   = getPlanilhaGlobal(adminSpreadsheetId);
    const data    = sheet.getDataRange().getValues();
    const h       = data[0];
    const emailCol  = h.indexOf('Email');
    const escolaCol = h.indexOf('Instituicao');
    const statusCol = h.indexOf('Status');
    const globalCol = h.indexOf('UsaChaveGlobal');
    const chaveCol  = h.indexOf('ChaveIndividual');
    const ssCol     = h.indexOf('SpreadsheetId');

    if (emailCol === -1) {
      throw new Error('Coluna "Email" nÃ£o encontrada na aba Assinaturas.');
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][emailCol] === email) {
        return {
          email:           data[i][emailCol],
          escola:          escolaCol !== -1 ? data[i][escolaCol] : '',
          status:          statusCol !== -1 ? data[i][statusCol] : '',
          usaChaveGlobal:  globalCol !== -1 ? data[i][globalCol] : '',
          chaveIndividual: chaveCol  !== -1 ? data[i][chaveCol]  : '',
          spreadsheetId:   ssCol     !== -1 ? data[i][ssCol]     : ''
        };
      }
    }
    return null;
  } catch (err) {
    Logger.log('[Utils] Erro ao buscar professor "' + email + '": ' + err);
    return null;
  }
}

// =====================================================
//  PARSING: JSON Robusto
// =====================================================

/**
 * [ARCH-02] Extrai um objeto JSON de strings que podem conter Markdown.
 * Tenta 3 estratÃ©gias em cascata antes de lanÃ§ar erro.
 *
 * @param {string} texto - Resposta da IA (pode conter ```json ... ```)
 * @returns {object}
 * @throws {Error} Se nenhuma estratÃ©gia funcionar
 */
function extrairJSON(texto) {
  // 1. Parse direto
  try { return JSON.parse(texto); } catch (e) {}

  // 2. Bloco Markdown: ```json { ... } ``` ou ``` { ... } ```
  const mdMatch = texto.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch && mdMatch[1]) {
    try { return JSON.parse(mdMatch[1].trim()); } catch (e) {}
  }

  // 3. Fallback: primeira ocorrÃªncia de { ... }
  const braceMatch = texto.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch (e) {}
  }

  Logger.log('[Utils] extrairJSON: falhou nas 3 estratÃ©gias. Texto: ' + texto.substring(0, 200));
  throw new Error('NÃ£o foi possÃ­vel extrair um JSON vÃ¡lido da resposta da IA.');
}

// =====================================================
//  FORMATAÃ‡ÃƒO
// =====================================================

/**
 * Retorna a data/hora atual como ISO 8601 (UTC).
 * Centralizado para consistÃªncia nos logs da planilha.
 * @returns {string}
 */
function isoNow() {
  return new Date().toISOString();
}


