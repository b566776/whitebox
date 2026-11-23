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
 *      regras de ritmo do painel (RadarCore.gs), parágrafo a parágrafo;
 *   2. compara o tamanho do texto de cada revisão com as medições do painel ao redor dela
 *      (antes E depois). Fora da faixa = divergência (medição forjada ou painel adulterado);
 *   3. medição suprimida: um parágrafo ficou igual em duas revisões, o painel mediu no
 *      intervalo, nenhuma medição tinha esse parágrafo E as medições do intervalo são
 *      menores que a revisão em pelo menos o tamanho dele. Vira "não observado" (fonte
 *      'revisao_nao_medido'). A exigência de tamanho evita falso alarme quando o texto
 *      exportado não bate linha a linha com os parágrafos (lista numerada, tabela,
 *      quebra de linha com Shift+Enter): nesses casos os tamanhos batem.
 *
 * Acesso: a conta do servidor precisa ser leitora da cópia. O painel do aluno compartilha a
 * cópia com ela (Document.addViewer, escopo documents.currentonly que o painel já tem) e
 * avisa o aluno. Nenhum escopo restrito entra na biblioteca nem no cliente (regra do
 * projeto).
 *
 * PRIVACIDADE: com acesso, o servidor lê o texto das revisões (não só hashes e tamanhos).
 * Por isso a conferência só liga com a Script Property RADAR_REVISOES_ATIVO = sim, a ser
 * ativada com o servidor numa conta da organização e os termos de uso atualizados.
 */

/** Script Property que liga a conferência (e o pedido de compartilhamento). */
const PROP_RADAR_REVISOES_ATIVO = 'RADAR_REVISOES_ATIVO';
/** Revisões lidas por conferência (as mais recentes). */
const RADAR_REV_MAX = 20;
/** Intervalo mínimo entre conferências do mesmo documento disparadas pelo painel do aluno. */
const RADAR_REV_INTERVALO_MS = 30 * 60 * 1000;
/** Intervalo quando a conferência anterior ficou sem acesso (o painel acabou de compartilhar). */
const RADAR_REV_INTERVALO_SEM_ACESSO_MS = 5 * 60 * 1000;
/** Intervalo mínimo quando quem pede é o radar do professor. */
const RADAR_REV_INTERVALO_PROFESSOR_MS = 10 * 60 * 1000;
/** Pontos guardados do histórico de tamanhos (uma entrada por medição com mudança). */
const RADAR_HIST_MAX = 300;
/** Distância máxima entre uma revisão e as medições usadas para compará-la. */
const RADAR_DIVERGENCIA_JANELA_MS = 3 * 60 * 1000;
/** Divergência = tamanho fora da faixa das medições por mais de max(MIN, FRACAO × tamanho). */
const RADAR_DIVERGENCIA_MIN = 200;
const RADAR_DIVERGENCIA_FRACAO = 0.25;
/** Tempo mínimo entre as duas revisões em que um parágrafo aparece igual (medição suprimida). */
const RADAR_SUPRIMIDA_MIN_MS = 60 * 1000;
/** Fração do tamanho dos parágrafos não medidos que precisa faltar nas medições. */
const RADAR_SUPRIMIDA_FRACAO = 0.8;
/** Teto do Estado_JSON (uma célula aceita 50 mil caracteres). */
const RADAR_ESTADO_JSON_MAX = 45000;
/** Fontes dos alertas e eventos desta conferência. */
const RADAR_FONTE_REVISAO_SERVIDOR = 'revisao_servidor';
const RADAR_FONTE_NAO_MEDIDO = 'revisao_nao_medido';
/** Estados de evento na aba Radar_Eventos. */
const RADAR_EVENTO_DIVERGENCIA = 'DIVERGENCIA';
const RADAR_EVENTO_ACESSO_PERDIDO = 'ACESSO_PERDIDO';

/** Marcador de lista no começo da linha exportada (o getText do parágrafo não o tem). */
const RADAR_PREFIXO_LISTA = /^(?:[*•◦▪●○■\-–]|\d{1,3}[.)]|[a-z][.)]|[ivxlcdm]{1,6}[.)])\s+/i;
/** Âncora de comentário no texto exportado ("[a]") e linha com o conteúdo do comentário. */
const RADAR_ANCORA_COMENTARIO = /\[[a-z]{1,3}\]/g;
const RADAR_LINHA_COMENTARIO = /^\s*\[[a-z]{1,3}\]/;

