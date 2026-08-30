# Assessment Platform V1 — Progress Ledger

**آخر تحديث:** 30 أغسطس 2026  
**Active branch:** `refactor/modular-platform-safe`  
**Base:** HEAD الحالي على الفرع؛ لا تعتمد على SHA تاريخي.

> الفرع هو مصدر الحقيقة للـHEAD الحالي. لا تعتمد على SHA ثابت هنا بعد كل Commit.

---

## تدقيق 2026-08-30 وإصلاح A-001 — مكتمل (commit: `d31debe3`)

### ما تم إثباته أولًا

- لم تُعد معالجة فرضيات الحفظ الوهمي أو المعرفات المحلية: `addQuestion` و`addQuiz`/`updateQuiz` تنتظر API وتعيد كيان الخادم.
- النتائج تحتفظ بـ`quizSnapshot` و`submissionKey`، وsubmit يجمع أسئلة أقسام المحاكي عبر `getQuizQuestionIds`.
- ثبتت مشكلة detail response للمحاكي: كان `GET /api/quizzes/:id` يحل root `questionIds` فقط، بينما `UnifiedQuizBuilder` يحفظ محاكياته الجديدة مع IDs داخل الأقسام فقط.

### التعديل

- `server/src/routes/quiz.routes.ts`: endpoint التفاصيل صار يستخدم `getQuizQuestionIds(quiz)`، وهو resolver القائم نفسه الذي يحافظ على ترتيب الأسئلة ويجعل أسئلة أقسام المحاكي مصدر الحقيقة.
- `scripts/smoke-assessment-detail-question-resolution-contract.mjs`: اختبار مباشر لحالات normal وmock والـlegacy root IDs.
- `package.json`: أمر `smoke:assessment-detail-question-resolution`.

### العقود المحفوظة

- لا تغيير في URL أو method أو response keys أو schema أو RBAC أو scoring.
- الاختبار العادي ما زال يستخدم IDs الجذرية؛ المحاكي يأخذ IDs الأقسام فقط عندما تكون موجودة.
- لا migration ولا حذف لأي builder أو كيان.

### الاختبارات المنفذة

- `smoke:assessment-detail-question-resolution`: PASS (4/4).
- `smoke:mock-exams`: PASS (10/10).
- `smoke:quiz-integrity-guard`: PASS (4/4).
- `smoke:quiz-access`: PASS (18/18).
- `server:check` و`server:build`: PASS.
- `architecture-gate`: PASS.
- `repository-audit`: تعذّر قبل التحليل لأن تثبيت الحزم الجذري غير مكتمل ولا يحل package `typescript`؛ لا يُنسب ذلك للتعديل.

### التالي

**A-002 فقط:** وصل `resolveAssessmentSettings` و`toCanonicalAssessmentSettingsPayload` إلى مسارات القراءة/الكتابة المعنية بعد حصر callers، مع compatibility للبيانات القديمة واختبار runner. لا تبدأ توحيد المنشئ أو `ExamAssignment` أو migration للـplacement.

---

## إصلاح A-002 — Canonical settings consumption: مكتمل (commit: `b4cef107`)

### التعديل

- `types.ts`: إعلان canonical `randomizeOptions` وaliases التاريخية كحقول read-compatibility موثقة.
- `UnifiedQuizBuilder.tsx`: يقرأ `resolveAssessmentSettings` ويكتب `toCanonicalAssessmentSettingsPayload`؛ لم يعد يرسل `shuffleOptions` في payload جديد.
- `QuizPage.tsx`: كل سلوك الإعدادات المؤثر في الطالب (الوقت، ترتيب الأسئلة/الخيارات، العرض، المراجعة، النتيجة) يقرأ resolver موحدًا.
- `scripts/smoke-assessment-settings-consumption-contract.mjs`: يثبت aliases وprecedence وcanonical writer واستهلاك builder/runner.

### العقود المحفوظة

- aliases القديمة مقبولة للقراءة فقط ولا تُحذف من السجلات التاريخية.
- canonical field يتقدم دائمًا عندما توجد القيمتان.
- لا تغيير API أو Mongo schema semantics أو RBAC أو scoring أو URLs.

### الاختبارات

