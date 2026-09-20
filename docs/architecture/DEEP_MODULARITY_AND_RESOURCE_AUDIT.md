# ALMEAA Deep Modularity, Authority & Resource Audit

Status: CANONICAL DEEP AUDIT — INTEGRATED WITH REMEDIATION PLAN  
Audit branch: `fix/parent-authority-b9`  
Directory map: `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md`

## 1. Audit objective

This audit exists to prevent a second wholesale refactor pass. From Batch 9 onward each domain is completed as:

`inspect → repair → modularize worthwhile boundaries → protect with tests → exact-head CI → close`.

Batch 14 is residual architecture cleanup only. Batch 15 is whole-system integration certification.

The audit distinguishes:
- current runtime truth;
- target architecture;
- legacy compatibility;
- structural debt;
- data-access/scale debt;
- bandwidth/origin-egress debt;
- live-environment items that Git cannot prove.

## 2. Executive finding

ALMEAA is already becoming a modular monolith; it does NOT need a rewrite.

Strongest modular areas:
- assessment/quizzes application/infrastructure extraction;
- schools application policy/workspaces;
- Smart Classroom registrar pattern;
- explicit server bootstrap/shutdown;
- Redis/BullMQ notification runtime foundation;
- frontend SchoolsManager/Reports/API-groups/slices incremental extraction.

Main remaining architecture debt:
- large legacy route facades: auth/content/payment/AI/notifications;
- frontend God components/store/app bootstrap;
- duplicated legacy authority readers in User/Group fields;
- incomplete parent canonical cutover;
- large-audience notification orchestration;
- content/bootstrap and operations reads that need scale measurement/bounds;
- no formal media storage adapter despite URL/CDN-compatible contract;
- privacy lifecycle and DR policies are incomplete.

## 3. Repository evidence baseline

Current branch tree: 1,466 files.

Runtime/engineering density:
- `server/src/models`: 55
- `server/src/modules/quizzes`: 53
- root backend routes + classroom registrars: 38
- `server/src/services`: 16
- `server/src/modules/schools`: 14
- `server/src/modules/content`: 13
- `dashboards/admin/SchoolsManager`: 74
- `pages/Reports`: 23
- `services/apiGroups`: 13
- `store/slices`: 7

Historical generated architecture reports are not current branch truth until regenerated. Never loosen architecture budgets to make CI pass.

## 4. Target module shape

Backend, where complexity justifies it:
`HTTP route → application use-case → domain policy/authority → infrastructure model/repository/provider`.

Frontend, where complexity justifies it:
`route/container → feature state/hooks → presentation/view model → domain API group`.

Avoid:
- microservices without operational need;
- bulk frontend relocation;
- repository wrappers around trivial queries;
- one-function files with no ownership benefit;
- line-count-only refactors;
- simultaneous structural + authority + schema changes when separable.

## 5. Authority migration map

### School
Canonical:
- `SchoolMembership` for school membership.
- `TeachingAssignment` for teacher class/subject authority.
- `SchoolContract.modules` for school feature entitlement.

Legacy compatibility still observed:
- `User.schoolId`
- `User.groupIds`
- `Group.studentIds`
- `Group.supervisorIds`

Rule: do not delete compatibility fields until every reader/writer is inventoried, backfilled and cut over.

### Parent
Batch 9 introduces `ParentStudentRelationship` as canonical direction.

CRITICAL findings still open on this branch:
1. `getAuthorizedStudentIdsForParent` queries only active canonical rows and falls back to `User.linkedStudentIds` when none are active. If revoked canonical rows exist, stale legacy data can re-authorize. Canonical existence must tombstone the fallback.
2. intervention notification recipient resolution has the same active-only fallback defect.
3. admin parent→non-parent role change can leave canonical/legacy parent authority if `linkedStudentIds` is omitted.
4. admin upsert of an existing parent account as non-parent can leave canonical rows.
5. `parent.routes.ts /weekly-report/trigger-all` still reads legacy links and performs per-parent result work.
6. content bootstrap still resolves parent context from `linkedStudentIds`.
7. AI parent targeting still references legacy parent linkage and must use the Batch 9 authority service after canonical semantics are fixed.

Closure requirement: revoked canonical rows must never fail open to stale legacy data.

### Commerce
Canonical direction: `AccessGrant`.
Compatibility: User purchased/enrolled arrays.
Keep Batch 8 webhook guard/idempotency protection. Do not reinterpret paid access from UI state.

