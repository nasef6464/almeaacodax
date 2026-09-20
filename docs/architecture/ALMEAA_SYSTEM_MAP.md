# ALMEAA — Canonical System Map & Audit Reference

> **START HERE BEFORE MODIFYING THE PLATFORM.**
>
> This document is the durable architecture and change-impact reference for ALMEAA. It describes the verified repository state at the audit baseline `main @ 4ccf25c0b28d49351f9c045ed50efd8adc83c703` (2026-09-15). It is intentionally broader than a conventional architecture diagram: it records domains, sources of truth, legacy compatibility, authorization boundaries, dependencies, runtime infrastructure, known audit findings, and what must not be changed casually.
>
> **Important:** this map describes the audited baseline. If later commits materially change architecture, update this document in the same change.

---

## 1. Product North Star

ALMEAA is an educational platform / School OS. The product loop is:

`ASSESS → DETECT → INTERVENE → MEASURE IMPROVEMENT`

Smart Classroom is a formative measurement and classroom interaction capability inside that loop. It is **not** a video/live-streaming product.

Primary role families currently include:
- Platform admin
- School admin / director
- School supervisor
- Teacher / trainer
- Student
- Parent

The platform contains school management, learning content, question bank, quizzes/assessments, Smart Classroom, reporting/interventions, commerce/access, notifications, AI, public barcode tests, certificates, discussions/review, and operational tooling.

---

## 2. Top-Level Runtime Architecture

```text
                         ALMEAA
                           │
                 ┌─────────┴─────────┐
                 │                   │
             React/Vite          Node/Express
                 │                   │
        ┌────────┼────────┐          │
        │        │        │          │
      Pages   Dashboards  Store      │
        │        │        │          │
        └────────┴── API/Adapter ────┤
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
             REST API            Socket.IO             BullMQ
                │                    │                    │
                │                  Redis ─────────────── Redis
                │
          Application/Services
                │
 ┌──────────────┼────────────────────────────────────────────┐
 │              │              │             │              │
Schools      Learning       Assessment     Commerce     Operations
 │              │              │             │              │
 │              │              │         PaymentRequest     │
 │              │              │              ↓             │
 │              │              │         AccessGrant        │
 │              │              │                            │
 └──────────────┴──────────────┴──────────────┬─────────────┘
                                              │
                                         MongoDB Atlas
```

Cross-cutting runtime dependencies:
- MongoDB / Mongoose: durable application data.
- Redis: Socket.IO multi-instance adapter, rate limiting, BullMQ, notification realtime bridge.
- BullMQ: asynchronous notification/report work.
- Socket.IO: Smart Classroom realtime lifecycle and response events.
- Sentry + application/client event logging: observability foundation.
- Vite/PWA: frontend build and offline shell behavior; API responses are not service-worker cached.

---

## 3. Canonical Domain Catalog

| Domain | Primary code/data | Architectural status |
|---|---|---|
| Authentication | `User`, JWT, auth cookie, CSRF | Active; session revocation hardening required |
| Platform RBAC | `User.role` | Canonical platform-level role |
| School identity | `SchoolMembership` | Canonical direction |
| School/class hierarchy | `Group` with SCHOOL/CLASS types | Active; contains legacy relationship fields |
| Teacher authority | `TeachingAssignment` | Canonical direction |
| School commercial entitlement | `SchoolContract.modules` | Canonical |
| Smart Classroom | `ClassroomSession`, `ClassroomParticipant`, `ClassroomResponse` | Strong active subsystem |
| Legacy/formal quiz result | `Quiz`, `QuizResult` | Production authority until assessment migration completes |
| New assessment model | `AssessmentVersion`, `AssessmentAssignment`, `AssessmentAttempt`, `AssessmentResponse` | Migration/evolution layer |
| Skill analytics | `SkillProgress`, `QuizResult`, reports | Active |
| Payments | `PaymentRequest` | Active |
| User/content entitlement | `AccessGrant` | Canonical direction |
| Legacy entitlement mirror | `User.subscription`, purchased/enrolled arrays | Compatibility; do not expand |
| Parent relation | `ParentStudentRelationship` | Canonical direction introduced in Batch 9; `User.linkedStudentIds` remains compatibility fallback until backfill/cutover proof |
| Notifications | `NotificationDelivery`, Redis realtime, BullMQ | Active and scalable foundation |
| AI | AI routes/runtime provider configuration, `AiInteraction` | Active; authorization/privacy hardening required |
| Public barcode tests | Public test/submission models/routes | Active; targeting/concurrency hardening required |
| Certificates | `Certificate` + course entitlement | Active |
| Discussions/review | Discussion routes, review cards | Active |
| Audit | `AdminAuditLog` | Active; retention/governance required |
| Privacy / data lifecycle | `modules/privacy/application/deleteUserLifecycle.ts` + `PRIVACY_DATA_LIFECYCLE_RETENTION_MATRIX.md` | Batch 10 boundary active; exact retention periods for retained history remain policy-dependent |
| Backup/restore | learning snapshot + verified Mongo archive/checksum/off-site tooling + Cloudflare R2 media archive/restore tooling | Batch 11 recovery boundary active; live schedule/off-site/restore-drill evidence still required |
| Deployment | Vercel frontend; VPS/PM2/Nginx and Docker artifacts exist | Deployment paths need canonicalization |

