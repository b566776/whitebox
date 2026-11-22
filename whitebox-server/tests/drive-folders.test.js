// Testes da organização do Drive (pasta WhiteBox) e da ajuda do formulário de onboarding,
// fora do Apps Script: carrega Constants.gs, AdminSetup.gs e FormOnboarding.gs num contexto
// Node com um Drive em memória.
// Rodar: node --test whitebox-server/tests/drive-folders.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SERVER = path.join(__dirname, '..');
const DEV = 'dev@exemplo.com';
const SERVER_SCRIPT = 'SCRIPT-SERVER';
const FORM_MIME = 'application/vnd.google-apps.form';

/** Drive em memória: só o que AdminSetup.gs e FormOnboarding.gs usam. */
function criarDrive() {
  let seq = 0;
  const nodes = {};
  const iter = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
  const filhos = (id, pasta) => Object.values(nodes).filter(n => n.parent === id && n.pasta === pasta);

  function no(nome, parent, pasta, extra) {
    const id = extra && extra.id || ('ID' + (++seq));
    nodes[id] = Object.assign({ id, nome, parent, pasta, mime: '' }, extra || {}, { id });
    return wrap(id);
  }
  function wrap(id) {
    const n = nodes[id];
    return {
      getId: () => id,
      getName: () => n.nome,
      getParents: () => iter(n.parent ? [wrap(n.parent)] : []),
      moveTo: dest => { n.parent = dest.getId(); },
      // Como no Drive real, a busca por nome não diferencia maiúsculas.
      getFoldersByName: nome => iter(filhos(id, true)
        .filter(c => c.nome.toLowerCase() === nome.toLowerCase()).map(c => wrap(c.id))),
      getFolders: () => iter(filhos(id, true).map(c => wrap(c.id))),
      getFiles: () => iter(filhos(id, false).map(c => wrap(c.id))),
      createFolder: nome => no(nome, id, true)
    };
  }
  const raiz = no('Meu Drive', null, true, { id: 'ROOT' });
  return {
    nodes, raiz,
    pasta: (nome, pai) => no(nome, (pai || raiz).getId(), true),
    arquivo: (nome, pai, extra) => no(nome, (pai || raiz).getId(), false, extra),
    caminho: id => {
      const partes = [];
      for (let n = nodes[id]; n && n.parent; n = nodes[n.parent]) partes.unshift(n.nome);
      return partes.join('/');
    },
    DriveApp: {
      getRootFolder: () => raiz,
      getFileById: id => { if (!nodes[id]) throw new Error('não encontrado: ' + id); return wrap(id); },
      searchFiles: q => {
        const m = q.match(/title contains '([^']+)'/);
        return iter(Object.values(nodes).filter(n => !n.pasta && n.nome.indexOf(m[1]) >= 0 &&
          (q.indexOf(FORM_MIME) < 0 || n.mime === FORM_MIME)).map(n => wrap(n.id)));
      }
    }
  };
}

