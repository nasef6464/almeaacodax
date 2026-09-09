# ALMEAA — القرار النهائي وخطة تنفيذ School OS + Smart Classroom

> الحالة: `APPROVED PRODUCT DIRECTION / IMPLEMENTATION NOT STARTED`
> النسخة: `V3 — Final Reconciled Plan`
> التاريخ: 2026-09-09
> Runtime truth at review: `main@9cf72176059e09466335f6d6ff20b51b43969e61`
> أول Goal قابل للتنفيذ بعد التفويض: `G0 / SC-00`

هذه وثيقة تخطيطية؛ لا تدعي تغيير Runtime أو Schema أو بيانات إنتاج.

## 1. ترتيب المرجعية

عند التعارض يستخدم Agent هذا الترتيب:

1. Git HEAD والكود والاختبارات الفعلية.
2. `AGENTS.md`.
3. `docs/architecture/MAIN_INTEGRATION_CHECKPOINT_AR.md`.
4. هذه الوثيقة.
5. `docs/architecture/SMART_CLASSROOM_GOALS_AR.md` للحالة وترتيب الأهداف.
6. `docs/architecture/SMART_CLASSROOM_AGENT_ENTRY_AR.md` لتشغيل الهدف الحالي.
7. `docs/architecture/CODEX_EXECUTION_STATE.md` والخرائط المتأثرة.
8. وثيقة Gemini V2 وتقرير فحص Codex السابق كمصادر تصميم ومراجعة فقط.

لا تعد `SMART_CLASSROOM_MASTER_SPEC_AR.md` مصدر التنفيذ النهائي؛ فيها قرارات تم
قبولها وأخرى تم تعديلها أدناه. ولا يستخدم
`SMART_CLASSROOM_SCHOOL_OS_PRODUCT_VISION_AR.md` لاختيار Batch بعد صدور هذه النسخة.

## 2. القرار الأقوى

نعتمد رؤية Gemini ولا ننفذها حرفيًا.

المنتج الذي نبيعه ليس «Kahoot داخل ALMEAA» ولا مجرد أسئلة Live. المنتج هو:

> **ALMEAA Smart School يجعل كل حصة قابلة للقياس، يكشف فجوات المهارات لحظيًا،
> يحولها إلى تدخلات تعليمية، ثم يثبت هل تحسن الطالب أم لا.**

North Star:

```text
ASSESS → DETECT → INTERVENE → MEASURE IMPROVEMENT
```

Smart Classroom أداة قياس تكويني داخل الحلقة، وليس المنتج كله.

## 3. ما اعتمدناه وما عدلناه

| الموضوع | قرار Gemini | القرار النهائي | السبب |
|---|---|---|---|
| الرؤية | School OS + Smart Classroom | معتمد مع جعل Intervention/Improvement القيمة العليا | أكثر إغراءً للمدرسة من التفاعل وحده |
| الحساب | حساب واحد متعدد السياقات | معتمد | يطابق User الحالي ويمنع الازدواج |
| المعلم | Teacher مدرسي مستقل منطقيًا | Context/Persona فوق `role=teacher` الحالي | لا Big Bang role migration |
| PIN | `pinCode` محفوظ | كود مؤقت، HMAC digest مفهرس، expiry وrate limit | PIN قصير قابل للتخمين ولا يخزن كنص دائم |
| الحضور | حضور وغياب مدرسي | `Session Participation` فقط في MVP | لا ندعي تكامل SIS أو حضورًا رسميًا |
| أسماء الطلاب | حقل دائم في Attendance | `studentId` حقيقة؛ الاسم snapshot اختياري | يمنع duplication والانحراف |
| Rollup | جدول أسبوعي/شهري من البداية | bounded read models أولًا، rollup بعد benchmark | يقلل التعقيد ويحافظ على الحقيقة الخام |
| حد الضعف | أقل من 60% | `remediationThreshold` قابل للضبط | قرار تربوي يختلف حسب المدرسة والمادة |
| الدعم | حصة Live مباشرة | Intervention متعدد الأنواع | التدريب والاختبار والمسار والواجب قد تكون أنسب |
| Projector | قد يعرض المنضمين بالأسماء | Aggregate افتراضي بلا أسماء أو صحة فردية | خصوصية الطالب |
| التصميم | Slate/Indigo كهوية | Design tokens الحالية + contrast وظيفي | لا ننشئ هوية ثانية |
| الباقات | أربع باقات ثابتة | Core + modules؛ وصفات بيع فقط | مرونة العقد والسعر |
| الجدول | نظام جدول كامل | ad-hoc/planned session أولًا؛ جدول خفيف لاحقًا | لا نحول الهدف إلى SIS |

