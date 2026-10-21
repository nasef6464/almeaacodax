# CHEM26 — CANONICAL MASTER / FINAL CLOSURE

هذا الملف هو المصدر الرسمي الوحيد لحالة الكيمياء في ALMEAA. أي محادثة كيمياء لاحقة يجب أن تبدأ من هنا، ولا تنشئ Taxonomy أو تدريبات أو اختبارات موازية.

## الحالة النهائية

- المصدر: كتاب تأسيس يلو للكيمياء 26 + كتاب تجميعات يلو للكيمياء 26 المعدل.
- تغطية المصدر: **1709 عنصرًا مصدرًا** = **1708 سؤالًا canonical + 1 alias dedupe**.
- Production questions: **1708 Approved / 0 Draft**.
- Taxonomy: **27 Main Skills / 99 SubSkills**.
- Foundation: **27 Main Topics / 99 SubTopics = 126 Topic**.
- أول 5 Main Topics مجانية؛ الباقي package-gated.
- Canonical drills:
  - **99 Foundation/SubSkill drills**
  - **40 MainSkill training drills**
  - الإجمالي **139**
- Standard tests:
  - **35 اختبارًا**
  - **28 × 49 سؤالًا + 7 × 48 سؤالًا = 1708**
  - **1708 unique refs / duplicate = 0 / reserve = 0**
  - أول **5 Free**
  - الاختبارات **6–35 Paid/Package**
  - كل اختبار يغطي **26–27 Main Skills**
  - كل tranche من 5 اختبارات تغطي **27/27 Main Skills**

## المصدر والتكرار

Canonical question bank:
- batch: `TAH-CHEM-CHEM26-FULL-V1`
- canonical questions: **1708**
- alias الوحيد:
  - source: `TAH-CHEM-CHEM26-P131-Q26`
  - canonical: `TAH-CHEM-CHEM26-P130-Q13`

Integrity:
- unique questionCode = 1708
- unique sourceItemId = 1708
- unique imageHash = 1708
- visual reviewer notes = 1708
- answer quarantine = 0
- repaired crop defects = 5

## Foundation / Training

الهيكل الرسمي الوحيد يستخدم IDs:
- `chem26_foundation_*`
- `chem26_training_*`

الحالة:
- Foundation drills = **99**
- MainSkill training = **40**
- جميعها Approved + Published + Visible
- Foundation free = **23**
- Foundation package = **76**
- MainSkill training free = **8**
- MainSkill training package = **32**

السياسة:
- Main Skills 1–5 مجانية.
- كل SubTopics التابعة لها مجانية.
- الأجزاء الإضافية التابعة لأول خمس مهارات تبقى مجانية.
- من Main Skill 6 فما بعده: package-gated.

تم حذف المجموعة اليدوية المكررة:
- `drill_sub_tah_chem_*`
- `bank_skill_tah_chem_*`
- deleted = **130**
- backup = `quizzes_backup_chem_manual_pre_unify_20261006` (**130/130**)

## Standard Tests

Canonical IDs:
- `chem26_standard_test_01` ... `chem26_standard_test_35`

Production verification after PR #420:
- tests = **35**
- free = **5**
- paid/package = **30**
- 48-question tests = **7**
- 49-question tests = **28**
- total refs = **1708**
- unique refs = **1708**
- duplicate refs = **0**
- reserve = **0**
- min Main Skills/test = **26**
- max Main Skills/test = **27**
- 7 tranches × 5 tests; every tranche covers **27/27 Main Skills**
- all = Approved + Published + Visible
- quizKind = `test`
- placement = `mock`
- learning placement slot = `tests`

## Production deployment evidence

Canonical merges:
- question closure/restart-safe importer: PR #391
- learning structure: PR #410
- standardized tests: PR #420

Latest standardized-tests merge:
- commit: `f4131739d34b229d9d2c392bbbca6212adfa3397`
- Render deploy: `dep-db2i5bjncjis73cofrq0`
- Render status: **LIVE**

Pre-merge #420 gates:
- Production readiness: PASS
- Auth/RBAC/assessment integration: PASS
- Core build + architecture: PASS
- Student + assessment regression: PASS
- Admin/data integrity: PASS
- Full-stack roles + CRUD + school + quiz flows on isolated Mongo: PASS
- Vercel preview gate: PASS
- live-ai certification: PASS

Existing production learner safety evidence for CHEM26:
- learner question API = 200
- learner total = 1708
- answer exposure before submit = PASS
- image URLs present
- options present
- skillIds present

## Non-regression rules

1. لا تنشئ Taxonomy كيمياء ثانية.
2. لا تنشئ IDs بديلة للتدريبات أو الاختبارات.
3. لا تغيّر 1708-question classification بسبب التأسيس أو التدريبات أو الاختبارات.
4. لا تعيد فتح PR #367 أو #371 أو #417 أو #419 بعد اعتماد هذا الملف.
5. أي تغيير مستقبلي في المجاني/المدفوع يجب أن يكون قرار Product صريح.
6. أي تطوير CHEM26 لاحق يجب أن يعدل هذا Master/verifier بدل إنشاء مسار موازٍ.

## Final status

**CHEM26 QUESTION BANK — CLOSED**
**CHEM26 TAXONOMY — CLOSED**
**CHEM26 FOUNDATION — CLOSED**
**CHEM26 TRAINING — CLOSED**
**CHEM26 STANDARD TESTS — CLOSED**
**CHEM26 FULL CLOSURE — 100%**


## إضافة تحريرية جديدة: خرائط «زُبدة الكيمياء» (2026-10-08)

- هذه **طبقة محتوى قراءة وتفسير جديدة**، وليست Taxonomy أو بنك أسئلة أو تدريب أو اختبار موازٍ.
- البداية على الفرع `codex/chem26-zubda-batch01`: `data/chem26-zubda/v1/intro-01.json`؛ 1 خريطة رئيسية + 4 خرائط فرعية + 12 فحص فهم أصلي.
- حالة المحتوى `EDITORIAL_DRAFT`، لم يُنشر للطلاب ولم يُربط ببنك الأسئلة.
- ترتبط الصفحات بمعرفات CHEM26 الحالية دون تغيير 27/99 أو 1708 canonical أو 139 drill أو 35 test أو حدود المجاني/المدفوع.
- العقد والمراجعة والدفعات موثقة في `data/chem26-zubda/README.md`، واختبار سلامة الملف في `scripts/smoke-chem26-zubda-content-contract.mjs`.
- أي اعتماد لاحق للقراءة داخل المنصة يتطلب مراجعة علمية وواجهة تجريبية وبوابات CI وملاءمة حقوق المصدر.
- هذا الإجراء **لا يعيد فتح حالة إغلاق CHEM26 السابقة**؛ حالة خرائط الزُبدة مستقلة ولم تُغلق بعد.