/** true se a conferência pelas revisões está ligada no servidor. */
function radarRevisoesAtivas() {
  try {
    const v = PropertiesService.getScriptProperties().getProperty(PROP_RADAR_REVISOES_ATIVO) || '';
    return v.trim().toLowerCase() === 'sim';
  } catch (e) {
    return false;
  }
}

/**
 * Linhas de um texto exportado (text/plain), comparáveis com os parágrafos do painel: sem
 * BOM, sem os comentários (âncoras "[a]" e o bloco com o texto deles) e sem vazias.
 * hs/phs são os hashes sem o marcador de lista; tabela = célula exportada com tabulação.
 * @returns {Array<{t:string, l:number, h:string, hs:string, ph:string, phs:string, tabela:boolean}>}
 */
function radarLinhasDaRevisao(texto) {
  return String(texto || '').replace(/^﻿/, '').split(/\r?\n/)
    .filter(s => !RADAR_LINHA_COMENTARIO.test(s))
    .map(s => s.replace(RADAR_ANCORA_COMENTARIO, '').trim())
    .filter(Boolean)
    .map(function(t) {
      const sem = t.replace(RADAR_PREFIXO_LISTA, '');
      return {
        t: t, l: t.length,
        h: radarHash(t), hs: radarHash(sem),
        ph: radarHashPrefixo(t), phs: radarHashPrefixo(sem),
        tabela: t.indexOf('\t') !== -1
      };
    });
}

/** Tamanho comparável com a soma de med.l. */
function radarTamanhoLinhas(linhas) {
  return linhas.reduce((s, x) => s + x.l, 0);
}

/** Guarda [ts, tamanho total] de uma medição com mudança. Altera o estado. */
function radarRegistrarHistorico(estado, med) {
  if (!med || med.igual || !Array.isArray(med.l)) return;
  const hist = estado.hist = Array.isArray(estado.hist) ? estado.hist : [];
  hist.push([med.ts, med.l.reduce((s, x) => s + (Number(x) || 0), 0)]);
  if (hist.length > RADAR_HIST_MAX) hist.splice(0, hist.length - RADAR_HIST_MAX);
}

/**
 * Faixa de tamanhos medidos ao redor de ts: só quando há medição antes E depois dentro da
 * janela (com o painel fechado logo depois da revisão, não compara). null se não há.
 */
function radarFaixaMedida(hist, ts) {
  const perto = (hist || []).filter(p => Math.abs(p[0] - ts) <= RADAR_DIVERGENCIA_JANELA_MS);
  if (!perto.some(p => p[0] <= ts) || !perto.some(p => p[0] >= ts)) return null;
  const tams = perto.map(p => p[1]);
  return { min: Math.min.apply(null, tams), max: Math.max.apply(null, tams) };
}

