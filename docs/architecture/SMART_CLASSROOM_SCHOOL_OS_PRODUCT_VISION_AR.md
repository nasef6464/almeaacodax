# ALMEAA — رؤية School OS وSmart Classroom وخطة التنفيذ

> الحالة: `REFERENCE / SUPERSEDED FOR EXECUTION`
> تاريخ الفحص: 2026-09-09
> مصدر الحقيقة: `main@9cf72176059e09466335f6d6ff20b51b43969e61` ثم وثائق المعمار والحالة الحالية.
> هذه وثيقة قرار وخطة فقط؛ لا تغيّر Runtime أو API أو RBAC أو Schema أو بيانات الإنتاج.
>
> المرجع التنفيذي النهائي بعد مراجعة Gemini وقرار المالك هو
> `docs/architecture/SMART_CLASSROOM_EXECUTION_MASTER_AR.md`. تبقى هذه الوثيقة
> تقرير الفحص الموسع ولا تستخدم وحدها لاختيار Batch أو تصميم Schema.

## 1. الخلاصة التنفيذية

الاقتراح صحيح تجاريًا ومعماريًا، لكن الاسم الأدق ليس «إضافة فصل ذكي» فقط. الهدف الجديد المقترح هو:

> **تطوير ALMEAA من منصة تعلم إلى School Learning Operations System قابل للبيع بوحدات، مع Smart Classroom مبني فوق بنك الأسئلة والاختبارات والتقارير والحسابات الموجودة.**

المشروع لا يحتاج منصة جديدة ولا محرك اختبارات جديد ولا نظام طلاب جديد. أقوى مسار هو الحفاظ على School MVP ولوحة المشرف الحالية، ثم إضافة طبقات صغيرة واضحة فوقها:

1. هوية واحدة وسياقات متعددة للحساب نفسه.
2. عقد مدرسي ووحدات خدمات server-authoritative.
3. إسناد معلم لفصل ومادة وجدول.
4. جلسة فصل ذكي موثقة ومؤمّنة.
5. إجابات لحظية وتقرير جلسة.
6. فصل تحليلات المدرسة عن التحليلات الفردية دون دمجهما في درجة واحدة.

المنتج الحالي يملك قرابة 60–70% من المكونات الوظيفية اللازمة للـMVP، لكنه لا يملك بعد **العقود الدلالية والأمنية** التي تجعلها «فصلًا مدرسيًا ذكيًا» صالحًا للبيع. النسبة تقدير معماري وليست ادعاء جاهزية تشغيلية.

### Delivery assessment

- `CURRENT STATE`: Gates 1–6 مغلقة على حدود Strong MVP، والعمل الجديد Product Change مستقل مبني فوق `main` الحالي.
- `VERIFIED`: تشغيل المدارس، العلاقات، الاختبارات الموجهة، التقارير الأساسية، Barcode/QR، الحصص الخارجية، AccessGrant، وProductConfig موجودة ويمكن إعادة استخدامها ضمن حدودها المثبتة.
- `REAL GAPS`: عضوية مدرسية صريحة، عقد Modules، إسناد معلم/مادة/فصل، جدول، جلسة فصل آمنة، سياق نتيجة، وتحليلات ثنائية المصدر.
- `BLOCKERS`: لا يوجد blocker يمنع إعداد الخطة. بدء Smart Classroom نفسه محظور هندسيًا حتى إغلاق ownership في Barcode/booking ومصادقة وتفويض Socket rooms؛ هذه فجوات قابلة للتنفيذ وليست انتظارًا خارجيًا.
- `STRONG MVP`: Phases 0–5 ثم Pilot واحد مضبوط. لا يشمل فيديو داخليًا أو سبورة أو دردشة أو Marketplace.
- `DEFERRED`: Live Tutoring الكامل، AI المتقدم، SIS/SSO، تطبيق مستقل، وBI واسع حتى يثبت الاستخدام التجاري.

## 2. قرارات المالك المثبتة من الطلب

- المدرسة تشتري خدمات ووحدات مختلفة حسب العقد والسعر.
- الطالب يستخدم حساب ALMEAA نفسه؛ قد يكون متعلمًا فرديًا وعضوًا في مدرسة في الوقت نفسه.
- المدرسة تستخدم بنك المنصة، ويمكنها إنشاء اختباراتها الموجهة لطلابها.
- يجب عرض مصدرين للتحليل:
  - أداء الطالب الفردي داخل المنصة.
  - أداء الطالب المدرسي: اختبارات المدرسة، الفصل الذكي، والواجبات المدرسية.
- لا تدمج النتائج المدرسية والفردية في درجة واحدة.
- لوحة المشرف الحالية أصل مهم ويجب الحفاظ عليها وتوسيعها، لا استبدالها.
- العقود تفتح الوحدات المتفق عليها فقط.
- الحصص المباشرة والحجز قيمة إضافية، لكنها ليست قلب المرحلة الأولى.

