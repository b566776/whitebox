// Testes do histórico do Radar no servidor: núcleo idêntico ao da biblioteca, validação
// das medições, horários inconsistentes e as rotas registrar_medicoes / radar_documento
// com uma planilha em memória.
// Rodar: node --test whitebox-server/tests/radar-server.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SERVER = path.join(__dirname, '..');
const LIB = path.join(SERVER, '..', 'whitebox-lib');
const PROF = 'prof@x.com', ALUNO = 'aluno@x.com', DOC = 'DOC-1';
const SEG = 1000;

/** Planilha em memória com o mínimo que RadarServer.gs usa. */
function planilha() {
  const abas = {};
  const aba = nome => {
    const linhas = [];
    const sheet = {
      linhas,
      appendRow: r => { linhas.push(r.slice()); },
      getLastRow: () => linhas.length,
      getRange: (r, c, nr, nc) => ({
        getValues: () => Array.from({ length: nr || 1 }, (_, i) =>
          Array.from({ length: nc || 1 }, (_, j) => (linhas[r - 1 + i] || [])[c - 1 + j] ?? '')),
        getValue: () => (linhas[r - 1] || [])[c - 1] ?? '',
        setValues: vals => vals.forEach((row, i) => {
          linhas[r - 1 + i] = linhas[r - 1 + i] || [];
          row.forEach((v, j) => { linhas[r - 1 + i][c - 1 + j] = v; });
        }),
        setFontWeight: () => {}
      })
    };
    return sheet;
  };
  return {
    abas,
    getSheetByName: n => abas[n] || null,
    insertSheet: n => (abas[n] = aba(n))
  };
}

function montar(o) {
  o = o || {};
  const ss = planilha();
  const ctx = {
    console,
    Logger: { log: () => {} },
    SHEET_RADAR_ESTADO: 'Radar_Estado',
    SHEET_RADAR_EVENTOS: 'Radar_Eventos',
    SpreadsheetApp: { openById: () => ss },
    LockService: { getScriptLock: () => ({ tryLock: () => o.lockOk !== false, releaseLock: () => {} }) },
    __agora: o.agora || Date.parse('2026-11-23T12:00:00Z')
  };
  vm.createContext(ctx);
  for (const f of ['RadarCore.gs', 'RadarServer.gs', 'Escolas.gs']) {
    vm.runInContext(fs.readFileSync(path.join(SERVER, f), 'utf8'), ctx, { filename: f });
  }
  vm.runInContext(`
    function jsonResponse(data, code) { return { data: data, code: code || 200 }; }
    function buscarRegistroProfessor() { return { spreadsheetId: 'SS', status: 'Ativo', escola: 'Escola X' }; }
    Date.now = () => __agora;
  `, ctx);
  // Escola e IDs do add-on controlados pelo teste.
  ctx.configEscola = () => ctx.resolverConfigEscola('Escola X', o.escola || null, !!o.gmailLiberado);
  ctx.idsDoAddon = () => (o.idsAddon || []).slice();
  return { ctx, ss };
}

/** Medição com n parágrafos de tamanhos dados (hash = conteúdo simulado). */
function med(ctx, ts, textos) {
  return ctx.radarMedicao(textos, textos.map((t, i) => i === 0), ts);
}
const MARC = 'escreva o seu trabalho abaixo desta linha';
const frase = (s, n) => { let r = ''; let i = 0; while (r.length < n) r += s + ' p' + (i++) + ' '; return r.substring(0, n).trim(); };

test('RadarCore.gs é idêntico na biblioteca e no servidor', () => {
  assert.equal(fs.readFileSync(path.join(SERVER, 'RadarCore.gs'), 'utf8'),
               fs.readFileSync(path.join(LIB, 'RadarCore.gs'), 'utf8'));
});

