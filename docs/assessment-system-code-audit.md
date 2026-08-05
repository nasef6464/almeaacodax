# تقرير التدقيق المعماري لنظام الاختبارات

## A. الملخص التنفيذي
تم فحص نظام الاختبارات الحالي وتبين وجود 4 مشكلات رئيسية:
1. **توليد المعرفات محلياً (F1):** يتم توليد `quiz_id` و `question_id` و `section_id` محلياً باستخدام `Date.now()` دون الاعتماد على الـ Backend مما يسبب تضارب وعزلة للبيانات.
2. **الحفظ الوهمي (F2):** دوال `addQuiz` و `updateQuiz` تعمل بشكل متزامن `sync` وتخزن في Zustand محلياً دون انتظار استجابة الخادم.
3. **تضارب تمييز المحاكي (F3):** هناك خلط بين استخدام `placement === 'mock'` و `showInMock` و `mockExam.enabled` و `quizKind === 'mock'`. المحاكي الفعلي للقياس يجب أن يعتمد على `mockExam.enabled`.
4. **عدم تطابق حقول الإعدادات (F5):** الواجهة تمرر `shuffleQuestions` و `shuffleOptions` بينما الـ Types (وهو ما يُتوقع في العقد) تتوقع `randomizeQuestions`.

أعلى المخاطر: ضياع بيانات الاختبارات بسبب الحفظ الوهمي، وتلف العقود بسبب تعارض حقول الإعدادات.
ما يمكن إصلاحه سريعاً: إنشاء دالة تمييز موحدة للمحاكي `isMockExam`، وتوحيد حقول `QuizSettings`.

## B. خريطة النظام الحالي

| الملف | الوظيفة | من يستدعيه | مصدر البيانات | نوع الاختبار | الدور | مستخدم فعلياً | يتكرر مع |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `QuizBuilder.tsx` | إنشاء اختبار قديم | `QuizzesManager` | Zustand/API | عادي | Admin/Super | نعم | `UnifiedQuizBuilder` |
| `UnifiedQuizBuilder.tsx`| واجهة موحدة لإنشاء تدريب/اختبار | `SubjectQuizzesPanel` | Zustand | Drill/Test/Mock | Admin/Super/Teacher| نعم | `QuizBuilder` |
| `MockExamManager.tsx` | إنشاء محاكي قياس | `QuizzesManager` | Zustand | Mock | Admin/Super | نعم | `UnifiedQuizBuilder` |
| `QuizPage.tsx` | مشغّل الاختبارات الرئيسي | Router (`/quiz/:id`) | Zustand/API | الكل | Student | نعم | لا يوجد |
| `utils/mockExam.ts` | دوال مساعدة للمحاكي | المشغّل والمدير | - | Mock | - | نعم | - |

## C. دورة الحياة الحالية
- **الإنشاء:** يتم إنشاء الاختبار في `UnifiedQuizBuilder` أو `MockExamManager`. يتم توليد ID محلي `quiz_${Date.now()}`.
- **الحفظ:** تُستدعى `addQuiz` من Store. تقوم بتخزين البيانات محلياً في الحالة `set(...)` وتقوم بنداء API `api.createQuiz` في الخلفية بدون `await`.
- **العرض:** يدخل الطالب إلى `QuizPage`، يتم جلب الاختبار من الـ Store وتجهيز الأسئلة (سواء من الأقسام `sections` أو `questionIds` باستخدام `flattenMockExamQuestionIds`).
- **النتيجة:** تُحفظ النتيجة محلياً عبر `saveExamResult` وترسل للـ API في الخلفية.

## D. جدول المشكلات

| الرقم | العنوان | الوصف | الدليل من الكود | الخطورة | الحل المقترح |
| --- | --- | --- | --- | --- | --- |
| 1 | معرفات محلية | استخدام Date.now() لمعرفات الأسئلة والاختبارات والأقسام | `MockExamManager.tsx:36`, `UnifiedQuizBuilder.tsx:248` | عالية | جعل الإضافة async وانتظار الـ ID من الخادم |
| 2 | حفظ متزامن وهمي | دوال addQuiz/updateQuiz لا تنتظر استجابة الخادم | `useStore.ts:116, 1037` | حرجة | تحويلها إلى Promise وإظهار حالة التحميل |
| 3 | تعارض في تمييز المحاكي | استخدام placement="mock" لكل من الاختبار العادي والمحاكي | `UnifiedQuizBuilder.tsx:232` | عالية | الاعتماد على `mockExam.enabled` للمحاكي فقط واستخدام دالة `isMockExam` |
| 4 | عدم تطابق الحقول | واجهة المنشئ ترسل shuffleQuestions بينما النوع يتطلب randomizeQuestions | `UnifiedQuizBuilder.tsx:204` vs `types.ts:368` | متوسطة | توحيد أسماء الحقول حسب `types.ts` (تم التوثيق فقط بناءً على التعليمات) |

## E. توافق العقود (Frontend vs Store)
- `shuffleQuestions` في `UnifiedQuizBuilder` تقابل `randomizeQuestions` في `types.ts`.
- `targetGroupIds` تُستخدم في الواجهة ولكن حفظها يتطلب توافق مع الـ Backend.

## F. الصلاحيات
| العملية | الدور | تحقق Frontend |
| --- | --- | --- |
| إنشاء | Admin/Super/Teacher | موجود في UnifiedQuizBuilder |
| استهداف مجموعات | Supervisor | مقيد في QuizBuilder |
| نشر | Teacher | معلق pending_review |

## G. سلامة البيانات
- **معرفات محلية:** تسبب عدم ترابط في قاعدة البيانات الحقيقية عند التزامن.
- **الأقسام في المحاكي:** دالة `flattenMockExamQuestionIds` تعمل بشكل سليم حالياً وتقوم بدمج الأقسام أو الاعتماد على `questionIds` بشكل صحيح.

## H. خطة التنفيذ المرحلية
1. **المرحلة الأولى:** إصلاح التضاربات في التمييز بإنشاء دالة `isMockExam` موحدة (تم التنفيذ).
2. **المرحلة الثانية:** تحويل `addQuiz` و `updateQuiz` إلى Async.
3. **المرحلة الثالثة:** توحيد حقول الإعدادات وتنظيف دوال المعرفات المحلية.
