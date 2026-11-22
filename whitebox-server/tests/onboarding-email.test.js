// Testes do envio do link de onboarding por e-mail (enviarLinkOnboardingPorEmail),
// fora do Apps Script: carrega Constants.gs e FormOnboarding.gs num contexto Node com
// Drive, Forms e MailApp falsos.
// Rodar: node --test whitebox-server/tests/onboarding-email.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SERVER = path.join(__dirname, '..');
const TOKEN = 'TOKEN-OK';
const URL_FORM = 'https://docs.google.com/forms/d/e/PUBLICADO/viewform';

function montar(o) {
  o = Object.assign({ nome: 'Whitebox - Onboarding: Leva 2026/1', aberto: true, quota: 100 }, o);
  const enviados = [];
  const ctx = {
    console,
    Logger: { log: () => {} },
    validateAdminAccess: t => { if (t !== TOKEN) throw new Error('UNAUTHORIZED'); },
    DriveApp: {
      getFileById: id => {
        if (id !== 'FORM-1') throw new Error('não encontrado: ' + id);
        return { getName: () => o.nome };
      }
    },
    FormApp: {
      openById: () => ({ isAcceptingResponses: () => o.aberto, getPublishedUrl: () => URL_FORM })
    },
    MailApp: {
      getRemainingDailyQuota: () => o.quota,
      sendEmail: msg => {
        if (o.falhaPara === msg.to) throw new Error('Endereço recusado');
        enviados.push(msg);
      }
    }
  };
  vm.createContext(ctx);
  for (const f of ['Constants.gs', 'FormOnboarding.gs']) {
    vm.runInContext(fs.readFileSync(path.join(SERVER, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, enviados };
}

test('envia o link do formulário ao professor, com leva e prazo no texto', () => {
  const { ctx, enviados } = montar();
  const r = ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', 'Prof@Escola.edu.br', '2026-12-05T18:30');
  assert.equal(r.success, true);
  assert.deepEqual([...r.enviados], ['prof@escola.edu.br']);
  assert.equal(r.url, URL_FORM);
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, 'prof@escola.edu.br');
  assert.match(enviados[0].subject, /Convite para cadastro no Whitebox - Leva 2026\/1/);
  assert.ok(enviados[0].body.includes(URL_FORM));
  assert.match(enviados[0].body, /leva "Leva 2026\/1"/);
  assert.match(enviados[0].body, /aberto até 05\/12\/2026 às 18:30/);
  assert.match(enviados[0].body, /conta Google que você vai usar/);
});

test('aceita vários e-mails separados por vírgula, ponto e vírgula ou linha, sem repetir', () => {
  const { ctx, enviados } = montar();
  const r = ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', 'a@x.com, b@x.com;\nA@X.com  c@x.com');
  assert.deepEqual([...r.enviados], ['a@x.com', 'b@x.com', 'c@x.com']);
  assert.equal(enviados.length, 3);
  assert.doesNotMatch(enviados[0].body, /aberto até/, 'sem data limite não fala de prazo');
});

test('recusa token inválido sem enviar nada', () => {
  const { ctx, enviados } = montar();
  assert.throws(() => ctx.enviarLinkOnboardingPorEmail('errado', 'FORM-1', 'a@x.com'), /UNAUTHORIZED/);
  assert.equal(enviados.length, 0);
});

test('recusa e-mail vazio ou inválido sem enviar nada', () => {
  const { ctx, enviados } = montar();
  assert.throws(() => ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', '  '), /Informe o e-mail/);
  assert.throws(() => ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', 'a@x.com, nao-e-email'),
    /E-mail inválido: nao-e-email/);
  assert.equal(enviados.length, 0);
});

test('recusa formulário que não é onboarding do Whitebox ou que está fechado', () => {
  let m = montar({ nome: 'Pesquisa qualquer' });
  assert.throws(() => m.ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', 'a@x.com'), /não é um onboarding/);
  m = montar({ aberto: false });
  assert.throws(() => m.ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', 'a@x.com'), /fechado/);
  assert.throws(() => m.ctx.enviarLinkOnboardingPorEmail(TOKEN, '', 'a@x.com'), /não informado/);
  assert.equal(m.enviados.length, 0);
});

test('recusa quando a cota diária de e-mails não basta', () => {
  const { ctx, enviados } = montar({ quota: 1 });
  assert.throws(() => ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', 'a@x.com b@x.com'), /Cota diária/);
  assert.equal(enviados.length, 0);
});

test('recusa mais destinatários que o limite', () => {
  const { ctx } = montar({ quota: 1000 });
  const lista = Array.from({ length: 51 }, (_, i) => 'p' + i + '@x.com').join(',');
  assert.throws(() => ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', lista), /no máximo 50/);
});

test('falha num endereço não impede o envio aos outros', () => {
  const { ctx, enviados } = montar({ falhaPara: 'b@x.com' });
  const r = ctx.enviarLinkOnboardingPorEmail(TOKEN, 'FORM-1', 'a@x.com, b@x.com');
  assert.equal(r.success, true);
  assert.deepEqual([...r.enviados], ['a@x.com']);
  assert.equal(r.falhas.length, 1);
  assert.equal(r.falhas[0].email, 'b@x.com');
  assert.match(r.falhas[0].erro, /recusado/);
  assert.equal(enviados.length, 1);
});
