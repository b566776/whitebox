// Testes da abertura automática do painel (whitebox-client/Código.gs) com stubs do Apps Script.
// Rodar: node --test whitebox-client/tests/abertura-automatica.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CLIENTE = path.join(__dirname, '..', 'Código.gs');

/**
 * @param {object} o
 * @param {string} o.ativo       e-mail de quem abriu (getActiveUser), '' se oculto
 * @param {string} o.efetivo     e-mail de quem criou o gatilho (getEffectiveUser)
 * @param {object} o.contexto    resposta de WhiteboxLib.getContext
 * @param {string[]} o.gatilhos  handlers dos gatilhos já existentes do usuário
 * @param {boolean} o.falhaCriar newTrigger lança erro?
 */
function montar(o) {
  const estado = { criados: [], sidebars: 0, gatilhos: (o.gatilhos || []).slice() };
  const builder = {
    forDocument: () => builder,
    onOpen: () => builder,
    create: () => { if (o.falhaCriar) throw new Error('sem permissão'); estado.criados.push(estado.handler); estado.gatilhos.push(estado.handler); return {}; }
  };
  const ctx = {
    Logger: { log: () => {} },
    DocumentApp: { getActiveDocument: () => ({ getId: () => 'DOC' }), getUi: () => ({ showSidebar: () => {} }) },
    Session: {
      getActiveUser: () => ({ getEmail: () => o.ativo }),
      getEffectiveUser: () => ({ getEmail: () => o.efetivo })
    },
    ScriptApp: {
      getUserTriggers: () => estado.gatilhos.map(h => ({ getHandlerFunction: () => h })),
      newTrigger: h => { estado.handler = h; return builder; }
    },
    WhiteboxLib: {
      getContext: () => o.contexto,
      showSidebar: opcoes => { estado.sidebars++; estado.opcoes = opcoes; }
    },
    HtmlService: {}
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(CLIENTE, 'utf8'), ctx, { filename: 'Código.gs' });
  return { ctx, estado };
}

const ALUNO_DISTRIBUIDO = { initialRole: 'student', email: 'aluno@x.com', debugInfo: { hasDesignation: true } };

test('aluno em cópia distribuída: getContext cria o gatilho onOpen uma única vez', () => {
  const { ctx, estado } = montar({ contexto: ALUNO_DISTRIBUIDO });
  assert.equal(ctx.getContext(), ALUNO_DISTRIBUIDO);
  ctx.getContext();
  assert.deepEqual(estado.criados, ['abrirPainelAutomaticamente']);
});

test('gatilho já existente não é duplicado', () => {
  const { ctx, estado } = montar({ contexto: ALUNO_DISTRIBUIDO, gatilhos: ['abrirPainelAutomaticamente'] });
  ctx.getContext();
  assert.equal(estado.criados.length, 0);
});

test('professor e documento mestre não ganham gatilho', () => {
  for (const contexto of [
    { initialRole: 'teacher', debugInfo: { hasDesignation: true } },
    { initialRole: 'student', debugInfo: { hasDesignation: false } },
    { error: 'LIB_CALL_FAILED' }
  ]) {
    const { ctx, estado } = montar({ contexto });
    ctx.getContext();
    assert.equal(estado.criados.length, 0, JSON.stringify(contexto));
  }
});

test('falha ao criar o gatilho não quebra getContext', () => {
  const { ctx } = montar({ contexto: ALUNO_DISTRIBUIDO, falhaCriar: true });
  assert.equal(ctx.getContext(), ALUNO_DISTRIBUIDO);
});

test('o próprio aluno abrindo: painel abre', () => {
  const { ctx, estado } = montar({ ativo: 'Aluno@x.com', efetivo: 'aluno@x.com' });
  assert.equal(ctx.abrirPainelAutomaticamente({}), true);
  assert.equal(estado.sidebars, 1);
});

test('outra pessoa abrindo (professor ou e-mail oculto): painel não abre', () => {
  for (const ativo of ['prof@x.com', '']) {
    const { ctx, estado } = montar({ ativo, efetivo: 'aluno@x.com' });
    assert.equal(ctx.abrirPainelAutomaticamente({}), false);
    assert.equal(estado.sidebars, 0);
  }
});

test('abertura pelo gatilho avisa a biblioteca (automatico) para o painel se fechar se não for aluno', () => {
  const { ctx, estado } = montar({ ativo: 'aluno@x.com', efetivo: 'aluno@x.com', contexto: ALUNO_DISTRIBUIDO });
  assert.equal(ctx.abrirPainelAutomaticamente({}), true);
  assert.equal(estado.opcoes && estado.opcoes.automatico, true);
});
