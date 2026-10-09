# ALMEAA | تدقيق أولي للترابط في رحلة اختبار الطالب
2026-10-09 | المصدر `main@b9524ec1f5b23d38151d210624875d2a97fbc966` | تدوين على الفرع التجريبي `test/almeaa-isolated-20261008`

**حالة المراجعة:** SOURCE_REVIEWED. تم فحص المسارات/الدوال ومصدر البيانات، لكن **لم يتم** تشغيل Browser E2E جديد أو كتابة بيانات اختبار في DB، لذلك لا توجد شهادة نجاح للتجربة الكاملة.

## سبب تقديم هذا المجال قبل إعادة الهيكلة
- يوجد مساران مختلفان: `/quiz` لاختبارات ذاتية/إعداد، و`/quiz/:quizId` لاختبارات محددة. ليسا نفس الواجهة ولا نفس آلية حفظ النتيجة.
- `Quiz.tsx`: 1642 سطر، 24 حالة React، 6 effects، 28 زرًا ظاهرًا في المصدر؛ التصحيح الذاتي يتم في الواجهة ويستدعي `saveExamResult` المحلية.
- `QuizPage.tsx`: 2524 سطرًا، 32 حالة React، 11 effects، 42 زرًا ظاهرًا في المصدر؛ يتضمن بدء الجلسة والحفظ المؤقت والخادم/التسليم والتصور والوقت والأقسام.
- `Results.tsx`: 2282 سطرًا، 33 زرًا ظاهرًا في المصدر، يحتاج ضمان عدم كسر عرض النتائج ومسارات العلاج.
- هذه أعداد مصدرية من الملف، وليست عدد أزرار فريدة أو اختبار متصفح. كِبَر الحجم ليس دليلًا مستقلًا على خلل.

## خريطة المالك والوظائف
| الرحلة/التفاعل | واجهة/دالة | API أو state | خادم/طبقة بيانات | حالة الدليل |
|---|---|---|---|---|
| مسار الاختبار الذاتي | `AppRouteTree:/quiz` → `Quiz.tsx`، `handleStart` | `localStorage: quiz_progress` و`quiz_progress_save` | local Zustand + sync attempt لبعض المستخدمين | SOURCE_REVIEWED |
| تغيير إجابة ذاتية | `Quiz.tsx:handleAnswerSelect` | State/Local draft | لا يسجل Attempt بالضغط وفق smoke الموجود | SOURCE_REVIEWED |
| إنهاء الاختبار الذاتي | `Quiz.tsx:handleFinish` | `recordQuestionAttempt`, `saveExamResult`, navigate results | `learningInteractionsSlice`, `learningProgressSlice` | SOURCE_REVIEWED |
| دخول اختبار محدد | `AppRouteTree:/quiz/:quizId` → `QuizPage.tsx` | `api.startLiveExam`, `getLiveExamSession` | session تقدم على الخادم | SOURCE_REVIEWED |
| اختيار إجابة في اختبار محدد | `QuizPage.tsx:handleOptionSelect` | `api.updateLiveExamProgress` + `recordQuestionAttempt` | `POST /quizzes/question-attempts` يصنع `QuestionAttempt` ويحدث `SkillProgress` و`ReviewCard` | **P1 RISK #492** |
| إنهاء اختبار محدد | `QuizPage.tsx:handleFinish` | `api.submitQuiz` | `POST /quizzes/:id/submit` يصحح من الخادم ويحفظ `QuizResult` ويحدث التحليلات | SOURCE_REVIEWED |
| نتيجة ومراجعة | `Results.tsx` و`ReviewSession.tsx` | `api.getQuizResultDetails`, `answerReviewCard` | QuizResult/ReviewCard/SkillProgress | SOURCE_REVIEWED |

