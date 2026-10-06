# Assessment Contract Matrix

**Branch:** `develop/assessment-platform-v1`  
**Date:** 2026-08-20

الغرض من هذه الوثيقة: تحديد الاسم القانوني لكل setting/config ومعرفة هل هو **يحفظ + يُسترجع + يُطبق في Student Runner** قبل أن نعتبره مدعومًا.

الحالات:
- `GREEN`: العقد متوافق ومستخدم فعليًا.
- `COMPAT`: يعمل مع legacy alias أو compatibility layer.
- `DRIFT`: اختلاف مؤكد يحتاج إصلاحًا.
- `BOUNDARY FIXED`: تم إصلاح فقد الحقل عند API boundary في Assessment V1.
- `PLANNED`: قرار معماري مؤجل.

---

## 1. Classification contract

| المفهوم | Canonical | Legacy inputs | الحالة |
|---|---|---|---|
| Assessment content kind | `normal | mock` | `quizKind`, `mockExam.enabled` | `COMPAT` عبر `assessmentClassification.ts` |
| Normal mode | `practice | exam` | `drill | test` | `COMPAT` |
| Delivery mode | `regular | self | directed` | `mode: regular | saher | central` | `COMPAT` |
| True mock proof | `quizKind=mock || mockExam.enabled=true` | لا يعتمد على `placement=mock` | `GREEN` contract جديد |
| Learning visibility | `learningPlacements` تدريجيًا | `placement/showInTraining/showInMock/type` | `COMPAT`, migration later |

---

## 2. Quiz settings

| السلوك | Canonical المقترح | Frontend Builder | API Boundary | Mongo Quiz Model | Student Runner | الحالة |
|---|---|---|---|---|---|---|
| إظهار التفسير | `showExplanations` | `showExplanations` | settings حاليًا record مرن | موجود | يستخدم في مسارات النتيجة/المراجعة حسب flow | `GREEN/PARTIAL` |
| إظهار الإجابات | `showAnswers` | يقرأ `showAnswers` ثم legacy `showCorrectAnswers` | record مرن | موجود | `quiz.settings.showAnswers` | `COMPAT` |
| تقرير النتيجة | `showResultsReport` | defaults/current flows | record مرن | موجود | يؤثر على return/result flow | `GREEN` |
| الرجوع للمصدر | `returnToSourceOnFinish` | defaults/current flows | record مرن | موجود | مستخدم | `GREEN` |
| عدد المحاولات | `maxAttempts` | موجود | record مرن | موجود | Backend submit policy | `GREEN` |
| درجة النجاح | `passingScore` | موجود | record مرن | موجود | Backend/result | `GREEN` |
| المدة | `timeLimit` | موجود | record مرن | موجود | Backend + runner | `GREEN` |
| عشوائية الأسئلة | `randomizeQuestions` | يقرأ canonical ثم legacy `shuffleQuestions` | record مرن | موجود | مستخدم في `QuizPage` | `COMPAT` |
| عشوائية الاختيارات | **`randomizeOptions`** | حاليًا يكتب `shuffleOptions` | record مرن | **غير موجود في Quiz model** | **غير مطبق في QuizPage** | `DRIFT` |
| شريط التقدم | `showProgressBar` | defaults | record مرن | موجود | مستخدم | `GREEN` |
| إجبار الإجابة قبل التالي | `requireAnswerBeforeNext` | defaults | record مرن | موجود | يحتاج runner acceptance proof مستقل | `PARTIAL` |
| مراجعة الأسئلة | `allowQuestionReview` | defaults | record مرن | موجود | مستخدم | `GREEN` |
| شكل الاختيارات | `optionLayout` | defaults/model يدعمان `auto/horizontal/two_columns` | record مرن | موجود | **QuizPage يثبت active layout إلى horizontal حاليًا** | `DRIFT` |

### قرار أسماء settings
- الاسم القانوني لعشوائية الأسئلة: `randomizeQuestions`.
- legacy read: `shuffleQuestions` فقط للتوافق، ولا يكتب جديدًا مستقبلًا.
- الاسم القانوني لعشوائية الاختيارات: `randomizeOptions` لأنه مستخدم أصلًا في Barcode model/runtime ومناسب مع `randomizeQuestions`.
- legacy read للـQuiz: `shuffleOptions`.
- **لا نعتبر `randomizeOptions` مدعومًا للـQuiz حتى يثبت model + builder round-trip + runner mapping الصحيح للـcorrectOptionIndex.**