---

## 4. Source-of-Truth Matrix

Any agent changing authorization or relationships must consult this table first.

| Concern | Canonical/current authority | Compatibility / migration note |
|---|---|---|
| User identity | `User` | — |
| Platform role | `User.role` | — |
| Active account | fresh `User.isActive` via active/role middleware | Plain `requireAuth` alone does not always refresh DB state |
| School membership | `SchoolMembership` | `User.schoolId` is legacy compatibility |
| Teacher→class/subject authority | `TeachingAssignment` | `User.groupIds` / `Group.supervisorIds` are legacy readers in parts of platform |
| School feature/module access | `SchoolContract.modules` + school entitlement policy | Keep centralized policy |
| Smart Classroom session state | `ClassroomSession` | Session snapshots intentionally preserve historical question/correct-answer state |
| Smart Classroom participation | `ClassroomParticipant` | Unique session/student invariant |
| Smart Classroom answer | `ClassroomResponse` | Unique session/question/student invariant |
| Formal quiz result today | `QuizResult` | Do not remove before verified assessment migration |
| New assessment lifecycle | Version → Assignment → Attempt → Response | Coexists with legacy production records |
| User paid/content access | `AccessGrant` | User purchased/enrolled arrays remain compatibility mirrors/readers |
| Payment state | `PaymentRequest` | Gateway event uniqueness needs DB hardening |
| Parent-child relation | `ParentStudentRelationship` canonical direction | `User.linkedStudentIds` compatibility only; canonical rows, including revoked rows, must tombstone legacy fallback |
| Notification delivery | `NotificationDelivery` | Campaign batching required for very large audiences |
| Audit history | `AdminAuditLog` | Retention/access policy required |
| Account erasure | privacy lifecycle application service | revoke live school/teacher/parent/access authority first; minimize operational PII; do not blanket-delete required academic/payment/audit evidence |

### Legacy compatibility fields — migrate, do not expand

Treat the following as compatibility debt unless a current migration plan explicitly says otherwise:

- `User.schoolId`
- `User.groupIds`
- `User.linkedStudentIds`
- `User.subscription.purchased*`
- `User.enrolledCourses`
- `Group.supervisorIds`
- `Group.studentIds`

Do **not** delete them in an isolated cleanup. First migrate every reader/writer, backfill data, add verification/observability, then remove compatibility behavior deliberately.

---

## 5. School OS Map

```text
School (Group type=SCHOOL)
 │
 ├── SchoolContract
 │      └── enabled modules/capabilities
 │
 ├── SchoolMembership
 │      ├── student
 │      ├── teacher
 │      ├── supervisor
 │      ├── school_admin
 │      └── parent
 │
 └── Classes (Group type=CLASS)
        │
        └── TeachingAssignment
              teacher + class + subject
```

