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

## Existing journey reconciliation

PR575 initial4e06e305 failed old report-loading fixture expecting an immediate raw skill-ID heading. Updated fixture explicitly selects subject and resolves known catalog name while retaining summary-only reads, pending dedup, school response isolation, error/retry, no student-detail fetch,60percent accuracy and mobile checks; local PASS.

Sourcea96cce1f had19SUCCESS/6conditionalSKIP; deep audit progressed through all journeys and showed exactly3teacher failures: desktop radar stale title; mobile preparation stale title; mobile radar stale title plus body193<generic250. Artifact had no API4xx/5xx, loading, mojibake or overflow. Actual compact390px screenshot visually inspected. Updated expected titles and added required visible preparation filters plus radar enabled subject/path selects, default subject=all and exact subject-first prompt. Only intentionally compact radar minBody is150; all other thresholds/auth/error/API/privacy/overflow checks unchanged. Independent reviewer confirmed this semantic coverage is stronger than padding text. Focused styled browser PASS; no product code change for these harness corrections.

Unrelated counters per-cell alignment metric failed once on a96cce1f. Same full test localPASS at five widths and exact-head failed-job rerunPASS; no counter/style/test relaxation. This is recorded as a transient measurement, not a proved product defect or root-cause fix.

## Independent nested catalog completion

The store also supplies standalone nestedSkills and their children. A stronger fixture moved mathk0 out of top-level skills into this independent collection: existing UI failed8vs9options (RED). Reused existing utils/classroomSkillResolver.ts through schoolSkillLabel for current/legacy/nested names, preserving fallback privacy. Subject/section-scoped schoolSkillOptions includes both catalog sources and inherited children with deduplicated original IDs. No new taxonomy record, grant, query, or data write. Pure standalone/deep nested/unknown-name/foreign-section tests, styled actual UI, existing resolver test, report-loading harness and final root TypeScript PASS. Independent review found no P1/P2. This closes a demonstrated name/filter gap within the approved scope; no new feature scope or service.

## Atomic geometry correction

The unchanged compact counters alignment check failed again on f503dc48. Reproduced the exact false failure using a synthetic vertical animation of the COMMON root (all cells still share one row): old separate protocol reads sampled different layout moments and failed y<2. The harness now captures sibling rects together in one synchronous DOM evaluation; button rects likewise. No size/count/row/touch/overflow/progress/filter assertion was removed or relaxed. Controlled moving-root RED→GREEN and complete normal test PASS at320/360/390/430/1280. This is test sampling correction only; production counter components/styles unchanged. Initial transient-only diagnosis is superseded by this demonstrated race reproduction.
