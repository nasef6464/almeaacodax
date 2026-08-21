# Assessment Platform V1 — Progress Ledger

**آخر تحديث:** 21 أغسطس 2026  
**Active branch:** `develop/assessment-platform-v1`  
**Base:** `main` @ `7b666fe50d00766ce16f4b3f42d91edd659ffa12`

> الفرع هو مصدر الحقيقة للـHEAD الحالي. لا تعتمد على SHA ثابت هنا بعد كل Commit.

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

## A1 — Canonical Assessment Contract: IN PROGRESS

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