Important implementation rules:
1. `SchoolMembership` is additive and intentionally supersedes legacy `User.schoolId` as the durable school-context direction.
2. `TeachingAssignment` is explicit teaching authority and must not be replaced by inferred `groupIds` behavior.
3. `schoolAdminIntegrity.routes.ts` validates school/class/user relationships before mutations. UI redesigns must call the integrity-safe APIs rather than bypassing them.
4. School module entitlement is based on an active/in-window `SchoolContract` and requested module.
5. Smart Classroom additionally requires valid school context and appropriate membership/assignment/module access.

### SchoolContract module vocabulary

Current module set includes:
- `SCHOOL_CORE`
- `QUESTION_BANK`
- `SCHOOL_ASSESSMENTS`
- `PATHS_AND_COURSES`
- `INTERACTIVE_VIDEO`
- `SMART_CLASSROOM`
- `SCHOOL_INTELLIGENCE`
- `INTERVENTION_CENTER`
- `LIVE_TUTORING`
- `WHITE_LABEL`
- `EXECUTIVE_ANALYTICS`

---

## 6. Smart Classroom Map

### Product behavior

Teacher flow:

```text
Open assigned class session
  ↓
Session may start empty
  ↓
Send question batch
  ↓
Students answer on tablets
  ↓
Teacher sees live submission/response state
  ↓
Discuss
  ↓
Optional explicit distribution display
  ↓
Optional explicit solution + explanation reveal
  ↓
End batch
  ↓
Send next batch(es)
  ↓
End session
```

Projector safety intent:
- Safe by default.
- No student answers, option percentages, correct answer, or leaderboard until explicit teacher action.
- Current audited default `submissions` mode still exposes submitted student names/timing state; this is a P1 privacy/product-alignment item if strict aggregate-only behavior is required.

### API/module shape

Classroom root is protected by authenticated/active school context. Routes are separated into teacher, batch, template, student, supervisor, aggregate, competition, and insight concerns.

### Realtime map

```text
Student socket → classroom-students:<sessionId>
Staff socket   → classroom-staff:<sessionId>

response updates → staff room only
lifecycle events → appropriately scoped rooms

multi-instance Socket.IO → Redis adapter
```

### Data invariants

```text
ClassroomParticipant:
  unique(sessionId, studentId)

ClassroomResponse:
  unique(sessionId, questionId, studentId)

ClassroomSession:
  partial unique live-session invariant for school/class
```

Student question projection must not expose `correctOptionIndex` or explanation before authorized reveal.

### Performance evidence boundary

Repository evidence includes local/concurrent validation around 30 students, 100 students in one classroom, and four groups ×30 (~120). This is **not** evidence for 10k concurrent production users. Production-scale claims require production-equivalent staging/load evidence.

---

## 7. Assessment & Quiz Map

```text
CURRENT PRODUCTION RECORD
Quiz
  ↓
QuizResult

EVOLVING ASSESSMENT MODEL
AssessmentVersion
  ↓
AssessmentAssignment
  ↓
AssessmentAttempt
  ↓
AssessmentResponse
```

The repository explicitly keeps legacy `QuizResult` as the production submission record during migration. Do not remove it or its compatibility readers until verified dual-write/backfill/cutover work exists.

Known concurrency hardening item:
- Live exam start currently follows count/derive-attempt/create behavior. DB uniqueness protects final integrity, but concurrent requests can produce duplicate-key failure instead of returning the canonical attempt. Make creation atomic/idempotent during remediation.

Result leakage protection to preserve:
- learner result serializers remove `correctOptionIndex` and `explanation` where required.
- learner result ownership is enforced on relevant result endpoints.

---

## 8. Commerce & Entitlement Map

```text
PaymentRequest
   │
   ├── provider/event/transaction/payment state
   ↓ approved
AccessGrant
   │
   ├── package/course/content/path/subject scopes
   ├── active/revoked/expired lifecycle
   └── idempotency/source uniqueness
   ↓ compatibility mirror
User.subscription / purchasedCourses / enrolledCourses
```

Architectural direction:
- `AccessGrant` should become the single authorization authority for paid/scoped user access.
- Legacy User arrays are compatibility mirrors/readers until all consumers migrate.

Audit hardening items:
- Payment approval → AccessGrant → User mirror are separate writes; recovery/idempotency exists but transaction/reconciliation behavior must be formalized.
- Gateway event/transaction IDs are indexed but not DB-unique; concurrent webhook races should be hardened with suitable partial unique indexes where semantics allow.
- Expiry/revocation must never depend on stale User mirrors as final authority.

