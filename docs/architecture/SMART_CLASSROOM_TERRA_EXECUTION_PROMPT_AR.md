# ALMEAA Smart Classroom — الأهداف وبرومبت التنفيذ لـGPT-5.6 Terra

> هذه الوثيقة جاهزة للنسخ إلى مهمة Codex تعمل بنموذج GPT-5.6 Terra.
> مصدر الحقيقة التنفيذي هو الكود الحالي، ثم `SMART_CLASSROOM_GOALS_AR.md` للحالة
> و`SMART_CLASSROOM_EXECUTION_MASTER_AR.md` للتفاصيل.

## إعداد المهمة المقترح

- Model: `GPT-5.6 Terra`.
- Reasoning: `High` في `SC-00` وطبقات الأمن/الصلاحيات، و`Medium` في الدفعات المعتادة.
- نفّذ Goal واحدة في كل مرة؛ checkpoints المجموعة داخل Goal تنفذ في PR واحد.
- لا ترسل وثائق Gemini أو المحادثات القديمة إلى النموذج؛ الملفات المرجعية المختصرة داخل المشروع تكفي.

## الأهداف المرتبة

| الترتيب | الهدف | النتيجة المطلوبة قبل الانتقال |
|---:|---|---|
| 0 | `G0 — Secure the Reused Foundation` (`SC-00`) | عزل المدارس والمعلمين في Barcode/bookings، ورفض Socket room غير المصرح، وتثبيت ADR للفصل بين التكويني والرسمي. |
| 1 | `G1 — School Identity & Commercial Access` (`SC-01A/B`) | SchoolMembership + TeachingAssignment + entitlement خادمي دون ترحيل roles أو توسيع صلاحيات legacy. |
| 2 | `G2 — Usable Smart Classroom` (`SC-02A/B`) | رحلة server + Teacher/Projector/Student كاملة وآمنة حتى التقرير. |
| 3 | `G3 — Supervisor Operations & Reports` (`SC-03`) | حصص اليوم والتاريخ وتقارير session/class/teacher داخل اللوحة الحالية. |
| 4 | `G4 — School Intelligence` (`SC-04`) | Dual-source analytics وheatmap وweak students بلا blended score أو rollup مبكر. |
| 5 | `G5 — Intervention & Proven Improvement` (`SC-05A/B`) | تدخل فعلي ثم baseline/follow-up يثبت التحسن بأدلة وحدود قابلة للضبط. |
| 6 | `G6 — Controlled Pilot & Commercial Limits` (`SC-06`) | Pilot مصرح يقيس الواقع ويثبت limits التجارية اللازمة. |

`G6` لا يبدأ دون تفويض صريح لبيئة الـPilot. كل Goal تعتمد على إغلاق السابقة بالأدلة المطلوبة.

## برومبت البداية — انسخه كاملًا إلى Terra

