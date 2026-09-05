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
| Definition/versioning | `VERIFIED` ضمن MVP المعزول | Manager UI create/publish/edit/reload، version 1→2، حفظ السؤال والإعداد وقراءة الطالب على `038255fb` | لا production cutover أو historical reconstruction |
| Builder | `VERIFIED` ضمن MVP المعزول | Deep audit ينشئ/ينشر ويعيد فتح تعريف موجّه عبر `UnifiedQuizBuilder` على `038255fb` | validation edge states غير الأساسية تؤجل وفق الاستخدام |
| Question Selection | `VERIFIED` ضمن MVP المعزول | 101 fixture مؤقت، اختيار من الصفحة 1 و2، نشر ثم edit/reload يحفظ الاختيارين في Deep `33688377731` على `d2298993` | filtering/import bulk UX مؤجل وفق الاستخدام |
| Assignment/access | `VERIFIED` ضمن MVP المعزول | directed target UI/submission ورفض outsider/direct URL، مع guards HTTP للنطاق | limit/window/error presentation التفصيلي مؤجل وفق الاستخدام |
| Runner | `VERIFIED` للرحلات العادي/الموجّه/المحاكي المعزولة | Deep E2E وBackend CI على `47dabd68` | loading/error تفصيلي ونتيجة/history يدخلان ACC-04 |
| Sessions | `VERIFIED` ضمن الـMVP المعزول | server start/resume/expiry ورفض التقدم بعد الانتهاء مثبتان | لا ادعاء production-scale أو production cutover |
| Attempts | `VERIFIED` ضمن الـMVP المعزول | lifecycle موجّه/محاكي، retry idempotent وfinalization/reconciliation مثبتة | لا production opt-in |
| Responses | `VERIFIED` ضمن الـMVP المعزول | autosave ثم resume لإجابتين وretry آمن مثبتان | لا reconstruction تاريخي لبيانات ناقصة |
| Scoring | `VERIFIED` للعقد legacy الحالي | server-result authority وHTTP/CI guards | parity فقط عند أي reader/write migration؛ لا تغيير policy |
| Results | `VERIFIED` ضمن MVP المعزول | fresh result/review، summary آمن للصف التاريخي الناقص، وقرّاء compatibility bounded/rollback | history بصري شامل لكل شكل legacy مؤجل؛ القارئ الجديد ليس production default |
| Analytics | `VERIFIED` للـMVP الأساسي | تحليل section/skill scoped، manager section analytics، وSkill Progress/weakness actions | student/class/school reports وexports منفصلة إلى Goal Results/Reports |

## الدليل الموجود الآن

| الطبقة | الدليل | الحد |
|---|---|---|
| عقود المصدر | `smoke:assessment-*` و`smoke:quiz-*` | guards مساعدة؛ لا تثبت رحلة مستخدم |
| HTTP معزول | `server/src/scripts/backendIntegrationGate.ts` وتشغيلات CI المسجلة في `CODEX_EXECUTION_STATE.md` | يثبت normal/directed/mock/scoping/history/mirror/reconciliation/rollback على Mongo مؤقت، لا production scale |
| E2E معزول عام | `platform-v3-deep-premerge-e2e-gate.yml`؛ `d2298993` نجح في `33688377731` | يثبت الرحلات الخمس، autosave/resume/retry، وبقية سلامة المنصة على Mongo معزول |
| قراءة ضغط محدودة | bounded CI read checks | ليست شهادة Render/Atlas أو 100/500/1000 مستخدم |

## خطة التنفيذ السريعة

لن نفتح Refactor مستقل لكل جزء. كل Batch التالية تغلق رحلة رأسية وتجمع UI + API + persistence + RBAC + حالات الواجهة.

### ACC-01 — Evidence freeze and fixture map

- تثبيت fixtures deterministic: admin، teacher، school/class supervisor، target/outside students، school/class/path/subject.
- ربط كل خطوة في الرحلات الخمس بالـselector/API/model/evidence الحالي.
- عدم كتابة test جديد لما هو مثبت بالفعل.

دليل الخروج: matrix بلا خانة مجهولة، وأول فجوة تنفيذ محددة. هذا هو أول Batch بعد `PLAN-01`.

#### خريطة الأدلة المجمدة — 2026-09-01

| الرحلة | UI public entry | API/نموذج الحقيقة | الدليل القائم | الحالة/الفجوة |
|---|---|---|---|---|
| 1. إنشاء عادي واختيار/نشر | `QuizzesManager` → `UnifiedQuizBuilder` → `SmartQuestionSelector` | `POST /quizzes`؛ `QuizModel` مع `AssessmentVersion` compatibility projection | Deep `33688377731`: 101 fixture، اختيار page 1+2، publish/edit/reload | `VERIFIED` للـMVP المعزول. |
| 2. طالب يبدأ ويرسل ويرى النتيجة | `pages/Quizzes.tsx` / Learning Space → `QuizPage.tsx` → `Results.tsx` | `POST /quizzes/:id/submit` → `QuizResultModel` ثم controlled Assessment mirror | submit/scoring/history HTTP وfresh review E2E؛ Deep `33688377731` | `VERIFIED` للـMVP المعزول؛ exhaustive legacy visual variants مؤجلة. |
| 3. محاكي متعدد الأقسام | `UnifiedQuizBuilder(kind=mock)` → `QuizPage` → manager preview | `QuizModel.mockExam`، `QuizResult.sectionResults`، models additive للجلسات/المحاولات | Backend + Deep E2E على `47dabd68` و`9bf273f1` | `VERIFIED` للـMVP المعزول: start/resume/autosave/retry/expiry ونتيجة قسمين؛ ومدير مستقل يرى المحاكي الحديث وتحليل أقسامه بعد reload. |
| 4. توجيه داخل النطاق | step 4 في `UnifiedQuizBuilder` → `student-directed-tests` → direct runner | `targetGroupIds/targetUserIds`، access policy في quiz routes و`QuizModel` | target UI/submission ورفض outsider/direct URL في Deep؛ cross-school/class rejection HTTP | `VERIFIED` للـMVP المعزول. |
| 5. تحديث المنشور وحفظ الاختيار/الإعدادات | edit facade `QuizzesManager` → `UnifiedQuizBuilder` | `PATCH /quizzes/:id`، `AssessmentVersion` وlegacy facade | page 1+2 selection ثم publish/edit/reload وversion reader في Deep `33688377731` | `VERIFIED` للـMVP المعزول. |

