// REGRA DO PROJETO (Marcelo, 2026-11-23): nenhuma mudança pode empurrar o app para
// escopos RESTRITOS do Google (verificação de ~6 semanas + auditoria de segurança paga
// anual, CASA). Este teste falha se a biblioteca ou o cliente, que pedem autorização aos
// usuários, declararem um escopo restrito.
// Lista: https://support.google.com/cloud/answer/13464325 (consultada em 2026-11-23).
// O servidor fica de fora: é um Web App executado como a conta dona (USER_DEPLOYING), e os
// usuários não autorizam os escopos dele.
// Rodar: node --test whitebox-lib/tests/escopos.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '..');
const G = 'https://www.googleapis.com/auth/';

const RESTRITOS = [
  'https://mail.google.com/',
  ...['gmail.readonly', 'gmail.metadata', 'gmail.modify', 'gmail.insert', 'gmail.compose',
      'gmail.settings.basic', 'gmail.settings.sharing',
      'drive', 'drive.readonly', 'drive.activity', 'drive.activity.readonly', 'drive.metadata',
      'drive.metadata.readonly', 'drive.scripts', 'drive.meet.readonly',
      'chat.messages', 'chat.messages.readonly', 'chat.readonly', 'chat.delete', 'chat.import'
     ].map(s => G + s)
];
const PREFIXOS_RESTRITOS = [G + 'fitness.', G + 'dataportability.', G + 'photosambient.', G + 'googlehealth.'];

for (const projeto of ['whitebox-lib', 'whitebox-client']) {
  test(projeto + ': nenhum escopo restrito no appsscript.json', () => {
    const manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, projeto, 'appsscript.json'), 'utf8'));
    const escopos = manifesto.oauthScopes;
    assert.ok(Array.isArray(escopos) && escopos.length > 0,
      'oauthScopes precisa ser explícito: sem ele o Apps Script deduz escopos do código (pode virar drive)');
    for (const e of escopos) {
      assert.ok(!RESTRITOS.includes(e), e + ' é restrito (regra do projeto: nunca)');
      assert.ok(!PREFIXOS_RESTRITOS.some(p => e.startsWith(p)), e + ' é restrito (regra do projeto: nunca)');
    }
  });
}