- `smoke:assessment-settings-consumption`: PASS (5/5).
- `smoke:quiz-answer-exposure`: PASS (5/5).
- `smoke:mock-exams`: PASS (10/10).
- `server:check`, `server:build`, `architecture-gate`: PASS.
- `npm run smoke:assessment-settings`: غير موجود أصلًا في `package.json`؛ لا يُعد فشلًا في المنتج.
- frontend typecheck/build لا يُعلن Green في هذا الجهاز بسبب تثبيت الجذر غير المكتمل (`lucide-react`/package resolution).

### التالي

لا تبدأ تغييرًا معماريًا آخر بلا تدقيق محدد. المرشح التالي من الخطة: حصر callers المتبقية لمصدر الأسئلة وإثبات ما إذا كانت تعتمد Store محدودًا قبل أي نقل.

---

## مصدر بنك الأسئلة — Pagination عند المصدر: مكتمل (commit: `f2835634`)

### ما ثبت

- المنشئات المتبقية لا تستخدم Store كسجل حقيقة لبنك الأسئلة؛ تستخدم `assessmentQuestionSource` أو wrapper التوافقي `questionBankSource`.
- `SmartQuestionSelector` كان الاستثناء على مستوى التوسع: يستدعي `loadAll` عبر كل صفحات النطاق ثم يصفّي في المتصفح.
- API كان يعلن `skillIds` و`difficulty` في query schema لكنه لا يطبقهما في filter الفعلي.

### التعديل

- selector صار يستخدم `searchPage` بحجم 100، مع pagination/filtering في API.
- أُضيف تطبيق `skillIds` (OR داخل المهارات المحددة) و`difficulty` في route القائم، مع توسيع type للعميل والمصدر المشترك.
- hydration للأسئلة المختارة بقيت `hydrateByIds`؛ لا تفقد edit flows اختيارات خارج الصفحة الحالية.
- حدّثت contract قديمًا ليعكس ownership الحالي للـside effects وعدم فرض `approved` على staff question-bank visibility.

### الاختبارات

- `smoke:exam-question-source`: PASS (21/21).
- `smoke:assessment-question-selection`: PASS (5/5).
- `smoke:mock-exams`: PASS (10/10).
- `server:check`, `server:build`, `architecture-gate`: PASS.

### التالي

لا تغيّر منشئًا آخر قبل حصر الوظائف الفريدة في `MockExamManager` و`QuizBuilder` واختيار concern واحد فقط. كما يظل اختبار API حي متعدد الأدوار مطلوبًا قبل أي ادعاء إنتاجي كامل للصلاحيات.

---

## حصر المنشئين قبل التوحيد — مكتمل بالتدقيق (commit: `645cff42`)

- `UnifiedQuizBuilder` هو المسار الموحد الفعلي في Quizzes/Subject/Supervisor/Lesson.
- `MockExamManager` ما زال runtime path في Admin وSupervisor ويحمل سياسات أقسام وتوجيه ومعاينة فريدة؛ لا يحذف.
- لم يجد فحص imports أو lazy/dynamic في نقاط الدخول الحالية مستدعيًا لـ`QuizBuilder` legacy؛ أضيف `smoke:assessment-legacy-builder-inventory` لحماية هذه النتيجة. يبقى الملف للتوافق، ولا يمثل ذلك تصريحًا بالحذف أو إثباتًا لعدم استعمال إنتاجي غير مرئي في المصدر.
- لم يُنفذ extraction لأن دوال الحفظ ليست تكرارًا محايدًا: نقلها الآن سيغير سياسة النشر/التوجيه بدل فصل concern معماري.

### التالي

تم اختيار **freeze موثق** للـ`QuizBuilder` legacy، بلا deprecation runtime أو حذف. الأولوية التالية: API integration tests متعددة الأدوار لمسارات الإنشاء/النشر/التسليم.

### التحقق

- `smoke:assessment-legacy-builder-inventory`: PASS (3/3).
- `smoke:mock-exams`: PASS (10/10).
- `smoke:assessment-settings-consumption`: PASS (5/5).
- `server:check`, `server:build`, `architecture-gate`: PASS.

---

## بوابة API الحية للاختبارات — تغطية موجّهة مضافة (بانتظار تنفيذ CI)

