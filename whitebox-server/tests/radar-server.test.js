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
        setValue: v => { linhas[r - 1] = linhas[r - 1] || []; linhas[r - 1][c - 1] = v; },
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
    Session: { getEffectiveUser: () => ({ getEmail: () => 'Servidor@x.com' }) },
    // Conferência ligada por padrão nos testes; o.revisoesDesligadas a desliga.
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k === 'RADAR_REVISOES_ATIVO' && !o.revisoesDesligadas ? 'sim' : null) }) },
    ScriptApp: { getOAuthToken: () => 'TOKEN-SERVIDOR' },
    // Cache do servidor (contador diário de chamadas da conferência).
    CacheService: { getScriptCache: () => {
      const c = o.cache = o.cache || {};
      return { get: k => (k in c ? c[k] : null), put: (k, v) => { c[k] = String(v); } };
    } },
    // Drive simulado: o.drive = { codigo, revisoes: [{ id, ts, texto }] } ou ausente (403).
    UrlFetchApp: (() => {
      const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => body });
      return {
        fetch: (url, opts) => {
          (o.pedidosDrive = o.pedidosDrive || []).push({ url, auth: opts.headers.Authorization });
          const d = o.drive;
          if (!d) return resp(403, '{}');
          if (d.codigo && d.codigo !== 200) return resp(d.codigo, '{}');
          return resp(200, JSON.stringify({ revisions: d.revisoes.map(r => ({
            id: r.id, modifiedTime: new Date(r.ts).toISOString(), exportLinks: { 'text/plain': 'exp://' + r.id } })) }));
        },
        fetchAll: reqs => reqs.map(q => {
          const r = o.drive.revisoes.find(x => 'exp://' + x.id === q.url);
          if (r && (o.drive.falhaExport || []).includes(r.id)) return resp(429, '');
          return resp(r ? 200 : 404, r ? '\uFEFF' + r.texto : '');
        })
      };
    })(),
    __agora: o.agora || Date.parse('2026-11-23T12:00:00Z')
  };
  vm.createContext(ctx);
  for (const f of ['RadarCore.gs', 'RadarServer.gs', 'Escolas.gs', 'RadarRevisoes.gs']) {
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

test('ping devolve o ID de cliente do token e se ele é o do add-on', () => {
  const { ctx } = montar();
  const r = ctx.respostaPing('a@x.com', 'ADDON.apps', ['ADDON.apps']);
  assert.equal(r.ok, true);
  assert.equal(r.clientId, 'ADDON.apps');
  assert.equal(r.origem, 'addon');
  assert.equal(r.idsConfigurados, 1);
  assert.equal(ctx.respostaPing('a@x.com', 'OUTRO', []).origem, 'script_vinculado');
  const src = fs.readFileSync(path.join(SERVER, 'BrainProxy.gs'), 'utf8');
  assert.match(src, /case 'ping':[\s\S]*?respostaPing\(callerEmail, token \? token\.clientId : '', idsDoAddon\(\)\)/);
});

// ---- Etapa 3: conferência pelas revisões do Drive (RadarRevisoes.gs) ----

const MIN = 60 * SEG;
const T0 = Date.parse('2026-11-23T10:00:00Z');
const rev = (id, ts, linhas) => ({ id, ts, texto: linhas.join('\n') });
/** Estado com as medições dadas (processadas e no histórico de tamanhos). */
function estadoMedido(ctx, meds) {
  const e = ctx.radarEstadoNovo();
  meds.forEach(m => { ctx.radarProcessarMedicao(e, m); ctx.radarRegistrarHistorico(e, m); });
  return e;
}

test('Export: comentários e marcadores de lista saem; célula de tabela é reconhecida', () => {
  const { ctx } = montar();
  const l = ctx.radarLinhasDaRevisao('﻿Texto com nota[a] do professor.\n1. Item numerado\n\nA\tB\n[a]Comentário do professor');
  assert.deepEqual(Array.from(l, x => x.t), ['Texto com nota do professor.', '1. Item numerado', 'A\tB']);
  assert.equal(l[1].hs, ctx.radarHash('Item numerado'));
  assert.equal(l[2].tabela, true);
});

test('Revisões: colagem entre duas revisões vira alerta com o mesmo hash das medições', () => {
  const { ctx } = montar();
  const colado = frase('copiado da internet', 600);
  const estado = ctx.radarEstadoNovo();
  const r = ctx.radarAnalisarRevisoes(estado, [
    rev('r1', T0, [MARC, 'Começo.']), rev('r2', T0 + 30 * SEG, [MARC, 'Começo.', colado])
  ], T0 + MIN);
  assert.equal(r.novas, 2);
  const c = r.eventos.filter(e => e.estado === 'C');
  assert.equal(c.length, 1);
  assert.equal(c[0].fonte, 'revisao_servidor');
  assert.equal(c[0].revisao, 'r2');
  assert.equal(estado.mapa.a[ctx.radarHash(colado)].f, 'revisao_servidor');
  assert.equal(estado.rv.acesso, 'ok');
});

test('Revisões: colagem num parágrafo não marca o parágrafo vizinho que só foi editado', () => {
  const { ctx } = montar();
  const meu = frase('meu parágrafo antigo', 300);
  const colado = frase('copiado', 500);
  const estado = ctx.radarEstadoNovo();
  ctx.radarAnalisarRevisoes(estado, [
    rev('a', T0, [MARC, meu]), rev('b', T0 + 20 * SEG, [MARC, meu + ' Com vírgula.', colado])
  ], T0);
  assert.equal(estado.mapa.a[ctx.radarHash(colado)].e, 'C');
  assert.equal(estado.mapa.a[ctx.radarHash(meu + ' Com vírgula.')], undefined);
});

test('Revisões: item de lista colado gera alerta também com o hash sem o marcador', () => {
  const { ctx } = montar();
  const item = frase('item colado', 300);
  const estado = ctx.radarEstadoNovo();
  ctx.radarAnalisarRevisoes(estado, [rev('a', T0, [MARC]), rev('b', T0 + 10 * SEG, [MARC, '1. ' + item])], T0);
  assert.equal(estado.mapa.a[ctx.radarHash(item)].e, 'C', 'o getText do parágrafo não tem o "1."');
});

test('Revisões: digitação no ritmo normal e restauração de texto antigo não marcam nada', () => {
  const { ctx } = montar();
  const meu = frase('escrevi devagar', 600);
  const lento = ctx.radarEstadoNovo();
  ctx.radarAnalisarRevisoes(lento, [rev('a', T0, [MARC]), rev('b', T0 + 20 * MIN, [MARC, meu])], T0);
  assert.deepEqual(Object.keys(lento.mapa.a), []);
  const restaurado = ctx.radarEstadoNovo();
  ctx.radarAnalisarRevisoes(restaurado, [
    rev('a', T0, [MARC, meu]), rev('b', T0 + MIN, [MARC]), rev('c', T0 + 70 * SEG, [MARC, meu])
  ], T0);
  assert.deepEqual(Object.keys(restaurado.mapa.a), []);
});

test('Divergência: só com medições antes e depois da revisão, e fora da faixa delas', () => {
  const { ctx } = montar();
  const grande = [MARC, frase('texto', 2000)];
  const tam = MARC.length + 2000;
  const com = (hist) => { const e = ctx.radarEstadoNovo(); e.hist = hist; return ctx.radarAnalisarRevisoes(e, [rev('r1', T0, grande)], T0); };
  const r = com([[T0 - 30 * SEG, 40], [T0 + 30 * SEG, 45]]);
  assert.equal(r.divergencias, 1);
  const ev = r.eventos.find(e => e.estado === 'DIVERGENCIA');
  assert.equal(ev.revisao, 'r1');
  assert.equal(ev.h, '', 'o ID da revisão vai na coluna Revisao, não em Hash');
  assert.equal(com([[T0 - 30 * SEG, tam - 100], [T0 + 30 * SEG, tam + 50]]).divergencias, 0, 'dentro da faixa');
  assert.equal(com([[T0 - 30 * SEG, 40]]).divergencias, 0, 'painel fechado depois da revisão');
  assert.equal(com([[T0 - 30 * MIN, 40], [T0 + 30 * MIN, 40]]).divergencias, 0, 'medições longe');
});

test('Divergência: comentários do professor no export não contam', () => {
  const { ctx } = montar();
  const texto = frase('aluno', 300);
  const tam = MARC.length + texto.length;
  const e = ctx.radarEstadoNovo();
  e.hist = [[T0 - 30 * SEG, tam], [T0 + 30 * SEG, tam]];
  const comentario = '[a]' + frase('comentário longo do professor', 900);
  const r = ctx.radarAnalisarRevisoes(e, [rev('r1', T0, [MARC, texto + '[a]', comentario])], T0);
  assert.equal(r.divergencias, 0);
});

test('Revisões já analisadas não são contadas de novo', () => {
  const { ctx } = montar();
  const estado = ctx.radarEstadoNovo();
  const revs = [rev('a', T0, [MARC]), rev('b', T0 + MIN, [MARC, 'Oi.'])];
  ctx.radarAnalisarRevisoes(estado, revs, T0);
  const r = ctx.radarAnalisarRevisoes(estado, revs, T0 + 60 * MIN);
  assert.equal(r.novas, 0);
  assert.equal(estado.rv.lidas, 2);
});

test('Intervalo da conferência: 30 min normal, 5 min logo depois de ficar sem acesso', () => {
  const { ctx } = montar();
  const agora = 10 * 60 * MIN;
  assert.equal(ctx.radarHoraDeConferir(ctx.radarEstadoNovo(), agora, 30 * MIN), true);
  assert.equal(ctx.radarHoraDeConferir({ rv: { em: agora - 10 * MIN, acesso: 'ok' } }, agora, 30 * MIN), false);
  assert.equal(ctx.radarHoraDeConferir({ rv: { em: agora - 6 * MIN, acesso: 'sem_acesso' } }, agora, 30 * MIN), true);
});

test('Medição suprimida: parágrafo parado, painel medindo um texto menor no intervalo', () => {
  const { ctx } = montar();
  const escondido = frase('parágrafo escondido das medições', 300);
  const estado = estadoMedido(ctx, [med(ctx, T0 + 5 * MIN, [MARC, 'curto'])]);
  const revs = [rev('a', T0 + MIN, [MARC, escondido]), rev('b', T0 + 10 * MIN, [MARC, escondido])];
  const r = ctx.radarAnalisarRevisoes(estado, revs, T0 + 11 * MIN);
  assert.equal(r.suprimidas, 1);
  const alerta = estado.mapa.a[ctx.radarHash(escondido)];
  assert.equal(alerta.e, 'N');
  assert.equal(alerta.f, 'revisao_nao_medido');
  assert.equal(alerta.p, '', 'sem prefixo: não pinta versões editadas');
  assert.equal(r.eventos.find(e => e.estado === 'N').fonte, 'revisao_nao_medido');
});

test('Medição suprimida não dispara: painel fechado, parágrafo medido, ou medição perto da revisão (relógio)', () => {
  const { ctx } = montar();
  const texto = frase('parágrafo normal do aluno', 300);
  const revs = [rev('a', T0 + MIN, [MARC, texto]), rev('b', T0 + 10 * MIN, [MARC, texto])];
  assert.equal(ctx.radarAnalisarRevisoes(ctx.radarEstadoNovo(), revs, T0).suprimidas, 0, 'sem medição');
  const medido = estadoMedido(ctx, [med(ctx, T0 + 5 * MIN, [MARC, texto])]);
  assert.equal(ctx.radarAnalisarRevisoes(medido, revs, T0).suprimidas, 0, 'medido');
  // Medição 1 min depois da primeira revisão: com relógio adiantado, pode ser de antes dela.
  const cedo = estadoMedido(ctx, [med(ctx, T0 + 2 * MIN, [MARC, 'curto'])]);
  assert.equal(ctx.radarAnalisarRevisoes(cedo, revs, T0).suprimidas, 0, 'dentro da folga do relógio');
});

test('Medição suprimida não dispara quando o export quebra o parágrafo (Shift+Enter, lista, tabela)', () => {
  const { ctx } = montar();
  // No documento é um parágrafo só, com quebra suave; no export viram duas linhas.
  const l1 = frase('primeira linha do parágrafo', 150), l2 = frase('segunda linha após shift enter', 150);
  const lista = frase('item de lista numerada', 120);
  const paragrafoDoc = l1 + '\r' + l2;
  const estado = estadoMedido(ctx, [med(ctx, T0 + 5 * MIN, [MARC, paragrafoDoc, lista, 'A B'])]);
  const linhas = [MARC, l1, l2, '1. ' + lista, 'A\tB'];
  const r = ctx.radarAnalisarRevisoes(estado, [rev('a', T0 + MIN, linhas), rev('b', T0 + 10 * MIN, linhas)], T0);
  assert.equal(r.suprimidas, 0);
});

test('Histórico de tamanhos guarda só medições com mudança, com teto', () => {
  const { ctx } = montar();
  const estado = ctx.radarEstadoNovo();
  ctx.radarRegistrarHistorico(estado, { ts: 1, igual: true });
  ctx.radarRegistrarHistorico(estado, { ts: 2, l: [3, 4] });
  assert.deepEqual(JSON.parse(JSON.stringify(estado.hist)), [[2, 7]]);
  for (let i = 0; i < 900; i++) ctx.radarRegistrarHistorico(estado, { ts: 10 + i, l: [i] });
  assert.equal(estado.hist.length, 300);
});

test('Estado_JSON cabe numa célula: corta histórico e vistos antes de gravar', () => {
  const { ctx } = montar();
  const estado = ctx.radarEstadoNovo();
  estado.antH = Array.from({ length: 2000 }, (_, i) => 'h' + i + '.abcdefghij');
  estado.vistos = Array.from({ length: 400 }, (_, i) => 'v' + i + '.abcdefgh');
  estado.hist = Array.from({ length: 300 }, (_, i) => [1763900000000 + i, 123456]);
  const json = ctx.radarEstadoJson(estado);
  assert.ok(json.length <= 45000, String(json.length));
  assert.ok(JSON.parse(json).antH.length === 2000, 'a última medição fica inteira');
  assert.ok(JSON.parse(json).hist.length < 300, 'cortou o histórico');
});

test('Exportação que falha no meio: para nela e lê o resto na próxima, sem buraco', () => {
  const colado = frase('colado', 500);
  const o = { drive: { falhaExport: ['r2'], revisoes: [
    rev('r1', T0, [MARC]), rev('r2', T0 + 20 * SEG, [MARC, colado]), rev('r3', T0 + 10 * MIN, [MARC, colado])
  ] } };
  const { ctx } = montar(o);
  const lido = ctx.radarLerRevisoesDoDrive('DOC', 0);
  assert.equal(lido.acesso, 'ok');
  assert.equal(lido.incompleta, true);
  assert.deepEqual(Array.from(lido.revisoes, r => r.id), ['r1']);
  const estado = ctx.radarEstadoNovo();
  ctx.radarAnalisarRevisoes(estado, lido.revisoes, T0);
  o.drive.falhaExport = [];
  const de2 = ctx.radarLerRevisoesDoDrive('DOC', estado.rv.ultimoTs);
  assert.deepEqual(Array.from(de2.revisoes, r => r.id), ['r1', 'r2', 'r3'], 'r1 volta como referência');
  ctx.radarAnalisarRevisoes(estado, de2.revisoes, T0 + 11 * MIN);
  assert.equal(estado.mapa.a[ctx.radarHash(colado)].e, 'C', 'a colagem em r2 não se perdeu');
  // Todas as novas falhando: erro, não "ok" com nada lido.
  o.drive.falhaExport = ['r2', 'r3'];
  assert.equal(ctx.radarLerRevisoesDoDrive('DOC', T0).acesso, 'erro');
});

test('Conferência desligada (padrão): não lê o Drive nem pede compartilhamento', () => {
  const o = { revisoesDesligadas: true };
  const { ctx } = montar(o);
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] }, {}, ALUNO, '');
  assert.equal(r.data.precisaAcesso, undefined);
  assert.equal(o.pedidosDrive, undefined);
  const radar = ctx.handleRadarDocumento({ professorEmail: PROF, docId: DOC }, {});
  assert.equal(radar.data.alunos[0].revisoes.acesso, 'desligada');
  assert.equal(radar.data.contaServidor, '');
});