## 3. الحالة الحالية المبنية على الفحص

### VERIFIED — موجود ومثبت ويمكن البناء عليه

| القدرة | الدليل الحالي | قرار إعادة الاستخدام |
|---|---|---|
| المدارس والفصول والمستخدمون والعلاقات | `Group` بأنواع `SCHOOL / CLASS / PRIVATE_GROUP`، وSchool MVP مغلق | الحفاظ الكامل، وعدم إنشاء نظام مدارس موازٍ |
| الطلاب والمعلمون والمشرفون وأولياء الأمور | الأدوار الخمسة و`User.schoolId/groupIds/linkedStudentIds` | إبقاء الحساب وتسجيل الدخول الحاليين أثناء الانتقال |
| بنك الأسئلة والمهارات | `Question` + التصنيف + الموافقة | المصدر الأساسي لأسئلة الفصل الذكي |
| اختبارات المدرسة | `Quiz.targetGroupIds/targetUserIds` و`ownerType=school` | الإبقاء كمسار الاختبار الرسمي الموجه |
| النتائج وتحليل المهارات | `QuizResult` وتقارير الطالب/الفصل/المدرسة | إعادة استخدام محرك الدرجة؛ إضافة سياق المصدر فقط |
| QR/Barcode + وضع Live | `PublicBarcodeTest`، PIN، سؤال حالي، projector، monitoring، report | إعادة استخدام خبرة الواجهة والاختيار والتقرير، لا هوية الإرسال المجهولة |
| الحصص الخارجية | `Lesson` يدعم Zoom/Meet/Teams/YouTube وschool/class/teacher fields | Add-on لاحق، لا بناء فيديو خاص |
| طلب حصة خاصة | `BookSession` + `Activity(session_booked)` + تحويل الطلب إلى Lesson | قاعدة أولية لـLive Tutoring بعد ضبط النطاق والعقد |
| الوصول التجاري للمحتوى | `B2BPackage` + `AccessCode` + `AccessGrant` + السعة والانتهاء | الحفاظ كترخيص محتوى؛ لا تحميله معنى العقد كله |
| White-label وإعدادات النشر | ProductConfig مغلق كـStrong MVP | يبقى مستوى الـdeployment، وليس بديلًا لعقد مدرسة |
| لوحة المشرف | `SupervisorDashboard` والتدخلات والتقارير | امتداد داخل نفس الرحلة، لا لوحة بديلة |

### PARTIAL — موجود لكنه لا يحقق الهدف الجديد كاملًا

| القدرة | الفجوة الحقيقية |
|---|---|
| حساب واحد متعدد السياقات | `User.role` مفرد، والعضوية موزعة بين `schoolId/groupIds` وحقول `Group`؛ لا عقد عضوية صريح أو اختيار Workspace |
| معلم محتوى مقابل معلم مدرسة | الدور نفسه `teacher` يحمل Content Scope وSchool Scope؛ التمييز ممكن جزئيًا لكنه غير ممثل كعضوية مدرسية صريحة |
| الباقات | تفتح محتوى وسعة طلاب، لكنها لا تمثل عقدًا، سعرًا متفقًا، تاريخ بدء/تجديد، أو وحدات مثل Smart Classroom |
| الحصة المباشرة | Lesson مجدول برابط خارجي، لكنه ليس جدولًا مدرسيًا متكررًا ولا يثبت إسناد مادة/فصل كعقد تشغيلي |
| التقارير المدرسية | التقرير الحالي يجمع نتائج طلاب المدرسة؛ لا يميز دائمًا بين نتيجة فردية ونتيجة مدرسية بمصدر محفوظ server-side |
| Live QR | المتابعة دورية كل 5 ثوانٍ، والهوية مدرسة/فصل كنص يدخله المستخدم، وليست عضوية طالب موثقة |

### NOT PROVEN — غير موجود كقدرة مكتملة

- `SchoolMembership` صريح ومتوافق مع الحساب الحالي.
- عقد مدرسة بوحدات خدمات واستحقاق Feature server-side.
- `Teacher → Class → Subject → Schedule` كعقد بيانات.
- Smart Classroom session آمنة من البداية للنهاية.
- دخول الطالب للكلاس بالكود مع التحقق من عضوية الفصل.
- إرسال سؤال واحد/مجموعة أسئلة ومتابعة كل إجابة لحظيًا.
- تقرير جلسة مرتبط بالمدرسة والفصل والمعلم والمهارة.
- لوحة ثنائية المصدر تفصل Platform Learning عن School Learning.
- قياس قبل/بعد للصف والمعلم عبر جلسات متعددة.
- أمان وتفويض غرف Socket.IO للفصل الذكي.

## 4. نتائج الفحص العميق التي تمنع البدء المباشر في Smart Classroom

### 4.1 هوية المدرسة الحالية لا تكفي للسياقات الجديدة

