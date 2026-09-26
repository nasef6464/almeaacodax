# ALMEAA — سياسة إدارة التوثيق

## الهدف

إيقاف ظاهرة:
- خطة جديدة لكل محادثة.
- تقرير إغلاق يصبح بعد أسبوع مصدر حقيقة بالخطأ.
- ملفات بأسماء FINAL / MASTER / CURRENT متعارضة.
- Agent يقرأ وثيقة قديمة ويعيد تنفيذ شغل مقفول.

## القاعدة

**Reference Center هو الفهرس، وليس عدد الملفات.**

لا نحتاج حذف التاريخ، لكن نحتاج أن يعرف الجميع فورًا:
- ما هو حالي.
- ما هو دليل.
- ما هو قديم.
- ما تم استبداله.

## أنواع الوثائق

### 1. Canonical
وثيقة طويلة العمر تمثل قاعدة أو رؤية أو عقدًا.
يتم تحديثها بدل إنشاء نسخة جديدة.

### 2. Execution State
حالة متغيرة باستمرار.
مرجعها الرئيسي:
`docs/architecture/CODEX_EXECUTION_STATE.md`

### 3. Evidence
تثبت run/phase/closure محددًا.
لا تتحول وحدها إلى خطة مستقبلية.

### 4. Handoff
تسليم محدود لمجال أو مرحلة.
بعد الإغلاق تصبح Supporting/Historical إلا إذا سجلها Reference Center كمرجع نشط.

### 5. Archive
معلومات مهمة تاريخيًا لكنها غير صالحة لتحديد الوضع الحالي.

## قواعد أسماء الملفات الجديدة

استخدم أحد الأنماط:
- `<DOMAIN>_REFERENCE_AR.md`
- `<DOMAIN>_CURRENT_STATE.md`
- `<DOMAIN>_EVIDENCE_YYYY-MM-DD.md`
- `<DOMAIN>_HANDOFF_AR.md`

تجنب:
- FINAL_FINAL
- LATEST_NEW
- MASTER_V2_NEW
- COPY
- UPDATED2

## متى ننشئ ملفًا جديدًا؟

أنشئ جديدًا فقط إذا كان:
- Domain جديد.
- Evidence مستقلة.
- Runbook تشغيلي.
- Contract أو ADR مستقل.

غير ذلك: حدّث المرجع الحالي.

## الأرشفة

لا تنفذ bulk move لكل الوثائق مرة واحدة.

الطريقة الآمنة:
1. اختر Domain واحدًا.
2. حدد Canonical docs.
3. حدّث الروابط.
4. انقل المتبقي التاريخي إلى `docs/archive_reports/<domain>/` عند الحاجة.
5. شغل link/search checks المناسبة.
6. Commit توثيق مستقل.

## التزام كل Agent

قبل إنشاء أي plan/report:
1. اقرأ Reference Center.
2. ابحث هل يوجد Canonical doc لنفس الغرض.
3. إن وجد، حدّثه.
4. إن احتجت Evidence جديدة، اربطها من Registry.
5. لا تجعل Handoff مؤقتًا يتغلب على Master reference.