test('Sem acesso às revisões: a resposta pede ao painel para compartilhar com a conta do servidor', () => {
  const o = {};
  const { ctx, ss } = montar(o);
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] }, {}, ALUNO, '');
  assert.equal(r.data.precisaAcesso, true);
  assert.equal(r.data.jaTeveAcesso, false);
  assert.equal(r.data.contaServidor, undefined, 'a conta vem só pela rota ping');
  assert.equal(o.pedidosDrive[0].auth, 'Bearer TOKEN-SERVIDOR', 'lê o Drive com a conta do servidor, não com a do aluno');
  assert.equal(ss.abas.Radar_Estado.linhas[1][12], 'sem_acesso');
});

test('Acesso perdido: o servidor tinha acesso e deixou de ter vira evento', () => {
  const o = { drive: { revisoes: [rev('r1', T0, [MARC])] } };
  const { ctx, ss } = montar(o);
  const body = { professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] };
  ctx.handleRegistrarMedicoes(body, {}, ALUNO, '');
  assert.equal(ss.abas.Radar_Estado.linhas[1][12], 'ok');
  delete o.drive;                                   // aluno tirou o servidor do compartilhamento
  ctx.__agora += 61 * MIN;
  body.medicoes = [med(ctx, ctx.__agora, [MARC, 'oi de novo'])];
  const r = ctx.handleRegistrarMedicoes(body, {}, ALUNO, '');
  assert.equal(r.data.jaTeveAcesso, true, 'o painel do aluno não compartilha de novo em silêncio');
  const ev = ss.abas.Radar_Eventos.linhas;
  assert.equal(ev[ev.length - 1][3], 'ACESSO_PERDIDO');
  assert.equal(ev[ev.length - 1][8], 'revisao_servidor');
});

