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

/**
 * @param {{ automatico?: boolean }} [opcoes] automatico = aberto pelo gatilho "ao abrir" do
 *        aluno. Nesse caso o painel se fecha sozinho se quem abriu não tiver papel de aluno
 *        (o gatilho dispara para qualquer editor, inclusive o professor corrigindo a cópia).
 */
function showSidebar(opcoes) {
  const ui = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Whitebox')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(300);
  if (opcoes && opcoes.automatico) {
    ui.append('<script>window.WB_ABERTURA_AUTOMATICA = true;</script>');
  }
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
/**
 * Conferência do add-on (passo 7 de whitebox-addon/PUBLICACAO.md): chama a rota ping e
 * devolve o ID de cliente OAuth que o servidor viu no token e se ele está em
 * ADDON_CLIENT_IDS. O servidor também registra no log.
 */
function conferirConexaoAddon() {
  return callProxy('ping', {});
}

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
 * Pede ao servidor uma cópia deste documento mestre com o título da atividade. O Classroom
 * nomeia a cópia de cada aluno "<aluno> - <nome do arquivo anexado>": anexando esta cópia,
 * o nome reflete a atividade. Chamada pela Sidebar via callLibrary (sem wrapper no cliente).
 *
 * @param {string} titulo
 * @returns {{ success: boolean, docId: string, nome: string, url: string }|{ error: string, message: string }}
 */
function criarCopiaParaAtividade(titulo) {
  const userEmail = Session.getActiveUser().getEmail();
  return callProxy(ROUTE_COPIAR_MODELO_ATIVIDADE, {
    professorEmail: userEmail,
    templateDocId:  DocumentApp.getActiveDocument().getId(),
    titulo:         titulo || ''
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

/**
 * @param {{ addon?: boolean }} [opcoes] addon = chamado pelo add-on publicado
 *        (whitebox-addon), que aparece em qualquer documento. Nesse caso, num documento sem
 *        designação, quem não é professor recebe o papel 'fora': o painel só mostra um aviso
 *        e não mede nada. No script vinculado o documento é sempre do Whitebox.
 */
function getContext(opcoes) {
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
  let role = isDesignated ? 'teacher'
    : (isRegisteredProfessor && (!hasDesignation || isOwner || isProfessor)) ? 'teacher'
    : 'student';
  if (role === 'student' && !hasDesignation && opcoes && opcoes.addon === true) role = 'fora';

  // Cópia de aluno de um modelo sem a linha MARCADOR_INICIO_ALUNO: guarda o texto que veio
  // do modelo para não contá-lo como escrito pelo aluno.
  if (role === 'student' && hasDesignation) garantirLinhaDeBase();

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

/**
 * Métricas do documento para o pulso do painel do aluno.
 *
 * wordCount conta só o que o aluno escreveu: os parágrafos do modelo (ver
 * _mascaraDoModelo) ficam de fora. knownParagraphs marca, por índice, os parágrafos do
 * modelo ou que já existiam antes (restaurar versão, desfazer). restoredChars soma os
 * caracteres que reapareceram desde a última medição, para não inflar Caracteres.
 * colagensNovas/charsColados vêm da detecção de colagem desta medição (com tempo, ver
 * _checkAndUpdatePasteSnapshot), e radarEstados é o estado de cada parágrafo do aluno no
 * Radar de Esforço (códigos RADAR_ESTADO_*, separados por vírgula) para o log.
 * medicao (hashes e tamanhos, sem o texto) vai para o histórico no servidor.
 */
function getDocumentStats() {
  const doc        = DocumentApp.getActiveDocument();
  const body       = doc.getBody();
  const text       = body.getText();
  const paragraphs = body.getParagraphs();
  const textos     = paragraphs.map(p => p.getText().trim());
  const structureSignature = textos
    .map(t => t.length)
    .filter(len => len > 0);

  const modelo = _mascaraDoModelo(textos);
  const medida = _comTrava(function() {
    return _checkAndUpdatePasteSnapshot(paragraphs, modelo);
  });

  let palavras = 0;
  textos.forEach(function(t, i) {
    if (!modelo[i]) palavras += _contarPalavras(t);
  });

  let radarEstados = '';
  try {
    const mapa = _lerMapaRadar(PropertiesService.getDocumentProperties(), textos);
    radarEstados = _estadosDoRadar(textos, modelo, mapa)
      .filter(Boolean).map(e => e.estado).join(',');
  } catch (e) {
    Logger.log('[Whitebox] radarEstados: ' + e);
  }

  return {
    docId:              doc.getId(),
    length:             text.length,
    wordCount:          palavras,
    structureSignature: structureSignature,
    paragraphLengths:   textos.map(t => t.length),
    knownParagraphs:    medida.conhecidos,
    restoredChars:      medida.charsRestaurados,
    colagensNovas:      medida.colagensNovas,
    charsColados:       medida.charsColados,
    radarEstados:       radarEstados,
    // Hashes e tamanhos (sem texto) que o painel manda ao servidor (registrar_medicoes)
    medicao:            medida.medicao,
    fullTextChunk:      text.substring(0, 1000)
  };
}

/**
 * Executa fn com a trava do documento: o pulso do aluno e o "Atualizar" do professor
 * leem e gravam o mesmo estado (snapshot e mapa do Radar). Sem trava em até 5 s, roda
 * assim mesmo (melhor uma medição do que travar o painel).
 * @private
 */
function _comTrava(fn) {
  let lock = null;
  let ok   = false;
  try {
    lock = (typeof LockService !== 'undefined') ? LockService.getDocumentLock() : null;
    if (lock) ok = lock.tryLock(5000);
  } catch (e) {
    Logger.log('[Whitebox] Trava do documento indisponível: ' + e);
  }
  try {
    return fn();
  } finally {
    if (ok) { try { lock.releaseLock(); } catch (e) {} }
  }
}

/** @private */
function _contarPalavras(texto) {
  return String(texto || '').split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Normaliza para comparar parágrafos e o marcador: minúsculas, sem acentos e com só
 * letras, dígitos e espaços simples.
 * @private
 */
function _normalizarComparacao(texto) {
  return radarNormalizar(texto);
}

/**
 * Hash curto (FNV-1a 32 bits, base 36) do parágrafo normalizado. Vazio → ''.
 * @private
 */
function _hashParagrafo(texto) {
  return radarHash(texto);
}

/**
 * Índice da PRIMEIRA linha que é exatamente o marcador (depois de normalizar), ou -1.
 * Igualdade e não "contém": o aviso do modelo cita a frase do marcador, e uma cópia da
 * frase digitada pelo aluno mais abaixo não pode esconder o texto dele.
 * @param {string[]} textos
 * @private
 */
function _indiceDoMarcador(textos) {
  const alvo = _normalizarComparacao(MARCADOR_INICIO_ALUNO);
  for (let i = 0; i < textos.length; i++) {
    if (_normalizarComparacao(textos[i]) === alvo) return i;
  }
  return -1;
}

/** Quantas linhas são exatamente o marcador. @private */
function _contarMarcadores(textos) {
  const alvo = _normalizarComparacao(MARCADOR_INICIO_ALUNO);
  return textos.filter(t => _normalizarComparacao(t) === alvo).length;
}

/**
 * Linha de base gravada (hashes dos parágrafos do modelo), ou null.
 * @returns {{ set: Object<string, boolean>, fonte: string }|null}
 * @private
 */
function _lerLinhaDeBase() {
  try {
    const props = PropertiesService.getDocumentProperties();
    const raw = props.getProperty(DOC_PROP_BASELINE);
    if (!raw) return null;
    const base = JSON.parse(raw);
    if (!base || !base.length) return null;
    const set = {};
    base.forEach(function(h) { set[h] = true; });
    return { set: set, fonte: props.getProperty(DOC_PROP_BASELINE_FONTE) || 'abertura' };
  } catch (e) {
    Logger.log('[Whitebox] Linha de base ilegível: ' + e);
    return null;
  }
}

/**
 * Para cada parágrafo, true se ele veio do modelo (não foi escrito pelo aluno):
 *   1. com linha de base: o parágrafo está na base E fica acima do (primeiro) marcador,
 *      quando há marcador. Texto novo acima do marcador conta como do aluno;
 *   2. sem base e com marcador: tudo até o primeiro marcador, inclusive (documento mestre);
 *   3. sem nenhum dos dois: nada (conta o documento inteiro).
 * Linhas iguais ao marcador são sempre do modelo; só a primeira separa modelo e aluno.
 *
 * @param {string[]} textos - texto de cada parágrafo
 * @returns {boolean[]}
 */
function _mascaraDoModelo(textos) {
  const marcador = _indiceDoMarcador(textos);
  const alvo = _normalizarComparacao(MARCADOR_INICIO_ALUNO);
  const base = _lerLinhaDeBase();
  if (base) {
    return textos.map(function(t, i) {
      if (i === marcador || _normalizarComparacao(t) === alvo) return true;
      if (marcador !== -1 && i > marcador) return false;
      const h = _hashParagrafo(t);
      return !!h && !!base.set[h];
    });
  }
  // Linhas iguais ao marcador (inclusive cópias abaixo) nunca contam como texto do aluno.
  if (marcador !== -1) return textos.map((t, i) => i <= marcador || _normalizarComparacao(t) === alvo);
  return textos.map(() => false);
}

/**
 * Texto (um parágrafo por linha) da PRIMEIRA revisão do documento no Drive: na cópia do
 * aluno, é o modelo como foi distribuído. null quando o Drive não deixa ler (escopo
 * drive.file não cobre a cópia, sem revisões, sem rede).
 * @private
 */
function _textosDaPrimeiraRevisao(docId) {
  try {
    const resp = Drive.Revisions.list(docId, { fields: 'revisions(id,modifiedTime,exportLinks)' });
    const revs = resp && resp.revisions;
    const link = revs && revs.length && revs[0].exportLinks && revs[0].exportLinks['text/plain'];
    if (!link) return null;
    const r = UrlFetchApp.fetch(link, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) return null;
    return r.getContentText().replace(/^﻿/, '').split(/\r?\n/).map(t => t.trim());
  } catch (e) {
    Logger.log('[Whitebox] Primeira revisão indisponível: ' + e);
    return null;
  }
}

/**
 * Grava a linha de base (hashes dos parágrafos do modelo) da cópia do aluno.
 *   - Fonte preferida: a primeira revisão do Drive (o modelo como foi copiado). Assim,
 *     o que o aluno colou antes de abrir o painel não vira "modelo".
 *   - Sem acesso ao Drive: o texto atual, na primeira abertura do painel, e só se o painel
 *     nunca rodou neste documento. O Radar avisa o professor dessa fonte mais fraca.
 * Com marcador, só entra na base o que está acima do primeiro marcador.
 * Nunca lança.
 * @returns {boolean} true se gravou agora
 */
function garantirLinhaDeBase() {
  try {
    const props = PropertiesService.getDocumentProperties();
    if (props.getProperty(DOC_PROP_BASELINE)) return false;
    const doc = DocumentApp.getActiveDocument();
    let textos = _textosDaPrimeiraRevisao(doc.getId());
    let fonte = 'revisao';
    if (!textos) {
      if (props.getProperty('WHITEBOX_PARA_SNAPSHOT') || props.getProperty(DOC_PROP_PASTE_MAP)) return false;
      textos = doc.getBody().getParagraphs().map(p => p.getText().trim());
      fonte = 'abertura';
    }
    const marcador = _indiceDoMarcador(textos);
    if (marcador !== -1) textos = textos.slice(0, marcador);
    const hashes = [];
    textos.forEach(function(t) {
      const h = _hashParagrafo(t);
      if (h && hashes.indexOf(h) === -1) hashes.push(h);
    });
    if (hashes.length === 0) return false;
    // Uma propriedade guarda até 9 KB: um modelo muito longo fica com os primeiros parágrafos.
    let json = JSON.stringify(hashes);
    while (json.length > 8500 && hashes.length > 0) { hashes.pop(); json = JSON.stringify(hashes); }
    props.setProperty(DOC_PROP_BASELINE, json);
    props.setProperty(DOC_PROP_BASELINE_FONTE, fonte);
    return true;
  } catch (e) {
    Logger.log('[Whitebox] garantirLinhaDeBase: ' + e);
    return false;
  }
}

// =====================================================
//  RADAR: estado local (o cálculo fica em RadarCore.gs)
// =====================================================

/**
 * Lê o mapa de alertas do Radar ({ v: 2, a: { <hash>: { e, f, ts, p } } }, ver RadarCore).
 * O formato antigo (chave = índice do parágrafo) é convertido com o texto que está hoje
 * naquela posição, como "alerta antigo" (L): a posição pode ter mudado desde então.
 * Quando converteu, o retorno traz _migrado = true para quem grava persistir a conversão.
 * @private
 */
function _lerMapaRadar(props, textos) {
  let raw = null;
  try { raw = JSON.parse(props.getProperty(DOC_PROP_PASTE_MAP) || 'null'); } catch (e) { raw = null; }
  if (raw && raw.v === 2 && raw.a && typeof raw.a === 'object') return raw;
  const mapa = { v: 2, a: {} };
  if (raw && typeof raw === 'object') {
    Object.keys(raw).forEach(function(k) {
      const t = textos && textos[Number(k)];
      if (t) _registrarAlerta(mapa, t, RADAR_ESTADO_LEGADO, String(raw[k]), 0);
    });
    mapa._migrado = true;
  }
  return mapa;
}

/** radarRegistrarAlerta a partir do texto do parágrafo. @private */
function _registrarAlerta(mapa, texto, estado, fonte, quando) {
  return radarRegistrarAlerta(mapa, radarHash(texto), radarHashPrefixo(texto), estado, fonte, quando);
}

/** Grava o mapa, podado em RADAR_MAPA_MAX. @private */
function _gravarMapaRadar(props, mapa) {
  radarPodarMapa(mapa);
  props.setProperty(DOC_PROP_PASTE_MAP, JSON.stringify({ v: 2, a: mapa.a }));
}

/** radarEstados a partir dos textos. @private */
function _estadosDoRadar(textos, modelo, mapa) {
  return radarEstados(textos.map(radarHash), textos.map(radarHashPrefixo), modelo, mapa);
}

/**
 * Mede os parágrafos, aplica a medição ao estado guardado em DocumentProperties
 * (radarProcessarMedicao) e grava o resultado. Chamada por getDocumentStats() (pulso do
 * aluno) e por getDocumentAuraMap() (professor), sempre dentro de _comTrava.
 *
 * @param {GoogleAppsScript.Document.Paragraph[]} paragraphs
 * @param {boolean[]} [modelo]
 * @param {number} [agora] - ms (para testes)
 * @returns {{conhecidos: boolean[], charsRestaurados: number, colagensNovas: number,
 *            charsColados: number, medicao: object}}
 */
function _checkAndUpdatePasteSnapshot(paragraphs, modelo, agora) {
  const props  = PropertiesService.getDocumentProperties();
  agora        = (typeof agora === 'number') ? agora : Date.now();
  const textos = paragraphs.map(p => p.getText().trim());
  modelo       = modelo || _mascaraDoModelo(textos);
  const med    = radarMedicao(textos, modelo, agora);

  const lerJson = function(chave, padrao) {
    try { const v = JSON.parse(props.getProperty(chave) || 'null'); return v === null ? padrao : v; }
    catch (e) { return padrao; }
  };
  const tsRaw  = props.getProperty(DOC_PROP_SNAPSHOT_TS);
  const estado = {
    antL:   lerJson('WHITEBOX_PARA_SNAPSHOT', null),
    antH:   lerJson(DOC_PROP_SNAPSHOT_HASHES, null),
    // Sem hora da medição anterior (primeira medição ou versão antiga): não observado.
    ts:     (tsRaw === null || !isFinite(Number(tsRaw))) ? null : Number(tsRaw),
    vistos: lerJson(DOC_PROP_PARAGRAFOS_VISTOS, []),
    mapa:   _lerMapaRadar(props, textos)
  };
  const migrado = !!estado.mapa._migrado;
  const r = radarProcessarMedicao(estado, med);

  try {
    if (r.mapaMudou || migrado) _gravarMapaRadar(props, estado.mapa);
  } catch (e) {
    Logger.log('[Whitebox] mapa do Radar: ' + e);
  }
  if (!r.ignorada) {
    try {
      props.setProperty('WHITEBOX_PARA_SNAPSHOT', JSON.stringify(estado.antL));
      props.setProperty(DOC_PROP_SNAPSHOT_HASHES, JSON.stringify(estado.antH));
      props.setProperty(DOC_PROP_SNAPSHOT_TS, String(estado.ts));
      props.setProperty(DOC_PROP_PARAGRAFOS_VISTOS, JSON.stringify(estado.vistos));
    } catch (e) {
      Logger.log('[Whitebox] snapshot save: ' + e);
    }
  }

  return {
    conhecidos:       r.conhecidos,
    charsRestaurados: r.charsRestaurados,
    colagensNovas:    r.colagensNovas,
    charsColados:     r.charsColados,
    medicao:          med
  };
}

/**
 * Obsoleta. A versão antiga do painel marcava colagem por índice de parágrafo a partir do
 * navegador do aluno (qualquer um podia chamar e marcar o que quisesse). A detecção agora
 * é toda feita em _checkAndUpdatePasteSnapshot. Fica só porque o script do cliente já
 * publicado expõe este nome; não grava nada.
 * @returns {boolean} false
 */
function updatePasteMap() {
  return false;
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
 * Professor do documento: o designado pelo servidor na distribuição. Sem designação,
 * o próprio usuário quando o painel o reconhece como professor (documento mestre);
 * senão o dono da pasta, se o Drive o informou — na cópia do Classroom, o dono do
 * arquivo e da pasta é o aluno; sem Drive, item3.professorEmail é 'NAO_IDENTIFICADO'.
 *
 * @param {string} userEmail
 * @param {object} ctx   - getContext()
 * @param {object} item3 - getAdvancedItem3Data()
 * @returns {string} e-mail (pode ser 'NAO_IDENTIFICADO' quando nada foi resolvido)
 */
function resolverProfessorDoDocumento(userEmail, ctx, item3) {
  const designado = getDesignatedProfessor((userEmail || '').trim().toLowerCase());
  const donoPasta = (item3.professorEmail && item3.professorEmail !== 'NAO_IDENTIFICADO')
                    ? item3.professorEmail : null;
  return designado ||
         (ctx.initialRole === 'teacher' ? userEmail : null) ||
         donoPasta || userEmail;
}

/**
 * Resumo da telemetria deste documento para o card "Relatório de processo".
 * O servidor filtra pelo e-mail verificado: o aluno recebe só o próprio bloco; o
 * professor do documento (cadastrado e Ativo) recebe um bloco por aluno.
 *
 * @returns {{ registros: number, alunos: Array }|{ error: string, message: string }}
 */
function getProcessReport(opcoes) {
  const userEmail      = Session.getActiveUser().getEmail();
  const professorEmail = resolverProfessorDoDocumento(userEmail, getContext(), getAdvancedItem3Data());
  if (!professorEmail || professorEmail === 'NAO_IDENTIFICADO') {
    return { error: 'PROFESSOR_NAO_IDENTIFICADO', message: 'Não foi possível identificar o professor deste documento.' };
  }
  // todosDocumentos: o professor vê as cópias de todos os alunos a partir do documento mestre,
  // sem autorizar o painel em cada cópia. O servidor só atende se o chamador for o professor.
  return callProxy(ROUTE_RESUMO_PROCESSO, {
    professorEmail:  professorEmail,
    docId:           DocumentApp.getActiveDocument().getId(),
    todosDocumentos: !!(opcoes && opcoes.todosDocumentos)
  });
}

/**
 * Envia dados para análise no Brain Proxy (substitui sendToBackend)
 * Chamado tanto para log de métricas quanto para análise de trecho
 */
function sendToBackend(payload) {
  const item3  = getAdvancedItem3Data();
  const userEmail      = Session.getActiveUser().getEmail();
  const ctx            = getContext();
  const professorEmail = resolverProfessorDoDocumento(userEmail, ctx, item3);

  // Medições do Radar (hashes e tamanhos, sem texto): só guardar no servidor. Vem por aqui,
  // e não por uma função nova, para não exigir atualizar o script do cliente.
  if (payload && Array.isArray(payload.medicoes)) {
    if (!professorEmail || professorEmail === 'NAO_IDENTIFICADO') {
      return { error: 'PROFESSOR_NAO_IDENTIFICADO', message: 'Não foi possível identificar o professor deste documento.' };
    }
    return callProxy(ROUTE_REGISTRAR_MEDICOES, {
      professorEmail: professorEmail,
      docId:          DocumentApp.getActiveDocument().getId(),
      medicoes:       payload.medicoes
    });
  }
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

  // O painel do aluno chama isto a cada envio de métricas: sem cache, seriam três leituras
  // do Drive (arquivo, pasta, revisões) por envio. A pasta e o dono mudam raramente.
  const chaveCache = 'ITEM3_' + docId + '_' + email;
  let cache = null;
  try {
    cache = CacheService.getDocumentCache();
    const guardado = JSON.parse(cache.get(chaveCache) || 'null');
    if (guardado && typeof guardado === 'object' && 'driveAccess' in guardado) return guardado;
  } catch (e) {
    cache = cache || null;
  }
  const dados = _lerItem3(docId, email);
  try { if (cache) cache.put(chaveCache, JSON.stringify(dados), 600); } catch (e) {}
  return dados;
}

/** Lê do Drive a pasta, o dono da pasta e o número de revisões. @private */
function _lerItem3(docId, email) {
  let gradeLevel    = 'NAO_IDENTIFICADO';
  // A escola vem do cadastro do professor no servidor (Instituicao), nunca do domínio do
  // e-mail: contas @gmail não dizem a escola. Campo mantido por compatibilidade.
  let institutionId = 'NAO_IDENTIFICADO';
  let professorEmail = 'NAO_IDENTIFICADO';
  let revisionsCount = 0;
  // true só quando arquivo, pasta e revisões foram lidos. false = o escopo drive.file
  // não cobriu este documento: campos degradados (degradação explícita, não erro).
  let driveAccess    = false;

  try {
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
//  RADAR DE ESFORÇO
// =====================================================

/**
 * Radar de Esforço do documento atual, para o painel do professor.
 *
 * A cor de cada parágrafo mostra só evidência de processo (RADAR_ESTADO_*): colagem
 * detectada, colagem depois editada, escrito com o painel fechado (não observado) ou sem
 * alerta. O tamanho do parágrafo não entra. "Sem alerta" não prova autoria: texto
 * redigitado à mão, por exemplo, não é detectado.
 *
 * @returns {{
 *   segmentos: Array<{index:number, estado:string, fonte:string|null, ts:number, charCount:number, preview:string}>,
 *   resumo: {total:number, S:number, C:number, E:number, N:number, L:number},
 *   avisos: string[]
 * }}
 */
function getDocumentAuraMap() {
  const doc        = DocumentApp.getActiveDocument();
  const paragraphs = doc.getBody().getParagraphs();
  const docId      = doc.getId();
  const textos     = paragraphs.map(p => p.getText().trim());
  const props      = PropertiesService.getDocumentProperties();

  // Parágrafos do modelo ficam fora do Radar: no documento mestre ele fica vazio.
  const modelo = _mascaraDoModelo(textos);
  // Antes da medição abaixo: ela cria o snapshot e apagaria o sinal de "painel nunca rodou".
  const painelJaRodou = !!props.getProperty(DOC_PROP_SNAPSHOT_TS);

  _comTrava(function() {
    _checkAndUpdatePasteSnapshot(paragraphs, modelo);
    try {
      _detectPasteFromRevisions(docId, textos, modelo);
    } catch (e) {
      Logger.log('[Whitebox] getDocumentAuraMap: revisões: ' + e);
    }
  });

  const avisos = [];
  const local  = _lerMapaRadar(props, textos);
  // Documento mestre ou cópia ainda sem texto do aluno: nada a buscar no servidor.
  const temTextoDoAluno = textos.some((t, i) => t && !modelo[i]);
  const doServidor = temTextoDoAluno ? _radarDoServidor(docId) : { aluno: null, outros: [], erro: null, pulado: true };
  // Nenhuma medição do aluno em lugar nenhum: o servidor respondeu sem histórico, ou nem o
  // painel local rodou. Sem isso o texto todo apareceria sem alerta, como se observado.
  const nuncaObservado = temTextoDoAluno && !doServidor.aluno &&
    ((!doServidor.pulado && !doServidor.erro) || !painelJaRodou);
  let mapa;
  if (doServidor.aluno) {
    // Fonte principal: o histórico do servidor, que o aluno não altera. Do mapa local só
    // entram as colagens achadas no histórico de revisões do Drive.
    mapa = { v: 2, a: Object.assign({}, doServidor.aluno.mapa.a) };
    Object.keys(local.a).forEach(function(h) {
      const it = local.a[h];
      if (it.f === 'revisao') radarRegistrarAlerta(mapa, h, it.p, it.e, it.f, it.ts);
    });
    avisos.push(_avisoFonteServidor(doServidor));
  } else {
    mapa = local;
    if (nuncaObservado) {
      avisos.push('O painel do aluno nunca registrou a escrita deste documento (não foi aberto ou o ' +
                  'add-on não está instalado para ele). Todo o texto aparece como não observado.');
    } else if (doServidor.erro) {
      avisos.push('Não foi possível ler o histórico do servidor (' + doServidor.erro + '). O radar abaixo usa só ' +
                  'os dados guardados no documento, que o aluno pode alterar.');
    }
  }
  const estados  = _estadosDoRadar(textos, modelo, mapa).filter(Boolean);
  if (nuncaObservado) {
    estados.forEach(function(e) {
      if (e.estado === RADAR_ESTADO_SEM_ALERTA) { e.estado = RADAR_ESTADO_NAO_OBSERVADO; e.fonte = 'nunca_observado'; }
    });
  }
  const resumo   = { total: estados.length, S: 0, C: 0, E: 0, N: 0, L: 0 };
  const segmentos = estados.map(function(e) {
    resumo[e.estado] = (resumo[e.estado] || 0) + 1;
    return {
      index:     e.index,
      estado:    e.estado,
      fonte:     e.fonte,
      ts:        e.ts,
      charCount: textos[e.index].length,
      preview:   textos[e.index].substring(0, 60)
    };
  });

  const marcadores = _contarMarcadores(textos);
  if (marcadores > 1) {
    avisos.push('A linha "' + MARCADOR_INICIO_ALUNO + '" aparece ' + marcadores +
                ' vezes. Só a primeira separa o modelo do texto do aluno.');
  }
  if (props.getProperty(DOC_PROP_BASELINE) && props.getProperty(DOC_PROP_BASELINE_FONTE) !== 'revisao') {
    avisos.push('O texto do modelo foi reconhecido na primeira vez que o aluno abriu o painel, ' +
                'sem o histórico do Drive. Algo colado antes disso pode ter sido tratado como modelo.');
  }
  if (resumo.L > 0) {
    avisos.push(resumo.L + ' alerta(s) vêm da versão anterior do painel, que guardava a posição ' +
                'do parágrafo: confira o trecho antes de concluir algo.');
  }

  // Parte do texto que o painel não viu ser escrita (estado N): painel fechado, aluno sem
  // abrir o painel ou add-on não instalado. Não é acusação, é falta de evidência.
  const charsTotal = segmentos.reduce((s, g) => s + g.charCount, 0);
  const charsN     = segmentos.reduce((s, g) => s + (g.estado === RADAR_ESTADO_NAO_OBSERVADO ? g.charCount : 0), 0);
  resumo.naoObservadoPct = charsTotal > 0 ? Math.round(100 * charsN / charsTotal) : 0;
  if (!nuncaObservado && resumo.naoObservadoPct >= RADAR_AVISO_NAO_OBSERVADO_PCT) {
    avisos.push(resumo.naoObservadoPct + '% do texto do aluno apareceu sem o painel observar ' +
                '(painel fechado ou nunca aberto). Para esse trecho o radar não tem evidência de processo.');
  }

  return { segmentos: segmentos, resumo: resumo, avisos: avisos };
}

/**
 * Etapa 3 do Radar: compartilha este documento, como LEITOR, com a conta do servidor, para
 * o servidor conferir as medições com o histórico de revisões do Drive usando a conta dele.
 * Document.addViewer usa só o escopo documents.currentonly que o painel já tem: nada de
 * escopo restrito (regra do projeto). A conta vem da resposta do servidor (URL fixa em
 * BRAIN_PROXY_URL). Nunca lança.
 * @param {string} conta - e-mail da conta do servidor
 * @returns {{ ok: boolean, jaTinha?: boolean, erro?: string }}
 */
function compartilharComServidor(conta) {
  conta = String(conta || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(conta)) return { ok: false, erro: 'CONTA_INVALIDA' };
  try {
    const doc = DocumentApp.getActiveDocument();
    const ja = doc.getViewers().concat(doc.getEditors())
      .some(u => String(u.getEmail() || '').toLowerCase() === conta);
    if (!ja) doc.addViewer(conta);
    PropertiesService.getDocumentProperties().setProperty(DOC_PROP_SERVIDOR_COMPARTILHADO, conta);
    return { ok: true, jaTinha: ja };
  } catch (e) {
    // Ex.: a escola bloqueia compartilhar com contas de fora do domínio.
    Logger.log('[Whitebox] compartilharComServidor: ' + e);
    return { ok: false, erro: String(e && e.message || e) };
  }
}

/**
 * Radar guardado no servidor para este documento (rota radar_documento). Usa o aluno com
 * mais medições; outros e-mails que mandaram medições para o mesmo documento viram aviso.
 * @returns {{ aluno: object|null, outros: string[], erro: string|null }}
 * @private
 */
function _radarDoServidor(docId) {
  try {
    const userEmail      = Session.getActiveUser().getEmail();
    const professorEmail = resolverProfessorDoDocumento(userEmail, getContext(), getAdvancedItem3Data());
    if (!professorEmail || professorEmail === 'NAO_IDENTIFICADO') return { aluno: null, outros: [], erro: 'professor não identificado' };
    const res = callProxy(ROUTE_RADAR_DOCUMENTO, { professorEmail: professorEmail, docId: docId });
    if (!res || res.error) return { aluno: null, outros: [], erro: (res && (res.message || res.error)) || 'sem resposta' };
    const alunos = (res.alunos || []).filter(a => a && a.mapa && a.mapa.a);
    if (alunos.length === 0) return { aluno: null, outros: [], erro: null };
    const aluno = alunos[0];
    // Etapa 3: o servidor ainda não lê as revisões desta cópia. O professor (editor)
    // compartilha com a conta do servidor, caso o painel do aluno não tenha conseguido.
    let compartilhou = null;
    if ((!aluno.revisoes || aluno.revisoes.acesso !== 'ok') && res.contaServidor) {
      compartilhou = compartilharComServidor(res.contaServidor);
    }
    return { aluno: aluno, outros: alunos.slice(1).map(a => a.email), erro: null, compartilhou: compartilhou };
  } catch (e) {
    Logger.log('[Whitebox] _radarDoServidor: ' + e);
    return { aluno: null, outros: [], erro: String(e && e.message || e) };
  }
}

/** Texto do aviso que diz de onde veio o radar. @private */
function _avisoFonteServidor(r) {
  const a = r.aluno;
  const data = iso => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '?' : Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM HH:mm');
  };
  let txt = 'Histórico do servidor: ' + a.medicoes + ' medição(ões) do painel de ' + a.email +
            (a.primeira ? ', de ' + data(a.primeira) + ' a ' + data(a.ultima) : '') + '.';
  if (a.inconsistencias > 0) {
    txt += ' ' + a.inconsistencias + ' medição(ões) descartada(s) por horário inconsistente ' +
           '(relógio errado ou envio forjado).';
  }
  if (r.outros.length > 0) txt += ' Outros e-mails também enviaram medições deste documento: ' + r.outros.join(', ') + '.';
  const rv = a.revisoes;
  if (rv && rv.acesso === 'ok') {
    txt += ' O servidor conferiu ' + rv.lidas + ' revisão(ões) do Drive' +
           (rv.em ? ' (última conferência ' + data(rv.em) + ')' : '') + ': ' +
           (rv.divergencias > 0
             ? rv.divergencias + ' divergência(s) entre o texto das revisões e as medições do painel ' +
               '(medição forjada, painel adulterado ou texto mexido sem o painel). Veja a aba Radar_Eventos.'
             : 'as medições batem com as revisões.');
  } else if (r.compartilhou && r.compartilhou.ok) {
    txt += ' A cópia acabou de ser compartilhada com o servidor; a conferência pelas revisões do Drive ' +
           'aparece na próxima abertura do radar (em até 10 min).';
  } else {
    txt += ' O servidor ainda não consegue ler as revisões desta cópia no Drive' +
           (r.compartilhou && r.compartilhou.erro ? ' (o compartilhamento falhou: ' + r.compartilhou.erro + ')' : '') +
           ', então as medições não foram conferidas. Se a escola bloqueia compartilhar com contas de fora, ' +
           'veja a etapa 3 em whitebox-server/DEPLOY.md.';
  }
  if (a.origem === 'addon') {
    txt += ' As medições vieram do add-on do Whitebox, que o aluno não edita.';
  } else if (a.origem) {
    txt += ' As medições vieram do script copiado com o documento, que o aluno pode editar.';
  }
  return txt;
}

// =====================================================
//  RADAR: colagens vistas no histórico de revisões do Drive
// =====================================================

/** Impressão de um parágrafo para comparar com o texto exportado de uma revisão. @private */
function _impressaoRevisao(texto) {
  const n = _normalizarComparacao(texto);
  return n.length >= 60 ? n.substring(0, 60) : '';
}

/** @private */
function _conjuntoImpressoes(textoExportado) {
  const set = {};
  String(textoExportado || '').split(/\r?\n/).forEach(function(linha) {
    const fp = _impressaoRevisao(linha);
    if (fp) set[fp] = true;
  });
  return set;
}

/**
 * Procura, nas últimas 20 revisões do Drive, parágrafos do aluno que surgiram entre duas
 * revisões num ritmo impossível para digitação (RADAR_CPS_COLAGEM por segundo, contando o
 * tempo entre as revisões). O Drive agrupa revisões: intervalo longo dá ritmo baixo e não
 * marca nada. Um parágrafo que já existia numa revisão anterior (restaurar versão) não é
 * marcado. Resultado em cache por 30 min; sem acesso ao Drive, não tenta de novo nesse tempo.
 * @private
 */
function _detectPasteFromRevisions(docId, textos, modelo) {
  const cache    = CacheService.getDocumentCache();
  const cacheKey = 'REV_DIFF_DONE_' + docId;
  if (cache.get(cacheKey)) return;
  try {
    const resp = Drive.Revisions.list(docId, { fields: 'revisions(id,modifiedTime,exportLinks)' });
    const revs = (resp && resp.revisions) || [];
    const janela = revs.slice(Math.max(0, revs.length - 20));
    const token = ScriptApp.getOAuthToken();
    const reqs = [], tempos = [];
    janela.forEach(function(rev) {
      if (rev.exportLinks && rev.exportLinks['text/plain']) {
        reqs.push({
          url: rev.exportLinks['text/plain'],
          method: 'get',
          headers: { Authorization: 'Bearer ' + token },
          muteHttpExceptions: true
        });
        tempos.push(Date.parse(rev.modifiedTime || rev.modifiedDate || '') || 0);
      }
    });
    if (reqs.length >= 2) {
      const resps = UrlFetchApp.fetchAll(reqs);
      const alvo = {};
      textos.forEach(function(t, i) {
        if (!t || modelo[i]) return;
        const fp = _impressaoRevisao(t);
        if (fp) (alvo[fp] = alvo[fp] || []).push(i);
      });
      const props = PropertiesService.getDocumentProperties();
      const mapa  = _lerMapaRadar(props, textos);
      let dirty   = !!mapa._migrado;
      const jaVistas = {};
      let anterior = null;
      for (let j = 0; j < resps.length; j++) {
        if (resps[j].getResponseCode() !== 200) continue;
        const texto = resps[j].getContentText();
        const fps   = _conjuntoImpressoes(texto);
        if (anterior && tempos[j] && anterior.t) {
          const cresc   = texto.length - anterior.len;
          const minutos = (tempos[j] - anterior.t) / 60000;
          const ritmo   = minutos > 0 ? cresc / minutos : 0;
          if (cresc >= RADAR_CRESCIMENTO_MIN && ritmo >= RADAR_CPS_COLAGEM * 60) {
            Object.keys(fps).forEach(function(fp) {
              if (jaVistas[fp] || !alvo[fp]) return;
              alvo[fp].forEach(function(i) {
                if (_registrarAlerta(mapa, textos[i], RADAR_ESTADO_COLAGEM, 'revisao', tempos[j])) dirty = true;
              });
            });
          }
        }
        Object.keys(fps).forEach(function(fp) { jaVistas[fp] = true; });
        anterior = { len: texto.length, t: tempos[j] };
      }
      if (dirty) _gravarMapaRadar(props, mapa);
    }
  } catch (e) {
    Logger.log('[Whitebox] _detectPasteFromRevisions (sem acesso ao Drive?): ' + e);
  }
  try { cache.put(cacheKey, '1', 1800); } catch (cacheErr) {}
}

/**
 * Leva o cursor do professor ao início do parágrafo (rola o documento até ele). Não
 * seleciona o texto: com a seleção, uma tecla digitada em seguida apagaria o parágrafo.
 * @returns {boolean} true se posicionou
 */
function scrollToParagraph(paragraphIndex) {
  const doc        = DocumentApp.getActiveDocument();
  const paragraphs = doc.getBody().getParagraphs();
  const i = Number(paragraphIndex);
  if (!(i >= 0 && i < paragraphs.length)) return false;
  const alvo = paragraphs[i];
  try {
    const pos = alvo.getNumChildren() > 0 ? doc.newPosition(alvo.getChild(0), 0) : doc.newPosition(alvo, 0);
    doc.setCursor(pos);
    return true;
  } catch (e) {
    Logger.log('[Whitebox] scrollToParagraph: ' + e);
    return false;
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
