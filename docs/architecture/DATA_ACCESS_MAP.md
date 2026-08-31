# ALMEAA — Data Access Map

هذه خريطة تصميم وتشغيل، وليست تصريحًا بأن كل أحجام التوسع مثبتة.

| البيانات | النمو المتوقع | القراءات الساخنة | السياسة الحالية/المطلوبة | الحالة |
|---|---|---|---|---|
| Questions + image references | 80k–500k+ | filters/skill/type/search | server pagination، projection، indexes، media خارج Mongo | PARTIAL |
| Quiz/Assessment definitions | آلاف | builder/access/assignment | `AssessmentVersion` immutable additive؛ reader يرجع للـlegacy عند الغياب؛ النسخ التاريخية لا تعدّل | PARTIAL |
| Attempts/Responses/Results | ملايين | student result/report/submit | `submissionKey` idempotency، response per attempt/question، mirror opt-in للموجه/المحاكي، cursor-bounded reconciliation؛ direct result reads batch-load compatible projections behind per-assessment rollback flag؛ historical backfill result-only only | PARTIAL — isolated Mongo proven, production scale NOT PROVEN |
| Skills/mastery | ملايين تاريخيًا | student/class skill trend | projections/read models بعد benchmark | NOT PROVEN |
| Courses/Lessons/Videos | مئات المناهج وعشرات آلاف الفيديو | catalog/player/progress | route-scoped loading، CDN/storage adapter | PARTIAL |
| Users/Groups/Memberships | آلاف/مئات المدارس | scope/roster/report | pagination؛ تقييم arrays الكبيرة | PARTIAL |
| Notifications | نمو مستمر | unread/me/stream | indexed delivery، Redis fan-out، no per-user Mongo polling | P0 |
| Reports/Exports | ثقيلة ومتكررة | school/class/student/export | queue + cached/preaggregated read models عند ثبوت الحاجة | NOT PROVEN |

## أسلوب مراجعة أي Query

لكل Query جديدة أو معدلة يجب تسجيل: filter، sort، projection، limit/cursor، index المتوقع، cardinality، cache key/TTL/invalidation إن وجد، وسلوكها عند ملايين السجلات.

## ممنوعات

- لا `find({})` على Collection نامية في مسار مستخدم.
- لا تحميل كل الأسئلة/النتائج ثم filter في المتصفح.
- لا تخزين صور أو فيديو Binary داخل Mongo.
- لا Cache لبيانات authenticated عامة بلا تصنيف scope.
- لا Migration لعلاقات arrays قبل backfill/dual-read/dual-write/rollback.