test('Com acesso: medições e revisões conferidas; o radar do professor mostra o resultado', () => {
  const colado = frase('internet', 500);
  const t0 = Date.parse('2026-11-23T11:58:00Z');
  const o = { drive: { revisoes: [rev('r1', t0, [MARC]), rev('r2', t0 + 20 * SEG, [MARC, colado])] } };
  const { ctx, ss } = montar(o);
  // O painel mandou medições pequenas antes e depois da revisão (forjadas): a revisão mostra a colagem.
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC,
    medicoes: [med(ctx, t0 + 10 * SEG, [MARC, 'só']), med(ctx, t0 + 25 * SEG, [MARC, 'só isso'])] }, {}, ALUNO, '');
  assert.equal(r.data.precisaAcesso, undefined);
  const linha = ss.abas.Radar_Estado.linhas[1];
  assert.equal(linha[10], 2, 'Revisoes_Lidas');
  assert.equal(linha[11], 1, 'Divergencias');
  assert.equal(linha[12], 'ok');
  const ev = ss.abas.Radar_Eventos.linhas;
  assert.deepEqual(Array.from(ev[0]).slice(8), ['Fonte', 'Revisao']);
  const porEstado = {};
  ev.slice(1).forEach(e => { porEstado[e[3]] = e; });
  assert.equal(porEstado.C[8], 'revisao_servidor');
  assert.equal(porEstado.C[9], 'r2');
  assert.equal(porEstado.DIVERGENCIA[9], 'r2');

  const radar = ctx.handleRadarDocumento({ professorEmail: PROF, docId: DOC }, {});
  const a = radar.data.alunos[0];
  assert.equal(a.revisoes.lidas, 2);
  assert.equal(a.revisoes.divergencias, 1);
  assert.equal(a.revisoes.acesso, 'ok');
  assert.equal(a.mapa.a[ctx.radarHash(colado)].f, 'revisao_servidor');
  assert.equal(radar.data.contaServidor, 'servidor@x.com');
});

