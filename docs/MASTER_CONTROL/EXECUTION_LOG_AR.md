# ALMEAA — Master Execution Log

## 2026-09-26 — PLAN 0 initialization

**Baseline:** `main@e60a8f563dd406098378df70857423455739ef7a`

تم:
- إنشاء #269 كـGrand Master control.
- جرد الفروع القديمة.
- إثبات merged/superseded مقابل gaps.
- تحديد PR #260 وR2 audit tooling كبقايا حقيقية.

## 2026-09-26 — GitHub governance

تم إنشاء Ruleset:
- Name: `Protect main`
- Enforcement: active
- Default branch: main
- PR required
- no force push
- no deletion
- no bypass

Required checks:
- `Auth + RBAC + assessments + courses + commerce on isolated Mongo`
- `Full-stack roles + CRUD + school + quiz flows on isolated Mongo`
- `Cross-phase + handover regression`

## 2026-09-26 — Vercel preview isolation

المحاولة الأولى:
- repository `vercel.json` deployment rule.
- النتيجة: Preview records استمرت؛ المحاولة اعتبرت غير ناجحة.

الإغلاق:
- تعطيل Preview Branch Tracking للفروع غير المعينة.
- Production Branch بقي main.
- Test commit: `ab30963e0fd9e45e94bed31bd24499e107e609ad`.
- Vercel deployment records بعد الاختبار: 0.
- النتيجة: PASS.

## 2026-09-26 — PLAN 0 closure

النتيجة:
- Master Control established.
- old plans demoted from active execution authority.
- GitHub main governed.
- non-main Vercel previews isolated.
- branch reconciliation recorded.

**PLAN 0: CLOSED ✅**  
**NEXT: PLAN 1 — Repository Reconciliation & Missing-Work Closure.**

## 2026-09-26 — CI architecture gate reconciliation

أثناء PR #270 ظهر فشل في `Core build + architecture`:
- المفتاح `VITE_GOOGLE_OAUTH_API_BASE` أُضيف فعليًا في إصلاح Google OAuth المدمج #267.
- المفتاح لم يكن مسجلًا في `APPROVED_CONTRACT_EXTENSIONS.json`.
- تم تسجيله كـruntime env contract معتمد؛ لم يتغير سلوك التطبيق في هذا الإصلاح.
- الهدف: إعادة Architecture Gate إلى التطابق مع main الفعلي بدل ترك regression صامت في CI.

## 2026-09-26 — PLAN 1 repository reconciliation

Baseline:
`main@72193436ac77df781ce9cc1382737fba00cbc8a2`

تم:
- عزل PR #260 إلى فجوة واحدة قابلة لإعادة التطبيق.
- إضافة `QuestionVoiceExplanationPlayer` إلى `ReviewSession` بدون cherry-pick للفرع القديم.
- تحديث smoke voice contract.
- مراجعة `chatgpt/r2-v2-audit` وإعادة تطبيق reachability tooling فقط.
- تحويل R2 workflow إلى manual `workflow_dispatch` بدل branch-specific stale trigger.
- توثيق merged/superseded/gap classification في `PLAN_1_RECONCILIATION_EVIDENCE_AR.md`.

قيد الإغلاق:
- required CI على exact PLAN 1 head.
- merge عبر PR إلى main.

بعد نجاحهما:
**PLAN 1: CLOSED ✅**
**NEXT: PLAN 2.**

### CI reconciliation أثناء PLAN 1
كشف Safety Gate عدم تطابق عداد المهارات مع عقد full-bank coverage.
تم تثبيت القاعدة:
- coverage غير متاح → fallback محلي مؤقت.
- coverage متاح → server count authoritative، والمفقود = 0.
وتم تحديث smoke contract المقابل.

### Delivery workflow reconciliation أثناء PLAN 1
بعد تعطيل Vercel Preview Branch Tracking في PLAN 0، ظل `refactor-v2-guard.yml` ينتظر Preview غير مسموح بإنشائه.
تم جعل `Vercel preview deployment gate` policy-aware:
- Preview disabled → job ينجح بدون polling أو deployment.
- Preview enabled مستقبلًا → يمكن إعادة تفعيل polling بتغيير flag واحدة.
الهدف: CI يطابق سياسة النشر الفعلية ولا يهدر 12 دقيقة في انتظار مورد ممنوع.

## 2026-09-26 — PLAN 2 live production closure

Baseline:
`main@2d5572a9b0c5866ce0065fa3afd43c9b6cfd7b10`