---

## 9. Parent & Notification Map

### Parent

Batch 9 introduces `ParentStudentRelationship` as the canonical parent↔student direction while `User.linkedStudentIds` remains a temporary compatibility mirror/fallback. Migration is not complete: every parent reader/writer must route through the canonical authority service, and the existence of canonical rows (including revoked rows) must prevent fail-open fallback to stale legacy links.

Weekly parent reporting uses BullMQ/Redis scheduling infrastructure, which is a good foundation. The result read has already been batched, but parent-authority resolution and delivery-idempotency checks still need bulk handling for large populations.

### Notifications

```text
Notification request
  ↓
NotificationDelivery
  ├── in-app → realtime publish
  └── external → BullMQ
                  ↓
             provider worker
```

Realtime notifications use Redis Pub/Sub bridge when Redis is available, with local process fan-out fallback. The current SSE implementation does not continuously poll MongoDB every 10 seconds; previous concern about persistent Mongo polling was rejected by code inspection.

Large campaigns require batching/orchestration beyond the per-request recipient cap.

Some teacher/supervisor alert authorization still uses legacy `groupIds`, `Group.supervisorIds`, and `linkedStudentIds`; migrate these readers to canonical school membership/assignment authority.

---

## 10. Authentication & Security Map

### Existing controls to preserve

- JWT verification.
- HttpOnly auth cookie.
- Secure production cookie behavior.
- CSRF guard for unsafe methods.
- Active-user DB refresh in `requireActiveAuth` / role enforcement.
- Disabled-user rejection.
- login lockout/rate limiting.
- Google OAuth state and verified-email checks.
- Mongo sanitization / Helmet / CORS security layers.

### Confirmed P1 session lifecycle gap

There is no durable token/session version/revocation field in `User`. Logout clears the browser cookie, and password reset changes the password but does not invalidate already issued JWTs. A stolen still-valid token can therefore survive until JWT expiry while the account remains active.

Target remediation direction:
- token/session version or explicit session store;
- invalidate on password reset / logout-all / security-sensitive events;
- preserve fresh active-user checks.

### Startup admin governance

Production configuration must reject default/weak bootstrap admin credentials. `ensureAdminAccount` can create/promote/reactivate the configured admin during startup maintenance. Treat this as production governance requiring explicit safe configuration and lifecycle control.

### Rate limiting

Redis-backed rate limiting exists. Current `passOnStoreError: true` means Redis store failure fails open. Availability-vs-security behavior should be differentiated for global traffic versus authentication/sensitive endpoints.

---

## 11. AI Map

AI supports multiple provider families and runtime provider configuration. Request timeout/abort handling exists and should be preserved.

Audit items:
1. `generate-mock-exam` target-student authorization must follow role scope, not merely block a student from selecting another student.
2. Provider `baseUrl` configuration needs explicit outbound URL/host policy to prevent unsafe internal destinations.
3. AI interaction logs contain user identifiers/email plus request/response previews and metadata without an explicit TTL/retention policy in the audited schema.
4. Image/data input including SVG needs explicit size/content policy.

Required authorization model for target-student AI operations:

```text
student      → self
parent       → linked/authorized child
teacher      → assigned class/student
supervisor   → authorized school/class scope
school_admin → authorized school scope
admin        → platform-wide
```

---

## 12. Public Barcode Tests

The subsystem supports open/targeted audiences, group/user targets, question-center validation, attempts, scoring, reports, PIN/slug access, and live-control behavior.

Audit findings:
- `targeted` tests are discoverable/submit-able through public slug routes without target authorization. If `targeted` is intended as access control, this is P1. If it only means dashboard targeting, rename/document the semantics explicitly.
- attempt/max-submission enforcement follows count-then-create behavior and needs atomic/idempotent concurrency protection.
- some staff target-scope logic still depends on legacy group/school fields.

---

## 13. Search, Leaderboard, Discussions, Certificates, Review

### Search
- Public search does not expose correct-answer fields in the audited result shape.
- Unanchored regex across growing content/question collections is a likely future scale hotspot; measure before migrating to Atlas Search/text-search architecture.
- Product decision required on whether approved question text is intentionally public/discoverable or a premium asset.

