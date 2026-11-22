/**
 * =======================================================
 *  Whitebox — Add-on Wrapper (Código.gs)
 *  Este script é vinculado ao documento e chama a biblioteca WhiteboxLib.
 * 
 *  IMPORTANTE: No console do Apps Script, a biblioteca DEVE ser 
 *  vinculada com o identificador: WhiteboxLib
 * =======================================================
 */

function onOpen(e) { 
  try { 
    WhiteboxLib.start(e); 
  } catch(err) { 
    fallbackMenu(); 
  } 
}

// Não há conexão a configurar: a URL do servidor é fixa na biblioteca
// (BRAIN_PROXY_URL em whitebox-lib/Constants.gs).

function onInstall(e) { onOpen(e); }

function showSidebar() { 
  try { 
    WhiteboxLib.showSidebar(); 
  } catch(err) { 
    fallbackSidebar(); 
  } 
}

function openQuizModal(quizData) {
  try {
    WhiteboxLib.openQuizModal(quizData);
  } catch(err) {
    DocumentApp.getUi().alert('Erro ao abrir o quiz: ' + err);
  }
}

/**
 * [DYNAMIC DISPATCHER] 
 * Encaminha chamadas da Sidebar (google.script.run) para a Biblioteca.
 */
function callLibrary(funcName, args) {
  try {
    if (typeof WhiteboxLib[funcName] !== 'function') {
      throw new Error('Função "' + funcName + '" não existe na biblioteca.');
    }
    return WhiteboxLib[funcName].apply(null, args);
  } catch (e) {
    Logger.log('[Whitebox-Wrapper] Erro no Dispatcher: ' + e);
    return { error: 'LIB_CALL_FAILED', message: e.toString() };
  }
}

// =====================================================
//  CAMADA DE COMPATIBILIDADE [LEGACY] 
//  Encaminha chamadas antigas da Sidebar para a Lib.
//  Novos componentes devem usar callLibrary diretamente.
// =====================================================
function getContext() {
  var ctx = callLibrary('getContext', []);
  // Aluno numa cópia distribuída: liga a abertura automática do painel nas próximas aberturas.
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

// =====================================================
//  ABERTURA AUTOMÁTICA DO PAINEL (Aluno)
//  O onOpen simples não pode abrir a sidebar (roda sem autorização). Depois que o aluno
//  autoriza e abre o painel pela primeira vez, getContext cria um gatilho instalável
//  "ao abrir" em nome dele. O handler precisa estar aqui no cliente: é o script do documento
//  que recebe o gatilho, não a biblioteca.
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
    Logger.log('[Whitebox-Wrapper] Não foi possível criar a abertura automática: ' + err);
    return false;
  }
}

/**
 * Handler do gatilho instalável. Ele roda em nome de quem o criou (o aluno), mas dispara para
 * qualquer editor que abra o documento, inclusive o professor corrigindo a cópia. Só abre o
 * painel quando quem abriu é o próprio aluno: para outra pessoa, getActiveUser() vem vazio
 * ou com outro e-mail. Nunca lança, porque falha em gatilho gera e-mail de erro para o aluno.
 */
function abrirPainelAutomaticamente(e) {
  try {
    var quemAbriu = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    var dono      = (Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
    if (!quemAbriu || quemAbriu !== dono) return false;
    showSidebar();
    return true;
  } catch (err) {
    Logger.log('[Whitebox-Wrapper] Abertura automática falhou: ' + err);
    return false;
  }
}

// =====================================================
//  FALLBACKS (Resiliência Offline)
// =====================================================

function fallbackMenu() { 
  DocumentApp.getUi()
    .createMenu('Whitebox (Offline)')
    .addItem('Abrir Painel Offline', 'fallbackSidebar')
    .addToUi(); 
}

function fallbackSidebar() { 
  const html = `
    <div style="font-family:sans-serif; padding:20px; color:#444;">
      <h3 style="color:#ef4444;">Whitebox Offline</h3>
      <p>A biblioteca central não pôde ser carregada.</p>
      <hr>
      <p><b>Causas comuns:</b></p>
      <ul>
        <li>Sem conexão com a internet</li>
        <li>Biblioteca não vinculada corretamente</li>
        <li>Limite de cota do Google Apps Script</li>
      </ul>
      <p>Tente recarregar o documento.</p>
    </div>
  `;
  const ui = HtmlService.createHtmlOutput(html).setTitle('Whitebox Offline');
  DocumentApp.getUi().showSidebar(ui);
}