## فجوة مثبتة في مصدر الشيفرة: #492
- [QuizPage.tsx#L900-L923](https://github.com/nasef6464/almeaacodax/blob/b9524ec1f5b23d38151d210624875d2a97fbc966/pages/QuizPage.tsx#L900-L923): تسجيل محاولة جديدة عند كل اختيار أو تغيير اختيار.
- [learningInteractionsSlice.ts#L63-L71](https://github.com/nasef6464/almeaacodax/blob/b9524ec1f5b23d38151d210624875d2a97fbc966/store/slices/learningInteractionsSlice.ts#L63-L71): POST جديد ومحاولة محلية جديدة.
- [adaptiveTelemetryRoutes.ts#L66-L95](https://github.com/nasef6464/almeaacodax/blob/b9524ec1f5b23d38151d210624875d2a97fbc966/server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts#L66-L95): إنشاء محاولة في قاعدة البيانات وتحديث إتقان ومراجعة.
- [quiz.routes.ts#L691-L713](https://github.com/nasef6464/almeaacodax/blob/b9524ec1f5b23d38151d210624875d2a97fbc966/server/src/routes/quiz.routes.ts#L691-L713): التسليم النهائي يحدث الإتقان والمراجعة مرة أخرى.
- [Quiz.tsx#L821-L832](https://github.com/nasef6464/almeaacodax/blob/b9524ec1f5b23d38151d210624875d2a97fbc966/pages/Quiz.tsx#L821-L832): الاختبار الذاتي يؤخر تسجيل المحاولات حتى الإنهاء، أي أن المسارين مختلفان بنيويًا.
- أثر تكرار المحاولات والإتقان يحتاج تأكيدًا بتكامل معزول قبل وصفه بأنه أثر حدث فعلًا لمستخدم. **لا دليل أن درجة `QuizResult` النهائية خاطئة بسبب هذه الفجوة.**

## فجوة أخرى في حالة فشل الحفظ تحتاج تأكيدًا
في `Quiz.tsx:handleFinish` ينفذ `saveExamResult(...)` داخل `try/catch`، ثم يحذف تقدم `localStorage` وينتقل إلى النتائج حتى بعد وقوع استثناء. هذا مسار فقدان تقدم *شرطي عند خطأ حفظ محلي*، وليس إثباتًا بفشل إنتاج. مطلوب اختبار حالة throw/persist وقرار إعادة المحاولة مع الاحتفاظ بالدليل.

## أوامر/اختبارات الحماية المرتبطة
- `scripts/smoke-quiz-client-security-contract.mjs`: يؤكد تصحيح الاختبار المحدد من الخادم وعدم إرسال correctness من المتصفح.
- `scripts/smoke-adaptive-phase4-treatment-recheck-contract.mjs`: يؤكد أن تغييرات إجابة الاختبار الذاتي لا تسجل Evidence.
- `scripts/smoke-quiz-submission-schema-boundary-contract.mjs`, `scripts/smoke-assessment-question-attempt-document-contract.mjs`: source checks لحدود الخادم.
- **نقص الحماية:** لا يكفي الفحص النصي لثبات `idempotency`، ولا إثبات لرحلة Browser/DB كاملة لتبديل إجابة قبل التسليم.
- اختبار القبول المطلوب: طالب fixture يغير الإجابة 3 مرات، يتنقل ويعيد فتح الصفحة، ينهي مرة، ثم يفحص count/evidence/review والدرجة والمراجعة العلاجيّة عبر JWT جديد؛ لا بيانات إنتاج.

## خطة فصل الملفات بعد تثبيت السلوك
1. `QuizPage`: فصل فقط إدارة الجلسة/draft/timer/submit من العرض، بمالك واحد للكتابة للـDB؛ تجنب نقل حساب الدرجة أو RBAC للعميل.
2. `Quiz`: استخراج controller للاختبار الذاتي والحفظ/الفشل مع تثبيت semantics التي تختلف عن الاختبار المخزن.
3. `Results`: فصل تحويل نتائج التقارير/التوصيات عن presentation تدريجيًا، مع الاحتفاظ بمصدر نتيجة الخادم وتراخيص الوصول.
4. `Quiz` و`QuizPage`: بناء عقد واضح يحدد معنى `answer draft` مقابل `final question evidence` لكل مسار قبل أي نقل للكود.
5. كل extraction مع baseline test ثم اختبار focused + integration + browser + related journey regression على SHA الدقيق.

## بوابة التسليم
المرحلة الحالية ليست CLOSED: بوابة #298 مفتوحة، وIssue #492 يحتاج معالجة وفحصًا معزولًا، والاختبار الكامل للأزرار والمتصفح وقاعدة البيانات لم يتم في هذه الجولة. انظر Issue #489 للخريطة العامة، و`docs/audits/ALMEAA_RELEASE_ARCHITECTURE_QA_EXECUTION_PLAN_2026-10-09_AR.md` للخطة الرسمية على الفرع التجريبي.
