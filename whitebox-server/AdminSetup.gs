/**
 * ========================================================
 *  Whitebox - Setup da Planilha Global do Administrador
 * ========================================================
 * PROVISIONAMENTO (manual, uma vez por servidor). Não há auto-provisionamento:
 * enquanto ADMIN_SPREADSHEET_ID não existir, o doGet() responde "Whitebox não provisionado".
 * 1. No Editor do Apps Script, execute resetPlanilhaGlobal(): chama setupPlanilhaGlobal(),
 *    grava ADMIN_SPREADSHEET_ID e aplica o schema. Sem planilha vinculada, nada é apagado.
 * 2. Execute rotacionarSharedToken() para gerar o SHARED_TOKEN do Dashboard.
 * 3. Leia o SHARED_TOKEN em Configurações do projeto → Propriedades do script e abra a URL do Web App.
 * setupPlanilhaGlobal() sozinha só cria a planilha; não grava a propriedade nem o token.
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
  config.appendRow(['VersaoSchema',    SCHEMA_VERSION_ATUAL,  'Versão do schema da Planilha Global (ARCH-05)']);
  config.appendRow(['versao_addon',    '2.1',                 'Versão com Integração Classroom']);
  config.appendRow(['seed_document_id', '',                   'Doc Semente Master']);

  return { id: ss.getId(), url: ss.getUrl() };
}

/**
 * ⚠️ OPERAÇÃO DESTRUTIVA — Regenera a Planilha Global do Admin.
 *
 * Fluxo de segurança:
 *  1. Faz backup do ID antigo em ADMIN_SPREADSHEET_ID_BACKUP
 *  2. Remove ADMIN_SPREADSHEET_ID das Script Properties
 *  3. Chama setupPlanilhaGlobal() para criar uma nova planilha
 *  4. Registra o novo ID e retorna as informações
 *
 * ⚠️ TODOS OS DADOS DA PLANILHA ANTIGA (professores, logs, rankings)
 *    serão perdidos. A planilha antiga NÃO é excluída do Drive —
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

  // 2. Remover o ID atual para forçar nova criação
  props.deleteProperty(PROP_ADMIN_SPREADSHEET_ID);
  Logger.log('[AdminSetup] ADMIN_SPREADSHEET_ID removido. Iniciando re-provisionamento...');

  // 3. Criar nova planilha
  const result = setupPlanilhaGlobal();

  // 4. Registrar novo ID e executar migração de schema
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
 * Gera um novo SHARED_TOKEN (credencial exclusiva do Admin) e invalida o anterior.
 * Executar manualmente no Editor do Apps Script. O valor não é logado: leia-o em
 * Configurações do projeto → Propriedades do script e informe-o no Dashboard.
 */
function rotacionarSharedToken() {
  PropertiesService.getScriptProperties()
    .setProperty(PROP_SHARED_TOKEN, TOKEN_PREFIX + Utilities.getUuid());
  Logger.log('[AdminSetup] SHARED_TOKEN rotacionado. O token anterior não é mais aceito.');
}

/**
 * Cria a planilha individual de um professor onde ele terá autonomia de IA e logs locais.
 */
function criarPlanilhaProfessor(email, instituicao) {
  const ss = SpreadsheetApp.create('Whitebox - Log Professor (' + email + ')');
  const targetFolder = getOrCreateTargetFolder();
  DriveApp.getFileById(ss.getId()).moveTo(targetFolder);
  Logger.log('[AdminSetup] Planilha do professor criada: ' + email + ' | ID: ' + ss.getId());

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
 * Pasta "WhiteBox" na raiz do Meu Drive de quem executa o servidor. Tudo que o
 * Whitebox cria (planilha global, planilhas de logs, formulários, documentos) fica nela.
 */
function getOrCreateTargetFolder() {
  return _getOrCreateSubpasta(DriveApp.getRootFolder(), DRIVE_ROOT_FOLDER_NAME);
}

/** Subpasta "WhiteBox/Scripts", com os projetos de script do servidor e da biblioteca. */
function getOrCreateScriptsFolder() {
  return _getOrCreateSubpasta(getOrCreateTargetFolder(), DRIVE_SCRIPTS_FOLDER_NAME);
}

/**
 * Subpasta de `pai` com exatamente esse nome, ou null. A busca do Drive não
 * diferencia maiúsculas, então "whitebox" e "WhiteBox" precisam ser filtradas aqui.
 * @private
 */
function _subpastaExata(pai, nome) {
  const it = pai.getFoldersByName(nome);
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName() === nome) return f;
  }
  return null;
}

/** @private */
function _getOrCreateSubpasta(pai, nome) {
  const existente = _subpastaExata(pai, nome);
  if (existente) return existente;
  Logger.log('[AdminSetup] Pasta criada: ' + nome);
  return pai.createFolder(nome);
}

