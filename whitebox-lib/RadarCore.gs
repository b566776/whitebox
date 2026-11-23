/**
 * =====================================================
 *  Whitebox — RadarCore.gs (Radar de Esforço: núcleo puro)
 * =====================================================
 *
 * O MESMO arquivo existe em whitebox-lib/ e em whitebox-server/ (um teste garante que
 * são idênticos). A biblioteca usa para o cálculo local; o servidor, para guardar o
 * histórico que o aluno não consegue apagar (rota registrar_medicoes). Só funções puras:
 * nada de DocumentApp, PropertiesService etc.
 *
 * Uma "medição" é o estado dos parágrafos num instante, sem o texto:
 *   { ts: ms, h: [hash por parágrafo], l: [tamanho], ph: [hash do começo], m: [modelo?] }
 * ou, num pulso em que nada mudou, só { ts: ms, igual: true }.
 * O "estado" de um documento guarda a medição anterior, os parágrafos já vistos e o mapa
 * de alertas: { antH, antL, ts, vistos, mapa: { v: 2, a: { <hash>: { e, f, ts, p } } } }.
 */

// Estados de um parágrafo. A cor no painel mostra só evidência, nunca o tamanho.
const RADAR_ESTADO_SEM_ALERTA      = 'S'; // nenhuma evidência contra (não prova autoria)
const RADAR_ESTADO_COLAGEM         = 'C'; // entrou de uma vez, rápido demais para digitação
const RADAR_ESTADO_COLAGEM_EDITADA = 'E'; // começou como colagem e depois foi alterado
const RADAR_ESTADO_NAO_OBSERVADO   = 'N'; // apareceu enquanto o painel estava fechado
const RADAR_ESTADO_LEGADO          = 'L'; // alerta gravado pela versão antiga (por posição)

/** Crescimento mínimo (caracteres) entre duas medições para ser avaliado. */
const RADAR_CRESCIMENTO_MIN = 80;
/** Crescimento mínimo de um parágrafo para receber o alerta da medição. */
const RADAR_CRESCIMENTO_MIN_PARAGRAFO = 40;
/** Ritmo acima do qual não é digitação: 8 caracteres/s = 480/min (~100 palavras/min). */
const RADAR_CPS_COLAGEM = 8;
/** Intervalo máximo entre duas medições para o painel ter "visto" a escrita. */
const RADAR_JANELA_OBSERVADA_MS = 90 * 1000;
/** Teto de alertas guardados no mapa. */
const RADAR_MAPA_MAX = 70;
/** Caracteres normalizados do começo do parágrafo que identificam uma colagem editada. */
const RADAR_PREFIXO = 40;
/** Teto da lista de parágrafos já vistos. */
const RADAR_VISTOS_MAX = 400;

/** Precedência entre alertas do mesmo texto: nunca troca por um mais fraco. */
const RADAR_PESO_ALERTA = { C: 3, L: 2, N: 1 };

/**
 * Normaliza para comparar parágrafos: minúsculas, sem acentos e com só letras, dígitos e
 * espaços simples.
 */
function radarNormalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Hash curto (FNV-1a 32 bits, base 36) de um texto já normalizado. Vazio → ''. */
function radarHashNormalizado(norm) {
  if (!norm) return '';
  let h = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    h ^= norm.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36) + '.' + norm.length.toString(36);
}

/** Hash do parágrafo inteiro. */
function radarHash(texto) {
  return radarHashNormalizado(radarNormalizar(texto));
}

/** Hash dos primeiros RADAR_PREFIXO caracteres normalizados ('' se o parágrafo é curto). */
function radarHashPrefixo(texto) {
  const n = radarNormalizar(texto);
  return n.length >= RADAR_PREFIXO ? radarHashNormalizado(n.substring(0, RADAR_PREFIXO)) : '';
}

/** Medição de uma lista de textos (já sem espaços nas pontas) e da máscara do modelo. */
function radarMedicao(textos, modelo, ts) {
  return {
    ts: ts,
    h:  textos.map(radarHash),
    l:  textos.map(t => t.length),
    ph: textos.map(radarHashPrefixo),
    m:  textos.map((t, i) => !!(modelo && modelo[i]))
  };
}

/** Estado vazio de um documento. */
function radarEstadoNovo() {
  return { antH: null, antL: null, ts: null, vistos: [], mapa: { v: 2, a: {} } };
}

/**
 * Registra um alerta para o parágrafo de hash h. Só troca um alerta existente por um mais
 * forte (colagem > alerta antigo > não observado).
 * @returns {boolean} true se mudou o mapa
 */
function radarRegistrarAlerta(mapa, h, ph, estado, fonte, quando) {
  if (!h) return false;
  const atual = mapa.a[h];
  if (atual && (RADAR_PESO_ALERTA[atual.e] || 0) >= (RADAR_PESO_ALERTA[estado] || 0)) return false;
  mapa.a[h] = { e: estado, f: fonte, ts: quando || 0, p: ph || '' };
  return true;
}

