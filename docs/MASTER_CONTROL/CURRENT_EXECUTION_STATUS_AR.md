# ALMEAA — Current Execution Status

آخر تحديث: 2026-09-27

## الحالة المختصرة

| Plan | الحالة | التالي |
|---|---|---|
| 0 — Master Control & Safe Delivery | CLOSED ✅ | ابدأ Plan 1 |
| 1 — Repository Reconciliation | CLOSED ✅ | voice gap + R2 tooling reconciled |
| 2 — Production Closure | IN PROGRESS ⚠️ | runtime/performance/network green; DR runtime staging fix in #281 |
| 3 — Speed/Bandwidth | WAITING | #268 |
| 4 — Data Model/Storage | WAITING FOR DR | بعد Plan 2 baseline |
| 5 — Residual Architecture | WAITING | auth/App/quiz/store residuals |
| 6 — Student Journey Certification | MOSTLY MERGED | regression after structural/data changes |
| 7 — AI Live Certification | PROVIDER PENDING | real quota/cost/failover proof |
| 8 — Question Bank Integrity | DOMAIN ACTIVE | #264 + FND26/COL2627 |
| 9 — Market Readiness | BLOCKED | requires 1–8 exit gates |

## PLAN 0 evidence

### GitHub
Ruleset: `Protect main`
- enforcement: active.
- target: default branch/main.
- pull request required.
- force push blocked.
- deletion blocked.
- bypass list empty.
- required checks:
  1. `Auth + RBAC + assessments + courses + commerce on isolated Mongo`
  2. `Full-stack roles + CRUD + school + quiz flows on isolated Mongo`
  3. `Cross-phase + handover regression`

### Vercel
- Preview Branch Tracking disabled for unassigned/non-main work branches.
- Production Branch remains `main`.
- verification commit: `ab30963e0fd9e45e94bed31bd24499e107e609ad`.
- deployment records for that verification window: **0**.

## PLAN 1 closure

- PR #260 gap: minimal teacher voice playback reapplied inside `ReviewSession`; STT/TTS/Smart Tutor/session isolation preserved.
- R2 V2 audit tooling: clean-reapplied as manual reachability evidence; it does not authorize image linking and #264 remains visual truth.
- Reconciliation evidence: `docs/MASTER_CONTROL/PLAN_1_RECONCILIATION_EVIDENCE_AR.md`.
- No stale branch was merged wholesale.

**NEXT:** PLAN 2 — Production Closure / Runtime / DR / Governance.

## PLAN 2 current state

- Managed Redis: **LIVE PASS** — rate-limit + queue + realtime + scheduler; `scale-ready=200`.
- Google OAuth start: **LIVE PASS** — Google redirect + canonical Render callback.
- Sentry: **LIVE PASS** — latest event `a32f9e20f795473ea79116cbbc5b8176`.
- R2: **LIVE PASS** — presign/PUT/public-GET/SHA-256 proof completed.
- DR: **IN PROGRESS — RUNTIME NETWORK FIX** — the five source values are configured. Run `36320284837` proved a GitHub-hosted runner cannot reach Atlas after allowlist hardening; PR #281 moves only `mongodump` to a Frankfurt Render staging job while GitHub keeps the independent Artifact + isolated Mongo/MinIO restore certification. No runtime success is claimed yet.
- Frankfurt Atlas recovery: **NOT A FULL RESTORE** — do not cut over.
- Performance: **CLOSED ✅** — authenticated c=10/25/50, 340 GETs, 0% errors; material latency reduction satisfies #236 alternate exit path. Frankfurt↔Singapore remains optimization debt, not a PLAN 2 blocker.
- GitHub governance: closed.
- Atlas network: **CLOSED ✅** — `0.0.0.0/0` removed; current Render Frankfurt outbound `74.220.51.0/24` + `74.220.59.0/24` passed a fresh-process Mongo reconnect.
- Evidence: `docs/MASTER_CONTROL/PLAN_2_PRODUCTION_CLOSURE_EVIDENCE_AR.md`.

**PLAN 2 is not CLOSED yet. PLAN 3 must wait.**

## Open operational/domain issues

- #234 runtime integrations — CLOSED ✅.
- #235 disaster recovery.
- #236 topology/capacity — CLOSED ✅.
- #237 governance/network — CLOSED ✅.
- #264 question visual integrity.
- #268 residual performance/runtime footprint.

## Baseline at PLAN 0 creation

`main@e60a8f563dd406098378df70857423455739ef7a`

Git HEAD always overrides this historical baseline.

## BIO26 — Full Closure checkpoint

آخر تحديث BIO26: 2026-10-06

- Content PR: #362 — `content/bio26-source-freeze`; current HEAD at this checkpoint: `3feacb6e019f761a2b40f889da894898368928f5`.
- Production plumbing PR: #388 — `ops/bio26-production-closure` from current `main`; dedicated BIO26 subject/taxonomy + staged importer are under CI.
- Crop/QA: **2,835/2,835 PASS**.
- Dedupe: **2,832 canonical + 3 aliases PASS**.
- AI Context effective canonical: **2,832/2,832 PASS**; pending **0**; **48/48 lessons complete**.
- AI Context storage: **INDEXED_SHARDS_V2** — historical base 2,091 raw items, effective base 2,089 after excluding stale aliases `L10-Q025` and `L35-Q036`; L37–L48 shards add 743 canonical items; `L40-Q092` excluded per frozen dedupe report.
- AI QA: **2,832/2,832 source-answer PASS**, **2,832/2,832 skill-range PASS**, **2,832/2,832 required-fields PASS**, 0 duplicate codes, 0 OCR-inferred answers, alias exclusions **3/3 PASS**.
- Production subject safety: existing `sub_1784980740570` / **علم البيئة** remains protected and MUST NOT be renamed or repurposed. PR #388 defines dedicated subject `sub_tah_biology_bio26` / **الأحياء** on Tahsili path `p_1777779653351`, with frozen **29 main / 98 subskills** and guarded dry-run/apply.
- Production importer design in PR #388: fail-closed phases **R2 → dry-run → canary 5 → full draft → verify**, fixed batch `TAH-BIO-BIO26-FULL-V1`, and no write without explicit write authorization.
- R2 asset package audit remains internally PASS: **2,832 images / 29,550,012 bytes**, canonical ZIP `BIO26_FINAL_ASSETS_V2_CANONICAL.zip`, ZIP SHA-256 `37e58c58dfbdeb8a956ee80e42f2c41cf476f506b3c825663c71bf214ee55a03`, ZIP size **30,134,017 bytes**. However the actual ZIP bytes are **not present in GitHub, workflow artifacts, current Library, or mounted project storage**, so authenticated production PUT + remote hash verification is still **NOT RUN**.
- Import-payload quality gap: no `BIO26_IMPORT_MANIFEST_READY.json` exists yet and repository search confirms no BIO26 `optionTexts/readableText` payload. Direct indexed PDF text read returns **no readable content** because the question source is image-based. PR #388 therefore requires 4 machine-readable option texts, readableText, visualDescription, explanation, and visual-QA reviewer note for every question before any draft insert.
- Hard gates: production taxonomy must pass dry-run/apply first; then recover/regenerate the exact audited asset package + complete machine-readable manifest; then R2 verified; then Dry Run → Canary 5 → Full Draft Import → Integrity Audit → Live E2E → Approval.
- BIO26 status: **NOT CLOSED**. AI/content taxonomy mapping is complete; production closure is intentionally fail-closed on the two package-level gaps above.
