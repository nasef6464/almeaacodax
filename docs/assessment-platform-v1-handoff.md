# Assessment Platform V1 — Durable Handoff

**آخر تحديث سياقي:** 2026-08-20

## نقطة البداية
- Repository: `nasef6464/almeaacodax`
- Production branch: `main`
- Baseline الذي بدأ منه هذا العمل: `7b666fe50d00766ce16f4b3f42d91edd659ffa12`
- Active development branch: `develop/assessment-platform-v1`
- لا يتم التطوير مباشرة على `main`.
- الفرع نفسه هو مصدر الحقيقة للـHEAD الحالي؛ لا تعتمد على SHA مكتوب في هذه الوثيقة بعد بدء Commits جديدة.

## الهدف الثابت
تطوير نظام الاختبارات الحالي تدريجيًا إلى منصة Assessments قابلة للتوسع بدون إعادة كتابة النظام أو كسر الاختبارات والنتائج والروابط القديمة.

الرؤية المرجعية:

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
      └── Session (future: Barcode / Live / Public)
      ↓
Student Attempt Engine
      ↓
Snapshot / Version
      ↓
Analytics
```

## قواعد معمارية لا تتغير بدون ADR واضح
1. يوجد نوعان منطقيان لمحتوى الاختبار: `normal` و`mock`.
2. `drill` و`test` حالياً توافقان `normal/practice` و`normal/exam`.
3. `mode: central` هو Delivery/Assignment وليس Assessment type.
4. `mode: saher` هو Self-practice delivery/origin وليس Assessment type جديداً.
5. Barcode/Public/Live يجب أن تتجه مستقبلاً إلى Session فوق Assessment موجود، وليس نسخ Assessment كامل جديد.
6. `learningPlacements` هو الأساس الحالي لفصل المحتوى عن مكان ظهوره.
7. لا تنشئ `ExamAssignment` قبل تثبيت الـcore والعقود ومصدر الأسئلة والمنشئ.
8. لا تحذف `QuizBuilder` أو `MockExamManager` قبل إثبات أن runtime callers = 0 وأن كل الوظائف الفريدة نُقلت واختبارات regression خضراء.
9. السيرفر مصدر الحقيقة للمعرفات والحفظ والصلاحيات والنتائج.
10. جميع التغييرات Incremental + backward compatible؛ لا Migration واسعة أو حذف بيانات في المراحل الأولى.

## ما تم إنجازه قبل هذه الدورة ويجب عدم إعادة عمله
- الحفظ الحقيقي للأسئلة والاختبارات يعتمد على API ومعرف السيرفر.
- إصلاح مسار إضافة السؤال من `SubjectQuizzesPanel`.
- دعم جلب الأسئلة المختارة القديمة في `UnifiedQuizBuilder`.
- `QuizResult.quizSnapshot` موجود لحماية البيانات التاريخية الأساسية.
- `submissionKey` موجود لمنع معالجة Submit نفسها مرتين.
- `sectionResults` موجود لتحليل المحاكيات.
- Backend يعيد التحقق من استهداف الطالب وعضوية المجموعة عند الاختبارات الموجهة.
- `UnifiedQuizBuilder` أصبح مستخدمًا في عدة مسارات إنشاء/تعديل.
- `questionBankSource.ts` موجود كمصدر API-backed مشترك لبعض منشئات الاختبارات.

## الديون المؤكدة التي نعمل عليها
- التصنيف ما زال موزعًا بين `quizKind`, `type`, `placement`, `showInTraining`, `showInMock`, `mockExam.enabled`, `mode`.
- `placement: mock` اسم legacy ملتبس ولا يجب أن يكون المرجع لتحديد المحاكي الحقيقي.
- `SmartQuestionSelector` ما زال يملك منطق جلب مستقلًا وحدًا عمليًا مختلفًا عن `questionBankSource.ts`.
- `MockExamManager` ما زال runtime path فعليًا بجانب `UnifiedQuizBuilder`.
- `server/src/routes/quiz.routes.ts` يحمل مسؤوليات كثيرة ويحتاج Modularization لاحقًا بدون تغيير الـpublic API.
- Directed targeting ما زال داخل `Quiz` (`targetGroupIds`, `targetUserIds`, `dueDate`). سيُفصل لاحقًا بعد تأسيس core ثابت.
- `PublicBarcodeTest` يكرر assessment data/settings وسيُحوّل لاحقًا إلى Session-compatible layer بعد اكتمال الأساس.
- يوجد Contract drift في أسماء/حقول settings وMock config يجب حصره وتثبيته قبل توسيع الوظائف.

## خارطة التنفيذ الحالية
### A0 — Audit V2
تحديث التدقيق القديم ليعكس `main` بعد Recovery وتصنيف كل فرضية: `FIXED / CONFIRMED / PARTIAL / OBSOLETE / NEW`.

### A1 — Canonical Assessment Contract
- Resolver واحد للـclassification مع legacy compatibility.
- تثبيت معاني Normal/Practice/Exam/Mock وDelivery mode.
- Contract matrix للإعدادات والـEnums.
- Round-trip guards قبل أي Migration.

### A2 — Unified Question Source
- API pagination موحد.
- hydrate selected IDs.
- missing-question diagnostics.
- no Store-only source of truth.
- no fixed first-page assumption.

### A3 — Builder Components
استخراج أجزاء مشتركة من المنشئات بدون تغيير UX أو حذف أي runtime path.

### A4 — Mock Convergence
نقل الوظائف الفريدة من `MockExamManager` تدريجيًا إلى الغلاف الموحد، ثم إيقافه فقط بعد إثبات عدم وجود callers.

### A5 — Backend Modularization
تقسيم quiz route داخليًا إلى definition/access/submission/results/analytics مع إبقاء Routes العامة متوافقة.

### A6 — Runner Core
فصل منطق رحلة الطالب إلى core + Normal/Mock strategies مع بقاء URLs والـUX متوافقين.

### A7 — Distribution Foundation
إضافة interface/adapter للتوجيه بدون Migration أولًا.

### A8 — Assignment
كيان تكليف مستقل مع dual-read/dual-write وMigration آمنة قابلة للـdry-run والrollback.

### A9 — Sessions
تحويل Barcode/Live/Public تدريجيًا إلى Session فوق Assessment.

### A10 — Versioning & Analytics
Assessment revisions وربط المحاولات بالإصدار وتوحيد التقارير.

### A11 — Legacy Cleanup
آخر مرحلة فقط بعد telemetry/search/tests تثبت عدم الاستخدام.

## بوابات Regression الأساسية
يجب الحفاظ على:
- Old practice
- Old normal exam
- Old mock
- Old directed exam
- Saher
- Barcode/Public tests
- Course quizzes
- Learning-placement quizzes
- Existing results
- Existing URLs
- Admin/Supervisor/Teacher/Student RBAC

واستخدم على الأقل الاختبارات القائمة ذات الصلة:
- `smoke:mock-exams`
- `smoke:exam-question-source`
- `smoke:quiz-access`
- `smoke:quiz-integrity-guard`
- `smoke:quiz-answer-exposure`
- `smoke:saher-skills`
- `smoke:barcode-public-tests`
- `smoke:learning-placement-admin`
- `smoke:results`
- `smoke:course-quiz-context`

## بروتوكول استكمال العمل في محادثة جديدة
عند بدء محادثة جديدة في هذا المشروع:
1. اقرأ هذا الملف أولًا.
2. افحص HEAD الحالي للفرع `develop/assessment-platform-v1`.
3. اقرأ `docs/assessment-system-code-audit.md` و`docs/assessment-refactor-progress.md`.
4. افحص آخر Commits على الفرع بدل الاعتماد على ذاكرة المحادثة.
5. لا تعد للعمل على الفرعين القديمين `fix-assessment-system` أو `assessment-audit-and-refactor`؛ هما مراجع تاريخية فقط.
6. أكمل من `Next Action` في `docs/assessment-refactor-progress.md`.
7. لا Merge إلى `main` بدون موافقة صريحة منفصلة من المستخدم.
8. بعد كل Batch مهم، حدّث هذه الوثيقة وسجل التقدم بما يكفي لاستكمال العمل من محادثة جديدة.
