// Testes do Radar de Esforço: estados por evidência (não por tamanho), alertas presos ao
// texto (não à posição), detecção de colagem com tempo, marcador e linha de base do modelo,
// histórico de revisões e escape do texto do aluno no painel.
// Rodar: node --test whitebox-lib/tests/radar.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const LIB = path.join(__dirname, '..');
const MARCADOR = '✍️ ESCREVA O SEU TRABALHO ABAIXO DESTA LINHA ✍️';
const AVISO = 'Antes de começar: não apague este texto: escreva o seu trabalho abaixo da linha ' +
              '"ESCREVA O SEU TRABALHO ABAIXO DESTA LINHA". ' + 'Texto longo do aviso. '.repeat(10);
const SEG = 1000;

/** Frase de n caracteres (aprox.) com conteúdo distinto por semente. */
function frase(semente, n) {
  let s = '';
  let i = 0;
  while (s.length < n) s += semente + ' palavra' + (i++) + ' ';
  return s.substring(0, n).trim();
}

/**
 * @param {object} o
 * @param {string[]} o.paragrafos
 * @param {object} [o.props]
 * @param {Array<{texto: string, quando: string}>} [o.revisoes] revisões do Drive (sem = sem acesso)
 */
function montar(o) {
  const estado = { paragrafos: o.paragrafos.slice(), cursor: null, selecao: 0 };
  const paragrafo = (t, i) => ({
    getText: () => t,
    getAttributes: () => ({}),
    getNumChildren: () => 1,
    getChild: () => ({ idx: i })
  });
  const body = {
    getText: () => estado.paragrafos.join('\n'),
    getParagraphs: () => estado.paragrafos.map(paragrafo)
  };
  const doc = {
    getId: () => 'DOC1',
    getBody: () => body,
    getTabs: () => [{ asDocumentTab: () => ({ getNamedRanges: () => [] }) }],
    newPosition: (el, off) => ({ el, off }),
    setCursor: pos => { estado.cursor = pos; },
    setSelection: () => { estado.selecao++; }
  };
  const store = Object.assign({}, o.props || {});
  const props = {
    getProperty: k => (k in store ? store[k] : null),
    setProperty: (k, v) => {
      if (String(v).length > 9000) throw new Error('propriedade grande demais');
      store[k] = v;
    }
  };
  const revs = o.revisoes || null;
  const ctx = {
    console,
    DocumentApp: { getActiveDocument: () => doc, Attribute: { PAGE_BREAK_BEFORE: 'PB' } },
    PropertiesService: { getDocumentProperties: () => props, getScriptProperties: () => props },
    CacheService: { getDocumentCache: () => ({ get: () => null, put: () => {} }) },
    Logger: { log: () => {} },
    ScriptApp: { getOAuthToken: () => 'tok' },
    Session: { getActiveUser: () => ({ getEmail: () => 'aluno@x.com' }), getEffectiveUser: () => ({ getEmail: () => 'aluno@x.com' }) },
    Drive: {
      Revisions: {
        list: () => {
          if (!revs) throw new Error('drive.file não cobre este arquivo');
          return { revisions: revs.map((r, i) => ({ id: String(i), modifiedTime: r.quando, exportLinks: { 'text/plain': 'rev:' + i } })) };
        }
      }
    },
    UrlFetchApp: {
      fetch: (url, opts) => {
        if (/^https:/.test(url)) {
          if (!o.servidor) throw new Error('sem rede no teste');
          const pedido = JSON.parse(opts.payload);
          (estado.pedidos = estado.pedidos || []).push(pedido);
          return { getContentText: () => JSON.stringify(o.servidor(pedido)) };
        }
        const r = revs[Number(String(url).split(':')[1])];
        return { getResponseCode: () => 200, getContentText: () => r.texto };
      },
      fetchAll: reqs => reqs.map(q => ctx.UrlFetchApp.fetch(q.url))
    }
  };
  vm.createContext(ctx);
  for (const f of ['Constants.gs', 'RadarCore.gs', 'Utils.gs', 'Logic.gs']) {
    vm.runInContext(fs.readFileSync(path.join(LIB, f), 'utf8'), ctx, { filename: f });
  }
  if (o.servidor) {
    ctx.getContext = () => ({ initialRole: 'student' });
    ctx.getAdvancedItem3Data = () => ({ professorEmail: 'prof@x.com' });
    ctx.Utilities = { formatDate: d => d.toISOString().substring(5, 16) };
    ctx.Session.getScriptTimeZone = () => 'America/Sao_Paulo';
  }
  /** Mede no instante t (ms), como o pulso do painel. */
  const medir = t => ctx._checkAndUpdatePasteSnapshot(body.getParagraphs(), null, t);
  const estados = () => {
    const textos = estado.paragrafos.map(t => t.trim());
    const mapa = ctx._lerMapaRadar(props, textos);
    return Array.from(ctx._estadosDoRadar(textos, ctx._mascaraDoModelo(textos), mapa))
      .filter(Boolean).map(e => e.estado).join('');
  };
  return { ctx, estado, store, medir, estados };
}