## 4. حدود المنتج التي لا تتغير

ممنوع في هذا الهدف:

- نظام Users أو تسجيل دخول موازٍ.
- School أو Class model موازٍ لـ`Group`.
- Question Bank أو Quiz engine جديد.
- إعادة كتابة `SupervisorDashboard` أو `SchoolPortalManager`.
- قلب بيانات `role=teacher` التاريخية.
- `tenantId` عالمي أو SaaS multi-tenancy أو microservices.
- فيديو/WebRTC داخلي، دردشة، سبورة تعاونية أو gamification كبيرة.
- تغيير scoring الرسمي أو payments أو production data بلا تفويض منفصل.
- إعادة بناء سياق النتائج التاريخية بالتخمين.

نعيد استخدام:

- `User` و`Group(SCHOOL/CLASS)`.
- بنك الأسئلة والمهارات والموافقة على الأسئلة.
- `Quiz`, `QuizResult`, directed assessments وAssessment snapshots.
- `SchoolPortalManager`, `SupervisorDashboard`, `SchoolsManager`.
- `B2BPackage`, `AccessCode`, `AccessGrant` لترخيص المحتوى.
- ProductConfig لقدرات الـdeployment.
- Socket.IO + Redis كقناة fan-out بعد تأمينها.
- `Lesson` وZoom/Teams/Meet/YouTube عند Live Tutoring لاحقًا.
- report/export infrastructure الحالية.

## 5. الحالة التنفيذية الحالية

### CURRENT STATE

- Product Gates 1–6: `CLOSED / VERIFIED` عند حدود Strong MVP المسجلة.
- School OS + Smart Classroom Goal: `NOT STARTED`.
- الخطة والقرار: `APPROVED PRODUCT DIRECTION`.
- لا يوجد runtime commit أو CI أو Pilot لهذا الهدف بعد.

### VERIFIED وقابل لإعادة الاستخدام

- School Management contract: `30/30` وقت الفحص السابق.
- School Portal command contract: `16/16`.
- School RBAC contract: `4/4`.
- Reports role contract: `20/20`.
- Barcode/Public Tests contract: `42/42`.
- Barcode يملك PIN/QR/live question/projector/monitor/report كخبرة موجودة.
- Live lessons وطلب الحصة الخاصة موجودان كقدرة Platform جزئية.

هذه smokes baseline وليست إثبات Smart Classroom أو scale.

### REAL GAPS

- عضوية مدرسة صريحة ومتوافقة مع العلاقات الحالية.
- تمييز Trainer context عن School Teacher context.
- Teaching Assignment موثق: مدرسة + فصل + معلم + مادة.
- Entitlement مدرسي server-authoritative.
- Socket authentication وroom authorization.
- session state machine وإجابة idempotent واستعادة بعد الانقطاع.
- ثلاثة أسطح UX منفصلة.
- Session report وسياق رسمي منفصل للنتائج.
- School Intelligence ثم Intervention وقياس التحسن.

### BLOCKERS قبل أول حصة ذكية

- Barcode admin list/report/live-control يحتاج ownership scope مكتملًا.
- session bookings يحتاج school/teacher ownership قبل بيعه للمدارس.
- Socket يسمح حاليًا بالانضمام إلى `workspaceId` دون authorization للغرفة.

هذه فجوات تنفيذية داخل المشروع وليست انتظارًا خارجيًا. Pilot بمدرسة حقيقية
يبقى `BLOCKED` إلى أن يمنح المالك تفويض البيئة والبيانات لاحقًا.

### STRONG MVP

`SC-00` حتى `SC-05B` مع رحلة واحدة حقيقية كاملة، ثم Pilot مضبوط. العقود المالية
المتقدمة وLive Tutoring وrollups ليست شرطًا لإثبات أول قيمة.

