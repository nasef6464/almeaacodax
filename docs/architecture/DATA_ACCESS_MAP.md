# ALMEAA — Data Access Map

Student plans (2026-10-10): protected `GET /content/study-plans` reads only `req.authUser.id`, active-first/latest order, limit200, private/no-store. `hooks/useStudentStudyPlans.ts` loads this lightweight data only for the Plan page and rejects stale actors; learner content bootstrap remains shared and never hydrates an empty plan list over private state. No additional requests per answer, polling, scoring or data migration. Runtime/published closure evidence: `docs/audits/STUDENT_PLAN_COMPLETION_2026-10-10.md`.

هذه خريطة تصميم وتشغيل، وليست تصريحًا بأن كل أحجام التوسع مثبتة.

Teacher directed discovery (2026-10-09): existing school-scoped assigned roster resolves before the assessment query. It selects only metadata plus audience IDs, caps100 and matches school/class/student explicit audiences. Response derives assigned class intersections only; no question bodies, polling or extra database query. Published/own-draft visibility retained; scale remains unproven.

| البيانات | النمو المتوقع | القراءات الساخنة | السياسة الحالية/المطلوبة | الحالة |
|---|---|---|---|---|
| Questions + image references | 80k–500k+ | filters/skill/type/search؛ Video Question Picker | server pagination، projection، indexes، media خارج Mongo؛ picker يرسل scope الدرس والبحث/الفلاتر ويخزن snapshot تشغيل متوافقًا داخل lesson بدل قراءة global Question Bank أثناء playback | PARTIAL |
| Quiz/Assessment definitions | آلاف | builder/access/assignment | `AssessmentVersion` immutable additive عند النشر وتعديل المنشور؛ reader يرجع للـlegacy عند الغياب؛ النسخ التاريخية لا تعدّل. G12 School Director ينشئ Quiz مدرسية من 1–100 سؤال معتمد، learning path صالح، target class داخل المدرسة، و`showOnPlatform=false` خلف permission + entitlement. قائمة المدير محدودة 100 تعريف موجه لفصول المدرسة. | PARTIAL — isolated create/PATCH/version-read and G12 school creation proven; production cutover/scale NOT PROVEN |
| Attempts/Responses/Results | ملايين | student result/report/submit | `submissionKey` idempotency، response per attempt/question، mirror opt-in للموجه/المحاكي، cursor-bounded reconciliation؛ أسطح النتيجة المباشرة فقط تقرأ compatibility projection خلف rollback flag (القوائم ببحثين batch ثابتين، و`latest` ببحث مفرد)؛ أما analytics/reports/AI/notifications فتبقى `QuizResult` legacy لارتباطها بمقاييس مشتقة؛ historical backfill result-only only | PARTIAL — isolated Mongo proven, production scale NOT PROVEN |
| Skills/mastery | ملايين تاريخيًا | student/class skill trend | projections/read models بعد benchmark | NOT PROVEN |
| Courses/Lessons/Videos | مئات المناهج وعشرات آلاف الفيديو | catalog/player/progress؛ interactive-question playback | media is URL/CDN-reference based and must stay off Node-origin byte streaming; Cloudflare-backed delivery target; content bootstrap is scope-aware but some scoped topic/lesson/library reads remain unbounded and must be measured/bounded as data grows | PARTIAL |
| Subject Learning Space bootstrap | scoped path/subject content | student entry + manager placement | scope-aware core/full loading + shared-cache/in-flight dedupe exist; some scoped Topic/Lesson/Library reads are not yet paginated, so production payload scale remains to be measured | PARTIAL — isolated behavior verified; production payload/bandwidth scale NOT PROVEN |
| Users/Groups/Memberships | آلاف/مئات المدارس | scope/roster/report؛ School Teacher workspace؛ School Director delegation/roster؛ interactive-video resume | `schoolTeacherWorkspace` يجمع memberships النشطة ثم assignments محدودة بالمدارس ويتحقق من `CLASS.parentId`؛ `school_admin` يقرأ memberships النشطة فقط وتطبق API permission allowlist لكل مدرسة مع admin-only audited grant/revoke؛ G10 roster bounded حتى 500؛ G11 student/class/teacher operations تتحقق من school/class scope وتحتاج permission + contract module، teacher/assignment reads محدودة 500/1000، والتعطيل قابل للاسترجاع بلا delete؛ G12 admin user page يجمع حتى 2000 active school contexts للصفحة، والنقل بين مدرستين يتحقق من permission + `SCHOOL_CORE` في المصدر والهدف ويحدّث User/Group/SchoolMembership مع audit؛ `interactiveVideoProgress` شخصية ومحدودة | PARTIAL — G8–G12 isolated HTTP/UI scope proven; cross-school transfer is sequential multi-document and production concurrency/scale NOT PROVEN |
| Notifications | نمو مستمر | unread/me/stream/campaigns | indexed delivery + Redis fan-out + SSE with one initial unread-count DB read; no continuous per-user Mongo polling. Batch 9 must remove silent >500-recipient truncation, bulk weekly authority/idempotency reads, and canonicalize audiences | PARTIAL — realtime foundation verified; campaign/authority scale open |
| Reports/Exports | ثقيلة ومتكررة | school/class/student/export | G11 يعيد استخدام bounded raw School Intelligence ويصدر roster CSV حتى 500 طالب بعد dual gate مع audit؛ G12 قراءات Smart Classroom والتدخلات محدودة 100 سجل لكل مدرسة ولا تدمج أداء المدرسة مع التعلم الذاتي؛ queue + cached/preaggregated read models فقط عند ثبوت الحاجة | PARTIAL — G11/G12 isolated bounded report/export proven; production scale NOT PROVEN |
| ProductConfig | سجل صغير لكل deployment | bootstrap/branding/features/providers | config validated ومحدود؛ لا أسرار provider داخل payload frontend؛ cache مع invalidation واضح | NOT PROVEN |

