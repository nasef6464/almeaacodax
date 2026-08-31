# ALMEAA — Migration Registry

هذا السجل يميّز بوضوح بين كود migration القابل للاختبار وبين أي تشغيل فعلي على
بيانات تشغيلية. لا يمثل وجود نموذج أو inventory تصريحًا لتشغيل backfill.

| المعرف | المجال | الحالة | مصدر الحقيقة | دليل الرجوع | الملاحظة التالية |
|---|---|---|---|---|---|
| ASSESSMENT-5A | assessment models/indexes additive | VERIFIED | `AssessmentVersion/Assignment/Attempt/Response/Result` | إيقاف كتابة النموذج الجديد؛ legacy محفوظ | لا تعديل لبيانات قديمة |
| ASSESSMENT-5B | definition/result dual-read adapters | PARTIAL | legacy Quiz/QuizResult مع fallback | العودة للـlegacy reader | version/result projection اختُبرا في Mongo معزول |
| ASSESSMENT-5C | post-legacy dual-write mirror | PARTIAL | `QuizResult` يبقى authoritative | opt-out في `assessmentData.mirrorSubmissions` | opt-in فقط لموجه/محاكي؛ audit/reconciliation موجودان |
| ASSESSMENT-5D | reconciliation | VERIFIED (isolated) | `AssessmentMirrorAudit` + linked records | dry-run افتراضي؛ repair additive-only | لا يعدّل legacy result |
| ASSESSMENT-5E | historical result-only backfill | VERIFIED (isolated) | `QuizResult` cursor + compatibility projection | dry-run default؛ idempotent upsert؛ legacy لا يكتب | لا Attempt/Response/Version تاريخية؛ لم يُشغّل على production |
