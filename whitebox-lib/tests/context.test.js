// Testes da biblioteca fora do Apps Script: carrega Constants.gs, Utils.gs e Logic.gs
// num contexto Node com os serviços do Google substituídos por stubs.
// Rodar: node --test whitebox-lib/tests/context.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const LIB = path.join(__dirname, '..');

/**
 * Monta um contexto com stubs e devolve as funções da biblioteca.
 * @param {object} o
 * @param {boolean} o.driveOk        DriveApp.getFileById funciona?
 * @param {string}  o.userEmail      usuário logado
 * @param {string}  o.ownerEmail     dono do documento (Drive)
 * @param {string}  o.folderName     nome da pasta pai (Drive)
 * @param {string}  o.folderOwner    dono da pasta pai (Drive)
 * @param {string[]} o.designados    e-mails gravados em WHITEBOX_CONFIG
 * @param {string|null} o.licenca    status devolvido pelo servidor (ATIVO, INATIVO, NAO_CADASTRADO ou null)
 */
function montar(o) {
  const calls = [];
  const ranges = (o.designados || []).map(e => ({
    getName: () => 'WHITEBOX_CONFIG:' + JSON.stringify({ professorEmail: e })
  }));
  const doc = {
    getId: () => 'DOC123',
    getTabs: () => [{ asDocumentTab: () => ({ getNamedRanges: () => ranges }) }],
    getNamedRanges: () => ranges,
    getBody: () => ({ getParagraphs: () => [] })
  };
  const file = {
    getOwner: () => ({ getEmail: () => o.ownerEmail || '' }),
    getParents: () => {
      let next = true;
      return {
        hasNext: () => next,
        next: () => { next = false; return { getName: () => o.folderName || 'Pasta', getOwner: () => ({ getEmail: () => o.folderOwner || '' }) }; }
      };
    }
  };
  const store = {};
  const props = { getProperty: k => store[k] || null, setProperty: (k, v) => { store[k] = v; } };
  const ctx = {
    console,
    DocumentApp: { getActiveDocument: () => doc },
    DriveApp: { getFileById: () => { if (!o.driveOk) throw new Error('drive.file não cobre este arquivo'); return file; } },
    Drive: { Revisions: { list: () => { if (!o.driveOk) throw new Error('sem acesso'); return { revisions: [{}, {}, {}] }; } } },
    Session: { getActiveUser: () => ({ getEmail: () => o.userEmail }), getEffectiveUser: () => ({ getEmail: () => o.userEmail }) },
    PropertiesService: { getDocumentProperties: () => props, getScriptProperties: () => props, getUserProperties: () => props },
    CacheService: { getDocumentCache: () => ({ get: () => null, put: () => {} }), getUserCache: () => ({ get: () => null, put: () => {} }), getScriptCache: () => ({ get: () => null, put: () => {} }) },
    Logger: { log: () => {} },
    UrlFetchApp: { fetch: () => { throw new Error('sem rede no teste'); }, fetchAll: () => [] },
    ScriptApp: { getOAuthToken: () => 'tok' },
    MailApp: { sendEmail: () => {} },
    HtmlService: { createHtmlOutputFromFile: () => ({ setTitle: () => ({}) }) },
    Utilities: { sleep: () => {} }
  };
  vm.createContext(ctx);
  for (const f of ['Constants.gs', 'RadarCore.gs', 'Utils.gs', 'Logic.gs']) {
    vm.runInContext(fs.readFileSync(path.join(LIB, f), 'utf8'), ctx, { filename: f });
  }
  // Substitui as chamadas ao servidor: licença e proxy.
  vm.runInContext(`
    function getTeacherLicenseStatus() { return __licenca ? { status: __licenca } : { status: 'NAO_CADASTRADO' }; }
    function callProxy(route, payload) { __calls.push({ route, payload }); return { success: true }; }
  `, ctx);
  ctx.__licenca = o.licenca || null;
  ctx.__calls = calls;
  return { ctx, calls };
}

test('Drive liberado: item3 traz pasta, dono da pasta, revisões e driveAccess=true', () => {
  const { ctx } = montar({ driveOk: true, userEmail: 'aluno@ies.edu.br', folderName: 'Turma A', folderOwner: 'prof@ies.edu.br' });
  const item3 = ctx.getAdvancedItem3Data();
  assert.equal(item3.driveAccess, true);
  assert.equal(item3.gradeLevel, 'Turma A');
  assert.equal(item3.professorEmail, 'prof@ies.edu.br');
  assert.equal(item3.revisionsCount, 3);
});

