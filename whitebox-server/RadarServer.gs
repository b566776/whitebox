/**
 * =====================================================
 *  Whitebox — RadarServer.gs (histórico do Radar no servidor)
 * =====================================================
 *
 * O painel do aluno manda, a cada ~2 min, as medições dos parágrafos (hashes e tamanhos,
 * sem o texto). O servidor aplica cada medição com o mesmo núcleo da biblioteca
 * (RadarCore.gs) e guarda o estado na planilha do professor:
 *   - Radar_Estado: uma linha por documento e aluno, com o estado em JSON;
 *   - Radar_Eventos: uma linha por alerta, só acrescentada (trilha de auditoria).
 * O aluno é dono da cópia e do script vinculado e pode apagar o que fica no documento,
 * mas não o que já está aqui. O professor lê este histórico pela rota radar_documento.
 *
 * Origem: nas escolas em modo 'addon' (Escolas.gs), só o add-on publicado manda medições;
 * o script vinculado (que o aluno pode editar) é recusado. Ultima_Origem guarda de onde
 * veio o último envio aceito ('addon' ou 'script_vinculado').
 */

const RADAR_ESTADO_HEADERS = [
  'DocId', 'Email_Aluno', 'Primeira_Medicao', 'Ultima_Medicao', 'Ultimo_Recebimento',
  'Medicoes', 'Inconsistencias', 'Estado_JSON', 'Ultima_Origem',
  // Etapa 3 (RadarRevisoes.gs): conferência pelas revisões do Drive
  'Revisoes_Conferidas_Em', 'Revisoes_Lidas', 'Divergencias', 'Acesso_Revisoes'
];
const RADAR_EVENTOS_HEADERS = [
  'Recebido_Em', 'DocId', 'Email_Aluno', 'Estado', 'Hash', 'Medido_Em', 'Crescimento', 'Decorrido_s',
  // Fonte: medicao | painel_fechado | revisao_servidor | revisao_nao_medido; Revisao: ID no Drive
  'Fonte', 'Revisao'
];

/** Máximo de medições num envio (o painel manda a cada ~2 min, uma por pulso de 15 s). */
const RADAR_MAX_MEDICOES_POR_ENVIO = 40;
/** Máximo de parágrafos numa medição. */
const RADAR_MAX_PARAGRAFOS = 2000;
/** Tolerância de relógio entre o computador do aluno e o servidor. */
const RADAR_TOLERANCIA_RELOGIO_MS = 2 * 60 * 1000;

/**
 * Valida e normaliza as medições recebidas. Descarta as malformadas.
 * @returns {Array<object>} medições válidas, em ordem de horário
 */
function radarValidarMedicoes(medicoes) {
  if (!Array.isArray(medicoes)) return [];
  const ok = [];
  medicoes.slice(0, RADAR_MAX_MEDICOES_POR_ENVIO).forEach(function(m) {
    if (!m || typeof m !== 'object') return;
    const ts = Number(m.ts);
    if (!isFinite(ts) || ts <= 0) return;
    if (m.igual === true) { ok.push({ ts: ts, igual: true }); return; }
    const h = m.h, l = m.l, ph = m.ph || [], md = m.m || [];
    if (!Array.isArray(h) || !Array.isArray(l) || h.length !== l.length) return;
    if (h.length > RADAR_MAX_PARAGRAFOS) return;
    const curto = x => (typeof x === 'string' && x.length <= 24) ? x : '';
    ok.push({
      ts: ts,
      h:  h.map(curto),
      l:  l.map(x => Math.max(0, Math.min(1e6, Number(x) || 0))),
      ph: h.map((_, i) => curto(ph[i])),
      m:  h.map((_, i) => !!md[i])
    });
  });
  return ok.sort((a, b) => a.ts - b.ts);
}

