/**
 * =======================================================
 *  Whitebox — Add-on Autônomo (Código.gs — Cliente)
 *  Versão: 2.0 — Arquitetura Autônoma via Brain Proxy
 * =======================================================
 *
 * CONFIGURAÇÃO:
 *  A URL do Brain Proxy é fixa em Constants.gs (BRAIN_PROXY_URL); não há nada a configurar
 *  por documento. A autenticação no Proxy é feita via OAuth do usuário (sem segredo no cliente).
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
    .addToUi();
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
  return callProxy(ROUTE_STATUS_LICENCA, { professorEmail: userEmail });
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
  // Professor = Dono do Doc OU Dono da pasta (professorEmail do Item 3) OU Designado (professorEmail do WHITEBOX_CONFIG)
  let isOwner = false;
  try {
    const owner = DriveApp.getFileById(doc.getId()).getOwner();
    isOwner = owner ? (owner.getEmail().trim().toLowerCase() === userEmail) : false;
  } catch (e) {
    Logger.log('[Whitebox] Erro ao obter proprietário do documento via DriveApp: ' + e);
  }

  const isProfessor = item3Data && item3Data.professorEmail && 
    (item3Data.professorEmail.trim().toLowerCase() === userEmail);

  // Busca professor designado explicitamente no documento (gravado pelo servidor via Distribuir Template).
  const designatedProfessor = getDesignatedProfessor(userEmail);
  const isDesignated = designatedProfessor && userEmail &&
    (designatedProfessor === userEmail);

  // Validação complementar: o servidor confirma se o e-mail está na tabela de professores
  // (ATIVO ou INATIVO). NAO_CADASTRADO, proxy não configurado e falha de rede não confirmam
  // nada: como o Classroom torna o aluno dono da cópia, isOwner sozinho não basta.
  let isRegisteredProfessor = false;
  try {
    const license = getTeacherLicenseStatus();
    if (license && (license.status === 'ATIVO' || license.status === 'INATIVO')) {
      isRegisteredProfessor = true;
    }
  } catch (e) {
    Logger.log('[Whitebox] Erro ao validar licença do professor no getContext: ' + e);
  }

  // Documento sem nenhuma designação = documento mestre (ainda não distribuído).
  const hasDesignation = !!designatedProfessor;

  // [AUTH-01 FIX] Papéis:
  //   - isDesignated (WHITEBOX_CONFIG) → sempre teacher (metadata é injetado pelo servidor, confiável)
  //   - isRegisteredProfessor + documento sem designação → teacher (caminho sem Drive:
  //     com o escopo drive.file, isOwner/isProfessor podem falhar no documento mestre)
  //   - isOwner/isProfessor + isRegisteredProfessor → teacher (validação via servidor)
  //   - caso contrário → student
  // Motivação: isDesignated não depende de resposta do proxy, evitando que falha
  // de rede ou licença force o professor a ver a UI de aluno.
  // O papel aqui só decide qual UI aparece: quem autoriza as rotas de professor
  // é o servidor (doPost exige cadastro Ativo para o e-mail verificado via OAuth).
  const role = isDesignated ? 'teacher'
    : (isRegisteredProfessor && (!hasDesignation || isOwner || isProfessor)) ? 'teacher'
    : 'student';

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
      hasDesignation: hasDesignation,
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

  _checkAndUpdatePasteSnapshot(paragraphs);

  return {
    docId:              doc.getId(),
    length:             text.length,
    wordCount:          text.split(/\s+/).filter(w => w.length > 0).length,
    structureSignature: structureSignature,
    paragraphLengths:   paragraphs.map(p => p.getText().trim().length),
    fullTextChunk:      text.substring(0, 1000)
  };
}

/**
 * Compara comprimentos atuais dos parágrafos com o snapshot anterior
 * (armazenado em DocumentProperties). Parágrafos que cresceram >= 50 chars
 * desde a última checagem são marcados como paste no WHITEBOX_PASTE_MAP.
 * Atualiza o snapshot ao final para a próxima comparação.
 *
 * Chamada por getDocumentStats() (a cada 15s do sidebar do aluno) e por
 * getDocumentAuraMap() (quando o professor clica em Atualizar) — qualquer
 * verificação que vier primeiro captura a colagem, sem depender do outro.
 *
 * [FIX-PASTE-01] Além da comparação incremental, também detecta parágrafos
 * que são outliers extremos (>= 4x a mediana do documento E >= 400 chars).
 * Isto captura colagens que ocorreram ANTES do primeiro snapshot,
 * que o método incremental jamais detectaria.
 */