### Leaderboard
- Current aggregation + Node sorting is acceptable for small/medium populations, not a proven 50k/100k leaderboard design.
- Scope logic still includes legacy school/group authority.

### Discussions
- Paid-course discussion access checks course entitlement rather than trusting knowledge of a course ID.
- Staff scope still has legacy managed/school fields in parts of the subsystem.

### Certificates
- Certificate issuance checks course entitlement and completion and has a user/course uniqueness invariant.
- Parent notification linkage still inherits legacy parent-child relationship debt.

### Review
- Due-review question delivery avoids exposing correct answers before the appropriate review action and is user-scoped.

---

## 14. Privacy & Data Lifecycle Map

Collections containing potentially sensitive/user-linked data include at minimum:
- `User`
- `QuizResult` / assessment records
- `ClassroomParticipant` / `ClassroomResponse`
- `AdminAuditLog`
- `AiInteraction`
- `ClientEvent`
- `NotificationDelivery`
- `PaymentRequest` / `AccessGrant`
- parent/student relationship fields
- certificates and learning progress

The audited code does not establish a complete platform-wide retention/anonymization/export/deletion policy.

Admin user deletion currently cannot be treated as complete privacy erasure; deleting `User` does not automatically define correct lifecycle behavior for memberships, assignments, results, payments, grants, audit logs, AI logs, notifications, classroom history, certificates, etc.

Required future **Data Retention Matrix**:

| Field | Required definition |
|---|---|
| Collection | Data store/model |
| Purpose | Why data exists |
| PII | What user-identifying data is stored |
| Retention | Duration/business/legal reason |
| Delete | Whether hard deletion is allowed |
| Anonymize | Whether historical record should be anonymized |
| TTL/archive | Automated lifecycle mechanism |
| Access | Roles/services allowed to read |
| Export | Whether/how user/admin export works |

Do not implement blanket cascade deletion. Financial/audit/academic records may require retention/anonymization rather than deletion.

---

## 15. Backup & Disaster Recovery

Two different mechanisms exist:

### Application learning snapshot
Covers substantial learning/configuration data, but not the entire operational platform. Restore is collection-oriented and is not a full transactional disaster-recovery mechanism.

### Full Mongo shell backup
Repository scripts use `mongodump` / `mongorestore`.

What repository inspection does **not** prove:
- off-site storage;
- encryption-at-rest of exported backups;
- retention rotation;
- scheduled execution;
- checksum verification;
- successful restore drill;
- RPO/RTO targets.

These are **LIVE VERIFICATION REQUIRED**, not uninspected code.

---

## 16. Health, Deployment & Runtime

### Health model
The platform exposes liveness/readiness/scale-readiness concepts. Production orchestration should use them deliberately:

```text
liveness        → process alive
readiness       → DB + mandatory runtime dependencies
scale-readiness → DB + Redis + scale-critical dependencies
```

Do not use an always-200/general health endpoint as the only container readiness decision.

### Deployment artifacts
The repository contains both Docker Compose and Hostinger/VPS PM2+Nginx deployment paths. This creates potential configuration drift. Choose one canonical production deployment path and treat the other as explicitly secondary/development/recovery documentation.

Current PM2 configuration is a single forked instance, suitable for a controlled pilot but not high availability.

Deployment hardening required before production certification:
- typecheck/build/critical-test gates before release;
- production index migration gate;
- atomic release/switch;
- exact deployed SHA record;
- post-deploy readiness/smoke checks;
- automatic/manual rollback procedure;
- monitoring and alerts;
- backup verification.

VPS host hardening target:
- dedicated deploy user;
- hardened SSH/root/password policy;
- firewall;
- fail2ban;
- automatic security updates;
- log rotation;
- monitoring/resource alerts;
- TLS/HSTS once HTTPS is stable.

---

## 17. Frontend Architecture

Positive audited properties:
- route-level `React.lazy` is already used extensively;
- `Suspense`/error-boundary behavior exists;
- PWA excludes large images from precache and does not use the service worker as an API response cache;
- frontend uses a real API adapter in production rather than treating mock data as production authority.

