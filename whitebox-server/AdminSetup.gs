/**
 * ========================================================
 *  Whitebox - Setup da Planilha Global do Administrador
 * ========================================================
 * COMO USAR O AUTO-PROVISIONAMENTO:
 * 1. O código do BrainProxy.gs possui a rota doGet() embutida.
 * 2. Após publicar o projeto como um Web App (App da Web), visite a URL do Web App no seu navegador.
 * 3. O próprio proxy detectará a primeira execução e chamará a setupPlanilhaGlobal() automaticamente,
 *    criando o banco no seu Drive e salvando a propriedade ADMIN_SPREADSHEET_ID no Script sozinho.
 * 4. Ele também irá gerar automaticamente um SHARED_TOKEN seguro e exibir na sua tela!
 */

function setupPlanilhaGlobal() {
  const ss = SpreadsheetApp.create('Whitebox - Painel Global Admin');
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(ss.getId()).moveTo(targetFolder);


  // ---- Aba de Assinaturas (Professores) ----
  let assinaturas = ss.getSheets()[0];
  assinaturas.setName('Assinaturas');
  assinaturas.appendRow([
    'Email', 'Instituicao', 'Status', 'UsaChaveGlobal', 'ChaveIndividual', 'SpreadsheetId', 'DataCadastro'
  ]);
  assinaturas.getRange('1:1').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');

  // ---- Aba de Tarefas Globais (Visão Admin) ----
  let tarefas = ss.insertSheet('Tarefas_Globais');
  tarefas.appendRow(['ID_Tarefa', 'Professor', 'Instituicao', 'Titulo', 'Course_ID', 'Data_Criacao']);
  tarefas.getRange('1:1').setFontWeight('bold').setBackground('#8e24aa').setFontColor('#ffffff');

  // ---- Aba de Heatmap & Rankings (Visão Admin) ----
  let rankings = ss.insertSheet('Ranking_Instituicao');
  rankings.appendRow(['Instituicao', 'Total_Professores', 'Total_Alunos', 'Media_Autonomia_IA', 'Ultima_Atualizacao']);
  rankings.getRange('1:1').setFontWeight('bold').setBackground('#f59e0b').setFontColor('#ffffff');

  // ---- Aba de Configurações Globais ----
  let config = ss.getSheetByName('Config') || ss.insertSheet('Config');
  config.appendRow(['Parametro', 'Valor', 'Descricao']);
  config.getRange('1:1').setFontWeight('bold').setBackground('#444444').setFontColor('#ffffff');
  config.appendRow(['versao_addon', '2.1', 'Versão com Integração Classroom']);
  config.appendRow(['gemini_model', 'gemini-1.5-flash', 'Modelo Gemini']);
  config.appendRow(['seed_document_id', '', 'Doc Semente Master']);

  return { id: ss.getId(), url: ss.getUrl() };
}

/**
 * Cria a planilha individual de um professor onde ele terá autonomia de IA e logs locais.
 */
function criarPlanilhaProfessor(email, instituicao) {
  const ss = SpreadsheetApp.create('Whitebox - Log Professor (' + email + ')');
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(ss.getId()).moveTo(targetFolder);


  // 1. Aba de Configuração Pedagógica (Autonomia da IA)
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

  // Dar permissão ao professor
  ss.addEditor(email);

  return ss.getId();
}
/**
 * Adiciona um professor manualmente à planilha global (para uso via painel ou form)
 */
function adicionarProfessor(email, escola, usaChaveGlobal, chaveIndividual = '') {
  const cfg   = getConfig();
  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  sheet.appendRow([
    email,
    escola || 'Não informada',
    'Ativo',
    usaChaveGlobal ? 'Sim' : 'Não',
    chaveIndividual, // ChaveIndividual (ID do Cofre Drive)
    '',            // SpreadsheetId (será criado automaticamente)
    new Date().toISOString()
  ]);
  Logger.log('[Admin] Professor adicionado: ' + email);
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
 * Conceder ou revogar acesso à Chave Global para um professor
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
      sheet.getRange(i + 1, globalCol + 1).setValue(usar ? 'Sim' : 'Não');
      Logger.log('[Admin] Acesso à chave global para ' + email + ': ' + (usar ? 'Concedido' : 'Revogado'));
      return true;
    }
  }
  return false;
}

/**
 * Utilitário: Garante a criação ou navegação para a pasta raiz do projeto.
 * Caminho: Meu Drive -> GDrive Meus Documentos -> Projetos -> whitebox
 */
function getOrCreateTargetFolder() {
  const path = ["GDrive Meus Documentos", "Projetos", "whitebox"];
  let folder = DriveApp.getRootFolder();
  
  for (let i = 0; i < path.length; i++) {
    const targetName = path[i].toLowerCase().trim();
    const folders = folder.getFolders();
    let found = false;
    
    while (folders.hasNext()) {
      const f = folders.next();
      if (f.getName().toLowerCase().trim() === targetName) {
        folder = f;
        found = true;
        break;
      }
    }
    
    if (!found) {
      folder = folder.createFolder(path[i]);
    }
  }
  return folder;
}