- وُسّعت `server/src/scripts/backendIntegrationGate.ts`، وهي harness قائم يشغّل HTTP حقيقيًا على Mongo محلي معزول داخل CI، بدل إضافة test framework أو الاتصال ببيئة تشغيلية.
- تنشئ الرحلة مسارًا نشطًا وسؤالًا معتمدًا واختبارًا مركزيًا موجّهًا؛ ثم تثبت أن الطالب خارج الاستهداف يُرفض، وأن الطالب المستهدف يسلّم إجابة صحيحة وتُحفظ `quizSnapshot`، وأن حد المحاولات يمنع الإرسال المتكرر.
- تجهز مدرسة وفصلًا معزولين وتتحقق من أن المشرف ينشئ فقط لطالب داخل نطاقه، وأن المعلم ينشئ داخل المسار/المادة المعيّنة كمسودة pending review ويُرفض خارج نطاقه. لا يغير ذلك API أو RBAC أو schema أو scoring.

### حالة التحقق

- typecheck الدقيق للـharness وفق أمر CI: PASS.
- `smoke:assessment-workflow` (3/3) و`smoke:assessment-publication` (4/4) و`smoke:quiz-access` (18/18) و`smoke:quiz-integrity-guard` (4/4) و`smoke:assessment-detail-question-resolution` (4/4): PASS.
- التنفيذ HTTP الكامل **لم يُشغّل محليًا**: يتطلب Mongo وخادم API تحت متغيرات `NODE_ENV=test` وقاعدة CI مخصصة، ولذلك تركته لبوابة CI المعزولة ولا توجد دعوى PASS حتى تعمل هناك.

---

## Runner — فصل حفظ مسودة التقدم: مكتمل (commit: `0c934318`)

- نُقل حفظ/قراءة/حذف مسودة الطالب من `QuizPage.tsx` إلى `utils/quizProgressDraft.ts`.
- المفتاح القديم `almeaa-quiz-progress:<quizId>` وبنية المسودة وترتيب استعادة الأسئلة بقيت متوافقة؛ لم يتغير التصحيح أو الوصول أو الإرسال أو مؤقت الاختبار.
- `smoke:quiz-progress-draft`: PASS (5/5)، ويغطي round-trip، JSON الفاسد، حذف مسودة اختبار محدد، واستهلاك الـRunner للواجهة الجديدة.
- `smoke:assessment-settings-consumption` (5/5)، و`smoke:quiz-answer-exposure` (5/5)، و`architecture-gate`: PASS. لا تعلن frontend typecheck/build خضراء في هذا الجهاز بسبب تثبيت الجذر الناقص.

### تدقيق المؤقت والجلسة

- التأكيد الحالي: مؤقت الـRunner محلي، و`LiveExamSession` متابعة تقدم لا محاولة موثقة زمنيًا من الخادم، وbackend يفرض حدًا أعلى للوقت المرسل فقط.
- لم يُنقل هذا concern؛ فصله دون تصميم Session/Attempt سيخفي فجوة integrity بدل حلها. الدليل والقرار موثقان في `assessment-system-code-audit.md`.

### Runner question hydration — مكتمل (commit: `6584d1de`)

- استبدل طلب الـRunner المباشر الذي قد يمرر `limit=200` بـ`assessmentQuestionSource.hydrateByIds` المقطّع عند 100.
- `smoke:exam-question-source`: PASS (22/22)، و`assessment-question-selection` (5/5)، و`mock-exams` (10/10)، و`quiz-progress-draft` (5/5)، و`architecture-gate`: PASS.

### Runner server-result authority — مكتمل (commit: `4320a86c`)

- عند فشل submit الحقيقي لا ينشئ الـRunner نتيجة محلية ولا ينتقل إلى التقرير؛ يحتفظ بمسودة التقدم ليتاح retry.
- وضع التطوير فقط يحتفظ بمسار النتيجة المحلية المتعمد.
- `smoke:quiz-submission-authority` (3/3)، و`quiz-answer-exposure` (5/5)، و`quiz-integrity-guard` (4/4)، و`architecture-gate`: PASS.

### Runner mock section reset — مكتمل (commit: `4f6b2800`)