```text
أنت مهندس Full-stack مسؤول عن تنفيذ هدف ALMEAA Smart Classroom داخل المستودع الحالي. نفّذ العمل فعليًا حتى إغلاق الهدف المصرح به؛ لا تكتفِ بشرح أو إعادة كتابة الخطة.

CURRENT AUTHORIZED GOAL
G0 — Secure the Reused Foundation (`SC-00`) فقط.

OUTCOME
أغلق حدود الأمن وإعادة الاستخدام اللازمة قبل بناء Smart Classroom:
1. طبّق ownership/school/teacher scope على Barcode admin list/report/live-control.
2. افحص session bookings وطبّق school/teacher scope الصحيح، أو وثّق وأثبت بوضوح أنها Platform-only إذا كان هذا هو العقد الحقيقي في الكود.
3. أضف Socket handshake authentication وauthorized room-join foundation بحيث لا يستطيع مستخدم دخول room لمدرسة/فصل/جلسة خارج نطاقه.
4. أضف ADR واضحًا: ClassroomResponse حدث formative مستقل، ولا ينشئ QuizResult رسميًا تلقائيًا.
5. حافظ على public Barcode journey والعقود الحالية المتوافقة.

SOURCE OF TRUTH AND READING BUDGET
ابدأ بقراءة هذه المصادر فقط، بهذا الترتيب:
1. AGENTS.md.
2. .codex/skills/almeaa-goal-delivery/SKILL.md كاملًا، ثم ملف delivery-invariants المشار إليه لأنه هدف معماري/أمني.
3. docs/architecture/MAIN_INTEGRATION_CHECKPOINT_AR.md.
4. docs/architecture/SMART_CLASSROOM_GOALS_AR.md.
5. docs/architecture/SMART_CLASSROOM_AGENT_ENTRY_AR.md.
6. قسم SC-00 فقط من docs/architecture/SMART_CLASSROOM_EXECUTION_MASTER_AR.md.
7. أحدث قسم Smart Classroom فقط من docs/architecture/CODEX_EXECUTION_STATE.md.
8. Git HEAD/status وآخر 5 commits، ثم الملفات والمسارات والاختبارات المتأثرة مباشرة فقط.

الكود الحالي هو مصدر الحقيقة عند اختلاف وثيقة قديمة معه. لا تقرأ SMART_CLASSROOM_MASTER_SPEC_AR.md أو محادثات Gemini/ChatGPT القديمة، ولا تبدأ audit شاملًا للمستودع.

STARTING REPORT
قبل أول تعديل، أعطني تقريرًا قصيرًا بهذه العناوين ثم واصل التنفيذ في نفس المهمة دون انتظار موافقتي:
CURRENT STATE
VERIFIED
REAL GAPS
BLOCKERS
PURPOSE
REUSE
TOUCHED FILES
RISKS
EXIT EVIDENCE

IMPLEMENTATION CONSTRAINTS
- استخدم الموجود أولًا: User وGroup SCHOOL/CLASS وQuestion Bank وQuiz/QuizResult وSupervisorDashboard وSchoolsManager وB2B/Access وSocket.io/Redis.
- حافظ على modular monolith. لا microservices، ولا tenantId عالمي، ولا Users/Question Bank/Quiz engine/School system موازٍ، ولا rewrite للوحة المشرف، ولا role migration كبيرة.
- لا تغيّر public API contracts أو scoring أو payments أو production data/cutover خارج التفويض الصريح لهذا الهدف.
- كل policy يجب أن تكون fail-closed وألا توسع صلاحية legacy account.
- لا تعتمد على إخفاء عناصر UI كحماية؛ طبّق الصلاحية في API وSocket.
- لا ترسل correct answer للطالب قبل إغلاق/كشف السؤال في المراحل اللاحقة.
- حافظ على تغييرات المستخدم غير المملوكة في working tree. لا تستخدم git add . ولا أوامر Git مدمرة.
- لا تنشئ features من Goals لاحقة، ولا تبدأ G1 داخل هذا الهدف.
- لا تستخدم subagents لهذا الهدف إلا إذا فرضت تعليمات المستودع ذلك صراحة.

EXECUTION
اختر أصغر vertical slice يغلق SC-00. افحص الاستدعاءات والسياسات والاختبارات المرتبطة فقط، ثم عدّل الملفات اللازمة باستخدام أنماط المشروع الحالية. أثناء العمل أعطني تحديثات قليلة مرتبطة بنتيجة أو تغيير فعلي في الخطة، ولا تسرد كل tool call.

REQUIRED VERIFICATION
- اختبارات سلبية تثبت أن School A/Teacher A لا يقرأ ولا يتحكم في بيانات School B.
- اختبار يثبت رفض unauthorized Socket handshake أو room join حسب العقد المختار.
- اختبارات focused للمسارات التي تغيرت.
- الحفاظ على public Barcode journey والـschool baseline ذات الصلة.
- typecheck/build المناسب للحزم المتأثرة.
- افحص diff وgit status قبل الإغلاق.

إذا ظهر فشل قديم غير متعلق، أثبت أنه سابق وغير ناتج عن التعديل وسجله بوضوح؛ لا توسع النطاق لإصلاحه. إذا منعك قرار مالك لا يمكن استنتاجه بأمان، أكمل كل ما لا يعتمد عليه ثم اطلب أصغر قرار واحد مع الأدلة.

DEFINITION OF DONE
لا تعتبر SC-00 مكتملًا حتى:
1. ينجح Exit Evidence أعلاه.
2. تنجح الاختبارات والفحوص المناسبة أو تسجل بدقة ما تعذر ولماذا.
3. تُحدّث G0 في SMART_CLASSROOM_GOALS_AR.md وحالة SC-00 في Master وCODEX_EXECUTION_STATE.md.
4. تسجل next exact action = G1 / SC-01A + SC-01B فقط.
5. تعمل stage للملفات المملوكة بالاسم فقط، ثم focused commit وpush، ثم تتحقق من required CI على exact runtime commit وفق قواعد المستودع.

FINAL HANDOFF
قدّم تقريرًا موجزًا بالعربية يبدأ بالنتيجة ويحتوي:
VERIFIED
PARTIAL
NOT PROVEN
BLOCKED
DEFERRED
commit/branch/CI evidence
next exact action

توقف بعد إغلاق G0. لا تبدأ G1 حتى أرسله لك كهدف مصرح جديد.
```

## برومبت المتابعة بعد إغلاق كل هدف

استخدم هذا النص في المهمة التالية، واستبدل القيمتين بين الأقواس فقط:

```text
واصل تنفيذ ALMEAA Smart Classroom من الحالة المثبتة في Git والوثائق.

AUTHORIZED GOAL: [اكتب كود واسم Goal التالية، مثال: G1 — School Identity & Commercial Access]
EXPECTED EXIT: [انسخ Exit الخاص بها من SMART_CLASSROOM_GOALS_AR.md]

اقرأ AGENTS.md وalmeaa-goal-delivery skill وdelivery invariants، ثم MAIN_INTEGRATION_CHECKPOINT_AR.md وSMART_CLASSROOM_GOALS_AR.md وSMART_CLASSROOM_AGENT_ENTRY_AR.md وقسم checkpoints الحالي فقط من SMART_CLASSROOM_EXECUTION_MASTER_AR.md وحالة التنفيذ الحالية. تحقق من HEAD/status ولا تفترض أن المهمة السابقة مكتملة دون commit/CI evidence.

نفّذ Goal هذه وحدها end-to-end: assessment مختصر، reuse، code، اختبارات targeted وRBAC negative حيث يلزم، typecheck/build، diff/status، exact-files commit، push، required exact-runtime CI، تحديث Goals/Master/Execution State، ثم handoff عربي موجز. نفّذ checkpoints المجموعة دون توقف إداري، لكن لا تبدأ Goal التالية داخل نفس PR. حافظ على تغييرات المستخدم ولا تستخدم git add .. إذا لم تكن السابقة مغلقة بدليل، لا تتجاوزها؛ أصلح فقط عيب الإغلاق المرتبط مباشرة أو سجّل blocker حقيقيًا.
```

## قاعدة الاستخدام

أرسل «برومبت البداية» مرة واحدة. بعد نجاحه، أرسل «برومبت المتابعة» لكل هدف تالٍ؛ بهذه الطريقة يبقى السياق صغيرًا ويعتمد Terra على Git وملفات الحالة بدل إعادة تحميل التقرير كاملًا.
