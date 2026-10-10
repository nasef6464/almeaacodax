# Optional classroom pulse and school insights — 2026-10-10

Status: PARTIAL. Local scoped behavior verified; exact-head CI, publication and published checks pending.

Base main59ce32620341dd9ba81eeb54223116233cab9b6d. Owner requested continuing the school improvements and explicitly made classroom pulse optional. Prior #512/#513 presentation closure reused without repeating50views.

## Delivered scope

- Teacher-only pulse is closed by default and resets closed for a different session. Displays last ended batch, response-count accuracy and weak skill evidence. Active batch answers are excluded. A live-session-only support action prepares the existing question selector with the skill; teacher reviews and sends through the current workflow. No automatic assignment or individual-only targeting. Existing batch-end summary stays unchanged.
- Class skill matrix keys pathId/subjectId/skillId (name fallback only within the same known scope). Supervisor path/subject filters reach the matrix. Unknown legacy scope is not guessed. All columns remain reachable in12-column pages;10student rows per page. Same class names stay separated by classId when present. Missing measurement shows unmeasured, not zero mastery. Overall student average remains labelled as overall; filtered skill cells are separate.
- Supervisor priorities show weakest measured skills, affected students/classes and links to existing analysis/testing centers. Unmeasured students have their own list and are excluded from weak/urgent display counts. No score/result persistence changed.
- Director summary appears only after existing authorized detailed-report request. School classroom and official-assessment sources stay separate from platform self-study. Official skill accuracy is explicitly proportion of measurements reaching60%, not average mastery. Daily changes compare potentially different cohorts; no intervention effect claim. Current bounds shown.

## Proportional validation

Actual React/esbuild/Playwright fixture PASS:15skills, same-name cross-subject separation, exact20/50/100known values, path/subject/class filters and caller wiring, allcolumns reachable, selection callbacks, unmeasured exclusion, default-closed pulse, lastclosed-only/noactive leaks, session reset, live-only support action, separate director sources and realzero average.1280/390 no horizontal overflow, zero page errors.

Existing staff-panel and role-dashboard presentation fixtures PASS; reports role20, supervisor14checks plus9scope behaviors/3consumers, skill analysis3, classroom intervention27, classroom G2contract12 PASS. Typecheck/build status recorded at final gate. No new dependencies.

## Pending and limits

Exact-head CI, protected merge, matching deployment and bounded real published checks pending. This fixture does not certify a20student classroom, production scale, causal improvement or complete project readiness. No API/routes/auth/RBAC/scoring/payment/migration/persisted semantics changes; no business writes, new polling/AI or paid services. No measured bandwidth saving claimed.

Unique participation rate, director per-class growth and causal intervention tracking are not exposed by the current bounded report and remain DEFERRED; do not fabricate them from attempts or daily accuracy. Skill matrix collision pagination has deterministic fixture evidence; published data may not contain the same synthetic collision.