Maintainability debt:
- `App.tsx` owns a large amount of routing/bootstrap/data/SEO policy;
- several admin/dashboard components are large;
- decomposition should be incremental after P0/P1 functional/security work, not a rewrite.

Frontend redesign rule:
> UI cleanup must preserve existing backend relationships, integrity APIs, permissions, entitlements, and workflows. Do not simplify the UI by bypassing domain authority.

---

## 18. CI/CD & Governance

Strong baseline:
- broad Recovery Gate coverage exists.
- repository has substantial unit/integration/security/product/load test inventory.

Audit governance gaps:
- advanced Deep E2E and Backend Integration workflows have branch-specific conditions and do not automatically provide full coverage to every ordinary feature PR.
- audited `main` did not have required branch protection/status checks.
- a frontend TypeScript failure was observed in CI around `QuizzesManager.tsx:225` in the audited change history; treat this as the first P0 baseline repair unless a newer exact-head run proves it already fixed.

Production governance target:

```text
PR
 ↓
required typecheck/build/security/integration gates
 ↓
review
 ↓
protected main
 ↓
release artifact/exact SHA
 ↓
staging/production deployment
 ↓
readiness + smoke
 ↓
rollback if unhealthy
```

---

## 19. Cross-Domain Dependency Map

```text
User
 ├── Auth
 ├── SchoolMembership
 ├── TeachingAssignment
 ├── QuizResult
 ├── SkillProgress
 ├── AccessGrant
 ├── PaymentRequest
 ├── NotificationDelivery
 ├── ClassroomParticipant
 ├── ClassroomResponse
 ├── AssessmentAttempt
 ├── Certificate
 ├── AIInteraction
 └── Parent relationships

School
 ├── Classes
 ├── Memberships
 ├── Contract
 ├── TeachingAssignments
 ├── Smart Classroom
 ├── Assessments
 ├── Reports
 └── Interventions

Quiz / Question
 ├── QuizResult
 ├── AssessmentVersion/Attempt
 ├── SkillProgress
 ├── Review
 ├── Reports
 ├── Smart Classroom snapshots
 ├── Interactive video question use
 └── Public barcode tests

PaymentRequest
 └── AccessGrant
      ├── Courses
      ├── Discussions
      ├── Certificates
      └── legacy User subscription mirror

Redis
 ├── Socket.IO adapter
 ├── Rate limiting
 ├── BullMQ
 └── Notification realtime bridge
```

---

## 20. Change-Impact Rules for Agents

Before modifying any of these areas, inspect all listed dependents.

### Changing `User`
Inspect:
- authentication/session behavior;
- SchoolMembership;
- TeachingAssignment;
- parent linkage;
- Groups/legacy scope;
- AccessGrant and subscription mirrors;
- notifications;
- results/assessment ownership;
- AI/audit privacy implications.

### Changing `Group` / class/school hierarchy
Inspect:
- SchoolMembership;
- TeachingAssignment;
- school admin integrity;
- Smart Classroom;
- supervisors;
- public barcode tests;
- reports;
- legacy `groupIds` readers.

### Changing `Quiz` / `Question`
Inspect:
- QuizResult;
- AssessmentVersion/Attempt;
- Smart Classroom question snapshots/projection;
- interactive video;
- public tests;
- review;
- skill analytics;
- learner answer leakage.

### Changing `AccessGrant`
Inspect:
- payments;
- courses;
- discussions;
- certificates;
- expiry/revocation;
- User subscription/enrollment mirrors;
- entitlement tests.

### Changing `SchoolContract`
Inspect:
- school dashboards;
- Smart Classroom;
- assessments;
- reports/intelligence;
- interventions;
- module capability UI.

### Changing Redis configuration
Inspect:
- Socket.IO multi-instance behavior;
- rate limiting;
- BullMQ workers/schedulers;
- notification realtime;
- readiness/scale-readiness.

---

## 21. Audit Finding Register — Current Baseline

Severity meaning:
- **P0**: baseline/build blocker.
- **P1**: production/security/data-integrity/reliability issue to resolve before broad rollout.
- **P2**: important maintainability/scale/operational improvement.
- **LIVE**: code inspected, but real infrastructure state must be verified externally.