- إعادة الاختبار أو تحميل اختبار جديد لا يرث الأقسام المقفلة أو وقت أسئلة المحاولة السابقة، ويبدأ مؤقت القسم الأول مجددًا.
- `smoke:quiz-section-reset` (2/2)، و`mock-exams` (10/10)، و`quiz-progress-draft` (5/5)، و`quiz-submission-authority` (3/3)، و`architecture-gate`: PASS.

## تفعيل بوابة HTTP المعزولة على فرع العمل (commit: `a6ad996c`)

- كان workflow `Platform V3 Backend Integration Gate` مقصورًا تلقائيًا على `develop/platform-v3-recovery` وPR تاريخي محدد، لذلك لم تكن رحلة الاختبارات الجديدة ستعمل عند دفع فرع العمل الحالي.
- أصبح يعمل على push أو PR من `refactor/modular-platform-safe` فقط، مع بقاء Mongo وsecrets المؤقتة والعزل كما هي.
- فحص typecheck للـharness وعقد workflow trigger hygiene: PASS. لم يُنفذ GitHub Actions بعد؛ يحتاج push أو تشغيل يدوي من صاحب المستودع.

---

## المرحلة الحالية — إصلاحات حرجة: ✅ مكتملة (commit: ac9ea5c1)

### A0 — Audit V2: COMPLETE for current baseline
تم تحديث `docs/assessment-system-code-audit.md` بحيث لا يعيد معالجة Bugs تم إصلاحها بالفعل.

أهم التصحيحات على التدقيق القديم:
- حفظ السؤال من `SubjectQuizzesPanel`: Fixed سابقًا.
- Fake/optimistic save المؤثر: غير مثبت في الحالة الحالية.
- client-generated persistent IDs: غير مثبت في الحالة الحالية.
- Quiz result snapshot: موجود الآن.
- duplicate submit protection: موجود عبر `submissionKey`.
- student targeted-submit guard: موجود في Backend ويعيد فحص group membership من DB.
- mock section question resolution: موجود.

الديون الحالية المؤكدة أصبحت:
- classification drift.
- settings/mock contract drift.
- partial question-source duplication.
- multiple active builders.
- targeting داخل Quiz.
- Barcode يجمع definition + session runtime.
- quiz route يحتاج modularization لاحقًا.

---

## إصلاح G2 — تطبيق randomizeOptions في runner الطالب: ✅ مكتمل (commit: f973d219)

### الملفات المُعدَّلة: `pages/QuizPage.tsx`

**التغييرات:**
1. **`questionShuffleMap`** (useMemo جديد):
   - يُبنى مرة واحدة من `quizQuestions` عند بدء الاختبار.
   - Seed ثابت من `question.id` (Fisher-Yates) → نفس الترتيب في كل re-render للطالب نفسه.
   - إذا `randomizeOptions = false/undefined` → يُرجع `null` (لا تكلفة على الاختبارات الحالية).

2. **`currentDisplayOptions`** (useMemo جديد):
   - `[{text, originalIndex}]` مرتّبة حسب الخلط للسؤال الحالي.
   - إذا لا خلط → `originalIndex === displayIndex` (لا تغيير في السلوك).

3. **`handleOptionSelect(displayIndex)`**:
   - يُترجم `displayIndex → originalIndex` قبل الحفظ في `selectedOptions`.
   - `correctAnswersCount` يظل دقيقاً (يقارن `selectedOptions[id] === correctOptionIndex`).

4. **JSX الخيارات**:
   - يعرض `currentDisplayOptions` بدل `currentQuestion.options`.
   - `key={originalIndex}` (ثابت) و`selected-state` يقارن `originalIndex`.

**التوافق العكسي:**
- الاختبارات التي لا تُفعّل `randomizeOptions` → لا يتغير شيء (map = null).
- `correctAnswersCount`, `wrongAnswersCount`, `sectionResults`, `skillsAnalysis` → لا تعديل (تعتمد على `selectedOptions` الذي يحفظ `originalIndex`).

---



### تم في هذا Batch

#### 1. Durable handoff
تم إنشاء:
- `docs/assessment-platform-v1-handoff.md`