### Assessment
`QuizResult` remains production authority where migration evidence is incomplete. Additive Version/Assignment/Attempt/Response models stay behind verified compatibility adapters. Never synthesize historical source data that was never stored.

## 6. Batch 9 — Parent / Notifications completion map

### Correctness
- fix parent tombstone semantics;
- fix intervention-recipient tombstone semantics;
- force relationship revoke on role exit/upsert;
- add safe dry-run-first legacy backfill;
- preserve self-link fail-closed behavior until verified consent exists.

### Notification authorization
Current intervention/student alerts still use legacy group/supervisor fields. Extract a centrally testable audience-authority application service and migrate:
- teachers toward active `TeachingAssignment`;
- supervisor/school roles toward canonical school context/membership;
- parents toward `ParentStudentRelationship`.

Same-school membership alone must not silently grant a teacher broad student reach.

### Scale
Current weekly batch already uses one batched QuizResult read, but still has:
- per-parent authority resolution;
- per-parent NotificationDelivery existence check.
Bulk-resolve relationships and campaign idempotency state.

`notificationService.ts` reads at most 501 recipients then silently slices to 500. Large audiences must never be silently truncated. Implement explicit batching/orchestration or fail closed until campaign batching is available.

### Structure
Move audience authority, campaign orchestration and weekly report use-cases out of route transport. Keep:
- Redis Pub/Sub realtime bridge;
- SSE transport;
- BullMQ worker;
- weekly distributed scheduler.
These foundations are already correctly separated.

## 7. Data-access / scale findings

### Content bootstrap
Good:
- scoped `learning/operations/full` request modes;
- core/full phases;
- safe shared-cache policy;
- in-flight request dedupe;
- public announcement cap.

Debt:
- admin operational bootstrap loads full Group/Package/AccessCode/Announcement sets;
- learning bootstrap can load all scoped topics/lessons/library items;
- some school-import/admin paths reload whole school group/user sets;
- operational data still derives some school/parent scope from legacy User/Group fields.

Action: preserve scope semantics, then benchmark payload/document counts. Paginate or split reads where growth proves necessary.

### Operations status
Admin operations status reads several whole catalog collections with projections. It is cached briefly, but remains an O(dataset) diagnostic read. Prefer aggregate counts/read models if benchmark shows pressure.

### Quiz submission/reporting
Many query paths are ID-bounded and acceptable. One visible submission context still loads all Subject and Section rows; replace with referenced IDs or an appropriate cached taxonomy context when optimizing. Do not disturb scoring for a cosmetic refactor.

### Frontend bootstrap
`App.tsx` progressively loads taxonomy/content core then extended data, with optional questions/skill progress and public navigation/ads. This may intentionally trade initial latency for extra requests. It is a BANDWIDTH MEASUREMENT HOTSPOT, not a proven leak.

Batch 13 must measure:
- request count per common journey;
- compressed response bytes;
- duplicate/repeated payload bytes;
- client cache hit/stale-refresh behavior;
- server bootstrap cache hit/shared/miss;
- origin egress.

## 8. Frontend modularity debt

### App shell
`App.tsx` owns router, SEO metadata, bootstrap profiles, prefetch, telemetry install, legacy redirects and History API interception.

Target incremental extraction:
- app/router;
- app/bootstrap;
- app/seo;
- app/prefetch.

Preserve route literals, lazy boundaries and bootstrap behavior with tests.

### State
`store/useStore.ts` remains ~1,772 lines and ~85 API calls despite seven extracted slices.

Direction:
- continue domain slices for local/client state;
- avoid using one global Zustand store as an ever-growing remote-data cache;
- place server query orchestration with domain API/hooks where practical;
- preserve compatibility selectors/actions while migrating consumers.

### Major feature hotspots
Prioritize by change radius, not size alone:
- Quiz runner (`QuizPage.tsx`);
- reports/results;
- question/quiz/path builders;
- FinancialManager;
- public barcode manager;
- AI assistant;
- Header/CoursePlayer when their owning domains change.

`SchoolsManager.tsx` is large but already delegates to a 74-file feature folder, so treat it as orchestrator cleanup rather than restarting its decomposition.

## 9. Media / bandwidth / origin-egress audit

