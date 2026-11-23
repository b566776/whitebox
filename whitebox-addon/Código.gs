/**
 * =======================================================
 *  Whitebox — Add-on do Editor de Documentos (Código.gs)
 *
 *  Mesmo painel do script vinculado (whitebox-client), mas publicado como add-on:
 *  o código fica num projeto só, que o aluno não copia nem edita. É o modo 'addon' das
 *  escolas (aba Escolas da Planilha Global, ver whitebox-server/Escolas.gs). O servidor
 *  reconhece o add-on pelo ID de cliente OAuth do token (Script Property ADDON_CLIENT_IDS).
 *
 *  Escopos: os mesmos do cliente, nenhum restrito (teste whitebox-lib/tests/escopos.test.js).
 *  Publicação: ver whitebox-addon/PUBLICACAO.md.
 *
 *  A biblioteca DEVE ser vinculada com o identificador WhiteboxLib.
 * =======================================================
 */

/**
 * onOpen roda em AuthMode.NONE quando o add-on está instalado mas ainda não foi usado
 * neste documento: nesse modo não dá para chamar a biblioteca. O menu é montado aqui.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Abrir painel', 'showSidebar')
    .addItem('Conferir conexão', 'conferirConexao')
    .addToUi();
}

/**
 * Passo 7 do guia (PUBLICACAO.md): mostra o ID de cliente OAuth que o servidor recebeu
 * deste add-on e se ele já está em ADDON_CLIENT_IDS. Um clique, sem abrir o painel.
 */
function conferirConexao() {
  var ui = DocumentApp.getUi();
  ui.alert('Whitebox: conferir conexão', textoConferencia(callLibrary('conferirConexaoAddon', [])), ui.ButtonSet.OK);
}

/** Texto do alerta de conferirConexao (separado para teste). */
function textoConferencia(r) {
  if (!r || r.error || !r.ok) {
    return 'O servidor não respondeu: ' + ((r && (r.message || r.error)) || 'sem resposta') + '.';
  }
  var linhas = ['Conta: ' + (r.email || '?'), 'ID de cliente OAuth: ' + (r.clientId || '(vazio)'), ''];
  if (r.origem === 'addon') {
    linhas.push('OK: este ID está em ADDON_CLIENT_IDS. O servidor reconhece o add-on.');
  } else if (!r.idsConfigurados) {
    linhas.push('ADDON_CLIENT_IDS ainda não está configurado no servidor. Copie o ID acima para essa Script Property.');
  } else {
    linhas.push('Este ID NÃO está em ADDON_CLIENT_IDS. Acrescente-o (separado por vírgula) antes de pôr a escola em modo addon.');
  }
  return linhas.join('\n');
}

function onInstall(e) { onOpen(e); }

function showSidebar() {
  try {
    WhiteboxLib.showSidebar();
  } catch (err) {
    fallbackSidebar();
  }
}

function openQuizModal(quizData) {
  try {
    WhiteboxLib.openQuizModal(quizData);
  } catch (err) {
    DocumentApp.getUi().alert('Erro ao abrir o quiz: ' + err);
  }
}

/** Encaminha chamadas da Sidebar (google.script.run) para a biblioteca. */
function callLibrary(funcName, args) {
  try {
    if (typeof WhiteboxLib[funcName] !== 'function') {
      throw new Error('Função "' + funcName + '" não existe na biblioteca.');
    }
    return WhiteboxLib[funcName].apply(null, args);
  } catch (e) {
    Logger.log('[Whitebox-Addon] Erro no Dispatcher: ' + e);
    return { error: 'LIB_CALL_FAILED', message: e.toString() };
  }
}

/**
 * No add-on o painel aparece em qualquer documento, não só nas atividades do Whitebox.
 * { addon: true } faz a biblioteca devolver o papel 'fora' num documento sem designação
 * para quem não é professor cadastrado: o painel mostra só um aviso e não registra nada.
 */