/** Registra o alerta com o hash da linha e, se diferente, com o hash sem marcador de lista. @private */
function _radarAlertarLinha(mapa, x, estado, fonte, quando) {
  let mudou = radarRegistrarAlerta(mapa, x.h, x.ph, estado, fonte, quando);
  if (x.hs && x.hs !== x.h) mudou = radarRegistrarAlerta(mapa, x.hs, x.phs, estado, fonte, quando) || mudou;
  return mudou;
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
  estado.mapa = estado.mapa || { v: 2, a: {} };
  const rv = estado.rv = Object.assign({ ultimoTs: 0, lidas: 0, divergencias: 0, suprimidas: 0 }, estado.rv || {});
  const res = { novas: 0, eventos: [], divergencias: 0, suprimidas: 0 };
  const revs = (revisoes || []).filter(r => r && isFinite(r.ts)).sort((a, b) => a.ts - b.ts);
  const hist = estado.hist || [];
  const vistos = {};        // hashes já vistos numa revisão anterior da janela
  const primeiraVez = {};   // hash -> { ts, tam } da primeira revisão da janela em que apareceu
  const medidos = {};       // hashes que o painel mandou
  (estado.vistos || []).concat(estado.antH || []).forEach(function(h) { if (h) medidos[h] = true; });
  let anterior = null;

  revs.forEach(function(rev) {
    const linhas = radarLinhasDaRevisao(rev.texto);
    const tam    = radarTamanhoLinhas(linhas);

    if (rev.ts > rv.ultimoTs) {
      res.novas++;

      // 1. Colagem entre duas revisões, com o crescimento de cada parágrafo alinhado com a
      // revisão anterior. Restaurados (vistos antes, fora da anterior) não contam nem
      // entram no alinhamento, para não tomarem o lugar de um parágrafo editado.
      if (anterior) {
        const naAnterior = {};
        anterior.h.forEach(h => { naAnterior[h] = true; });
        const alinhadas = linhas.filter(x => naAnterior[x.h] || !vistos[x.h]);
        const antes = radarAlinharAnteriores(anterior.h, anterior.l, alinhadas.map(x => x.h));
        const crescP = linhas.map(x => vistos[x.h] ? 0 : Math.max(0, x.l - antes[alinhadas.indexOf(x)]));
        const cresc = crescP.reduce((s, c) => s + c, 0);
        const seg = (rev.ts - anterior.ts) / 1000;
        if (cresc >= Math.max(RADAR_CRESCIMENTO_MIN, RADAR_CPS_COLAGEM * seg)) {
          linhas.forEach(function(x, i) {
            if (crescP[i] < RADAR_CRESCIMENTO_MIN_PARAGRAFO) return;
            if (_radarAlertarLinha(estado.mapa, x, RADAR_ESTADO_COLAGEM, RADAR_FONTE_REVISAO_SERVIDOR, rev.ts)) {
              res.eventos.push({ estado: RADAR_ESTADO_COLAGEM, h: x.h, ts: rev.ts, crescimento: crescP[i],
                                 decorridoMs: rev.ts - anterior.ts, fonte: RADAR_FONTE_REVISAO_SERVIDOR, revisao: rev.id || '' });
            }
          });
        }
      }

      // 3. Medição suprimida. A janela das medições tem folga do relógio do aluno nos dois
      // lados: uma medição de antes do parágrafo existir não pode cair dentro dela.
      const candidatas = linhas.filter(function(x) {
        const desde = primeiraVez[x.h];
        return x.l >= RADAR_CRESCIMENTO_MIN_PARAGRAFO && !x.tabela && desde &&
               rev.ts - desde.ts >= RADAR_SUPRIMIDA_MIN_MS &&
               !medidos[x.h] && !medidos[x.hs] && !estado.mapa.a[x.h];
      });
      if (candidatas.length > 0) {
        const desdeTs = Math.max.apply(null, candidatas.map(x => primeiraVez[x.h].ts));
        const desdeTam = Math.min.apply(null, candidatas.map(x => primeiraVez[x.h].tam));
        const janela = hist.filter(p => p[0] > desdeTs + RADAR_TOLERANCIA_RELOGIO_MS &&
                                        p[0] < rev.ts - RADAR_TOLERANCIA_RELOGIO_MS);
        const faltando = radarTamanhoLinhas(candidatas);
        const maiorMedido = janela.length ? Math.max.apply(null, janela.map(p => p[1])) : Infinity;
        if (Math.min(desdeTam, tam) - maiorMedido >= RADAR_SUPRIMIDA_FRACAO * faltando) {
          candidatas.forEach(function(x) {
            // Sem prefixo: só pinta o texto exatamente igual, nunca versões editadas.
            if (radarRegistrarAlerta(estado.mapa, x.h, '', RADAR_ESTADO_NAO_OBSERVADO, RADAR_FONTE_NAO_MEDIDO, rev.ts)) {
              res.suprimidas++;
              res.eventos.push({ estado: RADAR_ESTADO_NAO_OBSERVADO, h: x.h, ts: rev.ts, crescimento: x.l,
                                 decorridoMs: rev.ts - primeiraVez[x.h].ts, fonte: RADAR_FONTE_NAO_MEDIDO, revisao: rev.id || '' });
            }
          });
        }
      }

      // 2. Divergência: o tamanho da revisão fora da faixa das medições ao redor dela.
      const faixa = radarFaixaMedida(hist, rev.ts);
      if (faixa) {
        const dif = tam < faixa.min ? tam - faixa.min : (tam > faixa.max ? tam - faixa.max : 0);
        if (Math.abs(dif) > Math.max(RADAR_DIVERGENCIA_MIN, RADAR_DIVERGENCIA_FRACAO * Math.max(tam, faixa.max))) {
          res.divergencias++;
          res.eventos.push({ estado: RADAR_EVENTO_DIVERGENCIA, h: '', ts: rev.ts, crescimento: dif,
                             decorridoMs: -1, fonte: RADAR_FONTE_REVISAO_SERVIDOR, revisao: rev.id || '' });
        }
      }
    }
    linhas.forEach(function(x) {
      vistos[x.h] = true;
      if (!primeiraVez[x.h]) primeiraVez[x.h] = { ts: rev.ts, tam: tam };
    });
    anterior = { ts: rev.ts, h: linhas.map(x => x.h), l: linhas.map(x => x.l) };
  });

  if (revs.length > 0) rv.ultimoTs = Math.max(rv.ultimoTs, revs[revs.length - 1].ts);
  rv.lidas += res.novas;
  rv.divergencias += res.divergencias;
  rv.suprimidas += res.suprimidas;
  rv.em = agora;
  rv.acesso = 'ok';
  delete rv.erro;
  // O histórico só precisa cobrir as revisões que ainda vão chegar.
  if (Array.isArray(estado.hist)) {
    const piso = rv.ultimoTs - RADAR_DIVERGENCIA_JANELA_MS - RADAR_TOLERANCIA_RELOGIO_MS - RADAR_SUPRIMIDA_MIN_MS;
    estado.hist = estado.hist.filter(p => p[0] >= piso);
  }
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
 * Reduz o estado até o JSON caber numa célula: primeiro o histórico de tamanhos, depois a
 * lista de parágrafos vistos. Altera e devolve o JSON.
 */
function radarEstadoJson(estado) {
  let json = JSON.stringify(estado);
  while (json.length > RADAR_ESTADO_JSON_MAX && Array.isArray(estado.hist) && estado.hist.length > 0) {
    estado.hist = estado.hist.slice(Math.ceil(estado.hist.length / 2));
    json = JSON.stringify(estado);
  }
  while (json.length > RADAR_ESTADO_JSON_MAX && Array.isArray(estado.vistos) && estado.vistos.length > 50) {
    estado.vistos = estado.vistos.slice(Math.ceil(estado.vistos.length / 2));
    json = JSON.stringify(estado);
  }
  return json;
}

/**
 * Lê do Drive, com a conta do servidor, as revisões a analisar (a última já analisada,
 * como referência, e as posteriores, até RADAR_REV_MAX). Se a exportação de uma revisão
 * falhar, para nela: as seguintes ficam para a próxima conferência, sem buraco.
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
  let falhou = false;
  for (let i = 0; i < resps.length; i++) {
    if (resps[i].getResponseCode() !== 200) {
      if (janela[i].ts > (ultimoTs || 0)) { falhou = true; break; }
      continue;                                             // a referência pode faltar
    }
    revisoes.push({ id: janela[i].id, ts: janela[i].ts, texto: resps[i].getContentText() });
  }
  const novasLidas = revisoes.filter(r => r.ts > (ultimoTs || 0)).length;
  if (falhou && novasLidas === 0) return { acesso: 'erro', erro: 'A exportação das revisões falhou.' };
  return { acesso: 'ok', revisoes: revisoes, incompleta: falhou };
}

/**
 * Confere as revisões de um documento e aluno, se já for hora, e grava o resultado.
 * A leitura do Drive fica fora da trava; a gravação relê a linha dentro dela.
 * Nunca lança: a conferência é um extra e não pode derrubar a rota que a chamou.
 * @returns {object|null} estado.rv atualizado, ou null se não conferiu
 */
function radarConferirSeHoraDe(ss, docId, aluno, intervaloMs) {
  try {
    if (!radarRevisoesAtivas()) return null;
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
      const acessoAntes = estado.rv && estado.rv.acesso;
      let eventos = [];
      if (lido.acesso === 'ok') {
        eventos = radarAnalisarRevisoes(estado, lido.revisoes, agora).eventos;
        if (lido.incompleta) estado.rv.erro = 'Algumas revisões não puderam ser exportadas; ficam para a próxima conferência.';
      } else {
        estado.rv = Object.assign({ ultimoTs: 0, lidas: 0, divergencias: 0, suprimidas: 0 }, estado.rv || {},
                                  { em: agora, acesso: lido.acesso, erro: lido.erro || '' });
        // O servidor tinha acesso e perdeu: alguém tirou a conta dele do compartilhamento.
        if (acessoAntes === 'ok' && lido.acesso === 'sem_acesso') {
          eventos.push({ estado: RADAR_EVENTO_ACESSO_PERDIDO, h: '', ts: agora, crescimento: '',
                         decorridoMs: -1, fonte: RADAR_FONTE_REVISAO_SERVIDOR, revisao: '' });
        }
      }
      const rv = estado.rv;
      sheet.getRange(linha, 8).setValue(radarEstadoJson(estado));
      sheet.getRange(linha, 10, 1, 4).setValues([[new Date(agora), rv.lidas, rv.divergencias, rv.acesso]]);
      if (eventos.length > 0) _radarGravarEventos(ss, agora, docId, aluno, eventos);
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
