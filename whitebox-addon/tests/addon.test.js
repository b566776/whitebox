// Testes do add-on (whitebox-addon/Código.gs) com stubs do Apps Script.
// Rodar: node --test whitebox-addon/tests/addon.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..', '..');
const ADDON = path.join(RAIZ, 'whitebox-addon', 'Código.gs');
const CLIENTE = path.join(RAIZ, 'whitebox-client', 'Código.gs');

function montar(o) {
  o = o || {};
  const estado = { menu: [], libChamadas: [], gatilhos: [], sidebars: 0 };
  const menu = {
    addItem: (rotulo, fn) => { estado.menu.push(fn); return menu; },
    addToUi: () => {}
  };
  const lib = new Proxy({}, {
    get: (_, nome) => (...args) => {
      estado.libChamadas.push({ nome, args });
      if (nome === 'getContext') return o.contexto || { initialRole: 'fora', debugInfo: {} };
      if (nome === 'showSidebar') estado.sidebars++;
      return null;
    }
  });
  const builder = { forDocument: () => builder, onOpen: () => builder, create: () => { estado.gatilhos.push('x'); } };
  const ctx = {
    Logger: { log: () => {} },
    DocumentApp: {
      getUi: () => ({ createAddonMenu: () => menu, createMenu: () => { throw new Error('add-on usa createAddonMenu'); }, showSidebar: () => {} }),
      getActiveDocument: () => ({ getId: () => 'DOC' })
    },
    ScriptApp: { getUserTriggers: () => [], newTrigger: () => builder },
    Session: { getActiveUser: () => ({ getEmail: () => 'a@x.com' }), getEffectiveUser: () => ({ getEmail: () => 'a@x.com' }) },
    HtmlService: { createHtmlOutput: () => ({ setTitle: () => ({}) }) },
    WhiteboxLib: lib
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(ADDON, 'utf8'), ctx, { filename: 'Código.gs' });
  return { ctx, estado };
}

const funcoes = src => new Set([...src.matchAll(/^function (\w+)\(/gm)].map(m => m[1]));

test('onOpen monta o menu do add-on sem chamar a biblioteca (AuthMode.NONE)', () => {
  const { ctx, estado } = montar();
  ctx.onOpen({ authMode: 'NONE' });
  assert.deepEqual(estado.menu, ['showSidebar', 'conferirConexao']);
  assert.equal(estado.libChamadas.length, 0);
});

test('getContext avisa a biblioteca que é o add-on', () => {
  const { ctx, estado } = montar();
  ctx.getContext();
  assert.deepEqual(JSON.parse(JSON.stringify(estado.libChamadas[0])), { nome: 'getContext', args: [{ addon: true }] });
});

test('Aluno numa atividade do Whitebox ganha a abertura automática; documento de fora, não', () => {
  const a = montar({ contexto: { initialRole: 'student', debugInfo: { hasDesignation: true } } });
  a.ctx.getContext();
  assert.equal(a.estado.gatilhos.length, 1);
  const b = montar({ contexto: { initialRole: 'fora', debugInfo: { hasDesignation: false } } });
  b.ctx.getContext();
  assert.equal(b.estado.gatilhos.length, 0);
});

test('O add-on expõe ao painel as mesmas funções do script vinculado', () => {
  const cli = funcoes(fs.readFileSync(CLIENTE, 'utf8'));
  const add = funcoes(fs.readFileSync(ADDON, 'utf8'));
  for (const f of cli) {
    if (f === 'fallbackMenu') continue; // no add-on o menu nunca depende da biblioteca
    assert.ok(add.has(f), 'falta ' + f + ' no add-on');
  }
});

test('Manifesto do add-on: mesmos escopos do cliente e biblioteca em versão fixa', () => {
  const m = JSON.parse(fs.readFileSync(path.join(RAIZ, 'whitebox-addon', 'appsscript.json'), 'utf8'));
  const c = JSON.parse(fs.readFileSync(path.join(RAIZ, 'whitebox-client', 'appsscript.json'), 'utf8'));
  assert.deepEqual(m.oauthScopes.slice().sort(), c.oauthScopes.slice().sort());
  const lib = m.dependencies.libraries.find(l => l.userSymbol === 'WhiteboxLib');
  assert.equal(lib.developmentMode, false, 'add-on publicado não pode rodar o código em edição da biblioteca');
});

test('Conferir conexão: mostra o ID de cliente e diz se o servidor reconhece o add-on', () => {
  const { ctx } = montar();
  const ok = ctx.textoConferencia({ ok: true, email: 'a@x.com', clientId: 'ADDON.apps', origem: 'addon', idsConfigurados: 1 });
  assert.match(ok, /ID de cliente OAuth: ADDON\.apps/);
  assert.match(ok, /O servidor reconhece o add-on/);
  assert.match(ctx.textoConferencia({ ok: true, clientId: 'X', origem: 'script_vinculado', idsConfigurados: 0 }), /ainda não está configurado/);
  assert.match(ctx.textoConferencia({ ok: true, clientId: 'X', origem: 'script_vinculado', idsConfigurados: 2 }), /NÃO está em ADDON_CLIENT_IDS/);
  assert.match(ctx.textoConferencia({ error: 'PROXY_INVALID_RESPONSE', message: 'fora do ar' }), /não respondeu: fora do ar/);
});
