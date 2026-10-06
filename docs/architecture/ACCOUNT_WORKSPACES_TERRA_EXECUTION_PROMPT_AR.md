# ALMEAA Account Workspaces — برومبت التنفيذ لـGPT-5.6 Terra

> انسخ برومبت البداية كاملًا إلى مهمة Terra بعد إصدار أمر تنفيذ `G7`.

## ترتيب الأهداف

| الترتيب | الهدف | النتيجة قبل الانتقال |
|---:|---|---|
| 7 | `G7 — Platform Trainer Workspace` | لوحة مدرب مستقلة وcontent scope خادمي مثبت. |
| 8 | `G8 — School Teacher Workspace` | لوحة معلم مدرسة معزولة بحسب العضوية والتكليف. |
| 9 | `G9 — School Director Identity & Delegated Access` | role وmembership permissions وإدارة منح/سحب آمنة. |
| 10 | `G10 — Usable School Director Dashboard` | overview وإضافة طالب ونقله داخل المدرسة end-to-end. |
| 11 | `G11 — Delegated School Operations` | فصول/معلمون/تقارير اختيارية محكومة بالعقد والتفويض. |
| 12 | `G12 — Academic Delegation & Persona Closure` | اختبارات/Smart/تدخلات اختيارية وإغلاق رحلة الشخصيات والحساب الهجين. |

## برومبت البداية — G7

```text
أنت مهندس Full-stack مسؤول عن تنفيذ الهدف التالي في ALMEAA. نفذ العمل فعليًا حتى
إغلاق الهدف المصرح؛ لا تكتفِ بالتخطيط أو إعادة وصفه.

CURRENT AUTHORIZED GOAL
G7 — Platform Trainer Workspace (`AW-01`) فقط.

OUTCOME
حوّل Platform teacher الحالي إلى شخصية واضحة باسم «مدرب منصة» في الواجهة، مع
لوحة مستقلة ونطاق محتوى خادمي صارم بحسب managedPathIds / managedSubjectIds، من
دون تغيير role=teacher في البيانات القديمة أو التأثير في معلم المدرسة.

READING BUDGET
اقرأ بهذا الترتيب فقط:
1. AGENTS.md.
2. .codex/skills/almeaa-goal-delivery/SKILL.md كاملًا ثم delivery-invariants.
3. docs/architecture/MAIN_INTEGRATION_CHECKPOINT_AR.md إن وجد.
4. docs/architecture/ACCOUNT_WORKSPACES_GOALS_AR.md.
5. docs/architecture/ACCOUNT_WORKSPACES_AGENT_ENTRY_AR.md.
6. قسم G7/T1 فقط من PLATFORM_TRAINER_AND_SCHOOL_DIRECTOR_PLAN_AR.md.
7. أحدث قسم Account Workspaces من CODEX_EXECUTION_STATE.md.
8. HEAD/status وآخر 5 commits، ثم routes/models/callers/tests المتأثرة مباشرة.

الكود الحالي هو مصدر الحقيقة. لا تقرأ محادثات Gemini/ChatGPT أو تعمل audit شاملًا.

STARTING REPORT
قبل أول تعديل أعطني تقريرًا قصيرًا بالعناوين التالية، ثم واصل دون انتظار:
CURRENT STATE
VERIFIED
REAL GAPS
BLOCKERS
PURPOSE
REUSE
TOUCHED FILES
RISKS
EXIT EVIDENCE

REQUIRED DELIVERY
1. أبق backend role الحالي teacher للتوافق، واستخدم «مدرب منصة» كتسمية واضحة
   في مساحة المحتوى وشاشات الإدارة.
2. اجعل /instructor-dashboard مساحة مستقلة للمدرب ولا تمنحه لوحة Admin العامة.
3. افحص عمليات القراءة والكتابة الفعلية على Course/Lesson/Question/Quiz/Library،
   وأنشئ policy/service موحدة تتحقق خادميًا من managedPathIds/managedSubjectIds.
4. حافظ على اعتماد/نشر Admin حيث تتطلب السياسة الحالية ذلك.
5. لا تعرض في الواجهة المسارات أو المواد أو الأدوات الخارجة عن نطاق المدرب.
6. لا تبن School Teacher أو School Director؛ سجلهما كأهداف لاحقة.

CONSTRAINTS
- أعد استخدام User والمحتوى وQuestion Bank وQuiz الحاليين.
- لا Users system أو School system أو tenantId أو microservices أو role migration.
- لا تعتمد على UI للحماية، ولا تثق في pathId/subjectId المرسل من العميل.
- لا تغيّر scoring/payments/API public contracts/production data خارج هذا الهدف.
- حافظ على تغييرات المستخدم، لا تستخدم `git add .`، ولا تستخدم أوامر Git مدمرة.

REQUIRED EVIDENCE
- مدرب كمي يستطيع list/create/update داخل الكمي فقط.
- محاولة لفظي/تحصيلي أو محتوى مدرب آخر ترجع 403 حتى بطلب يدوي.
- Admin يظل كامل الصلاحية وسياسة المراجعة/النشر لا تنكسر.
- UI smoke يثبت اللوحة والاسم والاختيارات المسموحة فقط.
- targeted tests + typecheck + production build المناسب.
- diff/status ثم exact-files commit/push وrequired CI على exact runtime commit.

DEFINITION OF DONE
لا تغلق G7 حتى ينجح Exit Evidence في ACCOUNT_WORKSPACES_GOALS_AR.md، ثم حدّث
حالته وCODEX_EXECUTION_STATE.md وسجل next exact action = G8 فقط. حدّث maps فقط
إذا تغيرت ownership أو data-access responsibility فعليًا.

FINAL HANDOFF
قدّم تقريرًا عربيًا موجزًا بصيغة:
GOAL
STATUS
DELIVERED
VERIFIED
DEFERRED
KNOWN RISKS
TESTS / CI
COMMITS
NEXT GOAL

توقف بعد G7. لا تبدأ G8 دون أمر المالك.
```

## برومبت المتابعة

بعد إغلاق هدف، استخدم النص التالي واستبدل القيم بين الأقواس:

```text
واصل تنفيذ ALMEAA Account Workspaces من الحالة المثبتة في Git والوثائق.

AUTHORIZED GOAL: [كود واسم الهدف التالي]
EXPECTED EXIT: [Exit Evidence من ACCOUNT_WORKSPACES_GOALS_AR.md]

اقرأ AGENTS.md وalmeaa-goal-delivery skill وdelivery invariants، ثم
MAIN_INTEGRATION_CHECKPOINT_AR.md وACCOUNT_WORKSPACES_GOALS_AR.md و
ACCOUNT_WORKSPACES_AGENT_ENTRY_AR.md وقسم الهدف الحالي فقط من الخطة وأحدث حالة
تنفيذ. تحقق من HEAD/status/CI ولا تفترض إغلاق السابق بلا evidence.

نفذ هذه Goal وحدها end-to-end: assessment مختصر، reuse، vertical slice، targeted
tests وRBAC negative، typecheck/build، diff/status، exact-files commit، push،
exact-runtime CI، ثم تحديث goals/state والخرائط المتأثرة فعلًا فقط. لا تغير
scoring/payments/production data ولا تبدأ الهدف التالي في PR نفسها. حافظ على
تغييرات المستخدم ولا تستخدم `git add .`.
```
