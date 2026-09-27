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
