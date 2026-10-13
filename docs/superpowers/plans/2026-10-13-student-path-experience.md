# Student Path Experience Implementation Plan

> For agentic workers: execute inline with superpowers:executing-plans. Review bounded changes before integration.

Goal: owner-controlled all-path/enrolled-path presentation for authenticated students, optional automatic per-path stage enrollment, reusable standard/simple templates, and non-blocking onboarding for existing/future paths.

Architecture: additive presentation settings in existing HomepageSettings and Path.settings; preserve enrolledPaths and add bounded pathStageSelections to user preferences. Shared pure scope projections and a small provider control student presentation only; existing server authorization/payment/scoring remain authoritative. New path IDs and levels are data-driven. Legacy settings default to all/standard, existing enrollments survive without mandatory backfill; missing legacy stage prompts selection without deleting history.

- [x] Contracts/backend: typed settings, bounded stage rows, validate visible path and stage membership on enrollment changes, atomic preference save; reuse existing routes/models. Behavior tests for future path with/without levels, invalid/cross-path stages, legacy partial updates, no content/payment grants.
- [x] Client enrollment: server-confirmed, actor-bound serialized actions; stage selection retained through auth sync/logout; existing callers compatible. UI modal/button asks only when configured stages require it; error/retry/cancel and legacy stage update supported.
- [x] Presentation: global provider reuses homepage settings fetch, shared scopes for navigation/home/catalog/plans/reports/path pages; active registered-path selector; common stage content preserved; unregistered/studentless/staff/guest see all; direct unrelated path invites enrollment rather than displaying its learning content in enrolled mode. Never rewrite stored results.
- [x] Administration/templates: HomepageManager settings panel; PathsManager generic stage policy/label/template fields on existing/new paths; standard/simple per-path UI shell with large controls/short guidance, no duplicate engines or hardcoded exam names.
- [x] Verify: behavior RED→GREEN tests, real UI desktop/mobile enrollment/settings/scopes, frontend/API typecheck/build, required exact-head CI, focused review, protected PR merge, limited published settings/enrollment/restore verification using owned fixtures. Update execution state and affected data/architecture/migration references with exact evidence.

Preserve unowned primary checkout changes and all retained test assets. Current worktree branch codex/student-path-experience from main68f98819. Production setting changes only scoped and reversible for authorized verification, never broadly rewrite enrollments or historic outcomes. No new question bank/provider/service/manual preview.
