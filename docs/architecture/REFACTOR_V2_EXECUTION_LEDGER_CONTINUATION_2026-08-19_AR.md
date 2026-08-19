# استمرار سجل تنفيذ Refactor V2 — 2026-08-19

> يكمل هذا الملف السجل التاريخي السابق بدون حذف أي checkpoint قديم. نقطة العمل الحالية هي `refactor/repository-v2-safe` فقط، ولا يتم دمج `main` إلا بموافقة المستخدم الصريحة بعد Release Candidate verification.

## Content Routes — Study Plan Transport Schemas ✅

تم إغلاق دفعة صغيرة ومحددة الهدف لفصل transport validation الخاصة بخطط الدراسة من `server/src/routes/content.routes.ts` بدون نقل DB/auth/orchestration من الـroute.

### ما تم نقله

- `studyPlanSchema`.
- `interventionStudyPlanSchema`.
- المالك الجديد: `server/src/modules/content/http/studyPlanSchemas.ts`.

### ما بقي في route عمدًا

- HTTP endpoints الخاصة بـ`/study-plans` و`/study-plans/intervention`.
- authorization/roles.
- `StudyPlanModel` persistence.
- student lookup وintervention orchestration.
- `QuizResultModel` reads.
- timestamps وruntime decisions.
- visibility/path resolution.

هذا يحافظ على مبدأ Refactor V2: نقل ownership واضح فقط، بدون تغيير contract المنتج أو database behavior.

## الحماية المضافة ✅

تمت إضافة:

- `tools/refactor/apply-content-study-plan-schemas.mjs` — executor idempotent ومحدود بحدود واضحة.
- `scripts/smoke-content-study-plan-schema-boundary-contract.mjs` — يثبت transport semantics، parser call sites، ownership، route surface، وعدم تسرب DB/Express/runtime side effects إلى schema module.
- `tools/refactor/phase-review-content-study-plan-schemas.mjs` — Phase Review يشمل API build/typecheck، architecture/module gates، content boundaries، student journeys، API security وruntime source.
- `.github/workflows/refactor-v2-content-study-plan-schemas.yml` — exact-head checkout + remote-head verification + no force-push + verified auto-commit فقط عند نجاح الفحوصات.

## commits الموثقة

- setup: `ce55f4397cdc72664dd527965a13e7b575fd9148` — `chore(refactor): prepare content study-plan schema extraction`.
- runtime extraction: `0b5a75d135eb1a64fc655b7911abfdddf71ed86f` — `refactor(content): extract study plan schemas`.
- final contract lock: `aec7825b26551232a5aa8390a9eb99e9dc2fbff6` — `test(refactor): lock study plan route surface`.

## التحقق النهائي على post-extraction head ✅

على `aec7825b26551232a5aa8390a9eb99e9dc2fbff6`:

- Dedicated Study Plan workflow run `32212487608`: **SUCCESS**.
- pre-apply boundary contract: **PASS**.
- API typecheck: **PASS**.
- idempotent apply: **PASS** / no runtime rewrite required.
- Study Plan Phase Review: **PASS**.
- Standard Safety Gate run `32212487578`: **SUCCESS**.
- frontend typecheck: **PASS**.
- API typecheck: **PASS**.
- frontend production build: **PASS**.
- API production build: **PASS**.
- architecture gate: **PASS**.
- module boundary gate: **PASS**.
- Schools contracts: **PASS**.
- Reports contracts: **PASS**.
- Global Student Journey: **PASS**.
- Student Learning Journey: **PASS**.
- Results / route loading / runtime source: **PASS**.
- Quiz integrity / auth security / API security: **PASS**.
- workflow race-safety: **PASS**.
- Vercel deployment status: **SUCCESS**.
- Vercel preview deployment gate: **SUCCESS**.

## ملاحظة GitHub Actions

الـPR events التي ينشئها commit صادر من `github-actions[bot]` قد تظهر `action_required` بدون أي jobs. لا يتم اعتبارها دليل نجاح أو فشل. الاعتماد يكون على runs التي تحتوي jobs فعلية وعلى Safety Gate/Phase Review/Vercel الفعليين. الدفعة الحالية لديها تحقق نهائي كامل على commit بشري `aec7825...` وكل الـjobs الفعلية نجحت.

## حالة الفرع

- branch: `refactor/repository-v2-safe`.
- PR #3: open + draft + mergeable + not merged.
- `main` لم يتم تعديله.
- لا force-push.

## الاتجاه التالي

نكمل Repo-wide Stabilization & Production Readiness حسب risk/value وليس line-count فقط:

1. تحديث/fresh repository audit على الرأس الحديث.
2. ترتيب hotspots حسب coupling + change risk + product impact.
3. duplicate/dead-code/hard-coded URL/API-in-presentation/store-coupling scan.
4. مراجعة `PROJECT_MAP` وownership notes.
5. product journey verification للطالب/المعلم/المشرف/المدرسة/الأدمن.
6. controlled dependency/security remediation بدون `npm audit fix --force` عشوائي.
7. production readiness ثم Freeze -> Full Safety Gate -> compare vs main -> explicit merge approval.