### P0
1. Frontend TypeScript failure observed in CI at `QuizzesManager.tsx:225` on the audited hardening change history. Re-run exact current head before repair; if still present, fix first.

### P1
1. Protect `main` and require appropriate CI status checks.
2. Make advanced integration/E2E coverage apply to normal release-critical PRs rather than only special branch names.
3. Add JWT/session revocation lifecycle for password reset/logout-all/security events.
4. Reject unsafe/default production bootstrap admin credentials and govern `ensureAdminAccount` behavior.
5. Review fail-open Redis rate limiting specifically for auth/sensitive endpoints.
6. Consolidate school/teacher/supervisor/parent authorization onto canonical membership/assignment relationships.
7. Fix AI target-student authorization for role scope.
8. Add outbound provider URL/host policy for configurable AI base URLs.
9. Establish AI/audit/client-event/notification retention and privacy lifecycle.
10. Decide and enforce strict Smart Classroom projector default privacy.
11. Make Smart Classroom production index migration a release gate and verify indexes live.
12. Harden live-exam attempt creation against concurrent duplicate requests.
13. Define targeted public barcode semantics; enforce authorization if targeting is access control.
14. Make public-test attempt/max-submission enforcement concurrency-safe.
15. Harden payment gateway event/transaction uniqueness against concurrent webhooks.
16. Make AccessGrant the final entitlement authority and formalize mirror/revoke/expiry reconciliation.
17. Migrate parent-child authority away from `linkedStudentIds` and optimize parent report N+1 behavior.
18. Define user deletion/anonymization/data-retention behavior across dependent collections.
19. Establish off-site/scheduled/verified DR and restore drills.
20. Make deployment atomic/gated/readiness-checked/rollback-capable.
21. Use correct readiness endpoints for production orchestration.
22. Obtain production-equivalent load evidence before making high-concurrency claims.

### P2
1. Decompose large frontend/admin components incrementally.
2. Optimize search architecture when real dataset/latency measurements justify it.
3. Materialize/optimize leaderboard when population requires it.
4. Add campaign orchestration for notification audiences larger than per-request caps.
5. Improve audit/observability retention and production APM strategy.
6. Harden VPS operational configuration and log lifecycle.
7. Remove architecture/documentation drift and stale hosting descriptions.
8. Reduce route/service monolith size where it improves ownership without changing behavior.

### Infrastructure / external verification
- Production Mongo indexes actually installed.
- Mongo Atlas health/latency/pool behavior.
- Redis production health and failure behavior.
- VPS CPU/RAM/disk/network behavior.
- Nginx/Cloudflare/TLS real configuration.
- backup destination, encryption, retention and successful restore;
- Cloudflare R2 bucket recovery/off-site evidence for media bytes referenced by MongoDB.
- exact production environment variables/secrets policy.
- production/staging load tests.
- monitoring/alert delivery.

---

## 22. Findings Rejected or Corrected During Audit

Do not re-open these as assumptions without new evidence:

- **Rejected:** “Frontend has no lazy loading.” It does use route-level lazy loading extensively.
- **Rejected:** “Notification SSE polls Mongo continuously every 10 seconds.” Current implementation uses realtime bridge; Mongo is not continuously polled in that way.
- **Rejected:** “AI outbound calls have no timeout.” Central timeout/AbortController handling exists.
- **Corrected:** Payment webhook paths do validate relevant amount/currency conditions in audited code; remaining concern is atomicity/idempotency/DB uniqueness, not absence of all validation.
- **Corrected:** Full Mongo dump/restore scripts exist. Remaining DR concern is operational proof/off-site/retention/restore drills, not total absence of backups.

---

## 23. What Not To Touch Casually

**DO NOT DELETE / REWRITE without an explicit migration plan:**

- `QuizResult` production compatibility authority.
- Assessment compatibility adapters.
- legacy `User` school/group/parent/subscription fields before every reader/writer migrates.
- `Group.studentIds` / supervisor compatibility before dependent routes migrate.
- `SchoolMembership`.
- `TeachingAssignment`.
- `schoolAdminIntegrity` validation layer.
- `SchoolContract` entitlement policy.
- Smart Classroom question snapshots.
- immutable/historical classroom report data.
- student question projection that strips solutions.
- Socket.IO staff/student room separation.
- AccessGrant idempotency/source invariants.
- CSRF protection.
- active-user refresh behavior.
- Redis Socket.IO adapter.
- BullMQ queues/schedulers.
- frontend API adapter layer.
- PWA policy that avoids caching API responses.