function _checkAndUpdatePasteSnapshot(paragraphs) {
  const props   = PropertiesService.getDocumentProperties();
  const current = paragraphs.map(p => p.getText().trim().length);

  // Incremental diff: paragraph grew >= 80 chars since last check → paste
  try {
    const prevRaw = props.getProperty('WHITEBOX_PARA_SNAPSHOT');
    if (prevRaw) {
      const prev     = JSON.parse(prevRaw);
      const mapRaw   = props.getProperty(DOC_PROP_PASTE_MAP) || '{}';
      const pasteMap = JSON.parse(mapRaw);
      let   dirty    = false;
      current.forEach(function(len, idx) {
        if (len - (prev[idx] || 0) >= 80 && !pasteMap[String(idx)]) {
          pasteMap[String(idx)] = 'snapshot';
          dirty = true;
        }
      });
      if (dirty) props.setProperty(DOC_PROP_PASTE_MAP, JSON.stringify(pasteMap));
    }
  } catch (e) {
    Logger.log('[Whitebox] _checkAndUpdatePasteSnapshot: ' + e);
  }

  // Anomaly detection: >= 200 chars AND >= 2.5x median catches pre-snapshot pastes.
  // Runs for ALL document sizes (no minimum paragraph count).
  try {
    const nonEmpty = current.filter(function(len) { return len > 0; });
    if (nonEmpty.length >= 1) {
      const sorted = nonEmpty.slice().sort(function(a, b) { return a - b; });
      const mid    = Math.floor(sorted.length / 2);
      const median = (sorted.length % 2 !== 0)
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
      const minMedian = Math.max(1, median);

      const mapRaw   = props.getProperty(DOC_PROP_PASTE_MAP) || '{}';
      const pasteMap = JSON.parse(mapRaw);
      let   dirty    = false;
      current.forEach(function(len, idx) {
        if (len >= 200 && len >= minMedian * 2.5 && !pasteMap[String(idx)]) {
          pasteMap[String(idx)] = 'anomaly';
          dirty = true;
        }
      });
      if (dirty) props.setProperty(DOC_PROP_PASTE_MAP, JSON.stringify(pasteMap));
    }
  } catch (e) {
    Logger.log('[Whitebox] _checkAndUpdatePasteSnapshot anomaly: ' + e);
  }

  try {
    props.setProperty('WHITEBOX_PARA_SNAPSHOT', JSON.stringify(current));
  } catch (e) {
    Logger.log('[Whitebox] snapshot save: ' + e);
  }
}

/**
 * Marca os índices de parágrafo informados como "paste detectado" no DocumentProperty.
 * Chamado pelo sidebar quando sizeDiff >= 50 num parágrafo específico.
 * @param {number[]} paragraphIndices
 */
