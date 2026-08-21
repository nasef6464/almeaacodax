# Assessment System Audit V2 — Post-Recovery Baseline

**تاريخ المراجعة:** 20 أغسطس 2026  
**Baseline:** `main` بعد دمج Platform V3 Recovery (`7b666fe50d00766ce16f4b3f42d91edd659ffa12`)  
**Active branch:** `develop/assessment-platform-v1`

> هذه النسخة تستبدل الاستنتاجات القديمة التي أصبحت غير صحيحة بعد التطوير الذي تم على نظام الاختبارات وRecovery. لا تُعاد معالجة مشكلة قديمة إلا إذا ما زال دليلها موجودًا في الكود الحالي.

---

## A. الملخص التنفيذي

### الحالة الحالية
نظام الاختبارات **وظيفي وقابل للبناء عليه**، وقد أُنجز بالفعل جزء مهم من خطة التوحيد السابقة:

- `Quiz` أصبح يدعم `quizKind: drill | test | mock`.
- `UnifiedQuizBuilder` مستخدم فعليًا في عدة مسارات.
- المحاكيات تدعم `mockExam.sections` ونتائج الأقسام.
- يوجد `quizSnapshot` داخل النتائج.
- يوجد `submissionKey` لمنع تكرار معالجة التسليم.
- تحقق استهداف الطالب موجود في Backend.
- `learningPlacements` يوفر أساسًا جيدًا لفصل Assessment content عن مكان العرض.
- يوجد مصدر API-backed مشترك للأسئلة في `utils/exams/questionBankSource.ts`.

لكن النظام لم يصل بعد إلى Architecture موحدة بالكامل. المشكلة الرئيسية الحالية ليست فقدان البيانات، بل **تعدد مصادر القرار والمسؤوليات**:

1. تصنيف الاختبار موزع بين `quizKind`, `type`, `placement`, `showInTraining`, `showInMock`, `mockExam.enabled`, `mode`.
2. مصدر الأسئلة موحد جزئيًا فقط؛ بعض المكونات ما زالت تجلب الأسئلة بمنطق مستقل.
3. `UnifiedQuizBuilder` و`MockExamManager` ما زالا runtime paths فعليين بالتوازي.
4. `Quiz` ما زال يجمع المحتوى + النشر + placement + targeting + due date.
5. Barcode/Public Tests ما زالت كيانًا مستقلًا يكرر جزءًا من بيانات Assessment.
6. Backend quiz route يحمل مسؤوليات كثيرة داخل ملف واحد.
7. يوجد Contract drift مؤكد في بعض settings وMock enums بين Frontend/Validation/Database.

### القرار المعماري
لا إعادة كتابة للنظام ولا Migration واسعة الآن.

الرؤية المستهدفة تدريجيًا:

```text
Question Bank
      ↓
Assessment Definition
      ├── Normal
      │     ├── Practice
      │     └── Exam
      └── Mock
            └── Sections
      ↓
Assessment Center
      ↓
Distribution
      ├── Learning Placement
      ├── Directed Assignment (future)
      └── Session (future: QR/Live/Public)
      ↓
Attempt Engine
      ↓
Snapshot / Version
      ↓
Analytics
```

---

## B. حالة فرضيات التدقيق القديم

| الفرضية القديمة | الحالة الحالية | الدليل/القرار |
|---|---|---|
| إضافة سؤال من `SubjectQuizzesPanel` لا تحفظ | **FIXED** | المسار الحالي يحفظ عبر API ويعالج الفشل؛ لا تعاد معالجة المشكلة القديمة. |
| الحفظ الوهمي للاختبار/السؤال | **NOT CONFIRMED / FIXED EARLIER** | Store/builders الحالية تنتظر API وتستخدم نتيجة السيرفر. |
| معرفات دائمة محلية بدل السيرفر | **NOT CONFIRMED / FIXED EARLIER** | لا يجب إعادة إدخال IDs دائمة من العميل. |
| لا يوجد Snapshot للنتيجة | **FIXED** | `QuizResult.quizSnapshot` موجود ويُبنى وقت submit. |
| Submit يمكن تكراره بلا حماية | **FIXED** | `submissionKey` unique/sparse + conflict handling. |
| Backend لا يتحقق من استهداف الطالب | **FIXED** | submit يعيد التحقق من target user/group ومن عضوية المجموعة في DB. |
| معاينة المحاكي تعتمد فقط على root `questionIds` | **FIXED** | توجد helpers تجمع section question IDs، وQuizPage يدعم المحاكي. |
| المحاكي يفقد section results | **FIXED** | `sectionResults` موجود في Model/Result flow. |
| `mock` مستخدم بمعنيين | **CONFIRMED** | `placement: mock` legacy لا يعني دائمًا محاكيًا حقيقيًا، بينما `quizKind=mock/mockExam.enabled` يعني المحاكي الحقيقي. |
| مصدر الأسئلة غير موحد | **PARTIAL** | `questionBankSource.ts` موجود، لكن `SmartQuestionSelector` وبعض flows ما زالت تملك fetching logic مستقلًا. |
| تعدد منشئات الاختبارات | **CONFIRMED / PARTIAL MIGRATION** | `UnifiedQuizBuilder` توسع، لكن `MockExamManager` ما زال مستدعى فعليًا و`QuizBuilder` legacy ما زال موجودًا. |
| Contract settings غير متطابق | **CONFIRMED** | أمثلة: `shuffleOptions` مقابل `randomizeOptions`، واختلاف بعض Mock enum/config boundaries. |
| التوجيه نوع اختبار مستقل | **DESIGN DEBT** | لا يوجد entity مستقل؛ targeting/dueDate ما زال داخل `Quiz`. |

