# تقرير التدقيق الهندسي الكامل — نظام الاختبارات
**تاريخ التدقيق:** 15 أغسطس 2026 | **المُدقِّق:** Senior Engineer Audit

---

## A. الملخص التنفيذي

### حالة النظام الحالية
النظام وظيفي بشكل عام، والبنية الأساسية سليمة. الحفظ عبر السيرفر مُفعَّل وصحيح في أغلب المسارات، ومعرفات السيرفر تُستخدم كمصدر الحقيقة. ومع ذلك، يوجد **ثغرة حرجة مؤكدة في إضافة سؤال جديد من داخل `SubjectQuizzesPanel`**.

### أهم 5 مشكلات (مرتبة حسب الخطورة)

| # | المشكلة | الخطورة |
|---|---|---|
| 1 | `SubjectQuizzesPanel`: `onSave` للسؤال الجديد يُغلق النافذة فقط دون حفظ | **حرجة** |
| 2 | لا يوجد Snapshot للاختبار وقت المحاولة — تعديل الاختبار يؤثر على النتائج القديمة | **عالية** |
| 3 | `isMockQuiz` في `quizPlacement.ts` قد يُصنِّف محاكيًا كـ"اختبار عادي" إذا كان `showInMock` مفقودًا | متوسطة |
| 4 | صلاحيات الطالب في الوصول للاختبار لا تُتحقق منها في Backend | متوسطة |
| 5 | تصنيف `quizMatchesKind` في `SubjectQuizzesPanel` يُظهر المحاكيات القديمة بلا `quizKind` ضمن "الاختبارات" | منخفضة |

### ما يمكن إصلاحه فوراً (في هذه الجلسة)
- **الثغرة الحرجة #1:** إصلاح `onSave` في `SubjectQuizzesPanel` ليستدعي `addQuestion` فعلياً.
- **المشكلة #3:** توحيد مؤشر تحديد نوع الاختبار باستخدام `isTrueMockExam`.

### ما يحتاج قراراً معمارياً لاحقاً
- **الثغرة #2 (Snapshot):** إضافة حقل `quizSnapshot` لكيان `QuizResult` يحفظ نسخة القراءة فقط من الاختبار وقت المحاولة. يحتاج Migration للبيانات القديمة.
- **الثغرة #4 (صلاحيات الطالب):** إضافة middleware في Backend للتحقق من أن الطالب ضمن `targetGroupIds` أو `targetUserIds` عند استدعاء `/submit`.

---

## B. خريطة النظام الحالية

| المكون/الملف | وظيفته | من يستدعيه | مصدر البيانات | API | نوع الاختبار | الدور | مستخدم؟ | يتكرر؟ |
|---|---|---|---|---|---|---|---|---|
| `UnifiedQuizBuilder.tsx` | إنشاء/تعديل اختبار (عادي/تدريب/محاكي) | `QuizzesManager`, `SubjectQuizzesPanel`, `MockExamManager` | API | `addQuiz`, `updateQuiz` | الكل | admin/supervisor/teacher | ✅ | يتداخل مع QuizBuilder |
| `QuizBuilder.tsx` | إنشاء/تعديل اختبار قديم + AI generation | `SupervisorDashboard`, `SupervisorTestsManager` | Store+API | `addQuiz`, `updateQuiz` | عادي/تدريب | supervisor/teacher | ✅ | نعم، يتداخل مع UnifiedQuizBuilder |
| `MockExamManager.tsx` | إدارة المحاكيات (مستقلة عن QuizzesManager) | `AdminDashboard` | API+Store | `addQuiz`, `updateQuiz` | محاكي فقط | admin | ✅ | يتداخل جزئياً |
| `QuizzesManager.tsx` | مركز الاختبارات + التوجيه | `AdminDashboard` | API+Store | كل عمليات Quiz | عادي/تدريب/محاكي | admin | ✅ | - |
| `SmartQuestionSelector.tsx` | اختيار أسئلة لاختبار/محاكي | `UnifiedQuizBuilder`, `MockExamManager` | API مباشر | `getQuestions` | - | admin/supervisor | ✅ | - |
| `UnifiedQuestionBuilder.tsx` | إنشاء/تعديل سؤال | `QuizBuilder`, `QuestionBankManager`, `SubjectQuizzesPanel`, `MockExamManager` | Store | callback `onSave` | - | الكل | ✅ | - |
| `SubjectQuizzesPanel.tsx` | لوحة تدريبات/اختبارات مادة | `AdvancedCourseBuilder`, `PathsManager` | Store | `updateQuiz`, `deleteQuiz` | عادي/تدريب | admin | ✅ | **لديها ثغرة** |
| `QuestionBankManager.tsx` | مستودع بنك الأسئلة | `AdminDashboard` | API | `addQuestion`, `updateQuestion` | - | admin | ✅ | - |
| `useStore.ts` | إدارة الحالة | الكل | API | كل العمليات | - | - | ✅ | - |
| `utils/mockExam.ts` | classifier للمحاكيات | `MockExamManager`, `QuizzesManager`, `QuizPage` | - | - | محاكي | - | ✅ | - |
| `utils/quizPlacement.ts` | classifier للـ Placement | `useStore`, `QuizzesManager` | - | - | الكل | - | ✅ | بعض التكرار مع `mockExam.ts` |
| `pages/QuizPage.tsx` | تجربة الاختبار للطالب | App routing | API/Store | `getQuiz`, `submitQuiz` | الكل | student | ✅ | - |
| `server/src/models/Quiz.ts` | نموذج قاعدة البيانات | `quiz.routes.ts` | MongoDB | - | - | - | ✅ | - |
| `server/src/models/QuizResult.ts` | نتائج المحاولات | `quiz.routes.ts` | MongoDB | - | - | - | ✅ | - |
| `server/src/routes/quiz.routes.ts` | كل API endpoints | frontend services | MongoDB | 3101 سطر | الكل | الكل | ✅ | - |