### Runtime
- فعّلنا `RATE_LIMIT_REDIS_ENABLED=true` و`NOTIFICATION_QUEUE_ENABLED=true` وconcurrency=5 على Render بدون تغيير أي Secret.
- Render deploy `dep-daru6pjncjis73f4f0m0` أصبح live.
- `/api/health/ready` و`/api/health/scale-ready` = 200؛ Redis rate-limit/queue + Mongo pass؛ blockers=[].
- startup logs أثبتت rate-limit Redis، queue Redis، socket/realtime pub-sub، weekly distributed scheduler.
- Google OAuth start = 302 إلى Google مع callback Render الحالي.
- operations health أثبت `sentryConfigured=true` و`r2Configured=true`.

### CI / Smoke issue
- Post Deploy run `36247908080` فشل مرتين بسبب 429 من edge على health/taxonomy.
- helper `fetchWithRetry` لم يكن يعيد 429 أصلًا.
- PLAN 2 يصلح retry لـ408/429/5xx مع Retry-After، بدون تخفيف production limiter.

### DR / topology / network
- DR scheduled run `36222909358` فشل fail-closed قبل mongodump لأن 9 GitHub Secrets مفقودة.
- Frankfurt recovery ليس full restore: 10 collections مقابل 66 production، وusers/questions/quizresults = 0 في recovery.
- Render/Redis Frankfurt مقابل Atlas production Singapore ما زال cross-region.
- Atlas open alerts=0 وPerformance Advisor لم يعرض slow queries/index/schema recommendations.
- Atlas allowlist ما زالت تحتوي `0.0.0.0/0`.

Evidence:
`docs/MASTER_CONTROL/PLAN_2_PRODUCTION_CLOSURE_EVIDENCE_AR.md`

القرار:
لا cutover للـrecovery غير المكتمل، ولا Atlas paid upgrade بدون موافقة صريحة، ولا ادعاء بإغلاق PLAN 2 قبل DR/network/topology evidence.


## 2026-09-27 — PLAN 2 runtime/performance certification

Latest production:
`main@3692581ba46362bc5c71714a83be7f3e9fa1a3e9`

- PR #273 live integration hardening merged and Post Deploy `36291061913` PASS.
- Google OAuth start/callback proof PASS.
- R2 one-time presign -> PUT -> public GET -> SHA-256 PASS.
- Sentry live event PASS.
- PR #277 fixed repeated JSON/gzip work for shared learning-core bootstrap.
- exact-head CI including Deep E2E PASS.
- Post Deploy `36295206954` PASS.
- operational smoke 71/71 PASS.
- authenticated student read-load: 340 GET requests, c=10/25/50, 0% errors, overall PASS.
- learning-core c50 p95 improved from 4889.23ms to 674.51ms.
- latest Sentry event: `a32f9e20f795473ea79116cbbc5b8176`.

Status:
- #234 CLOSED ✅.
- #235 remains external-secret/DR blocked.
- #236 CLOSED ✅ — material latency reduction + authenticated staged load satisfy the alternate exit path; physical topology remains optimization debt.
- #237 Atlas broad allowlist removal remains owner/admin blocked.


## 2026-09-27 — PLAN 2 network closure + DR simplification

### #237 network closure
- first `0.0.0.0/0` removal exposed stale/incomplete Render CIDRs and caused Mongo startup failures.
- rollback restored broad access immediately and production recovered.
- current Render Frankfurt outbound ranges were obtained from Render Connect → Outbound:
  - `74.220.51.0/24`
  - `74.220.59.0/24`
- ranges were added before retrying the narrowing.
- `0.0.0.0/0` removed again.
- exact production SHA `f737f81af480951dcb54c78f72b4b028909e9a43` redeployed as `dep-dasd18t9fdbs73cu3d30`.
- fresh startup: `MongoDB connected`, Redis connected, API listening, service live.
- #237 CLOSED ✅.

### #235 final architecture
Daily DR no longer requires four `DR_OFFSITE_*` secrets.
GitHub Actions Artifact provides the independent 30-day backup copy and digest.
The same run automatically restores:
- Mongo archive into disposable Mongo 8;
- media archive into disposable MinIO;
then records representative Mongo counts, exact media key/object-count parity and measured restore RTO.

Remaining external input: five production source secrets only.

## 2026-09-28 — PLAN 8 / Question Bank V2 Tahsili Math (YLM26) Pilot 30 Ingestion

