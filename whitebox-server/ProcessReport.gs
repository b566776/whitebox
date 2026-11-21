/**
 * =====================================================
 *  Whitebox — ProcessReport.gs
 *  Relatório de processo: resumo da telemetria de um documento
 * =====================================================
 *
 * Resume as linhas da aba Logs de UM documento para o card "Relatório de processo"
 * da barra lateral (aluno e professor). Só evidência de processo: minutos ativos,
 * sessões, palavras, colagens, caracteres e ritmo. Nenhum risco é calculado ou lido.
 *
 * `resumirProcessoDocumento` é pura (cabeçalho, linhas e opções entram como
 * parâmetros; nada de globais de outros arquivos) para que o harness Node
 * (tests/process-report.test.js) carregue este arquivo sozinho.
 */

/** Intervalo (min) entre dois registros que separa duas sessões do painel */
const PROCESSO_GAP_SESSAO_MIN = 30;

/**
 * Resume a telemetria de um documento por aluno.
 *
 * Os contadores do painel (minutos, colagens, caracteres) são cumulativos por sessão
 * da barra lateral e zeram quando ela reabre. Por isso a soma é por trechos
 * monotônicos: em ordem de tempo, cada linha contribui com `v_i - v_(i-1)` quando
 * nenhum dos três contadores (Tempo_Ativo_Min, Colar_Eventos, Chars_Adicionados)
 * diminuiu e o intervalo desde a linha anterior não passou de `gapMinutos`; caso
 * contrário começa uma sessão nova e a linha contribui com `v_i`. A decisão é
 * tomada uma vez por linha e vale para todos os contadores cumulativos.
 *
 * Linhas de análise de IA (RiscoScore numérico) não carregam telemetria e são
 * ignoradas, assim como as do próprio professor testando a visão do aluno.
 *
 * @param {Array} headers - primeira linha da aba Logs
 * @param {Array<Array>} rows - demais linhas
 * @param {{ docId: string, alunoEmail?: string|null, professorEmail?: string, gapMinutos?: number }} opts
 *        alunoEmail: restringe a um aluno (chamador aluno); null/ausente = todos (professor).
 * @returns {{ registros: number, alunos: Array<{ email, minutosAtivos, sessoes, palavras,
 *            colagens, charsAdicionados, charsDeletados, cpmMedio, cpmPico, entregue,
 *            primeiraAtividade, ultimaAtividade }> }}
 */
function resumirProcessoDocumento(headers, rows, opts) {
  const vazio = { registros: 0, alunos: [] };
  if (!headers || !rows || !opts || !opts.docId) return vazio;

  const h = headers;
  const COL = {
    ts:      h.indexOf('Timestamp'),
    doc:     h.indexOf('DocId'),
    email:   h.indexOf('Email_Aluno'),
    palavras: h.indexOf('Palavras'),
    minutos: h.indexOf('Tempo_Ativo_Min'),
    colagens: h.indexOf('Colar_Eventos'),
    add:     h.indexOf('Chars_Adicionados'),
    del:     h.indexOf('Chars_Deletados'),
    cpmMed:  h.indexOf('Cpm_Medio'),
    cpmPico: h.indexOf('Cpm_Pico'),
    risco:   h.indexOf('RiscoScore'),
    final:   h.indexOf('Entrega_Final')
  };
  if (COL.ts === -1 || COL.doc === -1 || COL.email === -1) return vazio;

  const docId          = String(opts.docId);
  const alunoFiltro    = opts.alunoEmail ? String(opts.alunoEmail).trim().toLowerCase() : null;
  const professorEmail = opts.professorEmail ? String(opts.professorEmail).trim().toLowerCase() : null;
  const gapMs          = (opts.gapMinutos || PROCESSO_GAP_SESSAO_MIN) * 60000;

  const num = (row, idx) => (idx === -1 ? 0 : (parseFloat(row[idx]) || 0));
  const tempo = v => {
    const t = (v instanceof Date) ? v.getTime() : new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  };

  // 1. Selecionar linhas de telemetria do documento, agrupadas por aluno
  const porAluno = {};
  let registros = 0;
  rows.forEach(function(row) {
    if (String(row[COL.doc] || '') !== docId) return;
    if (COL.risco !== -1 && !isNaN(parseFloat(row[COL.risco]))) return; // linha de análise
    const email = String(row[COL.email] || '').trim().toLowerCase();
    if (!email) return;
    if (professorEmail && email === professorEmail) return;
    if (alunoFiltro && email !== alunoFiltro) return;
    if (!porAluno[email]) porAluno[email] = [];
    porAluno[email].push({
      t:        tempo(row[COL.ts]),
      palavras: num(row, COL.palavras),
      minutos:  num(row, COL.minutos),
      colagens: num(row, COL.colagens),
      add:      num(row, COL.add),
      del:      num(row, COL.del),
      cpmMed:   num(row, COL.cpmMed),
      cpmPico:  num(row, COL.cpmPico),
      final:    COL.final !== -1 && row[COL.final] === 'Sim'
    });
    registros++;
  });

  // 2. Somar por trechos monotônicos
  const alunos = Object.keys(porAluno).map(function(email) {
    const linhas = porAluno[email].sort((a, b) => a.t - b.t);
    const r = {
      email: email, minutosAtivos: 0, sessoes: 0, palavras: 0, colagens: 0,
      charsAdicionados: 0, charsDeletados: 0, cpmMedio: 0, cpmPico: 0, entregue: false,
      primeiraAtividade: new Date(linhas[0].t).toISOString(),
      ultimaAtividade:   new Date(linhas[linhas.length - 1].t).toISOString()
    };
    let cpmSoma = 0, cpmN = 0, ant = null;
    linhas.forEach(function(l) {
      const novaSessao = !ant ||
        (l.t - ant.t) > gapMs ||
        l.minutos < ant.minutos || l.colagens < ant.colagens || l.add < ant.add;
      if (novaSessao) {
        r.sessoes++;
        r.minutosAtivos    += l.minutos;
        r.colagens         += l.colagens;
        r.charsAdicionados += l.add;
        r.charsDeletados   += l.del;
      } else {
        r.minutosAtivos    += l.minutos - ant.minutos;
        r.colagens         += l.colagens - ant.colagens;
        r.charsAdicionados += l.add - ant.add;
        r.charsDeletados   += Math.max(0, l.del - ant.del);
      }
      if (l.palavras > 0) r.palavras = l.palavras;
      if (l.cpmMed > 0) { cpmSoma += l.cpmMed; cpmN++; }
      if (l.cpmPico > r.cpmPico) r.cpmPico = l.cpmPico;
      if (l.final) r.entregue = true;
      ant = l;
    });
    r.cpmMedio = cpmN > 0 ? Math.round(cpmSoma / cpmN) : 0;
    return r;
  });

  alunos.sort((a, b) => (a.ultimaAtividade < b.ultimaAtividade ? 1 : (a.ultimaAtividade > b.ultimaAtividade ? -1 : 0)));
  return { registros: registros, alunos: alunos };
}