/**
 * Acima de RADAR_MAPA_MAX alertas, descarta primeiro os "não observados" mais antigos e
 * depois os alertas mais antigos. Altera e devolve o mapa.
 */
function radarPodarMapa(mapa) {
  const chaves = Object.keys(mapa.a);
  if (chaves.length <= RADAR_MAPA_MAX) return mapa;
  const peso = it => (it.e === RADAR_ESTADO_NAO_OBSERVADO ? 0 : 1);
  chaves.sort(function(x, y) {
    const a = mapa.a[x], b = mapa.a[y];
    return (peso(a) - peso(b)) || ((a.ts || 0) - (b.ts || 0));
  });
  chaves.slice(0, chaves.length - RADAR_MAPA_MAX).forEach(function(k) { delete mapa.a[k]; });
  return mapa;
}

/**
 * Estado de cada parágrafo (null para vazio ou do modelo):
 *   - hash igual a um alerta: o estado do alerta;
 *   - mesmo começo de um alerta: colagem editada (ou não observado, se era isso);
 *   - senão: sem alerta.
 * @param {string[]} hashes
 * @param {string[]} prefixos - radarHashPrefixo de cada parágrafo
 * @param {boolean[]} modelo
 * @param {object} mapa
 * @returns {Array<{index:number, estado:string, fonte:string|null, ts:number}|null>}
 */
function radarEstados(hashes, prefixos, modelo, mapa) {
  const porPrefixo = {};
  Object.keys(mapa.a).forEach(function(h) {
    const it = mapa.a[h];
    if (!it.p) return;
    const ja = porPrefixo[it.p];
    if (!ja || (ja.e === RADAR_ESTADO_NAO_OBSERVADO && it.e !== RADAR_ESTADO_NAO_OBSERVADO)) porPrefixo[it.p] = it;
  });
  return hashes.map(function(h, i) {
    if (!h || modelo[i]) return null;
    const exato = mapa.a[h];
    if (exato) return { index: i, estado: exato.e, fonte: exato.f || null, ts: exato.ts || 0 };
    const it = prefixos[i] ? porPrefixo[prefixos[i]] : null;
    if (it) {
      return {
        index:  i,
        estado: it.e === RADAR_ESTADO_NAO_OBSERVADO ? RADAR_ESTADO_NAO_OBSERVADO : RADAR_ESTADO_COLAGEM_EDITADA,
        fonte:  it.f || null,
        ts:     it.ts || 0
      };
    }
    return { index: i, estado: RADAR_ESTADO_SEM_ALERTA, fonte: null, ts: 0 };
  });
}

/**
 * Para cada parágrafo atual, o tamanho que ele tinha na medição anterior. Alinha as duas
 * versões pela maior subsequência comum de hashes (não pela posição): inserir ou apagar
 * uma linha não faz cada parágrafo ser comparado com o vizinho. Entre dois parágrafos
 * iguais, os que mudaram são pareados na ordem; os que sobram são novos (tamanho 0).
 */
function radarAlinharAnteriores(antH, antL, curH) {
  const n = antH.length, m = curH.length;
  const res = new Array(m).fill(0);
  if (n === 0 || m === 0) return res;
  if (n * m > 4000000) { // documento enorme: alinhamento por posição
    for (let j = 0; j < m; j++) res[j] = antL[j] || 0;
    return res;
  }
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = antH[i] === curH[j]
        ? dp[(i + 1) * w + j + 1] + 1
        : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const pares = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (antH[i] === curH[j]) { pares.push([i, j]); i++; j++; }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++;
    else j++;
  }
  pares.push([n, m]);
  let pi = 0, pj = 0;
  pares.forEach(function(par) {
    const qtd = Math.min(par[0] - pi, par[1] - pj);
    for (let k = 0; k < qtd; k++) res[pj + k] = antL[pi + k] || 0;
    if (par[1] < m) res[par[1]] = antL[par[0]] || 0;
    pi = par[0] + 1; pj = par[1] + 1;
  });
  return res;
}

/** LRU dos hashes vistos: os atuais vão para o fim; os mais antigos saem acima do teto. */
function radarAtualizarVistos(vistos, hashes) {
  const atuais = {};
  hashes.forEach(function(h) { if (h) atuais[h] = true; });
  const lista = vistos.filter(function(h) { return !atuais[h]; });
  Object.keys(atuais).forEach(function(h) { lista.push(h); });
  while (lista.length > RADAR_VISTOS_MAX) lista.shift();
  return lista;
}

