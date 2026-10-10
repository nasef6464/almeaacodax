# ALMEAA — Change Map

| إذا أردت تغيير... | ابدأ من... | لا تبدأ من... |
|---|---|---|
| حدود دخول الفصل واستعادة الحساب | middleware/loginProtection.ts ثم modules/auth/application/loginFailureBudget.ts؛ إرسال رابط الاستعادة في sendPasswordRecovery.ts | رفع حدود المصادقة الأخرى أو تعديل RBAC/النتائج |
| هوية وتجميع خلايا مصفوفة المهارات | utils/classSkillMatrix.ts ثم ClassSkillsMapPanel.tsx | تجميع أسماء المهارات عبر المواد أو تعديل النتائج |
| نبض المعلم الاختياري | components/classroom/ClassroomOptionalPulse.tsx | إضافة polling أو إرسال دفعة تلقائيًا |
| أولويات المشرف وملخص المدير | SupervisorFollowUpPriorities.tsx وSchoolExecutiveSummary.tsx | توسيع نطاق المستخدم أو تغيير مصادر النتائج |
| مجموعات قوائم اللوحات المصرح بها | components/DashboardSectionNav.tsx | تغيير الصلاحيات أو المسارات |
| عرض قوائم الأدوار تدريجيًا مع طباعة كاملة | components/DisplayListControls.tsx | حذف النتائج أو تقليل مصدر التصدير |
| عرض تكليفات الطالب المطلوبة والمنجزة | components/SchoolTestsPanel.tsx | تغيير مصدر النتائج أو صلاحياتها |
| المزيد/أقل لقوائم الطالب | components/StudentListPager.tsx | تغيير حد API أو حذف التاريخ |
| إنجاز خطة الطالب والخطوة التالية | `utils/studentPlanCompletion.ts` و`pages/Plan.tsx` | تغيير درجات الاختبارات |
| توزيع مهام الخطة الزمنية | `utils/studentPlanSchedule.ts` | إعادة بناء الدورات |
| تأكيد حفظ خطة الطالب | `store/slices/studyPlansSlice.ts` | نجاح محلي قبل استجابة API |
| استعادة خطط الطالب بعد الدخول | `hooks/useStudentStudyPlans.ts` و`contentStudyPlanRoutes.ts` | إدخال الخطط الخاصة إلىكاش المحتوى المشترك |
| شاشة نتيجة الطالب | `pages/Results.tsx` و`components/results/` | quiz route مباشرة |
| تحليل الاختبارات الموجهة للمشرف | `dashboards/admin/supervisorTests/assessmentReportEvidence.ts` و`useScopedAssessmentResults.ts` | توسيع store النتائج الشخصية |
| ظهور اختبارات الطلاب لدى مدير المدرسة | `schoolDirectorWorkspace.ts` و`schoolAssessmentAudience.ts` | تغيير صلاحيات المدير أو نسخ Quiz |
| ظهور تكليفات المشرف لدى المعلم | `schoolTeacherWorkspace.ts` و`teacherAssessmentClassIds.ts` | توسيع نطاق المعلم خارج فصوله المسندة |
| شكل score/mastery | `components/results/resultScorePresentation.ts` | Database |
| تصحيح الاختبار | assessment scoring backend | React state |
| نسخة تعريف اختبار منشور | `server/src/modules/quizzes/application/assessmentDefinitionReadAdapter.ts` و`assessmentVersionRepository.ts` | تغيير وثيقة Quiz التاريخية |
| انعكاس نتيجة جديدة للنموذج additive | `assessmentSubmissionMirror.ts` و`dualWriteAssessmentSubmission.ts` | إنشاء `QuizResult` مباشرة أو تغيير response للطالب |
| فحص/إصلاح اختلاف mirror | `assessmentMirrorReconciliation.ts` | تعديل `QuizResult` أو scoring |
| جرد backfill تاريخي | `assessmentLegacyBackfillInventory.ts` | تشغيل كتابة migration على بيانات تشغيلية |
| Timer/Runner | `pages/QuizPage.tsx` و`utils/quizProgressDraft.ts` لحفظ موعد انتهاء القسم الصارم وقفل الأقسام محليًا | Reports |
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
| عرض قرارات المشرف وتحليل الاختبار والتدخل والمحاولات الحديثة | `pages/Reports/StaffDecisionPanel.tsx`, `DirectedAssessmentReportPanel.tsx`, `StaffRemediationPanel.tsx`, `ScopedRecentAttemptsPanel.tsx`؛ البيانات والإجراءات تبقى في `Reports.tsx` | إضافة طلبات أو مخزن أو مؤقت داخل مكونات العرض |
| الإشعارات والبث | `modules/notifications` + audience/campaign application services + SSE/Redis/BullMQ | إضافة polling جديد أو صلاحية audience داخل route |
| الدفع والوصول | payments routes/services/policies | UI unlock فقط |
| اسم/ألوان/شعار العميل | ProductConfig/branding | Search/Replace شامل |
| Feature أو provider خاص بعميل | ProductConfig feature/policy/provider adapter | `if customerName` أو fork للـCore |
| تخزين الفيديو والصور | provider-neutral media/storage adapter؛ Cloudflare-backed delivery هو الاتجاه الحالي | Binary داخل Mongo أو proxy دائم للملفات الكبيرة عبر Node |
| مهمة مجدولة | operations/queue/scheduler | `setInterval` داخل route |

