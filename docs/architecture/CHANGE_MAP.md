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
| بنك الأسئلة/البحث العام | `QuestionBankManager` وquestions API | generic shared |
| ربط أسئلة داخل فيديو/درس | `dashboards/admin/builders/VideoQuestionPicker.tsx` ثم `UnifiedLessonBuilder.tsx` | تحميل أول 100 سؤال أو تعديل Player |
| snapshot تشغيل سؤال فيديو | `utils/videoQuestionSnapshot.ts` و`InteractiveQuestion.inlineQuestion` | global Question Bank عند تشغيل الطالب |
| استكمال فيديو تفاعلي للطالب | `components/CoursePlayer.tsx` و`components/CustomVideoPlayer.tsx` و`utils/interactiveVideoProgress.ts` | إضافة Grade أو تعديل Assessment/Quiz scoring |
| نوع سؤال جديد | assessment/question type contract | switch موزع |
| صفحة الفصل والطلاب | `dashboards/admin/SchoolsManager/` | `useStore` مباشرة |
| إنشاء/حذف/إعادة تسمية فصل أو إنشاء فصول جماعيًا | `dashboards/admin/SchoolsManager/schoolClassLifecycleActions.ts` | إعادة منطق orchestration إلى `SchoolsManager.tsx` |
| تقدم المسار | `pages/Dashboard/pathProgressProjection.ts` | تعديل التقرير |
| Subject Learning Space composition | `pages/GenericPathPage.tsx`, `components/LearningSection.tsx`, `utils/learningSpaceTabs.ts` | نقل Course أو Assessment ownership |
| إدارة placement داخل المادة | `dashboards/admin/PathsManager.tsx` و`live-learning-manager-deep-audit.mjs` | بناء content graph أو microservice |
| التقارير | Reports/Results view-models وreports backend | result write path |
| الإشعارات والبث | `modules/notifications` + audience/campaign application services + SSE/Redis/BullMQ | إضافة polling جديد أو صلاحية audience داخل route |
| الدفع والوصول | payments routes/services/policies | UI unlock فقط |
| اسم/ألوان/شعار العميل | ProductConfig/branding | Search/Replace شامل |
| Feature أو provider خاص بعميل | ProductConfig feature/policy/provider adapter | `if customerName` أو fork للـCore |
| تخزين الفيديو والصور | provider-neutral media/storage adapter؛ Cloudflare-backed delivery هو الاتجاه الحالي | Binary داخل Mongo أو proxy دائم للملفات الكبيرة عبر Node |
| مهمة مجدولة | operations/queue/scheduler | `setInterval` داخل route |

## Contract قبل النقل

قبل أي نقل: اقرأ `CURRENT_DIRECTORY_AND_MODULE_MAP.md` و`DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`، سجل callers وcanonical authority وAPI/route/state/smoke contracts، ثم انقل concern واحدًا مع facade واختبارات.

الأولوية بعد إغلاق checkpoint المدارس الحالي هي سد فجوة Product Gate، لا استخراج concern إضافي لمجرد تقليل حجم ملف. راجع `FINAL_MASTER_PLAN_V3_AR.md` قبل اختيار موضع التغيير.
