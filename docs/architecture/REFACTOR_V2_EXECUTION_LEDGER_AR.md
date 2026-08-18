# سجل تنفيذ Refactor V2 — ALMEAA

> هذا الملف هو المرجع التشغيلي المستمر أثناء إعادة الهيكلة.
> الفرع الوحيد للعمل الحالي: `refactor/repository-v2-safe`.

## الهدف الثابت

تحويل المنصة تدريجيًا إلى **Modular Monolith** واضح الحدود، أسهل في الصيانة والتوسع والعمل بواسطة المطورين والـAgents، مع الحفاظ الكامل على منطق المنتج والعقود التشغيلية الحالية أثناء النقل البنيوي.

### قيود لا يتم كسرها

- لا تغيير في frontend URLs أو API methods/paths أو router mounts بسبب refactor بنيوي.
- لا تغيير في auth/RBAC أو quiz scoring/integrity أو payment/access semantics.
- لا destructive Mongo migration ولا تغيير أسماء environment variables أو جذور Vercel/Render/Docker.
- لا Big Bang rewrite لملف ضخم. كل concern يُستخرج على دفعة صغيرة ثم يُفحص.
- لا circular dependencies ولا unresolved runtime imports.
- لا تخفيف Architecture Budget فقط لتمرير CI.
- أي تحسن في الحدود أو الاختبارات يتحول إلى gate دائم كلما كان ذلك عمليًا.
- `main` وProduction لا يتم تحديثهما أثناء وجود مرحلة غير مغلقة بالكامل.

## ما تم إنجازه قبل دفعة الاستيراد

- Baseline معماري ثابت + repository audit + architecture gate + module boundary gate.
- الوصول إلى `0` runtime dependency cycles و`0` unresolved runtime relative imports.
- فك دورة notifications بدون تغيير API العام.
- فصل عقود وواجهات فرعية من `SchoolsManager` وإزالة child-to-parent imports.
- فصل `dataAdapters.ts` من `SchoolsManager`.
- فصل بنية التصدير والطباعة إلى `SchoolsManager/exportHelpers.ts` مع الحفاظ على escape/safety contract.
- إزالة كود CSV قديم غير قابل للتنفيذ.

## المرحلة المغلقة ✅ — Schools Import Decomposition

**الحالة: مغلقة بنجاح.**

- Phase Review: **PASS**.
- Refactor V2 Safety Gate run `#100`: **PASS** على commit `137e69d3399e9d22f2246e89da16eefb6224808f`.
- `SchoolsManager.tsx`: أصبح `4654` سطرًا في اختبار المرحلة بدل بقاء parsing داخله.
- `importRowParsing.ts`: `127` سطرًا، pure وبدون browser/XLSX dependency.
- `importFileReaders.ts`: `33` سطرًا ويستخدم safe lazy XLSX runtime.
- اختبار 10,000 صف: **PASS** في قرابة `6 ms` في CI، مع safety ceiling واسع لمنع أي انحدار O(n²).
- School Management: `22/22 PASS`.
- XLSX Safety: `18/18 PASS`.
- School relationship deep audit: `10/10 PASS`, `0 warnings`.
- Frontend typecheck/build + API typecheck/build: **PASS**.
- Performance + architecture + module boundaries + route loading + runtime source + quiz integrity + auth security + API security: **PASS**.
- خريطة العقود بقيت: `49` frontend routes، `236` backend route entries، `25` router mounts، `0` unresolved runtime imports، `0` dependency cycles.

### ما تم فصله في هذه المرحلة

1. تطبيع headers العربية/الإنجليزية وتحويل rows إلى عقود الطلاب والعلاقات -> `dashboards/admin/SchoolsManager/importRowParsing.ts`.
2. قراءة CSV/TSV/XLSX واستخدام safe lazy XLSX runtime -> `dashboards/admin/SchoolsManager/importFileReaders.ts`.
3. اختبار تنفيذي مباشر لمنطق parsing والـaliases والأخطاء والduplicates والأداء -> `scripts/smoke-schools-import-parsing-contract.mjs`.
4. Phase review شامل -> `tools/refactor/phase-review-schools-import.mjs`.
5. إضافة parser/performance checks إلى `Refactor V2 Safety Gate` كحماية دائمة.

## أخطاء اكتُشفت وأُصلحت أثناء المرحلة

