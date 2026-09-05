# Product Gate 6 — Questions / Curriculum / Courses / Operations Closure

- Started: 2026-09-05
- Base: `main` at Gate 5 merge commit `3554075747be7a9c542584a6af736cc71347f690`.
- Working branch: `codex/gate6-questions-curriculum-operations`.
- Gates 1–5 remain CLOSED / VERIFIED and are not reopened by this work.
- Goal: close the remaining commercial gaps in Questions, Curriculum/Learning, Courses and Operations without broad refactors or changes to Assessment/RBAC/Payments ownership.

## Gate 6 commercial order

1. Questions: bank / authoring / types / classification / search / import / review / analytics.
2. Curriculum/Learning: keep curriculum/taxonomy ownership distinct from learning content/progress.
3. Courses: keep Learning Product distinct from Package/Commerce Product.
4. Operations: storage/media, queues/jobs, observability, backup/restore, security/release checklist.
5. Production-like load certification only on an explicitly authorized staging target; do not claim capacity numbers without a reproducible report.

## Baseline audit — 2026-09-05

### Questions — PARTIAL, strong existing base

Verified now:

- One real `QuestionModel` stores taxonomy links, difficulty, media, question type, ownership and review workflow metadata.
- Current supported persisted types are `mcq`, `true_false`, and `essay`.
- Question classification includes path, subject, section/main-skill, sub-skills, exam type, source and year.
- Server-backed paginated question reads exist and the Admin bank uses bounded pages with path/subject/section/skill/search filters.
- Question authoring/edit/delete/duplicate/preview exist.
- Excel import has a safe workbook reader, taxonomy validation, preview-before-apply, row-level errors and export/template support.
- Admin review supports approve/reject; teacher-created questions follow review-state workflow.
- Question HTML/media safety and runtime CRUD/pagination already have existing smoke coverage.

Proved selling gap:

- `QuestionBankManager` currently presents a button labelled **"توليد ذكي من ملف (AI)"** but the button only runs a browser `alert(...)`; it does not upload a file, call AI, generate a draft or persist anything. This is a visible false affordance and cannot be counted as a working authoring capability.
- A real server-authorized AI endpoint already exists at `POST /api/ai/question` and the frontend API exposes `api.aiQuestion(...)`, but the Question Bank does not use it.
- Question-level usage/quality analytics are not yet proved from the current Admin Question Bank. Do not claim this sub-capability closed until API/data/UI evidence exists.

First bounded Gate 6 slice:

**Replace the fake AI affordance with a real review-first AI question draft flow using the existing `/api/ai/question` provider abstraction.** The generated result must open in the existing `UnifiedQuestionBuilder`, inherit only the currently selected allowed taxonomy context, never auto-publish or auto-save, and keep the normal server review/ownership path.

This slice is `MVP الآن` because a visible control that claims generation but performs no real operation is a sellability defect. Full PDF/file extraction is not required for this slice and must not be faked; if it is not implemented, the UI must describe the capability accurately.

### Curriculum / Learning — NOT PROVEN for Gate 6 closure yet

Known strong base:

- Paths, levels, subjects, sections and skills have dedicated taxonomy models/routes/admin surfaces.
- Subject Learning Space was already closed in Gate 2 and must not be reopened.

Gate 6 still needs a focused ownership audit proving curriculum/taxonomy is not duplicated or mixed with learner progress/content definition. Do not redesign taxonomy merely for cleaner files.

### Courses — NOT PROVEN for Gate 6 closure yet

Known strong base:

- Course CRUD, publishing/visibility, modules/lessons and learning consumption exist.
- B2B packages/access codes already exist separately in school/commercial flows.

Gate 6 needs a focused contract map proving the Learning Product course definition is not silently acting as the Package/Commerce product, while preserving current compatibility and URLs. No schema rewrite without a proved conflict.

### Operations — PARTIAL but substantially implemented

Verified now:

- `BackupManager` is backed by real Admin-only server routes.
- Server snapshots, activity history, status/readiness, uploaded backup preview, guarded restore and replace modes exist.
- Real restore apply requires explicit Arabic confirmation text and creates a safety snapshot before applying changes.
- `OperationsCommandCenter` reads operational status, audit, client errors, SEO and delivery readiness and exposes bounded repair actions.
- Production health after Gate 5 is green with database and Redis checks passing on the exact main commit.

