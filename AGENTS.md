# ALMEAA — Contributor & AI Agent Rules

This repository is a production educational platform. Changes must optimize for **correctness, traceability, scalability, and safe incremental delivery** rather than fast large rewrites.

## 1. Source of truth

- The current Git branch is the source of truth.
- Do not overwrite current code with old ZIP/export/reorganized copies.
- Preserve fixes that landed after an older refactor snapshot.
- Never assume a file is dead because its ownership is unclear; prove callers first.

## 2. Required validation before a change is considered safe

Run:

```bash
npm ci
npm --prefix server ci
npm run typecheck
npm run server:check
npm run build
npm run server:build
node tools/refactor/repository-audit.mjs
node tools/refactor/architecture-gate.mjs
npm run smoke:route-loading
npm run smoke:runtime-source
npm run smoke:quiz-integrity-guard
npm run smoke:auth-login-security
npm run smoke:api-security
```

On `refactor/repository-v2-safe`, the GitHub Actions **Refactor V2 Safety Gate** runs these checks automatically.

## 3. Contracts that structural refactors must not change

Without a dedicated product/migration change, do **not** change:

- public/frontend route URLs;
- API HTTP method/path contracts;
- router mount paths;
- authentication/RBAC behavior;
- quiz assignment/submission/scoring/integrity rules;
- payment/access rules;
- MongoDB persisted schema semantics;
- environment variable names;
- Vercel-to-Render API routing behavior.

The immutable pre-structural evidence is stored under:

```text
docs/architecture/baseline/
```

## 4. Architecture direction

Use a **Modular Monolith**. Do not introduce microservices merely to make folders look cleaner.

Frontend target:

```text
src/
  app/          # composition/router/bootstrap/providers/SEO only
  core/         # API transport, auth infrastructure, state infrastructure, observability
  features/     # business-domain modules
  shared/       # truly domain-neutral UI/lib/types
```

Backend target stays inside the existing Render package root:

```text
server/src/
  app/
  modules/<domain>/
    http/
    application/
    domain/
    infrastructure/
  shared/
  infrastructure/
```

The package roots stay stable during Refactor V2 so repository organization is not mixed with deployment-root migration risk.

## 5. Business-domain ownership

Prefer these owners:

- `auth` — login, account, password, identity, role checks
- `schools` — schools, groups/classes, supervisors, teachers, parent/student relationships
- `courses` — courses, subjects, sections, curriculum configuration
- `learning` — lessons, topics, player, library, review/flashcards
- `questions` — question bank, skills, question authoring/import
- `quizzes` — quiz builder, assignment, access, submit, quiz policy
- `exams` — mock/simulated/public barcode tests and exam sessions
- `reports` — result views, analytics, progress and reporting read models
- `payments` — packages, memberships, payment providers, financial access
- `notifications` — notification delivery/read state/providers/realtime fan-out
- `ai` — AI provider/runtime/configuration features
- `content` — homepage/static/editorial platform content
- `operations` — health, backup, monitoring, integrations and operational tooling

If a file touches several domains, first identify which part is orchestration and which parts belong to domain modules. Do not solve mixed ownership by putting everything in `shared`.

## 6. Dependency rules

- A feature may use `core` and `shared` public APIs.
- Do not import another feature's internal component/service directly when a public feature API can be exposed.
- Backend HTTP routes must become thin: validation/auth -> application service -> response mapping.
- Database/Mongoose details belong in infrastructure/persistence layers rather than UI/HTTP orchestration.
- Shared code must be domain-neutral; business rules do not belong in `shared`.
- New circular dependencies are forbidden.

## 7. File-size rules

Current code contains legacy hotspots above 1,000–5,000 lines. Do not create new files like this.

For new/refactored code:

- target: <= 300–400 lines per normal source file;
- 400–700 lines requires a clear reason;
- >700 lines should be split before merge unless it is generated/schema data;
- components should not own API transport + business calculations + modal forms + tables in one file;
- route files should not contain many unrelated use-cases.

Reduce legacy hotspots incrementally; never rewrite a 5,000-line production file in one blind pass.

## 8. Safe refactor protocol

1. Establish/verify green baseline.
2. Change one structural concern at a time.
3. Keep a compatibility facade/export when callers are numerous.
4. Run gates.
5. Only then migrate callers.
6. Run gates again.
7. Delete compatibility code only after repository-wide caller proof.

Do not combine a file move, schema migration, UI redesign, and business-rule change in the same commit.

## 9. Database and scale rules

- No destructive Mongo migration inside structural refactor commits.
- Query changes must be reviewed against indexes/query shape.
- Growing collections/lists require pagination/cursors; do not add new unbounded `find({})` UI paths.
- Multi-instance jobs require queues/locks/idempotency; do not rely on process-local `setInterval` for critical scheduled work.
- Realtime fan-out should not scale by adding one Mongo polling loop per connected user.
- Redis/queues already exist in the platform; prefer existing infrastructure where appropriate.

## 10. Security rules

- Never commit tokens, passwords, database credentials, provider secrets, or production `.env` files.
- Do not log authentication tokens or secrets.
- Do not weaken CSRF, CORS, RBAC, rate limits, quiz integrity, or payment verification to make a test pass.
- Do not run blind `npm audit fix --force`; upgrade dependencies deliberately and verify behavior.

## 11. Testing philosophy

The repository contains many source-text smoke contracts. Keep them working, but new critical coverage should prefer:

- unit tests for domain/business rules;
- API integration tests for auth/RBAC/quiz/payment workflows;
- Playwright E2E for student/admin/supervisor journeys;
- controlled load tests for scalability claims.

Static source checks are supplementary and must not be treated as proof of runtime behavior.

## 12. AI-agent context strategy

Before changing a domain:

1. read `AGENTS.md`;
2. read `docs/architecture/PROJECT_MAP.md`;
3. inspect the domain's public entry points and callers;
4. read only the hotspot sections needed for the change;
5. avoid loading/rewriting giant files wholesale;
6. preserve current contracts and latest Git history fixes;
7. leave a clear migration note when ownership changes.

This keeps Codex/other agents from treating a giant file as one indivisible context and reduces accidental cross-domain regressions.
