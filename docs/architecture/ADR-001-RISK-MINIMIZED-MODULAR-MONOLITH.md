# ADR-001 — Risk-Minimized Modular Monolith

Status: **Accepted for Refactor V2**

## Context

The current platform is already deployed with a root Vite package and a nested `server` package. Vercel, Render, Dockerfiles, smoke scripts, and a large number of operational tools assume those package roots. Moving directly to `apps/web` + `apps/api` would combine two different risks in one operation: code organization changes **and** deployment-root changes.

The architecture audit also confirms that the main maintainability problem is not the absence of an `apps/` folder. It is unclear domain ownership, very large files, central god modules, cross-domain coupling, and a lack of enforceable boundaries.

## Decision

Refactor V2 will keep the current **package/deployment roots** stable during the high-risk structural phase:

```text
repository/
├─ src/                       # frontend application source
│  ├─ app/                    # router, bootstrap, providers, SEO
│  ├─ core/                   # auth, API infrastructure, state, observability
│  ├─ features/               # business-domain ownership
│  │  ├─ auth/
│  │  ├─ schools/
│  │  ├─ courses/
│  │  ├─ learning/
│  │  ├─ questions/
│  │  ├─ quizzes/
│  │  ├─ exams/
│  │  ├─ reports/
│  │  ├─ payments/
│  │  ├─ notifications/
│  │  └─ ...
│  └─ shared/                 # domain-neutral UI/types/lib only
│
├─ server/                    # keep Render/package root stable
│  └─ src/
│     ├─ app/                 # composition only
│     ├─ modules/
│     │  └─ <domain>/
│     │     ├─ http/          # routes/controllers/validation
│     │     ├─ application/   # use-cases/services
│     │     ├─ domain/        # domain policy/types where useful
│     │     └─ infrastructure/# persistence/providers
│     ├─ shared/
│     └─ infrastructure/
│
├─ tests/                     # gradually classify behavioural tests
├─ scripts/                   # compatibility retained while scripts migrate
├─ tools/                     # maintenance/refactor tooling
├─ docs/
├─ public/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ vercel.json
└─ Dockerfile.*
```

An `apps/web` / `apps/api` workspace remains an optional later operation only if it has a concrete operational benefit. It is **not** required to achieve maintainability or horizontal scalability.

## Why this is safer

- Vercel continues building the root package.
- Render continues using the existing `server` package.
- Frontend Docker build contract stays root-based.
- Backend Docker/package scripts stay `server`-based.
- Structural code ownership can be improved independently from deployment configuration.
- Rollback remains simple and commit-local.

## Migration sequence

1. Freeze route/API/env/import baseline evidence.
2. Normalize frontend source under `src/` while preserving internal relative layout and all runtime contracts.
3. Introduce `app/core/features/shared` boundaries using compatibility exports.
4. Convert backend route/model/service groups into domain modules **inside `server/src`**.
5. Split god modules one responsibility at a time.
6. Add dependency-boundary enforcement.
7. Only after structure is stable, execute scalability changes (event-driven notifications, queue scheduler, pagination/cursors, membership normalization, cache policy).

## Non-negotiable constraints

- No URL change during structural migration.
- No API path/method change during structural migration.
- No DB schema change in a file-move commit.
- No auth/RBAC/payment/quiz rule change hidden inside a move.
- No mass overwrite from the older reorganized archive.
- Current GitHub branch content is the source of truth.
- Every move is validated by typecheck, build, security/integrity contracts, and architecture invariants.

## Consequence

The final repository may look less fashionable than a workspace monorepo, but it will be easier to deploy, safer to migrate, and substantially easier for both human developers and AI agents to understand because business ownership—not folder fashion—is the primary organizing principle.
