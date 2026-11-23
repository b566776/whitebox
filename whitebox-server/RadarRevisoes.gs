/**
 * =====================================================
 *  Whitebox — RadarRevisoes.gs (etapa 3: conferência pelas revisões do Drive)
 * =====================================================
 *
 * As medições do Radar vêm do painel do aluno, e um aluno que edite o script da própria
 * cópia pode forjar medições daqui para a frente. O histórico de revisões do Drive não
 * passa pelo aluno: o servidor lê as revisões da cópia com a PRÓPRIA conta (Web App
 * executado como USER_DEPLOYING; os usuários não autorizam os escopos do servidor) e:
 *   1. marca colagens vistas entre duas revisões (fonte 'revisao_servidor'), com as mesmas
 *      regras de ritmo do painel (RadarCore.gs);
 *   2. compara o tamanho do texto de cada revisão com a medição mais próxima recebida do
 *      painel. Diferença grande = divergência (medição forjada, painel adulterado ou
 *      texto mexido sem o painel);
 *   3. medição suprimida: um parágrafo ficou igual em duas revisões com 1 min ou mais
 *      entre elas, o painel mandou medições nesse intervalo e nenhuma delas tinha esse
 *      parágrafo. Vira "não observado" (fonte 'revisao_nao_medido'): sinal de medições
 *      escondidas ou forjadas.
 *
 * Acesso: a conta do servidor precisa ser leitora da cópia. O painel do aluno (ou o do
 * professor) compartilha a cópia com ela por Document.addViewer, que só usa o escopo
 * documents.currentonly que o painel já tem. Nenhum escopo restrito entra na biblioteca
 * nem no cliente (regra do projeto). Sem acesso, o professor vê o aviso.
 */

/** Revisões lidas por conferência (as mais recentes). */
const RADAR_REV_MAX = 20;
/** Intervalo mínimo entre conferências do mesmo documento disparadas pelo painel do aluno. */
const RADAR_REV_INTERVALO_MS = 30 * 60 * 1000;
/** Intervalo quando a conferência anterior ficou sem acesso (o painel acabou de compartilhar). */
const RADAR_REV_INTERVALO_SEM_ACESSO_MS = 5 * 60 * 1000;
/** Intervalo mínimo quando quem pede é o radar do professor. */
const RADAR_REV_INTERVALO_PROFESSOR_MS = 10 * 60 * 1000;
/** Pontos guardados do histórico de tamanhos (uma entrada por medição com mudança). */
const RADAR_HIST_MAX = 800;
/** Distância máxima entre uma revisão e a medição usada para compará-la. */
const RADAR_DIVERGENCIA_JANELA_MS = 3 * 60 * 1000;
/** Divergência = diferença de tamanho acima de max(MIN, FRACAO × maior tamanho). */
const RADAR_DIVERGENCIA_MIN = 200;
const RADAR_DIVERGENCIA_FRACAO = 0.25;
/** Tempo mínimo entre as duas revisões em que um parágrafo aparece igual (medição suprimida). */
const RADAR_SUPRIMIDA_MIN_MS = 60 * 1000;
/** Fonte do alerta de parágrafo que está nas revisões mas nunca veio nas medições. */
const RADAR_FONTE_NAO_MEDIDO = 'revisao_nao_medido';

/** Estado de evento na aba Radar_Eventos para divergências. */
const RADAR_EVENTO_DIVERGENCIA = 'DIVERGENCIA';

/** Linhas de um texto exportado (text/plain), sem BOM e sem espaços nas pontas. */
function radarLinhasDaRevisao(texto) {
  return String(texto || '').replace(/^﻿/, '').split(/\r?\n/).map(s => s.trim());
}

/** Tamanho comparável com a soma de med.l (parágrafos sem espaços nas pontas). */
function radarTamanhoLinhas(linhas) {
  return linhas.reduce((s, l) => s + l.length, 0);
}

/** Guarda [ts, tamanho total] de uma medição com mudança. Altera o estado. */
function radarRegistrarHistorico(estado, med) {
  if (!med || med.igual || !Array.isArray(med.l)) return;
  const hist = estado.hist = Array.isArray(estado.hist) ? estado.hist : [];
  hist.push([med.ts, med.l.reduce((s, x) => s + (Number(x) || 0), 0)]);
  if (hist.length > RADAR_HIST_MAX) hist.splice(0, hist.length - RADAR_HIST_MAX);
}

/** Medição do histórico mais próxima de ts dentro da janela, ou null. */
function radarMedicaoMaisProxima(hist, ts) {
  let melhor = null;
  (hist || []).forEach(function(p) {
    const d = Math.abs(p[0] - ts);
    if (d <= RADAR_DIVERGENCIA_JANELA_MS && (!melhor || d < melhor.d)) melhor = { d: d, ts: p[0], tam: p[1] };
  });
  return melhor;
}