---

## C. خريطة النظام الحالية

| المكون | المسؤولية الحالية | حالة التوحيد |
|---|---|---|
| `server/src/models/Quiz.ts` | Assessment definition + legacy placement + workflow + targeting + mock config | قوي وظيفيًا، مسؤولياته كثيرة |
| `server/src/models/QuizResult.ts` | نتيجة + section results + snapshot + idempotency key | جيد، أساس مناسب للتطوير |
| `server/src/routes/quiz.routes.ts` | definitions + questions + access + submit + results + analytics | يحتاج modularization لاحقًا بدون تغيير routes |
| `server/src/modules/quizzes/http/quizDefinitionSchema.ts` | Boundary validation للـQuiz | يحتاج contract tightening تدريجيًا |
| `dashboards/admin/UnifiedQuizBuilder.tsx` | drill/test/mock wizard | أصبح المسار الأساسي في عدة أماكن |
| `dashboards/admin/MockExamManager.tsx` | mock creation/management + smart selection | runtime path فعلي، لا يُحذف الآن |
| `dashboards/admin/QuizBuilder.tsx` | legacy builder/functions قديمة | يحتاج call-site inventory قبل freeze/delete |
| `dashboards/admin/QuizzesManager.tsx` | Assessment center الحالي + placement + targeting | أقرب نقطة للرؤية المستقبلية لكن ما زال يجمع مسؤوليات |
| `dashboards/admin/SupervisorTestsManager.tsx` | supervisor directed tests + analytics | يستخدم Unified للnormal وMock manager للمحاكي |
| `utils/exams/questionBankSource.ts` | API-backed approved-question source | مرشح ليكون المصدر المشترك |
| `dashboards/admin/SmartQuestionSelector.tsx` | اختيار يدوي/مهارات/ذكي | fetching مستقل جزئيًا ويحتاج convergence |
| `utils/quizPlacement.ts` | legacy placement compatibility | يجب ألا يكون مصدر تعريف true mock |
| `utils/assessmentClassification.ts` | **الجديد في Assessment V1**: canonical classification adapter | بداية تثبيت الـcore بدون Migration |
| `utils/quizLearningPlacement.ts` | مكان العرض والوصول لكل slot | أساس جيد لفصل المحتوى عن النشر |
| `pages/QuizPage.tsx` | student runner للnormal/mock | قوي وظيفيًا لكنه يحمل منطقًا كثيرًا؛ modularize لاحقًا |
| `server/src/models/PublicBarcodeTest.ts` | QR/Public/Live test definition + runtime state | يكرر Assessment data؛ مرشح Session layer مستقبلًا |

---

## D. التصنيف الحالي والمشكلة الأساسية

### الحقول الحالية

```text
quizKind: drill | test | mock
type: quiz | bank
placement: training | mock | both
showInTraining
showInMock
mockExam.enabled
mode: regular | saher | central
```

المشكلة ليست وجود هذه الحقول بسبب التوافق القديم؛ المشكلة أن أكثر من مكون يستطيع استخدامها لتحديد معنى الاختبار.

### القاعدة القانونية الجديدة في V1

```text
quizKind=drill → Assessment kind=normal, normalMode=practice
quizKind=test  → Assessment kind=normal, normalMode=exam
quizKind=mock  → Assessment kind=mock
mockExam.enabled=true → Assessment kind=mock (legacy compatibility)

mode=regular → delivery=regular
mode=saher   → delivery=self
mode=central → delivery=directed
```

**قاعدة غير قابلة للالتباس:**
`placement: mock` أو `showInMock=true` لا يثبت أن العنصر Mock Assessment حقيقيًا.