/**
 * Aplica uma medição ao estado do documento e registra os alertas.
 *
 * Colagem só quando a medição anterior foi há no máximo RADAR_JANELA_OBSERVADA_MS (o
 * painel viu a mudança) e o texto cresceu mais rápido do que se digita (RADAR_CPS_COLAGEM
 * por segundo, mínimo RADAR_CRESCIMENTO_MIN). Os parágrafos que cresceram ao menos
 * RADAR_CRESCIMENTO_MIN_PARAGRAFO recebem o alerta. Se a medição anterior é antiga
 * (painel fechado) ou não existe, o que cresceu RADAR_CRESCIMENTO_MIN ou mais é "não
 * observado", nunca colagem. Parágrafos do modelo ou já vistos antes (restaurar versão,
 * desfazer) não contam. Uma medição mais antiga que a anterior é ignorada.
 *
 * @param {object} estado - radarEstadoNovo() ou um estado salvo (é alterado)
 * @param {object} med    - radarMedicao()
 * @param {string} [fonte] - detector gravado no alerta (padrão 'medicao')
 * @returns {{estado: object, conhecidos: boolean[], charsRestaurados: number,
 *            colagensNovas: number, charsColados: number, mapaMudou: boolean,
 *            eventos: Array<{estado:string, h:string, crescimento:number, decorridoMs:number}>, ignorada: boolean}}
 */
function radarProcessarMedicao(estado, med, fonte) {
  estado.vistos = estado.vistos || [];
  estado.mapa = estado.mapa || { v: 2, a: {} };
  const hashes = med.h, current = med.l, modelo = med.m || [];
  const prefixos = med.ph || [];
  const res = {
    estado: estado, conhecidos: [], charsRestaurados: 0, colagensNovas: 0,
    charsColados: 0, mapaMudou: false, eventos: [], ignorada: false
  };
  if (estado.ts !== null && estado.ts !== undefined && med.ts < estado.ts) {
    res.ignorada = true;
    res.conhecidos = (hashes || []).map((h, i) => !!modelo[i]);
    return res;
  }
  // Pulso sem mudança: só registra que o painel estava olhando neste instante.
  if (med.igual) {
    if (estado.antL) estado.ts = med.ts;
    return res;
  }

  const vistoSet = {};
  estado.vistos.forEach(function(h) { vistoSet[h] = true; });
  const antSet = {};
  (estado.antH || []).forEach(function(h) { if (h) antSet[h] = true; });

  res.conhecidos = hashes.map(function(h, i) { return !!modelo[i] || (!!h && !!vistoSet[h]); });
  if (estado.antH) {
    hashes.forEach(function(h, i) {
      if (h && vistoSet[h] && !antSet[h]) res.charsRestaurados += current[i];
    });
  }

  const temAnterior = !!estado.antL;
  const decorrido = (temAnterior && typeof estado.ts === 'number' && isFinite(estado.ts))
    ? Math.max(0, med.ts - estado.ts) : Infinity;
  const posicional = temAnterior && estado.antH && estado.antH.length === estado.antL.length;
  const base = !temAnterior ? current.map(() => 0)
             : posicional ? radarAlinharAnteriores(estado.antH, estado.antL, hashes)
             : current.map((_, i) => estado.antL[i] || 0);

  const cresc = current.map((len, i) => (res.conhecidos[i] || !hashes[i]) ? 0 : Math.max(0, len - base[i]));
  const total = cresc.reduce((s, c) => s + c, 0);

  if (total >= RADAR_CRESCIMENTO_MIN) {
    const observado = decorrido <= RADAR_JANELA_OBSERVADA_MS;
    const rapido    = observado &&
      total >= Math.max(RADAR_CRESCIMENTO_MIN, RADAR_CPS_COLAGEM * decorrido / 1000);
    cresc.forEach(function(c, i) {
      if (rapido && c >= RADAR_CRESCIMENTO_MIN_PARAGRAFO) {
        if (radarRegistrarAlerta(estado.mapa, hashes[i], prefixos[i], RADAR_ESTADO_COLAGEM, fonte || 'medicao', med.ts)) {
          res.colagensNovas++;
          res.mapaMudou = true;
          res.eventos.push({ estado: RADAR_ESTADO_COLAGEM, h: hashes[i], crescimento: c, decorridoMs: decorrido });
        }
        res.charsColados += c;
      } else if (!observado && c >= RADAR_CRESCIMENTO_MIN) {
        if (radarRegistrarAlerta(estado.mapa, hashes[i], prefixos[i], RADAR_ESTADO_NAO_OBSERVADO, 'painel_fechado', med.ts)) {
          res.mapaMudou = true;
          res.eventos.push({ estado: RADAR_ESTADO_NAO_OBSERVADO, h: hashes[i], crescimento: c,
                             decorridoMs: isFinite(decorrido) ? decorrido : -1 });
        }
      }
    });
    if (res.mapaMudou) radarPodarMapa(estado.mapa);
  }

  estado.antH = hashes.slice();
  estado.antL = current.slice();
  estado.ts = med.ts;
  estado.vistos = radarAtualizarVistos(estado.vistos, hashes);
  return res;
}