function updatePasteMap(paragraphIndices) {
  if (!paragraphIndices || paragraphIndices.length === 0) return;
  try {
    const props    = PropertiesService.getDocumentProperties();
    const raw      = props.getProperty(DOC_PROP_PASTE_MAP) || '{}';
    const pasteMap = JSON.parse(raw);
    paragraphIndices.forEach(function(idx) { pasteMap[String(idx)] = true; });
    props.setProperty(DOC_PROP_PASTE_MAP, JSON.stringify(pasteMap));
  } catch (e) {
    Logger.log('[Whitebox] updatePasteMap erro: ' + e);
  }
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
  const ctx            = getContext();
  // Professor do documento: o designado pelo servidor na distribuição. Sem designação,
  // o próprio usuário quando o painel o reconhece como professor (documento mestre);
  // senão o dono da pasta, se o Drive o informou — na cópia do Classroom, o dono do
  // arquivo e da pasta é o aluno; sem Drive, item3.professorEmail é 'NAO_IDENTIFICADO'.
  const designado      = getDesignatedProfessor((userEmail || '').trim().toLowerCase());
  const donoPasta      = (item3.professorEmail && item3.professorEmail !== 'NAO_IDENTIFICADO')
                         ? item3.professorEmail : null;
  const professorEmail = designado ||
                         (ctx.initialRole === 'teacher' ? userEmail : null) ||
                         donoPasta || userEmail;
  // Sem acesso ao Drive, gradeLevel é 'NAO_IDENTIFICADO' (truthy): a turma fica SEM_TURMA.
  const turma          = (item3.gradeLevel && item3.gradeLevel !== 'NAO_IDENTIFICADO')
                         ? item3.gradeLevel : TURMA_FALLBACK;
  const alunoEmail     = payload.studentContext?.rawEmail || userEmail;

  const professorDesconhecido = !professorEmail || (professorEmail === 'NAO_IDENTIFICADO');
  const pediuAnalise = !!(payload.contentAnalysis && payload.contentAnalysis.selectedFragment);
  let analise = null;
  let falhaIA = null; // { error, message }: motivo real quando a análise foi pedida e não veio

  // [AUTH-02] Bloqueio de Segurança: Aluno não interage com IA Auditor
  const isStudent = (ctx.initialRole === 'student');

  // Se há fragmento selecionado, pedir análise à IA via Proxy (SÓ PARA PROFESSOR)
  if (pediuAnalise && isStudent) {
    falhaIA = { error: 'SOMENTE_PROFESSOR', message: 'A análise de IA é exclusiva do professor.' };
  } else if (pediuAnalise && professorDesconhecido) {
    falhaIA = { error: 'PROFESSOR_NAO_IDENTIFICADO', message: 'Não foi possível identificar o professor deste documento.' };
  } else if (pediuAnalise) {
    const analiseResult = callProxy(ROUTE_ANALISAR, {
      professorEmail: professorEmail,
      alunoEmail:     alunoEmail,
      fragmento:      payload.contentAnalysis.selectedFragment,
      metricas:       payload.behavioralMetrics || {}
    });

    // Erro (do servidor ou do provedor de IA) e modo offline não são uma análise
    if (analiseResult.error || analiseResult.modoIA === false) {
      falhaIA = analiseResult;
    } else {
      analise = analiseResult;
    }
  }

  // Logar métricas (somente se professor identificado). O resultado volta para a Sidebar
  // em metricsError: sem ele, ela avisaria "métricas salvas" mesmo com o log recusado.
  let falhaLog = null; // { error, message }
  if (professorDesconhecido) {
    falhaLog = { error: 'PROFESSOR_NAO_IDENTIFICADO', message: 'Não foi possível identificar o professor deste documento.' };
  } else {
    const logResult = callProxy(ROUTE_LOGAR_METRICAS, {
      professorEmail: professorEmail,
      turma:          turma,
      // O pedido de análise do professor não traz documentId. Sem o ID, a análise não
      // tem como ser ligada ao documento (e ao aluno) no heatmap.
      docId:          payload.documentId || DocumentApp.getActiveDocument().getId(),
      alunoEmail:     alunoEmail,
      metricas:       payload.behavioralMetrics || {},
      analise:        analise,
      // A Sidebar marca a entrega final dentro de behavioralMetrics (sendBackgroundData)
      isFinal:        !!(payload.isFinal || payload.behavioralMetrics?.isFinalSubmission)
    });
    if (logResult.error) falhaLog = logResult;
  }
  const metricsError = falhaLog
    ? { code: falhaLog.error, message: falhaLog.message || falhaLog.error }
    : null;

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
      metricsError:       metricsError,
      quizData:           quizData,
      quizStatus:         analise.toneChangeDetected ? QUIZ_DISPONIVEL : QUIZ_NONE,
      sourceAnalysis:     []
    };
  }

  // Modo Offline ou erro na IA: aiError leva o motivo real para a Sidebar, que o exibe
  // no lugar de um resultado. Resposta offline do servidor não tem `error` → 'OFFLINE'.
  return {
    status:             200,
    modoIA:             false,
    toneChangeDetected: false,
    riskEvidence:       null,
    pedagogicalAdvice:  falhaIA?.message || 'Análise de IA não disponível. Configure sua API Key nas configurações.',
    aiError:            falhaIA
      ? { code: falhaIA.error || 'OFFLINE', message: falhaIA.message || falhaIA.error }
      : null,
    metricsError:       metricsError,
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

/**
 * A entrega é a marcação manual feita pelo aluno (markAsSubmitted).
 *
 * Não há detecção por acesso somente-leitura (entrega pelo Classroom): quem só pode ver ou
 * comentar não recebe o menu do Whitebox — o onOpen não roda em modo leitura — e por isso
 * nunca chega a abrir o painel que chama esta função.
 */
function getSubmissionStatus() {
  const props    = PropertiesService.getDocumentProperties();
  const isFlagged   = props.getProperty(DOC_PROP_SUBMITTED) === 'true';
  const ctx         = getAdvancedItem3Data();
  const userEmail   = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  // Mesmo critério de sendToBackend: professor designado; dono da pasta só sem designação
  const professor   = getDesignatedProfessor(userEmail) || ctx.professorEmail || '';
  const isProfessor = (userEmail === professor.trim().toLowerCase());
  return {
    isSubmitted: isProfessor ? false : isFlagged,
    method:      isFlagged ? 'manual' : 'none',
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
  // true só quando arquivo, pasta e revisões foram lidos. false = o escopo drive.file
  // não cobriu este documento: campos degradados (degradação explícita, não erro).
  let driveAccess    = false;

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
    driveAccess = true;
  } catch (err) {
    Logger.log('[Whitebox] Item3 ignorado: ' + err);
  }

  return { gradeLevel, institutionId, professorEmail, revisionsCount, driveAccess };
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
  const docId      = doc.getId();

  // Layer 2: snapshot + anomaly (fast, always runs)
  _checkAndUpdatePasteSnapshot(paragraphs);

  // Layer 1: Drive revision fingerprint diff (retroactive, 30-min cache, graceful fail)
  try {
    _detectPasteFromRevisions(docId, paragraphs);
  } catch (e) {
    Logger.log('[Whitebox] getDocumentAuraMap: revision diff outer error: ' + e);
  }

  // Read pasteMap — cached 5 min to avoid re-reading DocProperties on rapid professor refreshes
  var pasteMap = {};
  try {
    var rawPasteMap =
      PropertiesService.getDocumentProperties()
        .getProperty(DOC_PROP_PASTE_MAP);

    if (rawPasteMap) {
      pasteMap = JSON.parse(rawPasteMap);
    }
  } catch (e) {
    Logger.log('[Whitebox] pasteMap read: ' + e);
  }

  const allTexts = paragraphs.map(p => p.getText().trim()).filter(t => t.length > 0);
  const medianLen = _computeMedianParagraphLength(allTexts);

  // Layer 3: TTR lexical divergence — experimental, disabled by default.
  // Enable: Apps Script → Project Settings → Script Properties → WHITEBOX_TTR_ENABLED = true
  var ttrEnabled = false;
  var docAvgTTR  = 0;
  try {
    ttrEnabled = PropertiesService.getScriptProperties()
                   .getProperty('WHITEBOX_TTR_ENABLED') === 'true';
  } catch (e) {}

  if (ttrEnabled) {
    try {
      var ttrSum = 0, ttrCount = 0;
      for (var ti = 0; ti < allTexts.length; ti++) {
        if (allTexts[ti].length > 20) {
          var tWords = _tokenizeParagraph(allTexts[ti]);
          if (tWords.length > 0) {
            var tUniq = {};
            for (var tu = 0; tu < tWords.length; tu++) { tUniq[tWords[tu]] = true; }
            ttrSum += Object.keys(tUniq).length / tWords.length;
            ttrCount++;
          }
        }
      }
      docAvgTTR = ttrCount > 0 ? ttrSum / ttrCount : 0;
    } catch (e) { docAvgTTR = 0; }
  }

  return paragraphs.map((p, index) => {
    const text = p.getText().trim();
    if (text.length === 0) return null;

    const r = text.length / medianLen;
    let score;
    if (r <= 0.3)       { score = 70; }
    else if (r <= 0.8)  { score = 92 - ((r - 0.3) / 0.5) * 10; }
    else if (r <= 1.2)  { score = 82 - ((r - 0.8) / 0.4) * 8; }
    else if (r <= 1.8)  { score = 74 - ((r - 1.2) / 0.6) * 20; }
    else if (r <= 3.0)  { score = 54 - ((r - 1.8) / 1.2) * 22; }
    else { const capped = Math.min(r, 8.0); score = 32 - ((capped - 3.0) / 5.0) * 22; }

    if (text.length < 20) score = Math.min(score, 60);

    let lexicalPenalty = 0;
    if (ttrEnabled) {
      lexicalPenalty = _computeParagraphLexicalScore(text, docAvgTTR);
      score = score - lexicalPenalty;
    }

    const rawScore = Math.max(10, Math.min(100, Math.round(score)));

    if (pasteMap[String(index)]) score = Math.min(score, 30);

    score = Math.max(10, Math.min(100, Math.round(score)));

    return {
      index:           index,
      preview:         text.substring(0, 30) + '...',
      score:           score,
      rawScore:        rawScore,
      charCount:       text.length,
      ratio:           Math.round(r * 10) / 10,
      lexicalPenalty:  lexicalPenalty,
      color:           score > 80 ? '#10b981' : (score > 55 ? '#f59e0b' : '#ef4444'),
      hasPageBreak:    p.getAttributes()[DocumentApp.Attribute.PAGE_BREAK_BEFORE] === true,
      isPasteDetected: !!pasteMap[String(index)],
      pasteSource:     pasteMap[String(index)] || null
    };
  }).filter(item => item !== null);
}

/**
 * Median paragraph length used by getDocumentAuraMap() for relative scoring.
 * Median is preferred over mean: a single large paste block would inflate the mean,
 * falsely normalising all genuine paragraphs as "short".
 *
 * @param {string[]} texts - Trimmed, non-empty paragraph strings.
 * @returns {number} Median character length, minimum 1.
 */
function _computeMedianParagraphLength(texts) {
  if (!texts || texts.length === 0) return 1;
  const lengths = texts.map(t => t.length).sort((a, b) => a - b);
  const mid = Math.floor(lengths.length / 2);
  const median = (lengths.length % 2 !== 0)
    ? lengths[mid]
    : Math.round((lengths[mid - 1] + lengths[mid]) / 2);
  return Math.max(1, median);
}

// =====================================================
//  LAYER 1 — Drive Revision Fingerprint Diff
// =====================================================

function _normalizeBlockText(text) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function _buildFingerprintSet(exportText) {
  var set   = {};
  var lines = exportText.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var norm = _normalizeBlockText(lines[i]);
    if (norm.length >= 60) {
      set[norm.substring(0, 60)] = true;
    }
  }
  return set;
}

