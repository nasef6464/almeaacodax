# ALMEAA Current Directory & Module Map

Status: CANONICAL CURRENT-STATE MAP  
Audit branch: `fix/parent-authority-b9`  
Rule: this file describes what exists now. Target architecture is documented separately and must not be mistaken for completed migration.

## 1. Repository shape

Current branch tree contains 1,466 files.

| Root | Files | Runtime meaning |
|---|---:|---|
| `scripts/` | 318 | smoke/audit/ops tooling; not product runtime |
| `docs/` | 289 | engineering/product/archive documentation |
| `server/` | 276 | API/runtime/server scripts |
| `dashboards/` | 141 | frontend role/admin workspaces |
| `tools/` | 84 | architecture/refactor tooling |
| `pages/` | 69 | route-level frontend screens |
| `components/` | 68 | shared + domain frontend components |
| `.github/` | 49 | CI workflows/support |
| `load-tests/` | 44 | performance evidence/tooling |
| `utils/` | 33 | frontend helpers, some domain-heavy |
| `services/` | 19 | frontend API/integration facade |
| `public/` | 17 | static public assets |
| `store/` | 9 | Zustand facade + extracted slices |
| `deploy/` | 8 | VPS/Docker deployment templates |
| `contexts/` | 2 | frontend context |
| `hooks/` | 1 | shared hook |
| `src/` | 1 | only `src/observability/sentry.ts` today |

Important: the planned frontend `src/app`, `src/core`, `src/features`, and `src/shared` structure is a TARGET, not the current filesystem. Do not bulk-move files merely to make the tree resemble the target.

## 2. Backend current map

`server/src` ownership:
- `models/` — 55 Mongoose models.
- `modules/quizzes/` — 53 files: strongest domain module; application/infrastructure/http/presentation/analytics.
- `modules/schools/` — 14 files: school policy/workspace/application ownership.
- `modules/content/` — 13 files: partial content/bootstrap/http decomposition.
- `routes/` — 29 root route files plus 9 classroom route registrars.
- `services/` — 16 legacy/shared services.
- `modules/notifications/` — 4 files; partial.
- `modules/product-config/` — 4 files.
- `modules/reports/` — 3 files.
- `modules/ai/` — 1 file.
- `modules/auth/` — 1 file.
- `modules/privacy/` — 1 application file; Batch 10 account-erasure lifecycle boundary.
- `modules/public-tests/` — 1 file.
- `app/bootstrap/` — 4 files; healthy composition boundary.
- `middleware/`, `config/`, `sockets/`, `queues/`, `observability/` — cross-cutting runtime infrastructure.

### Backend model to emulate
Smart Classroom already uses thin roots plus role/capability registrars:
`classroom.routes.ts` / `classroomRoot.routes.ts` →
teacher/student/supervisor/batch/template/competition/insights registrars →
school/application authority such as `TeachingAssignment`.

This is the preferred incremental pattern for other large routes.

### Backend hotspots requiring domain-owned decomposition
- `content.routes.ts`: ~2,640 lines, 43 imports, broad content/school/bootstrap responsibilities.
- `quiz.routes.ts`: ~2,350 lines, 66 imports; many application extracts already exist, continue them instead of rewriting.
- `payment.routes.ts`: ~1,930 lines; payment lifecycle/webhooks/admin/settings remain in one transport file.
- `auth.routes.ts`: large mixed transport for account/auth/admin-user/parent/access-code/trainer concerns; Batch 10 extracted account erasure/revocation into `modules/privacy/application/deleteUserLifecycle.ts`, but further decomposition remains domain-owned rather than line-count-driven.
- `ai.routes.ts`: ~1,685 lines; provider runtime/config/use-cases/analytics mixed.
- `publicTests.routes.ts`: ~765 lines; partial application extraction.
- `operations.routes.ts`: ~792 lines; broad diagnostic/read/repair ownership.
- `notification.routes.ts`: ~544 lines after current extraction; still authority/audience/report logic in transport.

Not every route needs splitting: health, search, SEO, review, certificates, activity, question analytics, quiz result facade, and product config are currently small enough unless behavior changes.

## 3. Frontend current map

Current runtime source remains primarily in:
`App.tsx`, `pages/`, `components/`, `dashboards/`, `services/`, `store/`, `utils/`.

Existing decomposition to preserve:
- `dashboards/admin/SchoolsManager/`: 74 files; good incremental feature-folder pattern.
- `pages/Reports/`: 23 extracted report/view-model files.
- `services/apiGroups/`: 13 API domain groups.
- `store/slices/`: 7 extracted Zustand slices.
- `components/classroom/`: 16 domain components.

