# ALMEAA — Role & Scope Contract

## الغرض والحالة

هذا العقد هو المرجع التشغيلي قبل Product Gate 3. يثبت فصل المسؤوليات
بالـRole والـScope والـCapabilities مع الحفاظ على الأدوار الخمسة الحالية،
ومن دون Role migration أو إضافة أدوار جديدة أو بناء Permissions Engine مستقل.

الحالة: **APPROVED — Documentation Baseline**

## الأدوار المعتمدة

### Admin — Platform Administration

- النطاق: المنصة كاملة وكل المدارس.
- يدير المدارس والفصول والمستخدمين والعلاقات والباقات وAccess Codes والمحتوى والإعدادات والتقارير العامة.
- لا يعتمد على `schoolId` لتقييد الرؤية.

### Teacher — Academic and/or School Scope

يبقى دورًا واحدًا، لكن صلاحياته لا تُستنتج من الدور وحده:

- **Content Scope:** `managedPathIds` و`managedSubjectIds` لإنشاء وإدارة المحتوى الأكاديمي داخل المسارات/المواد الموكلة.
- **School Scope:** `schoolId` و`groupIds` لرؤية طلاب وفصول النطاق المدرسي الموكّل.
- إسناد المعلم إلى فصل لا يجعله Supervisor تلقائيًا.
- لا يدير المدرسة أو الباقات أو المستخدمين إلا إذا كان ذلك Capability صريحًا ضمن النطاق.
- يمكن أن يجمع النطاقين عند الحاجة، مع بقاء كل صلاحية مقيدة بنطاقها.

### Supervisor — Scoped School Operations

- دور واحد مع أحد النطاقات التالية:
  - مدرسة كاملة.
  - عدة مدارس.
  - فصل/فصول محددة.
- مصادر النطاق الحالية: `schoolId`, `groupIds`, و`Group.supervisorIds`.
- يدير الطلاب والفصول والمتابعة والتحليلات والتدخلات والاختبارات الموجهة داخل نطاقه.
- لا يملك تلقائيًا صلاحية إنشاء أو اعتماد محتوى المنصة.
- Multi-School يُمثل حاليًا عبر العلاقات والمجموعات القائمة؛ لا يُضاف حقل جديد في هذه المرحلة.

### Parent — Linked Children

- النطاق الوحيد: الطلاب الموجودون في `linkedStudentIds`.
- يرى متابعة ونتائج أبنائه المرتبطين فقط.
- لا يرى مدرسة أو فصلًا كاملًا.

### Student — Personal Learning

- النطاق: الحساب والمحتوى الممنوح والاختبارات والنتائج والتقدم الشخصي فقط.
- لا يرى بيانات طلاب أو فصول أو مدارس أخرى.

## Capability boundaries

| Capability | Admin | Teacher | Supervisor | Parent | Student |
|---|---:|---:|---:|---:|---:|
| إدارة المدارس | كامل | لا | داخل النطاق عند اعتماد التشغيل | لا | لا |
| إدارة الفصول والطلاب | كامل | حسب School Scope الصريح فقط | داخل النطاق | لا | لا |
| إنشاء محتوى أكاديمي | كامل | داخل Content Scope | ليس تلقائيًا | لا | لا |
| تعيين Package/Path/Course | كامل | لا | داخل المدرسة الموكلة | لا | استهلاك فقط |
| Directed Assessment | كامل | داخل النطاق الأكاديمي/المدرسي | داخل نطاق الطلاب | لا | أداء الاختبار |
| Skill Analysis/Reports | شامل | حسب Content/School Scope | حسب School/Class Scope | للأبناء | شخصي |
| ربط Parent/Supervisor | كامل | لا | ضمن النطاق إذا فُوض | موافقة/عرض أبنائه | لا |

## قواعد النطاق

1. حماية Backend هي مصدر الإنفاذ؛ إخفاء زر في الواجهة ليس صلاحية.
2. كل قراءة أو كتابة مدرسية يجب أن تتحقق من المدرسة/الفصل/الطالب المستهدف.
3. `managedPathIds` و`managedSubjectIds` تقيدان المحتوى والتقارير الأكاديمية، ولا تمنحان إدارة المدرسة.
4. `schoolId` و`groupIds` تقيدان العمليات المدرسية، ولا تمنحان اعتماد محتوى المنصة.
5. لا يتم تحويل Teacher إلى Supervisor ضمنيًا بسبب وجوده في `supervisorIds`؛ هذا الربط legacy ويحتاج إثبات Capability عند تطوير العمليات.
6. لا تغيير في API أو RBAC أو نماذج البيانات ضمن اعتماد هذا العقد.

## قرارات المرحلة

- Role migration: **DEFERRED**.
- أدوار جديدة مثل `SchoolTeacher` أو `ContentCreator`: **DEFERRED**؛ يُستخدم فصل الصلاحيات بالنطاق أولًا.
- Permissions Engine مستقل: **DEFERRED**.
- SSO/SIS وMulti-tenant: **DEFERRED**.
- تنظيف orphan data: خارج هذا العقد وموافقة مستقلة.

## بوابة Product Gate 3 المعتمدة

### رحلة Admin

`Create School → Create Classes → Add Students → Assign Supervisor → Assign Teachers → Assign Learning Access`

### رحلة Supervisor

`View Students → Create Directed Assessment → Analyze Skills → Identify Weakness → Intervention Plan → Track Improvement`

يجب إثبات الرحلتين عبر:

`UI → API → Database → RBAC → Targeted Tests → CI`