/**
 * Analisa revisões (puro, testável). Altera o estado: mapa de alertas e estado.rv.
 *
 * @param {object} estado    - estado do Radar no servidor (com hist)
 * @param {Array<{id: string, ts: number, texto: string}>} revisoes - em ordem de horário
 * @param {number} agora
 * @returns {{ novas: number, eventos: Array, divergencias: number, suprimidas: number }}
 */
function radarAnalisarRevisoes(estado, revisoes, agora) {
  const rv = estado.rv = Object.assign({ ultimoTs: 0, lidas: 0, divergencias: 0, suprimidas: 0 }, estado.rv || {});
  const res = { novas: 0, eventos: [], divergencias: 0, suprimidas: 0 };
  const revs = (revisoes || []).filter(r => r && isFinite(r.ts)).sort((a, b) => a.ts - b.ts);
  const vistos = {};
  const primeiraVez = {};   // hash -> horário da primeira revisão da janela em que apareceu
  // Hashes que o painel já mandou (vistos guarda os parágrafos medidos; antH, a última medição).
  const medidos = {};
  (estado.vistos || []).concat(estado.antH || []).forEach(function(h) { if (h) medidos[h] = true; });
  const medicaoEntre = (a, b) => (estado.hist || []).some(p => p[0] > a && p[0] < b);
  let anterior = null;

  revs.forEach(function(rev) {
    const linhas = radarLinhasDaRevisao(rev.texto);
    const tam    = radarTamanhoLinhas(linhas);
    const nova   = rev.ts > rv.ultimoTs;

    if (nova) {
      res.novas++;
      // Colagem entre duas revisões: cresceu mais rápido do que se digita.
      if (anterior) {
        const cresc = tam - anterior.tam;
        const seg   = (rev.ts - anterior.ts) / 1000;
        if (cresc >= Math.max(RADAR_CRESCIMENTO_MIN, RADAR_CPS_COLAGEM * seg)) {
          linhas.forEach(function(l) {
            const h = radarHash(l);
            if (!l || vistos[h] || l.length < RADAR_CRESCIMENTO_MIN_PARAGRAFO) return;
            if (radarRegistrarAlerta(estado.mapa, h, radarHashPrefixo(l), RADAR_ESTADO_COLAGEM, 'revisao_servidor', rev.ts)) {
              res.eventos.push({ estado: RADAR_ESTADO_COLAGEM, h: h, ts: rev.ts, crescimento: cresc,
                                 decorridoMs: rev.ts - anterior.ts });
            }
          });
        }
      }
      // Medição suprimida: parágrafo igual em duas revisões, painel medindo no intervalo,
      // e nenhuma medição com ele.
      linhas.forEach(function(l) {
        if (!l || l.length < RADAR_CRESCIMENTO_MIN_PARAGRAFO) return;
        const h = radarHash(l), desde = primeiraVez[h];
        if (desde === undefined || medidos[h] || rev.ts - desde < RADAR_SUPRIMIDA_MIN_MS) return;
        if (!medicaoEntre(desde, rev.ts)) return;
        if (radarRegistrarAlerta(estado.mapa, h, radarHashPrefixo(l), RADAR_ESTADO_NAO_OBSERVADO, RADAR_FONTE_NAO_MEDIDO, rev.ts)) {
          res.suprimidas++;
          res.eventos.push({ estado: RADAR_ESTADO_NAO_OBSERVADO, h: h, ts: rev.ts, crescimento: l.length,
                             decorridoMs: rev.ts - desde, fonte: RADAR_FONTE_NAO_MEDIDO });
        }
      });
      // Divergência entre a revisão e a medição mais próxima do painel.
      const med = radarMedicaoMaisProxima(estado.hist, rev.ts);
      if (med) {
        const dif = Math.abs(tam - med.tam);
        if (dif > Math.max(RADAR_DIVERGENCIA_MIN, RADAR_DIVERGENCIA_FRACAO * Math.max(tam, med.tam))) {
          res.divergencias++;
          res.eventos.push({ estado: RADAR_EVENTO_DIVERGENCIA, h: rev.id || '', ts: rev.ts,
                             crescimento: tam - med.tam, decorridoMs: rev.ts - med.ts });
        }
      }
    }
    linhas.forEach(function(l) {
      if (!l) return;
      const h = radarHash(l);
      vistos[h] = true;
      if (primeiraVez[h] === undefined) primeiraVez[h] = rev.ts;
    });
    anterior = { ts: rev.ts, tam: tam };
  });

  if (revs.length > 0) rv.ultimoTs = Math.max(rv.ultimoTs, revs[revs.length - 1].ts);
  rv.lidas += res.novas;
  rv.divergencias += res.divergencias;
  rv.suprimidas += res.suprimidas;
  rv.em = agora;
  rv.acesso = 'ok';
  delete rv.erro;
  radarPodarMapa(estado.mapa);
  return res;
}

