# نقطة متابعة Refactor V2 الحالية

هذا الملف هو المختصر التشغيلي السريع بجانب السجل الكامل `REFACTOR_V2_EXECUTION_LEDGER_AR.md`.

## الهدف الثابت

إعادة تنظيم ALMEAA كـ **Modular Monolith** واضح وقابل للتوسع، بدون تغيير سلوك المنتج أو الـURLs أو API contracts أو auth/RBAC أو quiz integrity أو payment/access semantics أو بيانات الإنتاج.

## ما أصبح ثابتًا

- العمل البنيوي على `refactor/repository-v2-safe`، و`main` لا يُدمج معه قبل Release Candidate مغلق بالكامل.
- Architecture Gate يمنع فقد routes/mounts وruntime broken imports وdependency cycles وتجاوز budget.
- Module Boundary Gate يحمي الوحدات الجديدة وحدود Schools child/parent.
- Quick Gate أثناء الدفعات الصغيرة، وFull Safety Gate عند إغلاق الدفعات.
- Vercel Preview Gate شرط إغلاق إضافي، لكنه لا يحول مشكلة quota خارجية إلى عيب كود.
- المرجع المحلي للـAgents: `docs/development/LOCAL_AGENT_SYNC_AR.md` والسكربت `tools/sync-refactor-local.ps1`.

## آخر فحص كود مؤكد

على commit `d32c5b24186606d10c4c453a66c7ff6dae743946`:

- frontend typecheck: **PASS**.
- API typecheck: **PASS**.
- frontend production build: **PASS**.
- API production build: **PASS**.
- architecture + module boundaries: **PASS**.
- Schools management/XLSX/import/readiness/relationships/workspace/roster/package/access/presentation contracts: **PASS**.
- performance + package revenue + relationship audit: **PASS**.
- routes + runtime source + quiz integrity + auth security + API security: **PASS**.
- repository audit: `49` frontend routes، `236` backend route entries، `25` router mounts، `0` unresolved runtime imports، `0` dependency cycles، و`82` hotspot فوق 400 سطر مقابل budget `83`.
- `SchoolsManager.tsx`: `4308` أسطر في آخر import contract.

## حالة Vercel الحالية

آخر failure ظهر بعنوان `build-rate-limit` من Vercel Hobby بسبب كثرة Preview builds خلال الساعة، وليس failure في TypeScript أو build داخل GitHub Actions.

لذلك:

- لا يتم تخفيف Vercel Preview Gate.
- لا تُعلن المرحلة مغلقة نهائيًا حتى يعود Preview إلى `success`.
- يتم تجميع التعديلات في commits أكبر ومنطقية وتقليل عدد branch pushes لتجنب استهلاك quota بلا داعٍ.

## الدفعة الجاري تجهيزها

`Schools Relations Presentation`:

1. فصل حالة الجاهزية وإحصاءات العلاقات إلى `SchoolRelationsStatusPanel.tsx`.
2. فصل نموذج إضافة مدير/مشرف إلى `SchoolQuickSupervisorCard.tsx`.
3. إبقاء API/store/orchestration في parent وعدم نقلها إلى presentation children.
4. استخدام عقد `QuickSupervisorDraft` مشترك داخل `SchoolsManager/contracts.ts` بدل تكرار الشكل inline.
5. إضافة boundary contracts جديدة لكلا الجزأين وجعلهما جزءًا من Safety Gate.

الدفعة لا تُغلق إلا بعد Full Gate أخضر ثم Preview ناجح.

## المسار التالي

بعد إغلاق Schools Relations Presentation:

1. استخراج reports tab الخاص بالمدرسة من `SchoolsManager.tsx` إلى presentation/read-model boundaries أصغر.
2. استخراج student roster/table presentation من `SchoolsManager.tsx` مع إبقاء actions في orchestration layer.
3. إغلاق hotspot المدارس بعد فحص شامل.
4. الانتقال إلى `pages/Reports.tsx` ثم `server/src/routes/content.routes.ts` و`server/src/routes/quiz.routes.ts` بنفس البروتوكول.

## قاعدة الاستمرار لأي Agent

ابدأ دائمًا من:

`AGENTS.md` -> `docs/architecture/PROJECT_MAP.md` -> هذا الملف -> `REFACTOR_V2_EXECUTION_LEDGER_AR.md` -> آخر Safety Gate.

ولا تعتبر أي refactor ناجحًا لمجرد أن الملفات أصبحت أصغر؛ يجب أن يبقى السلوك والعقود والفحص والنشر التجريبي مثبتين.
