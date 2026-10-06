# استمرار سجل تنفيذ Refactor V2 — 2026-08-18

> هذا الملف يكمل `REFACTOR_V2_EXECUTION_LEDGER_AR.md` بدون حذف التاريخ القديم، ويغطي المراحل التي تجاوزها السجل الأصلي.

## قاعدة ثابتة

- العمل على `refactor/repository-v2-safe` فقط.
- لا force-push.
- لا merge إلى `main` إلا بموافقة المستخدم الصريحة وبعد Release Candidate verification.
- أي ownership move يرافقه contract يتبع المالك الجديد؛ لا تخفيف للاختبارات لمجرد CI أخضر.

## Reports — checkpoint مجمع ✅

تم إغلاق سلسلة تفكيك Reports تدريجيًا مع بقاء API/store/browser/XLSX side effects في الحدود التشغيلية المناسبة.

الموديولات/المراحل المغلقة تشمل:

- `reportDomain.ts` + `reportTypes.ts`.
- `recommendationViewModel.ts`.
- `studentAnalyticsViewModel.ts` + `studentEvidenceViewModel.ts`.
- `scopedAnalyticsViewModel.ts`.
- `scopedComparisonViewModel.ts`.
- directed quiz analytics.
- institutional report projection.
- scoped student focus.
- scoped skill report.
- student weekly plan.
- student report actions.
- student skill rows.
- student readiness.
- student learning loop.
- student report scope.
- student remediation fallback.
- scoped remediation fallback.
- scoped export rows.
- student weekly-plan presentation.
- student smart-remediation presentation.
- student selected-skill presentation.

آخر baseline حديث يثبت `pages/Reports.tsx = 2607` سطر مع نجاح عقود Reports وGlobal Student Journey.

## Scoped Export Rows ✅

- نقل row projection الخاصة بتصدير تقارير المهارات والطلاب إلى `pages/Reports/scopedExportRowsViewModel.ts`.
- بقي `loadXlsx` وإنشاء workbook و`writeFile` داخل `Reports.tsx`.
- preserved headers/rows حسب التنفيذ الفعلي الحالي.
- direct boundary + role ownership + full Safety Gate: PASS.

## Workflow Race Safety ✅

تم إصلاح race condition في Refactor V2 workflow:

- concurrency key موحد للـpush/PR على safe branch.
- checkout exact head.
- winner واحد فقط يمكنه الكتابة.
- remote head verification قبل auto-commit.
- stale run يتوقف بأمان إذا تحرك الفرع.
- لا force-push.

العقد `smoke-refactor-workflow-race-contract.mjs` أصبح جزءًا دائمًا من Safety Gate.

## Schools — Portfolio Projection & Card Readiness ✅

- portfolio filtering/counts أصبحت مبنية على projected rows بدل إعادة حساب snapshots لكل card.
- card readiness actions انتقلت إلى `schoolCardReadinessViewModel.ts`.
- تم الحفاظ على live access-code expiry semantics عبر `now: Date.now()`؛ لم يتم إدخال memoization تجمد صلاحية الأكواد.
- تم إصلاح idempotency للـexecutors القديمة حتى تتعرف على architecture الأحدث بدل محاولة إعادة تطبيق شكل قديم.

## Schools — Portfolio Card Presentation ✅

- نقل card JSX الكبير إلى `SchoolPortfolioCard.tsx`.
- manager احتفظ بـselected school/tab/action-menu/delete-review orchestration.
- child لا يملك Store/API/browser state.
- Safety Gate + Phase Review: PASS.
- `SchoolsManager.tsx` انخفض من `3034` إلى `2873` تقريبًا في هذه السلسلة.

## Schools — Workspace Controls Presentation ✅

