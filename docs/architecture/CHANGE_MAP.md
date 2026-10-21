## Selected classroom reports and teacher material — 2026-10-21 (PR589 published; scoped read-only verification PASS)

Approved scope: director assigns one explicit material per teacher within each school; supervisors retain all materials within existing authorized school/class scope. teacherMaterialPolicy owns fail-closed missing/conflicting assignment resolution and canonical/qualified legacy question matching. teacherMaterialScope loads active indexed assignments and checks classroom snapshots. Existing questions, create/template/append, aggregate/history/insights/competition, socket room entry and assessment class scope consume that policy; non-teacher authorization remains independently required. Assignment writes reject blank active material or a second active material. Concurrent conflicting writes cannot broaden reads; they require director correction. No automatic assignment choice/backfill.

ClassroomComparisonPanel lazily reads at most20 selected sessions from one authorized school, with3 concurrent reads and cancellation. classroomComparison deduplicates sessions, resolves canonical material identities with path-unique legacy aliases, and compares first/latest dated evidence within a material. Mixed-material student totals stay descriptive without a fabricated trend or support classification; skills retain question-level material evidence. Missing/absent evidence is explicit. CSV neutralizes spreadsheet formulas. Existing report snapshots and scoring remain unchanged. SupervisorClassroomSessionList owns the extracted selection UI; DirectorTeacherAssignments and TeacherMaterialNotice own setup/correction guidance. Existing admin class-people operations now require explicit material too.


## Classroom clear presentation — 2026-10-21 (release pending)
ClassroomLessonToolbar owns four staff actions and optional discussion/more controls; ClassroomSubmittedStudents lazily reads the existing staff aggregate when opened and shows submitted names plus opt-in batch grades. useScopedClassroomState discards reveals across question/batch transitions before paint, including A→B→A. ClassroomQuestionReviewPanel, student runner and projector share classroomOptionPresentation; wide choices use four columns, mobile text retains room. Existing saved templates and material/section/skill picker are reused. No new endpoint/provider/interval/authority or grading change.

## School aggregation performance — 2026-10-21, functional PASS / performance PARTIAL

quizzes/infrastructure/learningEvidencePopulation streams the existing authorized canonical User audience in250identity batches, aggregates latest entire QuizResult attempts by(userId,quizId) before skill filtering, and classifies the complete population before status paging. The existing20s readiness budget spans all batches. schoolAssessmentResultEvidenceStages supplies whitelisted, date/_id-ordered latest evidence for full report and status-filtered pages; schoolAssessmentFilteredLearners consumes sorted roster batches and facets full counts plus selected page rows in Mongo; absence uses bounded completed-ID sets. Ordinary unfiltered pages retain their bounded per-page lookup. Application authorization, policy thresholds, API shapes, grading, persisted records and indexes remain unchanged. No background refresh, polling, cache or provider call.

## Teacher catalog and mastered-result guidance — 2026-10-20
Existing teacher report subject-ID derivation → pure teacherAssessmentSubjects, reused by the school teacher catalog. Results focuses non-strong measured skills and uses positive continuation for all-strong evidence; no grade/status recomputation or historical writes.

## School learning evidence — 2026-10-19
Readiness and skill-support decisions now belong to quizzes/application/learningEvidence and its explicit reporting policy, displayed by dashboards/school-learning/SchoolLearningEvidencePanel in the three school staff workspaces. Supervisor students/skills entry uses this source-first center; old roster operations and platform-history export remain explicitly separate. New default entry avoids sampled legacy result/all-roster loads; legacy consumers load on demand with cancellation guards. Classroom reporting and school assessment definition/assignment/scoring owners are unchanged. Director creation adds explicit whole-school central targeting through the existing school-scoped capability guard; class scope remains default.

## School skills display — 2026-10-18
Existing authorized report hook → schoolSkillsDisplay canonical subject key → teacher/supervisor subject-first view → existing detail sections/display limits. No request, authority, scoring, persisted record or migration change.