Also avoid architecture churn without measured need:
- no microservices by default;
- no Kubernetes by default;
- no React rewrite;
- no Node→Go/Laravel rewrite;
- no “Redis everything” optimization;
- no blind `npm audit fix --force`;
- no claim of 10k/50k concurrency without production-equivalent evidence.

---

## 24. Recommended Remediation Sequence

```text
BATCH 0  — Freeze exact baseline + re-run evidence
BATCH 1  — P0 TypeScript/build
BATCH 2  — GitHub protection + required CI
BATCH 3  — Authentication/security lifecycle
BATCH 4  — School authority consolidation
BATCH 5  — Smart Classroom privacy/indexes
BATCH 6  — Assessment concurrency/authority
BATCH 7  — Public tests authorization/concurrency
BATCH 8  — Commerce/AccessGrant lifecycle
BATCH 9  — Parent/notifications authority + scale
BATCH 10 — Privacy/data lifecycle
BATCH 11 — Backup/DR
BATCH 12 — VPS/deployment/observability
BATCH 13 — Performance/staging certification
BATCH 14 — Frontend UX/architecture cleanup
BATCH 15 — Documentation + final production gate
```

For every remediation batch:

```text
inspect exact head
→ tests/evidence before
→ minimal implementation
→ focused tests
→ frontend/server typecheck
→ build
→ integration/security negative tests
→ exact-head CI
→ review change impact
→ update this map if architecture changed
```

Do not combine unrelated P1 migrations into one large change.

---

## 25. Verification Labels

Use these labels in future audits and agent handoffs:

- **CODE VERIFIED** — established directly from repository code at the referenced baseline.
- **CI VERIFIED** — established from an exact or identified GitHub Actions run.
- **LIVE VERIFICATION REQUIRED** — code path inspected, but production infrastructure/data state cannot be proven from Git alone.
- **INFRA BLOCKER** — environment/service failure prevents a valid production assertion.
- **PROVISIONAL** — strong code signal but requires a targeted test or additional trace before declaring a defect.

Never convert `LIVE VERIFICATION REQUIRED` into “code not inspected.” They are different states.

---

## 26. Agent Entry Checklist

Before any AI agent or engineer edits ALMEAA:

1. Read this file completely.
2. Confirm current `main` SHA and compare it with the baseline above.
3. Read `docs/architecture/CODEX_EXECUTION_STATE.md` for execution evidence, but do not treat stale branch state as current truth.
4. Inspect the exact files involved; do not rely only on this map.
5. Identify the canonical authority and any legacy compatibility readers/writers.
6. Build a reverse dependency list before modifying shared models (`User`, `Group`, `Quiz`, `Question`, `AccessGrant`, `SchoolContract`).
7. Preserve security/integrity boundaries.
8. Run focused tests plus typecheck/build.
9. Do not merge around a failing required gate.
10. Update this document when a migration changes a source of truth, dependency, runtime path, or “do not touch” rule.

---

## 27. Current Audit Boundary

The repository/code architecture audit is complete enough to serve as the canonical engineering map and remediation baseline.

The following are deliberately **not claimed as verified by repository inspection alone**:
- live VPS configuration/state;
- live Mongo Atlas indexes/data health;
- live Redis behavior;
- real Cloudflare/Nginx/TLS chain;
- off-site backup operation;
- production secrets values;
- production-equivalent concurrency capacity.

Those require direct live-environment verification. Their absence from code evidence does not mean the corresponding code was skipped.

---

## 28. Core Engineering Principle

The project does not need a wholesale rewrite. The primary architectural program is:

**preserve working domain capabilities → consolidate authority → harden security/data integrity → make release/runtime evidence mandatory → certify performance on production-equivalent infrastructure.**

Any future change should support the product loop:

**ASSESS → DETECT → INTERVENE → MEASURE IMPROVEMENT**