/** true se já é hora de conferir de novo (puro, testável). */
function radarHoraDeConferir(estado, agora, intervaloMs) {
  const rv = estado && estado.rv;
  if (!rv || !rv.em) return true;
  const intervalo = rv.acesso === 'ok' ? intervaloMs : Math.min(intervaloMs, RADAR_REV_INTERVALO_SEM_ACESSO_MS);
  return agora - rv.em >= intervalo;
}

/**
 * Lê do Drive, com a conta do servidor, as revisões a analisar (a última já analisada,
 * como referência, e as posteriores, até RADAR_REV_MAX).
 * @returns {{ acesso: string, revisoes?: Array, erro?: string }}
 */
function radarLerRevisoesDoDrive(docId, ultimoTs) {
  const token = ScriptApp.getOAuthToken();
  const auth  = { Authorization: 'Bearer ' + token };
  const resp  = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(docId) +
    '/revisions?pageSize=1000&fields=revisions(id,modifiedTime,exportLinks)',
    { headers: auth, muteHttpExceptions: true });
  const code = resp.getResponseCode();
  if (code === 403 || code === 404) return { acesso: 'sem_acesso' };
  if (code !== 200) return { acesso: 'erro', erro: 'Drive respondeu ' + code };

  const todas = (JSON.parse(resp.getContentText()).revisions || [])
    .map(r => ({ id: r.id, ts: Date.parse(r.modifiedTime), link: r.exportLinks && r.exportLinks['text/plain'] }))
    .filter(r => r.link && isFinite(r.ts))
    .sort((a, b) => a.ts - b.ts);
  let ini = todas.findIndex(r => r.ts > (ultimoTs || 0));
  if (ini === -1) return { acesso: 'ok', revisoes: [] };
  ini = Math.max(0, ini - 1);                               // a anterior serve de referência
  const janela = todas.slice(ini).slice(-(RADAR_REV_MAX + 1));
  const resps = UrlFetchApp.fetchAll(janela.map(r => ({ url: r.link, headers: auth, muteHttpExceptions: true })));
  const revisoes = [];
  resps.forEach(function(rr, i) {
    if (rr.getResponseCode() === 200) revisoes.push({ id: janela[i].id, ts: janela[i].ts, texto: rr.getContentText() });
  });
  return { acesso: 'ok', revisoes: revisoes };
}

/**
 * Confere as revisões de um documento e aluno, se já for hora, e grava o resultado.
 * A leitura do Drive fica fora da trava; a gravação relê a linha dentro dela.
 * Nunca lança: a conferência é um extra e não pode derrubar a rota que a chamou.
 * @returns {object|null} estado.rv atualizado, ou null se não conferiu
 */
function radarConferirSeHoraDe(ss, docId, aluno, intervaloMs) {
  try {
    const sheet = ss.getSheetByName(SHEET_RADAR_ESTADO);
    if (!sheet) return null;
    const linha = _radarLinhasDoDocumento(sheet, docId)[aluno];
    if (!linha) return null;
    const agora = Date.now();
    let estado = _radarLerEstadoDaLinha(sheet, linha);
    if (!estado || !radarHoraDeConferir(estado, agora, intervaloMs)) return null;

    const lido = radarLerRevisoesDoDrive(docId, estado.rv && estado.rv.ultimoTs);

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(15000)) return null;
    try {
      estado = _radarLerEstadoDaLinha(sheet, linha) || estado;
      let r = { eventos: [] };
      if (lido.acesso === 'ok') {
        r = radarAnalisarRevisoes(estado, lido.revisoes, agora);
      } else {
        estado.rv = Object.assign({ ultimoTs: 0, lidas: 0, divergencias: 0 }, estado.rv || {},
                                  { em: agora, acesso: lido.acesso, erro: lido.erro || '' });
      }
      const rv = estado.rv;
      sheet.getRange(linha, 8).setValue(JSON.stringify(estado));
      sheet.getRange(linha, 10, 1, 4).setValues([[new Date(agora), rv.lidas, rv.divergencias, rv.acesso]]);
      if (r.eventos.length > 0) {
        const ev = _radarAba(ss, SHEET_RADAR_EVENTOS, RADAR_EVENTOS_HEADERS);
        const linhas = r.eventos.map(e => [
          new Date(agora), docId, aluno, e.estado, e.h, new Date(e.ts), e.crescimento,
          e.decorridoMs >= 0 ? Math.round(e.decorridoMs / 1000) : ''
        ]);
        ev.getRange(ev.getLastRow() + 1, 1, linhas.length, linhas[0].length).setValues(linhas);
      }
      return rv;
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    Logger.log('[RadarRevisoes] Conferência falhou para ' + docId + ': ' + e);
    return null;
  }
}

/** Estado JSON de uma linha de Radar_Estado. @private */
function _radarLerEstadoDaLinha(sheet, linha) {
  try { return JSON.parse(sheet.getRange(linha, 8).getValue() || 'null'); } catch (e) { return null; }
}

/** Conta do servidor (dona do Web App), com quem o painel compartilha a cópia como leitor. */
function radarContaServidor() {
  try { return String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { return ''; }
}
