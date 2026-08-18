# ALMEAA Platform — Project Map

This is the practical map for developers and coding agents. It documents **where the system is today**, where ownership should move, and the important runtime contracts that must stay stable during Refactor V2.

## Current production topology

```text
Browser / PWA
   |
   | HTTPS
   v
Vercel frontend
   |
   | /api/* rewrite
   v
Render API (Node/Express)
   |
   +---- MongoDB Atlas        persisted platform data
   |
   +---- Redis/BullMQ         queue/rate-limit/realtime-support infrastructure
   |
   +---- external providers  payment / email / messaging / AI / observability
```

The frontend and API are deployed separately, but they belong to one product and should remain a **modular monolith** at the code/domain level until a real operational need justifies service extraction.

## Current repository map

```text
/                         root Vite/frontend package
├─ App.tsx                large route/bootstrap/composition hotspot
├─ index.tsx              frontend entrypoint
├─ pages/                  route-level screens; currently mixed domains
├─ components/             reusable + domain components mixed together
├─ dashboards/            large admin/supervisor feature screens
├─ contexts/               React context providers
├─ services/               frontend API/integration facade(s)
├─ store/                  central Zustand state
├─ utils/                  mixed utilities/domain helpers
├─ hooks/                  hooks
├─ styles/                 global frontend styles
├─ src/observability/      already-started frontend source namespace
├─ public/                 public assets
├─ scripts/                many smoke/audit/ops scripts
├─ tools/                  refactor/maintenance tools
├─ docs/                   architecture and operational documentation
├─ server/                 API package used by Render
│  └─ src/
│     ├─ app.ts            Express composition/security middleware
│     ├─ server.ts         process startup + some scheduled orchestration
│     ├─ routes/           236 HTTP method entries across route modules
│     ├─ models/           Mongoose persistence models
│     ├─ services/         domain/integration services, currently mixed
│     ├─ middleware/
│     ├─ config/
│     └─ ...
├─ vite.config.ts
├─ vercel.json
└─ Dockerfile.*
```

## Refactor V2 target

### Frontend

```text
src/
├─ app/
│  ├─ router/
│  ├─ bootstrap/
│  ├─ providers/
│  └─ seo/
├─ core/
│  ├─ api/
│  ├─ auth/
│  ├─ state/
│  └─ observability/
├─ features/
│  ├─ auth/
│  ├─ schools/
│  ├─ courses/
│  ├─ learning/
│  ├─ questions/
│  ├─ quizzes/
│  ├─ exams/
│  ├─ reports/
│  ├─ payments/
│  ├─ notifications/
│  ├─ ai/
│  ├─ content/
│  └─ operations/
└─ shared/
   ├─ ui/
   ├─ lib/
   └─ types/
```

### API

```text
server/src/
├─ app/                         composition only
├─ modules/
│  └─ <domain>/
│     ├─ http/                  route/controller/validation
│     ├─ application/           use cases/services
│     ├─ domain/                policies/types
│     └─ infrastructure/        persistence/providers
├─ shared/
└─ infrastructure/
```

The root frontend package and `server` package are intentionally preserved during this migration so Vercel/Render/Docker root assumptions do not change at the same time as source ownership.

## Domain map

| Domain | Owns | Current high-signal locations | Main refactor direction |
|---|---|---|---|
| Auth | login, account, password, identity, roles | `server/src/routes/auth.routes.ts`, auth UI/context | isolate account/auth HTTP + application services |
| Schools | schools, classes/groups, supervisors, teachers, parent links | `SchoolsManager`, `SchoolPortalManager`, group/school models/routes | split school command/read modules and relationship services |
| Courses | courses, subjects, sections, curriculum setup | course routes, builders/managers | separate catalog/config from learning delivery |
| Learning | lessons, topics, player, library, review | `LearningSection`, learning pages, content routes | route-scoped learning modules and paginated data access |
| Questions | question bank, skills, authoring/import | `QuestionBankManager`, question tools | dedicated question application service and editor modules |
| Quizzes | quiz builder, assignment, access, submission, scoring | `quiz.routes.ts`, `QuizPage`, builders/managers | split create/assign/access/submit/result use cases |
| Exams | mock/simulated/public tests | mock managers, simulated test UI, public-tests routes | explicit exam-session domain separate from normal quizzes |
| Reports | results, analytics, progress/read models | `Reports.tsx`, `Results.tsx`, quiz-result routes | read-model services + pagination/aggregation |
| Payments | packages, memberships, payment verification/access | `payment.routes.ts`, `FinancialManager` | provider adapters + payment/access application services |
| Notifications | notification state/providers/realtime | notification route/service/provider files | event-driven fan-out; remove per-client Mongo polling |
| AI | provider configuration and AI functions | `ai.routes.ts`, AI integrations | provider adapters behind application contracts |
| Content | homepage/editorial/static platform content | `content.routes.ts`, `HomepageManager` | split editorial config from learning domain data |
| Operations | health, backups, monitoring, integrations | operations/backup routes, integration manager | keep operational concerns outside business features |