/**
 * Migração única: põe sob "WhiteBox" o que o Whitebox criou antes desta organização.
 * Executar no editor do servidor. Pode ser repetida sem efeito colateral.
 *  - conteúdo da pasta antiga (DRIVE_PASTA_ANTIGA) e de pastas "whitebox" soltas na raiz;
 *  - planilha global, planilhas de logs dos professores, formulário e documento semente;
 *  - formulários de onboarding e documentos "Modelo Mestre" desta conta;
 *  - projetos de script do servidor e da biblioteca, em "WhiteBox/Scripts".
 * Também reaplica o texto de ajuda nos formulários de onboarding.
 * Nada é apagado: pastas antigas vazias ficam onde estão.
 * @returns {{movidos: string[], formulariosAtualizados: number}}
 */
function organizarPastasWhitebox() {
  const root    = getOrCreateTargetFolder();
  const scripts = getOrCreateScriptsFolder();
  const movidos = [];

  const mover = function(id, destino) {
    if (!id) return;
    try {
      const file = DriveApp.getFileById(id);
      const pais = file.getParents();
      while (pais.hasNext()) {
        if (pais.next().getId() === destino.getId()) return; // já está no lugar
      }
      file.moveTo(destino);
      movidos.push(file.getName());
    } catch (err) {
      Logger.log('[AdminSetup] Não foi possível mover ' + id + ': ' + err);
    }
  };

  // 1. Pastas antigas: o caminho aninhado (pode haver pastas repetidas com o mesmo
  //    nome em cada nível, então seguimos todas) e pastas "whitebox" soltas na raiz
  let antigas = [DriveApp.getRootFolder()];
  DRIVE_PASTA_ANTIGA.forEach(function(nome) {
    const proximas = [];
    antigas.forEach(function(pai) {
      const it = pai.getFoldersByName(nome);
      while (it.hasNext()) {
        const f = it.next();
        if (f.getName() === nome) proximas.push(f);
      }
    });
    antigas = proximas;
  });
  const naRaiz = DriveApp.getRootFolder().getFoldersByName(DRIVE_ROOT_FOLDER_NAME);
  while (naRaiz.hasNext()) {
    const f = naRaiz.next();
    if (f.getId() !== root.getId()) antigas.push(f);
  }
  antigas.forEach(function(antiga) { _mesclarPasta(antiga, root, movidos); });

  // 2. Arquivos conhecidos pelo ID
  const cfg = getConfig();
  mover(cfg.adminSpreadsheetId, root);
  try {
    const data = getPlanilhaGlobal(cfg.adminSpreadsheetId).getDataRange().getValues();
    const col  = data[0].indexOf('SpreadsheetId');
    for (let r = 1; col >= 0 && r < data.length; r++) mover(String(data[r][col] || '').trim(), root);
    const configTab = SpreadsheetApp.openById(cfg.adminSpreadsheetId).getSheetByName('Config');
    const conf = configTab ? configTab.getDataRange().getValues() : [];
    for (let r = 1; r < conf.length; r++) {
      if (conf[r][0] === 'seed_form_id' || conf[r][0] === 'seed_document_id') {
        mover(String(conf[r][1] || '').trim(), root);
      }
    }
  } catch (err) {
    Logger.log('[AdminSetup] Planilha global indisponível para a migração: ' + err);
  }

  // 3. Arquivos achados pelo nome (formulários de onboarding, modelos mestre, logs antigos)
  ["mimeType = 'application/vnd.google-apps.form' and title contains 'Whitebox - Onboarding'",
   "title contains 'Whitebox - Modelo Mestre'",
   "title contains 'Whitebox - Log Professor'"
  ].forEach(function(q) {
    const it = DriveApp.searchFiles(q + " and 'me' in owners and trashed = false");
    while (it.hasNext()) mover(it.next().getId(), root);
  });

  // 4. Projetos de script standalone (o cliente é vinculado ao documento modelo e não é um arquivo à parte)
  mover(ScriptApp.getScriptId(), scripts);
  mover(WHITEBOX_LIB_SCRIPT_ID, scripts);

  const formulariosAtualizados = atualizarAjudaFormulariosOnboarding();
  Logger.log('[AdminSetup] Migração concluída. Movidos (' + movidos.length + '): ' + movidos.join(', ') +
             ' | Formulários atualizados: ' + formulariosAtualizados);
  return { movidos: movidos, formulariosAtualizados: formulariosAtualizados };
}

/**
 * Move o conteúdo de `origem` para `destino`. Uma subpasta que já exista no destino
 * com o mesmo nome é mesclada em vez de duplicada.
 * @private
 */
function _mesclarPasta(origem, destino, movidos) {
  const arquivos = origem.getFiles();
  while (arquivos.hasNext()) {
    const f = arquivos.next();
    f.moveTo(destino);
    movidos.push(f.getName());
  }
  const pastas = origem.getFolders();
  while (pastas.hasNext()) {
    const sub = pastas.next();
    const existente = _subpastaExata(destino, sub.getName());
    if (existente) {
      _mesclarPasta(sub, existente, movidos);
    } else {
      sub.moveTo(destino);
      movidos.push(sub.getName() + '/');
    }
  }
}