function _detectPasteFromRevisions(docId, paragraphs) {
  try {
    var cache    = CacheService.getDocumentCache();
    var cacheKey = 'REV_DIFF_DONE_' + docId;
    if (cache.get(cacheKey)) {
      Logger.log('[Whitebox] _detectPasteFromRevisions: cache HIT');
      return;
    }

    var revResponse = Drive.Revisions.list(docId);
    if (!revResponse || !revResponse.revisions || revResponse.revisions.length < 2) return;

    var allRevs   = revResponse.revisions;
    var startIdx  = Math.max(0, allRevs.length - 20);
    var revWindow = allRevs.slice(startIdx);

    var token    = ScriptApp.getOAuthToken();
    var requests = [];
    for (var i = 0; i < revWindow.length; i++) {
      var rev = revWindow[i];
      if (rev.exportLinks && rev.exportLinks['text/plain']) {
        requests.push({
          url:     rev.exportLinks['text/plain'],
          method:  'get',
          headers: { Authorization: 'Bearer ' + token },
          muteHttpExceptions: true
        });
      }
    }
    if (requests.length < 2) return;

    var responses = UrlFetchApp.fetchAll(requests);

    var props    = PropertiesService.getDocumentProperties();
    var mapRaw   = props.getProperty(DOC_PROP_PASTE_MAP) || '{}';
    var pasteMap = JSON.parse(mapRaw);
    var dirty    = false;

    for (var j = 1; j < responses.length; j++) {
      if (responses[j - 1].getResponseCode() !== 200 ||
          responses[j].getResponseCode()     !== 200) continue;

      var prevText = responses[j - 1].getContentText();
      var currText = responses[j].getContentText();

      if (currText.length - prevText.length < 100) continue;

      var prevSet = _buildFingerprintSet(prevText);
      var currSet = _buildFingerprintSet(currText);

      for (var k = 0; k < paragraphs.length; k++) {
        if (pasteMap[String(k)]) continue;

        var pNorm = _normalizeBlockText(paragraphs[k].getText());
        if (pNorm.length < 60) continue;

        var fp = pNorm.substring(0, 60);
        if (currSet[fp] && !prevSet[fp]) {
          pasteMap[String(k)] = 'revision';
          dirty = true;
        }
      }
    }

    if (dirty) props.setProperty(DOC_PROP_PASTE_MAP, JSON.stringify(pasteMap));

    try { cache.put(cacheKey, '1', 1800); } catch (cacheErr) {}
    Logger.log('[Whitebox] _detectPasteFromRevisions done.' +
      ' revisions=' + revResponse.revisions.length +
      ' revWindow='  + revWindow.length +
      ' requests='   + requests.length +
      ' dirty='      + dirty +
      ' pasteMap='   + JSON.stringify(pasteMap));

  } catch (e) {
    // Sem acesso ao Drive, não repetir a chamada a cada refresh do mapa de calor.
    try { CacheService.getDocumentCache().put('REV_DIFF_DONE_' + docId, '1', 1800); } catch (cacheErr) {}
    Logger.log('[Whitebox] _detectPasteFromRevisions (graceful fail): ' + e);
  }
}

// =====================================================
//  LAYER 3 — TTR Lexical Divergence (feature flag)
// =====================================================

function _tokenizeParagraph(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^a-záéíóúàãõâêîôûç\s]/gi, ' ')
    .split(/\s+/)
    .filter(function(w) { return w.length > 0; });
}

function _computeParagraphLexicalScore(text, docAvgTTR) {
  if (!text || text.length <= 80) return 0;
  if (typeof docAvgTTR !== 'number' || docAvgTTR <= 0) return 0;
  var words = _tokenizeParagraph(text);
  if (words.length === 0) return 0;
  var unique = {};
  for (var j = 0; j < words.length; j++) { unique[words[j]] = true; }
  var ttr = Object.keys(unique).length / words.length;
  return (Math.abs(ttr - docAvgTTR) > 0.25) ? 15 : 0;
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
