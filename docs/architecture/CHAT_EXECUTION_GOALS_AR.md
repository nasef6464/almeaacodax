# ALMEAA — خطة التنفيذ الرئيسية وأهداف المحادثات

> هذه هي **خطة التنفيذ الرئيسية** من الآن. استخدم `FINAL_MASTER_PLAN_V3_AR.md` كمرجع رؤية/معمار وحدود، و`CODEX_EXECUTION_STATE.md` كسجل الحالة والدليل. يظل Git HEAD الحقيقة الأولى. انسخ **هدفًا واحدًا فقط**، وبعد إغلاقه انتقل إلى التالي.

## طريقة البناء التجارية

```text
Sellable Strong MVP → Prove Real Use → Improve and Scale
```

- `Sellable Strong MVP`: أقل نطاق متكامل يحل مشكلة مشتري حقيقي بأمان وجودة، وليس prototype هشًا.
- `Prove Real Use`: رحلة مستخدم فعلية + API + persistence + RBAC + حالات الفشل، ثم commit وCI.
- `Improve and Scale`: تحسينات مبنية على دليل استخدام/حمل، لا توقعات أو تجميل معماري.
- لا يتوسع Goal إلا بسبب فجوة تمنع الاستخدام/البيع، أو خطر أمان/بيانات، أو دليل تشغيل يثبت الحاجة.

## نتيجة تحليل التقرير المرفق

- **الاتجاه صحيح:** هدفك هو منتج تعليمي يباع ويتكرر نشره، وليس مشروع refactor. هذا الاتجاه مثبت بالفعل في `FINAL_MASTER_PLAN_V3_AR.md` منذ إعادة مواءمة `PLAN-01`.
- **الخطة الحالية لا تحتاج إعادة بناء:** ترتيب Assessment → Learning Space → School MVP → Results/Reports → White-label يطابق قيمة المنتج واعتماداته. تغيير الترتيب الآن سيعيد العمل النظري ويؤخر التنفيذ.
- **المشكلة السابقة عولجت:** قواعد اختيار الـBatch تمنع تفكيك الملفات لمجرد الحجم، وتطلب vertical slice ودليل UI/API/data/RBAC.
- **الفجوة الإدارية الباقية:** كان ينقصك نص مستقل قصير لكل هدف تستطيع نسخه بعد إغلاق السابق؛ هذا هو دور هذا الملف.
- **المعيار الحاكم:** نجاح الاختبارات العامة لا يغلق Capability وحده، ونجاح خطوة GitHub ظاهريًا مع `continue-on-error` لا يساوي نجاح الـsuite؛ يجب فحص outcome وبوابة التجميع النهائية.
- **ما لا نفعله:** لا نوقف التنفيذ لإعادة تقييم متكرر ما دام Git والحالة والـCI يحددان الفجوة التالية بوضوح. نعيد التقييم فقط عند تغير هدف المنتج أو ظهور خطر/دليل يناقض الخطة.

## كيف تستخدم الملف

1. لا تبدأ محادثة جديدة أثناء وجود Batch غير مغلقة إلا لاستكمالها من Git HEAD.
2. انسخ الهدف الحالي كاملًا كما هو.
3. لا تعتمد ردًا يقول “تم” من دون commit مدفوع وCI ودليل إغلاق مناسب.
4. إذا انتهت المحادثة قبل الهدف، أعد إرسال **الهدف نفسه**؛ لا تنتقل للهدف التالي.
5. أي حذف بيانات أو migration مدمرة أو تغيير RBAC/Scoring/Payments يحتاج قرارك الصريح.
6. قبل بدء أي Batch داخل Goal، صنّفه بوضوح: `MVP الآن` أو `مؤجل` أو `لا قيمة تجارية الآن`.

## تقرير إغلاق إلزامي لكل Goal

لا يعتبر Goal مغلقًا دون ملف/قسم تقرير يحتوي:

- **ماذا أصبح يعمل:** الرحلات والقدرات المثبتة وروابط الأدلة.
- **ماذا أصبح قابلًا للبيع:** من المشتري/المستخدم، وما القيمة التي يستطيع استخدامها الآن.
- **ما تم تأجيله:** تحسينات لا تمنع البيع، مع سبب التأجيل وشرط إعادتها للأولوية.
- **ما المخاطر المتبقية:** `PARTIAL / NOT PROVEN / BLOCKED` والمالك أو قرار التشغيل المطلوب.
- **ما الهدف التالي:** هدف واحد فقط، ولماذا هو أعلى قيمة تالية.
- **التسليم:** changed files، commits، push، CI، وتأثير العقود/البيانات/الرجوع.

## القواعد المشتركة لكل هدف

أضف هذه القواعد فقط إذا لم تكن موجودة في `AGENTS.md` أو حالة المشروع:

```text
مصدر الحقيقة هو Git HEAD الحالي ثم:
1. docs/architecture/FINAL_MASTER_PLAN_V3_AR.md
2. docs/architecture/CODEX_EXECUTION_STATE.md
3. خرائط المجال ذات الصلة.

لا تعتمد على ZIP أو ذاكرة محادثة قديمة، ولا تعد بناء خطة عامة جديدة.
اعمل كـLead Software Architect + Engineering Manager + Product Delivery Owner.
كل تغيير يجب أن يغلق فجوة منتج أو أمان أو أداء مثبتة، لا أن يقلل الأسطر فقط.
استخدم VERIFIED / PARTIAL / NOT PROVEN / BLOCKED بدقة.
لا تعتبر smoke نصي أو typecheck دليل رحلة تشغيل.
حافظ على تغييرات المستخدم، ولا تستخدم git add .
بعد كل Batch ناجحة: اختبارات مناسبة، CI على نفس commit، commit مركز، push، تحديث حالة التنفيذ والخرائط المتأثرة، ثم الانتقال تلقائيًا.
لا تغير API/RBAC/Scoring/Payments ولا تنفذ production cutover/dual-write أو historical reconstruction دون قرار صريح.
```

تسلسل التسليم الفعلي: `Inspect → Plan → Implement → Test/local gates → Commit → Push → CI على نفس commit → Update Documentation → Completion Report`. لا يمكن للـCI البعيد أن يثبت كودًا غير موجود في commit؛ لذلك يأتي بعد push، ولا يُغلق الهدف إلا بعد نتيجته.

---

## الهدف 1 — إغلاق Assessment كمنتج تجاري مستقل

> **هذا هو الهدف الجاري حاليًا. لا تبدأه من الصفر؛ ابدأ من `CODEX_EXECUTION_STATE.md`.**

انسخ إلى المحادثة:

```text
استكمل إغلاق Assessment Commercial Module من Git HEAD والحالة الحالية، ولا تعِد ACC-01 أو أي دليل مثبت.

النطاق الإلزامي:
Definition, Builder, Question Selection, Assignment, Runner, Sessions, Attempts, Responses, Scoring, Results, Analytics.

Sellable MVP الآن:
- مدير/معلم ينشئ وينشر ويوجه اختبارًا عاديًا أو محاكيًا.
- الطالب المستهدف يبدأ ويحفظ ويستكمل ويرسل بأمان، والخارجي يُرفض.
- التصحيح والنتيجة الأساسية والتحليل الضروري من الخادم، مع history متوافق.
- حالات الوقت/المحاولات/loading/error/retry وعدم تكرار النتيجة مثبتة.

مؤجل بعد إثبات الاستخدام:
- production cutover للنماذج additive، dashboards تحليل متقدم، proctoring متقدم، question types غير لازمة لأول مشترٍ، وشهادة حمل production-like.

لا قيمة تجارية واضحة الآن:
- حذف Quiz/QuizResult legacy، إعادة بناء تاريخ ناقص، microservice للاختبارات، أو تفكيك QuizPage/route لمجرد الحجم.

ترتيب الإغلاق:
ACC-01 evidence/fixture map — أغلقه فقط وفق الحالة الحالية.
ACC-02 normal + directed journey.
ACC-03 mock session + autosave + resume + failure/retry safety.
ACC-04 results + analytics + historical compatibility.
ACC-05 completion report.

أثبت الرحلات الخمس عبر UI + API + persistence + RBAC، ولا تكرر HTTP أو smoke مثبتًا. حافظ على Quiz/QuizResult كـcompatibility facades، ولا تشغل production cutover أو تعيد بناء attempts/responses/history الناقصة.

معيار الإغلاق:
- الرحلات العادية والموجهة والمحاكي والنتائج التاريخية تمر على release candidate واحد.
- server-authoritative scoring والحدود الزمنية/المحاولات مثبتة.
- autosave/resume/retry/idempotency وفشل الكتابة مثبتة معزولًا.
- target/outside scope مثبتان في UI والرابط المباشر.
- Result/Analytics evidence موثق بلا خلط مع Reports التاريخية.
- ACC-05 يحتوي commits وCI وروابط الأدلة والمخاطر وما بقي BLOCKED.

لا تنتقل إلى Learning Space قبل إغلاق ACC-05 أو تسجيل استثناء مالك صريح.
```

