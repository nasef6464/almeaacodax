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

## أخطاء اكتُشفت وأُصلحت أثناء مرحلة الاستيراد

- كشف الفحص الشامل تراجعًا وظيفيًا في تدفق `Reports -> QuizzesManager -> UnifiedQuizBuilder`: سياق المهارة/الطالب/المجموعة كان يظهر للمستخدم لكنه لا ينتقل إلى payload الحفظ في الـbuilder الموحد. تم إصلاحه بتمرير defaults صريحة وحفظ `mode/skillIds/targetUserIds/targetGroupIds` مع الحفاظ على editing values عند تعديل اختبار موجود.
- كشف `smoke:performance` أن `studentEvidenceSummary` في `pages/Reports.tsx` كان يُحسب دون عرضه. تم إصلاح السلوك بإعادة عرض حجم الدليل بدل إضعاف الاختبار.
- بعض عقود الأداء كانت مربوطة بالشكل القديم للملفات بعد فصل bootstrap الخاص بالـAPI. تم تعديل العقود لتتحقق من السلوك الفعلي: DB connect قبل التشغيل، و`server.listen` قبل startup maintenance غير الحاجبة، مع بقاء ترتيب taxonomy ثم admin.
- عقد `DATA_BOOTSTRAP_BLOCKING_PREFIXES` كان يفحص substring على `App.tsx` كله، فأعطى failure كاذبًا بسبب قائمة أخرى. تم تضييقه إلى القائمة المقصودة فقط بدون تغيير منطق التطبيق.

## المرحلة المغلقة ✅ — Schools Readiness & View-Model Decomposition

**الحالة: مغلقة بنجاح.**

- Direct readiness logic contract: **PASS**.
- Quick Gate المخصص للمدارس: **PASS**.
- Full Schools Readiness Phase Review: **PASS**.
- Refactor V2 Safety Gate run `#121`: **PASS** على commit `85c7dcaf3ec98e51516dcee89b0c40c2a935b76a`.
- تم جعل اختبار readiness الجديد جزءًا دائمًا من Safety Gate، وليس اختبارًا مؤقتًا للمرحلة فقط.
- frontend + API typecheck/build: **PASS**.
- architecture + module boundaries + performance + routes + runtime + quiz integrity + auth/API security: **PASS**.

### ما تم فصله

1. `getStudentsForSchool` أصبح pure selector داخل `dashboards/admin/SchoolsManager/readinessViewModel.ts` ويغطي علاقات `schoolId`, school/class `studentIds`, و`groupIds`.
2. operational snapshot وreadiness score وdraft/demo hiding خرجت من React component إلى نفس الـview-model.
3. readiness checks وnext action وportfolio rows وportfolio summary أصبحت pure functions قابلة للاختبار المباشر.
4. `SchoolsManager.tsx` أصبح يستدعي هذه الحسابات عبر dependencies صريحة بدل امتلاك منطق الأعمال داخل component.
5. تمت إضافة `scripts/smoke-schools-readiness-viewmodel-contract.mjs` ويغطي 4 مسارات لعلاقة الطالب و5 أبعاد readiness وحالات demo/draft والـpackage/code expiry والـportfolio priority.
6. تمت إضافة `tools/refactor/quick-check.mjs` لتقليل زمن دورة العمل مع الإبقاء على Full Gate عند إغلاق المرحلة.

### خطأ تم اكتشافه أثناء الاستخراج

- أول Quick Gate كشف وجود call sites إضافية لـ`getStudentsForSchool` داخل selected-school workspace وبطاقات المدارس. لم يتم تجاوز الفشل؛ تم إصلاح جميع المواقع وتمرير `students` صراحة إلى pure selector ثم إعادة Quick + Full Gate حتى النجاح.

## المرحلة الحالية — Schools Workspace & Presentation Decomposition

**الحالة: أول دفعة Workspace Full Phase Review PASS؛ تنتظر Safety Gate القياسي.**

الهدف التالي هو تقليل مسؤوليات `SchoolsManager.tsx` من جهة العرض والـworkspace بدون تغيير أي action أو API call أو صلاحية. الأولوية:

1. استخراج view-models الخاصة بالمدرسة المحددة: الطلاب، المشرفون، أولياء الأمور، الفصول، gaps، seats/codes/package summaries.
2. فصل أقسام العرض الكبيرة إلى components محددة المدخلات بدل تمرير store كامل أو استيراد parent component.
3. تقليل re-computation داخل render عبر pure selectors/memos واضحة وقابلة للاختبار.
4. الحفاظ على كل إجراءات الإضافة/الربط/الاستيراد/الحذف/التحقق كما هي، ثم نقل orchestration لاحقًا بعد تثبيت حدود العرض.
5. بعد استقرار workspace: مراجعة وتقسيم `SchoolPackagesPanel.tsx` و`SchoolRelationsPanel.tsx`، ثم إنهاء hotspot المدارس والانتقال إلى `pages/Reports.tsx`.

### شروط القبول