function montar(drive, o) {
  o = o || {};
  const ctx = {
    console,
    Logger: { log: () => {} },
    DriveApp: drive.DriveApp,
    Session: { getEffectiveUser: () => ({ getEmail: () => DEV }) },
    ScriptApp: { getScriptId: () => SERVER_SCRIPT },
    FormApp: {
      ItemType: { TEXT: 'TEXT' },
      openById: id => ({ getItems: () => (o.forms && o.forms[id]) || [] })
    },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => ({ getDataRange: () => ({ getValues: () => o.config || [['Parametro', 'Valor']] }) }) })
    },
    getConfig: () => ({ adminSpreadsheetId: o.adminId || '' }),
    getPlanilhaGlobal: () => ({ getDataRange: () => ({ getValues: () => o.assinaturas || [['Email', 'SpreadsheetId']] }) })
  };
  vm.createContext(ctx);
  for (const f of ['Constants.gs', 'AdminSetup.gs', 'FormOnboarding.gs']) {
    vm.runInContext(fs.readFileSync(path.join(SERVER, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

/** Pergunta de texto do formulário, com o título e a ajuda guardados para conferir. */
function item(titulo) {
  const it = { titulo, ajuda: 'texto antigo' };
  return { it, getTitle: () => it.titulo, setHelpText: t => { it.ajuda = t; } };
}

test('getOrCreateTargetFolder cria WhiteBox na raiz e reaproveita a mesma pasta depois', () => {
  const drive = criarDrive();
  const ctx = montar(drive);
  const a = ctx.getOrCreateTargetFolder();
  assert.equal(drive.caminho(a.getId()), 'WhiteBox');
  assert.equal(ctx.getOrCreateTargetFolder().getId(), a.getId());
  assert.equal(drive.caminho(ctx.getOrCreateScriptsFolder().getId()), 'WhiteBox/Scripts');
});

test('getOrCreateTargetFolder não confunde a pasta antiga "whitebox" com "WhiteBox"', () => {
  const drive = criarDrive();
  const antiga = drive.pasta('whitebox');
  const nova = montar(drive).getOrCreateTargetFolder();
  assert.notEqual(nova.getId(), antiga.getId());
  assert.equal(nova.getName(), 'WhiteBox');
});

test('organizarPastasWhitebox move o que já existe para WhiteBox e WhiteBox/Scripts', () => {
  const drive = criarDrive();
  const projetos = drive.pasta('Projetos', drive.pasta('GDrive Meus Documentos'));
  const antiga = drive.pasta('whitebox', projetos);
  drive.arquivo('Whitebox - Painel Global Admin', antiga, { id: 'ADMIN' });
  const tplAntigo = drive.pasta('templates', antiga);
  drive.arquivo('Modelo A', tplAntigo, { id: 'TPL-A' });
  const soltaNaRaiz = drive.pasta('whitebox');
  drive.pasta('Distribucoes', soltaNaRaiz);
  drive.arquivo('Whitebox - prof@ies.edu.br', null, { id: 'LOG-PROF' });
  drive.arquivo('Whitebox - Onboarding: Leva 1', null, { id: 'FORM-1', mime: FORM_MIME });
  drive.arquivo('Whitebox - Modelo Mestre (prof@ies.edu.br)', null, { id: 'MESTRE' });
  drive.arquivo('Documento modelo', null, { id: 'SEED-DOC' });
  drive.arquivo('whitebox-server', null, { id: SERVER_SCRIPT });
  drive.arquivo('whitebox-lib', null, { id: '1I-W1uY1EjP6i0cyKF-nfXcLC989yUIKirmmAb44aPbVFLkwMR8uz5Yt8' });
  drive.arquivo('Outro arquivo qualquer', null, { id: 'ALHEIO' });

  const ajuda = item('Link do arquivo de Cofre (Google Drive)');
  const ctx = montar(drive, {
    adminId: 'ADMIN',
    assinaturas: [['Email', 'SpreadsheetId'], ['prof@ies.edu.br', 'LOG-PROF']],
    config: [['Parametro', 'Valor'], ['seed_document_id', 'SEED-DOC']],
    forms: { 'FORM-1': [ajuda] }
  });

  const r = ctx.organizarPastasWhitebox();

  const onde = id => drive.caminho(id);
  assert.equal(onde('ADMIN'), 'WhiteBox/Whitebox - Painel Global Admin');
  assert.equal(onde('TPL-A'), 'WhiteBox/templates/Modelo A');
  assert.equal(onde('LOG-PROF'), 'WhiteBox/Whitebox - prof@ies.edu.br');
  assert.equal(onde('FORM-1'), 'WhiteBox/Whitebox - Onboarding: Leva 1');
  assert.equal(onde('MESTRE'), 'WhiteBox/Whitebox - Modelo Mestre (prof@ies.edu.br)');
  assert.equal(onde('SEED-DOC'), 'WhiteBox/Documento modelo');
  assert.equal(onde(SERVER_SCRIPT), 'WhiteBox/Scripts/whitebox-server');
  assert.equal(onde('1I-W1uY1EjP6i0cyKF-nfXcLC989yUIKirmmAb44aPbVFLkwMR8uz5Yt8'), 'WhiteBox/Scripts/whitebox-lib');
  assert.equal(onde('ALHEIO'), 'Outro arquivo qualquer', 'arquivos que não são do Whitebox ficam onde estão');
  const distrib = Object.values(drive.nodes).filter(n => n.pasta && n.nome === 'Distribucoes');
  assert.equal(distrib.length, 1);
  assert.equal(onde(distrib[0].id), 'WhiteBox/Distribucoes');
  assert.equal(r.formulariosAtualizados, 1);
  assert.match(ajuda.it.ajuda, /\.txt/);

  // Repetir não move nada de novo
  assert.equal(ctx.organizarPastasWhitebox().movidos.length, 0);
});

test('Ajuda do Cofre explica a chave de IA, o .txt, o compartilhamento e o campo em branco', () => {
  const ajuda = montar(criarDrive()).textoAjudaCofre();
  assert.match(ajuda, /AIza/);
  assert.match(ajuda, /https:\/\/aistudio\.google\.com\/app\/apikey/);
  assert.match(ajuda, /sk-ant-/);
  assert.match(ajuda, /console\.anthropic\.com/);
  assert.match(ajuda, /\.txt/);
  assert.match(ajuda, /Google Docs não funciona/);
  assert.match(ajuda, new RegExp('Leitor com ' + DEV.replace('.', '\\.')));
  assert.match(ajuda, /Qualquer pessoa com o link/);
  assert.match(ajuda, /em branco, o cadastro é feito sem IA/);
  assert.match(ajuda, /⚙️ Config > 💾 Salvar Chave API/);
  assert.doesNotMatch(ajuda, /Chave Global/);
});

test('atualizarAjudaFormulariosOnboarding só mexe na pergunta do Cofre', () => {
  const drive = criarDrive();
  drive.arquivo('Whitebox - Onboarding (Semente)', null, { id: 'SEMENTE', mime: FORM_MIME });
  const cofre = item('Link do arquivo de Cofre (Google Drive)');
  const nome = item('Seu Nome Completo');
  const ctx = montar(drive, { forms: { SEMENTE: [nome, cofre] } });
  assert.equal(ctx.atualizarAjudaFormulariosOnboarding(), 1);
  assert.equal(cofre.it.ajuda, ctx.textoAjudaCofre());
  assert.equal(nome.it.ajuda, 'texto antigo');
});