## Approved image regions — 2026-10-18
Question editor → existing protected question CRUD → shared strict region validation/source invalidation → canonical Question metadata → teaching image identity/cache → deterministic first-scene v2 boxes. Existing text generation and renderer reused; no additional provider/image-fetch operation.
Evidence: docs/audits/VERIFIED_TEACHING_REGIONS_2026-10-18.md (release pending).

Student path delivery VERIFIED (2026-10-13): PR533 + PR534, final automatic publication 35f64e62fa6bca59a7e9370718c3327e02215601. 14 bounded runtime groups PASS; 21 successful scoped business requests including logical restore and fixture hiding. Canonical history unchanged,35focused frontend groups +6backend behavior/model +6HTTP/Mongo groups passed, independent review approved, all3required checks passed on both exact heads. See docs/audits/STUDENT_PATH_EXPERIENCE_PUBLISHED_2026-10-13.json. Earlier pending notes are historical; no production-scale/backfill/payment-gateway claim.

Student path experience (2026-10-13): owner-authorized optional settings/stage preferences extend existing contracts; HomepageManager/PathsManager configure them, StudentExperienceContext projects learner browsing across header/dashboard/catalog/plan/reports and direct course/subject guards. Existing access policy and scoring remain authoritative. New focused frontend and HTTP/Mongo tests run in existing mandatory gates; budgets unchanged. Rollback instructions in MIGRATION_REGISTRY. Delivery pending exact-head CI/live proof.

#Auth DTO projection (2026-10-12): server/src/modules/auth/presentation/serializeAuthUser.ts owns the existing unchanged sensitive-field exclusions. The auth route retains learner access projection, administrative history and authorization; extraction keeps the existing 65,000-character ownership gate without changing its limit.

 ALMEAA — Change Map

Payment recovery (2026-10-12, delivery pending): payment route's duplicated approval/grant mutation moved into paymentFulfillment, with durable activation state; Tap verification moved into tapWebhook using the official signed-field contract. Existing endpoint/manual evidence/financial audit owners remain in payment.routes. New optional markers preserve historical records without backfill.

Frontend repair (2026-10-12, verification pending): AuthContext store sync moves to authStoreSync; existing async callers use actor/session snapshots, CourseView/Player share exact courseCompletion and stable URL changes, and MyRequests/FinancialManager use paymentRequestPresentation for activation state. Pricing removes inferred offer selection while retaining published actual package cards. Server persistence/auth/RBAC/scoring ownership unchanged.

Courses access repair (2026-10-12, delivery pending): duplicated course/certificate/discussion access readers now consume entitlementPolicy; quiz submission adds attached-course verification. Auth single learner responses project effective historical mirror IDs; admin views keep original history. Protected bootstrap content projection moves into contentPayloadAccess; payload shape/managed visibility stay with existing owners.


Classroom history loading/error/retry: start at `hooks/useClassroomTeacherReports.ts`; selected-session student details remain `components/classroom/SmartClassroomReportsSection.tsx`. Do not add a global authority cache or student-detail load to the radar.

| إذا أردت تغيير... | ابدأ من... | لا تبدأ من... |
|---|---|---|
| مواعيد الاختبار وإعادته لطلاب محددين | quizAvailability.ts ثم quizViewerPolicy.ts وquizRetakeRoutes.ts؛ العرض SchoolTestsPanel.tsx وQuizRetakeDialog.tsx | تعديل النتائج القديمة أو توسيع الجمهور والصلاحيات |
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

2026-10-18 — Smart teacher image rollout (PR572): provider response deadline/body-size transport extracted from aiProviderAdapters to aiResponseTransport; adapter retains URL validation and provider/key policy. No public route or data authority migration.

2026-10-18 — teachingImageGrounding extracts internal provider geometry/schema from teachingImageLesson; browser/public marks retain0..1 x/y. No authority, route, collection or grading migration.