---

## C. دورة الحياة الحالية

### الاختبار العادي / التدريب
```
إنشاء (UnifiedQuizBuilder/QuizBuilder)
  → تحديد المسار + المادة + quizKind (drill/test)
  → اختيار الأسئلة (SmartQuestionSelector ← API)
  → حفظ: normalizeQuizPlacement → addQuiz → api.createQuiz → سيرفر → Store
  → المعاينة: /quiz/:id → QuizPage (يقرأ questionIds من الجذر)
  → الطالب: Quizzes.tsx / SubjectLearningPage → quiz.settings.showAnswers
  → التسليم: QuizPage.handleFinish → api.submitQuiz → quiz.routes.ts
  → النتيجة: QuizResult محفوظة في MongoDB + تحليل مهارات
```

### الاختبار المحاكي
```
إنشاء (UnifiedQuizBuilder quizKind=mock / MockExamManager)
  → تحديد الأقسام (sections[]) + mockExam.enabled=true
  → لكل قسم: SmartQuestionSelector مع sectionId
  → حفظ: normalizeQuizPlacement → placement="mock", showInMock=true, mockExam.enabled=true
  → المعاينة: /quiz/:id → QuizPage يستخدم flattenMockExamQuestionIds()
  → QuizPage: getMockExamSections() → يرتب الأسئلة حسب الأقسام
  → التسليم: sectionResults تُحسب في Frontend + في quiz.routes.ts
  → النتيجة: QuizResult.sectionResults[] محفوظة
```

### الاختبار الموجه
```
هو نفس الاختبار (عادي أو محاكي) + تعديل:
  targetGroupIds / targetUserIds / dueDate / mode="central"
لا يوجد كيان Assignment منفصل.
يمكن تعديل هذه الحقول من QuizzesManager (لوحة التوجيه).
```

---

## D. جدول المشكلات

### مشكلة #1 — حرجة: إضافة سؤال من SubjectQuizzesPanel لا تحفظ

**الوصف:** في `SubjectQuizzesPanel.tsx` السطر 309:
```tsx
<UnifiedQuestionBuilder
  initialQuestion={{ pathId, subject: subjectId }}
  subjectId={subjectId}
  onSave={() => setShowQuestionBuilder(false)}  // ← BUG: فقط تُغلق النافذة
  onCancel={() => setShowQuestionBuilder(false)}
/>
```
`UnifiedQuestionBuilder` يستدعي `onSave(questionData)` ويمرر بيانات السؤال كمعامل.
لكن callback هنا يتجاهل المعامل تماماً ويكتفي بإغلاق النافذة.

**الأثر:** كل سؤال يُنشأ من "إضافة سؤال" في لوحة المادة **لا يُحفظ في قاعدة البيانات أبداً**.
**المستخدمون المتأثرون:** المدير/المشرف عند إضافة أسئلة من داخل ادارة مادة.
**يؤثر على البيانات:** نعم — فقدان بيانات مؤكد.

**دليل مقارن:** `QuestionBankManager.tsx` لديها:
```tsx
onSave={handleSave}  // await addQuestion(savedQuestion)
```
وهذا هو السلوك الصحيح.