test('Validação descarta medições malformadas e ordena por horário', () => {
  const { ctx } = montar();
  const v = ctx.radarValidarMedicoes([
    { ts: 3, h: ['a'], l: [1] },
    { ts: 1, h: ['a', 'b'], l: [1] },            // tamanhos diferentes
    { ts: 'x', h: [], l: [] },                    // sem horário
    { ts: 2, igual: true },
    { ts: 4, h: ['<script>'.repeat(10)], l: [5] } // hash longo demais vira ''
  ]);
  assert.deepEqual(Array.from(v, m => m.ts), [2, 3, 4]);
  assert.equal(v[2].h[0], '');
  assert.deepEqual(Array.from(ctx.radarValidarMedicoes('nada')), []);
});

test('registrar_medicoes guarda estado e eventos; colagem vira alerta no servidor', () => {
  const { ctx, ss } = montar();
  const t0 = ctx.__agora - 60 * SEG;
  const colado = frase('internet', 400);
  const body = {
    professorEmail: PROF, docId: DOC,
    medicoes: [med(ctx, t0, [MARC, '']), med(ctx, t0 + 15 * SEG, [MARC, colado])]
  };
  const r = ctx.handleRegistrarMedicoes(body, {}, ALUNO);
  assert.equal(r.data.aceitas, 2);
  assert.equal(r.data.alertas, 1);
  const estado = ss.abas.Radar_Estado.linhas;
  assert.equal(estado.length, 2, 'cabeçalho + 1 linha');
  assert.equal(estado[1][0], DOC);
  assert.equal(estado[1][1], ALUNO);
  const ev = ss.abas.Radar_Eventos.linhas;
  assert.equal(ev.length, 2);
  assert.equal(ev[1][3], 'C');

  const radar = ctx.handleRadarDocumento({ professorEmail: PROF, docId: DOC }, {});
  assert.equal(radar.data.alunos.length, 1);
  assert.equal(radar.data.alunos[0].medicoes, 2);
  const estados = ctx.radarEstados([ctx.radarHash(MARC), ctx.radarHash(colado)],
                                   ['', ctx.radarHashPrefixo(colado)], [true, false], radar.data.alunos[0].mapa);
  assert.equal(estados[1].estado, 'C');
});

test('O aluno é o e-mail verificado, não o do corpo; o professor é ignorado', () => {
  const { ctx, ss } = montar();
  const body = { professorEmail: PROF, docId: DOC, alunoEmail: 'outro@x.com', medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] };
  ctx.handleRegistrarMedicoes(body, {}, ALUNO);
  assert.equal(ss.abas.Radar_Estado.linhas[1][1], ALUNO);
  const r = ctx.handleRegistrarMedicoes(body, {}, PROF);
  assert.equal(r.data.ignorado, 'PROFESSOR_NAO_E_ALUNO');
});

test('Histórico inventado no passado depois de um envio é descartado e contado', () => {
  const { ctx, ss } = montar();
  const agora = ctx.__agora;
  ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, agora, [MARC, ''])] }, {}, ALUNO);
  // 10 min depois, o aluno manda "digitação lenta" datada de 1 h atrás
  ctx.__agora = agora + 10 * 60 * SEG;
  const falsas = [];
  for (let k = 1; k <= 5; k++) falsas.push(med(ctx, agora - 3600 * SEG + k * 15 * SEG, [MARC, frase('x', k * 40)]));
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: falsas }, {}, ALUNO);
  assert.equal(r.data.aceitas, 0);
  assert.equal(r.data.inconsistentes, 5);
  assert.equal(ss.abas.Radar_Estado.linhas[1][6], 5, 'Inconsistencias');
});

test('Medição no futuro é inconsistente', () => {
  const { ctx } = montar();
  const r = ctx.radarAplicarMedicoes(null, [med(ctx, ctx.__agora + 3600 * SEG, [MARC, 'a'])], ctx.__agora, null);
  assert.equal(r.inconsistentes, 1);
});

