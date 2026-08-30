# تدقيق نظام الاختبارات — Baseline حي

**تاريخ التدقيق:** 30 أغسطس 2026  
**الفرع:** `refactor/modular-platform-safe`  
**مرجع الأدلة:** HEAD الحالي، لا وثائق أو فروع تاريخية.  
**النطاق:** تدقيق كود موجّه لتدفقات التعريف، بنك الأسئلة، المعاينة/الدخول، الحفظ، التقديم والنتائج. لا يتضمن فحص بيانات Mongo الحية؛ لذلك لا تُستنتج سلامة سجلات الإنتاج من هذا التقرير.

## A. الملخص التنفيذي

النظام ليس إعادة بناء مطلوبة: معظم ضمانات المرحلة الحرجة موجودة في الكود الحالي. عمليات إنشاء السؤال والاختبار تنتظر API وتعيد كيان الخادم، Submission يحتفظ بـsnapshot و`submissionKey`، وRunner يجلب أسئلة الأقسام للمحاكي بالـIDs. كما أن Backend يتحقق من الاستهداف قبل التسليم.

أثبت التدقيق مشكلتين؛ عولجتا في commits منفصلة (`d31debe3` و`b4cef107`):

1. **[FIXED]** كان `GET /api/quizzes/:id` يحل فقط `quiz.questionIds` ولا يجمع `mockExam.sections[].questionIds`. أصبح يستخدم `getQuizQuestionIds(quiz)`، واختبار العقد يغطي المحاكي ذي root IDs الفارغة.
2. **[FIXED]** كانت طبقة canonical settings (`utils/assessmentSettings.ts`) غير مستهلكة في `UnifiedQuizBuilder` أو `QuizPage`. صارا يستخدمان resolver واحدًا للقراءة، والمنشئ يكتب canonical payload بلا aliases قديمة.

أعلى خطر معماري متبقٍ هو تعدد المنشئات ومصادر قرار التصنيف/الإعدادات، لا فقد نتائج حالي مثبت. لا يوجد في هذا التدقيق دليل يبرر إنشاء `ExamAssignment` أو حذف أي منشئ أو migration واسعة.

## B. خريطة النظام الحالية

| المكون | المسؤولية | المستدعي/المسار | مصدر البيانات | النوع/الدور | الحالة |
|---|---|---|---|---|---|
| `server/src/models/Quiz.ts` | تعريف الاختبار وإعداداته والأقسام والتوجيه legacy | جميع Quiz routes | Mongo `Quiz` | normal/mock، staff | مستخدم؛ يجمع مسؤوليات متعددة |
| `server/src/models/QuizResult.ts` | نتيجة، snapshot، idempotency، section results | submit/results | Mongo `QuizResult` | الطالب/التقارير | مستخدم وسليم وظيفيًا |
| `server/src/routes/quiz.routes.ts` | HTTP: تعريف، أسئلة، وصول، submit، نتائج | `/api/quizzes` | Models/application helpers | جميع الأدوار | hotspot، لا تغيير routes الآن |
| `UnifiedQuizBuilder.tsx` | منشئ normal/mock المشترك | شاشات الإدارة/المشرف | store ثم API | admin/teacher/supervisor | مستخدم |
| `MockExamManager.tsx` | منشئ/إدارة محاكيات قائم | لوحة الإدارة/المشرف | store + question source | staff | مستخدم؛ لا يحذف |
| `QuizBuilder.tsx` | منشئ legacy | لا يوجد import أو lazy/dynamic caller ضمن entry points الحالية | store ثم API | staff | موجود للتوافق؛ مرشح للتجميد فقط، لا للحذف |
| `assessmentQuestionSource.ts` | بحث paginated وhydrate بالـIDs | adapters/builders | `/api/quizzes/questions` | staff | المصدر القانوني القابل لإعادة الاستخدام |
| `questionBankSource.ts` | compatibility hook فوق المصدر | callers legacy | `assessmentQuestionSource` | staff | مستخدم كواجهة توافق |
| `QuizPage.tsx` | رحلة الطالب normal/mock وتحميل أسئلة النطاق | `#/quiz/:id` | store + API questions | الطالب | يستعمل section IDs ويعالج options order |
| `assessmentClassification.ts` | تحويل quizKind/legacy إلى معنى canonical | helpers/callers | Quiz DTO | frontend | additive compatibility |

## C. دورة الحياة المثبتة

```text
Builder → store.addQuiz/updateQuiz → API POST/PATCH /api/quizzes
       → Zod boundary → integrity/scope/publication checks → Mongo Quiz
       → listing/store أو GET quiz detail → QuizPage
       → hydrate question IDs → POST /:id/submit
       → attempt/window/directed checks → QuizResult(snapshot, sectionResults, submissionKey)
       → result serialization/analytics
```