test('Tamanho do parágrafo não muda a cor: longo e curto digitados ficam sem alerta', () => {
  const m = montar({ paragrafos: [MARCADOR, '', ''] });
  m.medir(0);
  // Digita 40 caracteres a cada 15 s (160/min): um parágrafo curto e um bem longo.
  const curto = frase('curto', 60), longo = frase('longo', 1200);
  let t = 0;
  for (let n = 40; n < longo.length + 40; n += 40) {
    t += 15 * SEG;
    m.estado.paragrafos = [MARCADOR, curto.substring(0, Math.min(n, curto.length)), longo.substring(0, n)];
    m.medir(t);
  }
  assert.equal(m.estados(), 'SS');
});

test('Digitação rápida (300/min) não é colagem; 400 caracteres de uma vez é', () => {
  const m = montar({ paragrafos: [MARCADOR, ''] });
  m.medir(0);
  const texto = frase('rapido', 600);
  let t = 0;
  for (let n = 75; n <= 600; n += 75) { // 75 caracteres a cada 15 s
    t += 15 * SEG;
    m.estado.paragrafos = [MARCADOR, texto.substring(0, n)];
    assert.equal(m.medir(t).colagensNovas, 0);
  }
  m.estado.paragrafos.push(frase('colado', 400));
  t += 15 * SEG;
  const r = m.medir(t);
  assert.equal(r.colagensNovas, 1);
  assert.ok(r.charsColados >= 390);
  assert.equal(m.estados(), 'SC');
});

test('Várias colagens médias na mesma medição somam e são detectadas', () => {
  const m = montar({ paragrafos: [MARCADOR, ''] });
  m.medir(0);
  m.estado.paragrafos = [MARCADOR, frase('a', 70), frase('b', 70)];
  assert.equal(m.medir(10 * SEG).colagensNovas, 2);
});

test('Escrita com o painel fechado é "não observado", nunca colagem', () => {
  const m = montar({ paragrafos: [MARCADOR, ''] });
  m.medir(0);
  m.estado.paragrafos = [MARCADOR, frase('casa', 900), 'curto'];
  const r = m.medir(2 * 3600 * SEG);
  assert.equal(r.colagensNovas, 0);
  assert.equal(m.estados(), 'NS');
});

test('Primeira medição (texto já existente) é "não observado"', () => {
  const m = montar({ paragrafos: [MARCADOR, frase('velho', 300)] });
  m.medir(0);
  assert.equal(m.estados(), 'N');
});

test('Inserir linhas acima não move alertas nem cria alertas em cascata', () => {
  const a = frase('alfa', 150), b = frase('beta', 400), c = frase('gama', 90);
  const m = montar({ paragrafos: [MARCADOR, a] });
  m.medir(0);
  m.estado.paragrafos = [MARCADOR, a, b, c];          // b e c colados
  m.medir(10 * SEG);
  assert.equal(m.estados(), 'NCC');
  // Aluno insere uma linha vazia e uma frase curta no topo do texto
  m.estado.paragrafos = [MARCADOR, '', 'Introdução', a, b, c];
  const r = m.medir(25 * SEG);
  assert.equal(r.colagensNovas, 0);
  assert.equal(m.estados(), 'SNCC', 'os alertas seguem o texto');
  // E apagar uma linha acima também não
  m.estado.paragrafos = [MARCADOR, a, b, c];
  m.medir(40 * SEG);
  assert.equal(m.estados(), 'NCC');
});

test('Colagem editada depois continua sinalizada (E)', () => {
  const m = montar({ paragrafos: [MARCADOR, ''] });
  m.medir(0);
  const colado = frase('origem', 300);
  m.estado.paragrafos = [MARCADOR, colado];
  m.medir(10 * SEG);
  m.estado.paragrafos = [MARCADOR, colado + ' e mais umas palavras minhas'];
  m.medir(25 * SEG);
  assert.equal(m.estados(), 'E');
});

