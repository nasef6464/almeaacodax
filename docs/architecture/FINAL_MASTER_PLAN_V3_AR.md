# ALMEAA — Final Master Plan V3

> آخر إعادة مواءمة: 2026-09-01. هذه الوثيقة هي خطة المنتج والتنفيذ الموحدة. مصدر الحقيقة التنفيذي هو Git HEAD الحالي و`CODEX_EXECUTION_STATE.md`، وليست ملفات ZIP أو ذاكرة المحادثات.

للأهداف المستقلة الجاهزة للنسخ في محادثة جديدة، استخدم `CHAT_EXECUTION_GOALS_AR.md` هدفًا واحدًا في كل مرة؛ لا يُعد هذا الملف مصدر حقيقة بديلًا.

## الهدف النهائي

ALMEAA ليست منصة اختبارات فقط. هي:

`Educational Platform + LMS + Assessment Engine + School Operations Platform + White-label Product`.

النتيجة المطلوبة هي منتج يمكن تسليمه لعميل حقيقي بنشر مستقل، واسم وهوية وإعدادات وميزات ودومين وموفرين مختلفين، من دون نسخ الـCore أو إعادة بناء الكود لكل عميل.

## القرار التجاري والمعماري

- النموذج الحالي: نسخة مستقلة لكل Customer/Buyer، ويمكن أن تضم النسخة عدة مدارس.
- لكل مشتري Deployment وDatabase وHosting وDomain وBranding وIntegrations مستقلة.
- لا Multi-Tenant مركزي ولا `tenantId` شامل بلا قرار Product صريح.
- الأسلوب: Modular Monolith مع إبقاء Vite في الجذر وRender API داخل `server/`.
- ممنوع Big Bang Rewrite أو Microservices مبكرة أو حذف Legacy بلا انتقال أو تغيير العقود العامة أثناء refactor بنيوي.

مسار الانتقال الثابت:

```text
Existing System → Extract → Adapter → Improve → Test → Replace Gradually
```

## نموذج المنتج الأساسي

```text
Path → Level/Stage اختياري → Subject → Subject Learning Space
                                      ├─ Courses
                                      ├─ Foundation
                                      ├─ Practice
                                      ├─ Assessments
                                      └─ Library
```

`Learning Space` هو تجربة التعلم التي يستهلكها الطالب، وليس تعريف Course ولا Assessment Definition.

القاعدة: `Definition ≠ Classification ≠ Placement ≠ Assignment ≠ Access ≠ Consumption`.

مسار الطالب: `Learn → Practice → Assess → Analyze → Intervene → Relearn → Reassess`.

## مقياس الحقيقة

كل Capability وكل رقم وكل ادعاء جاهزية يستخدم واحدة فقط من الحالات التالية:

| الحالة | معناها |
|---|---|
| `VERIFIED` | مثبت باختبار مناسب على البيئة المحددة مع Evidence قابل للتتبع |
| `PARTIAL` | جزء مثبت، لكن توجد فجوة معلنة تمنع اعتبار القدرة مكتملة |
| `NOT PROVEN` | موجود أو متوقع، لكن لا يوجد دليل كافٍ |
| `BLOCKED` | لا يمكن استكمال الإثبات دون قرار مالك أو بيئة أو وصول خارجي |

نجاح typecheck أو smoke نصي لا يثبت وحده رحلة منتج أو سعة إنتاجية.

## الحالة الحالية في 2026-09-01

