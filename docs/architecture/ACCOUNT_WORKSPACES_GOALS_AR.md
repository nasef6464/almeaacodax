# ALMEAA — سجل أهداف الحسابات ومساحات العمل

> الحالة: `G8 CLOSED / G9 AUTHORIZED`
> آخر مراجعة: 2026-09-10
> Current Goal: `G9 — School Director Identity & Delegated Access` مفوض وجاهز للتنفيذ.
> يعتمد هذا المسار على إغلاق Smart Classroom `G0–G6` ولا يعيد تنفيذها.

هذا هو سجل الأهداف القابل للاسترجاع لخطة مدرب المنصة، معلم المدرسة، ومدير
المدرسة. التفاصيل المعمارية في
`PLATFORM_TRAINER_AND_SCHOOL_DIRECTOR_PLAN_AR.md`، وبرومبت التنفيذ في
`ACCOUNT_WORKSPACES_TERRA_EXECUTION_PROMPT_AR.md`.

## النتيجة التجارية

يحصل كل مستخدم على مساحة عمل واضحة لا تختلط بغيرها، مع بقاء `User` واحدًا:

- مدرب المنصة يدير المحتوى داخل المسارات والمواد المسندة له.
- معلم المدرسة يدير فصوله وحصصه واختباراته المدرسية فقط.
- مدير المدرسة يرى مدارسه ويضيف الطلاب وينقلهم داخلها.
- مدير المنصة يمنح مدير المدرسة صلاحيات إضافية لكل مدرسة على حدة.

## الأهداف المعتمدة

| Goal | Checkpoint | النتيجة القابلة للتسليم | Exit Evidence | Status |
|---|---|---|---|---|
| `G7 — Platform Trainer Workspace` | `AW-01` | اسم وهوية ظاهرة باسم «مدرب منصة» ولوحة مستقلة، مع تقييد المحتوى خادميًا بالمسارات والمواد المسندة. | مدرب الكمي ينشئ/يعدل داخل الكمي فقط؛ محاولة مادة غير مسندة ترجع `403`؛ لا تظهر له أدوات المدارس أو الإدارة العامة. | `CLOSED / VERIFIED` |
| `G8 — School Teacher Workspace` | `AW-02` | لوحة مستقلة لمعلم المدرسة مبنية على `SchoolMembership` و`TeachingAssignment` وتجمع الفصول والاختبارات المدرسية وSmart Classroom. | معلم A لا يرى فصل B ولا يبدأ له حصة أو اختبارًا؛ لا يملك أدوات مدرب المنصة إلا بسياق مستقل مصرح. | `CLOSED / VERIFIED` |
| `G9 — School Director Identity & Delegated Access` | `AW-03` | `school_admin` additive، عضويات متعددة المدارس، وصلاحيات صريحة لكل عضوية يديرها صاحب المنصة. | مدير A لا يصل إلى B؛ المنح والسحب محفوظان ومدققان؛ سحب الصلاحية يسبب `403` فورًا؛ لا توسعة لصلاحيات legacy. | `READY / AUTHORIZED` |
| `G10 — Usable School Director Dashboard` | `AW-04` | لوحة تنفيذية مستقلة مع إحصاءات مجمعة وقائمة طلاب وإضافة طالب ونقله بين فصول المدرسة نفسها. | رحلة UI→API→DB كاملة؛ الإضافة لا تنشئ staff؛ النقل atomic/idempotent؛ cross-school والحذف مرفوضان. | `BLOCKED BY G9` |
| `G11 — Delegated School Operations` | `AW-05` | صاحب المنصة يستطيع منح إدارة الفصول، تكليف المعلمين، التقارير التفصيلية، والتصدير كوحدات صلاحية اختيارية. | كل أداة تتطلب permission للمدرسة وmodule entitlement للعقد؛ grant يسمح وrevoke يمنع؛ الأدوات غير المفوضة لا تظهر ولا تعمل عبر API. | `BLOCKED BY G10` |
| `G12 — Academic Delegation & Persona Closure` | `AW-06` | تفويض اختياري للاختبارات وSmart Classroom والتدخلات، مع context switch للحساب الهجين وإغلاق تجاري للشخصيات. | اختبار مدرستين وحساب هجين يثبت فصل المساحات؛ لا blended permissions؛ labels/exports صحيحة؛ لا نقل مدارس إلا بتفويض خاص وعضويتين فعالتين. | `BLOCKED BY G11` |

