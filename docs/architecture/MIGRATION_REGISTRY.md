# ALMEAA — Migration Registry

هذا السجل يميّز بوضوح بين كود migration القابل للاختبار وبين أي تشغيل فعلي على
بيانات تشغيلية. لا يمثل وجود نموذج أو inventory تصريحًا لتشغيل backfill.

| المعرف | المجال | الحالة | مصدر الحقيقة | دليل الرجوع | الملاحظة التالية |
|---|---|---|---|---|---|
| ASSESSMENT-5A | assessment models/indexes additive | VERIFIED | `AssessmentVersion/Assignment/Attempt/Response/Result` | إيقاف كتابة النموذج الجديد؛ legacy محفوظ | لا تعديل لبيانات قديمة |
| ASSESSMENT-5B | definition/result dual-read adapters | VERIFIED (isolated) | legacy Quiz/QuizResult مع fallback | إعادة `resultReaderMode` إلى `legacy` | definition وdetail وكل قوائم النتائج المباشرة اختُبرت في Mongo معزول؛ لا production opt-in |
| ASSESSMENT-5C | post-legacy dual-write mirror | PARTIAL | `QuizResult` يبقى authoritative | opt-out في `assessmentData.mirrorSubmissions` | opt-in فقط لموجه/محاكي؛ audit/reconciliation موجودان |
| ASSESSMENT-5D | reconciliation | VERIFIED (isolated) | `AssessmentMirrorAudit` + linked records | dry-run افتراضي؛ repair additive-only | لا يعدّل legacy result |
| ASSESSMENT-5E | historical result-only backfill | VERIFIED (isolated) | `QuizResult` cursor + compatibility projection | dry-run default؛ idempotent upsert؛ legacy لا يكتب | لا Attempt/Response/Version تاريخية؛ لم يُشغّل على production |
| ASSESSMENT-5F | feature-flagged direct result reads | VERIFIED (isolated) | `QuizResult` وper-assessment `resultReaderMode` | `legacy` default/explicit rollback | detail وstudent/admin/legacy/scoped lists تستخدم batch lookup بلا N+1؛ aggregates تبقى legacy |