test('Restaurar versão não gera colagem', () => {
  const a = frase('primeiro', 400), b = frase('segundo', 400);
  const m = montar({ paragrafos: [MARCADOR, a] });
  m.medir(0);
  for (let n = 1; n <= 10; n++) { m.estado.paragrafos = [MARCADOR, a, b.substring(0, n * 40)]; m.medir(n * 15 * SEG); }
  m.estado.paragrafos = [MARCADOR, ''];
  m.medir(200 * SEG);
  m.estado.paragrafos = [MARCADOR, a, b];
  assert.equal(m.medir(215 * SEG).colagensNovas, 0);
});

test('Mapa antigo (por índice) vira "alerta antigo" preso ao texto daquela posição', () => {
  const t = frase('antigo', 200);
  const m = montar({ paragrafos: [MARCADOR, 'curto', t], props: { WHITEBOX_PASTE_MAP: '{"2":"snapshot"}' } });
  assert.equal(m.estados(), 'SL');
  m.medir(0); // a medição grava a conversão
  assert.equal(JSON.parse(m.store.WHITEBOX_PASTE_MAP).v, 2);
  m.estado.paragrafos = [MARCADOR, '', 'curto', t];
  assert.equal(m.estados(), 'SL');
});

test('Mapa de alertas respeita o teto e descarta primeiro os não observados', () => {
  const m = montar({ paragrafos: [MARCADOR] });
  const mapa = { v: 2, a: {} };
  for (let i = 0; i < 60; i++) m.ctx._registrarAlerta(mapa, frase('c' + i, 100), 'C', 'medicao', i);
  for (let i = 0; i < 40; i++) m.ctx._registrarAlerta(mapa, frase('n' + i, 100), 'N', 'painel_fechado', 1000 + i);
  m.ctx._gravarMapaRadar(m.ctx.PropertiesService.getDocumentProperties(), mapa);
  const salvo = JSON.parse(m.store.WHITEBOX_PASTE_MAP).a;
  const estados = Object.values(salvo).map(it => it.e);
  assert.equal(estados.length, 70);
  assert.equal(estados.filter(e => e === 'C').length, 60, 'todas as colagens ficam');
});

test('Alinhamento por texto: linha inserida no topo não desloca os tamanhos', () => {
  const m = montar({ paragrafos: [] });
  const r = Array.from(m.ctx.radarAlinharAnteriores(['a', 'b', 'c'], [10, 20, 30], ['x', 'a', 'b', 'c']));
  assert.deepEqual(r, [0, 10, 20, 30]);
  const r2 = Array.from(m.ctx.radarAlinharAnteriores(['a', 'b1', 'c'], [10, 20, 30], ['a', 'b2', 'c']));
  assert.deepEqual(r2, [10, 20, 30], 'parágrafo editado é pareado com a versão anterior');
});

// ---- PR 9: marcador e linha de base -------------------------------------------------

test('Frase do marcador repetida no fim não esconde o texto do aluno', () => {
  const texto = 'Meu texto com cinco palavras.';
  const m = montar({ paragrafos: [AVISO, MARCADOR, texto, MARCADOR] });
  assert.equal(m.ctx.getDocumentStats().wordCount, 5);
  const radar = m.ctx.getDocumentAuraMap();
  assert.equal(radar.segmentos.length, 1);
  assert.match(radar.avisos.join(' '), /aparece 2 vezes/);
});

test('O aviso que cita a frase do marcador não é tomado como marcador', () => {
  const m = montar({ paragrafos: [AVISO, 'Enunciado da atividade.', MARCADOR, 'Oi mundo'] });
  assert.equal(m.ctx.getDocumentStats().wordCount, 2);
});

test('Linha de base vem da 1ª revisão: texto colado antes de abrir o painel conta', () => {
  const colado = frase('colado antes', 500);
  const m = montar({
    paragrafos: [AVISO, 'Enunciado.', colado, MARCADOR, 'Depois.'],
    revisoes: [{ texto: [AVISO, 'Enunciado.', MARCADOR, ''].join('\n'), quando: '2026-11-20T10:00:00Z' }]
  });
  assert.equal(m.ctx.garantirLinhaDeBase(), true);
  assert.equal(m.store.WHITEBOX_BASELINE_FONTE, 'revisao');
  const mascara = Array.from(m.ctx._mascaraDoModelo(m.estado.paragrafos));
  assert.deepEqual(mascara, [true, true, false, true, false]);
  const radar = m.ctx.getDocumentAuraMap();
  assert.deepEqual(radar.segmentos.map(s => s.index), [2, 4]);
  assert.equal(radar.avisos.filter(a => !/servidor|nunca registrou/.test(a)).length, 0);
});