## G7 — Platform Trainer Workspace (`AW-01`)

### الغرض

إزالة الالتباس بين مدرب المنصة ومعلم المدرسة من دون ترحيل role قديم أو إنشاء
نظام حسابات جديد.

### النطاق

- يبقى backend role الحالي `teacher` للتوافق، والاسم الظاهر في هذا السياق
  `مدرب منصة`.
- لوحة مستقلة على `/instructor-dashboard` بدل أدوات الإدارة العامة.
- استعمال `managedPathIds` و`managedSubjectIds` كحدود خادمية موحدة على Course،
  Lesson، Question، Quiz، وLibrary.
- الحفاظ على مراجعة/اعتماد مدير المنصة عندما تتطلب سياسة النشر ذلك.
- labels صريحة في إدارة المستخدمين: `مدرب منصة` لا `معلم` فقط.

### خارج النطاق

- لا تعديل جماعي للحسابات الحالية.
- لا SchoolMembership أو أدوات مدارس لهذا السياق.
- لا إعادة كتابة محركات المحتوى أو الاختبارات.

### بوابة الإغلاق

1. مدرب كمي يستطيع القراءة والكتابة في نطاقه فقط.
2. path/subject غير مسند يرجع `403` حتى لو أرسل المعرف يدويًا.
3. مدرب آخر لا يرى أو يعدل محتوى خارج النطاق.
4. الواجهة لا تعرض مسارات أو أدوات غير مصرح بها.
5. typecheck/build والاختبارات المركزة وCI على exact runtime commit ناجحة.

## G8 — School Teacher Workspace (`AW-02`)

### الغرض

إعطاء معلم المدرسة مساحة واضحة تختلف وظيفيًا عن مدرب المنصة.

### النطاق

- لوحة `/school-teacher-dashboard` مبنية على العضوية والتكليف الحاليين.
- تعرض الفصول والمواد المكلف بها، School Assessments، وTeacher Control Console.
- routing خادمي ومرئي يختار School context المصرح ولا يستنتجه من الاسم.
- الحساب الذي يجمع السياقين يستخدم context switch واضحًا ولا يجمع الأدوات.

### بوابة الإغلاق

1. معلم A لا يقرأ فصل B ولا يبدأ له Smart Classroom أو اختبارًا.
2. تغيير URL أو request يدويًا لا يتجاوز `TeachingAssignment`.
3. الحساب الهجين يفتح كل مساحة مستقلة بلا تسريب أدوات أو صلاحيات.
4. الرحلة الأساسية تعمل على desktop وmobile RTL.

## G9 — School Director Identity & Delegated Access (`AW-03`)

### الغرض

إنشاء مدير مدرسة حقيقي محدود بمدارسه، مع تمكين صاحب المنصة من تفويض صلاحيات
إضافية من دون تحويله إلى مشرف أو Admin.

### النطاق

- إضافة `school_admin` بصورة additive في backend/frontend وSchoolMembership.
- كل مدرسة لها membership مستقلة و`permissions` من allowlist خادمية ثابتة.
- الصلاحيات الأساسية:
  `SCHOOL_OVERVIEW_VIEW`، `SCHOOL_REPORTS_AGGREGATE_VIEW`،
  `SCHOOL_STUDENTS_VIEW`، `SCHOOL_STUDENTS_ADD`،
  `SCHOOL_STUDENTS_MOVE_CLASS`.
- لوحة مدير المنصة تربط المدير بمدرسة أو أكثر، وتمنح/تسحب permissions لكل
  مدرسة، مع audit log.
- قوالب الواجهة (`إدارة أساسية`، `تقارير موسعة`، `تشغيل أكاديمي`، `مخصص`)
  تسهل الاختيار فقط؛ الخادم يحفظ القيم الصريحة.

### بوابة الإغلاق

1. user بلا membership فعالة مرفوض.
2. مدير A لا يصل إلى B ولو خمن identifiers.
3. مدير المنصة فقط يمنح أو يسحب permissions.
4. permission مسحوبة تصبح `403` فورًا في API ولا يكفي بقاء UI قديمة مفتوحة.
5. grant/revoke/link/unlink موثقة في audit log.

