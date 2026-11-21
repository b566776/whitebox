---
title: 'Process report card for student and teacher from stored telemetry'
type: 'feature'
created: '2026-10-31'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'c8151bb30c654902cc812a741bb98eea1bf0042c'
context: ['{project-root}/docs/api-contracts.md', '{project-root}/docs/data-schema.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Telemetry (active minutes, paste events, typing rhythm, characters) is stored per document in the professor's `Logs` sheet, but nobody can see it: the student only sees live counters that reset when the panel reopens, and the teacher sees no process evidence at all, only AI verdicts. Institutional policies ask for process evidence reviewed by a human and visible to the student.

**Approach:** Add a server route that summarizes the stored telemetry of one document and render it as one shared "Relatório de processo" card in both the student and the teacher panel. Hiding the risk verdicts behind a professor preference is a separate, following spec.

**Decisions (recorded during planning):**
- Authorization is by the verified caller e-mail only: a student gets the rows whose `Email_Aluno` equals the caller; a professor gets the document's rows only when the caller equals `professorEmail` and is registered `Ativo`. The server cannot verify the document's designation (it lives in a NamedRange the server never sees), the same limitation `logar_metricas` has today.
- Rows whose `Email_Aluno` is the professor (professor testing the student view) are excluded. The teacher card lists one block per student; the student card is that same block for the caller. AI analysis rows and columns are never part of the summary.
- The sidebar starts sending `wordCount` in `behavioralMetrics` (additive field) so `Palavras` stops being always 0.
- Telemetry counters are cumulative per panel session; the summary sums monotonic runs. A new session starts when any of the three cumulative counters decreases or the gap between consecutive `Timestamp` values exceeds 30 minutes; all three restart together.

## Boundaries & Constraints

**Always:** keep existing telemetry columns and payload field names; `doPost` passes `callerEmail` to the new handler and the handler filters by it; keep `resumirProcessoDocumento` self-contained (headers, rows and options as parameters, no globals from other server files) so the Node harness can load `ProcessReport.gs` alone; keep `tests/` out of clasp pushes.

**Never:** compute or store a new risk score; include `RiscoScore`, `Whitebox_Risco`, advice or questions in the summary; change existing risk rendering, the AI prompt, the quiz flow, the Admin Dashboard or the aggregated heatmaps; add schema columns or OAuth scopes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Two sessions | rows for doc D, student S: minutes 5, 12, 20 then 3, 9 (counter decreased) | `minutosAtivos` 29, `sessoes` 2, `colagens` and `charsAdicionados` summed the same way, `cpmMedio` = mean of non-zero `Cpm_Medio`, `cpmPico` = max, `palavras` = last non-zero `Palavras`, `ultimaAtividade` = last timestamp, `entregue` from `Entrega_Final` | N/A |
| Short session then larger first row | minutes 2, then 45 min later 3, 9 | gap > 30 min starts a new session: `minutosAtivos` 11, `sessoes` 2 | N/A |
| No rows | doc D has no telemetry for the caller | `{ registros: 0, alunos: [] }`; card says no activity recorded yet | N/A |
| Analysis rows mixed in | rows with numeric `RiscoScore` | ignored (they carry no telemetry) | N/A |
| Professor's own rows | `Email_Aluno` = `professorEmail` | excluded from totals and from the per-student list | N/A |
| Student caller | caller ≠ `professorEmail` | one block, rows with `Email_Aluno` = caller only, whatever the body says | professor not registered → `PROFESSOR_NAO_CADASTRADO` |
| Teacher caller | caller = `professorEmail`, `Status` `Ativo` | one block per student, ordered by `ultimaAtividade` desc | `Ativo` missing → `PROFESSOR_INATIVO` |
| Panel load | either role | card requests the summary on init; student also after each successful sync; teacher has a refresh button | call failure → card shows a retry hint; live tracking unaffected |

</frozen-after-approval>

## Code Map

- `whitebox-server/BrainProxy.gs:756-848` `doPost` -- `callerEmail` from `verificarEmailOAuth` (777); student whitelist `rotaAbertaAAlunos` (784); professor list (790-794). Add `ROUTE_RESUMO_PROCESSO` to the whitelist and call `handleResumoProcesso(body, cfg, callerEmail)`.
- `whitebox-server/BrainProxy.gs:1021-1044, 1278-1329` `handleLogarMetricas`, `logarNaPlanilhaProfessor` -- row shape and header-by-name lookup; `metricas.wordCount || 0` at 1301 is the `Palavras` source.
- `whitebox-server/BrainProxy.gs:358-396` `_agregarLogsPorDocumento` -- aggregation pattern (header indexes, numeric `RiscoScore` = analysis row). Do not change.
- `whitebox-server/Utils.gs:230-267` `buscarRegistroProfessor` -- returns `{status, escola, usaChaveGlobal, chaveIndividual, spreadsheetId}`; reuse.
- `whitebox-server/Constants.gs` and `whitebox-lib/Constants.gs:60-96` -- route constants; add `ROUTE_RESUMO_PROCESSO = 'resumo_processo'` in both.
- New `whitebox-server/ProcessReport.gs` -- pure `resumirProcessoDocumento(headers, rows, { docId, alunoEmail, professorEmail, gapMinutos })` returning `{ registros, alunos: [{ email, minutosAtivos, sessoes, palavras, colagens, charsAdicionados, charsDeletados, cpmMedio, cpmPico, entregue, primeiraAtividade, ultimaAtividade }] }`, plus `handleResumoProcesso`.
- `whitebox-lib/Logic.gs:338-360` `sendToBackend` -- professorEmail resolution to copy into a new `getProcessReport()` (sends `docId`, `professorEmail`; the server filters by caller).
- `whitebox-client/Código.gs:61-76` -- add wrapper `getProcessReport`.
- `whitebox-lib/Sidebar.html:592-667` student view (`#student-area`, live grid 616-633); `685-749` teacher Auditoria tab (analysis card 687-697, `#teacher-results` 699 hidden until an analysis); `1165-1233` `sendBackgroundData` (payload; `stats.wordCount` available at 1165); `~985` `updateUI`. Add `renderProcessReport(data)` used by both views: teacher card at the top of the Auditoria tab, always visible, with a refresh button; student card below the live grid.
- `whitebox-lib/tests/context.test.js` -- existing harness (`montar`, `callProxy` stub); `whitebox-server/.claspignore` -- new, same content as the lib's.
- `docs/api-contracts.md`, `docs/data-schema.md:55-57`, `docs/Teacher.md`, `docs/Student.md` -- new route, `Palavras` semantics, the card.

## Tasks & Acceptance

**Execution:**
- [ ] `whitebox-server/ProcessReport.gs` (new) -- `resumirProcessoDocumento` + `handleResumoProcesso` -- evidence summary with caller-based filtering.
- [ ] `whitebox-server/BrainProxy.gs`, `whitebox-server/Constants.gs` -- route constant, whitelist entry, dispatch with `callerEmail` -- wiring.
- [ ] `whitebox-server/tests/process-report.test.js` (new) + `whitebox-server/.claspignore` -- Node tests loading only `ProcessReport.gs` in a `vm` context for every matrix row that concerns the summary.
- [ ] `whitebox-lib/Constants.gs`, `whitebox-lib/Logic.gs`, `whitebox-client/Código.gs` -- `ROUTE_RESUMO_PROCESSO`, `getProcessReport()`, wrapper.
- [ ] `whitebox-lib/Sidebar.html` -- `wordCount` in the payload; `renderProcessReport`; cards in both views with load triggers and retry hint.
- [ ] `whitebox-lib/tests/context.test.js` -- `getProcessReport` sends `docId` and the right `professorEmail` for a student on a designated copy and for a teacher on a master doc.
- [ ] docs listed in the Code Map.

**Acceptance Criteria:**
- Given a student copy with telemetry, when the student opens the panel, then the card shows minutes, sessions, words, pastes and CPM for that student and the live counters keep running.
- Given the same document opened by the designated professor, when the Auditoria tab loads, then the card lists the same block per student with the same numbers.
- Given a document with no telemetry, when either panel loads, then the card says no activity was recorded yet and no error is shown.
- Given a logged-in user who is neither the professor nor has rows, when the summary is requested, then the response is `registros: 0` (no data leak) and the panel shows the empty state.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Monotonic-run sum: walking rows in time order per student, add `v_i - v_(i-1)` when `v_i >= v_(i-1)` and the timestamp gap is within `gapMinutos` (default 30); otherwise start a new session and add `v_i`. Apply the session decision once per row to the three counters together. `Palavras` is 0 in every row written before this change; the card labels it "última contagem".

## Verification

**Commands:**
- `node --test whitebox-server/tests/process-report.test.js whitebox-lib/tests/context.test.js` -- expected: all pass.
- `grep -n "tests/" whitebox-lib/.claspignore whitebox-server/.claspignore` -- expected: both ignore `tests/**`.

**Manual checks (if no CLI):**
- After deploying lib and server: open a student copy as the student and as the professor and compare the two cards; run `runAllTests()` in the server editor.