تمت إضافة `utils/assessmentClassification.ts` كبداية للمصدر القانوني على Frontend، مع إبقاء `utils/quizPlacement.ts` كطبقة compatibility للـplacement القديم.

---

## E. Contract drift المؤكد

### 1. ترتيب الاختيارات
يوجد اختلاف حالي بين:

- `UnifiedQuizBuilder`: يستخدم اسمًا legacy مثل `shuffleOptions` داخل settings.
- Barcode model/runtime: يستخدم `randomizeOptions`.
- `QuizSettings`/Quiz database settings لا يملكان عقدًا موحدًا نهائيًا لهذا السلوك.

**الخطر:** setting تظهر في UI لكن قد لا تحفظ/تطبق بصورة متسقة.

**القرار:** لا نغير الاسم في كل النظام دفعة واحدة. أولًا نحدد canonical name + legacy read mapping + round-trip test، ثم نطبقه على runner/backend بالتدريج.

### 2. Mock config enums
`MockExamConfig` في Frontend يسمح ببعض القيم التي لا يضمن Boundary schema قبولها بنفس الاتساع.

**القرار:** إنشاء Contract matrix وتثبيت enum واحد قبل إضافة أنواع محاكيات جديدة.

### 3. Settings schema
`quizDefinitionSchema` يسمح حاليًا بـ`settings` مرنة نسبيًا، بينما Mongoose Quiz settings محدد أكثر.

**الخطر:** Backend validation قد يقبل property ثم Mongoose لا يخزنها أو runtime لا يطبقها.

**القرار:** الانتقال إلى settings schema صريح تدريجيًا مع legacy mapping واختبارات round-trip.

---

## F. مصدر الأسئلة

### ما تم
`utils/exams/questionBankSource.ts`:
- API-backed.
- approved question filtering.
- pagination.
- path/subject/section/skill/search.

### ما لم يكتمل
`SmartQuestionSelector` ما زال:
- يملك fetch cycle مستقلًا.
- يستخدم limit مختلفًا.
- يدمج API + Store لإظهار selected items.
- يطبق بعض الفلاتر محليًا.

`MockExamManager` يستخدم المصدر المشترك في بعض المواضع لكن ما زالت لديه selection logic إضافية.

### الهدف في A2
إنشاء Data-access واحد لكل builders يوفر:

```text
search(filters, pagination)
hydrateByIds(ids)
validateSelected(ids)
suggestByBlueprint(...)
```

مع الاحتفاظ بالاختيارات عند تغيير الفلاتر وعدم افتراض أن أول N سؤال = البنك كله.

---

## G. Builders

### الحالة
- `UnifiedQuizBuilder` يدعم `drill/test/mock`.
- `QuizzesManager` و`SubjectQuizzesPanel` يستخدمانه في عدة مسارات.
- `SupervisorTestsManager` ما زال يفتح `MockExamManager` للمحاكي.
- `MockExamManager` يحتوي وظائف فعلية لا يجوز حذفها قبل نقلها.
- `QuizBuilder` يحتاج inventory دقيق للمستدعين والوظائف الفريدة.

### القرار
لا إعادة كتابة للـBuilder.

الخطة:

```text
AssessmentBuilderShell
├── BasicInfo
├── QuestionSelection
├── Settings
├── Review
├── NormalEditor
└── MockSectionsEditor
```

تُستخرج المكونات المشتركة أولًا، ثم تنقل الوظائف الفريدة من `MockExamManager`، ثم يُجمّد legacy builder، ثم الحذف فقط بعد إثبات zero callers.

---

## H. النشر والتوجيه

### Learning placement
`learningPlacements` مناسب معماريًا ليكون طبقة ربط Assessment بالمادة/التدريب/الدورة/التأسيس.

### Directed targeting
حاليًا داخل `Quiz`:

```text
targetGroupIds
targetUserIds
dueDate
mode=central
```

وهذا يسمح بتوجيه واحد فعليًا لكل نسخة Quiz ولا يناسب مستقبلًا سيناريوهات متعددة لنفس Assessment بسياسات مختلفة.

### القرار
لا ننشئ `ExamAssignment` الآن.

بعد تثبيت core/builder/runner، نبدأ adapter ثم dual-read/dual-write قبل migration.

---

## I. Barcode / Public / Live

`PublicBarcodeTest` يملك حاليًا:
- question IDs
- settings
- targeting
- path/subject/skills
- public/live state
- slug/PIN/leaderboard

هذا يعني أن جزءًا منه Assessment definition وجزءًا منه Session runtime.

### الاتجاه المستقبلي

```text
AssessmentSession
  assessmentId
  assessmentVersion
  mode: public | live | targeted
  slug / pin
  audience
  startsAt / endsAt
  liveState
  leaderboardPolicy
```

