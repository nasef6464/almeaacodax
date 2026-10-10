# Reports staff presentation boundaries — 2026-10-10

## Scope and checkpoint

Continue from published main `49868c327927ff8386d6195c84c40173b243a5de`. Preserve the 34 distinct bounded production checks recorded in `STUDENT_AND_SCHOOL_SYSTEM_VERIFICATION_2026-10-10.md`; no replay of the classroom API load or new assessment/content/result records.

Reports.tsx is now 2570 lines (455 fewer); it was 3025 lines and failed the existing presentation size guards. Extract the existing decision/institutional follow-up, directed assessment analysis, remediation, and recent attempts into four typed presentation components. Parent-owned data, filters, actions, clipboard error handling, existing visibility conditions, links, result values and classes are preserved. No API, scoring, authorization, persisted data or polling change. This is maintainability work; no measured server or bandwidth reduction is claimed.

## Verification and limits

- Real component browser regression exercises four staff roles, student/parent hidden staff controls, parent selection, nine action callbacks, pending/error/success, empty exports, existing 67% result and targeted follow-up link. Required deep report-actions suite now runs this regression after Chromium setup.
- Existing role/global source contracts follow the four new JSX owners; their assertions remain unchanged. First CI exposed the performance contract still looking for recent-attempt follow-up JSX in Reports.tsx. Retarget the original assertions to their actual presentation owners and add parent-composition checks; no expectations removed. Performance and runtime footprint checks PASS locally; required CI is rerun on the corrected exact head.
- Broad historical report-contract sweep exposed six pre-existing stale student contracts (learning-loop, readiness, report-actions, report-scope, selected-skill, skill-rows). Their runtime files and checks were untouched in this slice. The selected-skill contract additionally has an older stricter Reports size guard of 2620; extraction also addresses that guard. Its existing useStore assertion remains a separate open issue. No limits or expectations were weakened.
- Final local typecheck and production build PASS. Real component regression PASS with production CSS at 1280/390px and zero overflow; role 20/20 and global journey 14/14 PASS; weekly presentation 5/5 PASS. Exact-head CI, merge/deployment and read-only published report proof are pending. Status PARTIAL until those complete.

## Remaining authorized system work

Student plan credit after lesson completion, complete training/retry/history, full path mock specification, directed availability/retakes and real device/load latency remain open as recorded in the student/school audit. This extraction does not certify the whole ecosystem or Qiyas equivalence.
