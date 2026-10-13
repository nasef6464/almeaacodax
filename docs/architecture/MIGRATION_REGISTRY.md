Student path delivery VERIFIED (2026-10-13): PR533 + PR534, final automatic publication 35f64e62fa6bca59a7e9370718c3327e02215601. 14 bounded runtime groups PASS; 20 successful scoped business requests including logical restore and fixture hiding. Canonical history unchanged,35focused frontend groups +6backend behavior/model +6HTTP/Mongo groups passed, independent review approved, all3required checks passed on both exact heads. See docs/audits/STUDENT_PATH_EXPERIENCE_PUBLISHED_2026-10-13.json. Earlier pending notes are historical; no production-scale/backfill/payment-gateway claim.

## Student path preferences — 2026-10-13
Owner-authorized additive optional HomepageSettings.studentExperience, Path.settings.stageSelection/stageLabel/studentTemplate and bounded User.pathStageSelections. No bulk migration/index/backfill required. Missing settings preserve all/standard; auto stage selection uses current levels, none ignores saved stage for presentation. Legacy stage-less memberships remain valid; prompt only. Existing results/progress/orders unchanged. Rollback stops new fields' writes/projections while retaining optional fields/history; restore logical site settings explicitly, because omitted PATCH fields do not unset persisted values. Production proof pending; no production mutation yet.

# ALMEAA — Migration Registry

## Payment recovery markers — 2026-10-12 (delivery pending)

Optional PaymentRequest.fulfillment stores new approval intent and activation state; DiscountCode.redemptionRequestIds and User.subscription.appliedPaymentRequestIds make new effects atomic/idempotent. Existing records require no backfill or new index. Legacy absent markers preserve financial approval without asserting activation; ambiguous date/counter replay requires reconciliation. Rollback disables new writes/presentation while retaining existing history and markers. No production migration or bulk repair performed.

ASSESSMENT-WINDOW-RETAKE (2026-10-10): authorized additive optional Quiz window fields, optional new-outcome snapshot fields and new `QuizRetake` records. Legacy dueDate fallback retained; no historical backfill, score rewrite, assignment reader cutover or production mutation performed. No data migration required for unconfigured old quizzes. Delivery remains PARTIAL pending required CI/publication/runtime proof.

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
| ASSESSMENT-5G | direct-result surface ledger | VERIFIED (isolated) | `QuizResult` remains the authority; compatible projection is an opt-in read overlay | set `resultReaderMode=legacy` or remove the projection | the direct surfaces are `/quiz-results/:id`, `/quiz-results/my`, `/admin/quiz-results`, `/quizzes/results`, `/quizzes/results/scoped`, and `/quizzes/results/latest`; exact-HEAD HTTP `33437577025` and deep E2E `33437577018` pass; aggregate/report/AI/notification consumers intentionally remain legacy until a separately measured read-model migration |


## New question activity provenance — 2026-10-10
QUESTION-ACTIVITY-2026: additive optional QuestionAttempt provenance for new writes, no historical backfill/deletion or index change. Older records/clients remain unknown; rollback stops new-field writes/read presentation without touching grades. Owner treats existing results as trials; bounded new-write/read/report certification VERIFIED on94e81ddf through#504;5published checksPASS; no full-platform certification.