## أسلوب مراجعة أي Query

### الاختبارات الموجهة وربط المدرسة — 2026-10-09
- المشرف يستخدم `/quizzes/results/scoped` الحالي في حالة موظفين مستقلة عن store النتائج الشخصية. الفلتر هو نطاق الخادم مع `quizId` اختياري، والترتيب `date` تنازلي، والإسقاط ملخصات دون `questionReview`، والحد 100 لكل صفحة مع حساب الإجمالي الفعلي. الصفحات الإضافية والتحديث بطلب المستخدم، دون polling جديد أو cache عام. عند فتح تقرير اختبار يرسل `includeReview=true` لنفس قارئ النطاق. تظهر رسالة تغطية جزئية إن بقيت صفحات أو كانت حدود نطاق الخادم تسمح بعينة طلاب فقط. هذا الدليل لا يثبت أحجامًا بملايين النتائج.
- قارئا مدير المدرسة overview/academic يستخدمان `schoolStudentFilter` القائم للحصول على `id/_id` فقط، ثم يجمع `schoolAssessmentAudience` أهداف المدرسة الصريحة والفصول والطلاب الموجودين بالنطاق بعلاقة OR. ترتيب القائمة `createdAt` تنازلي، وإسقاطها تعريف مختصر بحد 100؛ overview يعد المنشور فقط. لا تغيير للعضوية أو الصلاحية، ولا نسخ محتوى أو نتائج. القراءة تحمل معرفات طلاب المدرسة فقط؛ قياس الفهارس وأحجام المدارس الكبيرة لم يثبت. الاختبار المعزول يثبت التوجيه الفردي داخل المدرسة ويستبعد طالب مدرسة أخرى؛ الرحلة الفعلية تثبت 83 طالبًا في النطاق واختبارًا واحدًا.

لكل Query جديدة أو معدلة يجب تسجيل: filter، sort، projection، limit/cursor، index المتوقع، cardinality، cache key/TTL/invalidation إن وجد، وسلوكها عند ملايين السجلات.

## ممنوعات

- لا `find({})` على Collection نامية في مسار مستخدم.
- لا تحميل كل الأسئلة/النتائج ثم filter في المتصفح.
- لا تخزين صور أو فيديو Binary داخل Mongo.
- لا Cache لبيانات authenticated عامة بلا تصنيف scope.
- لا Migration لعلاقات arrays قبل backfill/dual-read/dual-write/rollback.

## قرار التنفيذ الحالي — 2026-09-01

- Phase 5 مغلقة عند حد آمن معزول فقط: controlled mirror وreconciliation وrollback مثبتة، لكن `legacy` يظل الافتراضي ولا يوجد production opt-in.
- لا يُعاد بناء `AssessmentAttempt` أو `AssessmentResponse` أو تعريف تاريخي من `QuizResult` ناقص؛ backfill التاريخي المسموح result-only بعلامة completeness.
- مرحلة Assessment Commercial Closure التالية تبدأ بإثبات الرحلات والـfailure/retry/resume، لا بتوسيع cutover أو تشغيل migration.
- School MVP يجب أن يثبت العلاقات والـscope بقراءات paginated/bounded؛ لا يُعتبر نجاح واجهة واحدة دليلًا على persistence أو RBAC.
- Reports تبقى قراءة تاريخية مستقلة عن result write path، وأي cache/preaggregation يحتاج benchmark وrollback/invalidation contract.


## Student platform/school context reports — 2026-10-10
Existing /quiz-results/my, /quizzes/results and /quizzes/results/scoped accept validated learningContext. Context predicate composes with taxonomy and existing actor scope; list projections retain origin and minimal frozen quiz metadata, without question reviews/target rosters. Personal history page size50, older pages opt-in; initial global bootstrap stays100. New individual school origin resolves verified sender school/class; no historical backfill.

- Older attempt detail: useStudentResultDetail owns a single on-demand existing protected /quiz-results/:id read with actor/request identity isolation; Results composes it. Quizzes and the source report panel link by persisted result ID. No global result hydration or history traversal.

- QuestionAttempt assessment events cannot be presumed standalone training: QuizPage records them too. StudentJourneySourcesPanel review activity uses explicit remediation/recheck/mastery_review; other loaded answered events remain visibly unclassified. No query/model/scoring change.


## New question activity provenance — 2026-10-10
QuestionAttempt additive activityType/quizId/learningContext/schoolId/classId fields: canonical quiz origin reuses verified access/assignment reads with a bounded definition projection. Existing own-user100-row reader unchanged; no new polling/history expansion.