- **Normal/drill/test:** `questionIds` الجذرية هي المرجع؛ `QuizPage` وsubmit يحلانها.
- **Mock:** `mockExam.sections[].questionIds` هي المرجع القانوني للقسم. `QuizPage` يستخدم `flattenMockExamQuestionIds` ويجلب الناقص بالـIDs. `POST /:id/submit` يستخدم `getQuizQuestionIds`، لذلك submission لا يعتمد على root IDs فقط.
- **Directed:** ليس نوع محتوى ثالثًا في التنفيذ الحالي؛ يبقى `mode=central` مع `targetGroupIds`/`targetUserIds`/`dueDate` داخل Quiz، ويتحقق Backend من scope وعضوية الطالب وقت التسليم.
- **Learning placement:** `learningPlacements` وحقول placement legacy تتحكم في الظهور، ولا تثبت أن الاختبار محاكي.

## D. المشكلات المثبتة

| ID | الوصف والدليل | إعادة الإنتاج | الأثر/الخطورة | الحل المحدود واختبار القبول |
|---|---|---|---|---|
| A-001 | **FIXED في `d31debe3`.** كان `quiz.routes.ts` في `GET /:id` يبني IDs من `quiz.questionIds` فقط؛ `UnifiedQuizBuilder.handleSave` يكتب `questionIds: []` عندما `kind === "mock"` ويضع IDs في sections. | أنشئ محاكيًا من Unified Builder، احفظه، ثم اطلب `GET /api/quizzes/:id`: حقل `mockExam.sections` يحتوي IDs لكن `questions` فارغة. | كان معاينة/API consumer لا يحصل على أسئلة المحاكي؛ **عالية**. Runner كان ينجو لأنه يحل sections محليًا. | استُبدل resolver بـ`getQuizQuestionIds(quiz)`؛ `smoke:assessment-detail-question-resolution` يغطي normal وmock وlegacy root IDs. |
| A-002 | **FIXED في `b4cef107`.** كان `resolveAssessmentSettings` و`toCanonicalAssessmentSettingsPayload` غير مستهلكين. | سجل تاريخي settings يحتوي `showCorrectAnswers:false` بلا `showAnswers` أو `shuffleQuestions:false` بلا `randomizeQuestions`. | كان compatibility غير موحدًا؛ **عالية** لنتائج/مراجعة الطالب، دون دليل على فقد بيانات حية. | builder/runner يستعملان resolver، والكتابة الجديدة canonical فقط؛ smoke يثبت aliases وprecedence واستهلاك المسارات. |

## E. توافق العقود

| المفهوم | Frontend | API/Validation | Mongo | Runner | الحالة |
|---|---|---|---|---|---|
| نوع المحتوى | `quizKind` + `mockExam.enabled` | `quizKind`, `mockExam` | كلاهما | كلاهما | متوافق مع legacy classification؛ لا تستخدم `placement=mock` كدليل |
| أسئلة normal | `questionIds` | `questionIds` | `questionIds` | root IDs | متوافق |
| أسئلة mock | `mockExam.sections[].questionIds` | يقبل ويحفظ الأقسام | الأقسام | `flattenMockExamQuestionIds` | متوافق في runner/submit/GET details بعد A-001 |
| عرض الإجابات | resolver canonical + legacy read | `settings` record | `showAnswers` | resolver canonical | متوافق بعد A-002 |
| ترتيب الأسئلة | resolver canonical + legacy read | record | canonical field | resolver canonical | متوافق بعد A-002 |
| ترتيب الخيارات | `randomizeOptions` canonical + legacy read | record | كلاهما | resolver canonical | متوافق بعد A-002؛ writer لا يرسل alias |
| option layout | `optionLayout` | record | enum | `optionLayout` | متوافق في code الحالي |
| mock config | sections/category/target/lock | Zod يقبلها | Model يحفظها | sections/locks | متوافق في الحدود المفحوصة |

## F. الصلاحيات

| العملية | المدير | المشرف | المعلم | الطالب | تحقق Backend | تحقق Frontend |
|---|---|---|---|---|---|---|
| إنشاء/تعديل Quiz | نعم | ضمن scope | ضمن scope | لا | `requireRole` + managed/supervisor scope | شاشات الإدارة |
| نشر global | نعم | حسب scope/سياسة | لا يفرض global | لا | publication/workflow sanitization | أزرار/flows |
| اختيار أسئلة | نعم | ضمن scope | ضمن scope | لا | question routes + scope | builders |
| تسليم | لا كطالب | لا كطالب | لا كطالب | فقط المتاح له | auth + window + target/group membership | QuizPage access/UI |
| نتائج/تحليل | نعم | ضمن scope | حسب scope | نتيجته فقط | routes/role guards | dashboards/runner |

المصفوفة مبنية على الكود؛ لم يُشغّل اختبار HTTP حي متعدد المستخدمين في هذا التدقيق، فلا تمثل إثبات بيانات production.

## G. سلامة البيانات والنتائج