- نقل شريط إدارة المدرسة + delete-confirmation presentation إلى `SchoolWorkspaceControlsPanel.tsx`.
- rename/save/delete/export/print/copy orchestration بقي في manager.
- تم تحويل rename inline flow إلى handler صريح `openSchoolRenameModal` بدون تغيير save/refresh/error semantics.
- أثناء الإغلاق تم تحديث Batch 136 contract ليتبع ownership الصحيح للـportfolio action menu.
- تم أيضًا توسيع idempotency للـcard-readiness executor حتى يقبل ownership داخل `SchoolPortfolioCard`.
- Safety Gate: PASS.
- `SchoolsManager.tsx` أصبح قرابة `2787` سطرًا.

## Schools — Visible Launch Board Presentation ✅

- آخر مرحلة مغلقة في هذا checkpoint.
- نقل الـvisible readiness/5-step launch board إلى `SchoolLaunchBoardPanel.tsx`.
- manager احتفظ بـback reset، `setActiveTab` و`expandedSchoolStep` orchestration.
- child يحافظ على:
  - `school-ux-launch-board`.
  - `school-ux-next-action`.
  - `school-ux-step-*`.
  - readiness thresholds/progress.
  - five-step status/title/metric presentation.
- direct contract يمنع Store/API/browser/state setters داخل child.
- budget: child <= 150 سطرًا، manager <= 2725 بعد apply.
- Safety Gate run `32186249911`: baseline **56/56 PASS**.
- post-apply Phase Review: **PASS**.
- auto-commit: **PASS**.
- verified head: `45cb2ba6dc2a7c0e0bfb33ed802ec0f9d915883c`.
- `SchoolsManager.tsx`: قرابة **2710** سطرًا.

## CI failures التي تم إصلاحها بدون إضعاف العقود

خلال هذه السلسلة ظهرت failures صحيحة في أدوات refactor نفسها، وليس regressions في المنتج:

1. stale executor لم يتعرف على portfolio projection بعد تطورها -> idempotency recognition fix.
2. card presentation executor استخدم splice index محسوب قبل تغيير import بطول مختلف -> تم ترتيب splice قبل import replacement.
3. readiness contract كان يطالب بملكية داخل manager بعد انتقالها للchild -> العقد أصبح transitional/ownership-aware مع نفس assertions الدلالية.
4. Batch 136 كان يخلط action-menu state ownership مع card text ownership -> تم فصل التحقق على manager + `SchoolPortfolioCard`.
5. card readiness executor لم يتعرف على extraction الأحدث -> أصبح يقبل inline projected أو presentation-owned state مع نفس live time semantics.

في كل الحالات baseline بقي أخضر أو أوقف التغيير قبل الحفظ؛ لم يتم force-push ولم يتم تخفيف behavior contract.

## آخر حالة فحص

على head `45cb2ba...`:

- PR #3: open, draft, mergeable, not merged.
- frontend typecheck/build: PASS.
- API typecheck/build: PASS.
- architecture/module boundaries: PASS.
- Schools contracts: PASS.
- Reports contracts: PASS.
- global student journey: PASS.
- student learning journey: PASS.
- results/routes/runtime: PASS.
- quiz integrity/auth/API security: PASS.
- workflow race safety: PASS.
- unresolved runtime relative imports: 0.
- dependency cycles: 0.

Vercel status على نفس الرأس: failure من `build-rate-limit`; GitHub production build نفسه PASS.

## الانتقال من Refactor Hotspot إلى Stabilization

بعد وصول `SchoolsManager` إلى ~2710 مع ownership أوضح، لا نواصل تفكيكًا ميكانيكيًا لمجرد line count. الأولوية الجديدة:

1. fresh repo audit على الرأس الحالي.
2. hotspot ranking حسب coupling/risk/change frequency.
3. duplicate/dead code/hard-coded URL/API-in-presentation/store coupling scan.
4. `PROJECT_MAP` وownership notes.
5. full product journey verification.
6. dependency/security remediation controlled.
7. production readiness.
8. Freeze -> Safety Gate -> compare vs main -> explicit approval -> merge.
