# سجل تقدم إصلاح نظام الاختبارات

## المرحلة 0: التدقيق الهندسي ✅ (مكتملة)
- [x] تتبع دورة حياة الاختبار وأنواعها (عادي، محاكي، تدريب).
- [x] فحص مشاكل الحفظ الوهمي للمعرفات.
- [x] التحقق من توافق أسماء الحقول.
- [x] إنشاء وثيقة التدقيق `docs/assessment-system-code-audit.md`.

**الملفات المدروسة:**
- `dashboards/admin/UnifiedQuizBuilder.tsx`, `SmartQuestionSelector.tsx`, `MockExamManager.tsx`, `QuizBuilder.tsx`
- `store/useStore.ts`, `server/src/routes/quiz.routes.ts`, `utils/quizPlacement.ts`, `utils/mockExam.ts`
- `pages/Quiz.tsx`, `pages/QuizPage.tsx`

---

## المرحلة 1: إصلاح الأعطال الحرجة ✅ (مكتملة — جلسة 2026-08-07)

### Commit `7bd6f26c` — الحفظ الحقيقي (Async Save)
- [x] `addQuiz/updateQuiz` في `useStore.ts` ينتظران السيرفر ويستخدمان ID الحقيقي.

### Commit `52b54af3` — توحيد الحقول والمنطق
- [x] توحيد `showAnswers` (بدلاً من `showCorrectAnswers`).
- [x] إضافة `isTrueMockExam()` في `utils/quizPlacement.ts`.
- [x] إضافة `getAllQuizQuestionIds()` في `utils/mockExam.ts`.

### Commit `78f520b7` — جلب الأسئلة المفقودة + إصلاح المحاكي
- [x] `UnifiedQuizBuilder` يجلب الأسئلة بـ IDs عند فتح اختبار موجود.
- [x] `flattenMockExamQuestionIds` لجمع أسئلة أقسام المحاكي.
- [x] حقول `mockExam` الناقصة في Zod schema.

### Commit `f2d3541a` — إصلاحات إضافية
- [x] `SmartQuestionSelector`: `selectedQuestions` يبحث في `allQuestionsMap`.
- [x] `normalizeQuizPlacement` يعالج `quizKind`.
- [x] `updateQuiz` يُطبِّع عند `quizKind/mockExam/learningPlacements`.
- [x] Backend: `normalizeQuizPlacementPayload` يدعم `quizKind`.

---

## المرحلة 2: إزالة المعرفات المحلية + توحيد المنشئ ✅ (مكتملة — جلسة 2026-08-09)

### Commit `43c9ab20` — إزالة كل المعرفات المحلية + توحيد المنشئ

#### `dashboards/admin/QuizBuilder.tsx`
- [x] **إصلاح حرج:** `handleSaveNewQuestion` كان يُنشئ `id: q_${Date.now()}` ثم يستخدمه لإضافة السؤال للاختبار.
  - **السابق:** السؤال يُحفظ بـ ID حقيقي في السيرفر لكن الاختبار يحتفظ بالـ ID المحلي المؤقت.
  - **الجديد:** يستخدم `persistedQuestion.id` المُرجع من `addQuestion()`.
  - **إضافي:** النافذة تبقى مفتوحة عند الفشل بدلاً من الإغلاق الصامت.
- [x] **إصلاح حرج:** `handleSaveWithFeedback` كان يُنشئ `id: quiz_${Date.now()}` محلياً.
  - **الجديد:** يُرسل للسيرفر بدون ID مسبق، يستخدم الـ ID المُرجع.

#### `dashboards/admin/QuizzesManager.tsx`
- [x] **إصلاح حرج:** `handleDuplicate` كان يستخدم `quiz_${Date.now()}_copy` كـ ID محلي.
  - **الجديد:** `async` يُرسل للسيرفر ويستخدم ID الحقيقي. يُعرض خطأ عند الفشل.
- [x] **تحسين:** جميع الاختبارات (قديمة وجديدة) تفتح `UnifiedQuizBuilder`.
  - الاختبارات القديمة (بدون `quizKind`) يُستنتج `quizKind` لها تلقائياً عبر `inferQuizKind()`.
  - يُزال import غير المستخدم لـ `QuizBuilder`.

#### `utils/quizPlacement.ts`
- [x] إضافة `inferQuizKind()` — تستنتج `quizKind` من `mockExam.enabled / type / placement` للتوافق العكسي.

### Commit `bb6d5b33` — إصلاح عرض الأسئلة في معاينة الاختبار
- [x] `QuizzesManager` preview: كان يعرض 'سؤال مرتبط بالمركز' بدلاً من النص الفعلي.
  - **الجديد:** يعرض النص المنقّى من HTML، ويُعلم بتحذير amber للأسئلة غير المحمّلة في الذاكرة.
  - يعرض الصعوبة والمهارات لكل سؤال.

---

## جدول المشكلات الكاملة