- كشف الفحص الشامل تراجعًا وظيفيًا في تدفق `Reports -> QuizzesManager -> UnifiedQuizBuilder`: سياق المهارة/الطالب/المجموعة كان يظهر للمستخدم لكنه لا ينتقل إلى payload الحفظ في الـbuilder الموحد. تم إصلاحه بتمرير defaults صريحة وحفظ `mode/skillIds/targetUserIds/targetGroupIds` مع الحفاظ على editing values عند تعديل اختبار موجود.
- كشف `smoke:performance` أن `studentEvidenceSummary` في `pages/Reports.tsx` كان يُحسب دون عرضه. تم إصلاح السلوك بإعادة عرض حجم الدليل بدل إضعاف الاختبار.
- بعض عقود الأداء كانت مربوطة بالشكل القديم للملفات بعد فصل bootstrap الخاص بالـAPI. تم تعديل العقود لتتحقق من السلوك الفعلي: DB connect قبل التشغيل، و`server.listen` قبل startup maintenance غير الحاجبة، مع بقاء ترتيب taxonomy ثم admin.
- عقد `DATA_BOOTSTRAP_BLOCKING_PREFIXES` كان يفحص substring على `App.tsx` كله، فأعطى failure كاذبًا بسبب قائمة أخرى. تم تضييقه إلى القائمة المقصودة فقط بدون تغيير منطق التطبيق.
- GitHub Actions استطاع إنشاء commit المرحلة بعد الفحص لكنه مُنع من تحديث workflow file لعدم امتلاك token المؤقت صلاحية workflows. لم يتم تجاوز الحماية؛ تم تحريك safe branch إلى **نفس commit المفحوص** عبر GitHub Connector المصرح له، ثم شُغّل Safety Gate القياسي ونجح.

## المرحلة الحالية — Schools Readiness & View-Model Decomposition

**الحالة: بدأت مرحلة الفحص والتفكيك التدريجي.**

الهدف: إخراج الحسابات والـview-models النقية من `SchoolsManager.tsx` قبل لمس الـUI الكبير، خصوصًا:

1. تحديد طلاب المدرسة من school/class relationships.
2. operational snapshot وreadiness score وحالة draft/demo.
3. portfolio/readiness rows وnext-action derivation.
4. إبقاء React component مسؤولًا عن orchestration/state فقط بدل احتواء حسابات الأعمال والعرض معًا.
5. بعد تثبيت هذه الحدود: تقسيم أقسام UI الكبيرة ثم مراجعة `SchoolPackagesPanel` و`SchoolRelationsPanel`.

### شروط قبول المرحلة الحالية

- عدم تغيير معنى readiness أو الطلاب المحسوبين أو حالات المدارس المخفية/الجاهزة.
- pure helpers تقبل dependencies صراحة ولا تعتمد على React state مخفي.
- إضافة direct logic tests لحالات: مدرسة بلا فصول، طلاب عبر schoolId، طلاب عبر studentIds، طلاب عبر class membership، package/code readiness، demo/draft detection.
- عدم زيادة hotspots أو cycles أو unresolved imports.
- targeted quick checks بعد كل تعديل صغير، ثم full phase review قبل الإغلاق.

## نظام الفحص من مستويين

لتقليل زمن الانتظار بدون تقليل الأمان:

### Quick Gate بعد التعديلات الصغيرة

`node tools/refactor/quick-check.mjs schools`

ويفحص frontend typecheck + school contracts + import parser + XLSX safety + performance + architecture + module boundaries.

توجد أيضًا profiles: `frontend`, `api`, `architecture`.

### Full Gate عند إغلاق المرحلة

1. `git diff --check`.
2. frontend + API typecheck.
3. frontend + API production build.
4. اختبارات منطقية مباشرة للجزء المستخرج.
5. performance contract ذي صلة.
6. domain smoke contracts.
7. repository audit + architecture gate + module boundary gate.
8. route/runtime/quiz/auth/API security gates.
9. إصلاح أي failure ثم إعادة المراجعة من البداية.
10. Refactor V2 Safety Gate أخضر على commit النهائي.

## ترتيب العمل بعد استقرار مدارس B2B

1. `pages/Reports.tsx` وتقسيم data aggregation / view models / export / presentation.
2. `server/src/routes/content.routes.ts` وتحويله إلى thin HTTP handlers + application services.
3. `server/src/routes/quiz.routes.ts` بنفس الأسلوب مع حماية quiz integrity الحالية.
4. `store/useStore.ts` و`services/api.ts` عبر domain slices/clients بدون كسر public facade.
5. بعد تثبيت facades والحدود، النقل المنظم إلى `src/features/*` و`server/src/modules/*` مع compatibility exports.
6. مسار مستقل لاحقًا لتحديث dependencies والثغرات؛ لا يتم استخدام `npm audit fix --force` داخل structural refactor.

## قاعدة الاستمرار

أي مطور أو Agent يكمل العمل يبدأ بهذا الترتيب:

`AGENTS.md` -> `docs/architecture/PROJECT_MAP.md` -> هذا السجل -> آخر Safety Gate.

ثم يغيّر concern واحدًا فقط في كل دفعة صغيرة، يستخدم Quick Gate أثناء العمل، ويستخدم Full Gate فقط عند إغلاق المرحلة.