`User.schoolId` مفرد بينما النظام يسمح بعلاقات متعددة عبر Groups، و`User.role` مفرد بينما الشخص قد يكون مدرب محتوى ومعلم مدرسة في الحساب نفسه. المطلوب ليس إضافة Role عالمي جديد فورًا؛ المطلوب **فصل Persona عن Membership وعن Capability**.

القرار المقترح:

- يبقى `User` هو هوية الدخول الوحيدة.
- تبقى الأدوار الخمسة الحالية خلال الانتقال لحماية التوافق.
- يضاف `SchoolMembership` ليصف علاقة الحساب بالمدرسة.
- يضاف `TeachingAssignment` ليصف: المعلم، الفصل، المادة، والنطاق.
- تعرض الواجهة Workspace مناسبًا وفق العضوية والاستحقاق، لا وفق `role` وحده.

### 4.2 Public Barcode Live نموذج أولي ممتاز للواجهة، وليس Persistence الفصل الذكي

الموجود يثبت PIN، QR، اختيار أسئلة، تحكم سؤال حالي، monitoring، وتحليل مهارات. لكن الإرسال العام يحفظ `studentName/schoolName/classroomName` كنص ولا يحفظ `userId/schoolId/classId` موثقة. هذا مقبول لاختبار عام بلا تسجيل، لكنه غير صالح كسجل مدرسي رسمي أو تحليل طالب موثوق.

كما أن الفحص كشف فجوة RBAC يجب إغلاقها قبل إعادة الاستخدام المدرسي:

- إنشاء الاختبار يتحقق من target scope.
- قائمة اختبارات الباركود الإدارية لا تصفي حاليًا حسب المالك/نطاق المدرسة.
- التحكم Live والتقرير يجلبان الاختبار بالـid من دون فحص ملكية المعلم/المشرف بعد التحقق من الدور العام.

إذن نعيد استخدام المكونات وتجربة العرض، لكن لا نضع Smart Classroom فوق مسارات مجهولة الهوية أو غير محكومة بالملكية.

### 4.3 Socket.IO ليس بعد قناة فصل آمنة

الخادم يملك Redis adapter مناسبًا للتوسع، لكنه يسمح حاليًا بـ`workspace:join` لأي `workspaceId` من دون مصادقة socket أو authorization للغرفة. قبل نقل الإجابات أو أسماء الطلاب عبر realtime يجب إضافة:

- مصادقة handshake من جلسة المستخدم.
- resolver عضوية المدرسة/الفصل والجلسة.
- غرف بأسماء server-generated، لا room id يختاره العميل بحرية.
- أحداث idempotent وتسلسل version/sequence.
- عدم إرسال الإجابة الصحيحة أو بيانات فصل آخر للعميل.

### 4.4 الحصص الخاصة الحالية تحتاج Scope قبل تحويلها إلى خدمة مدرسية

مسارات `session-bookings` تسمح حاليًا لأي `admin/supervisor/teacher` بقراءة وتحديث الطلبات من دون School/Teacher scope. تبقى مناسبة كوظيفة Platform مركزية، لكنها لا تُباع كخدمة مدرسية قبل إضافة ownership، assignment، entitlement، ودفع واضح.

### 4.5 التقرير الحالي يخلط المصدر عند التجميع المدرسي

`GET /content/schools/:id/report` يجمع `QuizResult` حسب طلاب المدرسة. هذا يجيب: «كيف يعمل طلاب المدرسة إجمالًا؟» لكنه لا يجيب بدقة:

- ما الذي حدث بسبب المدرسة؟
- وما الذي فعله الطالب بمفرده في ALMEAA؟

الحل ليس نسخ النتائج. الحل هو إضافة `learningContext` server-authoritative للنتائج الجديدة، ثم عرض مسارين منفصلين و«صورة كاملة» اختيارية، مع إبقاء السجلات القديمة `legacy/unknown` دون تخمين أو reconstruction.

## 5. المعمار المستهدف

```text
User (هوية دخول واحدة)
  ├─ Platform Persona / Content Scope
  └─ SchoolMembership
       └─ School (Group: SCHOOL)
            ├─ Class (Group: CLASS)
            │    ├─ Student membership
            │    ├─ TeachingAssignment → Teacher + Subject
            │    └─ ScheduleSlot
            │          └─ ClassroomSession
            │               ├─ Question snapshots
            │               ├─ Participants
            │               ├─ Responses
            │               └─ Session Report
            └─ SchoolContract
                 ├─ Modules / limits / validity
                 ├─ B2B content packages
                 └─ School settings
```

### قاعدة الاستحقاق الثلاثية

أي ميزة مدرسية تعمل فقط عند اجتماع الشروط الثلاثة:

```text
Deployment capability (ProductConfig)
AND Active school contract module
AND Authorized user membership/scope
```