الحالة الحالية عند إنشاء هذا الملف: `PARTIAL`. ACC-01 مكتملة كخريطة، وACC-02 audit موجود لكنه يحتاج إعادة CI بعد إصلاح التقاط استجابة إنشاء الـBuilder. الهدف التالي بعد الإغلاق: Subject Learning Space Boundary.

---

## الهدف 2 — تثبيت Subject Learning Space كرحلة تعلم واحدة

انسخ هذا الهدف فقط بعد إغلاق Assessment:

```text
ابدأ Product Gate 2: Subject Learning Space Boundary من Git HEAD وحالة التنفيذ المحدثة.

النتيجة المطلوبة للطالب:
Path → Level/Stage → Subject → Learning Space
وداخل المادة: Courses, Foundation, Practice, Assessments, Library.

Sellable MVP الآن:
- نقطة دخول واحدة مفهومة للمادة، navigation ثابت، والمحتوى الأساسي يظهر في موضعه الصحيح.
- رحلة طالب ومدير كاملة مع mobile/RTL وحالات loading/error/empty/success.

مؤجل بعد إثبات الاستخدام:
- personalization متقدم، توصيات AI، search موحد واسع، offline/native app، وإعادة تصميم بصري شامل.

لا قيمة تجارية واضحة الآن:
- نقل كل ملفات frontend إلى بنية جديدة، إعادة تسمية كل routes، أو إنشاء content graph عام قبل الحاجة.

افحص أولًا public routes وGenericPathPage وLearningSection وSubjectLearningPage والـloaders/callers، ثم اختر canonical runtime واحدًا تدريجيًا مع compatibility للروابط الحالية. لا تخلط Learning Space مع Course Definition أو Assessment Definition؛ هما محتوى مستقل يُعرض داخله.

أغلق رحلة فعلية: طالب يدخل المسار ثم المادة، يتعلم/يتدرب/يختبر ويرجع لنقطة واضحة، ومدير يعرف من أين يضيف كل نوع محتوى. أثبت desktop/mobile وRTL وloading/error/empty/success، ومنع التحميل العالمي غير المحدود.

معيار الإغلاق:
- ownership/runtime map واحدة بلا مدخلين متنافسين غير موثقين.
- URLs وdeep links الحالية محفوظة.
- UI→API→data evidence لرحلة الطالب والمدير.
- pagination/bounded loading مثبتة.
- تقرير إغلاق وcommit/CI وتحديث MODULE_CATALOG/CHANGE_MAP/DATA_ACCESS_MAP.

لا تبدأ School MVP قبل إغلاق هذه البوابة.
```

---

## الهدف 3 — تسليم Sellable School MVP

انسخ هذا الهدف فقط بعد إغلاق Learning Space:

```text
ابدأ Product Gate 3: Sellable School MVP. استخدم Git HEAD وCODEX_SCHOOLS_HANDOFF والحالة الحالية، ولا تستأنف تفكيك SchoolsManager لمجرد الحجم.

النطاق التجاري:
Schools, Classes, Students, Teachers, Supervisors, Parents, Permissions, credentials/access, Excel import, package/path/course assignment, basic student/class/school reports.

Sellable MVP الآن:
- مدرسة تُنشأ من الصفر، فصول ومستخدمون وعلاقات وصلاحيات ودخول وتعيين محتوى وتقرير أساسي.
- كل دور ينجز عمله اليومي من واجهة واضحة ضمن نطاقه فقط.

مؤجل بعد إثبات الاستخدام:
- SIS integrations، SSO متعدد المزودين، workflows موافقات متقدمة، billing مدرسي معقد، وautomation غير لازمة لأول تشغيل.

لا قيمة تجارية واضحة الآن:
- تفكيك SchoolsManager لمجرد الأسطر، إعادة تصميم schema للعلاقات دون migration business case، أو multi-tenant مركزي.

نفذ vertical journeys من مدرسة فارغة حتى تسليم حسابات الدخول والاستخدام والتقرير. راجع كل زر ظاهر عبر UI→API→DB→RBAC مع loading/error/success. أثبت عزل Platform Admin وSchool Supervisor وClass Supervisor وTeacher وParent وStudent ببيانات مستخدمين حقيقية معزولة.

معيار الإغلاق:
- إنشاء مدرسة وفصول واستيراد/إضافة المستخدمين والعلاقات والتعيينات.
- كل دور يرى ويعدل نطاقه فقط؛ direct URL/API rejection مثبت.
- parent/student linking لا يفتح بلا consent decision موثق.
- القوائم النامية paginated/bounded، ولا cleanup مدمر بلا موافقة.
- smoke/HTTP/Playwright المناسبة وCI على نفس commit.
- School MVP completion report وحالة كل زر VERIFIED أو BLOCKED بمالك.

بعد الإغلاق انتقل إلى Results/Reports Product Boundary.
```

---

## الهدف 4 — فصل Results عن Reports وتسليم قيمة البيانات

انسخ هذا الهدف فقط بعد إغلاق School MVP:

```text
ابدأ Product Gate 4: Results and Reports Product Boundary.

ثبّت العقد:
Result = قراءة محاولة واحدة وقرارها ومراجعتها والخطوة التالية.
Report = تحليل تاريخي عبر محاولات/طلاب/فصول/مدارس.

Sellable MVP الآن:
- Result واضح للطالب، وتقارير طالب/فصل/مدرسة قابلة للتصدير ومتوافقة مع الصلاحيات.
- progress/weakness قابلة للفهم واتخاذ إجراء تعليمي منها.

مؤجل بعد إثبات الاستخدام:
- predictive analytics، BI خارجي، preaggregation واسع، scheduled reports متقدمة، وcustom report builder.

لا قيمة تجارية واضحة الآن:
- data warehouse أو event platform قبل قياس الحجم، أو تغيير scoring لإرضاء العرض، أو dashboards تجميلية بلا قرار قابل للتنفيذ.

أغلق المنتج الأول: Student Report, Class Report, School Report, progress, weakness analysis, PDF export, Excel export. حافظ على scoring write path ولا تنقل business rules إلى presentation. افحص RBAC وquery shape وpagination وN+1 قبل إضافة cache أو preaggregation.

معيار الإغلاق:
- نتيجة الطالب الواحدة server-authoritative وقابلة للمراجعة تاريخيًا.
- تقارير الطالب/الفصل/المدرسة صحيحة النطاق ومثبتة ببيانات متعددة.
- PDF/Excel يعكسان نفس read model ولا يسربان بيانات.
- historical compatibility وempty/error/loading/export failure مثبتة.
- query/index evidence وتقرير إغلاق وcommit/CI وخرائط محدثة.

بعد الإغلاق انتقل إلى ProductConfig/White-label.
```

---

## الهدف 5 — ProductConfig وWhite-label قابل للبيع المتكرر

انسخ هذا الهدف فقط بعد إغلاق Results/Reports:

```text
ابدأ Product Gate 5: ProductConfig / White-label Foundation.

نموذج البيع الحالي: deployment + database + domain مستقل لكل مشتري، ويمكن أن يحتوي عدة مدارس. لا تنشئ multi-tenancy شاملًا أو tenantId بلا قرار منتج.

Sellable MVP الآن:
- اسم/شعار/ألوان/navigation/features/settings/providers من config validated.
- نسخة عميل ثانية تُبنى وتنشر من config فقط مع دليل تشغيل ورجوع.

مؤجل بعد إثبات الاستخدام:
- self-service theme marketplace، per-school branding داخل deployment، extension SDK عام، وmulti-tenant SaaS control plane.

لا قيمة تجارية واضحة الآن:
- fork للـCore، if customerName، theme engine معقد، أو نقل كل الإعدادات القديمة دفعة واحدة.

نفذ ProductConfig موحدًا لاسم المنتج والشعار والألوان والدومين والتنقل والميزات والسياسات والموفرين. امنع if customerName ونسخ الـCore. لا ترسل أسرار providers إلى frontend، وضع validation وdefaults وcache invalidation واضحًا.

معيار الإغلاق:
- علامتان مختلفتان تعملان من config فقط بلا تعديل Core.
- branding/settings/features/providers لها ownership وadmin path واضحان.
- build/deployment/smoke لكل علامة مثبت.
- دليل إنشاء نسخة عميل، متغيرات البيئة، النشر والرجوع.
- الأمن وعدم تسريب الأسرار مثبتان.
- تقرير إغلاق وcommit/CI وخرائط محدثة.

بعد الإغلاق انتقل إلى Questions/Curriculum/Courses/Operations closure.
```

---

## الهدف 6 — إغلاق Questions/Curriculum/Courses/Operations والإصدار التجاري

انسخ هذا الهدف فقط بعد إغلاق White-label:

```text
ابدأ Product Gate 6: Questions, Curriculum, Courses and Operations Closure للوصول إلى release تجاري قابل للتشغيل.

أغلق بالترتيب حسب أكبر فجوة بيع مثبتة:
1. Questions: bank/authoring/types/classification/search/import/review/analytics.
2. Curriculum/Learning: فصل المنهج والتصنيف عن المحتوى والتقدم.
3. Courses: فصل Learning Product عن Package/Commerce Product.
4. Operations: storage/media, queues/jobs, observability, backup/restore, security/release checklist.
5. Production-like load certification على staging مفوض فقط؛ لا ادعاء أرقام قبل تقرير قابل للإعادة.

Sellable MVP الآن:
- بنك أسئلة ومنهج ودورات ووسائط قابلة للإدارة والاستهلاك، وتشغيل يمكن مراقبته ونسخه احتياطيًا واستعادته.
- release checklist ودليل تثبيت/نشر/نسخة عميل قابلة للتكرار.

مؤجل بعد إثبات الاستخدام:
- AI/ads/affiliate/BNPL/SCORM/integrations المتقدمة/native mobile وأي scale optimization بلا benchmark.

لا قيمة تجارية واضحة الآن:
- microservices، data lake، إعادة كتابة store/API بالكامل، أو منصة extensions عامة قبل وجود طلب عميل مثبت.

لا تنفذ composition refactor واسعًا؛ استخرج API/store/admin shell فقط عندما يغلق vertical slice حقيقيًا.

معيار الإغلاق النهائي:
- installation/deployment/customer-instance/backup/restore/customization guides.
- critical journeys وRBAC/security/recovery/load evidence على release candidate واحد.
- لا secrets أو production writes في الاختبارات.
- المخاطر المتبقية مصنفة VERIFIED/PARTIAL/NOT PROVEN/BLOCKED بمالك وقرار إطلاق.
- Final Product Readiness Report وrelease commit/tag بعد موافقة المالك.
```

## كيف تعرف أن الخطة لم تنحرف

أوقف أي Batch إذا لم تستطع الإجابة بنعم عن واحد على الأقل:

- هل تغلق رحلة يحتاجها مستخدم أو مشتري؟
- هل تمنع خطر أمان/بيانات/تشغيل مثبتًا؟
- هل تقلل زمن إضافة ميزة قريبة ومحددة، لا افتراضية؟
- هل ترفع Capability من `NOT PROVEN/PARTIAL` بدليل مناسب؟

حجم الملف، جمال المجلدات، وعدد الوثائق ليست أهدافًا مستقلة.