- لا تغيير في أسماء الأزرار/التبويبات/التدفقات أو API methods كجزء من الفصل البنيوي.
- عدم تغيير معنى الطلاب/المشرفين/الأهل المحسوبين أو readiness/gaps/seats/codes.
- direct logic tests لأي selector/view-model جديد.
- Quick Gate بعد كل دفعة صغيرة.
- Full Phase Review + Safety Gate أخضر قبل إعلان إغلاق المرحلة.

## نظام الفحص من مستويين

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

- Schools relationship workspace Full Phase Review: **PASS** قبل إنشاء commit الدفعة.

## دفعة Schools Workspace الثانية — Decision / Handover View-Model

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate القياسي على commit الناتج.**

- نقل readiness checks والـoperational warnings وقرار التسليم والـoperating steps والـdecision cards والـlaunch plan والـhandover message إلى `SchoolsManager/workspaceViewModel.ts`.
- الهدف: إبقاء `SchoolsManager.tsx` مسؤولًا عن orchestration/actions/UI فقط، وتقليل منطق القرار التجاري/التشغيلي المكرر داخل الـcomponent.
- العقد المباشر يغطي المدرسة الفارغة، المدرسة الجاهزة 5/5، استهلاك المقاعد، الطلاب بلا فصل/ولي أمر، حالات save verification، وحساب 10,000 نموذج لمنع انحدار حسابي واضح.

- أثناء Quick Gate ظهر أن عقد school-management الخاص بأكواد الدخول كان مربوطًا بشكل تنفيذ قديم (`payload`/نسخ studentIds). تمت مراجعة `auth.routes.ts` وتأكد أن السلوك الحالي يحفظ `schoolId` و`groupIds` للمستخدم، يضيف الطالب إلى `Group.studentIds`، ويعيد مزامنة `totalStudents`. تم تحديث العقد ليتحقق من هذه الدلالات الحالية بدل الشكل القديم، بدون تخفيف السلوك المطلوب.

- Schools decision/handover workspace Full Phase Review: **PASS** قبل إنشاء commit الدفعة.

## دفعة Schools Reports Presentation

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate + Vercel Preview على commit الإغلاق.**

- نقل report tab من God Component إلى feature-owned presentation composition.
- حافظت الدفعة على readiness decision، downloads/print، blocking gaps/navigation، loading/error/empty states، performance metrics، weakest skills، class summaries.
- presentation children لا تستورد API أو global store.
- `smoke-school-management-contract.mjs` أصبح يتبع ownership الجديد بدل إجبار markup على البقاء في parent.
- أضيف direct boundary contract جديد وحدود أحجام للملفات المستخرجة.

## دفعة Schools Student Roster Presentation

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate + Vercel Preview checkpoint.**

- فصل roster UI مع الحفاظ على search/class filter/current-class display/reassignment/confirmations/removal/pagination.
- mutation functions لم تنتقل إلى child؛ لا API ولا global store imports.
- direct boundary contract جديد يمنع رجوع markup إلى God Component ويثبت wiring والـconfirm/pending guards.

## دفعة Schools Class Operating Card Presentation

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate + Vercel Preview checkpoint.**

- فصل card presentation عن God Component مع إبقاء API/store/mutations/confirmations في orchestration layer.
- boundary contract جديد يثبت أن child لا يستورد store أو API ويمنع رجوع markup إلى `SchoolsManager.tsx`.
- school management وrelationship audit أصبحا يتبعان ownership الجديد بدل الاعتماد على موقع النص القديم.

## دفعة Schools Workspace Courses/Classes Presentation

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate + Vercel Preview checkpoint.**

- فصل school courses presentation وclasses shell عن `SchoolsManager.tsx`.
- mutations بقيت في orchestration layer؛ child components لا تستورد store/API.
- تم تحديث source-text contracts لتتبع ownership الجديد بدل الاعتماد على موقع النص القديم.

## دفعة Schools Overview Operators Presentation

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate + Vercel Preview checkpoint.**

- تم إخراج single-student presentation وschool-wide supervisor scope presentation من `SchoolsManager.tsx`.
- API/store mutations والتأكيدات بقيت في orchestration layer، ولم تنتقل إلى child components.
- تم تحديث عقود school management وrelationship audit لتتبع ownership الجديد عبر الملفات الجديدة.

## دفعة Schools Overview Operations Summary

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate + Vercel Preview checkpoint.**

- تم إخراج focus/metrics/capacity/class-operating summary من `SchoolsManager.tsx`.
- navigation/scroll orchestration بقي في parent، والـchild presentation-only.
- تم تحديث عقود المدرسة لتقرأ ownership الجديد دون إسقاط السلوك السابق.

## دفعة Schools Command Center Presentation

**الحالة: Full Phase Review PASS؛ تنتظر Safety Gate + Vercel Preview checkpoint.**

- تم إخراج command-center/readiness/delivery/primary-actions presentation من `SchoolsManager.tsx`.
- orchestration بقي في parent والـchild presentation-only.
- عقود المدرسة والـrelationship audit تقرأ ownership الجديد دون تغيير السلوك أو العقود التشغيلية.