test('Sem Drive, a linha de base da abertura avisa o professor', () => {
  const m = montar({ paragrafos: [AVISO, MARCADOR, ''] });
  assert.equal(m.ctx.garantirLinhaDeBase(), true);
  assert.equal(m.store.WHITEBOX_BASELINE_FONTE, 'abertura');
  m.estado.paragrafos = [AVISO, MARCADOR, 'Texto do aluno aqui.'];
  assert.match(m.ctx.getDocumentAuraMap().avisos.join(' '), /primeira vez que o aluno abriu o painel/);
});

test('Com linha de base, texto novo acima do marcador conta como do aluno', () => {
  const m = montar({ paragrafos: [AVISO, MARCADOR, ''] });
  m.ctx.garantirLinhaDeBase();
  m.estado.paragrafos = [AVISO, 'Escondi isto aqui em cima.', MARCADOR, ''];
  assert.equal(m.ctx.getDocumentStats().wordCount, 5);
});

// ---- Revisões do Drive ---------------------------------------------------------------

test('Revisões: salto rápido marca colagem; intervalo longo e restauração não', () => {
  const base = [MARCADOR, ''].join('\n');
  const colado = frase('internet', 500);
  const digitado = frase('meu', 500);
  const m = montar({
    paragrafos: [MARCADOR, colado, digitado],
    revisoes: [
      { texto: base, quando: '2026-11-20T10:00:00Z' },
      { texto: [MARCADOR, colado].join('\n'), quando: '2026-11-20T10:00:30Z' },            // +500 em 30 s
      { texto: [MARCADOR, colado, digitado].join('\n'), quando: '2026-11-20T12:00:00Z' }    // +500 em 2 h
    ]
  });
  m.ctx.getDocumentAuraMap();
  const porTexto = {};
  Object.values(JSON.parse(m.store.WHITEBOX_PASTE_MAP).a).forEach(it => { porTexto[it.p] = it; });
  const pc = m.ctx.radarHashPrefixo(colado), pd = m.ctx.radarHashPrefixo(digitado);
  assert.equal(porTexto[pc].e, 'C');
  assert.equal(porTexto[pc].f, 'revisao');
  assert.notEqual((porTexto[pd] || {}).e, 'C');
});

// ---- Painel ------------------------------------------------------------------------------

test('Sidebar: texto do aluno nunca entra em innerHTML no Radar', () => {
  const html = fs.readFileSync(path.join(LIB, 'Sidebar.html'), 'utf8');
  html.split('\n').forEach((linha, i) => {
    if (/innerHTML/.test(linha)) {
      assert.doesNotMatch(linha, /preview|seg\.|pasteSource|src\.url|src\.message/, 'linha ' + (i + 1));
    }
  });
  assert.doesNotMatch(html, /setSelection/);
});

test('scrollToParagraph posiciona o cursor sem selecionar', () => {
  const m = montar({ paragrafos: ['a', 'b'] });
  assert.equal(m.ctx.scrollToParagraph(1), true);
  assert.equal(m.estado.cursor.el.idx, 1);
  assert.equal(m.estado.selecao, 0);
  assert.equal(m.ctx.scrollToParagraph(9), false);
});

// ---- Histórico no servidor -----------------------------------------------------------

test('Radar do professor usa o histórico do servidor, mesmo com o documento limpo pelo aluno', () => {
  const colado = frase('servidor', 300), meu = 'Parágrafo meu, curto.';
  const mapaServidor = { v: 2, a: {} };
  const m = montar({
    paragrafos: [MARCADOR, meu, colado],
    servidor: pedido => {
      if (pedido.route !== 'radar_documento') return { error: 'ROTA' };
      return { alunos: [{ email: 'aluno@x.com', medicoes: 42, inconsistencias: 1,
                          primeira: '2026-11-23T10:00:00Z', ultima: '2026-11-23T11:00:00Z', mapa: mapaServidor }] };
    }
  });
  m.ctx.radarRegistrarAlerta(mapaServidor, m.ctx.radarHash(colado), m.ctx.radarHashPrefixo(colado), 'C', 'medicao', 1);
  // O aluno apagou o mapa local (WHITEBOX_PASTE_MAP vazio)
  const radar = m.ctx.getDocumentAuraMap();
  assert.equal(radar.segmentos.map(s => s.estado).join(''), 'SC');
  const aviso = radar.avisos.join(' ');
  assert.match(aviso, /Histórico do servidor: 42 medição/);
  assert.match(aviso, /1 medição\(ões\) descartada/);
  assert.equal(m.estado.pedidos[0].docId, 'DOC1');
});

