/**
 * Ao abrir o documento, adiciona o menu do Add-on EvidencIA.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createMenu('EvidencIA')
    .addItem('Abrir Painel EvidencIA', 'showSidebar')
    .addToUi();
}

/**
 * Instalação do Add-on.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Abre a barra lateral (Sidebar.html).
 */
function showSidebar() {
  const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('EvidencIA')
    .setWidth(300);
  DocumentApp.getUi().showSidebar(ui);
}

/**
 * Abre o modal de edição de Quiz.
 */
function openQuizModal(quizData) {
  const template = HtmlService.createTemplateFromFile('QuizEditor');
  template.quizData = quizData;
  
  const html = template.evaluate()
    .setWidth(600)
    .setHeight(500);
    
  DocumentApp.getUi().showModalDialog(html, 'Revisão Pedagógica - Quiz');
}

/**
 * Recebe o quiz final e envia para o backend / salva no estado do aluno.
 */
function submitFinalQuiz(quizData) {
  Logger.log("Quiz Finalizado pelo Professor:");
  Logger.log(JSON.stringify(quizData, null, 2));
  
  // Aqui você enviaria para o endpoint real de persistência
  // google.script.run.sendToBackend({ type: 'QUIZ_SUBMIT', data: quizData });
  
  return { success: true };
}

/**
 * Retorna o contexto atual com base no usuário logado e outras informações.
 */
function getContext() {
  const doc = DocumentApp.getActiveDocument();
  const userEmail = Session.getActiveUser().getEmail();
  
  // Para mock / POC, vamos assumir que o professor é o criador do arquivo. 
  // Na ausência desta informação via DocumentApp basico sem Drive API avançada:
  // Decidiremos via um fallback estático, ou melhor, a Sidebar pode ter uma opção MOCK.
  // Vamos retornar algumas infos mockadas.
  
  // Chamada única do Item 3 para não estourar a cota de 20.000 requisições/dia da API do Google, a leitura é feita no carregamento.
  const item3Data = getAdvancedItem3Data();
  
  return {
    email: userEmail,
    docId: doc.getId(),
    initialRole: 'student', 
    timestamp: new Date().getTime(),
    item3: item3Data
  };
}

/**
 * Retorna um resumo do texto atual e tamanho do documento.
 * Usado pelo Aluno para o "debounce" de salvamento de metadados.
 */
function getDocumentStats() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const text = body.getText();
  
  return {
    docId: doc.getId(),
    length: text.length,
    wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
    fullTextChunk: text.substring(0, 1000) // Mandando um pedaço ou tudo para análise mockada
  };
}

/**
 * Pega o trecho de texto selecionado pelo professor.
 */
function getSelectedTextInfo() {
  const doc = DocumentApp.getActiveDocument();
  const selection = doc.getSelection();
  
  if (!selection) {
    return { selectedFragment: null, error: "Nenhum texto selecionado." };
  }
  
  const elements = selection.getRangeElements();
  let selectedText = "";
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.getElement().editAsText) {
      const textElement = element.getElement().editAsText();
      const text = textElement.getText();
      const start = element.isPartial() ? element.getStartOffset() : 0;
      const end = element.isPartial() ? element.getEndOffsetInclusive() : text.length - 1;
      selectedText += text.substring(start, end + 1) + "\n";
    }
  }
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = selectedText.match(urlRegex) || [];
  
  return { 
    selectedFragment: selectedText.trim(), 
    detectedUrls: urls.slice(0, 3), // Limite de 3 para performance
    success: true 
  };
}

/**
 * Valida a confiabilidade de uma fonte (URL) baseada em domínio e disponibilidade.
 */
function validateSourceReliability(url) {
  let isReliable = false;
  let status = "ACTIVE";
  let message = "Fonte externa detectada.";
  
  // Lógica similar ao modo aluno + extensões
  const reliableDomains = ['.edu', '.gov', '.org', 'scielo', 'google.scholar', 'usp.br', 'capes.gov.br'];
  const lowercaseUrl = url.toLowerCase();
  
  if (reliableDomains.some(domain => lowercaseUrl.includes(domain))) {
    isReliable = true;
    message = "Fonte Confiável (Acadêmica/Institucional).";
  } else {
    message = "Atenção: Esta fonte pode não ser acadêmica.";
  }
  
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const code = response.getResponseCode();
    if (code >= 400) {
      status = "BROKEN";
      message = "Link quebrado ou inacessível (Status " + code + ").";
    }
  } catch (e) {
    status = "ERROR";
    message = "Erro ao acessar a URL.";
  }
  
  return {
    url: url,
    isReliable: isReliable,
    status: status,
    message: message
  };
}

/**
 * Envia o payload final do metadado da "Caixa-Preta" para o Backend (API).
 * Como solicitado, estamos operando com MOCK neste momento.
 */
