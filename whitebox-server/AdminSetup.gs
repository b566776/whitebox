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

  // ---- Aba de Assinaturas (Professores) ----
  const assinaturas = ss.getActiveSheet();
  assinaturas.setName('Assinaturas');
  assinaturas.appendRow([
    'Email', 'Escola', 'Status', 'UsaChaveGlobal', 'ChaveIndividual', 'SpreadsheetId', 'DataCadastro'
  ]);
  assinaturas.getRange('1:1').setFontWeight('bold').setBackground('#1a73e8').setFontColor('#ffffff');

  // ---- Aba de Escolas ----
  const escolas = ss.insertSheet('Escolas');
  escolas.appendRow(['Nome_Escola', 'Total_Professores', 'PlanoGlobal']);
  escolas.getRange('1:1').setFontWeight('bold').setBackground('#188038').setFontColor('#ffffff');

  // ---- Aba de Configurações Globais ----
  const config = ss.insertSheet('Config');
  config.appendRow(['Parametro', 'Valor', 'Descricao']);
  config.getRange('1:1').setFontWeight('bold').setBackground('#444444').setFontColor('#ffffff');
  config.appendRow(['versao_addon', '2.0', 'Versão atual do Add-on Whitebox']);
  config.appendRow(['gemini_model', 'gemini-1.5-flash', 'Modelo Gemini a ser usado']);
  config.appendRow(['chave_global_ativa', 'false', 'Definida via Script Properties (GEMINI_GLOBAL_KEY)']);
  config.appendRow(['seed_document_id', '', 'ID do Google Doc que serve de modelo (Semente)']);

  const url = ss.getUrl();
  const id  = ss.getId();

  Logger.log('=================================================');
  Logger.log('✅ Planilha Global criada com sucesso!');
  Logger.log('📊 URL: ' + url);
  Logger.log('🔑 ID (salve em Script Properties como ADMIN_SPREADSHEET_ID): ' + id);
  Logger.log('=================================================');

  // Retornar dados para fácil consulta
  return { id: id, url: url };
}

/**
 * Adiciona um professor manualmente à planilha global (para uso via painel)
 */
function adicionarProfessor(email, escola, usaChaveGlobal) {
  const cfg   = getConfig();
  const sheet = getPlanilhaGlobal(cfg.adminSpreadsheetId);
  sheet.appendRow([
    email,
    escola || 'Não informada',
    'Ativo',
    usaChaveGlobal ? 'Sim' : 'Não',
    '',            // ChaveIndividual (será preenchida pelo próprio professor)
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