الغرض:
- أي محادثة جديدة تبدأ من نفس الفرع والخطة.
- توثيق الرؤية الثابتة والقواعد المعمارية والمرحلة التالية.
- منع العودة للفروع القديمة أو إعادة فحص المشروع من الصفر كل مرة.

#### 2. Canonical classification resolver
تم إنشاء:
- `utils/assessmentClassification.ts`

العقد الحالي:

```text
quizKind=drill → normal/practice
quizKind=test  → normal/exam
quizKind=mock  → mock
mockExam.enabled=true → mock (legacy compatibility)
mode=regular → regular delivery
mode=saher → self delivery
mode=central → directed delivery
```

قاعدة مهمة:
- `placement=mock` أو `showInMock=true` لا يعنيان True Mock Assessment.

#### 3. Compatibility bridge
تم تحديث:
- `utils/quizPlacement.ts`

التغيير:
- `isTrueMockExam` و`inferQuizKind` أصبحا يمران عبر canonical resolver.
- `isMockQuiz` بقي كـlegacy placement-visibility helper مع تعليق صريح يمنع استخدامه لتعريف true mock.
- لم تُحذف exports القديمة حتى لا نكسر Call Sites.

#### 4. Classification regression contract
تم إنشاء:
- `scripts/smoke-assessment-classification-contract.mjs`

يغطي:
- drill → normal/practice.
- test + central → normal/exam + directed.
- explicit mock.
- legacy `mockExam.enabled`.
- إثبات أن `placement=mock` وحده ليس true mock.
- legacy bank → practice.
- saher → self delivery.

#### 5. Dedicated CI gate
تم إنشاء:
- `.github/workflows/assessment-platform-v1-gate.yml`

الـGate مصمم لتشغيل:
- frontend typecheck.
- server typecheck.
- canonical classification contract.
- mock exam contract.
- unified question-source contract.
- quiz access/integrity/answer exposure.
- learning placement.
- barcode/public tests.
- results.
- Saher.
- course quiz context.

---

## Validation status

### ما أمكن إثباته من الكود
- تغييرات التصنيف Additive/compatibility-first.
- لا Migration للبيانات.
- لا حذف لأي Builder أو Model.
- لا تغيير Routes عامة.
- لا تغيير `main`.

### CI
- GitHub/Vercel status يجب التحقق منه على HEAD الحالي بعد اكتمال الـBatch.
- لا تُعتبر المرحلة Green حتى ينجح Assessment V1 Gate أو يتم توثيق سبب تعذر تشغيله.

---

## Contract drift — العناصر التالية في A1

### Settings
يلزم حصر وتثبيت:
- `showAnswers` / أي legacy alias.
- `randomizeQuestions` / legacy naming.
- `randomizeOptions` مقابل `shuffleOptions`.
- result/review settings.

الهدف:
1. canonical name.
2. legacy-read compatibility.
3. schema/model/frontend agreement.
4. save → reload round-trip proof.
5. runner consumption proof قبل اعتبار setting مدعومة.

### Mock config
يلزم توحيد:
- qiyas category enum.
- section fields.
- strict section lock.
- target score.
- domain values.

---

## NEXT ACTION

**أكمل A1 قبل الانتقال إلى A2.**

الخطوة التالية المحددة:
1. بناء `Assessment Settings/Mock Contract Matrix` من `types.ts`, `UnifiedQuizBuilder`, `quizDefinitionSchema`, `Quiz` model, `QuizPage`, Barcode model/runtime.
2. إصلاح Contract drift المؤكد فقط بطريقة backward compatible.
3. إضافة round-trip guards.
4. بعد Green CI، ابدأ A2 لتوحيد Question Source.

لا تبدأ الآن:
- `ExamAssignment`.
- حذف `MockExamManager` أو `QuizBuilder`.
- Migration للـplacement.
- إعادة تصميم Student UI.
- Barcode Session migration.

---

## Continuation protocol
أي محادثة جديدة يجب أن تبدأ بقراءة:
1. `docs/assessment-platform-v1-handoff.md`
2. `docs/assessment-system-code-audit.md`
3. هذا الملف
4. آخر Commits على `develop/assessment-platform-v1`

ثم تنفيذ `NEXT ACTION` أعلاه، وعدم Merge إلى `main` بدون موافقة صريحة منفصلة.
