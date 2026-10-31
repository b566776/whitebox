---
title: 'Reduce OAuth scopes: replace drive.readonly with drive.file'
type: 'feature'
created: '2026-10-31'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '233ec5cefb51176f64728ffd37da29b6282e43e8'
context: ['{project-root}/docs/development-guide.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Both user-facing manifests (`whitebox-client`, `whitebox-lib`) request `https://www.googleapis.com/auth/drive.readonly`, a Google *restricted* scope. It forces the CASA security assessment for Marketplace publication and triggers the "unverified app" wall for students in Workspace-managed domains, the first blocker for selling to higher-education institutions.

**Approach:** Replace `drive.readonly` with the non-sensitive `drive.file` scope in both manifests, keep every Drive-dependent feature working when the scope grants access to the current document, and degrade explicitly when it does not: role detection must not depend on Drive, the context reports whether Drive access worked, and the professor sees a short notice when Drive-only features (class folder name, retroactive paste detection) are unavailable.

**Decisions (recorded during planning):**
- Keep `script.send_mail` and the three `classroom.*` scopes: sensitive, not restricted; the deferred goals revisit them.
- Role resolution gains a Drive-free path: a server-registered professor opening a document that carries **no** `WHITEBOX_CONFIG` designation is a teacher. Designated documents keep today's rule.
- Writing the class name into `WHITEBOX_CONFIG` at distribution is deferred (see deferred-work.md); without Drive the class is `SEM_TURMA`.
- Deployment (new library version, client `version` bump, re-authorization) is done by the user, not by this change.

## Boundaries & Constraints

**Always:** keep `oauthScopes` identical in `whitebox-client/appsscript.json` and `whitebox-lib/appsscript.json`; keep the Drive advanced service (v3) enabled in both; keep every Drive call inside try/catch so a denied call never breaks the panel; keep `WHITEBOX_CONFIG` untouched.

**Never:** add any scope not already present; change `whitebox-server/appsscript.json` (runs as the admin, not part of user consent); change telemetry payload field names; touch the Marketplace listing, OAuth verification or CASA process.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Drive access granted | `DriveApp.getFileById(docId)` succeeds under `drive.file` | `item3` unchanged (folder name, folder owner, `revisionsCount`), revision paste detection runs, `item3.driveAccess === true` | N/A |
| Drive access denied | `DriveApp.getFileById` throws | `item3.driveAccess === false`, `gradeLevel`/`professorEmail` = `NAO_IDENTIFICADO`, `revisionsCount` 0, revision paste detection skipped; panel loads | Caught and logged once; never shown as an error to students |
| Registered professor, undesignated doc, no Drive | license ATIVO/INATIVO, no `WHITEBOX_CONFIG` | `initialRole === 'teacher'` | N/A |
| Registered professor, copy designated to another professor | registered, designation ≠ user | `initialRole === 'student'` (unchanged) | N/A |
| Student on distributed copy, no Drive | not registered, designated to X | `initialRole === 'student'`, telemetry `professorEmail` X, `turma` `SEM_TURMA` | N/A |
| Teacher view, Drive denied | role teacher, `ctx.item3.driveAccess === false` | One short notice in the sidebar; metrics and actions still available | N/A |

</frozen-after-approval>

## Code Map

- `whitebox-client/appsscript.json`, `whitebox-lib/appsscript.json` -- user-consent manifests; swap `drive.readonly` → `drive.file`; lists must stay identical (development-guide §2.5); keep Drive v3 advanced service.
- `whitebox-lib/Logic.gs:115-180` `getContext()` -- role rule `isDesignated ? teacher : ((isOwner || isProfessor) && isRegisteredProfessor) ? teacher : student`; `isOwner` via `DriveApp` (Drive-dependent); `getDesignatedProfessor()` already called. Add the "registered + no designation" path; keep `debugInfo`.
- `whitebox-lib/Logic.gs:570-599` `getAdvancedItem3Data()` -- one try/catch around `DriveApp.getFileById`, `getParents()` and `Drive.Revisions.list`. Add `driveAccess` to the returned object; no other contract change.
- `whitebox-lib/Logic.gs:338-345` `sendToBackend()` -- `turma = item3.gradeLevel || TURMA_FALLBACK` (note: `'NAO_IDENTIFICADO'` is truthy; map it to `SEM_TURMA`).
- `whitebox-lib/Logic.gs:759-835` `_detectPasteFromRevisions()` -- already graceful; nothing to change unless a cheap early exit is trivial.
- `whitebox-lib/Utils.gs:35-68` `getDesignatedProfessors()` -- source of "has designation" for the new role path; reuse, do not change.
- `whitebox-lib/Sidebar.html:905-925` -- startup `getContext` handler; add the teacher-only notice element and set it when `ctx.item3.driveAccess === false`.
- `docs/Student.md` (Permissões), `docs/development-guide.md` §2.5, `docs/Admin.md` (Solução de Problemas), `docs/Teacher.md` -- scope list, `driveAccess` diagnostic, re-authorization, Marketplace implication.

## Tasks & Acceptance

**Execution:**
- [x] `whitebox-client/appsscript.json`, `whitebox-lib/appsscript.json` -- replace `drive.readonly` with `drive.file` -- removes the restricted scope.
- [x] `whitebox-lib/Logic.gs` -- `getAdvancedItem3Data()` returns `driveAccess`; `sendToBackend()` maps `NAO_IDENTIFICADO` to `SEM_TURMA`; `getContext()` role rule adds `(isRegisteredProfessor && no designation)` -- Drive-free role, explicit degradation.
- [x] `whitebox-lib/Sidebar.html` -- teacher-only notice when `driveAccess === false` -- clear degradation.
- [x] `docs/Student.md`, `docs/development-guide.md`, `docs/Admin.md`, `docs/Teacher.md` -- update scope list, diagnostics, re-authorization note, Marketplace implication (no restricted scope → no CASA; sensitive scopes still need OAuth verification).

**Acceptance Criteria:**
- Given both manifests, when diffed, then `oauthScopes` are identical, contain `drive.file` and no `drive.readonly`.
- Given a registered professor on their own undistributed master document with every Drive call failing, when `getContext()` runs, then `initialRole` is `teacher`.
- Given a student copy with Drive calls failing, when telemetry is sent, then `turma` is `SEM_TURMA` and `professorEmail` is the designated professor.
- Given a teacher whose `driveAccess` is false, when the panel opens, then the notice is visible and the rest of the panel works.

## Implementation Notes

- 2026-10-31 (lead): added `whitebox-lib/tests/context.test.js`, a Node `node:test` harness that loads Constants.gs, Utils.gs and Logic.gs in a `vm` context with stubbed Google services; one test per I/O matrix row plus manifest and sidebar checks. No dependencies, no package.json.

- 2026-10-31: implemented. Role rule is now `isDesignated ? teacher : (isRegisteredProfessor && (!hasDesignation || isOwner || isProfessor)) ? teacher : student`; `hasDesignation` added to `debugInfo`. `driveAccess` is set `true` right after `DriveApp.getFileById` succeeds (so a later `Drive.Revisions.list` failure alone does not flip it). Notice element `#teacher-drive-notice` sits inside `#teacher-view`, above the tab panels, so students never see it. `_detectPasteFromRevisions()` left unchanged (already graceful). Docs avoid the literal old scope name so the spec's grep stays clean. `classroom/appsscript.json` and `deploy-temp/appsscript.json` still list the old scope but are outside the spec's scope (not deployed manifests).
- Verified: manifests identical (node), no `drive.readonly` in client/lib/docs/README, `Logic.gs` parses (`node --check`), role/turma rule simulated against the I/O matrix. Not verified: live behavior under `drive.file` (needs lib version + client bump + re-auth by the user).

## Spec Change Log

## Review Triage Log

**Pass 1 (2026-10-31)** — layers: blind-hunter, edge-case-hunter, verification-gap. 17 findings after merging duplicates.

Outcome: patch entries #1–#4, #6, #8–#10, #12–#14, #16, #17 applied by the implementation agent (re-engaged); #5 deferred to deferred-work.md; #7, #11, #15 rejected (low). Verification after patches: `node --test whitebox-lib/tests/context.test.js` 11/11 pass; manifests identical with `drive.file` only; no `drive.readonly` left in client, lib, docs or README.

| # | Layer | Location | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|---|
| 1 | verification-gap, edge-case (1, 10) | `whitebox-lib/Logic.gs` sendToBackend professorEmail resolution | Registered professor on undesignated doc without Drive gets teacher UI but analysis and metrics are refused with PROFESSOR_NAO_IDENTIFICADO because `item3.professorEmail === 'NAO_IDENTIFICADO'` is truthy | high | Verification-gap layer reproduced it with the test harness (`aiError`/`metricsError` = PROFESSOR_NAO_IDENTIFICADO, no proxy call); notice and docs claim analysis keeps working | patch |
| 2 | edge-case (2), blind-hunter (5) | `whitebox-lib/Logic.gs` getContext/sendToBackend | Registered professor, Drive OK, undesignated doc owned by a student: teacher UI, but analysis attributed to the folder owner's e-mail and rejected by the server | medium | Same root cause as #1: professorEmail ignores the new Drive-free teacher path; previously this user got the student UI so no call was attempted | patch (grouped with #1) |
| 3 | blind-hunter (1) | `whitebox-lib/tests/context.test.js`, `whitebox-lib/.clasp.json` | clasp would push the Node test into the library (`.js` in scriptExtensions, `skipSubdirectories: false`, no `.claspignore`); top-level `require` breaks every library call | high | Confirmed by reading `whitebox-lib/.clasp.json`; no `.claspignore` exists | patch |
| 4 | verification-gap, edge-case (6), blind-hunter (2) | `whitebox-lib/tests/context.test.js:3`, `docs/development-guide.md` §3 | Documented run command `node --test whitebox-lib/tests/` fails on Node 24 (MODULE_NOT_FOUND); suite not referenced in the dev guide | medium | Reproduced in this session; passes only with the explicit file path | patch |
| 5 | verification-gap | `whitebox-lib/Sidebar.html` notice | Notice covered only by source-text matching, never executed | medium (unverified gap, no DOM harness) | Filed with disposition defer; repo has no browser test harness | defer (add to smoke checklist) |
| 6 | edge-case (3), blind-hunter (7) | `whitebox-lib/Logic.gs` getAdvancedItem3Data | `driveAccess` set right after `getFileById`; a failure in `getParents`/`Revisions.list` leaves `driveAccess: true` with degraded fields and no notice | low | Confirmed in code; partial failures are plausible once Drive is a different grant per file; one-line move of the assignment | patch |
| 7 | edge-case (4) | `whitebox-lib/Utils.gs` getDesignatedProfessors | Read failure returns `[]`, indistinguishable from an undesignated doc, so a registered professor could see teacher UI in another teacher's copy | low | Requires a NamedRange read failure (rare API error); UI-only, server still authorizes by e-mail; fix adds a null branch and a second state | reject (low, unlikely, adds complexity) |
| 8 | edge-case (5) | `whitebox-lib/Logic.gs` _detectPasteFromRevisions catch | Failure path never caches `REV_DIFF_DONE`, so every aura-map refresh re-issues the failing Drive call when drive.file does not cover the doc | low | Confirmed in code; the change makes the failing path the expected state; one-line cache put in the catch | patch |
| 9 | edge-case (7), blind-hunter (9b) | `whitebox-lib/tests/context.test.js` manifest test | Denylist misses `drive.metadata.readonly`, `drive.activity.readonly`, `drive.scripts` | low | Confirmed by reading the regex; direct correction to "no `auth/drive*` scope except `drive.file`" | patch |
| 10 | edge-case (8), blind-hunter (9a) | `whitebox-lib/tests/context.test.js` sidebar test | Containment clause `studentView < teacherView` is always true, so placement is not really checked | low | Confirmed: `#student-view` (line 593) precedes `#teacher-view` (line 670); direct correction | patch |
| 11 | edge-case (9, deletion) | manifests / getContext | Registered co-owner professor on a doc designated to another teacher drops to student UI when drive.file fails | low | Real behavior change but requires co-ownership plus failed Drive access; spec keeps today's rule for designated docs; fix needs Drive-free ownership | reject (low, unlikely, non-trivial fix) |
| 12 | blind-hunter (3) | `docs/Admin.md` checklist | No post-deploy gate verifying `item3.driveAccess` before rollout; deferred WHITEBOX_CONFIG work has no trigger | medium | Spec itself marks live behavior unverified; one checklist step | patch (docs) |
| 13 | blind-hunter (4) | `docs/Admin.md`, `docs/Teacher.md` | Remedy "authorize again" is necessary after the scope change but cannot make drive.file cover a file; docs should say the fallback is distribution via the Distribuir tab | low | Confirmed by reading the new troubleshooting entry; direct wording fix | patch (docs) |
| 14 | blind-hunter (5) | `docs/Teacher.md` | Text narrows the role widening to "seu documento mestre" while the rule applies to any undesignated doc | low | Confirmed; dev guide states it correctly; wording fix plus the test from #2 | patch (docs) |
| 15 | blind-hunter (6), verification-gap other | `whitebox-lib/Logic.gs` getSubmissionStatus | `isProfessor` there still depends on designation or Drive folder owner; a stray `DOC_PROP_SUBMITTED` on a master doc could freeze the teacher panel | low | Flag is only set by `markAsSubmitted` on that document; reusing the role rule would add a license call to a hot path | reject (low, unlikely, adds complexity) |
| 16 | blind-hunter (8) | `whitebox-lib/Sidebar.html:922` | `'UNKNOWN'` fallback never applies because `gradeLevel` is the truthy sentinel; `compositeStudentId` carries NAO_IDENTIFICADO while telemetry carries SEM_TURMA | low | Confirmed in code; one-condition fix | patch |
| 17 | blind-hunter (10) | `docs/Admin.md`, `docs/development-guide.md` | Checklist omits removing `drive.readonly` from the Cloud project consent-screen scope list and the library version bump | low | Confirmed: diff does not mention it; the verification status is driven by that list | patch (docs) |

## Design Notes

Why the role rule changes: today a professor on their own master document is recognized only through Drive (`getOwner()` or the parent folder's owner). If `drive.file` does not cover the active document in a container-bound script (not verifiable without deploying), the professor would see the student panel and could not distribute. Treating "registered professor + document without any designation" as teacher removes the dependency; the server still authorizes every professor route by verified e-mail, so the panel role is UI-only.

## Verification

**Commands:**
- `node --test whitebox-lib/tests/context.test.js` -- expected: all tests pass (covers every I/O matrix row with stubbed Google services).
- `diff <(jq -S .oauthScopes whitebox-client/appsscript.json) <(jq -S .oauthScopes whitebox-lib/appsscript.json)` -- expected: no output (or the manifest test above when `jq` is absent).
- `grep -rn "drive.readonly" whitebox-client whitebox-lib docs README.md` -- expected: no matches.

**Manual checks (if no CLI):**
- After `clasp push` of the lib and a new library version pinned in the client: open the professor's master doc after re-authorizing and confirm teacher mode; open a student copy and check `item3.driveAccess` in the Apps Script log; if false, confirm the teacher notice and that telemetry still logs with `SEM_TURMA`.
