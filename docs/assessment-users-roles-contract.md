# Assessment Platform V1 — North Star + Users / Roles Contract

**Status:** Architectural target for `develop/assessment-platform-v1`  
**Date:** 2026-08-20

## 1. الهدف الحاكم

نطوّر نظام الاختبارات الحالي تدريجيًا إلى **Assessment Platform** كاملة بنفس الرؤية المرجعية المتفق عليها، بدون إعادة كتابة شاملة وبدون كسر الاختبارات أو النتائج أو الروابط القديمة.

```text
Users / Roles / Permissions / Scope
                ↓
Question Bank
                ↓
Assessment Definition
 ├─ Normal
 │   ├─ Practice
 │   └─ Exam
 └─ Mock
     └─ Sections
                ↓
Assessment Center
                ↓
Distribution
 ├─ Learning Placement
 ├─ Directed Assignment
 └─ Session
     ├─ Live
     ├─ Barcode
     └─ Public
                ↓
Student Attempt Engine
                ↓
Assessment Version / Snapshot
                ↓
Results
                ↓
Analytics
```

القاعدة الأساسية:

> Assessment هو المحتوى والتعريف. Assignment / Session / Learning Placement هي طرق توزيع وتقديم Assessment موجود، وليست أنواع اختبارات جديدة.

## 2. الأدوار الرسمية الحالية

لا ننشئ نظام Roles موازيًا. الأدوار القانونية الحالية في المنصة هي:

- `admin`
- `supervisor`
- `teacher`
- `student`
- `parent`

أي دور جديد مستقبلاً يحتاج قرار معماري واضح؛ لا يُضاف فقط لحل شاشة أو حالة مؤقتة.

## 3. قاعدة الصلاحية

لا تكفي قيمة `role` وحدها لاتخاذ قرار أمني أو تشغيلي.

```text
Permission Decision
= Role
+ Scope
+ Ownership / Assignment
+ Assessment State
+ Distribution Context
```

أمثلة Scope موجودة في النظام الحالي ويمكن البناء عليها:

- `schoolId`
- `groupIds`
- `managedPathIds`
- `managedSubjectIds`
- `linkedStudentIds`

أمثلة Ownership / Workflow موجودة في Assessment الحالي:

- `ownerType`
- `ownerId`
- `createdBy`
- `assignedTeacherId`
- `approvalStatus`
- `approvedBy`
- `approvedAt`
- `reviewerNotes`

السيرفر هو مصدر الحقيقة النهائي للصلاحيات؛ إخفاء زر في الواجهة ليس حماية أمنية.

## 4. مسؤولية كل مستخدم داخل دورة الاختبار

### Admin
- إدارة كل Assessments وبنك الأسئلة على مستوى المنصة.
- إنشاء/تعديل/مراجعة/اعتماد/نشر المحتوى.
- إدارة Assignments وSessions المستقبلية.
- الاطلاع على النتائج والتحليلات حسب نطاق المنصة.
- إدارة سياسات الوصول والإعدادات العامة.

### Supervisor
- العمل داخل النطاق الإداري/المدرسي/المواد والمسارات المسموح بها.
- مراجعة واعتماد محتوى المعلمين حيث تسمح سياسة المنصة.
- متابعة نتائج المجموعات والمدارس الواقعة في نطاقه.
- لا يتحول إلى Admin عام بسبب وجود Role supervisor فقط.

### Teacher
- إنشاء Questions وAssessments داخل النطاق المكلف به.
- استخدام بنك الأسئلة القانوني الموحد.
- إنشاء Normal Practice / Normal Exam، والمساهمة في Mock حسب الصلاحيات.
- إرسال المحتوى للمراجعة عند الحاجة.
- إنشاء Assignment لطلابه/مجموعاته عند اكتمال طبقة Distribution.
- رؤية نتائج وتحليلات الطلاب داخل Managed Scope فقط.

### Student
- هو **Assessment Taker** الأساسي.
- يرى Assessments المتاحة له من Learning Placement / Assignment / Session.
- يبدأ Attempt ويجيب ويراجع ويسلم وفق Settings الخاصة بالAssessment.
- يرى نتيجته ومراجعته فقط وفق الإعدادات والسياسة.
- لا يستطيع إنشاء/اعتماد/نشر Assessment.

### Parent
- **Observer وليس Assessment Taker** في العقد الأساسي.
- يرى نتائج وتقدم الطلاب الموجودين في `linkedStudentIds` فقط.
- لا ينشئ Assessment ولا يقدّم Attempt نيابة عن الطالب.
- أي استثناء مستقبلي يحتاج Policy صريحة ولا يُستنتج من كونه non-staff.

## 5. دورة حياة Assessment المستهدفة

```text
Draft
  ↓
Pending Review
  ↓
Approved
  ↓
Published
  ↓
Distributed
  ├─ Learning Placement
  ├─ Assignment
  └─ Session
  ↓
Attempt
  ↓
Result
  ↓
Analytics
```

يجب أن تكون انتقالات الحالة محمية Server-side، وأن يُعرف بوضوح من يستطيع تنفيذ كل انتقال وفي أي Scope.

## 6. Capability vocabulary المستهدف

هذه ليست Roles جديدة؛ هي لغة موحدة للصلاحيات يمكن استخدامها تدريجيًا في Backend/Frontend:

- `assessment:create`
- `assessment:edit`
- `assessment:review`
- `assessment:approve`
- `assessment:publish`
- `assessment:archive`
- `question:create`
- `question:edit`
- `question:review`
- `assignment:create`
- `assignment:manage`
- `session:create`
- `session:manage`
- `attempt:take`
- `result:view_own`
- `result:view_linked`
- `result:view_managed_scope`
- `analytics:view_managed_scope`

لا يلزم تحويل النظام كله إلى Permission Engine في دفعة واحدة. البداية تكون بعقد مركزي واختبارات Scope ثم نقل القرارات المتفرقة تدريجيًا.

## 7. ثوابت لا نكسرها أثناء التطوير

1. لا نخلط Assessment Type مع Delivery Type.
2. لا ننسخ Assessment كاملًا لإنشاء Assignment أو Session.
3. لا نحذف Legacy runtime قبل إثبات عدم وجود callers ونجاح Regression.
4. لا نعتمد على Store كـsource of truth للأسئلة أو الصلاحيات.
5. لا نكسر النتائج التاريخية؛ Snapshot/Version يجب أن يحميها.
6. لا نعتبر Parent وStudent نفس النوع فقط لأنهما non-staff.
7. لا نعتبر UI authorization بديلًا عن Backend authorization.
8. كل Batch يجب أن يحافظ على Normal / Mock / Directed / Saher / Barcode / Course / Results / RBAC regressions.

## 8. ترتيب التنفيذ بالنسبة للهدف

```text
A0 Audit
A1 Canonical Assessment Contract
A2 Unified Question Source
A3 Builder Components
A4 Mock Convergence
A5 Backend Modularization
A6 Runner Core + explicit taker policy
A7 Distribution Foundation
A8 Assignment + role/scope enforcement
A9 Sessions + role/scope enforcement
A10 Versioning + Results + Analytics
A11 Legacy Cleanup
```

هذا الملف هو مرجع North Star. أي Feature جديدة يجب أن توضح أين تقع في هذا المخطط ومن يملك صلاحيتها قبل تنفيذها.
