// Testes do relatório de processo fora do Apps Script: carrega SÓ ProcessReport.gs
// num contexto Node, com stubs para o que o handler usa de outros arquivos.
// Rodar: node --test whitebox-server/tests/process-report.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SERVER = path.join(__dirname, '..');

const HEADERS = [
  'Timestamp', 'Turma', 'DocId', 'Email_Aluno',
  'Palavras', 'Tempo_Ativo_Min', 'Colar_Eventos',
  'Taxa_Edicao', 'Alteracoes_Estrutura',
  'Chars_Adicionados', 'Chars_Deletados', 'Colagem_Massiva',
  'Cpm_Medio', 'Cpm_Pico',
  'RiscoScore', 'Whitebox_Risco', 'Conselho_Pedagogico',
  'Pergunta_Socratica', 'Modo_IA', 'Entrega_Final', 'Heatmap_Scores'
];
const PROF = 'prof@ies.edu.br';
const ALUNO = 'aluno@ies.edu.br';
const DOC = 'DOC-1';

/** Linha de telemetria no formato gravado por logarNaPlanilhaProfessor. */
function telemetria(o) {
  const row = new Array(HEADERS.length).fill('');
  const set = (col, v) => { row[HEADERS.indexOf(col)] = v; };
  set('Timestamp', o.ts);
  set('Turma', 'Turma A');
  set('DocId', o.doc || DOC);
  set('Email_Aluno', o.email || ALUNO);
  set('Palavras', o.palavras || 0);
  set('Tempo_Ativo_Min', o.min || 0);
  set('Colar_Eventos', o.colagens || 0);
  set('Chars_Adicionados', o.add || 0);
  set('Chars_Deletados', o.del || 0);
  set('Cpm_Medio', o.cpm || 0);
  set('Cpm_Pico', o.pico || 0);
  set('Modo_IA', 'Não');
  set('Entrega_Final', o.final ? 'Sim' : 'Não');
  return row;
}

/** Linha de análise de IA: gravada com o e-mail do professor e RiscoScore numérico. */
function analise(o) {
  const row = telemetria({ ts: o.ts, email: PROF, min: o.min || 0 });
  row[HEADERS.indexOf('RiscoScore')] = o.risco;
  row[HEADERS.indexOf('Modo_IA')] = 'Sim';
  return row;
}

const T0 = Date.parse('2026-10-30T10:00:00Z');
const minutos = n => new Date(T0 + n * 60000).toISOString();

/**
 * Monta o contexto com stubs e devolve as funções do arquivo.
 * @param {object} o
 * @param {object|null} o.registro - devolvido por buscarRegistroProfessor
 * @param {Array<Array>} o.logs    - getValues() da aba Logs (com cabeçalho)
 */
function montar(o) {
  o = o || {};
  const logs = o.logs || [HEADERS];
  const ctx = {
    console,
    SHEET_LOGS: 'Logs',
    Logger: { log: () => {} },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: name => (name === 'Logs' && o.temAba !== false)
        ? { getDataRange: () => ({ getValues: () => logs }) } : null })
    }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SERVER, 'ProcessReport.gs'), 'utf8'), ctx, { filename: 'ProcessReport.gs' });
  vm.runInContext(`
    function jsonResponse(data, code) { return { data: data, code: code || 200 }; }
    function buscarRegistroProfessor(email) { return __registro; }
  `, ctx);
  ctx.__registro = o.registro === undefined ? { status: 'Ativo', spreadsheetId: 'SS1' } : o.registro;
  return ctx;
}

const resumir = (rows, opts) => montar().resumirProcessoDocumento(HEADERS, rows, Object.assign({ docId: DOC }, opts || {}));
// Objetos criados dentro do vm têm outro Object/Array: compara por valor, não por protótipo.
const plain = v => JSON.parse(JSON.stringify(v));
const VAZIO = { registros: 0, alunos: [] };

test('Duas sessões: contador diminuiu → soma por trechos monotônicos e conta 2 sessões', () => {
  const rows = [
    telemetria({ ts: minutos(0),  min: 5,  colagens: 1, add: 100, del: 10, cpm: 40, pico: 60, palavras: 50 }),
    telemetria({ ts: minutos(1),  min: 12, colagens: 1, add: 300, del: 20, cpm: 50, pico: 90, palavras: 120 }),
    telemetria({ ts: minutos(2),  min: 20, colagens: 2, add: 500, del: 30, cpm: 0,  pico: 70, palavras: 0 }),
    telemetria({ ts: minutos(10), min: 3,  colagens: 0, add: 50,  del: 5,  cpm: 30, pico: 50, palavras: 200 }),
    telemetria({ ts: minutos(11), min: 9,  colagens: 1, add: 150, del: 15, cpm: 0,  pico: 80, palavras: 0, final: true })
  ];
  const r = resumir(rows);
  assert.equal(r.registros, 5);
  assert.equal(r.alunos.length, 1);
  const a = r.alunos[0];
  assert.equal(a.email, ALUNO);
  assert.equal(a.minutosAtivos, 29);
  assert.equal(a.sessoes, 2);
  assert.equal(a.colagens, 3);          // 2 + 1
  assert.equal(a.charsAdicionados, 650); // 500 + 150
  assert.equal(a.charsDeletados, 45);    // 30 + 15
  assert.equal(a.cpmMedio, 40);          // média de 40, 50, 30 (zeros ignorados)
  assert.equal(a.cpmPico, 90);
  assert.equal(a.palavras, 200);         // última contagem não nula
  assert.equal(a.entregue, true);
  assert.equal(a.primeiraAtividade, minutos(0));
  assert.equal(a.ultimaAtividade, minutos(11));
});