| المسار | الحالة | ما ثبت | الفجوة التي تمنع الإغلاق التجاري |
|---|---|---|---|
| Control plane والعقود المعمارية | `VERIFIED` | خرائط وتحقيقات وبوابات تمنع فقد routes/imports/cycles | تستمر الصيانة مع كل Batch |
| Scale/Security P0 | `PARTIAL` | عدة مخاطر عولجت وبوابات الأمن قائمة | شهادة حمل إنتاجية وقياسات staging غير مثبتة |
| Assessment backend boundary | `PARTIAL` | definition/version/result adapters، assignment/attempt/response foundations، controlled mirror، reconciliation، rollback على Mongo معزول | Legacy ما زال authoritative افتراضيًا، ولا production opt-in |
| Assessment data evolution Phase 5 | `VERIFIED` عند الحد الآمن فقط | dual-write recovery وbounded reconciliation وresult-only backfill وrollback ثبتت معزولًا | لا يعني cutover أو historical attempt/response reconstruction أو retirement |
| Assessment UI/product journeys | `PARTIAL` | HTTP journeys وE2E عام مثبتان | E2E مركز للرحلات الخمس وproduct completion matrix ما زالا مطلوبين |
| Schools operations | `PARTIAL` | إنشاء مدرسة/فصول/طلاب/import/supervisor scope ومسارات إدارة عديدة مثبتة؛ استخراج الملكية مستمر | إغلاق teacher/parent/access/basic reports وكل زر وحالة UI→API→DB→RBAC كـSchool MVP |
| Learning Space boundary | `PARTIAL` | vocabulary وبعض boundaries موجودة | Canonical runtime والحد الفاصل عن Course/Assessment غير مغلقين |
| Results vs Reports | `PARTIAL` | عدة view models وscoped reports موجودة | عقد رسمي: Result لمحاولة واحدة، Report تحليل تاريخي، مع exports مثبتة |
| White-label/ProductConfig | `NOT PROVEN` | اتجاه معماري فقط | schema/runtime/config UI/feature flags/providers ودليل نشر عميل مستقل |
| Production scale certification | `NOT PROVEN` | bounded CI checks فقط | staging profile وdatasets وSLOs وتقرير حمل قابل للإعادة |

## ترتيب التنفيذ المعتمد من الآن

الترتيب ليس ترقيم refactor قديمًا؛ هو ترتيب بوابات تقرب المنتج من البيع. لا نترك Batch جارية في منتصفها: نغلق checkpoint الحالي أولًا، ثم ننتقل حسب القائمة التالية.

### Gate 0 — إغلاق checkpoint الحالي للمدارس

- توثيق وإثبات آخر استخراج صغير موجود على HEAD.
- عدم فتح سلسلة جديدة من تفكيك `SchoolsManager.tsx` لمجرد خفض عدد الأسطر.
- كل استخراج لاحق يجب أن يخدم فجوة School MVP أو يقلل مخاطرة تغيير حقيقية.

دليل الخروج: Git/CI متطابقان، حالة التنفيذ محدثة، ولا توجد دفعة كود غير موثقة.

### Gate 1 — Assessment Commercial Closure

إغلاق الوحدة كمنتج مستقل قابل للبيع:

```text
Assessment
├─ Definition
├─ Builder
├─ Question Selection
├─ Assignment
├─ Runner
├─ Sessions
├─ Attempts
├─ Responses
├─ Scoring
├─ Results
└─ Analytics
```

العمل يبدأ بـcapability/evidence matrix لا بإعادة هيكلة جديدة. كل فجوة تتحول إلى vertical slice صغير. الأولوية للرحلات الخمس المخصصة للواجهة، failure/retry/resume behavior، وسياسة الجلسة/الوقت المعتمدة. لا production dual-write أو cutover قبل دليل معزول كامل وقرار تشغيل منفصل.

دليل الخروج: الرحلات العادية والموجهة والمحاكي والنتائج التاريخية مثبتة عبر UI + API + persistence + RBAC، مع rollback drill وتقرير Phase Completion.

### Gate 2 — Subject Learning Space Boundary

- تثبيت `Path → Level → Subject → Learning Space` كـcanonical navigation/runtime.
- تحديد canonical page/runtime بين `GenericPathPage` و`LearningSection` و`SubjectLearningPage`.
- إبقاء Courses وAssessment Definitions كتعريفات مستقلة تعرض داخل Learning Space ولا تملكه.
- الحفاظ على URLs وdeep links الحالية.

دليل الخروج: خريطة ownership واحدة، مسار طالب مثبت، وعدم وجود تحميل عالمي غير محدود للبيانات.

### Gate 3 — Sellable School MVP

النطاق التجاري الأول:

- Schools، Classes، Students، Teachers، Supervisors، Parents.
- Excel import وcredentials/access management.
- Package/Path/Course assignment.
- Student/Class/School basic reports.

لا تعد القدرة مكتملة إلا بعد إثبات Frontend + API + Database + RBAC + loading/error/success states ببيانات حقيقية. العلاقات الإلزامية موثقة في `CODEX_SCHOOLS_HANDOFF.md`، والتنظيف المدمر للبيانات اليتيمة يظل approval-gated.

دليل الخروج: مدرسة من الصفر حتى تسليم الدخول والتقرير، وكل دور يرى نطاقه فقط، وكل زر ظاهر إما `VERIFIED` أو blocker موثق بمالك.

