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
    ScriptApp: { getOAuthToken: () => 'TOKEN-SERVIDOR' },
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

test('Revisões: colagem entre duas revisões vira alerta com o mesmo hash das medições', () => {
  const { ctx } = montar();
  const colado = frase('copiado da internet', 600);
  const estado = ctx.radarEstadoNovo();
  const t0 = Date.parse('2026-11-23T10:00:00Z');
  const r = ctx.radarAnalisarRevisoes(estado, [
    { id: 'r1', ts: t0, texto: [MARC, 'Começo.'].join('\r\n') },
    { id: 'r2', ts: t0 + 30 * SEG, texto: [MARC, 'Começo.', colado].join('\r\n') }   // +600 em 30 s
  ], t0 + 60 * SEG);
  assert.equal(r.novas, 2);
  assert.equal(r.eventos.filter(e => e.estado === 'C').length, 1);
  const alerta = estado.mapa.a[ctx.radarHash(colado)];
  assert.equal(alerta.e, 'C');
  assert.equal(alerta.f, 'revisao_servidor');
  assert.equal(estado.rv.acesso, 'ok');
});

test('Revisões: digitação no ritmo normal e restauração de texto antigo não marcam nada', () => {
  const { ctx } = montar();
  const meu = frase('escrevi devagar', 600);
  const t0 = Date.parse('2026-11-23T10:00:00Z');
  const lento = ctx.radarEstadoNovo();
  ctx.radarAnalisarRevisoes(lento, [
    { id: 'a', ts: t0, texto: MARC },
    { id: 'b', ts: t0 + 20 * 60 * SEG, texto: [MARC, meu].join('\n') }               // 600 em 20 min
  ], t0);
  assert.deepEqual(Object.keys(lento.mapa.a), []);
  const restaurado = ctx.radarEstadoNovo();
  ctx.radarAnalisarRevisoes(restaurado, [
    { id: 'a', ts: t0, texto: [MARC, meu].join('\n') },
    { id: 'b', ts: t0 + 60 * SEG, texto: MARC },
    { id: 'c', ts: t0 + 70 * SEG, texto: [MARC, meu].join('\n') }                    // voltou (desfazer)
  ], t0);
  assert.deepEqual(Object.keys(restaurado.mapa.a), []);
});

test('Revisões: medição que não bate com o tamanho da revisão conta como divergência', () => {
  const { ctx } = montar();
  const t0 = Date.parse('2026-11-23T10:00:00Z');
  const estado = ctx.radarEstadoNovo();
  estado.hist = [[t0 - 30 * SEG, 40]];                                              // painel disse ~40 chars
  const r = ctx.radarAnalisarRevisoes(estado, [{ id: 'r1', ts: t0, texto: [MARC, frase('texto', 2000)].join('\n') }], t0);
  assert.equal(r.divergencias, 1);
  assert.equal(r.eventos[0].estado, 'DIVERGENCIA');
  assert.equal(estado.rv.divergencias, 1);
  // Medição coerente (diferença pequena): sem divergência
  const ok = ctx.radarEstadoNovo();
  ok.hist = [[t0, MARC.length + 1990]];
  assert.equal(ctx.radarAnalisarRevisoes(ok, [{ id: 'r1', ts: t0, texto: [MARC, frase('texto', 2000)].join('\n') }], t0).divergencias, 0);
  // Medição longe da revisão (fora da janela de 3 min): não compara
  const longe = ctx.radarEstadoNovo();
  longe.hist = [[t0 - 30 * 60 * SEG, 40]];
  assert.equal(ctx.radarAnalisarRevisoes(longe, [{ id: 'r1', ts: t0, texto: frase('x', 2000) }], t0).divergencias, 0);
});

test('Revisões já analisadas não são contadas de novo', () => {
  const { ctx } = montar();
  const t0 = Date.parse('2026-11-23T10:00:00Z');
  const estado = ctx.radarEstadoNovo();
  const revs = [{ id: 'a', ts: t0, texto: MARC }, { id: 'b', ts: t0 + 60 * SEG, texto: MARC + '\nOi.' }];
  ctx.radarAnalisarRevisoes(estado, revs, t0);
  const r = ctx.radarAnalisarRevisoes(estado, revs, t0 + 60 * 60 * SEG);
  assert.equal(r.novas, 0);
  assert.equal(estado.rv.lidas, 2);
});

test('Intervalo da conferência: 30 min normal, 5 min logo depois de ficar sem acesso', () => {
  const { ctx } = montar();
  const agora = 10 * 60 * 60 * SEG;
  assert.equal(ctx.radarHoraDeConferir(ctx.radarEstadoNovo(), agora, 30 * 60 * SEG), true);
  const ok = { rv: { em: agora - 10 * 60 * SEG, acesso: 'ok' } };
  assert.equal(ctx.radarHoraDeConferir(ok, agora, 30 * 60 * SEG), false);
  const sem = { rv: { em: agora - 6 * 60 * SEG, acesso: 'sem_acesso' } };
  assert.equal(ctx.radarHoraDeConferir(sem, agora, 30 * 60 * SEG), true);
});