### DEFERRED

- Billing/renewals/invoices كاملة.
- جدول مدرسي/SIS شامل وSSO.
- rollups وpreaggregation قبل benchmark.
- Live Tutoring التجاري الكامل.
- AI تنبؤي أو scoring بواسطة AI.
- Executive multi-branch BI.

## 6. خريطة المنتج

```text
ALMEAA SCHOOL OS
├─ School Core
│  └─ مدارس، فصول، حسابات، علاقات، اختبارات مدرسية، وصول
├─ Smart Classroom
│  └─ قياس تكويني حي داخل الحصة
├─ School Intelligence
│  └─ مهارات، فصول، معلمون، مصدر مدرسي مقابل تعلم فردي
├─ Intervention Center
│  └─ ضعف → إجراء → متابعة → قياس تحسن
└─ Learning Ecosystem
   └─ مسارات، دورات، تدريب، فيديو تفاعلي، دعم مباشر
```

## 7. خريطة الملكية المعمارية

| Domain | يملك | لا يملك |
|---|---|---|
| Auth | هوية User والجلسة | عضوية المدرسة أو contract module |
| Schools | Membership، TeachingAssignment، school scope | scoring أو Question definitions |
| Commerce/Contract | Modules، validity، limits، entitlement | عضوية الفصل أو نتيجة الطالب |
| Smart Classroom | Session state، participants، responses، final snapshot | Formal QuizResult أو Question authoring |
| Questions | السؤال والمهارة والموافقة | session lifecycle |
| Assessments | الاختبار الرسمي وQuizResult | formative classroom responses |
| Reports | bounded read models/export | write-side scoring |
| Interventions | evidence/action/follow-up/outcome orchestration | نسخ engines الموجودة |
| Realtime | بث state/events | source of truth أو authorization decision |

HTTP/DB هما مصدر الحقيقة. Socket يبث التغيير ولا يصبح مسار حفظ وحيدًا.

## 8. نماذج البيانات النهائية للـMVP

### `SchoolMembership`

```text
id, userId, schoolId
membershipType: student | parent | teacher | supervisor
status: invited | active | suspended | ended
academicYear?, startsAt?, endsAt?, createdBy
```

- unique `(schoolId, userId, membershipType)`.
- لا يحمل `classId` إلزاميًا؛ الفصل الحالي يبقى `Group:CLASS`.
- Student class scope يأتي من Group membership.
- Teacher class/subject scope يأتي من TeachingAssignment.
- Supervisor scope يأتي من resolver المتوافق مع العلاقات الحالية.
- يسمح للحساب أن يكون Teacher وParent في المدرسة نفسها دون hacks.

الانتقال: inventory read-only → compatibility resolver → dual-write للعمليات الجديدة
→ reconciliation → قرار authoritative منفصل. لا backfill إنتاجي تلقائي.

### `TeachingAssignment`

```text
id, schoolId, classId, teacherId, subjectId
status, startsAt?, endsAt?, createdBy
```

- unique active `(classId, teacherId, subjectId)`.
- يتحقق الخادم من المدرسة والفصل وعضوية المعلم والمادة.
- لا يمنح School Admin أو Content approval.

### `SchoolContract` — minimal first

```text
id, schoolId, contractRef
status: pending | active | suspended | expired
startsAt, endsAt
modules[]: { key, enabled, limits?, settings? }
createdBy, updatedBy, version
```

في البداية لا invoices أو renewal automation أو price engine. العقد يجيب فقط:
هل الوحدة مفعلة الآن وما حدودها؟

قاعدة الاستحقاق:

```text
ProductConfig capability
AND active SchoolContract module
AND active SchoolMembership / allowed scope
```

### `ClassroomSession`

```text
id, schoolId, classId, teacherId, subjectId
teachingAssignmentId
status: draft | lobby | live | ended | cancelled
plannedFor?, openedAt?, endedAt?
joinCodeDigest, joinCodeExpiresAt
rosterSnapshotIds[]
questionSnapshots[]
currentQuestionOrdinal, stateVersion
settings: questionLimit, revealPolicy, remediationThreshold
finalReportSnapshot?, finalizedAt?
```