Still to prove before Gate 6 closure:

- storage/media operational ownership and failure behavior;
- queue/job operational visibility beyond health readiness;
- backup/restore reproducible contract evidence on the Gate 6 release candidate;
- release checklist/handover completeness for the final Gate 6 candidate;
- no capacity claim without an authorized staging load report.

## Batch Q-01 — Review-first AI question draft

- Status: `VERIFIED` for this bounded Questions sellability defect. Gate 6 and the Questions area remain `PARTIAL`; this batch does not close the whole gate.
- Runtime behavior: the fake file/PDF AI alert was removed. `QuestionBankManager` now opens the existing `UnifiedQuestionBuilder` as an explicit AI draft, and the builder uses the existing `generateQuizQuestion(...) → api.aiQuestion(...) → POST /api/ai/question` provider path.
- Review boundary: generated content is copied only into editable local question state. Generation does not call `addQuestion`, `updateQuestion`, or `onSave`; persistence remains an explicit user action through the existing builder/save path. New AI drafts start as `draft` even for Admin rather than being auto-approved.
- Taxonomy boundary: the draft inherits only the currently selected path/subject/main-skill/sub-skill context. Existing teacher/admin ownership and review persistence are preserved.
- Product accuracy: the UI now states that Excel import is supported and that PDF/file extraction is not available from this path; no fake document-extraction claim remains.
- Contracts: `scripts/smoke-security-rbac-phase6-contract.mjs` and the dedicated `scripts/smoke-gate6-question-ai-authoring-contract.mjs` lock the authorized endpoint, review-first behavior, selected taxonomy inheritance, explicit save boundary, and removal of the false file/PDF affordance. The dedicated Gate 6 smoke is wired into the existing Phase + Handover workflow.
- Runtime evidence: exact runtime/test commit `2f88ab863cf82cd48f5d2026ebf0fc7f0cf107ad` passed Platform V3 Phase + Handover `33958279565`, Platform V3 Recovery `33958279497`, and Refactor V2 Safety `33958279540`. The same commit also received a successful Vercel deployment status.
- Current-head contract evidence: code-equivalent Gate 6 head `8cdd7becead9ee0ab037254860c667aef90e4966` passed Phase + Handover `33958440485`, including the explicit `Gate 6 question AI authoring contract` step. Recovery/Safety runs on this later test/scaffold-cleanup head are non-runtime follow-up checks and are not needed to re-prove the already-green exact runtime commit.
- CI correction evidence: temporary self-mutating delivery scaffolding briefly introduced a one-off workflow run `33957869693`. Its codemod and product contract both passed, then its frontend-only dependency install caused root `npm run typecheck` to fail on missing `server/` dependencies. This was not a product regression. The temporary apply workflow/codemod were removed; the useful dedicated contract was retained and aligned with the actual review flow.
- Ownership/data impact: no schema, query shape, API URL, RBAC role, scoring, payment, persistence ownership, or production-data behavior changed. `MODULE_CATALOG.md`, `CHANGE_MAP.md`, and `DATA_ACCESS_MAP.md` therefore require no update for Q-01.
- Handoff: the next approved Questions gap to inspect is question-level usage/quality analytics. Do not implement analytics merely because it is named here; first prove the current UI/API/data gap and choose one bounded commercial slice. Do not move to Curriculum until the approved Questions closure criteria are satisfied or explicitly reclassified.

## Non-goals

- No global `tenantId` or SaaS multi-tenancy.
- No microservices split.
- No buyer-specific core forks.
- No rewrite of Questions/Curriculum/Courses simply because files are large.
- No change to Assessment scoring/session semantics.
- No RBAC role expansion.
- No production data restore or destructive cleanup from this gate without explicit owner authorization.
- No fake AI/file/PDF capability labels.

## Closure rule

Gate 6 is not closed by generic typecheck/build alone. Each remaining area must be classified `VERIFIED`, `PARTIAL`, `NOT PROVEN` or `BLOCKED` with current UI → API → persistence/RBAC evidence where applicable, then the final release candidate must pass the relevant CI gates on the exact integrated head.
