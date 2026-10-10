# Reports staff presentation boundaries — 2026-10-10

## Scope and checkpoint

Continue from published main `49868c327927ff8386d6195c84c40173b243a5de`. Preserve the 34 distinct bounded production checks recorded in `STUDENT_AND_SCHOOL_SYSTEM_VERIFICATION_2026-10-10.md`; no replay of the classroom API load or new assessment/content/result records.

Reports.tsx is now 2570 lines (455 fewer); it was 3025 lines and failed the existing presentation size guards. Extract the existing decision/institutional follow-up, directed assessment analysis, remediation, and recent attempts into four typed presentation components. Parent-owned data, filters, actions, clipboard error handling, existing visibility conditions, links, result values and classes are preserved. No API, scoring, authorization, persisted data or polling change. This is maintainability work; no measured server or bandwidth reduction is claimed.

## Verification and limits

- Real component browser regression exercises four staff roles, student/parent hidden staff controls, parent selection, nine action callbacks, pending/error/success, empty exports, existing 67% result and targeted follow-up link. Required deep report-actions suite now runs this regression after Chromium setup.
- Existing role/global source contracts follow the four new JSX owners; their assertions remain unchanged. First CI exposed the performance contract still looking for recent-attempt follow-up JSX in Reports.tsx. Retarget the original assertions to their actual presentation owners and add parent-composition checks; no expectations removed. Performance and runtime footprint checks PASS locally; required CI is rerun on the corrected exact head.
- Broad historical report-contract sweep exposed six pre-existing stale student contracts (learning-loop, readiness, report-actions, report-scope, selected-skill, skill-rows). Their runtime files and checks were untouched in this slice. The selected-skill contract additionally has an older stricter Reports size guard of 2620; extraction also addresses that guard. Its existing useStore assertion remains a separate open issue. No limits or expectations were weakened.
- Final local typecheck and production build PASS. Real component regression PASS with production CSS at 1280/390px and zero overflow; role 20/20 and global journey 14/14 PASS; weekly presentation 5/5 PASS. Code PR [#499](https://github.com/nasef6464/almeaacodax/pull/499) merged as `559099798cae0533a1815866a1580009cb1cad68`. Exact corrected head `96896605972439bb0bfc4a981e059a9904056e11`: 24 successful checks, 3 conditional skips, all 3 required checks PASS. First-head source-owner failure was corrected without weakening expectations; corrected-head public dashboard mobile check passed on same-head rerun (the audit has a 250ms fixed render wait). All four main gates SUCCESS.

## Remaining authorized system work

Student plan credit after lesson completion, complete training/retry/history, full path mock specification, directed availability/retakes and real device/load latency remain open as recorded in the student/school audit. This extraction does not certify the whole ecosystem or Qiyas equivalence.

## Published bounded proof

Render live and frontend assets match `55909979`; canonical/direct scale-ready return 200 with the same commit and DB/Redis rate-limit/queue PASS. Read-only real supervisor Reports and student Reports at 1280/390px PASS; all four staff panels render for supervisor, staff controls remain absent for student, no horizontal overflow and zero page JavaScript errors. Three presentation checks PASS; preserve the previous 34 distinct system checks without treating these as full ecosystem certification.

Initial harness opened /reports with cookies only and was redirected to login because that route does not bootstrap a new auth profile. The normal dashboard entry initializes the existing session; the corrected dashboard→reports proof passed. No auth/runtime changes or data writes. Private diagnostic and final proof retained separately.

Six historical report contracts were evaluated against baseline main `49868c32` source: all six already FAIL; current extraction fixes their Reports size complaints but does not alter those student responsibilities. Follow-up must reconcile their active owners and verify actual learner behavior without weakening evidence/readiness policy.

Status VERIFIED for this presentation extraction. Whole ecosystem remains PARTIAL; actual device/full-class bandwidth and Qiyas equivalence remain NOT PROVEN. Detailed private evidence: scratch/reports-panels-exact-ci.json, reports-panels-deploy-proof.json, reports-panels-published-ui.json, reports-stale-contract-baseline.json. Screenshots retained privately.
