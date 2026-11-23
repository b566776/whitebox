// Testes da nova tentativa e da troca de modelo da IA (IAProviders.gs) com UrlFetchApp simulado.
// Rodar: node --test whitebox-server/tests/ia-retry.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SERVER = path.join(__dirname, '..');

/** @param {Array<[number, object]>} respostas - (código, corpo) em ordem; registra o modelo de cada chamada */
function montar(respostas, props) {
  const chamadas = [];
  const esperas = [];
  const ctx = {
    console,
    Logger: { log: () => {} },
    Utilities: { sleep: ms => esperas.push(ms) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (props || {})[k] || null }) },
    UrlFetchApp: {
      fetch: url => {
        chamadas.push(decodeURIComponent(url.split('/models/')[1].split(':')[0]));
        const [code, corpo] = respostas.shift() || [500, { error: { message: 'sem resposta' } }];
        return { getResponseCode: () => code, getContentText: () => JSON.stringify(corpo) };
      }
    },
    construirPromptSocratico: () => 'prompt',
    extrairJSON: t => JSON.parse(t)
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SERVER, 'IAProviders.gs'), 'utf8'), ctx, { filename: 'IAProviders.gs' });
  return { ctx, chamadas, esperas };
}

const OK = [200, { candidates: [{ content: { parts: [{ text: '{"riskScore": 10}' }] } }] }];
const SOBRECARGA = [503, { error: { message: 'This model is currently experiencing high demand.' } }];
const IA = { provider: 'gemini', model: 'gemini-3.8-flash', apiKey: 'AQ.x' };

test('503 uma vez: repete no mesmo modelo e devolve a análise', () => {
  const { ctx, chamadas, esperas } = montar([SOBRECARGA, OK]);
  const r = ctx.analisarComIA('trecho', {}, IA);
  assert.equal(r.riskScore, 10);
  assert.deepEqual(chamadas, ['gemini-3.8-flash', 'gemini-3.8-flash']);
  assert.equal(esperas.length, 1);
});

test('503 persistente: cai para o modelo de reserva', () => {
  const { ctx, chamadas } = montar([SOBRECARGA, SOBRECARGA, OK]);
  const r = ctx.analisarComIA('trecho', {}, IA);
  assert.equal(r.riskScore, 10);
  assert.equal(r.modeloUsado, 'gemini-flash-latest');
  assert.deepEqual(chamadas, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-flash-latest']);
});

test('Todos sobrecarregados: erro IA_SOBRECARREGADA com mensagem amigável', () => {
  const { ctx, chamadas } = montar([SOBRECARGA, SOBRECARGA, SOBRECARGA, SOBRECARGA, SOBRECARGA, SOBRECARGA]);
  const r = ctx.analisarComIA('trecho', {}, IA);
  assert.equal(r.error, 'IA_SOBRECARREGADA');
  assert.match(r.message, /sobrecarregado/);
  assert.equal(chamadas.length, 6);
});

test('Erro não transitório (400 chave inválida) não repete', () => {
  const { ctx, chamadas } = montar([[400, { error: { message: 'API key not valid' } }]]);
  const r = ctx.analisarComIA('trecho', {}, IA);
  assert.equal(r.error, 'IA_API_ERROR');
  assert.equal(chamadas.length, 1);
});

test('IA_FALLBACK_MODELS substitui a lista de reserva e não repete o modelo principal', () => {
  const { ctx, chamadas } = montar([SOBRECARGA, SOBRECARGA, OK],
    { IA_FALLBACK_MODELS: 'gemini-3.8-flash, gemini-flash-lite-latest' });
  ctx.analisarComIA('trecho', {}, IA);
  assert.deepEqual(chamadas, ['gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-flash-lite-latest']);
});