test('Sem acesso às revisões: a resposta pede ao painel para compartilhar com a conta do servidor', () => {
  const o = {};
  const { ctx, ss } = montar(o);
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC, medicoes: [med(ctx, ctx.__agora, [MARC, 'oi'])] }, {}, ALUNO, '');
  assert.equal(r.data.precisaAcesso, true);
  assert.equal(r.data.contaServidor, 'servidor@x.com');
  assert.equal(o.pedidosDrive[0].auth, 'Bearer TOKEN-SERVIDOR', 'lê o Drive com a conta do servidor, não com a do aluno');
  assert.equal(ss.abas.Radar_Estado.linhas[1][12], 'sem_acesso');
});

test('Com acesso: medições e revisões conferidas; o radar do professor mostra o resultado', () => {
  const colado = frase('internet', 500);
  const t0 = Date.parse('2026-11-23T11:58:00Z');
  const o = { drive: { revisoes: [
    { id: 'r1', ts: t0, texto: MARC },
    { id: 'r2', ts: t0 + 20 * SEG, texto: [MARC, colado].join('\n') }
  ] } };
  const { ctx, ss } = montar(o);
  // O painel mandou só uma medição "lenta" e pequena (forjada): a revisão mostra a colagem.
  const r = ctx.handleRegistrarMedicoes({ professorEmail: PROF, docId: DOC,
    medicoes: [med(ctx, t0 + 25 * SEG, [MARC, 'só isso'])] }, {}, ALUNO, '');
  assert.equal(r.data.precisaAcesso, undefined);
  const linha = ss.abas.Radar_Estado.linhas[1];
  assert.equal(linha[10], 2, 'Revisoes_Lidas');
  assert.equal(linha[11], 1, 'Divergencias');
  assert.equal(linha[12], 'ok');
  const eventos = ss.abas.Radar_Eventos.linhas.slice(1).map(e => e[3]);
  assert.ok(eventos.includes('C') && eventos.includes('DIVERGENCIA'), eventos.join(','));

  const radar = ctx.handleRadarDocumento({ professorEmail: PROF, docId: DOC }, {});
  const a = radar.data.alunos[0];
  assert.equal(a.revisoes.lidas, 2);
  assert.equal(a.revisoes.divergencias, 1);
  assert.equal(a.revisoes.acesso, 'ok');
  assert.equal(a.mapa.a[ctx.radarHash(colado)].f, 'revisao_servidor');
  assert.equal(radar.data.contaServidor, 'servidor@x.com');
});

test('Histórico de tamanhos guarda só medições com mudança, com teto', () => {
  const { ctx } = montar();
  const estado = ctx.radarEstadoNovo();
  ctx.radarRegistrarHistorico(estado, { ts: 1, igual: true });
  ctx.radarRegistrarHistorico(estado, { ts: 2, l: [3, 4] });
  assert.deepEqual(JSON.parse(JSON.stringify(estado.hist)), [[2, 7]]);
  for (let i = 0; i < 900; i++) ctx.radarRegistrarHistorico(estado, { ts: 10 + i, l: [i] });
  assert.equal(estado.hist.length, 800);
});

test('Medição suprimida: parágrafo igual em duas revisões, painel medindo e nunca com ele, vira não observado', () => {
  const { ctx } = montar();
  const escondido = frase('parágrafo escondido das medições', 300);
  const t0 = Date.parse('2026-11-23T10:00:00Z');
  const estado = ctx.radarEstadoNovo();
  // O painel mediu no intervalo, mas só o marcador e um texto curto.
  const m = med(ctx, t0 + 2 * 60 * SEG, [MARC, 'curto']);
  ctx.radarProcessarMedicao(estado, m);
  ctx.radarRegistrarHistorico(estado, m);
  const revs = [
    { id: 'a', ts: t0 + 60 * SEG, texto: [MARC, escondido].join('\n') },
    { id: 'b', ts: t0 + 4 * 60 * SEG, texto: [MARC, escondido].join('\n') }
  ];
  const r = ctx.radarAnalisarRevisoes(estado, revs, t0 + 5 * 60 * SEG);
  assert.equal(r.suprimidas, 1);
  const alerta = estado.mapa.a[ctx.radarHash(escondido)];
  assert.equal(alerta.e, 'N');
  assert.equal(alerta.f, 'revisao_nao_medido');
  assert.equal(estado.rv.suprimidas, 1);
});

test('Medição suprimida não dispara sem medição no intervalo nem para parágrafo que o painel mediu', () => {
  const { ctx } = montar();
  const texto = frase('parágrafo normal do aluno', 300);
  const t0 = Date.parse('2026-11-23T10:00:00Z');
  const revs = [
    { id: 'a', ts: t0 + 60 * SEG, texto: [MARC, texto].join('\n') },
    { id: 'b', ts: t0 + 4 * 60 * SEG, texto: [MARC, texto].join('\n') }
  ];
  // Painel fechado no intervalo (nenhuma medição): não é supressão.
  const fechado = ctx.radarEstadoNovo();
  assert.equal(ctx.radarAnalisarRevisoes(fechado, revs, t0).suprimidas, 0);
  // Painel mediu o parágrafo: nada a marcar.
  const medido = ctx.radarEstadoNovo();
  const m = med(ctx, t0 + 2 * 60 * SEG, [MARC, texto]);
  ctx.radarProcessarMedicao(medido, m);
  ctx.radarRegistrarHistorico(medido, m);
  assert.equal(ctx.radarAnalisarRevisoes(medido, revs, t0).suprimidas, 0);
});