function sendToBackend(payload) {
  Logger.log("Payload recebido pelo Google Apps Script:");
  Logger.log(JSON.stringify(payload, null, 2));
  
  // Endpoints Reais (cliv.app)
  const metricUrl = "https://triagem.cliv.app/api/send"; 
  const analysisUrl = "https://triagem.cliv.app/api/fake";
  
  const isAnalysisRequest = payload.contentAnalysis && payload.contentAnalysis.selectedFragment;
  const targetUrl = isAnalysisRequest ? analysisUrl : metricUrl;
  
  // MOCK DE RESPOSTA (Simulando o processamento do Dev 2 e NLP/GPT)
  // Dependendo de se tem fragmento selecionado, simularemos um problema de "mudança de tom".
  
  // POST para o backend selecionado
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(targetUrl, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log("Erro na API (" + targetUrl + "): " + response.getContentText());
      // Fallback para mock em caso de erro na API de homologação para não travar a UI?
      // Por enquanto vamos retornar o erro ou o mock se for 404/500
    }
  } catch (e) {
    Logger.log("Falha na conexão com " + targetUrl + ": " + e.toString());
  }

  Utilities.sleep(1000); // Pequeno delay para feedback visual
  
  let riskEvidence = "Nenhum risco detectado. O texto flui de forma natural.";
  let pedagogicalAdvice = "Continue encorajando a busca profunda por fontes diversas.";
  let toneChangeDetected = false;
  let quizData = [];
  
  if (payload.contentAnalysis && payload.contentAnalysis.selectedFragment) {
    toneChangeDetected = true;
    riskEvidence = "Mudança de tom detectada no trecho: possível vocabulário complexo repentino.";
    pedagogicalAdvice = "Pergunte ao aluno como ele estruturou este parágrafo ou se ele usou alguma ferramenta para ajudar.";
    quizData = [
      {
        question: "Com base no trecho, qual o principal argumento apresentado?",
        options: ["Foco em tecnologia", "Impacto social", "Ausência de evidências"],
        answer: 0
      }
    ];
  }
  
  // Se for aluno colando massivamente
  if (payload.behavioralMetrics && payload.behavioralMetrics.pasteEvents && payload.behavioralMetrics.pasteEvents.massiveInsertionsDetected) {
     riskEvidence = "Foi detectada uma inserção massiva (copy-paste de bloco longo).";
  }
  
  // Simulação de análise de fontes se houver URLs
  let sourceAnalysis = [];
  if (payload.contentAnalysis && payload.contentAnalysis.detectedUrls) {
    sourceAnalysis = payload.contentAnalysis.detectedUrls.map(url => validateSourceReliability(url));
  }
  
  return {
    status: 200,
    toneChangeDetected: toneChangeDetected,
    riskEvidence: riskEvidence,
    pedagogicalAdvice: pedagogicalAdvice,
    quizData: quizData,
    quizStatus: toneChangeDetected ? "AVAILABLE" : "NONE",
    sourceAnalysis: sourceAnalysis
  };
}

/**
 * ITEM 3 (Extração via APIs Avançadas Workspace)
 * Gera metadados de contexto do aluno e histórico de revisões que o Docs nativo não entrega.
 */
function getAdvancedItem3Data() {
  const doc = DocumentApp.getActiveDocument();
  const docId = doc.getId();
  const email = Session.getActiveUser().getEmail() || "";
  
  let gradeLevel = "NAO_IDENTIFICADO";
  let institutionId = "NAO_IDENTIFICADO";
  let professorEmail = "NAO_IDENTIFICADO";
  let revisionsCount = 0;
  
  try {
    // 1. Institution ID via domínio de e-mail institucional
    if (email.includes('@')) {
      institutionId = email.split('@')[1].toUpperCase().replace(/\./g, '_');
    }
    
    // 2. Extrair "Grade Level" rastreando a pasta pai do arquivo (Simula a pasta do Classroom)
    // Extrai também o e-mail do professor baseado no dono da pasta do Classroom
    const file = DriveApp.getFileById(docId);
    const parents = file.getParents();
    if (parents.hasNext()) {
      const parent = parents.next();
      gradeLevel = parent.getName(); // Ex: "Turma de Redação 9A - 2026"
      try {
        professorEmail = parent.getOwner().getEmail();
      } catch (err) {}
    }
    
    // 3. Contagem Total de Revisões do Documento usando Drive Avançado API v3
    // Necessita do OAuth Scope "drive.readonly" e Advanced Services no AppsScript.
    const revisions = Drive.Revisions.list(docId);
    if (revisions && revisions.revisions) {
      revisionsCount = revisions.revisions.length;
    }
  } catch (err) {
    Logger.log("[EvidencIA] Aviso Item 3 ignorado: " + err);
    // Se a API não for aceita via token, falha silenciosamente e envia 0.
  }
  
  return {
    gradeLevel: gradeLevel,
    institutionId: institutionId,
    professorEmail: professorEmail,
    revisionsCount: revisionsCount
  };
}