**الحل:** استدعاء `addQuestion` داخل callback مع معالجة الخطأ.
**اختبار القبول:** إنشاء سؤال → يظهر في بنك الأسئلة بعد Refresh.

---

### مشكلة #2 — عالية: لا يوجد Snapshot للاختبار وقت المحاولة

**الوصف:** `QuizResult` يحفظ `quizId` فقط، لا يحفظ نسخة من الاختبار.
إذا عدّل المدير الإجابة الصحيحة لسؤال → **تتغير نتائج المحاولات القديمة** لأن `questionReview` يُعاد حسابه من الأسئلة الحية.

**دليل:** `QuizResult.ts`:
```ts
questionReview: { type: [Schema.Types.Mixed], default: [] }
// يُملأ من بيانات الأسئلة الحالية، لا من snapshot
```

**الحل المقترح لاحقاً:** إضافة `quizSnapshot: { questionIds: string[], settings: object }` لـ QuizResult يُحفظ عند التسليم. يحتاج Migration.

---

### مشكلة #3 — متوسطة: ازدواجية في تحديد نوع الاختبار

**الوصف:** يوجد دالتان للتصنيف:
- `isMockQuiz()` في `quizPlacement.ts`: تعتمد على `showInMock / placement` — **تُعيد true للاختبارات العادية ذات `showInMock: true` أيضاً**
- `isTrueMockExam()` في `quizPlacement.ts`: تعتمد على `quizKind === 'mock' || mockExam.enabled` — هذه الصحيحة

**الخطر:** بعض المكونات تستخدم `isMockQuiz()` للتصنيف بدل `isTrueMockExam()`.
في `SubjectQuizzesPanel`:
```ts
// السطر 43: الاختبارات العادية التي showInMock=true تظهر في تبويب "اختبار"
return quiz.placement === 'mock' || quiz.type === 'quiz' || !quiz.placement;
// → هذا يُظهر المحاكيات ضمن اختبارات المادة!
```

**الحل:** استخدام `isTrueMockExam()` كمرشح إضافي لاستبعاد المحاكيات من `SubjectQuizzesPanel`.

---

### مشكلة #4 — متوسطة: لا يوجد تحقق من صلاحية الطالب في Backend قبل submit

**الوصف:** في `quiz.routes.ts`، `assertQuizWindowIsOpen` تتحقق من `dueDate` و `timeLimit` فقط.
لا يوجد تحقق: هل هذا الطالب مُستهدَف فعلاً في `targetGroupIds` أو `targetUserIds`؟

**الأثر:** أي طالب يعرف معرف الاختبار يمكنه تقديم نتيجة، حتى لو الاختبار موجه لمجموعة أخرى.
**الحل:** إضافة guard في route `/submit` يتحقق من membership إذا كان الاختبار له `targetGroupIds` أو `targetUserIds`.

---

### مشكلة #5 — منخفضة: quizMatchesKind تعرض المحاكيات ضمن "الاختبارات" في SubjectQuizzesPanel

**الوصف:** `SubjectQuizzesPanel.tsx` السطر 43:
```ts
return quiz.placement === 'mock' || quiz.type === 'quiz' || !quiz.placement;
```
المحاكيات القديمة التي `type === 'quiz'` ستظهر هنا.

---

## E. توافق العقود (Field Name Parity)

| الحقل | Frontend types.ts | UnifiedQuizBuilder | QuizBuilder | Zod Schema | MongoDB Model | QuizPage (طالب) | الحالة |
|---|---|---|---|---|---|---|---|
| إظهار الإجابة | `showAnswers: boolean` | `showAnswers` ✅ | `showAnswers` ✅ | `settings: z.record(z.any())` | `showAnswers: Boolean` | `quiz.settings.showAnswers` ✅ | **متوافق** |
| خلط الأسئلة | `randomizeQuestions?: boolean` | `randomizeQuestions` ✅ | `randomizeQuestions` ✅ | `settings: z.record(z.any())` | `randomizeQuestions: Boolean` | `settings.randomizeQuestions` ✅ | **متوافق** — UnifiedQuizBuilder لديه fallback: `(editingQuiz?.settings as any)?.showCorrectAnswers` للبيانات القديمة ✅ |
| عدد المحاولات | `maxAttempts?: number` | ❌ غير موجود | `maxAttempts` ✅ | `settings: z.record(z.any())` | `maxAttempts: Number` | - | **جزئي — UnifiedQuizBuilder لا يعرضه** |
| مادة السؤال | `subject: string` | - | - | `subjectId: z.string()` | `subjectId: String` | - | **تعارض اسم!** Frontend يستخدم `subject`، Backend يستخدم `subjectId` |

