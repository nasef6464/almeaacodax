# ALMEAA — Change Map

| إذا أردت تغيير... | ابدأ من... | لا تبدأ من... |
|---|---|---|
| شاشة نتيجة الطالب | `pages/Results.tsx` و`components/results/` | quiz route مباشرة |
| شكل score/mastery | `components/results/resultScorePresentation.ts` | Database |
| تصحيح الاختبار | assessment scoring backend | React state |
| نسخة تعريف اختبار منشور | `server/src/modules/quizzes/application/assessmentDefinitionReadAdapter.ts` و`assessmentVersionRepository.ts` | تغيير وثيقة Quiz التاريخية |
| انعكاس نتيجة جديدة للنموذج additive | `assessmentSubmissionMirror.ts` و`dualWriteAssessmentSubmission.ts` | إنشاء `QuizResult` مباشرة أو تغيير response للطالب |
| فحص/إصلاح اختلاف mirror | `assessmentMirrorReconciliation.ts` | تعديل `QuizResult` أو scoring |
| جرد backfill تاريخي | `assessmentLegacyBackfillInventory.ts` | تشغيل كتابة migration على بيانات تشغيلية |
| Timer/Runner | `pages/QuizPage.tsx` وrunner components | Reports |
| بنك الأسئلة/البحث | `QuestionBankManager` وquestions API | generic shared |
| نوع سؤال جديد | assessment/question type contract | switch موزع |
| صفحة الفصل والطلاب | `dashboards/admin/SchoolsManager/` | `useStore` مباشرة |
| تقدم المسار | `pages/Dashboard/pathProgressProjection.ts` | تعديل التقرير |
| التقارير | Reports/Results view-models وreports backend | result write path |
| الإشعارات والبث | notification module + SSE adapter + queue | إضافة polling جديد |
| الدفع والوصول | payments routes/services/policies | UI unlock فقط |
| اسم/ألوان/شعار العميل | ProductConfig/branding | Search/Replace شامل |
| تخزين الفيديو والصور | media/storage adapter | Binary داخل Mongo |
| مهمة مجدولة | operations/queue/scheduler | `setInterval` داخل route |

## Contract قبل النقل

قبل أي نقل: سجل callers، API/route contract، state contract، smoke contracts، ثم انقل concern واحدًا مع facade واختبارات.