## G10 — Usable School Director Dashboard (`AW-04`)

### الغرض

تسليم أول رحلة مفيدة قابلة للبيع لمدير المدرسة بدل لوحة إحصاءات شكلية.

### النطاق

- `/school-director-dashboard` مع school selector للعضويات الفعالة فقط.
- overview مجمع: الطلاب، الفصول، المعلمون، المشرفون، الاختبارات المدرسية،
  وجلسات Smart Classroom المكتملة.
- قائمة طلاب محدودة للعمليات المصرح بها.
- إضافة طالب إلى مدرسة وفصل تابعين لها باستخدام خدمات المستخدم والمجموعات الحالية.
- نقل طالب بين فصول المدرسة نفسها بصورة atomic وidempotent مع audit log.

### حدود الأمان

- لا hard delete endpoint.
- لا إنشاء staff/admin من endpoint الطلاب.
- لا استحواذ صامت على طالب مرتبط بمدرسة أخرى.
- لا answer keys أو بيانات فردية لا تحتاجها عملية الإدارة.
- النقل بين مدرستين مؤجل إلى تفويض خاص، ولا يدخل في الصلاحية الأساسية.

### بوابة الإغلاق

1. مدير A يضيف طالبًا إلى A وينقله بين فصلين في A.
2. الإضافة إلى B والنقل إليها والحذف ومنح الذات permissions كلها مرفوضة.
3. تكرار طلب النقل لا يكرر العضوية أو يفسد groupIds.
4. النجاح/التحميل/الفشل/empty states واضحة على desktop وmobile RTL.
5. UI/API/DB/RBAC/audit مثبتة في رحلة مدرستين.

## G11 — Delegated School Operations (`AW-05`)

### الغرض

تحويل مدير المدرسة إلى منتج مرن حسب قيمة العقد، من دون packages جامدة أو وصول
شامل غير مضبوط.

### النطاق

- `SCHOOL_STUDENTS_UPDATE_BASIC`
- `SCHOOL_STUDENTS_DEACTIVATE` مع تعطيل قابل للاسترجاع فقط.
- `SCHOOL_CLASSES_MANAGE`
- `SCHOOL_TEACHERS_ASSIGN`
- `SCHOOL_REPORTS_DETAILED_VIEW`
- `SCHOOL_REPORTS_EXPORT`
- كل capability تحتاج permission على membership وmodule entitlement فعالًا في
  عقد المدرسة إن كانت مرتبطة بوحدة تجارية.
- لا تعرض لوحة المنصة capability قبل اكتمال API/UI/RBAC/اختباراتها.

### بوابة الإغلاق

1. grant/revoke يعملان end-to-end لكل capability منفذة.
2. مدرسة اشترت الوحدة ومفوض مديرها تستخدمها؛ غياب أي gate يرجع `403`.
3. export وdetailed reports لا يتجاوزان المدرسة أو مستوى التفاصيل الممنوح.
4. لا تتحول الصلاحيات الاختيارية إلى role جديد أو boolean مبعثر.

## G12 — Academic Delegation & Persona Closure (`AW-06`)

### الغرض

إكمال الصلاحيات الأكاديمية الاختيارية وإثبات أن الشخصيات الجديدة تعمل معًا بلا
تضارب قبل عرضها تجاريًا.

### النطاق

- `SCHOOL_ASSESSMENTS_MANAGE`
- `SCHOOL_SMART_CLASSROOM_VIEW`
- `SCHOOL_INTERVENTIONS_VIEW` و`SCHOOL_INTERVENTIONS_MANAGE`
- `SCHOOL_STUDENTS_TRANSFER_SCHOOL` كعملية مستقلة عالية الحساسية، لا تعمل إلا
  مع عضويتين فعالتين للمصدر والهدف وتأكيد وسجل تدقيق.
- context switch للحسابات الهجينة، labels النهائية، وuser export يوضح الشخصية
  والسياقات والارتباطات الفعلية.
- إعادة استخدام محركات الاختبارات وSmart Classroom والتدخلات الحالية؛ لا نسخها.

### بوابة الإغلاق

