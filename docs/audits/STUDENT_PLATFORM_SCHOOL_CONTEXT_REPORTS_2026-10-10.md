# رحلة الطالب وفصل مصادر التقارير — 2026-10-10

## Scope and execution truth

Owner request: continue enrolled/independent learner journey and separate platform activity, platform tests, and school-directed tests. Baseline `main@c36ea8a78f5b27b990c16f61fcc6a0dc17f8ef46`; branch `codex/student-platform-school-report-separation`. This is a bounded reporting/history slice, not certification of all training, plan completion, Qiyas specifications, physical devices or production classroom pressure.

## Implementation

- Reuse persisted `QuizResult.learningContext`; expose it through both personal result lists and scoped results. Add an optional validated context selector without changing existing route names or default selection, ownership guards, scores, attempts or histories.
- Older absent/null/unknown origin remains `legacy_unknown`. Context filters compose with taxonomy filters using `$and`, preserving both `$or` clauses. Compatibility reads retain persisted origin/owner, even when their projection conflicts. List snapshots select title/mode/kind/path/subject without target rosters or question reviews.
- New individually targeted school submissions use the verified sender's school/class relation; student school membership and client navigation source alone do not classify platform tests as school assessments. Existing group-target classification is retained. No historical backfill or score/progress migration.
- Reports present standalone training/review activity, recorded lesson completion, platform tests, school-directed tests, and unclassified history with separate loaded-period scores and skill evidence. Canonical overall mastery/readiness and the existing plan remain combined learning evidence and are labeled accordingly. Plan, review, learning and result/history links reuse existing routes.
- Attempts history reads one 50-row personal context page, with explicit coverage, opt-in older pages, retry and stale-context/actor response isolation. It does not increase the global bootstrap's 100-row limit or traverse history automatically. Regular/mock categories remain independent of source; frozen snapshot kind survives a deleted live quiz.
- UI ownership: `utils/studentLearningContext.ts`, `hooks/useStudentResultHistory.ts`, `components/StudentResultHistoryControls.tsx`, `pages/Reports/StudentJourneySourcesPanel.tsx`. No new service, polling, AI request or duplicated result store.

## Verification

- Frontend typecheck, backend typecheck, production build: PASS locally.
- Performance/runtime footprint guards: PASS; my-quizzes existing contracts: 10/10 PASS.
- Real React reports/history/attempts component regression: enrolled and independent fixtures; separated scores/skills; activity skip exclusion and unique lesson counts; plan/history links; one bounded initial read; manual pagination and deduplication; failure/retry; stale context/actor suppression; empty-source controls; frozen mock classification; production CSS at 1280/390 without horizontal overflow or JavaScript errors: PASS locally.
- Required isolated Mongo HTTP gate now checks persisted individual school submission through real creation/submission, both personal context lists, totals and ownership, invalid context rejection, scoped supervisor filtering, and independent student's own result. Production data is not used by this gate.
- Exact-head CI, protected merge and published enrolled/independent journey: pending. Status PARTIAL until those pass.

## Boundaries and remaining work

- Existing reports/bootstrap expose a loaded subset, explicitly labeled; the history page supplies older pages on request. No claim of all-history analytics or measured bandwidth savings.
- Records previously written with an incorrect explicit platform origin by individual-school targeting are not silently migrated. Their historical classification needs a separate provenance-backed repair; stored grades remain intact.
- Full completion-to-plan credit, all training/retry workflows, authoritative cross-device timer, full mock/Qiyas specification, availability/selected retakes and physical classroom bandwidth/latency remain previously recorded gaps.
- Prior 34 bounded production system checks and 24-client classroom API measurement remain preserved; they are not repeated or counted as evidence for this new slice.
