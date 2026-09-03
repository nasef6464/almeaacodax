# ALMEAA — Data Access Map

هذه خريطة تصميم وتشغيل، وليست تصريحًا بأن كل أحجام التوسع مثبتة.

| البيانات | النمو المتوقع | القراءات الساخنة | السياسة الحالية/المطلوبة | الحالة |
|---|---|---|---|---|
| Questions + image references | 80k–500k+ | filters/skill/type/search | server pagination، projection، indexes، media خارج Mongo | PARTIAL |
| Quiz/Assessment definitions | آلاف | builder/access/assignment | `AssessmentVersion` immutable additive عند النشر وتعديل المنشور؛ reader يرجع للـlegacy عند الغياب؛ النسخ التاريخية لا تعدّل | PARTIAL — isolated create/PATCH/version-read proven; production cutover NOT PROVEN |
| Attempts/Responses/Results | ملايين | student result/report/submit | `submissionKey` idempotency، response per attempt/question، mirror opt-in للموجه/المحاكي، cursor-bounded reconciliation؛ أسطح النتيجة المباشرة فقط تقرأ compatibility projection خلف rollback flag (القوائم ببحثين batch ثابتين، و`latest` ببحث مفرد)؛ أما analytics/reports/AI/notifications فتبقى `QuizResult` legacy لارتباطها بمقاييس مشتقة؛ historical backfill result-only only | PARTIAL — isolated Mongo proven, production scale NOT PROVEN |
| Skills/mastery | ملايين تاريخيًا | student/class skill trend | projections/read models بعد benchmark | NOT PROVEN |
| Courses/Lessons/Videos | مئات المناهج وعشرات آلاف الفيديو | catalog/player/progress | route-scoped loading، CDN/storage adapter | PARTIAL |
| Subject Learning Space bootstrap | scoped path/subject content | student entry + manager placement | bounded taxonomy/content bootstrap؛ لا تحميل عالمي غير محدود؛ cache scope-aware | VERIFIED على isolated UI/API evidence |
| Users/Groups/Memberships | آلاف/مئات المدارس | scope/roster/report | pagination؛ تقييم arrays الكبيرة | PARTIAL |
| Notifications | نمو مستمر | unread/me/stream | indexed delivery، Redis fan-out، no per-user Mongo polling | P0 |
| Reports/Exports | ثقيلة ومتكررة | school/class/student/export | queue + cached/preaggregated read models عند ثبوت الحاجة | NOT PROVEN |
| ProductConfig | سجل صغير لكل deployment | bootstrap/branding/features/providers | config validated ومحدود؛ لا أسرار provider داخل payload frontend؛ cache مع invalidation واضح | NOT PROVEN |

## أسلوب مراجعة أي Query

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