## Contract قبل النقل

قبل أي نقل: اقرأ `CURRENT_DIRECTORY_AND_MODULE_MAP.md` و`DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`، سجل callers وcanonical authority وAPI/route/state/smoke contracts، ثم انقل concern واحدًا مع facade واختبارات.

الأولوية بعد إغلاق checkpoint المدارس الحالي هي سد فجوة Product Gate، لا استخراج concern إضافي لمجرد تقليل حجم ملف. راجع `FINAL_MASTER_PLAN_V3_AR.md` قبل اختيار موضع التغيير.

## Interactive teacher changes
- Checkpoint coaching policy: server/src/modules/ai/contracts/checkpointHints.ts, applied by shared validation and compact assembly. Prose separator recovery: components/results/teaching/boardText.ts; provider cache revision remains in ai.routes.ts.
- Teaching wire schema/validation: server/src/modules/ai/contracts/teachingStoryboard.ts.
- Compact provider content/schema and server-owned scene/checkpoint assembly: server/src/modules/ai/application/compactTeachingPlan.ts. Public browser contract remains unchanged.
- Planner instructions and cached JSON/text fallback: server/src/modules/ai/application/questionTeachingPlan.ts; review authorization stays in ai.routes.ts.
- Board replay/actions: components/results/teaching/boardState.ts; timing/pause/resume: useTeachingPlayback.ts; voice backend: narrationEngine.ts; render: TeachingBoard.tsx.
- Spoken notation and safe unsupported-expression fallback: components/results/teaching/spokenMath.ts; matching/local browser voice selection remains in narrationEngine.ts. No new inference or server authority.
- Student dialogue/interruption/continue: components/results/InteractiveSmartTeacher.tsx. See docs/audits/INTERACTIVE_TEACHING_BOARD_V1_2026-10-08.md for current proof limits.


## Classroom assessment waiting UI — 2026-10-09
Student waiting presentation moved from `ClassroomStudentLive` into `ClassroomStudentWaitingPanel`, removing rotating tip timers. Existing template dispatch presentation is composed in `ClassroomSavedBatchesPanel` from the active classroom panel. No public route/API, auth, scoring or stored model ownership changes.

## Mock client policy and ordering ownership — 2026-10-10
- services/mockExamNormalization.ts owns published mock policy conversion; services/adapter.ts delegates. Preserve strict/flexible flags, subject domains and optional legacy defaults.
- utils/mockExam.ts owns section-respecting question order; QuizPage delegates and restores an older draft current question by canonical identity. Scoring, server session authority and persisted historical results remain unchanged.


## Student platform/school context reports — 2026-10-10
Student report/history source separation reuses persisted learningContext and canonical scores. New UI/hook boundaries plus existing result-list projections/filter helper and submission relation resolver; no model migration, AI call, scoring/auth change or new polling. Evidence: docs/audits/STUDENT_PLATFORM_SCHOOL_CONTEXT_REPORTS_2026-10-10.md.

- Older attempt detail: useStudentResultDetail owns a single on-demand existing protected /quiz-results/:id read with actor/request identity isolation; Results composes it. Quizzes and the source report panel link by persisted result ID. No global result hydration or history traversal.


## New question activity provenance — 2026-10-10
Question activity reporting delegates provenance to the quizzes application resolver and counts to utils/studentQuestionActivity. Existing telemetry/review writers emit additive metadata; grading/mastery side effects retain their owners.