إخفاء الزر وحده لا يكفي. نفس resolver يجب أن يحمي Backend API وSocket room والواجهة.

## 6. نماذج البيانات المقترحة

كل النماذج إضافية ومتوافقة للخلف في البداية. لا حذف ولا migration مدمرة.

### 6.1 `SchoolMembership`

الغرض: إثبات أن الحساب نفسه عضو في مدرسة وبأي صفة.

حقول مقترحة:

```text
id, userId, schoolId
roles: student | parent | school_teacher | class_supervisor | school_supervisor
status: invited | active | suspended | ended
startsAt, endsAt, invitedBy, createdAt, updatedAt
```

Indexes:

- unique `(schoolId, userId)`.
- `(userId, status)` لاختيار Workspaces.
- `(schoolId, roles, status)` لقوائم المدرسة.

لا يحل هذا النموذج محل `User.schoolId/groupIds` مباشرة. يبدأ Dual-read مع compatibility adapter، ثم dual-write محدود، ثم reconciliation، ولا ينتقل إلى authoritative إلا بعد إثبات parity.

### 6.2 `TeachingAssignment`

```text
id, schoolId, classId, teacherId, subjectId
status, startsAt, endsAt, createdBy
```

Unique active assignment على `(classId, teacherId, subjectId)`، مع فحص أن الفصل تابع للمدرسة وأن المعلم عضو نشط.

### 6.3 `SchoolScheduleSlot`

```text
id, schoolId, classId, teachingAssignmentId
weekday, startMinute, endMinute, timezone, roomLabel
termLabel, effectiveFrom, effectiveTo, status
```

لا تخزن الأوقات كنص حر. تستخدم دقائق اليوم + timezone، وتمنع تعارض المعلم والفصل على الخادم.

### 6.4 `SchoolContract`

`B2BPackage` يبقى ترخيص محتوى/سعة. العقد الجديد يمثل الاتفاق التجاري ولا يكرر Payment engine.

```text
id, schoolId, contractRef, status
startsAt, endsAt, renewalMode
modules[]: { key, enabled, limits, settings }
seatLimit, teacherLimit, smartClassConcurrentLimit
pricingSnapshot, currency, billingCycle
b2bPackageIds[], signedAt, signedBy, createdBy
```

الوحدات المبدئية:

```text
SCHOOL_CORE
QUESTION_BANK
SCHOOL_ASSESSMENTS
BASIC_REPORTS
PATHS_AND_COURSES
INTERACTIVE_VIDEO
SMART_CLASSROOM
LIVE_ANALYTICS
AI_REPORTS
LIVE_TUTORING
WHITE_LABEL
INTEGRATIONS
```

### 6.5 `ClassroomSession`

```text
id, schoolId, classId, teacherId, subjectId
teachingAssignmentId, scheduleSlotId?
status: planned | lobby | live | paused | ended | cancelled
joinCodeHash, startsAt, openedAt, endedAt
currentQuestionOrdinal, settings, version
assessmentVersionId? / bounded question snapshot references
createdBy
```

لا تخزن join code بصيغة مكشوفة بعد الاستخدام التشغيلي؛ يخزن hash وتدار مدة صلاحية قصيرة.

### 6.6 `ClassroomParticipant`

```text
sessionId, studentId, schoolId, classId
joinedAt, lastSeenAt, status, attendanceSeconds
```

Unique `(sessionId, studentId)`.

### 6.7 `ClassroomResponse`

```text
sessionId, studentId, questionId, questionOrdinal
selectedAnswer, isCorrect, skillIds[], responseMs
submittedAt, sequence, idempotencyKey
```

Unique `(sessionId, studentId, questionOrdinal)`، والتصحيح Server-authoritative من snapshot لا من payload العميل.

### 6.8 `QuizResult.learningContext` — إضافة متوافقة

```text
kind: platform | school_assessment | legacy_unknown
schoolId?, classId?, teacherId?, assignmentId?, classroomSessionId?
capturedAt
```

- الاختبار المدرسي الرسمي يحفظ `school_assessment`.
- Smart Classroom التكويني يبقى في ClassroomResponse ولا يتحول تلقائيًا إلى Grade.
- السجلات القديمة تبقى `legacy_unknown` ولا تنسب للمدرسة بالتخمين.

## 7. تجربة المستخدم المقترحة مع الحفاظ على لوحة المشرف

### مدير ALMEAA

داخل `تشغيل المدارس` تضاف مساحة واحدة: **العقد والخدمات**:

- حالة العقد وتاريخ الانتهاء.
- عدد المقاعد والاستخدام.
- الوحدات المفعلة.
- ربط المحتوى الحالي.
- فتح/إيقاف خدمة مستقبلية من العقد، لا من زر Frontend فقط.

### مشرف المدرسة

تبقى `SupervisorDashboard` هي واجهة المشرف: المتابعة، الطلاب، الاختبارات الموجهة، التدخلات، والتقارير. يضاف إليها فقط:

- «الفصول الذكية اليوم».
- «الجلسات الجارية».
- «تقرير الجلسات».
- «أداء المدرسة» مع تبويبين: مدرسي / تعلم المنصة.

### معلم المدرسة

Workspace يومي بسيط:

```text
حصصك اليوم
08:00 قدرات — ثاني A     [ابدأ الحصة]
10:00 قدرات — ثالث B     [ابدأ الحصة]
```

داخل الحصة:

- اختيار سؤال أو مجموعة من بنك المنصة ضمن المادة الموكلة.
- عرض PIN/QR للفصل.
- مشاهدة من دخل ومن لم يجب ومن تأخر.
- انتقال للسؤال التالي.
- إنهاء الحصة وإنشاء التقرير.

### الطالب

- يدخل بحساب ALMEAA نفسه.
- الكود/QR يحدد الجلسة فقط، ولا يستبدل الهوية.
- الخادم يثبت أن الطالب عضو في الفصل والجلسة فعالة.
- لا يطلب منه كتابة اسم المدرسة أو الفصل.

### ولي الأمر

في الـMVP لا يرى الشاشة الحية. يرى لاحقًا ملخصًا مبسطًا لابنه بعد إغلاق الجلسة، إذا سمح عقد المدرسة وسياسة المدرسة.

## 8. التحليلات ذات المصدرين

### لوحة الطالب/ولي الأمر

```text
تعلمك في ALMEAA
- الدورات، التدريبات، الاختبارات الفردية، التقدم الشخصي

أداؤك المدرسي
- اختبارات المدرسة، جلسات الفصل الذكي، الواجبات المدرسية
```

### لوحة المشرف

- تبويب `School Performance`: المدرسة فقط.
- تبويب `Platform Learning`: نشاط طلاب المدرسة الفردي إذا كانت الصلاحية/العقد يسمحان.
- تبويب `Full Picture`: عرض المقارنتين جنبًا إلى جنب، لا Average موحد.

### تقرير جلسة Smart Classroom

- عدد الطلاب المتوقعين والمنضمين والمجيبين.
- correct/wrong/unanswered لكل سؤال.
- متوسط زمن الاستجابة.
- أضعف المهارات.
- الطلاب المحتاجون دعمًا.
- أصعب الأسئلة.
- توصية مراجعة وأسئلة علاجية من بنك المنصة.

أي «تحليل AI» يكتب ملخصًا فوق بيانات محسوبة server-side، ولا يعيد حساب الدرجة ولا يصبح مصدر حقيقة.

## 9. المنتج التجاري والباقات

### School Core

- تشغيل المدرسة والفصول والحسابات والعلاقات.
- بنك الأسئلة.
- اختبارات المدرسة.
- تقارير أساسية.
- Access Codes ومقاعد الطلاب.

### Learning Plus

- كل السابق.
- المسارات والدورات.
- المحتوى التأسيسي والتدريبات.
- الفيديو التفاعلي.
- تقارير مهارات متقدمة.

### Smart School

- كل السابق.
- Smart Classroom.
- Teacher Daily Workspace.
- Live Analytics.
- تقارير جلسة وفصل ومعلم.
- توصيات علاجية آلية محسوبة.

### Enterprise

- كل السابق.
- White-label ونشر مستقل.
- تقارير إدارة عليا.
- Integrations/SSO/SIS عند التعاقد.
- سياسات واعتمادات مخصصة.
- دعم وتهيئة موسعة.

### Add-ons يمكن بيعها منفصلة

- Live Tutoring والحجز.
- ساعات تدريب المعلمين وOnboarding.
- إعداد/استيراد البيانات.
- بناء بنك أسئلة خاص بالمدرسة.
- مقاعد إضافية أو تزامن فصول إضافي.
- تقارير AI بعد إثبات القيمة.
- تكاملات مخصصة.
- دعم SLA وتشغيل مُدار.

نموذج السعر المقترح: رسم سنوي أساسي + مقاعد طلاب + وحدات مفعلة + رسم تهيئة أولي + إضافات استخدام واضحة. لا تربط إتاحة الخدمة بإتمام Frontend payment فقط؛ العقد والاستحقاق على الخادم هما المصدر.

## 10. خطة التنفيذ المرحلية

### Phase 0 — Product Contract & Security Baseline

الحالة: `MVP NOW`.

العمل:

- اعتماد هذه الرؤية وحدود Smart Classroom التكويني مقابل الاختبار الرسمي.
- بناء capability/evidence matrix للواجهات والمسارات الحالية.
- إضافة ownership guard لقائمة/تحكم/تقرير Public Barcode للمعلم والمشرف.
- إضافة School/Teacher scope لطلبات الحصص قبل استخدامها كخدمة مدرسية.
- تصميم socket authentication وroom authorization مع اختبارات رفض cross-school.

دليل الخروج:

- مستخدم مدرسة A لا يقرأ أو يتحكم في اختبار/طلب مدرسة B عبر URL/API/socket.
- لا تغيير سلوكي في الاختبار العام المفتوح المصرح به.

### Phase 1 — Identity & Membership Compatibility

الحالة: `MVP NOW`.

العمل:

- إضافة `SchoolMembership` وresolver موحد.
- backfill inventory read-only فقط.
- compatibility read من العلاقات الحالية.
- dual-write للعمليات الجديدة بعد إثبات parity.
- Workspace chooser لمن يجمع Content Scope وSchool Scope.

دليل الخروج:

- نفس الحساب يدخل كمتعلم فردي وعضو مدرسة من دون حساب ثانٍ.
- المعلم يرى محتوى المنصة أو فصوله حسب السياق.
- لا تغيير ضمني في صلاحيات أي حساب تاريخي.

### Phase 2 — Contracts & Module Entitlements

الحالة: `MVP NOW`.

العمل:

- إضافة `SchoolContract`.
- resolver موحد: ProductConfig + contract + membership.
- شاشة العقد والخدمات في SchoolsManager.
- audit trail لتغيير الوحدات والحدود.
- الحفاظ على `B2BPackage/AccessGrant` لترخيص المحتوى.

دليل الخروج:

- مدرسة Core لا تستطيع API أو UI أو socket لـSmart Classroom.
- مدرسة Smart تستطيعها ضمن تاريخ العقد والحدود.
- انتهاء العقد لا يلغي شراءً فرديًا للطالب.

### Phase 3 — Teaching Assignments & Schedule

الحالة: `MVP NOW`.

العمل:

- `TeachingAssignment` و`SchoolScheduleSlot`.
- إدارة الإسناد والجدول من مساحة المدرسة.
- Teacher Daily Workspace.
- منع التعارضات server-side.

دليل الخروج:

- معلم مرتبط بمدرسة/فصل/مادة يرى حصصه فقط.
- مشرف الفصل والمدرسة يريان النطاق الصحيح.
- لا يستطيع المعلم بدء حصة لفصل أو مادة غير موكلة.

### Phase 4 — Smart Classroom Vertical Slice

الحالة: `STRONG MVP CORE`.

الرحلة:

```text
Teacher opens scheduled class
→ selects approved questions
→ starts lobby
→ students join with same accounts + code
→ teacher publishes questions
→ students answer
→ live counters update
→ teacher ends session
→ immutable session report is available
```

ضوابط MVP:

- أسئلة اختيار من متعدد/صح وخطأ أولًا.
- لا سبورة ولا دردشة ولا ألعاب ولا فيديو داخلي.
- حد أسئلة وجلسات واضح.
- الإجابات والدرجات server-authoritative.
- Socket للأحداث، API/DB للحقائق والاستعادة بعد الانقطاع.

### Phase 5 — Dual-source Analytics & Intervention

الحالة: `STRONG MVP CORE`.

العمل:

- إضافة `learningContext` للنتائج الجديدة.
- تقرير Platform مقابل School.
- Session/Class/Teacher analytics.
- زر «حلل الفصل» ينتج summary محسوبًا وتوصيات علاجية من المحتوى الموجود.
- تصدير PDF/Excel من read model واحد.

دليل الخروج:

- لا يختلط الاختبار الفردي بدرجة المدرسة.
- المشرف يرى المقارنتين حسب صلاحياته.
- إعادة فتح التقرير تعطي نفس الأرقام من الخادم.

### Phase 6 — Pilot & Commercial Acceptance

الحالة: `MVP NOW AFTER BUILD`.

- مدرسة تجريبية واحدة، فصلان، معلمان، وطلاب حقيقيون في بيئة مصرح بها.
- اختبار انقطاع/إعادة اتصال وفشل Socket واستعادة حالة السؤال.
- اختبار Desktop/Mobile/Projector.
- قياس latency وعدد الاتصالات والكتابات.
- تدريب مستخدم وإثبات رحلة يومية.
- تقرير قبول تجاري وقرار التوسع.

### Phase 7 — Live Tutoring Add-on

الحالة: `DEFERRED` حتى نجاح Pilot.

- Teacher availability.
- Booking + approval.
- Payment/contract entitlement.
- External meeting provider.
- attendance/recording policy.

لا نبني WebRTC أو Zoom بديلًا داخل ALMEAA في هذه المرحلة.

## 11. الملفات المتوقعة

### ملفات موجودة ستتغير غالبًا