Repository-verified current behavior:
- learning media is stored as URL references;
- no normal first-party binary upload runtime is exposed;
- Node app does not act as the ordinary media CDN;
- upload backup/restore scripts and Docker upload volume are compatibility/operations artifacts;
- frontend build assets use immutable cache headers;
- PWA intentionally excludes API responses from service-worker caching;
- compression is enabled on API responses.

Target contract:
1. heavy image/video/file bytes use the configured Cloudflare-backed storage/delivery layer;
2. application data stores stable URL/key + metadata;
3. use direct/presigned upload when first-party uploads are introduced and security permits;
4. use signed/protected delivery where private media requires authorization;
5. do not proxy large public media through Node without a proven requirement;
6. do not put base64/binary media into ordinary API JSON payloads;
7. immutable versioned public assets remain edge-cacheable;
8. API/private responses remain authorization aware;
9. measure cache-hit ratio and origin egress before claiming bandwidth improvement.

Current gap: there is no repository-level Cloudflare/R2 storage adapter/config contract. Cloudflare use is therefore deployment/content practice, not yet a formal application boundary. Introduce a provider-neutral media/storage adapter only when upload/manage features need application ownership.

LIVE VERIFICATION REQUIRED: actual Cloudflare cache rules, storage bucket, DNS/proxy mode, egress/cache analytics.

## 10. Notifications / realtime resource behavior

Current SSE implementation is event-driven:
- Mongo unread count once when the stream connects;
- Redis Pub/Sub or local process fan-out for events;
- 30s comment keepalive;
- frontend EventSource reconnect logic.

The old claim that every SSE client continuously polls Mongo is stale and must not be repeated.

Scale items that remain:
- campaign audience batching;
- queue/provider throughput;
- connection counts/resource limits;
- multi-instance Redis behavior under load.
Those belong to measured Batch 13 certification after Batch 9 correctness closes.

## 11. Privacy / data lifecycle audit

Batch 10 now has an explicit application boundary and policy baseline:
- `docs/architecture/PRIVACY_DATA_LIFECYCLE_RETENTION_MATRIX.md` classifies delete/anonymize/retain/revoke behavior before destructive automation;
- `server/src/modules/privacy/application/deleteUserLifecycle.ts` owns admin account erasure rather than leaving cross-domain deletion inside `auth.routes.ts`;
- live canonical authority is retired on erasure: active parent relationships are revoked, `SchoolMembership` and `TeachingAssignment` are deactivated, and active `AccessGrant` rows are revoked;
- legacy User/Group relationship mirrors are unlinked in the same lifecycle;
- direct operational PII is minimized in `AiInteraction`, `ClientEvent`, and `NotificationDelivery`;
- academic, payment, certificate, classroom and audit history is deliberately not blanket-cascaded.

Repository inspection for Batch 10 confirmed distinct lifecycle classes:
- identity/authentication data can be removed after authority is retired;
- operational diagnostics/free-text require minimization and explicit bounded retention;
- academic/classroom/certificate history needs integrity-preserving de-identification rules rather than casual deletion;
- payment/grant and admin/security audit evidence may require retention for reconciliation, fraud, legal or governance reasons.

Exact retention durations remain an owner/legal/business policy decision. No TTL or destructive expiry period is invented by the code. Future retention automation must use scheduled/batched anonymization where deletion would break historical integrity and may only add TTL where expiry semantics are explicit.

Batch 10 runtime evidence on PR #180 at `94c3bfb3afbfa5f14781e81f4c9758601633861a`:
- Recovery Gate PASS;
- Production Readiness Gate PASS;
- Safety Gate PASS;
- Backend Integration Gate PASS;
- Phase + Handover Gate PASS;
- Deep Pre-Merge E2E PASS across all 12 isolated suites;
- Vercel preview PASS.

## 12. Backup / DR audit

Two different products remain intentionally distinct:

### Learning snapshot
Application JSON snapshot of selected learning/config collections with dry-run restore, safety snapshot and optional replace. Useful operational feature, not full DR.

### Full database recovery boundary — Batch 11
Batch 11 adds:
- `scripts/verify-db-backup.sh`: compressed `mongodump` archive, portable SHA-256 evidence, optional independent off-site copy verification, configurable retention;
- `scripts/restore-db-verified.sh`: checksum verification plus explicit isolated-target confirmation, non-destructive by default;
- `docs/architecture/DISASTER_RECOVERY_RUNBOOK.md`: recovery contract, failure rules, RPO/RTO evidence requirements;
- `scripts/smoke-disaster-recovery-contract.mjs`: required Production Readiness contract.

