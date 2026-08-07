# سجل تقدم إصلاح نظام الاختبارات

## المرحلة 0: التدقيق الهندسي ✅ (مكتملة)
- [x] تتبع دورة حياة الاختبار وأنواعها (عادي، محاكي، تدريب).
- [x] فحص مشاكل الحفظ الوهمي للمعرفات.
- [x] التحقق من توافق أسماء الحقول.
- [x] إنشاء وثيقة التدقيق `docs/architecture/assessment-system-code-audit.md`.
- [x] تحديث وثيقة التدقيق في `docs/assessment-system-code-audit.md`.

**الملفات المدروسة:**
- `dashboards/admin/UnifiedQuizBuilder.tsx`
- `dashboards/admin/SmartQuestionSelector.tsx`
- `dashboards/admin/MockExamManager.tsx`
- `dashboards/admin/QuizBuilder.tsx`
- `store/useStore.ts`
- `server/src/routes/quiz.routes.ts`
- `utils/quizPlacement.ts`
- `utils/mockExam.ts`
- `pages/Quiz.tsx`, `pages/QuizPage.tsx`

---

## المرحلة 1: إصلاح الأعطال الحرجة ✅ (مكتملة)

### Commit: `7bd6f26c` — الحفظ الحقيقي (Async Save)
- [x] إصلاح `addQuiz` في `useStore.ts`: ينتظر `api.createQuiz()` ويستخدم ID السيرفر.
- [x] إصلاح `updateQuiz` في `useStore.ts`: ينتظر `api.updateQuiz()` ويستخدم ID السيرفر.
- [x] لا يُضاف الاختبار للـ Store قبل نجاح السيرفر.
- [x] عند الفشل يُرمى خطأ حقيقي يصل للـ UI.

### Commit: `52b54af3` — توحيد الحقول والمنطق
- [x] توحيد `showAnswers` (بدلاً من `showCorrectAnswers`).
- [x] إضافة `isTrueMockExam()` في `utils/quizPlacement.ts`.
- [x] تحديث `MockExamManager` لاستخدام المُحدِّد الموحد.
- [x] إضافة `getAllQuizQuestionIds()` في `utils/mockExam.ts`.

### Commit: `78f520b7` — جلب الأسئلة المفقودة + إصلاح المحاكي
- [x] إضافة `useEffect` في `UnifiedQuizBuilder` يجلب الأسئلة بـ IDs عند فتح اختبار موجود.
- [x] إضافة `flattenMockExamQuestionIds` لجمع أسئلة أقسام المحاكي.
- [x] تحديث `MockExamStudentHub` و`QuizzesManager`.
- [x] إضافة حقول `mockExam` الناقصة في Zod schema (`isStrictSectionLock`, `domain`).

### هذه الجلسة — إصلاحات إضافية:

#### `dashboards/admin/SmartQuestionSelector.tsx`
- [x] **إصلاح حرج:** `selectedQuestions` كان يبحث في `pathQuestions` (مفلترة) فقط.
  - **السلوك السابق:** الأسئلة المجلبة ولكن ذات `pathId` مختلف لا تظهر في قائمة المختارة.
  - **السلوك الجديد:** `selectedQuestions` يبحث في `allQuestionsMap` (كل الـ Store) عبر `Map` سريع.
  - **الأثر:** الأسئلة المختارة مسبقاً تظهر دائماً بغض النظر عن الفلاتر الحالية.

#### `utils/quizPlacement.ts`
- [x] **إصلاح:** `normalizeQuizPlacement` لم يكن يعالج `quizKind`.
  - **السلوك السابق:** عند حفظ اختبار من `UnifiedQuizBuilder` بـ `quizKind: "mock"`, كانت `placement/type/showInMock` لا تُحدَّث صحيحاً في الـ Store.
  - **السلوك الجديد:** أولوية `quizKind` → تحديد كامل لـ placement/type/showInTraining/showInMock.