test('Eventos das medições ganham a fonte; aba antiga ganha as colunas novas no cabeçalho', () => {
  const { ctx, ss } = montar();
  // Abas criadas pela versão anterior, com o cabeçalho curto.
  ss.insertSheet('Radar_Estado').appendRow(['DocId', 'Email_Aluno', 'Primeira_Medicao', 'Ultima_Medicao',
    'Ultimo_Recebimento', 'Medicoes', 'Inconsistencias', 'Estado_JSON', 'Ultima_Origem']);
  ss.insertSheet('Radar_Eventos').appendRow(['Recebido_Em', 'DocId', 'Email_Aluno', 'Estado', 'Hash', 'Medido_Em', 'Crescimento', 'Decorrido_s']);
  const t0 = ctx.__agora - MIN;
  ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC,
    medicoes: [med(ctx, t0, [MARC, '']), med(ctx, t0 + 15 * SEG, [MARC, frase('colado', 400)])] }, {}, ALUNO, '');
  assert.equal(ss.abas.Radar_Estado.linhas[0][12], 'Acesso_Revisoes');
  const ev = ss.abas.Radar_Eventos.linhas;
  assert.equal(ev[0][8], 'Fonte');
  assert.equal(ev[1][3], 'C');
  assert.equal(ev[1][8], 'medicao');
});