test('Pulsos sem mudança mantêm a janela observada: colar após 5 min parado é colagem', () => {
  const { ctx } = montar();
  const t0 = ctx.__agora - 10 * 60 * SEG;
  const meds = [med(ctx, t0, [MARC, 'Começo do texto.'])];
  for (let k = 1; k <= 20; k++) meds.push({ ts: t0 + k * 15 * SEG, igual: true });
  meds.push(med(ctx, t0 + 21 * 15 * SEG, [MARC, 'Começo do texto.', frase('colado', 500)]));
  const r = ctx.radarAplicarMedicoes(null, ctx.radarValidarMedicoes(meds), ctx.__agora, null);
  assert.equal(r.eventos.length, 1);
  assert.equal(r.eventos[0].estado, 'C');
});

test('Servidor ocupado responde 503 para o painel tentar de novo', () => {
  const { ctx } = montar({ lockOk: false });
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC])] }, {}, ALUNO);
  assert.equal(r.code, 503);
});

test('Roteador: registrar_medicoes aberta a alunos; radar_documento exige o professor', () => {
  const src = fs.readFileSync(path.join(SERVER, 'BrainProxy.gs'), 'utf8');
  const aberta = src.match(/const rotaAbertaAAlunos = \(([\s\S]*?)\);/)[1];
  assert.match(aberta, /ROUTE_REGISTRAR_MEDICOES/);
  assert.doesNotMatch(aberta, /ROUTE_RADAR_DOCUMENTO/);
  const prof = src.match(/const rotaDeProfessor = \[([\s\S]*?)\]/)[1];
  assert.match(prof, /ROUTE_RADAR_DOCUMENTO/);
  const lib = fs.readFileSync(path.join(LIB, 'Constants.gs'), 'utf8');
  const srv = fs.readFileSync(path.join(SERVER, 'Constants.gs'), 'utf8');
  for (const r of ['registrar_medicoes', 'radar_documento']) {
    assert.ok(lib.includes("'" + r + "'") && srv.includes("'" + r + "'"), r);
  }
});

// ---- Modo do painel por escola (Escolas.gs) ----

test('Escola sem linha na aba Escolas fica no modo antigo (script vinculado)', () => {
  const { ctx } = montar();
  const c = ctx.resolverConfigEscola('E', null, false);
  assert.equal(c.tipoConta, 'workspace');
  assert.equal(c.modoPainel, 'script_vinculado');
  assert.equal(c.travado, false);
});

test('Workspace + addon vale na hora; @gmail + addon fica travado até liberar', () => {
  const { ctx } = montar();
  assert.equal(ctx.resolverConfigEscola('E', ['E', 'Workspace', 'ADDON'], false).modoPainel, 'addon');
  const travada = ctx.resolverConfigEscola('E', ['E', 'gmail', 'addon'], false);
  assert.equal(travada.modoPainel, 'script_vinculado');
  assert.equal(travada.modoPedido, 'addon');
  assert.equal(travada.travado, true);
  assert.match(travada.motivo, /verificação/);
  assert.equal(ctx.resolverConfigEscola('E', ['E', 'gmail', 'addon'], true).modoPainel, 'addon');
  assert.equal(ctx.resolverConfigEscola('E', ['E', 'gmail', 'script_vinculado'], false).travado, false);
});

test('Modo addon: medições do script vinculado são recusadas; do add-on, aceitas', () => {
  const { ctx, ss } = montar({ escola: ['Escola X', 'workspace', 'addon'], idsAddon: ['ADDON.apps'] });
  const body = { professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] };
  const r1 = ctx.handleRegistrarMedicoes(body, {}, ALUNO, 'SCRIPT-DA-COPIA.apps');
  assert.equal(r1.code, 403);
  assert.equal(r1.data.error, 'ORIGEM_NAO_AUTORIZADA');
  assert.equal(ss.abas.Radar_Estado, undefined, 'nada gravado');
  const r2 = ctx.handleRegistrarMedicoes(body, {}, ALUNO, 'ADDON.apps');
  assert.equal(r2.data.aceitas, 1);
  assert.equal(ss.abas.Radar_Estado.linhas[1][8], 'addon', 'Ultima_Origem');
  const radar = ctx.handleRadarDocumento({ professorEmail: PROF, docId: DOC }, {});
  assert.equal(radar.data.alunos[0].origem, 'addon');
  assert.equal(radar.data.modoPainel, 'addon');
});