- `types.ts`
- `App.tsx`
- `dashboards/admin/AdminDashboard.tsx`
- `dashboards/admin/SchoolsManager.tsx`
- `dashboards/admin/SupervisorDashboard.tsx`
- `dashboards/admin/PublicBarcodeTestsManager.tsx`
- `dashboards/admin/LiveSessionsManager.tsx` عند بدء Add-on فقط
- `pages/Reports.tsx`
- `pages/LiveSessions.tsx` عند بدء Add-on فقط
- `services/api.ts` أو API group مخصص
- `server/src/routes/index.ts`
- `server/src/routes/publicTests.routes.ts`
- `server/src/routes/activity.routes.ts` عند بدء Add-on أو hardening
- `server/src/routes/quiz.routes.ts`
- `server/src/sockets/index.ts`
- `server/src/models/QuizResult.ts`
- `server/src/modules/content/http/schoolOperationsSchemas.ts`

### ملفات/وحدات جديدة مقترحة

- `server/src/models/SchoolMembership.ts`
- `server/src/models/TeachingAssignment.ts`
- `server/src/models/SchoolScheduleSlot.ts`
- `server/src/models/SchoolContract.ts`
- `server/src/models/ClassroomSession.ts`
- `server/src/models/ClassroomParticipant.ts`
- `server/src/models/ClassroomResponse.ts`
- `server/src/modules/schools/application/schoolMembershipResolver.ts`
- `server/src/modules/schools/application/schoolModuleEntitlement.ts`
- `server/src/modules/schools/application/teachingAssignmentPolicy.ts`
- `server/src/modules/smart-classroom/application/*`
- `server/src/modules/smart-classroom/http/*`
- `server/src/modules/smart-classroom/infrastructure/*`
- `services/apiGroups/smartClassroomApi.ts`
- `dashboards/admin/smartClassroom/*`
- `pages/SmartClassroomStudent.tsx`
- `scripts/smoke-school-membership-contract.mjs`
- `scripts/smoke-school-contract-entitlement-contract.mjs`
- `scripts/smoke-smart-classroom-contract.mjs`
- `scripts/live-smart-classroom-audit.mjs`

لا توضع كل العمليات داخل `content.routes.ts` أو `SchoolsManager.tsx`. الجديد يملك domain boundary من البداية، بينما القديم يصل إليه عبر adapters واضحة.

## 12. المخاطر وخطة التخفيف

| الخطر | المستوى | التخفيف |
|---|---|---|
| تسريب بيانات مدرسة عبر Barcode/booking/socket | Critical | ownership guards + membership resolver + negative cross-school tests قبل MVP |
| كسر الحسابات الحالية عند إضافة Membership | High | additive model + compatibility read + reconciliation + rollback؛ لا destructive migration |
| خلط Trainer وSchool Teacher | High | context/persona + assignments، لا Role جديد متسرع |
| تغيير معنى النتائج التاريخية | High | `legacy_unknown` وعدم backfill تخميني |
| إلغاء شراء فردي عند انتهاء عقد المدرسة | Critical | contract revokes school entitlement only؛ AccessGrant provenance يبقى مستقلًا |
| Feature flag في الواجهة فقط | High | resolver server-side مشترك للـAPI/socket/UI |
| فقد إجابة أو تكرارها لحظيًا | High | idempotency key + unique indexes + sequence/version + API recovery |
| كشف الإجابة الصحيحة للطلاب | Critical | server-side scoring + safe question projection + snapshot محمي |
| ضغط تقارير/Realtime | Medium/High | bounded reads، indexes، event fan-out عبر Socket/Redis، قياس Pilot قبل preaggregation |
| توسع النطاق إلى فيديو/دردشة/سبورة | High | تثبيت MVP المكتوب ورفض أي capability لا تمنع البيع |
| ازدحام لوحة المشرف الحالية | Medium | progressive disclosure وتبويبات إضافية فقط؛ اختبارات visual regression |

## 13. بوابات الاختبار والإغلاق

كل Batch يحتاج اختبارات مركزة، والهدف لا يغلق قبل رحلة كاملة:

- Frontend: loading/error/empty/success/reconnect.
- API: validation, ownership, entitlement, state transitions, idempotency.
- DB: persistence, unique indexes, session recovery, report consistency.
- RBAC: Admin / School Supervisor / Class Supervisor / Teacher / Student / Parent.
- Negative isolation: School A مقابل School B، Teacher A مقابل Class B.
- Realtime: unauthorized room join، reconnect، duplicate event، multi-instance عند تفعيل Redis.
- Reports: نفس read model للواجهة وPDF/Excel.
- Compatibility: الحسابات والاختبارات والتقارير الحالية لا تتغير.
- CI على exact runtime commit ثم live pilot في بيئة مصرح بها.

Baseline وقت كتابة التقرير:

- `smoke:school-management`: PASS `30/30`.
- تم تقاعد `smoke:school-portal-command` مع البوابة القديمة؛ يغطي `smoke:supervisor-dashboard` رحلة المشرف الحالية.
- `smoke:rbac-school-scope`: PASS `4/4`.
- `smoke:reports-role`: PASS `20/20`.
- `smoke:barcode-public-tests`: PASS `42/42`.