- join code يستخدم keyed HMAC digest مفهرس، لا plaintext ولا hash غير قابل للبحث.
- lookup محدود بالمحاولات وexpiry قصير.
- `questionSnapshots` تحفظ تعريف الحصة على الخادم؛ projection الطالب لا يرسل correct answer.
- final report snapshot يثبت عند transition إلى `ended` ولا يعدل بعده.

### `ClassroomParticipant`

```text
sessionId, studentId
joinedAt, lastSeenAt, joinedMethod
status: joined | disconnected | completed
firstResponseAt?, answeredCount
```

- unique `(sessionId, studentId)`.
- `studentId` هو الحقيقة.
- absent = roster snapshot minus joined participants.
- نسميه Session Participation، لا حضورًا مدرسيًا رسميًا.

### `ClassroomResponse`

```text
sessionId, studentId, questionOrdinal, questionId
selectedOption, isCorrect, responseTimeMs
submittedAt, idempotencyKey, sessionStateVersion
```

- unique `(sessionId, studentId, questionOrdinal)`.
- التصحيح من snapshot على الخادم.
- إعادة الطلب تعيد نفس النتيجة ولا تكرر العدادات.

### `QuizResult.learningContext` — للأحداث الجديدة فقط

```text
kind: platform_self_study | school_assessment | legacy_unknown
schoolId?, classId?, teacherId?, assignmentId?, interventionId?
capturedAt
```

Smart Classroom formative لا ينشئ `QuizResult`. إذا تحولت متابعة لاحقة إلى اختبار
رسمي فهي `school_assessment`. البيانات القديمة `legacy_unknown` دون تخمين.

### `SchoolIntervention` — بعد School Intelligence

```text
id, schoolId, classId?, subjectId, skillId
targetStudentIds[], sourceEvidenceRefs[]
actionType: practice | quiz | path | content | assignment | support_session
actionRef?, status, assignedBy, startsAt, followUpAt
baselineWindow, followUpWindow, outcomeSnapshot?
```

يستخدم engines الحالية ولا ينسخها. `remediationThreshold` من إعداد المدرسة/المادة
أو session، وليس 60% ثابتة.

لا `StudentSkillMasteryRollup` في MVP. يعاد تقييمه فقط بعد query benchmark.

## 9. Smart Classroom MVP النهائي

```text
Teacher authenticates
→ selects an assigned class and subject
→ selects 1–10 approved MCQ/True-False questions
→ creates lobby
→ server issues short-lived PIN/QR
→ authenticated class students join
→ teacher opens one question
→ students submit idempotent responses
→ server scores and broadcasts aggregates
→ teacher closes/reveals and moves next
→ teacher ends session
→ immutable session report is finalized
```

يدعم سؤالًا واحدًا أو set حتى 10، وMCQ/True-False، وQuick Poll بلا درجة رسمية،
وreconnect واستعادة current state، وaggregate distribution وتقريرًا محدودًا.

لا يدعم essay/live grading أو anonymous school participation أو leaderboard افتراضيًا
أو official attendance/grade أو chat/games/whiteboard/video.

## 10. API وRealtime contract المقترح

الأسماء النهائية تثبت في `SC-00 ADR` بعد فحص route conventions. الاتجاه:

```text
POST /api/smart-classroom/sessions
POST /api/smart-classroom/sessions/:id/open
POST /api/smart-classroom/join
POST /api/smart-classroom/sessions/:id/questions/:ordinal/open
POST /api/smart-classroom/sessions/:id/questions/:ordinal/close
PUT  /api/smart-classroom/sessions/:id/responses/:ordinal
POST /api/smart-classroom/sessions/:id/end
GET  /api/smart-classroom/sessions/:id/state
GET  /api/smart-classroom/sessions/:id/report
```

كل commands والresponses تحفظ عبر HTTP/DB. Socket events للعرض فقط:

```text
classroom:session-state
classroom:participant-summary
classroom:question-opened
classroom:response-summary
classroom:question-closed
classroom:session-ended
```

- socket handshake مرتبط بجلسة auth الحالية.
- العميل لا يختار room id؛ الخادم يحل authorized session room.
- Projector يحصل على display capability قصيرة العمر أو جلسة المعلم.
- لا correct answer قبل close/reveal ولا أسماء على projector افتراضيًا.

## 11. UX النهائي