| # | المشكلة | الحالة | الملفات |
|---|---|---|---|
| 1 | حفظ وهمي — `addQuiz/updateQuiz` | ✅ تم | `useStore.ts` |
| 2 | اختفاء الأسئلة عند التعديل | ✅ تم | `UnifiedQuizBuilder.tsx`, `SmartQuestionSelector.tsx` |
| 3 | تعارض `showAnswers/showCorrectAnswers` | ✅ تم | `UnifiedQuizBuilder.tsx` |
| 4 | `normalizeQuizPlacement` لا يعرف `quizKind` | ✅ تم | `quizPlacement.ts` |
| 5 | Schema Backend يرفض حقول محاكي صحيحة | ✅ تم | `quiz.routes.ts` |
| 6 | `updateQuiz` لا يُطبِّع `quizKind` | ✅ تم | `useStore.ts` |
| 7 | `QuizBuilder.handleSaveNewQuestion` يستخدم `q_${Date.now()}` | ✅ تم | `QuizBuilder.tsx` |
| 8 | `QuizBuilder.handleSaveWithFeedback` يستخدم `quiz_${Date.now()}` | ✅ تم | `QuizBuilder.tsx` |
| 9 | `handleDuplicate` يستخدم `quiz_${Date.now()}_copy` | ✅ تم | `QuizzesManager.tsx` |
| 10 | الاختبارات القديمة لا تفتح `UnifiedQuizBuilder` | ✅ تم | `QuizzesManager.tsx` |
| 11 | Preview الاختبار يعرض نصاً مضللاً | ✅ تم | `QuizzesManager.tsx` |
| 12 | `MockExamManager.saveExam` غير async + بدون await | ✅ تم | `MockExamManager.tsx` |
| 13 | `MockExamManager` يستخدم `quiz_${now}` و`mock_exam_${now}` | ✅ تم | `MockExamManager.tsx` |
| 14 | `MockExamManager.handleInlineQuestionSave` يستخدم `q_mock_${now}` | ✅ تم | `MockExamManager.tsx` |
| 15 | دالة `handleSave` ميتة في `MockExamManager` لا تُستدعى | ✅ تم | `MockExamManager.tsx` |
| 16 | `QuizBuilder` AI generation يستخدم `q_ai_${now}` | ✅ تم | `QuizBuilder.tsx` |
| 17 | `QuestionBankManager.handleDuplicate` يستخدم `q_${now}_copy` | ✅ تم | `QuestionBankManager.tsx` |
| 18 | `QuestionBankManager.handleSave` يستخدم `q_${now}` | ✅ تم | `QuestionBankManager.tsx` |
| A | تعدد المنشئات (QuizBuilder/MockExamManager/UnifiedQuizBuilder) | ⏳ Phase 4 | — |
| B | كيان Assignment/التوجيه المستقل | ⏳ Phase 5 | — |
| C | دورة حياة موحدة (draft→approved→published) | ⏳ Phase 6 | — |
| D | Migration لبيانات قديمة (placement legacy) | ⏳ Phase 6 | — |
| E | حماية النتائج القديمة (Versioning) | ⏳ Phase 7 | — |
| F | تحليلات المحاكي لكل قسم | ⏳ Phase 8 | — |

---

## نتائج الفحوصات

```
TypeScript (full project):  يفشل بـ OOM (المشروع كبير جداً بدون NODE_OPTIONS مناسب)
TypeScript (ملفاتنا):       نظيفة — لا أخطاء type في الملفات المعدَّلة
Build:                      لم يُشغَّل (بيئة الإنتاج)
Lint:                       لم يُشغَّل
Unit Tests:                 لا توجد اختبارات تلقائية مكوّنة
validateQuizQuestionIntegrity: تُستدعى في Backend عند POST و PATCH — ✅
```

---

## الـ Commits الكاملة (بالترتيب)

```
d1796fd0  docs: assessment system code audit
52b54af3  fix: critical assessment system fixes
7bd6f26c  fix: make addQuiz/updateQuiz truly async
78f520b7  fix(assessment): unify mock exam logic and fix missing questions
f2d3541a  fix(assessment): complete Phase 1 critical fixes
43c9ab20  fix(assessment): Phase 2 — remove all local temp IDs, unify quiz editor
bb6d5b33  fix(assessment): improve quiz preview — show real question text
```

---

## الملفات المعدَّلة (إجمالي المشروع)

| الملف | نوع التعديل |
|---|---|
| `dashboards/admin/QuizBuilder.tsx` | إصلاح حرج — معرفات محلية في حفظ السؤال والاختبار |
| `dashboards/admin/QuizzesManager.tsx` | إصلاح — duplicate + توحيد المنشئ + preview text |
| `dashboards/admin/SmartQuestionSelector.tsx` | إصلاح حرج — allQuestionsMap بدلاً من pathQuestions |
| `dashboards/admin/UnifiedQuizBuilder.tsx` | تحديث — جلب أسئلة عند التعديل |
| `utils/quizPlacement.ts` | إضافة inferQuizKind + إصلاح normalizeQuizPlacement |
| `store/useStore.ts` | إصلاح — async save + shouldNormalizePlacement |
| `server/src/routes/quiz.routes.ts` | تحديث — normalizeQuizPlacementPayload |
| `docs/assessment-system-code-audit.md` | تحديث مستمر |
| `docs/assessment-refactor-progress.md` | هذا الملف |

---

## الخطوة التالية المقترحة

**Phase 3 — توحيد المنشئات (اختياري، منخفض الأولوية):**
- `QuizBuilder.tsx` لا يزال موجوداً لكنه الآن لا يُستدعى من `QuizzesManager`.
- أماكن الاستدعاء الوحيدة المتبقية: `SupervisorTestsManager` (يستخدم UQB) و لا أحد آخر.
- يمكن أرشفة `QuizBuilder.tsx` في مجلد `dashboards/admin/_legacy/` بأمان في الجولة القادمة.

**ملاحظة:** لا تبدأ هذه المرحلة دون طلب صريح.
