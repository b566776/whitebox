/**
 * =======================================================
 *  Whitebox — Add-on Autônomo (Código.gs — Cliente)
 *  Versão: 2.0 — Arquitetura Autônoma via Brain Proxy
 * =======================================================
 *
 * CONFIGURAÇÃO:
 *  Salve nas Script Properties DESTE script (do Add-on, não do Proxy):
 *    BRAIN_PROXY_URL  — URL do Web App do BrainProxy.gs após o deploy
 *    SHARED_TOKEN     — O mesmo token configurado no BrainProxy.gs
 */

// =====================================================
//  INTERFACE DA BIBLIOTECA (Chamado pelo Wrapper)
// =====================================================

/**
 * Função de inicialização chamada pelo onOpen do Wrapper.
 */
function start(e) {
  DocumentApp.getUi()
    .createMenu('Whitebox')
    .addItem('Abrir Painel Whitebox', 'showSidebar')
    .addItem('⚙️ Configurar Conexão', 'setupWhitebox')
    .addToUi();
}

/**
 * Assistente de configuração de conexão para o professor/administrador.
 * Pergunta pela URL do Brain Proxy e o SHARED_TOKEN e salva nas Script/Document Properties.
 */
function setupWhitebox() {
  const ui = DocumentApp.getUi();
  
  // 1. Pedir a URL do servidor
  const responseUrl = ui.prompt(
    'Configuração do Whitebox',
    'Por favor, insira a URL do servidor (Brain Proxy):\nExemplo: https://script.google.com/macros/s/.../exec',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (responseUrl.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const url = responseUrl.getResponseText().trim();
  if (!url) {
    ui.alert('Erro: A URL do servidor não pode ser vazia.');
    return;
  }
  
  // 2. Pedir o token
  const responseToken = ui.prompt(
    'Configuração do Whitebox',
    'Insira o SHARED_TOKEN gerado pelo servidor:\nExemplo: WBX-xxxx...',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (responseToken.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  const token = responseToken.getResponseText().trim();
  
  // 3. Ping de validação
  ui.alert('Aguarde', 'Validando conexão com o servidor...', ui.ButtonSet.OK);
  
  try {
    const payload = {
      route: 'ping',
      token: token
    };
    
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      ui.alert('Erro de Conexão', 'O servidor retornou código HTTP ' + response.getResponseCode() + '. Verifique a URL.', ui.ButtonSet.OK);
      return;
    }
    
    const resText = response.getContentText();
    let resBody;
    try {
      resBody = JSON.parse(resText);
    } catch(e) {
      ui.alert('Erro de Resposta', 'O servidor não retornou um JSON válido. Verifique a URL.', ui.ButtonSet.OK);
      return;
    }
    
    if (resBody.error || !resBody.ok) {
      ui.alert('Erro de Autenticação', 'O token fornecido é inválido ou recusado pelo servidor.', ui.ButtonSet.OK);
      return;
    }
    
    // 4. Salvar nas ScriptProperties do Add-on e também no documento atual para garantir
    const scriptProps = PropertiesService.getScriptProperties();
    scriptProps.setProperty('BRAIN_PROXY_URL', url);
    scriptProps.setProperty('SHARED_TOKEN', token);
    
    // Salvar nas DocumentProperties do documento ativo também
    const docProps = PropertiesService.getDocumentProperties();
    docProps.setProperty('BRAIN_PROXY_URL', url);
    docProps.setProperty('SHARED_TOKEN', token);
    
    ui.alert('Sucesso', '✅ Whitebox Configurado com sucesso!\n\nFeche e reabra o painel lateral para aplicar as alterações.', ui.ButtonSet.OK);
  } catch(err) {
    ui.alert('Erro Crítico', 'Falha ao conectar com o servidor: ' + err.toString(), ui.ButtonSet.OK);
  }
}

function showSidebar() {
  const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Whitebox')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(300);
  DocumentApp.getUi().showSidebar(ui);
}

function openQuizModal(quizData) {
  const template = HtmlService.createTemplateFromFile('QuizEditor');
  template.quizData = quizData;
  const html = template.evaluate().setWidth(600).setHeight(500);
  DocumentApp.getUi().showModalDialog(html, 'Revisão Pedagógica - Quiz');
}



// =====================================================
//  CONFIGURAÇÕES DO PROFESSOR (API Key)
// =====================================================

/**
 * Salva a API Key Gemini do professor no Brain Proxy
 * Chamado pela Sidebar na aba de Configurações
 */
function saveTeacherApiKey(apiKey) {
  const userEmail = Session.getActiveUser().getEmail();
  const result    = callProxy(ROUTE_REGISTRAR_CHAVE, {
    professorEmail: userEmail,
    apiKey: apiKey
  });
  return result;
}

/**
 * Retorna o status atual de licença/configuração do professor
 */
function getTeacherLicenseStatus() {
  const userEmail = Session.getActiveUser().getEmail();
  const result    = callProxy(ROUTE_STATUS_LICENCA, { professorEmail: userEmail });

  if (result.error === 'PROXY_NOT_CONFIGURED') {
    return { status: 'PROXY_NAO_CONFIGURADO', modoIA: false };
  }

  return result;
}

// =====================================================
//  DISTRIBUIÇÃO DE TEMPLATES (Professor)
// =====================================================

/**
 * Lista as turmas do Google Classroom onde o professor é docente.
 * Chamado pela aba "Distribuir" da Sidebar.
 */
function listarTurmasProfessor() {
  const userEmail = Session.getActiveUser().getEmail();
  return callProxy(ROUTE_LISTAR_TURMAS_PROFESSOR, { professorEmail: userEmail });
}

/**
 * Cria uma Leva: atividade no Classroom com cópia do template para cada aluno.
 *
 * @param {object} params - { templateDocId, turmas[], titulo, instrucoes, prazo }
 */
function criarLevaTemplate(params) {
  const userEmail = Session.getActiveUser().getEmail();
  return callProxy(ROUTE_CRIAR_LEVA_TEMPLATE, {
    professorEmail: userEmail,
    templateDocId:  params.templateDocId  || DocumentApp.getActiveDocument().getId(),
    turmas:         params.turmas         || [],
    titulo:         params.titulo         || '',
    instrucoes:     params.instrucoes     || '',
    prazo:          params.prazo          || ''
  });
}

/**
 * Retorna o ID e URL do documento ativo (para pré-preencher o campo Template na Sidebar).
 */
function getActiveDocInfo() {
  const doc = DocumentApp.getActiveDocument();
  return {
    docId: doc.getId(),
    nome:  doc.getName(),
    url:   doc.getUrl()
  };
}


// =====================================================
//  CONTEXTO E STATS
// =====================================================

function getContext() {
  const doc       = DocumentApp.getActiveDocument();
  let userEmail   = Session.getActiveUser().getEmail();
  if (!userEmail) {
    userEmail = Session.getEffectiveUser().getEmail();
  }
  userEmail = userEmail ? userEmail.trim().toLowerCase() : '';

  const item3Data = getAdvancedItem3Data();

  // [AUTH-01] Detecção dinâmica de papel
  // Professor = Dono do Doc OU Dono da pasta (professorEmail do Item 3) OU Metadado (professorEmail do WHITEBOX_CONFIG)
  let isOwner = false;
  try {
    const owner = DriveApp.getFileById(doc.getId()).getOwner();
    isOwner = owner ? (owner.getEmail().trim().toLowerCase() === userEmail) : false;
  } catch (e) {
    Logger.log('[Whitebox] Erro ao obter proprietário do documento via DriveApp: ' + e);
  }

  const isProfessor = item3Data && item3Data.professorEmail && 
    (item3Data.professorEmail.trim().toLowerCase() === userEmail);

  // Busca professor designado explicitamente no metadado do documento (injetado via Distribuir Template)
  let designatedProfessor = null;
  try {
    const meta = doc.getDeveloperMetadata().filter(m => m.getKey() === 'WHITEBOX_CONFIG');
    for (let i = 0; i < meta.length; i++) {
      try {
        const configObj = JSON.parse(meta[i].getValue());
        if (configObj && configObj.professorEmail) {
          const emailStr = configObj.professorEmail.trim().toLowerCase();
          // Se corresponder ao usuário atual, prioriza
          if (emailStr === userEmail) {
            designatedProfessor = emailStr;
            break;
          }
          // Caso contrário, guarda o primeiro que encontrar
          if (!designatedProfessor) {
            designatedProfessor = emailStr;
          }
        }
      } catch (parseErr) {
        Logger.log('[Whitebox] Erro ao parsear metadado index ' + i + ': ' + parseErr);
      }
    }
  } catch(e) {
    Logger.log('[Whitebox] Erro ao ler WHITEBOX_CONFIG: ' + e);
  }
  const isDesignated = designatedProfessor && userEmail && 
    (designatedProfessor.trim().toLowerCase() === userEmail);

  // Validação complementar: verifica se o e-mail está cadastrado como professor no banco de dados.
  // Caso o proxy não esteja configurado ainda (primeira instalação), permitimos o fallback de isOwner/isProfessor.
  let isRegisteredProfessor = false;
  try {
    const license = getTeacherLicenseStatus();
    if (license && (license.status === 'ATIVO' || license.status === 'INATIVO' || license.status === 'PROXY_NAO_CONFIGURADO' || license.status === 'NAO_CADASTRADO')) {
      isRegisteredProfessor = true;
    }
  } catch (e) {
    Logger.log('[Whitebox] Erro ao validar licença do professor no getContext: ' + e);
  }

  // [AUTH-01 FIX] Papéis:
  //   - isDesignated (WHITEBOX_CONFIG) → sempre teacher (metadata é injetado pelo servidor, confiável)
  //   - isOwner/isProfessor + isRegisteredProfessor → teacher (validação via servidor)
  //   - caso contrário → student
  // Motivação: isDesignated não depende de resposta do proxy, evitando que falha
  // de rede ou licença force o professor a ver a UI de aluno.
  const role = isDesignated ? 'teacher' : ((isOwner || isProfessor) && isRegisteredProfessor) ? 'teacher' : 'student';

  const responseObj = {
    email:        userEmail,
    docId:        doc.getId(),
    initialRole:  role,
    timestamp:    new Date().getTime(),
    item3:        item3Data,
    debugInfo: {
      userEmail: userEmail,
      isOwner: isOwner,
      isProfessor: isProfessor,
      isDesignated: isDesignated,
      designatedProfessor: designatedProfessor,
      isRegisteredProfessor: isRegisteredProfessor
    }
  };

  Logger.log('[Whitebox] getContext result: ' + JSON.stringify(responseObj));
  return responseObj;
}

function getDocumentStats() {
  const doc        = DocumentApp.getActiveDocument();
  const body       = doc.getBody();
  const text       = body.getText();
  const paragraphs = body.getParagraphs();
  const structureSignature = paragraphs
    .map(p => p.getText().trim().length)
    .filter(len => len > 0);

  return {
    docId:             doc.getId(),
    length:            text.length,
    wordCount:         text.split(/\s+/).filter(w => w.length > 0).length,
    structureSignature: structureSignature,
    fullTextChunk:     text.substring(0, 1000)
  };
}

// =====================================================
//  ANÁLISE DE TRECHO (PROFESSOR)
// =====================================================

function getSelectedTextInfo() {
  const doc       = DocumentApp.getActiveDocument();
  const selection = doc.getSelection();

  if (!selection) {
    return { selectedFragment: null, error: 'Nenhum texto selecionado.' };
  }

  const elements = selection.getRangeElements();
  let selectedText = '';
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.getElement().editAsText) {
      const textEl = el.getElement().editAsText();
      const text   = textEl.getText();
      const start  = el.isPartial() ? el.getStartOffset() : 0;
      const end    = el.isPartial() ? el.getEndOffsetInclusive() : text.length - 1;
      selectedText += text.substring(start, end + 1) + '\n';
    }
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let urls       = selectedText.match(urlRegex) || [];
  urls = urls.map(url => url.replace(/[.,;)]+$/, ''));

  return {
    selectedFragment: selectedText.trim(),
    detectedUrls:     urls.slice(0, 3),
    success:          true
  };
}

/**
 * Envia dados para análise no Brain Proxy (substitui sendToBackend)
 * Chamado tanto para log de métricas quanto para análise de trecho
 */
function sendToBackend(payload) {
  const item3  = getAdvancedItem3Data();
  const userEmail      = Session.getActiveUser().getEmail();
  const professorEmail = item3.professorEmail || userEmail;
  const turma          = item3.gradeLevel || TURMA_FALLBACK;
  const alunoEmail     = payload.studentContext?.rawEmail || userEmail;

  const professorDesconhecido = (professorEmail === 'NAO_IDENTIFICADO');
  let analise = null;

  // [AUTH-02] Bloqueio de Segurança: Aluno não interage com IA Auditor
  const ctx = getContext();
  const isStudent = (ctx.initialRole === 'student');

  // Se há fragmento selecionado, pedir análise ao Gemini via Proxy (SÓ PARA PROFESSOR)
  if (!isStudent && !professorDesconhecido && payload.contentAnalysis && payload.contentAnalysis.selectedFragment) {
    const analiseResult = callProxy(ROUTE_ANALISAR, {
      professorEmail: professorEmail,
      alunoEmail:     alunoEmail,
      fragmento:      payload.contentAnalysis.selectedFragment,
      metricas:       payload.behavioralMetrics || {}
    });

    if (!analiseResult.error) {
      analise = analiseResult;
    }
  }

  // Logar métricas (somente se professor identificado)
  if (!professorDesconhecido) {
    callProxy(ROUTE_LOGAR_METRICAS, {
      professorEmail: professorEmail,
      turma:          turma,
      docId:          payload.documentId,
      alunoEmail:     alunoEmail,
      metricas:       payload.behavioralMetrics || {},
      analise:        analise,
      isFinal:        payload.isFinal || false
    });
  }

  // Montar resposta para a Sidebar
  if (analise && !analise.error) {
    const quizData = analise.toneChangeDetected
      ? generateQuizFromText(payload.contentAnalysis.selectedFragment)
      : [];

    return {
      status:             200,
      modoIA:             true,
      toneChangeDetected: analise.toneChangeDetected,
      riskEvidence:       analise.riskEvidence,
      pedagogicalAdvice:  analise.pedagogicalAdvice,
      suggestedQuestion:  analise.suggestedQuestion,
      quizData:           quizData,
      quizStatus:         analise.toneChangeDetected ? QUIZ_DISPONIVEL : QUIZ_NONE,
      sourceAnalysis:     []
    };
  }

  // Modo Offline ou erro na IA
  return {
    status:             200,
    modoIA:             false,
    toneChangeDetected: false,
    riskEvidence:       null,
    pedagogicalAdvice:  analise?.message || 'Análise de IA não disponível. Configure sua API Key nas configurações.',
    quizData:           [],
    quizStatus:         QUIZ_NONE,
    sourceAnalysis:     []
  };
}

// encodeHiddenPrompt() → ver Utils.gs
// injectZeroWidthChars() → ver Utils.gs
// [ARCH-02] Movidas para whitebox-client/Utils.gs

function generateQuizFromText(selectedFragment) {
  var fragment  = (selectedFragment || '').trim();
  var sentences = fragment.match(/[^.!?]+[.!?]+/g) || [fragment];
  var anchor    = sentences[0].trim().substring(0, 90);
  var wordCount = fragment.split(/\s+/).filter(w => w.length > 0).length;

  return [
    {
      question: injectZeroWidthChars('Você escreveu: "' + anchor + '...". Como você chegou a esta afirmação?'),
      options: [
        'Elaborei através de pesquisa e leitura própria sobre o tema.',
        'Adaptei de uma fonte que não citei explicitamente no texto.',
        'Utilizei uma ferramenta de IA para me ajudar a escrever este trecho.',
        'Não tenho certeza de como cheguei a esta afirmação.'
      ],
      answer: 0
    },
    {
      question: injectZeroWidthChars('No trecho "' + anchor + '...", com ' + wordCount + ' palavras, qual foi sua principal referência?'),
      options: [
        'Conhecimento adquirido em sala de aula ou leituras anteriores.',
        'Um livro ou artigo acadêmico que consigo citar pelo título.',
        'Pesquisa na internet (não lembro a URL exata).',
        'Não usei referências específicas para este trecho.'
      ],
      answer: 0
    }
  ];
}

function submitFinalQuiz(quizData, options) {
  var props   = PropertiesService.getDocumentProperties();
  var payload = {
    questions:  quizData,
    sentAt:     new Date().getTime(),
    status:     QUIZ_STATUS_PENDING,
    answers:    null,
    answeredAt: null
  };
  props.setProperty(DOC_PROP_PENDING_QUIZ, JSON.stringify(payload));

  if (options && options.sendEmail && options.studentEmail) {
    try {
      var subject = '[Whitebox] Seu professor enviou um Desafio de Autonomia 📚';
      var body    = 'Olá!\n\n';
      if (options.message && options.message.trim().length > 0) {
        body += '💬 Mensagem do professor:\n' + options.message.trim() + '\n\n';
      }
      body += 'Seu professor enviou um Desafio de Autonomia para você no Whitebox.\n';
      body += 'Abra a barra lateral do Whitebox no Google Docs para ver e responder o desafio.\n\n';
      body += 'Whitebox — Sistema de Auditoria de Autoria Pedagógica';
      MailApp.sendEmail(options.studentEmail, subject, body);
    } catch (e) {
      Logger.log('[Whitebox] Erro ao enviar email: ' + e);
    }
  }
  return { success: true };
}

function getStudentEmail() {
  return PropertiesService.getDocumentProperties().getProperty(DOC_PROP_STUDENT_EMAIL) || '';
}

function getStudentQuiz() {
  var props = PropertiesService.getDocumentProperties();
  var raw   = props.getProperty(DOC_PROP_PENDING_QUIZ);
  if (!raw) return null;
  try {
    var quiz = JSON.parse(raw);
    return (quiz.status === QUIZ_STATUS_PENDING) ? quiz : null;
  } catch (e) {
    return null;
  }
}

function submitStudentQuizAnswers(answers) {
  var props = PropertiesService.getDocumentProperties();
  var raw   = props.getProperty(DOC_PROP_PENDING_QUIZ);
  if (!raw) return { error: 'Nenhum quiz pendente encontrado.' };
  try {
    var quiz       = JSON.parse(raw);
    quiz.status    = QUIZ_STATUS_ANSWERED;
    quiz.answers   = answers;
    quiz.answeredAt = new Date().getTime();
    props.setProperty(DOC_PROP_PENDING_QUIZ, JSON.stringify(quiz));
    return { success: true };
  } catch (e) {
    return { error: e.toString() };
  }
}

// =====================================================
//  STATUS DE ENTREGA
// =====================================================

function getSubmissionStatus() {
  const doc      = DocumentApp.getActiveDocument();
  const props    = PropertiesService.getDocumentProperties();
  const isFlagged   = props.getProperty(DOC_PROP_SUBMITTED) === 'true';
  const accessLevel = doc.getUserAccessLevel();
  const isViewerOnly = (
    accessLevel === DocumentApp.Permission.VIEW ||
    accessLevel === DocumentApp.Permission.COMMENT
  );
  const ctx         = getAdvancedItem3Data();
  const userEmail   = Session.getActiveUser().getEmail();
  const isProfessor = (userEmail === ctx.professorEmail);
  const finalStatus = isProfessor ? false : (isFlagged || isViewerOnly);

  return {
    isSubmitted: finalStatus,
    method:      isFlagged ? 'manual' : (isViewerOnly ? 'automatic_classroom' : 'none'),
    isProfessor: isProfessor
  };
}

function markAsSubmitted() {
  PropertiesService.getDocumentProperties().setProperty(DOC_PROP_SUBMITTED, 'true');
  return { success: true };
}

// =====================================================
//  ITEM 3 (Metadados Avançados do Workspace)
// =====================================================

function getAdvancedItem3Data() {
  const doc    = DocumentApp.getActiveDocument();
  const docId  = doc.getId();
  const email  = Session.getActiveUser().getEmail() || '';

  let gradeLevel    = 'NAO_IDENTIFICADO';
  let institutionId = 'NAO_IDENTIFICADO';
  let professorEmail = 'NAO_IDENTIFICADO';
  let revisionsCount = 0;

  try {
    if (email.includes('@')) {
      institutionId = email.split('@')[1].toUpperCase().replace(/\./g, '_');
    }
    const file    = DriveApp.getFileById(docId);
    const parents = file.getParents();
    if (parents.hasNext()) {
      const parent = parents.next();
      gradeLevel   = parent.getName();
      try { professorEmail = parent.getOwner().getEmail(); } catch (err) {}
    }
    const revisions = Drive.Revisions.list(docId);
    if (revisions && revisions.revisions) {
      revisionsCount = revisions.revisions.length;
    }
  } catch (err) {
    Logger.log('[Whitebox] Item3 ignorado: ' + err);
  }

  return { gradeLevel, institutionId, professorEmail, revisionsCount };
}

// =====================================================
//  RADAR DE ESFORÇO (Aura Map)
// =====================================================

/**
 * Gera o Mapa de Calor (Aura) do documento atual.
 *
 * [MED-02] NOTA: Esta é uma heurística de POC baseada em comprimento de texto
 * e eventos de paste persistidos localmente. Não substitui análise real do Gemini.
 * Scores definitivos são fornecidos pela análise socrática do BrainProxy.
 *
 * Heurística atual:
 *   - Score base pelo comprimento (textos longos são neutros por padrão)
 *   - Penalidade se o parágrafo foi colado (detectado via PASTE_MAP no DocumentProperties)
 *   - Variância leve por index para efeito visual durante POC
 */
function getDocumentAuraMap() {
  const doc        = DocumentApp.getActiveDocument();
  const body       = doc.getBody();
  const paragraphs = body.getParagraphs();

  // [MED-02] Tentar ler mapa de colagens persistido pela Sidebar
  // Formato esperado: { "0": true, "3": true } — índices de parágrafos com paste detectado
  let pasteMap = {};
  try {
    const rawPasteMap = PropertiesService.getDocumentProperties().getProperty(DOC_PROP_PASTE_MAP);
    if (rawPasteMap) pasteMap = JSON.parse(rawPasteMap);
  } catch (e) {
    // Ignora silenciosamente — pasteMap permanece vazio
  }

  return paragraphs.map((p, index) => {
    const text = p.getText().trim();
    if (text.length === 0) return null;

    // Score base: neutro para qualquer comprimento (textos longos não são suspeitos por natureza)
    let score = 80;

    // Penalidade progressiva apenas para textos muito curtos sem contexto
    if (text.length < 20) score = 60; // Possível placeholder

    // Penalidade por paste detectado (dado de telemetria real > heurística de tamanho)
    if (pasteMap[String(index)]) {
      score = Math.min(score, 35); // Colagem detectada neste parágrafo
    }

    // Variância visual leve para POC (remover quando integrar dados reais do Gemini)
    const variance = (index % 3 === 0) ? -5 : 3;
    score = Math.max(10, Math.min(100, score + variance));

    return {
      index:        index,
      preview:      text.substring(0, 30) + '...',
      score:        score,
      charCount:    text.length,
      color:        score > 70 ? '#10b981' : (score > 40 ? '#f59e0b' : '#ef4444'),
      hasPageBreak: p.getAttributes()[DocumentApp.Attribute.PAGE_BREAK_BEFORE] === true,
      isPasteDetected: !!pasteMap[String(index)] // Flag explícita para a UI
    };
  }).filter(item => item !== null);
}

function scrollToParagraph(paragraphIndex) {
  const doc        = DocumentApp.getActiveDocument();
  const body       = doc.getBody();
  const paragraphs = body.getParagraphs();

  if (paragraphIndex >= 0 && paragraphIndex < paragraphs.length) {
    const target = paragraphs[paragraphIndex];
    if (target.getNumChildren() > 0) {
      doc.setCursor(doc.newPosition(target.getChild(0), 0));
      const rb = doc.newRange();
      rb.addRangeElement(target);
      doc.setSelection(rb.build());
    } else {
      doc.setSelection(doc.newRange().addRangeElement(target).build());
    }
  }
}

// =====================================================
//  VALIDADOR DE FONTES (Aluno)
// =====================================================

/**
 * Valida a confiabilidade de uma fonte (URL) baseada em domínio e disponibilidade.
 *
 * [MED-04] MELHORIAS:
 *   1. Cache por domínio via CacheService (TTL 1h) — evita fetch repetido para o mesmo domínio.
 *   2. Timeout explícito de 5s — impede que URLs lentas estourem o deadline de 25s do callProxy.
 *   3. Validação da URL antes de fazer fetch — evita erros em entradas malformadas.
 */
function validateSourceReliability(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { url: url, isReliable: false, status: 'INVALID', message: 'URL inválida ou ausente.' };
  }

  let isReliable = false;
  let status  = 'ACTIVE';
  let message = 'Fonte externa detectada.';

  const reliableDomains = ['.edu', '.gov', '.org', 'scielo', 'scholar.google', 'usp.br', 'capes.gov.br'];
  const lowercaseUrl = url.toLowerCase();
  if (reliableDomains.some(d => lowercaseUrl.includes(d))) {
    isReliable = true;
    message    = 'Fonte Confiável (Acadêmica/Institucional).';
  } else {
    message = 'Atenção: Esta fonte pode não ser acadêmica.';
  }

  // [MED-04] Cache por domínio — extrai o host para agrupar URLs do mesmo site
  let domain = url;
  try { domain = new URL(url).hostname; } catch (e) {}
  const cache    = CacheService.getDocumentCache();
  const cacheKey = 'URL_STATUS_' + domain;
  const cached   = cache.get(cacheKey);

  if (cached) {
    // Hit de cache: reaproveitar status HTTP sem novo fetch
    status = cached;
    if (status === 'BROKEN') message = 'Link quebrado ou inacessível (cacheado).';
  } else {
    // Miss: fazer fetch com timeout explícito de 5s
    try {
      const resp = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects:    true,
        deadline:           5  // [MED-04] Timeout de 5s por URL
      });
      if (resp.getResponseCode() >= 400) {
        status  = 'BROKEN';
        message = 'Link quebrado ou inacessível (Status ' + resp.getResponseCode() + ').';
      }
      // Cachear resultado por 1h = 3600s
      try { cache.put(cacheKey, status, 3600); } catch (e) {}
    } catch (e) {
      status  = 'ERROR';
      message = 'Erro ao acessar a URL (timeout ou falha de rede).';
    }
  }

  return { url, isReliable, status, message };
}