test('Drive negado: item3 degrada com driveAccess=false e sem erro', () => {
  const { ctx } = montar({ driveOk: false, userEmail: 'aluno@ies.edu.br' });
  const item3 = ctx.getAdvancedItem3Data();
  assert.equal(item3.driveAccess, false);
  assert.equal(item3.gradeLevel, 'NAO_IDENTIFICADO');
  assert.equal(item3.professorEmail, 'NAO_IDENTIFICADO');
  assert.equal(item3.revisionsCount, 0);
  // A escola vem do cadastro no servidor, nunca do domínio do e-mail (@gmail não diz a escola).
  assert.equal(item3.institutionId, 'NAO_IDENTIFICADO');
});

test('Add-on num documento sem designação: aluno recebe o papel fora', () => {
  const { ctx } = montar({ driveOk: false, userEmail: 'aluno@ies.edu.br', designados: [] });
  assert.equal(ctx.getContext({ addon: true }).initialRole, 'fora');
  assert.equal(ctx.getContext().initialRole, 'student', 'script vinculado: o documento é sempre do Whitebox');
});

test('Add-on: professor cadastrado no mestre continua teacher; aluno na cópia designada continua student', () => {
  const p = montar({ driveOk: false, userEmail: 'prof@ies.edu.br', designados: [], licenca: 'ATIVO' });
  assert.equal(p.ctx.getContext({ addon: true }).initialRole, 'teacher');
  const a = montar({ driveOk: false, userEmail: 'aluno@ies.edu.br', designados: ['prof@ies.edu.br'] });
  assert.equal(a.ctx.getContext({ addon: true }).initialRole, 'student');
});

test('Professor cadastrado em documento sem designação e sem Drive é teacher', () => {
  const { ctx } = montar({ driveOk: false, userEmail: 'prof@ies.edu.br', designados: [], licenca: 'ATIVO' });
  const c = ctx.getContext();
  assert.equal(c.initialRole, 'teacher');
  assert.equal(c.debugInfo.hasDesignation, false);
});

test('Professor cadastrado em cópia designada a outro professor continua student', () => {
  const { ctx } = montar({ driveOk: false, userEmail: 'prof@ies.edu.br', designados: ['outro@ies.edu.br'], licenca: 'ATIVO' });
  assert.equal(ctx.getContext().initialRole, 'student');
});

test('Professor designado é teacher mesmo sem licença confirmada', () => {
  const { ctx } = montar({ driveOk: false, userEmail: 'prof@ies.edu.br', designados: ['prof@ies.edu.br'], licenca: null });
  assert.equal(ctx.getContext().initialRole, 'teacher');
});

test('Aluno em cópia distribuída sem Drive: student, telemetria vai ao designado com SEM_TURMA', () => {
  const { ctx, calls } = montar({ driveOk: false, userEmail: 'aluno@ies.edu.br', designados: ['prof@ies.edu.br'], licenca: null });
  assert.equal(ctx.getContext().initialRole, 'student');
  ctx.sendToBackend({ behavioralMetrics: { palavras: 10 } });
  // const do Apps Script não vira propriedade do global do vm; avalia no contexto.
  const rota = vm.runInContext('ROUTE_LOGAR_METRICAS', ctx);
  const log = calls.find(c => c.route === rota);
  assert.ok(log, 'logar_metricas deve ser chamado');
  assert.equal(log.payload.professorEmail, 'prof@ies.edu.br');
  assert.equal(log.payload.turma, 'SEM_TURMA');
  assert.equal(log.payload.alunoEmail, 'aluno@ies.edu.br');
});

test('Aluno não cadastrado em documento sem designação não vira teacher', () => {
  const { ctx } = montar({ driveOk: false, userEmail: 'aluno@ies.edu.br', designados: [], licenca: null });
  assert.equal(ctx.getContext().initialRole, 'student');
});

// Pede análise + métricas e devolve os payloads enviados a cada rota.
function analisarEMedir(ctx, calls) {
  ctx.sendToBackend({ contentAnalysis: { selectedFragment: 'texto' }, behavioralMetrics: {} });
  const rotaAnalisar = vm.runInContext('ROUTE_ANALISAR', ctx);
  const rotaLogar    = vm.runInContext('ROUTE_LOGAR_METRICAS', ctx);
  const analise = calls.find(c => c.route === rotaAnalisar);
  const log     = calls.find(c => c.route === rotaLogar);
  assert.ok(analise, 'analisar deve ser chamado');
  assert.ok(log, 'logar_metricas deve ser chamado');
  return { analise, log };
}

