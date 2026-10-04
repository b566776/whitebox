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
function getContext() { return callLibrary('getContext', []); }
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