### تعارض اسم حقل مهم: `subject` vs `subjectId`
- نموذج `Question` في types.ts: حقل `subject` (بدون Id)
- نموذج `Quiz` في types.ts: حقل `subjectId`
- MongoDB Schema للـ Quiz: `subjectId`
- MongoDB Schema للـ Question: `subject` أيضاً
→ النظام متسق مع نفسه لكن الأسماء مختلطة، ليس تعارضاً وظيفياً.

---

## F. مصفوفة الصلاحيات

| العملية | المدير | المشرف | المعلم | الطالب | تحقق Backend | تحقق Frontend |
|---|---|---|---|---|---|---|
| إنشاء اختبار | ✅ | ✅ (scope) | ✅ (pending_review) | ❌ | ✅ `getWorkflowDefaults` | ✅ إخفاء أزرار |
| تعديل اختبار | ✅ | ✅ (owned) | ✅ (owned only) | ❌ | ✅ `buildOwnedDocumentQuery` | ✅ |
| حذف اختبار | ✅ | ✅ (owned) | ✅ (owned) | ❌ | ✅ | ✅ |
| اعتماد اختبار | ✅ | ✅ | ❌ | ❌ | ✅ `sanitizeWorkflowUpdate` | ✅ |
| نشر عالمي | ✅ | ✅ | ❌ (isPublished→false) | ❌ | ✅ | ✅ |
| توجيه للمجموعات | ✅ | ✅ (scope فقط) | ❌ | ❌ | ✅ `assertSupervisorDirectedScope` | ✅ |
| تسليم نتيجة | ✅ | ✅ | ✅ | ✅ | ⚠️ لا يتحقق من membership | ✅ |
| رؤية النتائج | ✅ | ✅ (scope) | ✅ (students only) | ✅ (own) | ✅ جزئياً | ✅ |

---

## G. سلامة البيانات

| النقطة | الحالة |
|---|---|
| معرفات محلية مؤقتة في حفظ الاختبار | ✅ مُعالجة — السيرفر مصدر الحقيقة |
| معرفات محلية في استيراد Excel | ⚠️ `q_import_${Date.now()}_${rowNumber}` تُولَّد محلياً للعرض فقط، ثم تُرسل لـ API التي تنشئ معرف حقيقي |
| أسئلة مفقودة في نتائج قديمة | ⚠️ ممكن — لا يوجد cascade protection على حذف السؤال |
| نتائج مرتبطة بالاختبار الحي لا بـ snapshot | ❌ مشكلة مؤكدة — راجع مشكلة #2 |
| idempotency التسليم | ✅ `submissionKey` يمنع تسليم مرتين لنفس المحاولة |
| بيانات قديمة بدون `quizKind` | ⚠️ موجودة — `inferQuizKind` يتعامل معها بـ fallback |
| تداخل تصنيف عادي/محاكي | ⚠️ `isMockQuiz` vs `isTrueMockExam` — راجع مشكلة #3 |

---

## H. خطة التنفيذ المرحلية

### المرحلة 1 — الأعطال الحرجة (الآن)
**الهدف:** إصلاح `SubjectQuizzesPanel` — السؤال لا يُحفظ
- الملف: `dashboards/admin/SubjectQuizzesPanel.tsx` السطر 309
- التغيير: استدعاء `addQuestion` داخل `onSave`
- Migration: لا
- Rollback: git revert
- اختبار القبول: إنشاء سؤال → ظهوره في بنك الأسئلة بعد Refresh

### المرحلة 2 — توحيد تصنيف الاختبار (قريباً)
**الهدف:** استخدام `isTrueMockExam` في `SubjectQuizzesPanel` لاستبعاد المحاكيات
- الملف: `SubjectQuizzesPanel.tsx` دالة `quizMatchesKind`

### المرحلة 3 — صلاحيات Backend للتسليم (لاحقاً)
**الهدف:** Guard يتحقق من membership للاختبارات الموجهة
- الملف: `server/src/routes/quiz.routes.ts` — route `/submit`

### المرحلة 4 — Snapshot للنتائج (معماري — لاحقاً)
**الهدف:** حفظ نسخة من الاختبار وقت المحاولة لحماية النتائج التاريخية
- الملف: `QuizResult.ts` + `quiz.routes.ts` route submit

### المرحلة 5 — فصل التوجيه (معماري بعيد المدى)
إنشاء كيان `ExamAssignment` منفصل عن `Quiz`.

### المرحلة 6 — توحيد المنشئ (تنظيف)
دمج `QuizBuilder` و`UnifiedQuizBuilder` بعد نقل AI generation.
