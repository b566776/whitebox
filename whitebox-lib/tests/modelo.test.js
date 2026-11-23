// Testes do texto do modelo (linha do marcador, linha de base), do professor guardado em
// DocumentProperties e da detecção de colagem que ignora texto restaurado.
// Rodar: node --test whitebox-lib/tests/modelo.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const LIB = path.join(__dirname, '..');
const MARCADOR = '✍️ ESCREVA O SEU TRABALHO ABAIXO DESTA LINHA ✍️';
const AVISO = 'Antes de começar: como ativar o Whitebox. ' + 'Texto longo do aviso de permissões. '.repeat(20);

/**
 * @param {object} o
 * @param {string[]} o.paragrafos  texto de cada parágrafo do corpo (mutável pelo teste)
 * @param {string[]} [o.designados] e-mails em WHITEBOX_CONFIG
 * @param {object} [o.props]       DocumentProperties iniciais
 */
function montar(o) {
  const estado = { paragrafos: o.paragrafos.slice(), recriados: [] };
  let ranges = (o.designados || []).map(e => ({ getName: () => 'WHITEBOX_CONFIG:' + JSON.stringify({ professorEmail: e }) }));
  const paragrafo = t => ({ getText: () => t, getAttributes: () => ({}) });
  const body = {
    getText: () => estado.paragrafos.join('\n'),
    getParagraphs: () => estado.paragrafos.map(paragrafo),
    getNumChildren: () => estado.paragrafos.length,
    getChild: i => paragrafo(estado.paragrafos[i])
  };
  const doc = {
    getId: () => 'DOC1',
    getBody: () => body,
    getTabs: () => [{ asDocumentTab: () => ({ getNamedRanges: () => ranges }) }],
    newRange: () => { const b = { addElement: () => b, build: () => ({}) }; return b; },
    addNamedRange: nome => { estado.recriados.push(nome); ranges = ranges.concat([{ getName: () => nome }]); }
  };
  const store = Object.assign({}, o.props || {});
  const props = {
    getProperty: k => (k in store ? store[k] : null),
    setProperty: (k, v) => { store[k] = v; }
  };
  const ctx = {
    console,
    DocumentApp: { getActiveDocument: () => doc, Attribute: { PAGE_BREAK_BEFORE: 'PB' } },
    PropertiesService: { getDocumentProperties: () => props, getScriptProperties: () => props },
    CacheService: { getDocumentCache: () => ({ get: () => '1', put: () => {} }) },
    Logger: { log: () => {} },
    Session: { getActiveUser: () => ({ getEmail: () => 'aluno@x.com' }), getEffectiveUser: () => ({ getEmail: () => 'aluno@x.com' }) }
  };
  vm.createContext(ctx);
  for (const f of ['Constants.gs', 'Utils.gs', 'Logic.gs']) {
    vm.runInContext(fs.readFileSync(path.join(LIB, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, estado, store, ranges: () => ranges };
}

test('Com a linha do marcador, Palavras Escritas conta só o que está abaixo dela', () => {
  const { ctx } = montar({ paragrafos: [AVISO, 'Enunciado da atividade.', MARCADOR, ''] });
  assert.equal(ctx.getDocumentStats().wordCount, 0);
  const { ctx: ctx2 } = montar({ paragrafos: [AVISO, MARCADOR, 'Minha primeira frase aqui.'] });
  assert.equal(ctx2.getDocumentStats().wordCount, 4);
});

test('Documento mestre (tudo acima da linha): Radar de Esforço vazio', () => {
  const { ctx } = montar({ paragrafos: [AVISO, 'Enunciado da atividade.', MARCADOR, ''] });
  assert.deepEqual(Array.from(ctx.getDocumentAuraMap()), []);
});

test('Radar mostra só os parágrafos do aluno, com índice do documento', () => {
  const { ctx } = montar({ paragrafos: [AVISO, MARCADOR, 'Parágrafo do aluno com algum conteúdo.'] });
  const mapa = ctx.getDocumentAuraMap();
  assert.equal(mapa.length, 1);
  assert.equal(mapa[0].index, 2);
});

test('Marcador é achado sem acentos, maiúsculas nem emoji', () => {
  const { ctx } = montar({ paragrafos: [AVISO, '--- escreva o seu trabalho abaixo desta linha ---', 'Oi mundo'] });
  assert.equal(ctx.getDocumentStats().wordCount, 2);
});

test('Sem marcador: linha de base na 1ª abertura do aluno desconta o texto do modelo', () => {
  const { ctx, estado, store } = montar({ paragrafos: [AVISO, 'Enunciado.'] });
  assert.equal(ctx.garantirLinhaDeBase(), true);
  assert.ok(store.WHITEBOX_BASELINE);
  assert.equal(ctx.getDocumentStats().wordCount, 0);
  estado.paragrafos.push('Texto que eu escrevi.');
  assert.equal(ctx.getDocumentStats().wordCount, 4);
  assert.equal(ctx.garantirLinhaDeBase(), false, 'não regrava a base');
});

test('Linha de base não é gravada numa cópia em que o painel já rodou (texto do aluno)', () => {
  const { ctx, store } = montar({ paragrafos: [AVISO, 'Já escrevi isto.'], props: { WHITEBOX_PARA_SNAPSHOT: '[10,5]' } });
  assert.equal(ctx.garantirLinhaDeBase(), false);
  assert.equal(store.WHITEBOX_BASELINE, undefined);
});

test('Professor do WHITEBOX_CONFIG fica guardado e volta quando o NamedRange some', () => {
  const m1 = montar({ paragrafos: [AVISO], designados: ['prof@x.com'] });
  assert.deepEqual(Array.from(m1.ctx.getDesignatedProfessors()), ['prof@x.com']);
  assert.equal(m1.store.WHITEBOX_PROFESSOR, 'prof@x.com');

  // Aluno apagou o começo: sem NamedRange, mas com a propriedade guardada
  const m2 = montar({ paragrafos: ['Meu texto'], props: { WHITEBOX_PROFESSOR: 'prof@x.com' } });
  assert.deepEqual(Array.from(m2.ctx.getDesignatedProfessors()), ['prof@x.com']);
  assert.equal(m2.estado.recriados.length, 1, 'recria o WHITEBOX_CONFIG');
  assert.match(m2.estado.recriados[0], /^WHITEBOX_CONFIG:\{"professorEmail":"prof@x\.com"\}$/);
  assert.equal(m2.ctx.resolverProfessorDoDocumento('aluno@x.com', { initialRole: 'student' }, { professorEmail: 'NAO_IDENTIFICADO' }), 'prof@x.com');
});

test('Sem NamedRange e sem propriedade: nenhum designado (documento mestre antigo)', () => {
  const { ctx, estado } = montar({ paragrafos: ['x'] });
  assert.deepEqual(Array.from(ctx.getDesignatedProfessors()), []);
  assert.equal(estado.recriados.length, 0);
});

test('Restaurar versão: parágrafos que já existiam não são colagem nem caracteres novos', () => {
  const longo1 = 'Primeiro parágrafo que o aluno escreveu aos poucos, com bastante conteúdo próprio. '.repeat(4);
  const longo2 = 'Segundo parágrafo escrito pelo aluno, também longo o bastante para parecer colagem. '.repeat(4);
  const { ctx, estado, store } = montar({ paragrafos: [MARCADOR, longo1, longo2] });
  ctx.getDocumentStats();                 // medição com o texto escrito
  estado.paragrafos = [MARCADOR, ''];     // aluno apagou tudo
  ctx.getDocumentStats();
  estado.paragrafos = [MARCADOR, longo1, longo2]; // restaurou a versão
  const stats = ctx.getDocumentStats();
  assert.deepEqual(Array.from(stats.knownParagraphs), [true, true, true]);
  assert.equal(stats.restoredChars, longo1.trim().length + longo2.trim().length);
  assert.equal(store.WHITEBOX_PASTE_MAP || '{}', '{}', 'nenhum parágrafo marcado como colagem');
});

test('Colagem nova continua sendo detectada', () => {
  const { ctx, estado, store } = montar({ paragrafos: [MARCADOR, 'Começo.'] });
  ctx.getDocumentStats();
  estado.paragrafos.push('Trecho colado de outro lugar, bem comprido, que nunca existiu neste documento antes. '.repeat(3));
  const stats = ctx.getDocumentStats();
  assert.equal(stats.knownParagraphs[2], false);
  assert.equal(stats.restoredChars, 0);
  assert.ok(JSON.parse(store.WHITEBOX_PASTE_MAP)['2'], 'parágrafo 2 marcado');
});

test('Texto do modelo não é marcado como colagem pela detecção de anomalia', () => {
  const { ctx, store } = montar({ paragrafos: [AVISO, MARCADOR, 'Curto.'] });
  ctx.getDocumentStats();
  assert.equal(store.WHITEBOX_PASTE_MAP || '{}', '{}');
});
