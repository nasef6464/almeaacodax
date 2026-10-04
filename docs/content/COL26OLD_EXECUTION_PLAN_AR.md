# COL26OLD - خطة إغلاق القسم الثاني القديم

## النطاق
- المصدر الوحيد المعتمد: `كتاب تجميعات يلو للرياضيات 26 - النسخة المعدلة.pdf`.
- `COL26` الحالي (القسم الأول/3 نجوم) مغلق ولا يُعاد فتحه.
- النطاق الجديد فقط: **القسم الثاني / أسئلة النجمتين** كما يعرّفها الكتاب: الأسئلة الأقدم من 2021 أو التي لم تُحدد سنة ورودها بدقة.
- الكود الداخلي: `COL26OLD`.
- Display label المقترح: `Tahsely Tagmeat Yolo Old`.
- Production baseline عند بدء العمل: `COL26OLD=0`, `COL26=1012`, `YLM26=326`, `QDR-QNT-COL2627=946`.

## قواعد تمنع تكرار أخطاء COL26 السابقة
1. **Source-first**: لا سؤال بلا صفحة/رقم مطبوع/بلوك قسم ثانٍ مثبت بصريًا.
2. **Inventory before crop**: لا قص قبل إغلاق جرد 29/29 بلوك.
3. **Section isolation**: لا سؤال 3 نجوم يدخل COL26OLD، ولا سؤال نجمتين يعدل COL26.
4. **One Question -> One Image -> One Code**.
5. الصورة النهائية لا تعرض رقم السؤال أو السنة أو شارة التجميع/النجوم، لكن الهوية تبقى في metadata.
6. لا استخدام OCR للرياضيات إلا كحل أخير؛ الصورة/النص الأصلي وجداول الإجابات هي المرجع.
7. لا تخمين للسنة: استخدم `yearStatus=pre2021_or_unspecified` ما لم توجد سنة صريحة في المصدر.
8. لا اعتماد للإجابة من extraction النصي وحده؛ جدول إجابات المصدر + تحقق بصري/رياضي عند اللزوم.
9. لا taxonomy جديدة موازية؛ إعادة استخدام MainSkill/SubSkill الحالية فقط.
10. لا استيراد Production قبل نجاح crop/answer/skill/dedupe gates.
11. أول كتابة Production = Canary 5 فقط.
12. كل الأسئلة تبدأ Draft؛ Approved فقط بعد Final QA + Live E2E.
13. لا تعديل `SkillProgress` أو `QuizResult` التاريخية.
14. لا حذف/استبدال COL26 أو YLM26 أو COL2627.

## الهوية canonical
- `questionCode = TAH-MATH-COL26OLD-P{printedPage:03}-Q{printedQuestion:02}`
- `documentCode = COL26OLD`
- `sourceItemId = COL26OLD-PDF{pdfPageIndex:03}-P{printedPage:03}-N{printedQuestion:02}`
- metadata الإلزامية: `pdfPageIndex`, `printedPageNumber`, `printedQuestionNumber`, `section=2`, `starTier=2`, `yearStatus`, `imageHash`, `imageVersion`, `importBatchId`.

## مراحل التنفيذ
### OLD-0 - Source Contract & Safety Baseline
- تثبيت المصدر والاسم والهوية.
- إثبات COL26OLD=0 وعدم لمس البنوك المغلقة.
- الحالة: **CLOSED**.

### OLD-1 - Full Inventory
- تحديد كل مواضع `القسم الثاني` في الكتاب.
- بناء ledger لكل بلوك: الصفحة، أول/آخر رقم، العدد، الدرس/الموضوع، حالة التحقق.
- الجرد النهائي الموثق: 29 بلوك / 1,258 سؤال.
- لا يغلق إلا بعد Visual QA 29/29.
- الحالة: **CLOSED — 29/29 blocks, 1,258 questions**.

### OLD-2 - Canonical Crops
- الحالة: **CLOSED — 1,258/1,258 WebP lossless, 518px, unique SHA-256**.
- قص كل سؤال بصورة مستقلة من المصدر.
- إزالة رقم السؤال/السنة/شارة التجميع/النجوم من الصورة فقط.
- الاحتفاظ بالرسم والجدول والخيارات كاملة.
- WebP lossless + SHA-256.

### OLD-3 - Crop QA
- الحالة: **CLOSED — A/B/C/D visible 1,258/1,258; question/year/badge strip excluded; next-topic heading contamination=0**.
- 100% geometry gate + عينات بصرية تغطي كل البلوكات.
- 0 سؤالين في صورة، 0 قص ناقص، 0 هوية جانبية ظاهرة.

### OLD-4 - Answer QA
- الحالة: **CLOSED — 1,258/1,258 answers from source answer tables; invalid indexes=0**.
- ربط A/B/C/D من جدول الإجابات المقابل لنفس البلوك.
- أي تعارض -> quarantine لا تخمين.

### OLD-5 - Skills
- الحالة: **CLOSED — 1,258/1,258 mapped to live existing taxonomy; 22 main / 67 subskills; invalid live pairs=0**.
- MainSkill + SubSkill من taxonomy التحصيلي الحالية.
- mapping بمفهوم الحل لا بمجرد اسم الصفحة.
- لا إنشاء taxonomy موازية.

### OLD-6 - Canonical/Dedupe
- الحالة: **IN PROGRESS — internal duplicate codes/hashes=0; exact/fuzzy cross-check against COL26 section-one found no duplicate candidate; final cross-bank gate continues before Production**.
- dedupe داخل COL26OLD ثم cross-dedupe مقابل COL26 وYLM26.
- السؤال المطابق حقيقة لا يُكرر؛ يحفظ provenance للظهور في القسمين عند الحاجة.

### OLD-7 - R2 + Mongo Draft
- Dry-run كامل.
- Canary 5: presign -> PUT -> Draft import -> audit.
- ثم full import على دفعات <=100.
- gates: counts, hashes, URLs, identities, skills, answers, duplicates=0.

### OLD-8 - Live E2E & Approval
- اختبار حقيقي بأسئلة COL26OLD: student render -> answer -> submit -> result -> review -> skills/reports.
- تحقق عدم تسريب الإجابة وتطابق مهارات نفس المحاولة.
- بعد PASS فقط: Approved + merge + closure.

## Exit Gate النهائي
`COL26OLD CLOSED` لا تُعلن إلا إذا:
- Full-book section-2 inventory = PASS.
- crops = PASS.
- answers = PASS.
- skills = PASS.
- dedupe = PASS.
- Production count مطابق للجرد النهائي.
- R2/Mongo integrity = PASS.
- Student E2E + Results/Reports/Skills = PASS.
- CI/merge = GREEN.