test('Sessão curta e depois primeira linha maior: intervalo > 30 min abre nova sessão', () => {
  const rows = [
    telemetria({ ts: minutos(0),  min: 2 }),
    telemetria({ ts: minutos(45), min: 3 }),
    telemetria({ ts: minutos(46), min: 9 })
  ];
  const a = resumir(rows).alunos[0];
  assert.equal(a.minutosAtivos, 11);
  assert.equal(a.sessoes, 2);
});

test('Intervalo de até 30 min não abre sessão nova', () => {
  const rows = [
    telemetria({ ts: minutos(0),  min: 2 }),
    telemetria({ ts: minutos(30), min: 3 })
  ];
  const a = resumir(rows).alunos[0];
  assert.equal(a.minutosAtivos, 3);
  assert.equal(a.sessoes, 1);
});

test('Linhas fora de ordem são somadas em ordem de tempo', () => {
  const rows = [
    telemetria({ ts: minutos(2), min: 20 }),
    telemetria({ ts: minutos(0), min: 5 }),
    telemetria({ ts: minutos(1), min: 12 })
  ];
  const a = resumir(rows).alunos[0];
  assert.equal(a.minutosAtivos, 20);
  assert.equal(a.sessoes, 1);
});

test('Timestamp como Date (planilha converte ISO) funciona igual', () => {
  const rows = [
    telemetria({ ts: new Date(T0), min: 5 }),
    telemetria({ ts: new Date(T0 + 60000), min: 12 })
  ];
  const a = resumir(rows).alunos[0];
  assert.equal(a.minutosAtivos, 12);
  assert.equal(a.ultimaAtividade, minutos(1));
});

test('Sem linhas do documento: registros 0 e lista vazia', () => {
  const rows = [telemetria({ ts: minutos(0), doc: 'OUTRO', min: 5 })];
  assert.deepEqual(plain(resumir(rows)), VAZIO);
  assert.deepEqual(plain(resumir([])), VAZIO);
});

test('Linhas de análise (RiscoScore numérico) são ignoradas, inclusive risco 0', () => {
  const rows = [
    telemetria({ ts: minutos(0), min: 5 }),
    analise({ ts: minutos(1), risco: 0, min: 99 }),
    analise({ ts: minutos(2), risco: 80, min: 99 }),
    telemetria({ ts: minutos(3), min: 12 })
  ];
  const r = resumir(rows, { professorEmail: 'outro@ies.edu.br' });
  assert.equal(r.registros, 2);
  assert.equal(r.alunos.length, 1);
  assert.equal(r.alunos[0].minutosAtivos, 12);
});

test('Linhas do próprio professor (testando a visão do aluno) ficam fora', () => {
  const rows = [
    telemetria({ ts: minutos(0), email: PROF, min: 7 }),
    telemetria({ ts: minutos(1), email: ALUNO, min: 5 })
  ];
  const r = resumir(rows, { professorEmail: PROF.toUpperCase() });
  assert.equal(r.registros, 1);
  assert.deepEqual(plain(r.alunos.map(a => a.email)), [ALUNO]);
});

test('alunoEmail restringe a um aluno; sem filtro vêm todos, ordenados por última atividade desc', () => {
  const rows = [
    telemetria({ ts: minutos(0), email: 'a@ies.edu.br', min: 5 }),
    telemetria({ ts: minutos(5), email: 'b@ies.edu.br', min: 8 }),
    telemetria({ ts: minutos(9), email: 'a@ies.edu.br', min: 6 })
  ];
  const todos = resumir(rows);
  assert.deepEqual(plain(todos.alunos.map(a => a.email)), ['a@ies.edu.br', 'b@ies.edu.br']);
  const so = resumir(rows, { alunoEmail: 'B@ies.edu.br' });
  assert.equal(so.registros, 1);
  assert.deepEqual(plain(so.alunos.map(a => a.email)), ['b@ies.edu.br']);
  assert.equal(so.alunos[0].minutosAtivos, 8);
});

test('Cabeçalho sem as colunas básicas: resumo vazio, sem erro', () => {
  const ctx = montar();
  assert.deepEqual(plain(ctx.resumirProcessoDocumento(['Foo'], [['x']], { docId: DOC })), VAZIO);
});

// ── handleResumoProcesso ─────────────────────────────────────────