#### `store/useStore.ts`
- [x] **إصلاح:** شرط `shouldNormalizePlacement` في `updateQuiz` يشمل الآن `quizKind`, `mockExam`, `learningPlacements`.

#### `server/src/routes/quiz.routes.ts` (uncommitted → staged)
- [x] **تحديث:** `normalizeQuizPlacementPayload` محسَّن ليدعم `quizKind` و`learningPlacements` و`mockExam.enabled` بوضوح.

---

## المشاكل المؤكدة والمُصلَّحة (ملخص)

| # | المشكلة | الحالة | الملفات |
|---|---|---|---|
| 1 | حفظ وهمي بمعرفات محلية | ✅ تم | `useStore.ts` |
| 2 | اختفاء الأسئلة عند التعديل | ✅ تم | `UnifiedQuizBuilder.tsx`, `SmartQuestionSelector.tsx` |
| 3 | تعارض `showAnswers/showCorrectAnswers` | ✅ تم | `UnifiedQuizBuilder.tsx`, schema |
| 4 | تصنيف المحاكي غير موحد | ✅ تم | `quizPlacement.ts`, `mockExam.ts` |
| 5 | `normalizeQuizPlacement` لا يعرف `quizKind` | ✅ تم | `quizPlacement.ts` |
| 6 | schema Backend لا يقبل بعض حقول المحاكي | ✅ تم | `quiz.routes.ts` |

---

## المشاكل الموثقة والمؤجلة (خارج نطاق المرحلة الحالية)

| # | المشكلة | السبب | الوثيقة |
|---|---|---|---|
| A | تعدد المنشئات (QuizBuilder/MockExamManager/UnifiedQuizBuilder) | يحتاج دراسة أماكن الاستدعاء وتدريجية | Phase 3 |
| B | كيان Assignment/التوجيه المستقل | تغيير معماري كبير ونموذج DB | Phase 4 |
| C | دورة حياة موحدة (draft→approved→published) | تعديل شامل للنظام | Phase 5 |
| D | Migration لبيانات قديمة (placement legacy) | يحتاج Dry Run وتقرير أعداد | Phase 5 |
| E | حماية النتائج القديمة (Versioning) | يحتاج قرار معماري | Phase 6 |
| F | تحليلات المحاكي لكل قسم | لم يُطلب في المرحلة الحالية | Phase 7 |

---

## نتائج الفحوصات

```
TypeScript:       جارٍ الفحص...
Build:            لم يُشغَّل (بيئة الإنتاج)
Lint:             لم يُشغَّل
Unit Tests:       لا توجد اختبارات تلقائية مكوّنة
API Tests:        لا توجد
```

---

## الملفات المعدَّلة في هذه الجلسة

| الملف | نوع التعديل | السبب |
|---|---|---|
| `dashboards/admin/SmartQuestionSelector.tsx` | إصلاح حرج | `selectedQuestions` يبحث في allQuestionsMap |
| `utils/quizPlacement.ts` | إصلاح حرج | دعم quizKind في normalizeQuizPlacement |
| `store/useStore.ts` | إصلاح | شرط shouldNormalizePlacement شامل |
| `server/src/routes/quiz.routes.ts` | تحديث | normalizeQuizPlacementPayload يدعم quizKind |
| `docs/assessment-system-code-audit.md` | تحديث | تقرير من النموذج السابق |

---

## الخطوة التالية المقترحة

**Phase 2 — التحقق من سلامة بيانات الاختبارات القديمة:**
- تشغيل script يقرأ جميع الاختبارات في DB ويتحقق من:
  - وجود `quizKind` لكل اختبار.
  - توافق `placement/showInTraining/showInMock` مع `quizKind`.
  - أن أسئلة المحاكيات موجودة في `mockExam.sections` وليس `questionIds` الجذر فقط.
  - عدم وجود معرفات أسئلة مفقودة (تحقق `validateQuizQuestionIntegrity`).

**ملاحظة:** لا تبدأ هذه المرحلة دون طلب صريح.