1. صلاحية أكاديمية + entitlement مطلوبان معًا في API والواجهة.
2. مدرسة A لا ترى اختبار/جلسة/تدخل مدرسة B.
3. النقل بين المدارس مرفوض افتراضيًا ومسموح فقط عند تحقق الشرطين والعضويتين.
4. Admin، Platform Trainer، School Teacher، School Director، وSupervisor يصل كل
   منهم لمساحته الصحيحة في full-stack acceptance مع حساب هجين.
5. تقرير إغلاق تجاري يوضح VERIFIED/PARTIAL/NOT PROVEN/DEFERRED بلا ادعاء Pilot
   production جديد.

## قواعد التنفيذ السريع

1. Goal واحدة = branch وPR واحد مركز؛ لا يبدأ الهدف التالي في PR نفسها.
2. Git HEAD والكود الحالي هما الحقيقة، ثم هذا السجل، ثم الخطة التفصيلية.
3. ابدأ كل Goal بفحص الملفات والمسارات المتأثرة فقط، ثم نفذ vertical slice كاملة.
4. كل صلاحية server-authoritative؛ إخفاء الزر ليس حماية.
5. استخدم مدرستين وحسابين على الأقل في RBAC negative tests.
6. targeted tests أثناء العمل؛ final build/CI مرة قرب الإغلاق.
7. لا `git add .`، ولا role migration كبيرة، ولا تغيير scoring/payments/production
   data أو cutover من دون تفويض مستقل.
8. عند الإغلاق: diff/status، exact-files commit، push، exact-runtime CI، ثم تحديث
   هذا السجل و`CODEX_EXECUTION_STATE.md` وأي map تغيرت ملكيتها فعلًا فقط.

## سجل التقدم

| Goal | Status | Runtime commit | CI / Evidence | Next exact action |
|---|---|---|---|---|
| `G7` | `CLOSED / VERIFIED` | `4299d77f942dcb1fef55beacc97b84aad11989d4` | Backend Integration [34442365096](https://github.com/nasef6464/almeaacodax/actions/runs/34442365096) PASS: scoped authoring/read denial, empty-scope fail-closed, full HTTP/RBAC and commercial course gates. Local typecheck/build and focused content/quiz/course contracts PASS. | G8 |
| `G8` | `CLOSED / VERIFIED` | `7932bfb268bcc18d9b44ea01707b4b4cac173303` | Backend Integration [34445758906](https://github.com/nasef6464/almeaacodax/actions/runs/34445758906) PASS: active membership + assignment workspace, hybrid personas, invalid school/class pairing denial, existing Smart Classroom lifecycle, full HTTP/RBAC/commercial gates. Frontend/server builds, focused typecheck, G7/G8/Smart Classroom contracts PASS; Playwright desktop `1365×900` and mobile RTL `390×844` showed 0 console errors. | G9 |
| `G9` | `READY / AUTHORIZED` | — | تفويض G7–G12 مستمر | تنفيذ school_admin + membership permissions + admin delegation/audit |
| `G10` | `BLOCKED BY G9` | — | — | يبدأ بعد إغلاق G9 |
| `G11` | `BLOCKED BY G10` | — | — | يبدأ بعد إغلاق G10 |
| `G12` | `BLOCKED BY G11` | — | — | يبدأ بعد إغلاق G11 |

## الاسترجاع لأي Agent

1. اقرأ `AGENTS.md` وskill `almeaa-goal-delivery` وdelivery invariants.
2. تحقق من HEAD/status وآخر خمسة commits و`MAIN_INTEGRATION_CHECKPOINT_AR.md`.
3. اقرأ هذا الملف لمعرفة Current Goal والحالة.
4. اقرأ `ACCOUNT_WORKSPACES_AGENT_ENTRY_AR.md` وقسم Goal الحالي فقط من الخطة.
5. اقرأ أحدث قسم Account Workspaces في `CODEX_EXECUTION_STATE.md`.
6. عند اختلاف الوثائق مع الكود/CI، صحح الوثائق وفق الدليل ولا تعيد العمل المغلق.

## قرار البداية

فوض المالك صراحة تنفيذ `G7–G12` بالتسلسل في 2026-09-10. أُغلق G7 بالدليل
المذكور أعلاه، وأُغلق G8 بالدليل، والهدف الحالي هو `G9`؛ يستمر التنفيذ هدفًا واحدًا في كل branch/PR.