نبني ثلاث Experiences منفصلة، ولا نجعل صفحة واحدة تخدم الجميع.

### Teacher Control Console

- السؤال الحالي هو focal point مع `أجاب 22 من 28`.
- قائمة الطالب وحالته للمعلم فقط.
- السابق، إغلاق/كشف، التالي، إنهاء كأزرار ثابتة.
- لا widgets كثيرة، وتظهر حالات offline/reconnecting/stale بوضوح.

### Projector View

- Lobby: PIN + QR + عدد المنضمين فقط تقريبًا.
- لا Sidebar ولا Header المنصة.
- typography كبيرة وcontrast مرتفع من design tokens الحالية.
- السؤال ثم aggregate distribution والشرح بعد الكشف.
- بلا أسماء أو correct/wrong فردي افتراضيًا.

### Student Mobile Live View

- Touch-first، السؤال والخيارات وزر الإرسال فقط.
- targets كبيرة، RTL كامل، لا مشتتات المنصة.
- حالات waiting/open/submitted/closed/reconnecting/ended.

### SupervisorDashboard

لا يعاد تصميمه. تضاف تدريجيًا ثلاث نقاط فقط:

1. `الفصول الذكية اليوم`.
2. `أداء المدرسة`، وداخله Dual Analytics side-by-side.
3. `مركز التدخلات`.

## 12. التحليلات والتدخل

### Dual-source

```text
School Performance              Platform Self-study
اختبارات المدرسة               دورات وتدريب فردي
Smart Classroom responses       اختبارات شخصية
Intervention follow-up          تقدم ذاتي
```

العرض جنبًا إلى جنب، ولا blended score.

### Session report

- roster expected / joined / absent-from-session / late-to-session.
- answered/correct/wrong/unanswered لكل سؤال.
- response time distribution.
- weakest skills والأسئلة الأصعب.
- الطلاب المحتاجون مراجعة للمعلم فقط.
- actionable next step.

### Intervention Center

```text
Weak skill evidence
→ targeted students
→ practice / short quiz / path / content / assignment / support session
→ follow-up measurement
→ before vs after + evidence count + confidence label
```

لا يعلن «تحسن» من محاولة واحدة بلا minimum evidence policy. AI يلخص بيانات محسوبة
ولا يحسب score أو يصبح مصدر الحقيقة.

## 13. النموذج التجاري المغري للمدارس

المنتج يخزن Modules مرنة، بينما فريق البيع يستخدم وصفات سهلة الفهم:

- `Core Launch`: `SCHOOL_CORE + QUESTION_BANK + SCHOOL_ASSESSMENTS + BASIC_REPORTS`.
- `Smart Classroom Accelerator`: Core + `SMART_CLASSROOM + SESSION_REPORTS`.
- `Improvement & Intelligence`: السابق + `SCHOOL_INTELLIGENCE + INTERVENTION_CENTER`.
- Add-ons: `PATHS + COURSES + INTERACTIVE_VIDEO + LIVE_TUTORING + WHITE_LABEL + EXECUTIVE_ANALYTICS + INTEGRATIONS`.

العقد يمكنه تركيب أي modules مناسبة. نقاط البيع الأقوى:

- لا أجهزة خاصة؛ يعمل على شاشة الفصل وجوال الطالب.
- يستفيد من بنك أسئلة ALMEAA الحالي.
- يقيس أثناء الحصة بدل انتظار نهاية الفصل الدراسي.
- يحول الضعف إلى إجراء يمكن تتبعه.
- يثبت التحسن قبل/بعد بأدلة.
- يبدأ من Core ويتوسع دون تغيير الحسابات.

التسعير لاحقًا: base annual license + active seats + enabled modules + concurrent
smart sessions + onboarding/support. لا Billing engine في أول vertical slice.

## 14. ترتيب التنفيذ المحكوم

معرفات `SC-*` أدناه checkpoints تقنية. لتقليل زمن التسليم وإعادة القراءة وCI جُمعت
في الأهداف `G0` إلى `G6` داخل `SMART_CLASSROOM_GOALS_AR.md`:

```text
G0 = SC-00
G1 = SC-01A + SC-01B
G2 = SC-02A + SC-02B
G3 = SC-03
G4 = SC-04
G5 = SC-05A + SC-05B
G6 = SC-06 Pilot
```

