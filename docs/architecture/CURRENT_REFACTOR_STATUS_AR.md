# نقطة متابعة Refactor V2 الحالية

هذا هو المختصر التشغيلي الحي للمشروع بعد إغلاق حدود Schools وReports الرئيسية.

## الهدف الثابت

إعادة تنظيم ALMEAA كـ **Modular Monolith** واضح وقابل للتوسع مع الحفاظ على URLs وAPI contracts وauth/RBAC وquiz integrity وpayment/access semantics وسلوك المنتج أثناء النقل البنيوي.

## مصدر الحقيقة الحالي

- branch: `refactor/repository-v2-safe`.
- Draft PR: `#3` للتحقق فقط، وليس للدمج التلقائي.
- آخر رأس كود موثق: `45cb2ba6dc2a7c0e0bfb33ed802ec0f9d915883c`.
- آخر Safety Gate كامل: run `32186249911` — **PASS**.
- baseline: **56/56 PASS**.
- Phase Review بعد تطبيق Visible Launch Board extraction: **PASS**.
- `main` لم يتغير.

## المقاييس الحالية المهمة

- `SchoolsManager.tsx`: ~**2710** سطر.
- `Reports.tsx`: **2607** سطر في آخر baseline.
- frontend routes: `49`.
- backend route entries: `236`.
- router mounts: `25`.
- runtime unresolved relative imports: `0`.
- dependency cycles: `0`.
- آخر audit قبل مرحلة Launch Board كان يسجل `82` hotspot فوق 400 سطر مقابل architecture budget `83`؛ المطلوب الآن fresh audit وليس افتراض أن هذه القائمة ما زالت كما هي.

## ما أصبح معماريًا ثابتًا

### Schools

`SchoolsManager.tsx` يحتفظ بالـorchestration: state, store/API mutations, confirmations, browser side effects, navigation، بينما presentation والحسابات الكبيرة موزعة على feature-owned modules داخل `dashboards/admin/SchoolsManager/`.

أحدث الحدود المغلقة:

- `SchoolPortfolioCard.tsx`.
- `SchoolWorkspaceControlsPanel.tsx`.
- `SchoolLaunchBoardPanel.tsx`.
- portfolio/readiness projections.

وتسبقها حدود roster/classes/courses/supervisors/overview/command-center/relations/packages/access-codes/reports.

### Reports

تم فصل domain contracts وعدد كبير من pure view-models وpresentation boundaries، بينما side effects مثل API/browser/XLSX بقيت في الصفحة أو في boundary مناسب.

## Safety / CI

- exact-head checkout.
- shared concurrency بين push وPR لنفس safe branch.
- stale auto-commit protection.
- no force push.
- architecture + module boundary + performance + security contracts جزء من gate.

## حالة Vercel

الرأس الحالي يظهر Vercel failure من النوع `build-rate-limit`. GitHub frontend production build **PASS**، لذلك الحالة مصنفة external preview quota وليس code regression. لا يتم تزويرها كنجاح، ولا يتم تعديل الكود فقط لإرضاء quota خارجي.

## المخاطر المفتوحة

1. الوثائق القديمة كانت تشير إلى `SchoolsManager ~4308` وخطة Relations قديمة؛ يجري تحديثها الآن.
2. repo ما زال يحتوي عشرات hotspots فوق 400 سطر ويحتاج ترتيبًا حسب risk/value.
3. `npm ci` يبلّغ عن vulnerabilities في frontend/server؛ تحتاج dependency audit مضبوط وليس `--force`.
4. full end-to-end product verification ما زال مطلوبًا قبل Release Candidate.
5. production readiness: env/CORS/health/logging/backups/monitoring تحتاج إغلاقًا موثقًا.

## المسار التالي

**Repo-wide Stabilization** وليس مزيدًا من line-count refactor العشوائي:

1. fresh repository audit وتحديد أعلى hotspots والـcoupling.
2. اختيار concern واحد فقط لكل دفعة.
3. تحديث `PROJECT_MAP` وownership notes.
4. product journeys verification.
5. dependency/security review.
6. production readiness.
7. Freeze + full gate + compare مع main.
8. الدمج لا يتم إلا بعد موافقة المستخدم الصريحة.

## قاعدة الاستمرار لأي Agent

ابدأ من:

`AGENTS.md` -> `docs/architecture/PROJECT_MAP.md` -> `REFACTOR_V2_LATEST_CHECKPOINT_AR.md` -> هذا الملف -> `REFACTOR_V2_EXECUTION_LEDGER_CONTINUATION_2026-08-18_AR.md` -> آخر Safety Gate.

ولا تعتبر صِغر الملفات وحده نجاحًا؛ النجاح هو ownership أوضح + behavior ثابت + contracts وbuilds خضراء.