### External media recovery boundary — Batch 11
Read-only live inspection on 2026-09-20 confirmed:
- current Atlas cluster `almeaa`: FREE, AWS `AP_SOUTHEAST_1`, MongoDB 8.0.32;
- database `almeaa`: 58 collections;
- 1,768 question documents currently reference Cloudflare R2 public delivery URLs via `imageUrl` on `*.r2.dev/questions/pilot/...`.

Therefore MongoDB backup protects the references, not the R2 object bytes. Batch 11 also adds:
- `scripts/verify-r2-media-backup.sh`: S3-compatible R2 inventory + verified archive + optional off-site copy;
- `scripts/restore-r2-media-verified.sh`: additive restore to an explicitly confirmed non-production recovery bucket.

Current production evidence still missing:
- scheduled database and media backup execution with alerting;
- independently verified off-site failure domain;
- encryption/access-control review for the actual backup destination;
- measured database restore drill and R2 media recovery drill;
- achieved RPO/RTO based on live schedule and measured drill duration;
- proof that stable public media URL/key mappings can be restored or deliberately migrated.

Do not treat R2 durability or CDN cache as backup evidence. Batch 11 closes only after recoverability is demonstrated, not merely because tooling exists.

## 13. Runtime / deployment / observability audit

Healthy foundations:
- explicit server bootstrap and graceful shutdown;
- liveness/readiness/scale-readiness;
- Mongo + Redis dependency health;
- Redis rate-limit/queue foundations;
- Sentry integration;
- bounded client telemetry payload and 30s in-browser dedupe;
- Nginx/Vercel static cache policy.

Unverified/live-dependent:
- actual deployment path currently serving production;
- exact deployed SHA;
- TLS/Nginx/firewall/SSH state;
- log rotation/alerts;
- Atlas production indexes;
- Redis production capacity;
- Cloudflare behavior.

Batch 12 must inspect live state before choosing/canonicalizing deployment; do not infer it from templates.

## 14. AI architecture audit

`ai.routes.ts` combines:
- schemas;
- runtime provider configuration;
- provider ordering/fallback;
- provider calls;
- personalized context;
- feature use-cases;
- diagnostics/interaction logging.

Only student-target authorization is currently extracted to `modules/ai/application`.

Before adding the planned richer AI/voice capabilities, split provider infrastructure/config from application use-cases and authorization. This prevents new AI work from expanding a route mega-file. AIInteraction retention/privacy belongs to Batch 10.

## 15. Architecture patterns to preserve

Do not churn these without evidence:
- server bootstrap/shutdown;
- Classroom registrar split;
- assessment application extraction;
- SchoolsManager feature-folder extraction;
- Reports view-model extraction;
- API groups;
- Zustand slice migration path;
- event-driven notification realtime;
- queue-backed scheduled weekly reports;
- no API PWA cache;
- security middleware ordering.

## 16. Remaining-batch ownership

| Batch | Must close |
|---|---|
| 9 | Parent canonical authority, notification audience authority, weekly/campaign scale, notification module decomposition |
| 10 | retention matrix + user-linked lifecycle/anonymization/deletion |
| 11 | full backup/restore evidence + off-site/rotation/RPO/RTO |
| 12 | live deployment canonicalization, release identity, observability/runtime |
| 13 | measured DB/API/queue/realtime/bandwidth performance |
| 14 | residual frontend/app/store/domain decomposition and stale compatibility cleanup after evidence |
| 15 | whole-system final certification |

Cross-domain debt discovered during a batch is recorded here and assigned to its owner batch; do not opportunistically mix unrelated schema migrations.

## 17. Closure rule

A remaining batch is DONE only after:
- exact domain head inspected;
- correctness/security issues fixed;
- worthwhile structural extraction completed;
- legacy readers/writers inventoried;
- migration/cutover condition explicit;
- focused negative/regression tests added;
- typecheck/build/domain smokes pass;
- exact-head required CI green;
- canonical architecture docs updated.

## 18. Final architecture outcome

The intended final state is not “many small files”. It is:
- one clear owner for each behavior;
- one canonical authority for each security/business decision;
- compatibility fields isolated behind adapters;
- bounded/measured data access;
- media bytes kept off the application origin where appropriate;
- frontend/server change radius small enough that new features can be added without touching unrelated domains;
- automated tests proving the boundaries.

No second wholesale modularization pass is planned after the batch sequence.
