# خارطة قبول وإغلاق Assessment Commercial Module

> آخر تحديث: 2026-09-01. هذه الخارطة هي بوابة Gate 1 في `FINAL_MASTER_PLAN_V3_AR.md`. هدفها إنهاء وحدة اختبارات قابلة للبيع، لا زيادة smokes أو تقسيم ملفات بلا أثر منتج.

## النطاق

```text
Assessment
├─ Definition
├─ Builder
├─ Question Selection
├─ Assignment
├─ Runner
├─ Sessions
├─ Attempts
├─ Responses
├─ Scoring
├─ Results
└─ Analytics
```

النماذج الوظيفية:

- **عادي/تدريب:** اختبار مادة أو مهارة ضمن رحلة الطالب.
- **محاكي:** أقسام متعددة ووقت وقواعد انتقال وتحليل قسم.
- **موجّه:** توزيع Definition عادي أو محاكي إلى جمهور وسياسة وقت/محاولات؛ ليس نوع تعريف ثالثًا.

لا تغيّر هذه الخارطة route URLs أو API payloads أو Mongo semantics أو RBAC أو scoring. `Quiz` و`QuizResult` يبقيان compatibility facades حتى cutover مستقل معتمد.

## مقياس الدليل

| الحالة | الاستخدام هنا |
|---|---|
| `VERIFIED` | HTTP/E2E/persistence/RBAC مناسب مثبت على commit وبيئة معزولة |
| `PARTIAL` | توجد تغطية حقيقية لكن رحلة أو طبقة لازمة ناقصة |
| `NOT PROVEN` | الكود أو الفكرة موجودان بلا دليل قبول كافٍ |
| `BLOCKED` | يحتاج قرار مالك أو staging أو وصولًا خارجيًا |

smoke نصي أو typecheck وحده لا يرفع Capability إلى `VERIFIED`.

## مصفوفة الإغلاق الحالية

| Capability | الحالة | الدليل الحالي | فجوة الخروج |
|---|---|---|---|
| Definition/versioning | `PARTIAL` | definition adapter و`AssessmentVersion` واختبارات نشر/قراءة معزولة | رحلة UI تثبت create/edit/publish/version preservation |
| Builder | `PARTIAL` | guards واختبارات عامة وواجهات قائمة | E2E مخصص للإنشاء/المعاينة/النشر ورسائل validation |
| Question Selection | `PARTIAL` | missing/invalid/duplicate normalization ونطاق المعلم مثبت HTTP | UI pagination/selection preservation في الرحلة الخامسة |
| Assignment/access | `PARTIAL` | directed access ورفض cross-school/class مثبت HTTP | UI موجه كامل، limit/window/error states |
| Runner | `PARTIAL` | submit authority وE2E عام | رحلة عادي + محاكي مخصصة، refresh/reconnect وloading/error states |
| Sessions | `NOT PROVEN` كجلسة خادمية مكتملة | `LiveExamSession` مراقبة فقط؛ foundation additive موجود | server start/resume/expiry/section lock policy مثبتة |
| Attempts | `PARTIAL` | model/foundation وidempotent submission mirror معزول | lifecycle جديد للمحاولات الموجهة/المحاكي دون production opt-in |
| Responses | `PARTIAL` | model/foundation additive | autosave/retry/resume persistence معزول وعدم فقد الإجابة |
| Scoring | `VERIFIED` للعقد legacy الحالي | server-result authority وHTTP/CI guards | parity فقط عند أي reader/write migration؛ لا تغيير policy |
| Results | `PARTIAL` | compatible direct readers وhistorical fallback وrollback مثبتة معزولًا | focused UI result/history، والقارئ الجديد ليس production default |
| Analytics | `PARTIAL` | section analytics/scoped reports مثبتة في harness | فصل Result/Report وstudent/class/school evidence وexports |

## الدليل الموجود الآن

| الطبقة | الدليل | الحد |
|---|---|---|
| عقود المصدر | `smoke:assessment-*` و`smoke:quiz-*` | guards مساعدة؛ لا تثبت رحلة مستخدم |
| HTTP معزول | `server/src/scripts/backendIntegrationGate.ts` وتشغيلات CI المسجلة في `CODEX_EXECUTION_STATE.md` | يثبت normal/directed/mock/scoping/history/mirror/reconciliation/rollback على Mongo مؤقت، لا production scale |
| E2E معزول عام | `platform-v3-deep-premerge-e2e-gate.yml`؛ آخر HEAD مدرسي `26f615e1` نجح في `33465513152` | يثبت سلامة المنصة العامة، لا يربط الرحلات الخمس بندًا بندًا |
| قراءة ضغط محدودة | bounded CI read checks | ليست شهادة Render/Atlas أو 100/500/1000 مستخدم |