test('Sem histórico no servidor, o radar avisa que usa os dados do documento', () => {
  // O painel do aluno rodou aqui (há snapshot local), mas o servidor não tem medições.
  const m = montar({ paragrafos: [MARCADOR, 'Texto do aluno.'], servidor: () => ({ alunos: [] }) });
  m.ctx.getDocumentStats();
  const r = m.ctx.getDocumentAuraMap();
  assert.match(r.avisos.join(' '), /nunca registrou/, 'servidor respondeu sem histórico: nunca observado');
  const m2 = montar({ paragrafos: [MARCADOR, 'Texto do aluno.'], servidor: () => ({ error: 'PROFESSOR_INATIVO', message: 'Licença inativa' }) });
  m2.ctx.getDocumentStats();
  const r2 = m2.ctx.getDocumentAuraMap();
  assert.match(r2.avisos.join(' '), /Licença inativa/);
  assert.equal(r2.segmentos[0].estado, 'S', 'painel local rodou e o servidor falhou: usa o local');
});

test('Painel do aluno nunca aberto: todo o texto aparece como não observado, não como sem alerta', () => {
  const m = montar({ paragrafos: [MARCADOR, 'Primeiro parágrafo.', frase('segundo', 300)], servidor: () => ({ alunos: [] }) });
  const r = m.ctx.getDocumentAuraMap();
  assert.equal(r.segmentos.map(s => s.estado).join(''), 'NN');
  assert.equal(r.segmentos[0].fonte, 'nunca_observado');
  assert.equal(r.resumo.naoObservadoPct, 100);
  assert.equal(r.avisos.filter(a => /nunca registrou/.test(a)).length, 1);
  assert.equal(r.avisos.filter(a => /sem o painel observar/.test(a)).length, 0, 'sem aviso duplicado');
  // Sem servidor (falha de rede) e sem painel local: também não observado
  const m2 = montar({ paragrafos: [MARCADOR, 'Texto.'] });
  assert.equal(m2.ctx.getDocumentAuraMap().segmentos[0].estado, 'N');
});

test('Porcentagem de texto não observado entra no resumo e avisa a partir de 25%', () => {
  const visto = frase('visto', 300), fechado = frase('fechado', 200);
  const mapa = { v: 2, a: {} };
  const m = montar({
    paragrafos: [MARCADOR, visto, fechado],
    servidor: () => ({ alunos: [{ email: 'aluno@x.com', medicoes: 5, inconsistencias: 0, origem: 'addon', mapa: mapa }] })
  });
  m.ctx.radarRegistrarAlerta(mapa, m.ctx.radarHash(fechado), m.ctx.radarHashPrefixo(fechado), 'N', 'painel_fechado', 1);
  const r = m.ctx.getDocumentAuraMap();
  assert.equal(r.resumo.naoObservadoPct, 40);
  assert.match(r.avisos.join(' '), /40% do texto do aluno apareceu sem o painel observar/);
  assert.match(r.avisos.join(' '), /add-on do Whitebox, que o aluno não edita/);
});

test('Aviso diz quando as medições vieram do script que o aluno pode editar', () => {
  const m = montar({
    paragrafos: [MARCADOR, 'Texto.'],
    servidor: () => ({ alunos: [{ email: 'aluno@x.com', medicoes: 5, inconsistencias: 0, origem: 'script_vinculado', mapa: { v: 2, a: {} } }] })
  });
  assert.match(m.ctx.getDocumentAuraMap().avisos.join(' '), /script copiado com o documento, que o aluno pode editar/);
});

test('Documento mestre não consulta o servidor', () => {
  const m = montar({ paragrafos: [AVISO, MARCADOR, ''], servidor: () => { throw new Error('não devia chamar'); } });
  const radar = m.ctx.getDocumentAuraMap();
  assert.equal(radar.segmentos.length, 0);
  assert.equal(m.estado.pedidos, undefined);
});

test('Medições vão ao servidor pela rota registrar_medicoes, sem o texto', () => {
  const m = montar({ paragrafos: [MARCADOR, 'Segredo do aluno'], servidor: () => ({ success: true, aceitas: 1 }) });
  const stats = m.ctx.getDocumentStats();
  assert.ok(!JSON.stringify(stats.medicao).includes('Segredo'));
  const r = m.ctx.sendToBackend({ medicoes: [stats.medicao] });
  assert.equal(r.aceitas, 1);
  const pedido = m.estado.pedidos[0];
  assert.equal(pedido.route, 'registrar_medicoes');
  assert.equal(pedido.professorEmail, 'prof@x.com');
  assert.ok(!JSON.stringify(pedido).includes('Segredo'));
});