/**
 * Aplica as medições ao estado salvo (puro, testável).
 *
 * Horários: o servidor não confia no relógio do aluno para "voltar no tempo". Uma medição
 * anterior ao último recebimento (menos a tolerância) ou no futuro é inconsistente: conta
 * em Inconsistencias e é descartada. Assim não dá para, depois de colar, mandar um
 * histórico inventado de digitação lenta datado do passado.
 *
 * @param {object|null} estado     - JSON salvo (null = primeiro envio)
 * @param {Array<object>} medicoes - radarValidarMedicoes()
 * @param {number} agora           - horário do servidor (ms)
 * @param {number|null} ultimoRecebimento - horário do servidor no envio anterior (ms)
 * @returns {{ estado: object, aceitas: number, inconsistentes: number, eventos: Array, primeira: number|null, ultima: number|null }}
 */
function radarAplicarMedicoes(estado, medicoes, agora, ultimoRecebimento) {
  estado = estado || radarEstadoNovo();
  const res = { estado: estado, aceitas: 0, inconsistentes: 0, eventos: [], primeira: null, ultima: null };
  const piso = ultimoRecebimento ? ultimoRecebimento - RADAR_TOLERANCIA_RELOGIO_MS : -Infinity;
  const teto = agora + RADAR_TOLERANCIA_RELOGIO_MS;
  medicoes.forEach(function(med) {
    if (med.ts < piso || med.ts > teto) { res.inconsistentes++; return; }
    const r = radarProcessarMedicao(estado, med);
    if (r.ignorada) { res.inconsistentes++; return; }
    res.aceitas++;
    radarRegistrarHistorico(estado, med);
    if (!med.igual) {
      if (res.primeira === null) res.primeira = med.ts;
      res.ultima = med.ts;
    }
    r.eventos.forEach(function(ev) { res.eventos.push(Object.assign({ ts: med.ts }, ev)); });
  });
  return res;
}

