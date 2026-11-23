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
 */

const RADAR_ESTADO_HEADERS = [
  'DocId', 'Email_Aluno', 'Primeira_Medicao', 'Ultima_Medicao', 'Ultimo_Recebimento',
  'Medicoes', 'Inconsistencias', 'Estado_JSON'
];
const RADAR_EVENTOS_HEADERS = [
  'Recebido_Em', 'DocId', 'Email_Aluno', 'Estado', 'Hash', 'Medido_Em', 'Crescimento', 'Decorrido_s'
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
    if (!med.igual) {
      if (res.primeira === null) res.primeira = med.ts;
      res.ultima = med.ts;
    }
    r.eventos.forEach(function(ev) { res.eventos.push(Object.assign({ ts: med.ts }, ev)); });
  });
  return res;
}

/** Aba com cabeçalho, criada se faltar. @private */
function _radarAba(ss, nome, headers) {
  let sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
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
 * @param {object} body - { professorEmail, docId, medicoes }
 */
function handleRegistrarMedicoes(body, cfg, callerEmail) {
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
  const medicoes = radarValidarMedicoes(body.medicoes);
  if (medicoes.length === 0) return jsonResponse({ success: true, aceitas: 0 });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return jsonResponse({ error: 'OCUPADO', message: 'Servidor ocupado; o painel tenta de novo.' }, 503);
  }
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
      JSON.stringify(r.estado)
    ]];
    if (linha) sheet.getRange(linha, 1, 1, valores[0].length).setValues(valores);
    else sheet.appendRow(valores[0]);

    if (r.eventos.length > 0) {
      const ev = _radarAba(ss, SHEET_RADAR_EVENTOS, RADAR_EVENTOS_HEADERS);
      const linhas = r.eventos.map(e => [
        new Date(agora), docId, aluno, e.estado, e.h, new Date(e.ts), e.crescimento,
        e.decorridoMs >= 0 ? Math.round(e.decorridoMs / 1000) : ''
      ]);
      ev.getRange(ev.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
    }
    return jsonResponse({ success: true, aceitas: r.aceitas, inconsistentes: r.inconsistentes, alertas: r.eventos.length });
  } finally {
    lock.releaseLock();
  }
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
  const sheet = SpreadsheetApp.openById(registro.spreadsheetId).getSheetByName(SHEET_RADAR_ESTADO);
  if (!sheet) return jsonResponse({ alunos: [] });

  const linhas = _radarLinhasDoDocumento(sheet, docId);
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
      mapa:            (estado && estado.mapa) || { v: 2, a: {} }
    };
  }).sort((a, b) => b.medicoes - a.medicoes);
  return jsonResponse({ alunos: alunos });
}