هذه Contract smokes تثبت baseline ولا تثبت Smart Classroom أو حجم إنتاجي.

## 14. ما لا ننفذه في Strong MVP

- تطبيق موبايل مستقل.
- محرك بث فيديو أو WebRTC داخلي.
- سبورة تعاونية معقدة.
- دردشة مدرسية.
- ألعاب ونقاط داخل الحصة.
- SIS/SSO عام قبل عميل متعاقد.
- Marketplace للمدربين.
- Data warehouse أو BI منفصل.
- AI يقرر درجات أو يغيّر scoring.
- Multi-tenant SaaS أو `tenantId` عالمي.
- إعادة كتابة المدارس أو الاختبارات أو التقارير.

## 15. التوصية النهائية كشركة تطوير

نوصي بالموافقة على هذا التطوير كـ**Product Goal جديد مستقل** بعد البوابات المغلقة، وليس كتعديل صغير داخل لوحة المشرف. ترتيب القيمة الصحيح:

```text
Secure current reusable pieces
→ establish membership and contract entitlement
→ teacher assignment and schedule
→ smart classroom vertical slice
→ dual-source analytics
→ one controlled school pilot
→ live tutoring add-on
```

الاستثمار الأعلى عائدًا ليس في رسم شاشة جميلة، بل في أربعة عقود تجعل المنتج قابلًا للبيع والثقة:

1. من هذا المستخدم داخل المدرسة؟
2. ماذا اشترت المدرسة؟
3. ما الفصل/المادة التي يملك المعلم تشغيلها؟
4. لأي سياق تعليمي تنتمي كل نتيجة؟

بعد تثبيت هذه العقود تصبح معظم واجهة Smart Classroom إعادة تركيب ذكية لأصول ALMEAA الحالية، وتتحول لوحة المشرف الموجودة إلى مركز تشغيل حقيقي بدل فقدانها.

## 16. الهدف الجاهز لكودكس

```text
ابدأ Product Goal: School OS + Smart Classroom Commercial MVP.

مصدر الحقيقة هو latest main ثم:
- docs/architecture/MAIN_INTEGRATION_CHECKPOINT_AR.md
- docs/architecture/CODEX_EXECUTION_STATE.md
- docs/architecture/SMART_CLASSROOM_SCHOOL_OS_PRODUCT_VISION_AR.md
- docs/architecture/ROLE_SCOPE_CONTRACT_AR.md
- docs/architecture/SCHOOL_MVP_COMPLETION_REPORT_AR.md

Gates 1–6 مغلقة ولا يعاد تنفيذها. حافظ على SupervisorDashboard وSchoolsManager والاختبارات والتقارير الحالية. لا تبدأ Big Bang rewrite، ولا Role migration مدمرة، ولا tenantId عالمي، ولا microservices.

ابدأ Phase 0 فقط:
1. أنشئ capability/evidence matrix للمكونات التي سيعاد استخدامها.
2. أثبت وأغلق ownership gaps في Public Barcode admin list/live-control/report لمعلم ومشرف المدرسة.
3. أثبت وأغلق school/teacher scope في session bookings قبل تصنيفها كخدمة مدرسية.
4. صمم واختبر socket authentication + authorized room join مع رفض cross-school.
5. اكتب ADR صغيرًا لحد Smart Classroom: formative classroom interaction منفصل عن formal QuizResult، مع إعادة استخدام Question Bank وserver-side scoring.

Purpose: تأمين الأساس القابل لإعادة الاستخدام قبل إنشاء أي Smart Classroom schema أو UI.

Exit Evidence:
- UI/API/DB/RBAC negative tests لمدرستين ومعلمين.
- الاختبار العام المفتوح الحالي لا ينكسر.
- لا يستطيع staff خارج النطاق list/read/control/report أي مورد.
- Socket room join غير المصرح مرفوض ومثبت.
- الاختبارات الحالية للمدارس والتقارير والباركود تبقى PASS.
- commit مركز، push، CI على exact runtime، ثم تحديث CODEX_EXECUTION_STATE والخرائط المتأثرة فقط.

بعد إغلاق Phase 0، انتقل إلى Phase 1 SchoolMembership كإضافة backward-compatible مع inventory وadapter وreconciliation؛ لا تنشئ Smart Classroom UI قبل إغلاق Phase 1 وPhase 2 entitlement.
```

## 17. قرار البدء المطلوب

عند اعتماد المالك لهذه الوثيقة تصبح الحالة:

`APPROVED PRODUCT CHANGE / PHASE 0 AUTHORIZED`

ولا تعد الموافقة على الخطة موافقة تلقائية على:

- migration مدمرة.
- production data backfill.
- تغيير scoring أو payments.
- نشر Production أو تجربة على بيانات مدرسة حقيقية.
- تكلفة مزود فيديو/رسائل/AI.

كل واحد من هذه يحتاج قرارًا منفصلًا عند الوصول إليه.