/** Aba com cabeçalho, criada se faltar; cabeçalho antigo ganha as colunas novas. @private */
function _radarAba(ss, nome, headers) {
  let sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return sheet;
  }
  const atual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (headers.some((h, i) => String(atual[i] || '') !== h)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

/** Linha de Radar_Eventos. A fonte padrão vem do estado (eventos das medições). @private */
function _radarLinhaEvento(agora, docId, aluno, e) {
  const fonte = e.fonte || (e.estado === RADAR_ESTADO_COLAGEM ? 'medicao' : 'painel_fechado');
  return [
    new Date(agora), docId, aluno, e.estado, e.h || '', new Date(e.ts), e.crescimento,
    e.decorridoMs >= 0 ? Math.round(e.decorridoMs / 1000) : '', fonte, e.revisao || ''
  ];
}

/** Acrescenta eventos em Radar_Eventos. @private */
function _radarGravarEventos(ss, agora, docId, aluno, eventos) {
  const ev = _radarAba(ss, SHEET_RADAR_EVENTOS, RADAR_EVENTOS_HEADERS);
  const linhas = eventos.map(e => _radarLinhaEvento(agora, docId, aluno, e));
  ev.getRange(ev.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
}

/** Linhas (1-based) de Radar_Estado do documento, por e-mail. @private */
function _radarLinhasDoDocumento(sheet, docId) {
  const ultima = sheet.getLastRow();
  const linhas = {};
  if (ultima < 2) return linhas;
  const vals = sheet.getRange(2, 1, ultima - 1, 2).getValues();
  vals.forEach(function(v, i) {
    if (String(v[0]) === docId) linhas[String(v[1]).toLowerCase()] = i + 2;
  });
  return linhas;
}

/**
 * Rota registrar_medicoes (aberta a alunos). O aluno é sempre o e-mail verificado do
 * chamador, nunca o que vem no corpo.
 * @param {object} body - { professorEmail, docId, medicoes, final? } (final = entrega do trabalho)
 * @param {string} clientId - ID de cliente OAuth do token (verificarTokenOAuth)
 */
function handleRegistrarMedicoes(body, cfg, callerEmail, clientId) {
  const professorEmail = String(body.professorEmail || '').trim().toLowerCase();
  const docId          = String(body.docId || '').trim();
  const aluno          = String(callerEmail || '').trim().toLowerCase();
  if (!professorEmail || !docId || !aluno) {
    return jsonResponse({ error: 'BAD_REQUEST', message: 'professorEmail, docId e usuário são obrigatórios.' }, 400);
  }
  // Professor pré-visualizando a visão do aluno: não é histórico de aluno.
  if (aluno === professorEmail) return jsonResponse({ success: true, ignorado: 'PROFESSOR_NAO_E_ALUNO' });

  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  if (!registro || !registro.spreadsheetId) {
    return jsonResponse({
      error:   'PLANILHA_PROFESSOR_NAO_ENCONTRADA',
      message: 'O professor deste documento não está cadastrado no Whitebox ou ainda não tem planilha de registros.'
    }, 404);
  }
  const escola = configEscola(registro.escola, cfg.adminSpreadsheetId);
  const origem = origemDoRadar(escola, clientId, idsDoAddon());
  if (!origem.ok) return jsonResponse({ error: origem.erro, message: origem.message }, 403);

  const medicoes = radarValidarMedicoes(body.medicoes);
  if (medicoes.length === 0) return jsonResponse({ success: true, aceitas: 0 });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return jsonResponse({ error: 'OCUPADO', message: 'Servidor ocupado; o painel tenta de novo.' }, 503);
  }
  let resposta, ssGravada;
  try {
    const ss      = SpreadsheetApp.openById(registro.spreadsheetId);
    const sheet   = _radarAba(ss, SHEET_RADAR_ESTADO, RADAR_ESTADO_HEADERS);
    const linha   = _radarLinhasDoDocumento(sheet, docId)[aluno] || null;
    const agora   = Date.now();
    let estado = null, primeira = '', ultimoReceb = null, total = 0, inconsist = 0;
    if (linha) {
      const v = sheet.getRange(linha, 1, 1, RADAR_ESTADO_HEADERS.length).getValues()[0];
      primeira    = v[2];
      ultimoReceb = v[4] ? new Date(v[4]).getTime() : null;
      total       = Number(v[5]) || 0;
      inconsist   = Number(v[6]) || 0;
      try { estado = JSON.parse(v[7] || 'null'); } catch (e) { estado = null; }
    }

    const r = radarAplicarMedicoes(estado, medicoes, agora, ultimoReceb);
    const ultimaMed = r.ultima !== null ? new Date(r.ultima) : (linha ? sheet.getRange(linha, 4).getValue() : '');
    const valores = [[
      docId, aluno,
      primeira || (r.primeira !== null ? new Date(r.primeira) : ''),
      ultimaMed,
      new Date(agora),
      total + r.aceitas,
      inconsist + r.inconsistentes,
      radarEstadoJson(r.estado),
      origem.origem
    ]];
    if (linha) sheet.getRange(linha, 1, 1, valores[0].length).setValues(valores);
    else sheet.appendRow(valores[0]);

    if (r.eventos.length > 0) _radarGravarEventos(ss, agora, docId, aluno, r.eventos);
    resposta = { success: true, aceitas: r.aceitas, inconsistentes: r.inconsistentes, alertas: r.eventos.length };
    ssGravada = ss;
  } finally {
    lock.releaseLock();
  }

  // Etapa 3: de vez em quando, e só se o texto mudou, confere as revisões do Drive (fora da
  // trava das medições). Na entrega do trabalho, confere sempre. Desligada
  // (RADAR_REVISOES_ATIVO), não confere nem pede compartilhamento.
  if (!radarRevisoesAtivas()) return jsonResponse(resposta);
  const rv = body.final === true
    ? radarConferirSeHoraDe(ssGravada, docId, aluno, 0)
    : radarConferirSeHoraDe(ssGravada, docId, aluno, RADAR_REV_INTERVALO_MS, { exigirMudanca: true });
  const estadoRv = rv || _radarRvAtual(ssGravada, docId, aluno);
  if (!estadoRv || estadoRv.acesso !== 'ok') {
    // A biblioteca compartilha a cópia (leitor) com a conta que a rota ping informa. Se o
    // servidor já teve acesso, alguém o removeu: o painel do aluno não compartilha de novo
    // em silêncio (o professor vê o evento ACESSO_PERDIDO).
    resposta.precisaAcesso = true;
    resposta.jaTeveAcesso = !!(estadoRv && estadoRv.jaTeveAcesso);
  }
  return jsonResponse(resposta);
}

/** estado.rv salvo para documento e aluno, ou null. @private */
function _radarRvAtual(ss, docId, aluno) {
  const sheet = ss.getSheetByName(SHEET_RADAR_ESTADO);
  const linha = sheet && _radarLinhasDoDocumento(sheet, docId)[aluno];
  const estado = linha ? _radarLerEstadoDaLinha(sheet, linha) : null;
  return (estado && estado.rv) || null;
}

/**
 * Rota radar_documento (só o professor do documento, cadastrado e Ativo: o roteador já
 * exige callerEmail === professorEmail). Devolve, por aluno que mandou medições deste
 * documento, o mapa de alertas e os totais. O painel do professor calcula as cores com
 * os hashes do documento aberto (radarEstados), sem o servidor precisar do texto.
 * @param {object} body - { professorEmail, docId }
 */
function handleRadarDocumento(body, cfg) {
  const professorEmail = String(body.professorEmail || '').trim().toLowerCase();
  const docId          = String(body.docId || '').trim();
  if (!professorEmail || !docId) {
    return jsonResponse({ error: 'BAD_REQUEST', message: 'professorEmail e docId são obrigatórios.' }, 400);
  }
  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  if (!registro || !registro.spreadsheetId) return jsonResponse({ alunos: [] });
  const ss    = SpreadsheetApp.openById(registro.spreadsheetId);
  const sheet = ss.getSheetByName(SHEET_RADAR_ESTADO);
  if (!sheet) return jsonResponse({ alunos: [], modoPainel: _modoPainelDoRegistro(registro, cfg) });

  const linhas = _radarLinhasDoDocumento(sheet, docId);
  const ativas = radarRevisoesAtivas();
  // Etapa 3: o professor abrindo o radar também dispara a conferência pelas revisões, só
  // do aluno que o painel mostra (o de mais medições), para a resposta não demorar.
  const emails = Object.keys(linhas);
  if (ativas && emails.length > 0) {
    const principal = emails.reduce((a, b) =>
      (Number(sheet.getRange(linhas[b], 6).getValue()) || 0) > (Number(sheet.getRange(linhas[a], 6).getValue()) || 0) ? b : a);
    radarConferirSeHoraDe(ss, docId, principal, RADAR_REV_INTERVALO_PROFESSOR_MS);
  }
  const alunos = Object.keys(linhas).map(function(email) {
    const v = sheet.getRange(linhas[email], 1, 1, RADAR_ESTADO_HEADERS.length).getValues()[0];
    let estado = null;
    try { estado = JSON.parse(v[7] || 'null'); } catch (e) { estado = null; }
    const data = x => (x instanceof Date ? x.toISOString() : (x ? String(x) : null));
    return {
      email:           email,
      primeira:        data(v[2]),
      ultima:          data(v[3]),
      medicoes:        Number(v[5]) || 0,
      inconsistencias: Number(v[6]) || 0,
      origem:          String(v[8] || ''),
      revisoes:        !ativas ? { acesso: 'desligada' } : (estado && estado.rv) ? {
        em:           data(v[9]) || (estado.rv.em ? new Date(estado.rv.em).toISOString() : null),
        lidas:        Number(estado.rv.lidas) || 0,
        divergencias: Number(estado.rv.divergencias) || 0,
        suprimidas:   Number(estado.rv.suprimidas) || 0,
        acesso:       String(estado.rv.acesso || '')
      } : null,
      mapa:            (estado && estado.mapa) || { v: 2, a: {} }
    };
  }).sort((a, b) => b.medicoes - a.medicoes);
  return jsonResponse({ alunos: alunos, modoPainel: _modoPainelDoRegistro(registro, cfg),
                        contaServidor: ativas ? radarContaServidor() : '' });
}

/** Modo do painel da escola do professor (Escolas.gs). @private */
function _modoPainelDoRegistro(registro, cfg) {
  return configEscola(registro.escola, cfg.adminSpreadsheetId).modoPainel;
}