test('Radar do professor confere só o aluno que o painel mostra (o de mais medições)', () => {
  const o = { drive: { revisoes: [rev('r1', T0, [MARC])] } };
  const { ctx, ss } = montar(o);
  const body = (n) => ({ professorEmail: PROF, docId: DOC,
    medicoes: Array.from({ length: n }, (_, i) => med(ctx, ctx.__agora - (n - i) * SEG, [MARC, 'x' + i])) });
  o.revisoesDesligadas = true;                       // envios sem conferir
  ctx.handleRegistrarMedicoes(body(1), {}, 'outro@x.com', '');
  ctx.handleRegistrarMedicoes(body(3), {}, ALUNO, '');
  o.revisoesDesligadas = false;
  o.pedidosDrive = [];
  ctx.handleRadarDocumento({ professorEmail: PROF, docId: DOC }, {});
  assert.equal(o.pedidosDrive.length, 1);
  const linhas = ss.abas.Radar_Estado.linhas;
  const de = email => linhas.find(l => l[1] === email);
  assert.equal(de(ALUNO)[12], 'ok');
  assert.equal(de('outro@x.com')[12] || '', '');
});

test('Cota: texto parado não confere de novo; entrega confere na hora; teto diário pausa', () => {
  const o = { drive: { revisoes: [rev('r1', T0, [MARC])] } };
  const { ctx } = montar(o);
  const body = { professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] };
  ctx.handleRegistrarMedicoes(body, {}, ALUNO, '');
  const listagens = () => o.pedidosDrive.length;
  assert.equal(listagens(), 1);
  // 2 h depois, só pulsos "igual" (texto parado): não confere.
  ctx.__agora += 120 * MIN;
  ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [{ ts: ctx.__agora, igual: true }] }, {}, ALUNO, '');
  assert.equal(listagens(), 1);
  // Entrega: confere mesmo sem intervalo nem mudança.
  ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, final: true,
    medicoes: [{ ts: ctx.__agora + SEG, igual: true }] }, {}, ALUNO, '');
  assert.equal(listagens(), 2);
  // Texto mudou, intervalo passou, mas a cota do dia acabou: pausa.
  ctx.__agora += 61 * MIN;
  Object.keys(o.cache).forEach(k => { o.cache[k] = '999999'; });
  ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'mudou'])] }, {}, ALUNO, '');
  assert.equal(listagens(), 2);
});