const LOGS = [
  HEADERS,
  telemetria({ ts: minutos(0), email: ALUNO, min: 5 }),
  telemetria({ ts: minutos(1), email: ALUNO, min: 12 }),
  telemetria({ ts: minutos(2), email: 'colega@ies.edu.br', min: 4 }),
  telemetria({ ts: minutos(3), email: PROF, min: 9 }),
  analise({ ts: minutos(4), risco: 70 })
];
const body = (extra) => Object.assign({ professorEmail: PROF, docId: DOC }, extra || {});

test('Chamador aluno: só as próprias linhas, seja o que for que o body diga', () => {
  const ctx = montar({ logs: LOGS });
  const res = ctx.handleResumoProcesso(body({ alunoEmail: 'colega@ies.edu.br' }), {}, ALUNO);
  assert.equal(res.code, 200);
  assert.equal(res.data.registros, 2);
  assert.deepEqual(plain(res.data.alunos.map(a => a.email)), [ALUNO]);
  assert.equal(res.data.alunos[0].minutosAtivos, 12);
});

test('Chamador professor (Ativo): um bloco por aluno, sem as linhas dele', () => {
  const ctx = montar({ logs: LOGS });
  const res = ctx.handleResumoProcesso(body(), {}, PROF);
  assert.equal(res.code, 200);
  assert.equal(res.data.registros, 3);
  assert.deepEqual(plain(res.data.alunos.map(a => a.email)), ['colega@ies.edu.br', ALUNO]);
});

test('Chamador que não é o professor nem tem linhas: registros 0 (sem vazamento)', () => {
  const ctx = montar({ logs: LOGS });
  const res = ctx.handleResumoProcesso(body(), {}, 'estranho@ies.edu.br');
  assert.equal(res.code, 200);
  assert.deepEqual(plain(res.data), VAZIO);
});

test('Professor não cadastrado → 403 PROFESSOR_NAO_CADASTRADO (para qualquer chamador)', () => {
  const ctx = montar({ logs: LOGS, registro: null });
  assert.equal(ctx.handleResumoProcesso(body(), {}, ALUNO).data.error, 'PROFESSOR_NAO_CADASTRADO');
  const res = ctx.handleResumoProcesso(body(), {}, PROF);
  assert.equal(res.code, 403);
  assert.equal(res.data.error, 'PROFESSOR_NAO_CADASTRADO');
});

test('Professor sem Status Ativo chamando como professor → 403 PROFESSOR_INATIVO; aluno continua vendo o próprio', () => {
  const ctx = montar({ logs: LOGS, registro: { status: 'Inativo', spreadsheetId: 'SS1' } });
  const res = ctx.handleResumoProcesso(body(), {}, PROF);
  assert.equal(res.code, 403);
  assert.equal(res.data.error, 'PROFESSOR_INATIVO');
  assert.equal(ctx.handleResumoProcesso(body(), {}, ALUNO).data.registros, 2);
});

test('Professor cadastrado sem planilha ou sem aba Logs: resumo vazio', () => {
  assert.deepEqual(plain(montar({ registro: { status: 'Ativo', spreadsheetId: '' } }).handleResumoProcesso(body(), {}, PROF).data), VAZIO);
  assert.deepEqual(plain(montar({ logs: LOGS, temAba: false }).handleResumoProcesso(body(), {}, PROF).data), VAZIO);
});

test('Body sem docId ou professorEmail → 400', () => {
  const ctx = montar({ logs: LOGS });
  assert.equal(ctx.handleResumoProcesso({ professorEmail: PROF }, {}, PROF).code, 400);
  assert.equal(ctx.handleResumoProcesso({ docId: DOC }, {}, PROF).code, 400);
});

// ── Todas as cópias (professor no documento mestre) ──────────────

const LOGS_VARIOS_DOCS = [
  HEADERS,
  telemetria({ ts: minutos(0), email: ALUNO, doc: 'COPIA-A', min: 5 }),
  telemetria({ ts: minutos(1), email: ALUNO, doc: 'COPIA-A', min: 8 }),
  telemetria({ ts: minutos(2), email: 'colega@ies.edu.br', doc: 'COPIA-B', min: 4 }),
  telemetria({ ts: minutos(3), email: PROF, doc: 'MESTRE', min: 9 })
];

test('todosDocumentos (professor): um bloco por aluno e cópia, com docId, sem as linhas dele', () => {
  const ctx = montar({ logs: LOGS_VARIOS_DOCS });
  const res = ctx.handleResumoProcesso(body({ docId: 'MESTRE', todosDocumentos: true }), {}, PROF);
  assert.equal(res.data.registros, 3);
  const blocos = plain(res.data.alunos.map(a => [a.email, a.docId, a.minutosAtivos])).sort();
  assert.deepEqual(blocos, [['aluno@ies.edu.br', 'COPIA-A', 8], ['colega@ies.edu.br', 'COPIA-B', 4]]);
});

test('todosDocumentos pedido por aluno é ignorado: só o próprio bloco deste documento', () => {
  const ctx = montar({ logs: LOGS_VARIOS_DOCS });
  const res = ctx.handleResumoProcesso(body({ docId: 'COPIA-B', todosDocumentos: true }), {}, ALUNO);
  assert.equal(res.data.registros, 0);
});