---

## 3. Mock config

| الحقل | Frontend type | Unified/Mock builders | API Zod | Mongo | الحالة |
|---|---|---|---|---|---|
| `enabled` | موجود | مستخدم | موجود | موجود | `GREEN` |
| `pathId` | موجود | مستخدم | موجود | موجود | `GREEN` |
| `qiyasCategory` | `qudrat/tahsili/specialized` | Unified حاليًا يركز على qudrat/tahsili | **تم توسيعه في A1 إلى specialized** | string | `BOUNDARY FIXED` |
| `targetScore` | موجود | محدود الاستخدام حاليًا | **أضيف في A1** | موجود | `BOUNDARY FIXED` |
| `isStrictSectionLock` | موجود | مستخدم | موجود | موجود | `GREEN` |
| section `id` | موجود | مستخدم | موجود | موجود | `GREEN` |
| section `title` | موجود | مستخدم | موجود | موجود | `GREEN` |
| section `subjectId` | موجود | مستخدم | موجود | موجود | `GREEN` |
| section `questionIds` | موجود | مستخدم | موجود | موجود | `GREEN` |
| section `timeLimit` | موجود | مستخدم | موجود | موجود | `GREEN` |
| section `order` | موجود | مستخدم | موجود | موجود | `GREEN` |
| section `domain` | enum | مستخدم | enum | string | `GREEN/PARTIAL` |
| section `isStrictSectionLock` | موجود | `MockExamManager` ينشئه | **أضيف في A1** | موجود | `BOUNDARY FIXED` |

تمت إضافة `scripts/smoke-assessment-definition-boundary-contract.mjs` لإثبات أن Zod لا يحذف `targetScore` أو section lock، وأن targetScore خارج 0..100 يُرفض.

---

## 4. Access / placement / publication

| المفهوم | الحقول الحالية | الاتجاه |
|---|---|---|
| Content approval | `approvalStatus`, workflow fields | يبقى في Assessment Definition |
| Repository publication | `isPublished` | فصل semantics بوضوح لاحقًا، بدون rename واسع الآن |
| Platform visibility | `showOnPlatform` | يبقى compatibility أثناء migration |
| Learning placement | `learningPlacements[]` | **الأساس المستقبلي** لمكان الظهور |
| Legacy placement | `placement`, `showInTraining`, `showInMock`, `type` | read compatibility ثم migration later |
| Directed audience | `targetGroupIds`, `targetUserIds`, `dueDate`, `mode=central` | إلى Assignment layer لاحقًا |
| Self practice | `mode=saher` | Delivery/origin وليس Assessment kind |

---

## 5. Current blockers before A2

### يجب إصلاحه في A1
1. لا نسمح بإضافة setting جديدة إلا إذا كان لها:
   - Type/contract.
   - API acceptance.
   - DB persistence.
   - Reload compatibility.
   - Runner behavior.
2. عشوائية الاختيارات تحتاج تصميم آمن لأن ترتيب الاختيارات يؤثر على `correctOptionIndex` وselected index أثناء submit.
3. `optionLayout` محفوظ لكنه لا يُحترم حاليًا في QuizPage؛ لا يُعتبر feature مكتملًا حتى إصلاح runner.
4. settings Zod يجب أن ينتقل تدريجيًا من `z.record(z.any())` إلى schema صريح مع passthrough/legacy policy موثقة، لكن لا يتم ذلك دفعة واحدة قبل inventory كامل.

### يمكن أن ينتقل إلى A2 بعد Green CI
- توحيد Question Source لا يعتمد على حل Assignment أو Barcode migration.

---

## 6. Acceptance rule

أي setting/config جديد لا يحصل على علامة `GREEN` حتى ينجح التسلسل:

```text
Builder value
  → API validation
  → Mongo persistence
  → GET/reload
  → edit form restoration
  → Student Runner behavior
  → result/analytics behavior if applicable
```

هذا الـround-trip هو القاعدة التي ستمنع مستقبلًا ظهور إعدادات في الواجهة لا تعمل فعليًا.
