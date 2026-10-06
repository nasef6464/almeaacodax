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

الـPR events التي ينشئها commit صادر من `github-actions[bot]` قد تظهر `action_required` بدون أي jobs. لا يتم اعتبارها دليل نجاح أو فشل. الاعتماد يكون على runs التي تحتوي jobs فعلية وعلى Safety Gate/Phase Review/Vercel الفعليين.

---

# Dependency Security Closure — 2026-08-19 ✅

بعد إغلاق دفعات Quiz المحدودة، تم تحويل الأولوية إلى Production Readiness / Dependency Security مع قاعدة صارمة: remediation non-breaking أولًا، lock-only حيث يمكن، ولا `npm audit fix --force` ولا overrides عشوائية ولا major upgrade تلقائي.

## النتيجة النهائية للـRoot

آخر evidence مباشر من workflow `Refactor V2 Remediate Root Babel Core`:

- run: `32227322380`.
- job: `95989605166`.
- setup head: `7710cd2142c374263299d3abc8fdd24ef62b21f8`.
- remediation commit: `e3026a90a2aafa3ecbbdc81145f6d3939d19cc66`.

قبل آخر remediation:

- root all-dependencies: 1 Low فقط (`@babel/core`).
- root production: 0 vulnerabilities.

بعد remediation:

- root all-dependencies: **0 vulnerabilities**.
- root production: **0 vulnerabilities**.
- `npm ci`: **found 0 vulnerabilities**.
- frontend typecheck: PASS.
- API typecheck: PASS.
- frontend build: PASS.
- API build: PASS.
- performance: PASS.
- deployment cache: PASS.
- route loading: PASS.
- runtime source: PASS.
- Global Student Journey: PASS.
- scope: `package-lock.json` only.

### Root remediation commits المهمة

- `506be7f1529f02305291eb333e61c464b8af9a91` — `fix(deps): remediate genai transitive advisories`.
  - `ws 8.20.1 -> 8.21.3`.
  - `protobufjs 7.6.1 -> 7.6.5`.
- PostCSS remediation:
  - `postcss 8.5.15 -> 8.5.26`.
  - `nanoid 3.3.12 -> 3.3.18`.
- Vite remediation:
  - `vite 6.4.2 -> 6.4.3`.
- `91a1a1627febcdd0a7cb9ed6f923fd16f1a4f624` — root brace-expansion remediation.
  - `5.0.6 -> 5.0.9`.
  - nested `2.1.0 -> 2.1.4`.
- `f56e8e358848b4f7f19d4943b9aa5381c4714723` — root fast-uri remediation.
  - `3.1.2 -> 3.1.5`.
- `e3026a90a2aafa3ecbbdc81145f6d3939d19cc66` — root Babel remediation.
  - `@babel/core 7.29.0 -> 7.29.7`.
  - compatible internal Babel 7.x lock resolutions updated together.

كل هذه التغييرات بقيت داخل `package-lock.json` فقط في commits الناتجة من remediation، مع provenance contracts تمنع تحويل transitive package إلى direct dependency.

## النتيجة النهائية للـServer ضمن سياسة non-breaking

تمت إزالة High وLow advisories في **production-only server audit** التي أمكن علاجها بدون major migration:

- Critical: 0.
- High: **0**.
- Low: **0**.
- Moderate: **16** متبقية داخل `@sentry/node` / OpenTelemetry tree.

الـaudit يوجه حل هذه الشجرة إلى `@sentry/node 10.70.0`، وهو major upgrade من 9.x. لذلك تم تأجيله عمدًا إلى migration مستقلة بدل كسر سياسة الـsafe branch.

### Server remediation commits المهمة

- Mongoose:
  - `8.23.0 -> 8.24.3`.
  - no-op workflow behavior تم تصحيحه لاحقًا في `5975120de2af8d4555e8c21cc34c207bfb50c380` ثم rerun ناجح بدون lockfile commit.
- `8ce1fa0fcb7241d45d4eead588b1c085dd4c2085` — Express-owned body-parser.
  - `1.20.5 -> 1.20.6`.
- `6521758ca9d096775ad97631772a7718423305dc` — Sentry-owned brace-expansion داخل نفس الشجرة وبدون Sentry major.
  - `2.1.0 -> 2.1.4`.
- `5666f7d97903561dcb6ad1357123af97ab950d9a` — express-rate-limit-owned ip-address.
  - `10.2.0 -> 10.5.0`.
- `94efa22f33705cbdd324aeaf3f92c1e1da17e064` — Socket.IO transitive remediation.
  - `engine.io 6.6.8 -> 6.6.9`.
  - `socket.io-adapter 2.5.7 -> 2.5.8`.
  - `socket.io-parser 4.2.6 -> 4.2.7`.
  - `ws 8.20.1 -> 8.21.3`.

## Contract ownership repairs التي ظهرت أثناء remediation

تم التعامل مع failures القديمة باعتبارها ownership drift، وليس حذفًا للاختبارات:

- Monitoring contract أصبح يقرأ الأدلة من `docs/archive_reports/`.
- NoSQL/security contracts أصبحت تتبع مواقع الأدلة المؤرشفة.
- Notification contract أصبح يتبع `NOTIFICATION_SYSTEM_GUIDE.md` و`WHATSAPP_INTEGRATION_GUIDE.md` في الأرشيف الحالي.
- Notification Phase 10 أصبح يثبت bootstrap ownership الحالي:
  - `server.ts` يحتوي `bootstrapServer()`.
  - `server/src/app/bootstrap/bootstrapServer.ts` يحتوي `startNotificationWorkers()`.
- Mongoose workflow يقبل clean no-op ولا يعتبر غياب diff فشلًا.

لم يتم تخفيف أي requirement وظيفي أو أمني في هذه الإصلاحات.

## قواعد السباق والكتابة

كل remediation workflow المضافة/المعدلة تحافظ على:

- exact SHA checkout.
- branch-scoped concurrency.
- lockfile-only scope gate.
- remote-head verification قبل commit.
- stale commit safe-skip.
- no force-push.

## Vercel

Vercel exact-head failures التي تحمل `upgradeToPro=build-rate-limit` تبقى external quota state وليست build regression. لا يتم الادعاء بأن exact-head Vercel أخضر عند وجود هذا status.

الـcode evidence يعتمد على dedicated workflows + Standard Safety Gate. آخر runtime-equivalent previews الموثقة قبل rate limit كانت READY وHTTP 200.

## حالة الفرع عند Security Closure

- branch: `refactor/repository-v2-safe`.
- PR #3: open + draft + mergeable + not merged.
- `main` لم يتم تعديله.
- لا force-push.
- آخر dependency closure head قبل checkpoint docs: `e3026a90a2aafa3ecbbdc81145f6d3939d19cc66`.

## الاتجاه التالي بعد Security Closure

1. fresh Dependency Audit على checkpoint النهائي.
2. Standard Safety Gate على checkpoint النهائي.
3. fresh repository architecture audit.
4. إعادة ترتيب hotspots حسب coupling/risk/product impact.
5. dead-code/duplicate/hard-coded URL/API-in-presentation/store-coupling review.
6. product journey verification للطالب/المعلم/المشرف/المدرسة/الأدمن.
7. Sentry 9 -> 10 يبقى مسار migration مستقل فقط إذا تقرر تنفيذه لاحقًا، مع عقود Sentry/Monitoring/API/Integration/Security كاملة.
8. Production Readiness -> Freeze -> Full Safety Gate -> compare vs `main` -> explicit merge approval.