### Frontend high-change-radius hotspots
- `pages/Reports.tsx` ~2,587 lines.
- `pages/QuizPage.tsx` ~2,412 lines / ~31 local states / ~10 effects.
- `dashboards/admin/PathsManager.tsx` ~2,366 lines / ~47 local states.
- `pages/Dashboard.tsx` ~2,323 lines.
- `PlatformIntegrationsManagerLegacy.tsx` ~2,317 lines.
- `SchoolsManager.tsx` ~2,197 lines / 62 imports; much logic is already extracted, so treat mainly as orchestrator cleanup.
- `Results.tsx` ~2,185 lines.
- `FinancialManager.tsx` ~2,135 lines.
- `AdminDashboard.tsx` ~2,093 lines.
- `QuestionBankManager.tsx` ~1,943 lines / ~27 states.
- `QuizzesManager.tsx` ~1,981 lines.
- `store/useStore.ts` ~1,772 lines / ~85 API calls.
- `App.tsx` ~1,706 lines and owns router + SEO + bootstrap + prefetch + compatibility navigation.
- `Header.tsx` ~1,437 lines / ~25 states.
- `Quiz.tsx` ~1,428 lines.
- `PublicBarcodeTestsManager.tsx` ~1,250 lines / ~43 states.
- `AiAssistantManager.tsx` ~1,236 lines.
- `CoursePlayer.tsx` ~1,076 lines / ~8 effects.

Line count is only a signal. Split when responsibilities, state ownership, authorization, network orchestration, or change radius are mixed.

## 4. Canonical ownership boundaries

| Concern | Canonical direction | Compatibility still present |
|---|---|---|
| School membership | `SchoolMembership` | `User.schoolId`, some Group/User readers |
| Teacher class/subject authority | `TeachingAssignment` | `User.groupIds`, `Group.supervisorIds` readers |
| School entitlement | `SchoolContract.modules` | legacy school/package context in some routes |
| Parent/student authority | `ParentStudentRelationship` on Batch 9 branch | `User.linkedStudentIds` fallback until backfill/cutover |
| Paid/content access | `AccessGrant` | `User.subscription.purchased*`, enrollment mirrors |
| Assessment historical production record | `QuizResult` until verified cutover | additive assessment Version/Assignment/Attempt/Response layer |
| Notification delivery | `NotificationDelivery` + Redis + BullMQ | some legacy audience resolution |
| Account erasure / privacy lifecycle | `modules/privacy/application/deleteUserLifecycle.ts` + `PRIVACY_DATA_LIFECYCLE_RETENTION_MATRIX.md` | exact retention durations for retained history remain policy-dependent |
| Media | external URL/CDN references | upload backup scripts/volume are operations compatibility only |

## 5. Runtime areas that should NOT be restructured for appearance

- `server/src/app/bootstrap/*`: explicit startup/shutdown composition is already healthy.
- notification SSE realtime bridge: event-driven Redis/local fan-out; Mongo is read once for initial unread count, not continuously polled.
- BullMQ weekly scheduler: distributed Sunday 08:00 Asia/Riyadh scheduler already exists.
- Smart Classroom route registrar pattern.
- Vite root + nested `server` package topology unless a measured deployment need justifies change.
- API/PWA rule that API responses are not service-worker cached.

## 6. Resource / bandwidth map

Current product media contract stores URLs for lesson/library/video/image resources. The Node API is not the normal binary-media CDN and no first-party binary upload runtime is currently exposed.

Target:
- Cloudflare-backed object/media delivery for heavy images/media.
- DB stores URL/key + metadata, not binary blobs.
- direct/presigned upload when first-party uploads are introduced and security permits.
- protected assets use an authorization/signed-delivery contract rather than proxying all bytes through Node.
- immutable/versioned frontend assets remain edge-cacheable.
- API/private responses remain authorization-aware and are not blindly CDN cached.
- Batch 13 measures origin egress, payload bytes, request counts, cache hit behavior, SSE/socket traffic and bootstrap duplication before optimization.

Cloudflare live configuration is not repository-verifiable and must be checked separately in runtime/deployment verification.

## 7. Agent navigation rules

Before changing a feature:
1. locate its domain in this map and `MODULE_CATALOG.md`;
2. inspect canonical authority and compatibility readers;
3. modify the owning module, not a convenient unrelated UI;
4. extract worthwhile boundaries while the batch is open;
5. add focused contracts;
6. run typecheck/build/domain tests/exact-head CI;
7. update maps if authority or ownership changed.

Do not use stale generated migration maps as automatic move instructions. `generated/CURRENT_REPOSITORY_AUDIT.md` and `generated/MIGRATION_MAP_V2_CANDIDATE.json` are historical snapshots from an older head and must be regenerated before using their counts/targets as current evidence.