**Fixture map:** تستخدم بوابة CI المعزولة مستخدمي `ROLE_ADMIN` و`ROLE_STUDENT` و`ROLE_PARENT`، ومجموعة فعلية للطالب من `GET /auth/me` و`GET /content/bootstrap?scope=full`. ينشئ audit الرحلة التجارية 101 سؤالًا approved scoped لإثبات الصفحة الثانية، وينظفها مع الـassessment المؤقت في `finally`. لا تُنشأ أو تُحذف أي بيانات خارج Mongo المعزول.

**أول فجوة حقيقية:** لم يكن هناك دليل تشغيل متصل يربط Builder/selector/assignment/runner/result في نفس التغيير. ليست فجوة API أو scoring؛ لذلك ACC-02 يبدأ بهذا الـaudit دون تعديل العقود أو قواعد الأعمال.

### ACC-02 — Normal + directed sellable journey

رحلتان في Batch واحدة مترابطة:

1. Admin/teacher ينشئ تعريفًا عاديًا، يختار أسئلة عبر الصفحات، يعاين وينشر.
2. يوجه الاختبار داخل النطاق؛ target يراه ويبدأ ويرسل، outsider لا يراه ولا يفتحه بالرابط.
3. النتيجة من الخادم، history صحيح، limit/window ورسائل loading/error/success ظاهرة.

دليل الخروج: Playwright + isolated HTTP على نفس commit، مع DB assertions وRBAC rejection.

**الحالة:** `VERIFIED` على commit `48a66358`. Backend Integration CI `33565698452` وDeep Pre-Merge E2E CI `33565698390` نجحا على نفس الـHEAD. أثبت الـaudit إنشاء Builder واختيار سؤال ونشر/توجيه، ظهور الاختبار للهدف، الإرسال والتصحيح وقراءة `QuizResult` من الخادم، ورفض outsider للرابط المباشر. الحفظ/الاستكمال والمحاكي متعدد الأقسام موثقون كفجوات ACC-03، والنتائج/التوافق التاريخي التفصيلي في ACC-04.

### ACC-03 — Mock session, resume and failure safety

1. محاكي متعدد الأقسام مع وقت وقفل انتقال وسياسة انتهاء موثقة.
2. server-started attempt للمحاكي/الموجه، autosave response، refresh/reconnect، retry آمن.
3. فشل الكتابة الجديدة لا يكرر legacy result؛ reconciliation يكتشف الفجوة؛ rollback يعيد القراءة القديمة.

دليل الخروج: failure injection + retry/idempotency + resume E2E/HTTP على Mongo معزول. لا production dual-write.

**الحالة:** `VERIFIED` على commit `47dabd68`. Backend Integration CI `33665523965` وDeep Pre-Merge E2E CI `33665524038` نجحا على نفس الـHEAD. يثبت الـHTTP harness رفض outsider لبدء الاختبار الموجّه، إنشاء أو استعادة المحاولة، حفظ الإجابات بالتزامن، منع الحفظ بعد انتهاء الجلسة، ثم إغلاق المحاولة المتزامن مع legacy submission من دون نتيجة مكررة. ويثبت Playwright إنشاء محاكي بقسمين من Builder، حفظ إجابتين، استئنافهما، retry آمن، الإرسال، وظهور `sectionResults` في قائمة نتائج الطالب. لا production dual-write أو historical reconstruction أو production opt-in ضمن هذا الدليل.

### ACC-04 — Results, analytics and historical compatibility

- Result لمحاولة واحدة: summary/review/skills/history/next action.
- Analytics/Reports: section/skill/student scope بلا تغيير scoring.
- تعريف/نتيجة legacy ناقصة تظل قابلة للقراءة.
- direct readers enable/fallback/rollback، مع bounded queries ومنع N+1.

دليل الخروج: parity/RBAC/history E2E + HTTP، وquery evidence مناسب.

**الحالة:** `VERIFIED` للـStrong MVP المعزول. `5dfe7209` يثبت fresh result/review آمنًا، و`9bf273f1` يثبت manager section analytics، و`46eae178` يثبت version 1→2. وأغلق `d2298993` على Backend `33688377700` وDeep `33688377731` اختيار page 1+2، publish/edit/reload، normal/directed، وmock resume/retry. كما راجعنا الحلقة الموجودة Question → Skill → Result → Skill Analysis → Recommendation → Learning Content: `skillIds` مطلوبة، submission/side effects يثبتان `skillsAnalysis` و`SkillProgress`، وResults يطابق المهارة الضعيفة مع درس/فيديو/مورد/quiz منشور أو إعادة تقييم. نقر كل نوع محتوى توصية في E2E واحد، التاريخ البصري الشامل، وstudent/class/school exports هي `PARTIAL` Future Improvements وليست مانع MVP.

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