test('Modo addon sem ADDON_CLIENT_IDS recusa tudo e diz por quê', () => {
  const { ctx } = montar({ escola: ['Escola X', 'workspace', 'addon'], idsAddon: [] });
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC])] }, {}, ALUNO, 'ADDON.apps');
  assert.equal(r.code, 403);
  assert.equal(r.data.error, 'ADDON_NAO_CONFIGURADO');
});

test('Modo script vinculado aceita qualquer origem e registra qual foi', () => {
  const { ctx, ss } = montar({ idsAddon: ['ADDON.apps'] });
  ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] }, {}, ALUNO, 'OUTRO.apps');
  assert.equal(ss.abas.Radar_Estado.linhas[1][8], 'script_vinculado');
});

test('@gmail travado continua aceitando o script vinculado', () => {
  const { ctx } = montar({ escola: ['Escola X', 'gmail', 'addon'], idsAddon: ['ADDON.apps'] });
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] }, {}, ALUNO, 'OUTRO.apps');
  assert.equal(r.data.aceitas, 1);
});

test('Semente do mestre: modo addon usa o semente sem script; sem ele, cai no comum e avisa', () => {
  const { ctx } = montar();
  const addon = ctx.resolverConfigEscola('E', ['E', 'workspace', 'addon'], false);
  const script = ctx.resolverConfigEscola('E', null, false);
  assert.equal(ctx.escolherSemente(addon, 'COMUM', 'SEM-SCRIPT').seedId, 'SEM-SCRIPT');
  const sem = ctx.escolherSemente(addon, 'COMUM', '');
  assert.equal(sem.seedId, 'COMUM');
  assert.match(sem.aviso, /seed_document_id_addon/);
  assert.equal(ctx.escolherSemente(script, 'COMUM', 'SEM-SCRIPT').seedId, 'COMUM');
  assert.equal(ctx.escolherSemente(null, 'COMUM', 'SEM-SCRIPT').seedId, 'COMUM');
});

test('tokeninfo: ID do cliente vem de azp (ou aud); e-mail não verificado é recusado', () => {
  const ctx = { Logger: { log: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SERVER, 'Utils.gs'), 'utf8'), ctx, { filename: 'Utils.gs' });
  const r = ctx.interpretarTokenInfo({ email: 'A@X.com', azp: 'ADDON.apps', aud: 'OUTRO', email_verified: 'true', expires_in: '3500' });
  assert.equal(r.email, 'a@x.com');
  assert.equal(r.clientId, 'ADDON.apps');
  assert.equal(ctx.interpretarTokenInfo({ email: 'a@x.com', aud: 'AUD.apps' }).clientId, 'AUD.apps');
  assert.equal(ctx.interpretarTokenInfo({ email: 'a@x.com', email_verified: 'false' }), null);
  assert.equal(ctx.interpretarTokenInfo({ azp: 'x' }), null);
});

test('Schema v4: aba Escolas no SCHEMA_GLOBAL, migração e versão atual', () => {
  const sm = fs.readFileSync(path.join(SERVER, 'SchemaManager.gs'), 'utf8');
  const c  = fs.readFileSync(path.join(SERVER, 'Constants.gs'), 'utf8');
  assert.match(c, /SCHEMA_VERSION_ATUAL\s*=\s*4;/);
  assert.match(sm, /'Escolas': \['Instituicao', 'Tipo_Conta', 'Modo_Painel', 'Observacao'\]/);
  assert.match(sm, /versaoAtual < 4[\s\S]*_migrarV3ParaV4/);
  const esc = fs.readFileSync(path.join(SERVER, 'Escolas.gs'), 'utf8');
  assert.match(esc, /ESCOLAS_HEADERS = \['Instituicao', 'Tipo_Conta', 'Modo_Painel', 'Observacao'\]/);
});