- **المعرفات:** لا يوجد دليل حالي على أن builders يعاملون ID محليًا كـID دائم؛ `addQuestion`/`addQuiz` تنتظر API وتستخدم الكيان الراجع.
- **الأسئلة المفقودة:** Integrity guard يمنع نشر تعريف غير صالح؛ runner يحاول hydrate IDs ويؤخر empty state. عولج gap detail response للمحاكي في A-001.
- **النتائج التاريخية:** `QuizResult` يحفظ `quizSnapshot` و`sectionResults` و`submissionKey`. هذا يخفف خطر تعديل التعريف اللاحق؛ لا يوجد formal revision/version بعد.
- **اختبارات بلا أسئلة/محاكي بقسم فارغ:** builders تمنع الحفظ، وpublication integrity يتحقق عند النشر. لا توجد قاعدة بيانات حية مفحوصة لقياس السجلات القديمة.
- **التصنيف:** resolver موجود، لكن حقول placement/show legacy لا تزال جزءًا من التوافق. لا migration الآن.
- **التوجيه:** داخل `Quiz` وليس assignment مستقلًا؛ موثق كدين تصميمي، لا خلل حرج مثبت في هذا النطاق.

## H. خطة التنفيذ المرحلية

| المرحلة | الهدف/الملفات | Migration/Rollback | الاختبارات وشروط القبول |
|---|---|---|---|
| 1. إصلاحات حرجة مثبتة | A-001 وA-002 مكتملان | additive، لا migration؛ revert commits يعيد السلوك السابق | mock detail يعرض sections/questions؛ aliases القديمة تعمل؛ canonical يفوز |
| 2. مصدر الأسئلة | نقل callers المتبقية إلى `assessmentQuestionSource`، مع pagination/hydrate diagnostics | compatibility adapter يبقى | search/hydrate/selected preservation، لا تحميل unbounded في UI جديد |
| 3. توحيد العقود | schema settings صريح تدريجيًا ومصفوفة round-trip | dual-read؛ لا حذف alias قبل تقرير بيانات | builder → API → Mongo → reload → runner |
| 4. غلاف المنشئ | استخراج مكونات مشتركة دون حذف `MockExamManager`/`QuizBuilder` | no migration | caller inventory وregression لكل منشئ |
| 5. النشر والتوجيه | adapter حول targeting الحالي | لا `ExamAssignment` قبل design/migration | RBAC/URLs/نتائج قديمة ثابتة |
| 6. النسخ والتحليلات | revision model وتحليلات موحدة | خطة migration قابلة لإعادة التشغيل | historical result consistency |
| 7. تنظيف legacy | إزالة بعد proof callers=0 وtelemetry/tests | rollback documented | لا حذف قبل إثبات الاستخدام صفر |

## تحديث حصر المنشئين — 30 أغسطس 2026

| المنشئ | runtime callers المثبتة | وظائف فريدة مثبتة | القرار الحالي |
|---|---|---|---|
| `UnifiedQuizBuilder` | `QuizzesManager` و`SubjectQuizzesPanel` و`SupervisorTestsManager` و`UnifiedLessonBuilder` | normal/mock wizard، settings canonical، question selector، learning placements | المسار الموحد الأساسي؛ لا يوسّع في هذه الدفعة |
| `MockExamManager` | `AdminDashboard` و`SupervisorTestsManager` | أقسام قياس، smart pick للأقسام، توجيه مدرسة/فصل، معاينة محاكي، وضع regular/mocked legacy | مستخدم فعليًا؛ لا يحذف ولا ينقل قبل فصل concern محدد مع regression |
| `QuizBuilder` | فحص مباشر للـimports وفحص lazy/dynamic في entry points (`App` وواجهات الإدارة/المشرف/الدرس) لم يجد caller؛ التعريف فقط | منشئ normal legacy مع AI generation وdirected draft settings | يبقى للتوافق؛ مرشح للتجميد فقط. `smoke:assessment-legacy-builder-inventory` يمنع إعادة ربطه بلا قرار صريح، ولا يثبت صلاحية حذفه |

لا يوجد extraction مشترك صغير يحقق فائدة أعلى من مخاطره الآن: `MockExamManager.saveExam` يملك policy نشر/استهداف تختلف عن `UnifiedQuizBuilder.handleSave`. النقل الشكلي سيخلط product policy مع refactor. أثبت فحص entry points عدم وجود ربط حي معروف للـ`QuizBuilder` legacy، لكنه ليس telemetry إنتاجية؛ لذلك لا حذف ولا دمج للمنشئين في هذه المرحلة. المسار التالي ذو الأولوية: API integration tests متعددة الأدوار للصلاحيات.

## بوابة التنفيذ التالية

**تحديث `f2835634`:** حُسمت مشكلة scale المثبتة في `SmartQuestionSelector`: كان يستدعي `loadAll` ثم يصفّي محليًا؛ صار يستدعي `searchPage` بحد 100 وفلاتر API (`skillIds` و`difficulty` وsection/search). بقيت hydration للأسئلة المختارة بالـIDs مستقلة، لذا لا تختفي الاختيارات عند تغيير الفلاتر. لا توجد مشكلة حرجة أخرى مثبتة في هذا التدقيق؛ المرحلة التالية بعد قرار مستقل هي اختبار API حي للصلاحيات أو حصر وظائف المنشئات الفريدة، لا توحيد المنشئ أو تغيير schema/API/RBAC أو `ExamAssignment`.