test('Professor cadastrado, sem Drive e sem designação: análise e métricas vão com o e-mail dele', () => {
  const { ctx, calls } = montar({ driveOk: false, userEmail: 'prof@ies.edu.br', designados: [], licenca: 'ATIVO' });
  const { analise, log } = analisarEMedir(ctx, calls);
  assert.equal(analise.payload.professorEmail, 'prof@ies.edu.br');
  assert.equal(log.payload.professorEmail, 'prof@ies.edu.br');
});

test('Professor cadastrado, Drive OK em pasta do aluno e sem designação: análise e métricas vão com o e-mail dele', () => {
  const { ctx, calls } = montar({
    driveOk: true, userEmail: 'prof@ies.edu.br', ownerEmail: 'aluno@ies.edu.br',
    folderName: 'Turma A', folderOwner: 'aluno@ies.edu.br', designados: [], licenca: 'ATIVO'
  });
  const { analise, log } = analisarEMedir(ctx, calls);
  assert.equal(analise.payload.professorEmail, 'prof@ies.edu.br');
  assert.equal(log.payload.professorEmail, 'prof@ies.edu.br');
});

// getProcessReport: envia docId e o professor do documento; o servidor filtra pelo chamador.
function pedirRelatorio(ctx, calls) {
  ctx.getProcessReport();
  const rota = vm.runInContext('ROUTE_RESUMO_PROCESSO', ctx);
  assert.equal(rota, 'resumo_processo');
  const chamada = calls.find(c => c.route === rota);
  assert.ok(chamada, 'resumo_processo deve ser chamado');
  return chamada.payload;
}

test('getProcessReport: aluno em cópia designada envia docId e o professor designado', () => {
  const { ctx, calls } = montar({ driveOk: false, userEmail: 'aluno@ies.edu.br', designados: ['prof@ies.edu.br'], licenca: null });
  const payload = pedirRelatorio(ctx, calls);
  assert.equal(payload.docId, 'DOC123');
  assert.equal(payload.professorEmail, 'prof@ies.edu.br');
});

test('getProcessReport: professor no documento mestre envia o próprio e-mail', () => {
  const { ctx, calls } = montar({ driveOk: true, userEmail: 'prof@ies.edu.br', ownerEmail: 'prof@ies.edu.br', folderOwner: 'prof@ies.edu.br', designados: [], licenca: 'ATIVO' });
  const payload = pedirRelatorio(ctx, calls);
  assert.equal(payload.docId, 'DOC123');
  assert.equal(payload.professorEmail, 'prof@ies.edu.br');
});

test('Cliente: wrapper getProcessReport chama a biblioteca', () => {
  const src = fs.readFileSync(path.join(LIB, '..', 'whitebox-client', 'Código.gs'), 'utf8');
  assert.match(src, /function getProcessReport\(\)\s*\{\s*return callLibrary\('getProcessReport', \[\]\);/);
});

test('Sidebar: aviso de Drive fica dentro da visão do professor e reage a driveAccess === false', () => {
  const html = fs.readFileSync(path.join(LIB, 'Sidebar.html'), 'utf8');
  const teacherView = html.indexOf('id="teacher-view"');
  const notice = html.indexOf('id="teacher-drive-notice"');
  // Próximo contêiner de visão depois de #teacher-view (ou fim do arquivo).
  const next = html.slice(teacherView + 1).search(/<div id="[a-z-]+-view"/);
  const nextView = next === -1 ? html.length : teacherView + 1 + next;
  assert.ok(teacherView !== -1 && notice > teacherView, 'aviso deve vir depois de #teacher-view');
  assert.ok(notice < nextView, 'aviso deve ficar dentro de #teacher-view, antes do próximo contêiner de visão');
  assert.match(html, /ctx\.item3\.driveAccess === false/);
  assert.match(html, /teacher-drive-notice'\)\.classList\.remove\('hidden'\)/);
});

test('Manifestos: escopos idênticos, com drive.file e sem escopo restrito do Drive', () => {
  const read = p => JSON.parse(fs.readFileSync(path.join(LIB, '..', p), 'utf8')).oauthScopes.slice().sort();
  const client = read('whitebox-client/appsscript.json');
  const lib = read('whitebox-lib/appsscript.json');
  assert.deepEqual(client, lib);
  assert.ok(client.includes('https://www.googleapis.com/auth/drive.file'));
  const driveScopes = client.filter(s => /\/auth\/drive(\.|$)/.test(s));
  assert.deepEqual(driveScopes, ['https://www.googleapis.com/auth/drive.file']);
});