## خطة التنفيذ السريعة

لن نفتح Refactor مستقل لكل جزء. كل Batch التالية تغلق رحلة رأسية وتجمع UI + API + persistence + RBAC + حالات الواجهة.

### ACC-01 — Evidence freeze and fixture map

- تثبيت fixtures deterministic: admin، teacher، school/class supervisor، target/outside students، school/class/path/subject.
- ربط كل خطوة في الرحلات الخمس بالـselector/API/model/evidence الحالي.
- عدم كتابة test جديد لما هو مثبت بالفعل.

دليل الخروج: matrix بلا خانة مجهولة، وأول فجوة تنفيذ محددة. هذا هو أول Batch بعد `PLAN-01`.

### ACC-02 — Normal + directed sellable journey

رحلتان في Batch واحدة مترابطة:

1. Admin/teacher ينشئ تعريفًا عاديًا، يختار أسئلة عبر الصفحات، يعاين وينشر.
2. يوجه الاختبار داخل النطاق؛ target يراه ويبدأ ويرسل، outsider لا يراه ولا يفتحه بالرابط.
3. النتيجة من الخادم، history صحيح، limit/window ورسائل loading/error/success ظاهرة.

دليل الخروج: Playwright + isolated HTTP على نفس commit، مع DB assertions وRBAC rejection.

### ACC-03 — Mock session, resume and failure safety

1. محاكي متعدد الأقسام مع وقت وقفل انتقال وسياسة انتهاء موثقة.
2. server-started attempt للمحاكي/الموجه، autosave response، refresh/reconnect، retry آمن.
3. فشل الكتابة الجديدة لا يكرر legacy result؛ reconciliation يكتشف الفجوة؛ rollback يعيد القراءة القديمة.

دليل الخروج: failure injection + retry/idempotency + resume E2E/HTTP على Mongo معزول. لا production dual-write.

### ACC-04 — Results, analytics and historical compatibility

- Result لمحاولة واحدة: summary/review/skills/history/next action.
- Analytics/Reports: section/skill/student scope بلا تغيير scoring.
- تعريف/نتيجة legacy ناقصة تظل قابلة للقراءة.
- direct readers enable/fallback/rollback، مع bounded queries ومنع N+1.

دليل الخروج: parity/RBAC/history E2E + HTTP، وquery evidence مناسب.

### ACC-05 — Assessment completion report

لا كود جديد. يجمع:

- كل Capability وحالتها النهائية.
- Changed files/architecture/product impact.
- test runs وCI URLs وcommit range.
- dual-write/reconciliation/rollback outcome.
- المخاطر والاستثناءات والـproduction opt-in decision.

لا تُغلق Gate 1 إذا بقيت Capability أساسية `NOT PROVEN` أو رحلة حرجة `PARTIAL` بلا استثناء صريح.

## الرحلات الخمس الإلزامية

1. مدير ينشئ تدريبًا، يختار أسئلة، يعاين وينشره في المادة.
2. طالب يبدأ من Learning Space، يرسل، يرى نتيجة الخادم والعودة/next action.
3. مدير ينشئ محاكيًا متعدد الأقسام؛ الطالب يلتزم بالوقت والقفل ويرى الإجمالي والأقسام.
4. معلم/مشرف يوجه داخل النطاق؛ المستهدف يقبل والخارجي يرفض في UI والرابط المباشر.
5. تحديث تعريف منشور ينشئ version ويحافظ على settings/sections/selected questions خارج الصفحة الأولى.

## بوابة كل Batch

- Typecheck/build/server checks المناسبة.
- Focused smoke contracts كحارس مساعد.
- HTTP حقيقي على Mongo معزول عندما يمس backend/data.
- Playwright معزول عندما يمس رحلة UI.
- Architecture gate و`git diff --check`.
- CI على نفس commit قبل رفع الحالة إلى `VERIFIED`.

## قواعد غير قابلة للتفاوض

- لا live test أو load test ضد production، ولا حسابات أو أسرار حقيقية.
- لا production opt-in للـmirror أو compatible reader ضمن هذه الخارطة.
- لا historical `AssessmentAttempt/Response/Version` reconstruction من بيانات ناقصة.
- لا تغيير scoring/RBAC/API contract لصناعة اختبار أخضر.
- لا session migration أو legacy retirement بلا قرار منفصل وخطة rollback.
- اختبار السعة الحقيقي `BLOCKED` حتى تتوفر staging شبيهة بالإنتاج وتفويض تشغيلي.

## معيار الإغلاق التجاري

Assessment يصبح قابلًا للبيع عندما تمر الرحلات الخمس على نفس release candidate، ويثبت كل مسار UI + API + persistence + RBAC + failure states، ويصدر ACC-05. النجاح المعزول لا يساوي production cutover أو scale certification.
