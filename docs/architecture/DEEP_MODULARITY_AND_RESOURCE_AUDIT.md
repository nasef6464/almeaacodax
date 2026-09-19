# ALMEAA Deep Modularity & Resource Audit

Status: ACTIVE CANONICAL AUDIT MAP  
Branch baseline: `fix/parent-authority-b9`  
Purpose: finish each domain once: inspect → repair → modularize → protect → verify → close.

## 1. Repository-wide evidence
The current tree contains 1,465 files. High-density areas include 94 backend module files, 55 models, 38 route files, 16 shared backend services, and 135 admin-dashboard files.

Measured high-coupling hotspots:
| File | Lines | Imports | DB model calls / React state | Decision |
|---|---:|---:|---:|---|
| server/src/routes/content.routes.ts | 2640 | 43 | 131 DB calls | DECOMPOSE by content capability |
| server/src/routes/quiz.routes.ts | 2350 | 66 | 71 DB calls | CONTINUE extraction into quizzes module |
| server/src/routes/payment.routes.ts | 1930 | 16 | 54 DB calls | DECOMPOSE payment lifecycle/webhooks/grants |
| server/src/routes/auth.routes.ts | 1919 | 33 | 89 DB calls | DECOMPOSE auth/account/admin-parent authority |
| server/src/routes/publicTests.routes.ts | 765 | 15 | 23 DB calls | MODERATE decomposition after authority stability |
| server/src/routes/notification.routes.ts | 544+ | 18 | 20 DB calls | DECOMPOSE now in Batch 9 |
| dashboards/admin/SchoolsManager.tsx | 2197 | 62 | multiple hooks | CONTINUE existing feature-folder extraction |
| dashboards/admin/AdminDashboard.tsx | 2093 | 7 | 8 state hooks | DECOMPOSE navigation/orchestration panels |
| dashboards/admin/QuestionBankManager.tsx | 1943 | 9 | 27 state hooks | DECOMPOSE query/filter/editor workflows |
| dashboards/admin/QuizBuilder.tsx | 1494 | 9 | 14 state hooks | DECOMPOSE builder state/sections |
| pages/QuizPage.tsx | 2412 | 17 | 31 state, 10 effects | HIGH PRIORITY runner decomposition |
| pages/Quiz.tsx | 1428 | 10 | 22 state, 6 effects | DECOMPOSE catalogue/session responsibilities |
| components/CoursePlayer.tsx | 1076 | 11 | 14 state, 8 effects | DECOMPOSE media/progress/navigation |

Line count alone is not a refactor trigger. Responsibility mixing, authority duplication, DB orchestration inside transport, repeated state/effects, and unsafe change radius are the triggers.

## 2. Target architecture
Backend domain shape where justified:
`routes/http → application use-cases → domain policy/authority → infrastructure repositories/models/integrations`.

Frontend feature shape where justified:
`page/container → feature hooks/state → presentation components → API adapter/view models`.

Do not introduce microservices, a framework rewrite, repository wrappers for trivial one-off queries, or tiny files with no ownership benefit.

## 3. Cross-domain authority debt
Canonical authorities must not be reimplemented per route:
- School membership: SchoolMembership.
- Teacher class/subject authority: TeachingAssignment.
- School feature entitlement: SchoolContract.modules.
- Parent/student authority: ParentStudentRelationship, with bounded legacy fallback only until backfill/cutover proof.
- Paid/content entitlement: AccessGrant direction; compatibility mirrors remain until reader migration proof.
- Assessment production authority remains compatible with QuizResult until verified cutover.

Every batch must search its domain for direct legacy readers/writers before closure.

## 4. Batch-integrated modularity plan
### Batch 9 — Parent / Notifications
Finish canonical parent relationship semantics, revoked-row tombstones, admin role-change revocation, backfill tooling, weekly-report bulk reads/idempotency, teacher/supervisor reachability, notification campaign cap/orchestration. Split notification transport from audience authority, campaign/application logic, weekly report generation and provider infrastructure. Close only after focused + integration + CI gates.

### Batch 10 — Privacy / lifecycle
Create lifecycle application services and explicit retention/anonymization policies. Keep route handlers transport-only. Centralize user-linked collection inventory; no blanket cascade.

### Batch 11 — Backup / DR
Separate learning snapshot from full backup/restore infrastructure. Add verification/restore drill contracts; avoid backup logic scattered across routes/scripts.

### Batch 12 — Runtime / deployment / observability
Consolidate deployment health, release identity, logging and runtime configuration. One canonical deploy path. Inspect live state before destructive changes.

### Batch 13 — Performance / resource efficiency
Measure before optimizing. Include DB query plans, queue lag, event loop, API payload size, static/media transfer and origin egress. Record production-equivalent evidence.

### Batch 14 — Architecture sweep, not first decomposition
Only residual cleanup should remain: frontend high-coupling hotspots, duplicated API/view logic, naming/boundary consistency and dependency direction. No mass rewrite.

### Batch 15 — final certification
Run whole-system gates after all modular changes; this is integration certification, not a second architecture project.

## 5. Bandwidth / origin-egress policy
Goal: application origin must not become the media CDN.

Target policy:
1. Images and heavy media are stored/served through the configured Cloudflare-backed object/media delivery layer, not repeatedly streamed from the Node application origin.
2. Application DB stores stable asset identifiers/URLs plus metadata; authorization is enforced before issuing protected access where needed.
3. Prefer direct/presigned client upload where security requirements allow; avoid proxying large uploads/downloads through Node without a proven need.
4. Cache immutable/versioned public assets aggressively at the edge. Never cache private/API responses merely to reduce bandwidth.
5. Prevent base64/blob media from inflating JSON/API payloads.
6. Measure response sizes, repeated bootstrap payloads, polling/realtime traffic, media origin egress and cache hit ratio in Batch 13.
7. Keep PWA policy from caching API responses.
8. Add upload/media contract tests before removing any legacy origin path.
9. Cloudflare configuration and live cache behavior require live verification; repository inspection alone cannot certify them.

## 6. Closure rule for every remaining batch
A batch is DONE only when:
- domain behavior and authorities inspected;
- defects repaired;
- worthwhile modular decomposition completed in the same batch;
- duplicate legacy readers/writers inventoried and migrated or explicitly retained with cutover condition;
- regression/security tests added;
- typecheck/build/focused tests pass;
- required exact-head CI is green;
- architecture map updated if boundaries/source of truth changed.

## 7. Global completion condition
No second wholesale refactor pass is planned. Batch 14 is a residual architecture sweep and Batch 15 is final integration certification. Any deferred debt must have an explicit reason, owner batch, and safe compatibility boundary.
