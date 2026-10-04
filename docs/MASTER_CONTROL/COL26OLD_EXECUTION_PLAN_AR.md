# COL26OLD — خطة إغلاق القسم الثاني القديم من تجميعات يلو

## 0. الحالة المرجعية غير القابلة للكسر

- المستودع: `nasef6464/almeaacodax`
- خط الأساس عند بدء العمل: `main@44967a12d35ef7c4d257c4b75de853aa8b86ec28`
- المصدر الوحيد: **كتاب تجميعات يلو للرياضيات 26 - النسخة المعدلة.pdf**
- النطاق: **القسم الثاني فقط / أسئلة النجمتين فقط**.
- تعريف المصدر للقسم الثاني: الأسئلة الواردة قبل 2021، والأسئلة التي لم تُحدد سنة ورودها بدقة.
- `COL26` الحديث مغلق نهائيًا ولا يُعاد فتحه:
  - 1,012 سؤالًا.
  - V8.
  - Approved.
- `YLM26` و`QDR-QNT-COL2627` خارج هذا النطاق ولا تُمس.
- اسم النطاق الجديد:
  - internal/document code: `COL26OLD`
  - display name: `Tahsely Tagmeat Yolo Old`
  - Arabic display: **تجميعات يلو القديمة — القسم الثاني**
- import batch المقترح عند الوصول إلى Production: `TAH-MATH-COL26OLD-SEC2-V1`.

## 1. مبادئ تمنع أخطاء COL26 السابقة

1. **الجرد أولًا، ثم القص**: ممنوع إنشاء حزمة صور أو استيراد قبل إغلاق Inventory القسم الثاني كاملًا.
2. **حدود القسم من المصدر لا من السنة وحدها**: لا نضم سؤالًا لأنه 2020 فقط؛ يجب أن يقع داخل كتلة `القسم الثاني` الفعلية في الكتاب.
3. **لا نعتمد text extraction كدليل بصري**: طبقة النص تستخدم للفهرسة والمساعدة فقط؛ حدود السؤال/الرسم/الخيارات تُثبت بصريًا من الصفحة.
4. **هوية المصدر لا تظهر للطالب**:
   - لا رقم سؤال مطبوع داخل الصورة.
   - لا سنة/شرطة السنة.
   - لا نجمتان/شارة التجميعات.
   - لا عنوان القسم أو رأس الصفحة.
   - كل هذه البيانات تبقى في metadata.
5. **One Question → One Image → One Code** بلا استثناء.
6. **لا قص جماعي ثابت قبل معايرة الصفحة**: أي قاعدة هندسية تُختبر على أول/وسط/آخر كل نمط صفحة قبل تعميمها.
7. **لا Approval مبكر**: كل ما يدخل Production يبقى Draft حتى تنجح بوابات الصورة/الإجابة/المهارة/live E2E.
8. **لا تغيير في COL26 المغلق**: dedupe مع COL26 يعني اكتشاف التكرار وتسجيل provenance، وليس تعديل أو حذف COL26.
9. **لا Runtime env keys جديدة**: نستخدم عقود التشغيل الموجودة حتى لا نكرر فشل Architecture Gate.
10. **API batch <= 100**، وCanary حقيقي قبل Full Import.
11. **لا أسرار في stdout/logs/GitHub**، ولا bypass لـRBAC/CSRF.
12. **لا تعديل لنتائج الطلاب/SkillProgress التاريخية**.
13. **العدد النهائي يثبته الكتاب**، لا رقم تاريخي ولا توقع سابق.

## 2. الهوية والـMetadata

الصيغة canonical المقترحة:

`TAH-MATH-COL26OLD-P<printedPageNumber>-Q<printedQuestionNumber>`

والسجل يحتفظ على الأقل بـ:

- `documentCode = COL26OLD`
- `sourceItemId`
- `pdfPageIndex`
- `printedPageNumber`
- `printedQuestionNumber`
- `questionCode`
- `sourceSection = second`
- `importanceStars = 2`
- `sourceYear` إذا كانت السنة مطبوعة فعلًا فقط.
- `yearStatus = explicit | pre2021 | unspecified`
- `imageHash`
- `imageVersion`
- `importBatchId`
- `mainSkillId`
- `subSkillId`
- `correctOptionIndex`

لا نخمن سنة لسؤال يحمل شرطة/سنة غير محددة.

## 3. مراحل التنفيذ وبوابات الإغلاق

### OLD-0 — Source Lock
- تثبيت المصدر وSHA محلي له.
- تثبيت تعريف القسم الثاني من المقدمة.
- تثبيت main baseline.
- إثبات أن COL26=1,012 لا يتغير.

**Exit Gate:** المصدر/النطاق/الأسماء مثبتة.

### OLD-1 — Full Section-2 Inventory
- اكتشاف كل ظهور فعلي لـ`القسم الثاني`.
- ربط كل كتلة بالقسم الأول/الدرس السابق لها.
- الاعتماد على جداول الإجابات لتثبيت نطاق أرقام الأسئلة.
- مطابقة بصرية لأول وآخر سؤال في كل كتلة.
- إنشاء Coverage Ledger لكل كتلة/صفحة/سؤال.

**Exit Gate:** كل صفحات القسم الثاني محسوبة، 0 كتلة مجهولة، 0 فجوة غير مفسرة.