### Gate 4 — Results and Reports Product Boundary

```text
Result  = قراءة محاولة واحدة وقرارها
Report  = تحليل تاريخي عبر محاولات/طلاب/فصول/مدارس
```

الإصدار التجاري الأول: Student Report، Class Report، School Report، PDF Export، Excel Export. لا preaggregation أو cache جديد قبل قياس query shape والحاجة الفعلية.

### Gate 5 — ProductConfig / White-label Foundation

```text
ProductConfig
├─ Name / Logo / Colors
├─ Domain and navigation
├─ Features
├─ Settings and policies
└─ Providers
```

ممنوع `if customerName` أو نسخ صفحات/Core. كل طلب عميل يصنف إلى Branding أو Feature Flag أو School Configuration أو Policy أو Domain Capability أو Provider Adapter أو Extension نادر موثق.

دليل الخروج: إنشاء build/deployment لعلامة ثانية من config فقط مع smoke أساسي، من دون تعديل Core.

### Gate 6 — Questions, Curriculum, Courses and Operations Closure

- Questions: bank/authoring/types/classification/search/import/review/analytics.
- Curriculum/Learning: فصل المنهج عن المحتوى والتقدم.
- Courses: فصل Learning Product عن Package Commerce Product.
- Composition: تقسيم API/store/admin shell أثناء تطوير domains فقط.
- Delivery: observability، backup/restore، release checklist، load certification.

### Future backlog — لا يبدأ قبل الأساس

AI، Mobile native، Ads، Affiliate، BNPL، interactive video، SCORM، integrations المتقدمة، media/search/certification extensions. تصنف وتقدر، لكنها لا تؤخر Gates 1–5 ولا تعلن كقدرات مكتملة دون دليل.

## قواعد اختيار أي Batch

قبل بدء Batch:

1. راجع الخطة وGit HEAD وحالة مساحة العمل.
2. حدد فجوة منتج واحدة وصاحبها domain owner.
3. اكتب Purpose وExit Evidence قبل التعديل.
4. نفذ أصغر vertical slice أو extraction يخدم تلك الفجوة.
5. اختبر العقود والرحلة المناسبة، ثم CI.
6. حدّث `CODEX_EXECUTION_STATE` و`MODULE_CATALOG` و`CHANGE_MAP` و`DATA_ACCESS_MAP` عند تأثرها.

لا تُختار Batch لأن ملفًا كبيرًا فقط؛ تفكيك `Dashboard` أو `Reports` أو `QuizPage` أو `useStore` يحدث أثناء إغلاق domain فعلي.

## سجل التسليم الإلزامي

كل Batch تسجل:

- Batch Name وPurpose.
- Changed Files.
- Architecture Impact وProduct Impact.
- Tests وCI Evidence.
- Commit وPush state.
- Risks وstatus (`VERIFIED/PARTIAL/NOT PROVEN/BLOCKED`).
- Next Step واحد دقيق.

## حواجز البيانات والتوسع

- راقب large arrays وpagination/cursors وindexes/query shapes وpayload sizes.
- لا `find({})` جديد على collection نامية في مسار مستخدم.
- jobs الحرجة تستخدم queue/lock/idempotency، لا process-local scheduling.
- realtime لا يستخدم Mongo polling لكل مستخدم.
- لا migration مدمرة أو historical reconstruction من بيانات ناقصة.
- لا ادعاء 80k سؤال أو 30k مستخدم أو ملايين النتائج دون تقرير load قابل للإعادة.

## Git والتسليم

- الفرع الحالي هو مصدر الحقيقة؛ لا تستبدله بـZIP أو snapshot أقدم.
- كل Batch commit مركز بعد بوابات مناسبة، ثم push ومراجعة CI.
- لا merge إلى `main` قبل Phase/Product Gate مناسب.
- الملفات المولدة أو تغييرات المستخدم غير المرتبطة لا تُضم إلى commit بالخطأ.

## التوقف الإلزامي

يطلب قرار المالك فقط عند حذف/تغيير بيانات، migration مدمرة، إزالة Legacy نهائية، تغيير جوهري في RBAC أو Scoring أو Payments، تكلفة خارجية، أو خطر Data Loss. ما عدا ذلك يختار الفريق أفضل مسار هندسي داخل الحدود ويستمر.