test('Revisões novas demais: lê as mais antigas primeiro e deixa o resto para a próxima conferência', () => {
  const revisoes = [];
  for (let i = 0; i < 30; i++) revisoes.push(rev('r' + i, T0 + i * MIN, [MARC, 'linha ' + i]));
  const o = { drive: { revisoes } };
  const { ctx } = montar(o);
  const lido = ctx.radarLerRevisoesDoDrive(DOC, 0);
  assert.equal(lido.revisoes[0].id, 'r0');
  assert.equal(lido.revisoes.length, 21);
  assert.equal(lido.pendentes, true);
  const resto = ctx.radarLerRevisoesDoDrive(DOC, lido.revisoes[20].ts);
  assert.equal(resto.revisoes[0].id, 'r20', 'a última lida serve de referência');
  assert.equal(resto.revisoes[resto.revisoes.length - 1].id, 'r29');
  assert.equal(resto.pendentes, false);
  // Com revisões pendentes, a próxima conferência vem em 5 min, não em 1 h.
  const estado = { rv: { em: T0, acesso: 'ok', pendentes: true }, hist: [] };
  assert.equal(ctx.radarHoraDeConferir(estado, T0 + 6 * MIN, 60 * MIN, true), true);
  estado.rv.pendentes = false;
  assert.equal(ctx.radarHoraDeConferir(estado, T0 + 6 * MIN, 60 * MIN, true), false);
});

test('ping não grava o e-mail no log; status de licença diz se o modo da escola está travado', () => {
  const src = fs.readFileSync(path.join(SERVER, 'BrainProxy.gs'), 'utf8');
  const ping = src.match(/case 'ping':[\s\S]*?return jsonResponse\(ping\);/)[0];
  assert.doesNotMatch(ping, /Logger\.log\([^)]*ping\.email/);
  assert.match(src, /modoTravado: travado,[\s\S]*motivoModo: motivo/);
  const schema = fs.readFileSync(path.join(SERVER, 'SchemaManager.gs'), 'utf8');
  assert.match(schema, /function migrarSchemaAgora\(\)[\s\S]*?limparCacheEscolas\(adminId\)/);
});