كل Goal = PR واحد مركز ورحلة قيمة واحدة وExit Evidence واحد. يمكن أن يحتوي
commits صغيرة لكل checkpoint، لكن لا يحتاج انتظارًا أو final CI بين checkpointين
داخل الهدف نفسه. لا يبدأ Goal تالٍ قبل إغلاق السابق.

### `SC-00` — Security & Reuse Boundary

الحالة: `CLOSED / VERIFIED WITH FOCUSED CI`.

Purpose: تأمين الموجود الذي سيعاد استخدامه وتثبيت ADR الفصل التكويني.

Scope:

- ownership scope لـBarcode admin list/report/live-control.
- school/teacher scope لـsession bookings أو إبقاؤها Platform-only بقرار صريح.
- socket auth + authorized room join foundation.
- ADR: formative ClassroomResponse منفصل عن formal QuizResult.

Expected files: `server/src/routes/publicTests.routes.ts`،
`server/src/routes/activity.routes.ts`، `server/src/sockets/index.ts`، policies/tests وADR.

قرار التنفيذ: Barcode server-scoped عند list/live-control/report، Socket authenticated
ومقيد بغرف user/school/class المعروفة فقط، وsession bookings الحالية Platform-only
Admin-managed لغياب school/class truth. راجع `SMART_CLASSROOM_G0_SECURITY_ADR_AR.md`.

Exit: School A/Teacher A لا يقرأ أو يتحكم في School B، وunauthorized socket room
join مرفوض، وpublic Barcode journey والـbaseline تبقى متوافقة.

Evidence: runtime `c87e7b3e07eda578c4e7870fef27d32714404286`، focused smokes وBackend
Integration CI نجحت. بوابة Deep E2E ألغيت عند حدّها الزمني أثناء آخر Barcode journey؛
لا تعد دليلاً مكتملًا ولا تمنع نتيجة G0 المركزة.

### `SC-01A` — Membership Compatibility

Dependency: `SC-00` closed.

- `SchoolMembership` schema/indexes.
- fail-closed resolver يجمع الحالي والجديد دون توسيع صلاحية.
- inventory read-only + parity contract.
- لا production backfill أو authoritative cutover.

Exit: الحساب يرى Platform/School contexts الصحيحة، وكل legacy account يحتفظ بصلاحياته فقط.

### `SC-01B` — Teaching Assignment + Minimal Entitlement

Dependency: `SC-01A` closed.

- `TeachingAssignment`.
- minimal `SchoolContract` modules/validity.
- shared entitlement resolver للـAPI/socket/UI.
- Admin controls بسيطة داخل SchoolsManager دون Billing.

Exit: المعلم لا يبدأ فصلًا أو مادة غير موكلة، ومدرسة دون module ترفض server-side.

### `SC-02A` — Smart Classroom Server Slice

Dependency: `SC-01B` closed.

- Session/Participant/Response models.
- state machine وHMAC PIN lookup/rate limit.
- safe question projection/server scoring/idempotency/recovery.
- final immutable report snapshot.

Exit: HTTP integration journey كاملة بمدرستين، دون Frontend polish.

### `SC-02B` — Three Live Experiences

Dependency: `SC-02A` closed.

- Teacher Console، Projector View، Student Mobile Live View.
- authorized Socket fan-out + reconnect.

Exit: usable E2E من اختيار 1–10 أسئلة حتى التقرير على desktop/projector/mobile.

### `SC-03` — Supervisor Integration & Operational Reports

Dependency: `SC-02B` closed.

- `الفصول الذكية اليوم`، تاريخ الجلسات، وتقارير session/class/teacher.
- PDF/Excel من read model واحد.

Exit: المشرف يرى نطاقه فقط ولا تتغير إمكانيات لوحته القديمة.

### `SC-04` — School Intelligence & Dual-source

Dependency: `SC-03` closed.

- `QuizResult.learningContext` للأحداث الجديدة.
- platform vs school side-by-side.
- skill heatmap وweak students وbounded trends.
- لا rollup إلا إذا أثبت benchmark الحاجة.

Exit: لا blended score، وlegacy unknown ظاهر بصدق، وcross-school reports مرفوضة.