### OLD-2 — Crop Geometry & Calibration
لكل نمط صفحة:
- اختبار أول/وسط/آخر.
- الصورة النهائية تحتوي السؤال + الرسم اللازم + الخيارات A/B/C/D فقط.
- إزالة رقم السؤال، السنة/شرطة السنة، النجمتين/التجميعات، عنوان القسم، رؤوس الصفحات، جداول الإجابات، والسؤال المجاور.
- لا إعادة تحجيم أو تنعيم يضر الرموز الرياضية.
- WebP lossless.

**Exit Gate:** عينات كل الأنماط PASS قبل التعميم.

### OLD-3 — Full Crops
- توليد كل القصات.
- SHA-256 لكل صورة.
- 1:1 بين inventory ↔ file ↔ hash ↔ questionCode.
- أي حالة مشكوك فيها = Quarantine وليست اعتمادًا تلقائيًا.

**Exit Gate:** expected count = crop count = unique codes = unique hashes، مع 0 missing.

### OLD-4 — Visual QA
- فحص كل anomaly آليًا.
- عينات موزعة على جميع الـ29 كتلة.
- فحص بصري مكثف للصفحات التي بلا text layer أو ذات رسوم/جداول.
- لا رقم/سنة/نجوم/تجميعات ظاهرة.
- لا سؤال مجاور ولا قطع من السؤال.

**Exit Gate:** 0 unresolved crop defects.

### OLD-5 — Answer QA
- مفتاح الإجابات من الكتاب هو المصدر الأول.
- A/B/C/D → index 0..3.
- مقارنة مفتاح الإجابة برقم السؤال/الصفحة.
- أي تعارض أو مفتاح غير واضح = Quarantine، بلا تخمين.

**Exit Gate:** كل سؤال إما answer verified أو quarantined بوضوح؛ 0 تخمين.

### OLD-6 — Skill Mapping
- إعادة استخدام taxonomy الحالية فقط.
- main/subskill من مفهوم الحل الحقيقي، لا من اسم الصفحة فقط.
- لا إنشاء taxonomy موازية.
- ربط Foundation/Video/Training/Support فقط عندما يوجد canonical mapping فعلي.

**Exit Gate:** 0 سؤال معتمد بلا main/subskill، و0 prefix/taxonomy mismatch.

### OLD-7 — Cross-Bank Dedupe & Canonical Build
- dedupe داخل COL26OLD.
- dedupe مقابل COL26 الحديث وYLM26 من حيث المحتوى/الصورة/الهوية.
- السؤال المكرر بين المصدرين لا يضاعَف بلا مبرر؛ تُحفظ provenance.
- بناء manifest Draft النهائي.

**Exit Gate:** 0 duplicate غير مبرر، 0 collision في questionCode/sourceItemId.

### OLD-8 — Production Import
Pre-write gate:
- COL26 الحديث = 1,012 Approved كما هو.
- YLM26 ثابت.
- COL2627 ثابت.
- COL26OLD production count = 0 قبل البداية، أو مطابق للـcheckpoint عند الاستئناف.

التنفيذ:
1. full dry-run.
2. Canary = 5.
3. تحقق R2 + hashes + Mongo Draft.
4. بقية الدفعة على chunks <=100.
5. reconcile بعد كل chunk.

**Exit Gate:** Production Draft count يساوي canonical expected count، 0 duplicate، 0 integrity issue.

### OLD-9 — Live E2E + Approval + Closure
- اختبار فعلي لأسئلة COL26OLD عبر المسار canonical.
- الطالب يرى الصورة والخيارات دون answer leakage.
- Submit/Result/Review.
- skillsAnalysis تطابق skills لأسئلة نفس المحاولة.
- Student/Admin reports تعرض نفس المحاولة.
- بعد PASS فقط: approval عبر workflow الرسمي.
- CI exact-head Green ثم merge.

**Exit Gate:** Production + E2E + Reports + Skills + CI PASS.

## 4. Rollback وسلامة البيانات

- قبل أي write: snapshot/counts + batch checkpoint.
- لا حذف جماعي بلا filter واضح وrollback.
- R2 content-addressed؛ استبدال الصور لا يعني حذف التاريخ فورًا.
- أي خطأ في canary يوقف full write ويُصلح أولًا.
- لا إعادة تشغيل مرحلة مغلقة إلا إذا ظهر regression مثبت.

## 5. Definition of CLOSED

لا يُقال `COL26OLD CLOSED` إلا إذا تحقق معًا:
- Full-book section-2 inventory PASS.
- Crop QA PASS.
- Answer QA PASS.
- Skill mapping PASS.
- Dedupe PASS.
- R2/Mongo Production PASS.
- Approved عبر المسار الرسمي.
- Student E2E PASS.
- Results/Reports/Skills PASS.
- exact-head CI PASS.
- merge إلى main.
- COL26 الحديث بقي 1,012 دون تغيير.

## 6. أول checkpoint

اكتُشفت من المصدر 29 كتلة `القسم الثاني`.
جداول الإجابات تعطي حاليًا **1,255 سؤالًا مرشحًا قويًا** للقسم الثاني.
هذا الرقم لا يصبح Final إلا بعد المطابقة البصرية الشاملة للـ29 كتلة وإغلاق Coverage Ledger.