## Critical contracts

Frozen pre-structural evidence is in:

```text
docs/architecture/baseline/
```

At baseline the AST audit identified:

- 704 tracked files;
- 435 source files including operational/test scripts;
- 289 runtime source files;
- about 123k runtime source lines;
- 49 frontend route literals;
- 236 backend HTTP route entries;
- 25 router mount points;
- 1,020 runtime relative-import edges;
- 2 runtime dependency cycles;
- 83 runtime files at or above 400 lines.

`tools/refactor/architecture-gate.mjs` prevents structural commits from silently losing frontend routes, backend route contracts, router mounts, or environment-key contracts, and prevents import/cycle regressions.

## Top maintainability hotspots

The current largest runtime files include:

1. `dashboards/admin/SchoolsManager.tsx` — ~5.2k lines
2. `pages/Reports.tsx` — ~3.7k lines
3. `server/src/routes/content.routes.ts` — ~3.4k lines
4. `server/src/routes/quiz.routes.ts` — ~3.1k lines
5. `dashboards/admin/PathsManager.tsx` — ~2.3k lines
6. `pages/Dashboard.tsx` — ~2.2k lines
7. `store/useStore.ts` — ~2.2k lines
8. `pages/Results.tsx` — ~2.2k lines
9. `dashboards/admin/FinancialManager.tsx` — ~2.1k lines
10. `services/api.ts` — ~2.0k lines

These files should be decomposed incrementally behind stable facades. They should not be replaced wholesale.

## Known dependency cycles

The baseline audit found two runtime cycles that should be removed deliberately:

```text
SchoolsManager.tsx
  <-> SchoolImportPanel.tsx
  <-> SchoolPackagesPanel.tsx
  <-> SchoolRelationsPanel.tsx
```

and:

```text
notificationProviders.ts
  <-> notificationService.ts
```

No new cycles are allowed during Refactor V2.

## Confirmed scale risks

### Notifications — P0

The existing SSE implementation polls MongoDB per connected client. With large concurrent student counts, realtime fan-out must move to event-driven Redis/Socket/PubSub semantics while preserving the frontend notification contract.

### Scheduled parent reports — P0

The weekly report scheduler currently lives inside the API process. Critical scheduled jobs must move to queue-backed scheduling with idempotency/distributed locking before multi-instance API scaling.

### Large bootstrap/read payloads — P0

Growing learning/catalog data must use route/domain-scoped reads and server pagination/cursors instead of increasingly large global payloads.

### Group membership arrays — P1

Large `studentIds` / relationship arrays have a natural document-growth ceiling. A future migration should introduce an indexed membership collection with backfill + dual-read/dual-write before retiring legacy arrays.

### PWA authenticated API caching — P1

The broad `/api/` runtime cache should later be narrowed to explicitly safe/public endpoints. This is a security/correctness change and must be delivered separately from structural moves.

## Where to start when changing something

- Student quiz problem -> inspect `quizzes` domain and its API submit/access paths first.
- Question-bank problem -> `questions`, not generic admin/shared code.
- School/class/teacher problem -> `schools`.
- Student learning page/data problem -> `learning` plus course/catalog contracts.
- Payment/access problem -> `payments` and access policy; do not patch UI only.
- Result/report problem -> distinguish write-side quiz result integrity from report/read-model presentation.
- Notification issue -> notification state + delivery provider + realtime path; do not add another polling loop.

## Reference documents

- `AGENTS.md` — mandatory contribution/AI-agent rules
- `docs/architecture/ADR-001-RISK-MINIMIZED-MODULAR-MONOLITH.md` — package-root decision
- `docs/architecture/REFACTOR_V2_MASTER_PLAN_AR.md` — full execution plan
- `docs/architecture/generated/CURRENT_REPOSITORY_AUDIT.md` — generated current snapshot
- `docs/architecture/baseline/` — immutable pre-structural contracts