// =====================================================
//  HANDLER: resumo_processo
// =====================================================

/**
 * Autorização só pelo e-mail verificado do chamador (o servidor não vê a designação
 * gravada no documento, a mesma limitação de logar_metricas):
 *   - chamador = professorEmail, cadastrado e Ativo → todos os alunos do documento;
 *   - qualquer outro chamador → só as linhas cujo Email_Aluno é o próprio chamador,
 *     seja o que for que o body diga. Sem linhas, a resposta é { registros: 0 }.
 *
 * @param {object} body - { professorEmail, docId }
 * @param {object} cfg  - getConfig()
 * @param {string} callerEmail - e-mail verificado pelo OAuth (lowercase)
 */
function handleResumoProcesso(body, cfg, callerEmail) {
  const professorEmail = String(body.professorEmail || '').trim().toLowerCase();
  const docId          = String(body.docId || '').trim();
  const caller         = String(callerEmail || '').trim().toLowerCase();
  if (!professorEmail || !docId) return jsonResponse({ error: 'BAD_REQUEST', message: 'professorEmail e docId são obrigatórios.' }, 400);
  if (!caller) return jsonResponse({ error: 'UNAUTHORIZED', message: 'Token inválido ou não autorizado.' }, 401);

  const registro = buscarRegistroProfessor(professorEmail, cfg.adminSpreadsheetId);
  if (!registro) {
    return jsonResponse({
      error:   'PROFESSOR_NAO_CADASTRADO',
      message: 'Professor não cadastrado. Solicite o cadastro ao administrador.'
    }, 403);
  }
  const ehProfessor = (caller === professorEmail);
  if (ehProfessor && registro.status !== 'Ativo') {
    return jsonResponse({
      error:   'PROFESSOR_INATIVO',
      message: 'Licença inativa. Entre em contato com o administrador.'
    }, 403);
  }
  if (!registro.spreadsheetId) return jsonResponse({ registros: 0, alunos: [] });

  const sheet = SpreadsheetApp.openById(registro.spreadsheetId).getSheetByName(SHEET_LOGS);
  if (!sheet) return jsonResponse({ registros: 0, alunos: [] });
  const data = sheet.getDataRange().getValues();

  return jsonResponse(resumirProcessoDocumento(data[0] || [], data.slice(1), {
    docId:          docId,
    alunoEmail:     ehProfessor ? null : caller,
    professorEmail: professorEmail,
    gapMinutos:     PROCESSO_GAP_SESSAO_MIN
  }));
}