function getContext() {
  var ctx = callLibrary('getContext', [{ addon: true }]);
  if (ctx && ctx.initialRole === 'student' && ctx.debugInfo && ctx.debugInfo.hasDesignation) {
    garantirAberturaAutomatica();
  }
  return ctx;
}
function getDocumentStats() { return callLibrary('getDocumentStats', []); }
function getSelectedTextInfo() { return callLibrary('getSelectedTextInfo', []); }
function sendToBackend(p) { return callLibrary('sendToBackend', [p]); }
function getDocumentAuraMap() { return callLibrary('getDocumentAuraMap', []); }
function scrollToParagraph(i) { return callLibrary('scrollToParagraph', [i]); }
function validateSourceReliability(u) { return callLibrary('validateSourceReliability', [u]); }
function saveTeacherApiKey(k) { return callLibrary('saveTeacherApiKey', [k]); }
function getTeacherLicenseStatus() { return callLibrary('getTeacherLicenseStatus', []); }
function listarTurmasProfessor() { return callLibrary('listarTurmasProfessor', []); }
function criarLevaTemplate(p) { return callLibrary('criarLevaTemplate', [p]); }
function getActiveDocInfo() { return callLibrary('getActiveDocInfo', []); }
function getStudentQuiz() { return callLibrary('getStudentQuiz', []); }
function submitStudentQuizAnswers(a) { return callLibrary('submitStudentQuizAnswers', [a]); }
function markAsSubmitted() { return callLibrary('markAsSubmitted', []); }
function statusDistribuicao(id) { return callLibrary('statusDistribuicao', [id]); }
function getSubmissionStatus() { return callLibrary('getSubmissionStatus', []); }
function updatePasteMap(idx) { return callLibrary('updatePasteMap', [idx]); }
function submitFinalQuiz(q, o) { return callLibrary('submitFinalQuiz', [q, o]); }
function getStudentEmail() { return callLibrary('getStudentEmail', []); }
function getProcessReport() { return callLibrary('getProcessReport', []); }
function compartilharComServidor() { return callLibrary('compartilharComServidor', []); }

// =====================================================
//  ABERTURA AUTOMÁTICA DO PAINEL (Aluno)
//  Igual ao cliente: um gatilho instalável "ao abrir" por documento, criado na primeira
//  vez que o aluno abre o painel. Add-ons podem ter um gatilho de cada tipo por usuário e
//  documento, o que basta aqui.
// =====================================================

var HANDLER_ABERTURA_AUTOMATICA = 'abrirPainelAutomaticamente';

/** Cria o gatilho onOpen deste usuário neste documento, se ainda não existir. Nunca lança. */
function garantirAberturaAutomatica() {
  try {
    var doc = DocumentApp.getActiveDocument();
    var existentes = ScriptApp.getUserTriggers(doc);
    for (var i = 0; i < existentes.length; i++) {
      if (existentes[i].getHandlerFunction() === HANDLER_ABERTURA_AUTOMATICA) return false;
    }
    ScriptApp.newTrigger(HANDLER_ABERTURA_AUTOMATICA).forDocument(doc).onOpen().create();
    return true;
  } catch (err) {
    Logger.log('[Whitebox-Addon] Não foi possível criar a abertura automática: ' + err);
    return false;
  }
}

/** Só abre para o próprio aluno que criou o gatilho (ver whitebox-client/Código.gs). */
function abrirPainelAutomaticamente(e) {
  try {
    var quemAbriu = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    var dono      = (Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
    if (!quemAbriu || quemAbriu !== dono) return false;
    try {
      WhiteboxLib.showSidebar({ automatico: true });
    } catch (libErr) {
      fallbackSidebar();
    }
    return true;
  } catch (err) {
    Logger.log('[Whitebox-Addon] Abertura automática falhou: ' + err);
    return false;
  }
}

function fallbackSidebar() {
  var html =
    '<div style="font-family:sans-serif; padding:20px; color:#444;">' +
    '<h3 style="color:#ef4444;">Whitebox indisponível</h3>' +
    '<p>A biblioteca do Whitebox não pôde ser carregada.</p>' +
    '<p><b>Causas comuns:</b></p><ul>' +
    '<li>Mais de uma conta Google conectada neste navegador: abra o documento numa janela anônima só com a conta da escola</li>' +
    '<li>Sem conexão com a internet</li>' +
    '<li>Limite de cota do Google Apps Script</li></ul>' +
    '<p>Tente recarregar o documento.</p></div>';
  DocumentApp.getUi().showSidebar(HtmlService.createHtmlOutput(html).setTitle('Whitebox'));
}