لكن لا يتم هذا قبل A2-A6؛ Barcode الحالي يبقى متوافقًا حتى اكتمال migration واضحة.

---

## J. النتائج والمحاولات

### تم بالفعل
- `quizSnapshot`.
- `sectionResults`.
- `questionReview`.
- `submissionKey`.
- server-side submit path.

### التطوير المستقبلي
Snapshot الحالي يحمي قدرًا مهمًا من التاريخ، لكن النموذج الأقوى لاحقًا هو Assessment revision/version:

```text
assessmentId
assessmentVersion
attemptId
assignmentId? / sessionId?
```

لا ننفذ versioning الآن قبل تثبيت Assessment definition contract.

---

## K. الصلاحيات

### الحالة المؤكدة
- Backend يحتوي role guards وscope logic.
- Supervisor targeting يُقيد إلى نطاقه.
- Student submit يعيد التحقق من الاستهداف، ومع group-targeted quiz يعيد فحص membership من DB.

### Regression requirement
كل Refactor قادم يجب أن يثبت أن Admin/Supervisor/Teacher/Student boundaries لم تتغير، وألا يعتمد على إخفاء UI فقط.

---

## L. المخاطر الحالية مرتبة

### عالية هندسيًا (وليست Production outage حالية)
1. Contract drift بين UI/settings/schema/model.
2. استمرار أكثر من classification rule لو لم تُنقل الاستدعاءات تدريجيًا إلى canonical resolver.
3. تكرار question fetching/selection logic.

### متوسطة
4. تعدد builders runtime.
5. ضخامة quiz route وصعوبة تعديلها بأمان.
6. targeting داخل Quiz يمنع تعدد التكليفات المرنة مستقبلًا.

### لاحقة
7. Barcode ككيان assessment/session مزدوج.
8. عدم وجود formal AssessmentVersion حتى الآن.

---

## M. خطة التنفيذ المعتمدة

### A0 — Audit V2
**الحالة:** Started/Updated في هذا الفرع.

Acceptance:
- إزالة false positives القديمة من التقرير.
- حفظ status واضح لكل فرضية.
- ربط الخطة بالحالة الفعلية بعد Recovery.

### A1 — Canonical Assessment Contract
**الحالة:** In progress.

أهداف:
- canonical classification resolver.
- legacy compatibility.
- contract matrix للإعدادات والـmock config.
- round-trip guards.

Rollback:
- resolver additive أولًا، ولا Migration للبيانات.
- legacy helpers تبقى exports متوافقة.

### A2 — Unified Question Source
- central query/hydration/validation adapter.
- pagination.
- selected IDs hydration.
- no Store-only truth.

### A3 — Builder Components
- extract common components.
- no UX rewrite.
- no delete.

### A4 — Mock Convergence
- move unique mock features.
- prove zero callers before deprecation.

### A5 — Backend Modularization
- internal route decomposition.
- same public API.

### A6 — Runner Core
- normal/mock strategies.
- same routes/UX.

### A7 — Distribution Foundation
- adapter/interface around current targeting.

### A8 — Assignment
- separate entity only after dual-read/write design + migration dry-run.

### A9 — Session Unification
- Barcode/Public/Live migration path.

### A10 — Versioning & Analytics
- formal revisions and unified reporting.

### A11 — Legacy Cleanup
- remove only after search/telemetry/tests prove zero usage.

---

## N. Regression Gate المطلوب لكل مرحلة

على الأقل:

```text
Old practice works
Old normal exam works
Old mock works
Old directed exam works
Saher works
Barcode works
Course quizzes work
Learning-placement quizzes work
Existing result remains readable
Existing URLs remain valid
RBAC unchanged
```

Existing test families التي يجب الحفاظ عليها:

```text
smoke:mock-exams
smoke:exam-question-source
smoke:quiz-access
smoke:quiz-integrity-guard
smoke:quiz-answer-exposure
smoke:saher-skills
smoke:barcode-public-tests
smoke:learning-placement-admin
smoke:results
smoke:course-quiz-context
```

---

## O. القرار الحالي

نستمر في **Assessment Platform V1 — Architecture Stabilization** على الفرع `develop/assessment-platform-v1`.

لا نبدأ الآن:
- `ExamAssignment`.
- حذف builders.
- Migration واسعة للـplacement.
- إعادة تصميم Student UI.
- إعادة بناء Barcode.

الخطوة المباشرة بعد هذا التدقيق:
1. تثبيت canonical classification واستخدامه عبر compatibility helpers.
2. حصر settings/mock contract drift وإضافة guards.
3. ثم A2: توحيد Question source.

راجع دائمًا أيضًا:
- `docs/assessment-platform-v1-handoff.md`
- `docs/assessment-refactor-progress.md`