- Branch: `feat/tahsili-math-question-bank-v2` rebased onto `main` (commit `8724cd50`).
- PR #285 passed all 17 CI checks green and merged to `main` at `20a77c62`.
- Render auto-deployed `main` and is active and healthy.
- Generalized question import identity contracts for `TAH-MATH-...` and `QDR-QNT-...`.
- English option presentation badges `A/B/C/D` with zero badge leak enabled for Tahsili Math.
- 30 lossless WebP crops uploaded to Cloudflare R2 bucket `almeaa-media` at `/questions/v2/TAH-MATH-YLM26-.../...webp`.
- Verified 30/30 CDN URLs with HTTP 200 OK and SHA-256 integrity match.
- Executed orchestrated pilot import via `scripts/execute_tahsili_pilot_runner.mjs`:
  - Prepare: 30 items, 0 hash mismatches.
  - Dry-Run: 30 requested, 30 prepared, HTTP 200 OK.
  - Canary (5 items): `q_6ab9ff308d4ddd5245413b82` to `q_6ab9ff318d4ddd5245413b8a` (IMPORTED).
  - Canary verify: 5 drafts, 0 public, 5 admin, 0 linked quizzes (PASS ✅).
  - Full (25 items): `q_6ab9ff4d8d4ddd5245413be8` to `q_6ab9ff528d4ddd5245413c18` (IMPORTED).
  - Full verify: 30 drafts, 0 public, 30 admin, 0 linked quizzes, 0 integrity issues (PASS ✅).
- Evidence recorded in `docs/audits/TAHSILI_MATH_V2_PILOT_30_IMPORT_EVIDENCE_2026-09-28.md`.

## 2026-09-28 — PLAN 8 / Question Bank V2 Tahsili Math (YLM26) Full Book Ingestion (156 Qs Complete)

- Source: `كتاب تأسيس يلو للرياضيات 26 - النسخة المعدلة.pdf` (YLM26, 96 pages).
- Full Book extraction completed across 4 batches:
  - `TAH-MATH-YLM26-PILOT30-V1`: 30 questions (Pages 5–66 sample) -> PASS ✅
  - `TAH-MATH-YLM26-BATCH01-V1`: 30 questions (Pages 5–28) -> PASS ✅
  - `TAH-MATH-YLM26-BATCH02-V1`: 41 questions (Pages 29–66) -> PASS ✅
  - `TAH-MATH-YLM26-BATCH03-V1`: 55 questions (Pages 67–94) -> PASS ✅
- Grand Total: 156 / 156 questions (100% of book questions).
- All 156 images cropped at lossless 300 DPI WebP, zero badge leak, vector-masked answer circles.
- Uploaded and verified on Cloudflare R2 bucket `almeaa-media` with 100% matching SHA-256 hashes via CDN GET.
- Verified on Live Render API and MongoDB Atlas:
  - `drafts: 156` (100% allDraft)
  - `publicVisible: 0` (zero exposure to unauthenticated students)
  - `linkedQuizCount: 0` (zero premature quiz linking)
  - `integrityIssues: []` (clean audit across all 4 batches)
- Evidence recorded in `docs/audits/TAHSILI_MATH_V2_FULL_BOOK_IMPORT_EVIDENCE_2026-09-28.md`.

## 2026-09-28 — PLAN 8 / Question Bank V2 Qudrat Quant COL2627 Ingestion (946 Qs as Draft)

- Source: `COL2627` (`تجميع انشيتن معدل.pdf` — 84 pages).
- Full Book extraction completed across 76 batches/pages (P005 to P084).
- Grand Total: 946 / 946 questions (100% of book questions).
- All 946 images cropped at 600 DPI lossless WebP, badge-masked with zero border clipping (`top=0, bot=0, left=0, right=0`).
- 100% uploaded to Cloudflare R2 bucket `almeaa-media` at `/questions/v2/qudrat/quant/COL2627/.../*.webp`.
- Verified 100% CDN HEAD HTTP 200 with SHA-256 cryptographic hashes.
- Executed idempotent bulk upsert directly into MongoDB Atlas:
  - Pre-import snapshot taken: 0 pre-existing records saved to `docs/audits/COL2627_PRE_IMPORT_SNAPSHOT_1790600456022.json`.
  - Bulk upsert: 946 upserted, 0 modified.
- Live Atlas Integrity Audit (`COL2627_ATLAS_LIVE_AUDIT_REPORT.json`):
  - COL2627 Total in Atlas: 946 (Target: 946)
  - Unique questionCode: 946 (Target: 946)
  - Duplicates: 0 (Target: 0)
  - Draft Count: 946 (Target: 946, 100% hidden from students)
  - Approved Count: 0 (Target: 0)
  - Missing imageUrl: 0 (Target: 0)
  - Missing imageHash: 0 (Target: 0)
  - Missing skillId: 0 (Target: 0)
  - Missing subSkillId: 0 (Target: 0)
  - Bad skillIds pair: 0 (Target: 0)
  - Invalid correctOptionIndex: 0 (Target: 0)
  - Missing aiContext: 0 (Target: 0)
  - Missing voiceExplanation: 0 (Target: 0)
  - Sample R2 Accessibility: P005-Q01 (200 OK), P045-Q18 (200 OK), P084-Q11 (200 OK).
- FND26 Integrity Preservation:
  - FND26 Total in Atlas: 858 (Strictly preserved untouched)
  - FND26 Approved: 856, Rejected: 2
- Total Qudrat Quant Questions in DB (FND26 + COL2627): 1,804 questions.


