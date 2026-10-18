# Supervisor and teacher calm UX — 2026-10-18

Owner approved bounded design in async answer: نعم، نفّذ هذا النطاق. Baseline main/6aa10a00 after PR574. Branch codex/calm-school-workspace.

## Changes

- Supervisor skills require explicit subject selection. Three compact counts precede closed student-matrix and mastery-details sections. Existing student drilldowns, pagination, exports and computations remain available.
- Teacher skill options and report filtering share subjectId → legacy subject → report subjectName precedence. Previously options and filtering disagreed for canonical IDs vs display names. Selected subject remains isolated by path. First six skills shown, then more.
- Question preparation disables section/skill choices until subject selection and clears dependent selections on subject change. Labels resolve known subject/skill IDs, including nested subSkills; unknown storage IDs are not presented as names. Existing free-text Arabic legacy labels remain readable.
- Teacher overview shows six assigned class cards; preparation shows twelve question rows. Existing display controls expose more/less and restore all for print; selections and actions remain intact. Existing grouped navigation retained, teacher labels shortened.
- Loading/error/retry precede the teacher subject placeholder, so failed initial loads remain recoverable.

## Evidence and boundaries

Pure subject/path/legacy/immutability/catalog/nested-name tests PASS; styled actual radar/filter browser320/390/1280 PASS, including choose-first, changing subject resets skills, same skill across different subjects, display limits, names, no overflow and visible error/retry. RED→GREEN for original missing gate, hidden error and nested IDs. Independent read-only review found two P2 issues; both corrected, final review no confirmed P1/P2.

Root TypeScript PASS. Existing complete teacher/supervisor final contract chain PASS (9 commands, including scoped workspaces, report/result/mastery/access contracts). Prior role-dashboard browser regression PASS (teacher action/complete roster, allowed navigation, reports/director lists/print;1280/390). Local browser default executable1248 was absent; unchanged harness was run from scratch with existing executable1243, no dependency/product edits. Exact-head build/CI and published UX verification pending. No endpoint, auth/RBAC, database, report evidence, scoring or payment changes. Zero provider calls and zero production domain writes. This is a bounded display improvement, not global certification of all school permissions, scale, or all dashboard journeys. Existing server scope remains authoritative.