### `SC-05A` — Intervention Actions

Dependency: `SC-04` closed.

- `SchoolIntervention` minimal lifecycle.
- تدريب، اختبار علاجي، محتوى/مسار، واجب، أو دعم.
- reuse existing targeting/access/live lesson infrastructure.

Exit: Weak Skill → Target Students → Assigned Action مثبت end-to-end.

### `SC-05B` — Measure Improvement

Dependency: `SC-05A` closed.

- baseline/follow-up windows.
- before/after delta مع evidence counts.
- configurable threshold/minimum evidence.

Exit: المشرف يجيب «هل تحسن الطالب؟» من بيانات قابلة للتتبع، لا ادعاء AI.

### `SC-06` — Controlled Pilot & Commercial Limits

Dependency: `SC-05B` closed + owner environment authorization.

- مدرسة Pilot، فصلان على الأقل، معلمان، وسيناريو اتصال ضعيف.
- قياس latency/concurrency/write volume/reconnect.
- تثبيت limits التي أثبتت الحاجة.
- قرار schedule الخفيف وrollups وLive Tutoring بناء على الدليل.

Exit: Pilot acceptance report. لا ادعاء production scale من isolated CI.

## 15. الوقت وطريقة ضبط الإنجاز

الخطة تحتوي 6 PRs رأسية مركزة ثم Pilot. كل PR يغلق Goal قابلًا للاستخدام ويمكن
أن يحتوي commits صغيرة للـcheckpoints الداخلية.

تقدير بشري مشروط بفريق Full-stack واحد متفرغ مع QA وقرارات مالك سريعة:

| Wave | Goals | Timebox تقريبي |
|---|---|---|
| Foundation | G0 + G1 | 1.5–2.5 أسبوع |
| Usable Smart Classroom | G2 | 2–3 أسابيع |
| Supervisor + Intelligence | G3 + G4 | 1.5–2.5 أسبوع |
| Intervention + Improvement | G5 | 1.5–2.5 أسبوع |
| Pilot hardening | G6 | 1–2 أسبوع |

الإجمالي التقديري: 7.5–12.5 أسبوع عمل مركز. هذا تقدير تخطيط لا موعد مضمون؛
يتغير حسب CI والبيئة والـPilot. استخدام Agent لا يلغي زمن اختبار الرحلة والمراجعة.

قواعد منع استهلاك التوكنز والوقت:

- Agent يقرأ Goals + Entry + قسم Goal/checkpoints الحالي وملفاته فقط.
- لا يعيد audit شاملًا بعد إغلاق capability مثبتة.
- لا يشغّل final CI في منتصف التنفيذ.
- لا يطارد تحسينات خارج Exit Evidence.
- لا ينشئ أكثر من Goal في PR واحد؛ checkpoints المجموعة داخل Goal مقصودة.
- عند نجاح Exit Evidence يغلق ويسجل الخطوة التالية فقط.

## 16. بوابات كل Goal

قبل الكود:

1. HEAD/status/last 5 commits.
2. current integration checkpoint وCurrent Goal/checkpoints.
3. callers/models/routes/tests المتأثرة فقط.
4. Purpose، Existing Reuse، Touched Files، Risks، Exit Evidence.

أثناء الكود:

- additive/backward-compatible.
- UI → API → DB → RBAC → visible loading/error/success.
- negative isolation بمدرستين حيث ينطبق.
- commands idempotent وreads bounded.

بعد الكود:

- frontend/backend typecheck/build المناسب.
- focused contracts + RBAC negative + E2E proportional.
- inspect diff/status، ثم stage exact files فقط.
- focused commit/push وrequired CI على exact runtime commit.
- تحديث `SMART_CLASSROOM_GOALS_AR.md` و`CODEX_EXECUTION_STATE` والخرائط التي تغيرت ملكيتها فقط.
- completion report: VERIFIED/PARTIAL/NOT PROVEN/BLOCKED/DEFERRED.

## 17. الملفات المتوقعة حسب المجال

New MVP owners:

```text
server/src/models/SchoolMembership.ts
server/src/models/TeachingAssignment.ts
server/src/models/SchoolContract.ts
server/src/models/ClassroomSession.ts
server/src/models/ClassroomParticipant.ts
server/src/models/ClassroomResponse.ts
server/src/models/SchoolIntervention.ts               # SC-05A only
server/src/modules/schools/application/*
server/src/modules/smart-classroom/application/*
server/src/modules/smart-classroom/http/*
server/src/modules/smart-classroom/infrastructure/*
server/src/modules/school-intelligence/*              # SC-04 onward
services/apiGroups/smartClassroomApi.ts
dashboards/admin/smartClassroom/*
pages/SmartClassroomProjector.tsx
pages/SmartClassroomStudent.tsx
scripts/smoke-smart-classroom-*.mjs
scripts/live-smart-classroom-audit.mjs
```

Likely existing integration points:

```text
types.ts
App.tsx
dashboards/admin/AdminDashboard.tsx
dashboards/admin/SchoolsManager.tsx
dashboards/admin/SchoolPortalManager.tsx
dashboards/admin/SupervisorDashboard.tsx
server/src/routes/index.ts
server/src/routes/publicTests.routes.ts               # SC-00 only
server/src/routes/activity.routes.ts                  # SC-00 / later tutoring
server/src/sockets/index.ts
server/src/models/QuizResult.ts                       # SC-04 only
pages/Reports.tsx                                     # SC-04/05 only
```

لا تضع Smart Classroom داخل `content.routes.ts` أو تعيد تضخيم
`SchoolsManager.tsx`. الجديد يبدأ modular boundary من أول يوم.

## 18. مخاطر لا يجوز نسيانها

| الخطر | المستوى | القرار |
|---|---|---|
| cross-school data/socket leakage | Critical | negative tests قبل أي Pilot |
| correct answer leakage | Critical | server projection وreveal state |
| انتهاء عقد يلغي شراء طالب فردي | Critical | school entitlement منفصل عن direct purchase |
| membership migration توسع صلاحيات | High | fail-closed resolver + parity/reconciliation |
| duplicate/lost responses | High | HTTP idempotency + unique index + state version |
| reconnect يعرض سؤالًا قديمًا | High | server state endpoint + monotonic version |
| تقارير ثقيلة | High لاحقًا | bounded reads + benchmark قبل rollup |
| خلط الحضور الرسمي بالمشاركة | High تجاريًا | تسمية Session Participation |
| UI مزدحم | Medium | 3 surfaces + focal point واحد |
| feature flag Frontend-only | High | entitlement API/socket/UI مشترك |

## 19. سجل التقدم الأولي

| ID | Capability | Status | Runtime evidence | Next |
|---|---|---|---|---|
| BASE | Gates 1–6 | `VERIFIED` ضمن الحدود المسجلة | main + completion reports | Preserve |
| PLAN | Final product/architecture decision | `VERIFIED` كوثيقة فقط | هذا الملف + Goals registry | Owner chooses start |
| SC-00 | Security & reuse boundary | `NOT STARTED` | none | أول Batch |
| SC-01A | Membership compatibility | `NOT STARTED` | none | بعد SC-00 |
| SC-01B | Assignment + entitlement | `NOT STARTED` | none | بعد SC-01A |
| SC-02A | Server classroom slice | `NOT STARTED` | none | بعد SC-01B |
| SC-02B | Three live experiences | `NOT STARTED` | none | بعد SC-02A |
| SC-03 | Supervisor/reports | `NOT STARTED` | none | بعد SC-02B |
| SC-04 | Intelligence/dual analytics | `NOT STARTED` | none | بعد SC-03 |
| SC-05A | Intervention actions | `NOT STARTED` | none | بعد SC-04 |
| SC-05B | Improvement measurement | `NOT STARTED` | none | بعد SC-05A |
| SC-06 | Pilot | `BLOCKED` حتى تفويض البيئة لاحقًا | none | بعد SC-05B |

## 20. قرار البداية

الخطوة الصحيحة التالية ليست بناء الشاشات. هي تفويض `G0 / SC-00` فقط. بعد إغلاقه
ينتقل Agent إلى `G1` وفق سجل الأهداف إذا كان التفويض المستمر صريحًا.

تفويض الخطة لا يساوي تفويضًا لـproduction migration أو بيانات مدرسة حقيقية أو
تغيير payment/scoring أو شراء مزود خارجي.
