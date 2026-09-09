# ALMEAA School OS + Smart Classroom — سجل الأهداف التنفيذي

> الحالة: `G2 IN PROGRESS`
> آخر مراجعة: 2026-09-09
> Current Goal: `G2 — Usable Smart Classroom`
> Runtime truth عند المراجعة: `main@9cf72176059e09466335f6d6ff20b51b43969e61`؛ يجب التحقق من HEAD عند البدء.

هذا الملف هو سجل الأهداف المختصر القابل للاسترجاع. القرار المعماري المفصل موجود في
`SMART_CLASSROOM_EXECUTION_MASTER_AR.md`، وتعليمات الدخول في
`SMART_CLASSROOM_AGENT_ENTRY_AR.md`.

## النتيجة التجارية

```text
ASSESS → DETECT → INTERVENE → MEASURE IMPROVEMENT
```

نبيع للمدرسة قدرة على قياس الحصة، اكتشاف فجوات المهارات، تنفيذ تدخل، وإثبات
التحسن. Smart Classroom هو أداة القياس الحي داخل هذه الدورة.

## لماذا جُمعت الخطة

تبقى معرفات `SC-*` checkpoints تقنية مفيدة، لكنها لا تحتاج تسعة توقفات إدارية.
جُمعت الأجزاء التي لا تقدم قيمة مستقلة في هدف رأسي واحد. النتيجة: ستة أهداف
تنفيذية قبل Pilot، وكل هدف يملك رحلة قابلة للاختبار وPR واحدًا مركزًا، ويمكن أن
يحتوي عدة commits صغيرة.

## الأهداف المعتمدة

| Goal | Checkpoints | النتيجة القابلة للتسليم | Exit Evidence | Status |
|---|---|---|---|---|
| `G0 — Secure the Reused Foundation` | `SC-00` | تأمين Barcode/bookings/Socket التي سيعاد استخدامها وتثبيت فصل التكويني عن الرسمي. | School A/Teacher A لا يقرأ أو يتحكم في School B، وunauthorized room join مرفوض، والـpublic Barcode baseline سليم، وADR معتمد. | `CLOSED / VERIFIED WITH FOCUSED CI` |
| `G1 — School Identity & Commercial Access` | `SC-01A + SC-01B` | الحساب الواحد يملك School context صحيحًا، والمعلم مقيد بفصل/مادة، والمدرسة مقيدة بوحدات العقد من الخادم. | legacy parity بلا توسيع صلاحيات، ورفض assignment/module غير المسموح في API وSocket، مع controls إدارية بسيطة. | `CLOSED / VERIFIED` |
| `G2 — Usable Smart Classroom` | `SC-02A + SC-02B` | رحلة واحدة تعمل: معلم يختار 1–10 أسئلة، يبدأ جلسة، طلاب مصرحون يدخلون، يجيبون، ثم يصدر تقرير ثابت عبر Teacher/Projector/Student surfaces. | HTTP + authorized realtime + reconnect + desktop/projector/mobile E2E بمدرستين، وتصحيح خادمي وإجابات idempotent بلا تسريب answer. | `IN PROGRESS` |
| `G3 — Supervisor Operations & Reports` | `SC-03` | الفصول الذكية اليوم، تاريخ الجلسات، وتقارير session/class/teacher داخل لوحة المشرف الحالية. | المشرف يرى نطاقه فقط، واللوحة القديمة لم تفقد قدراتها، وPDF/Excel يخرجان من read model واحد. | `NOT STARTED` |
| `G4 — School Intelligence` | `SC-04` | School وPlatform analytics جنبًا إلى جنب مع skill heatmap وweak students وtrends محدودة. | لا blended score، وlegacy context يظهر بصدق، وcross-school reads مرفوضة، ولا rollup دون benchmark. | `NOT STARTED` |
| `G5 — Intervention & Proven Improvement` | `SC-05A + SC-05B` | Weak Skill → Target Students → Action → Follow-up → Before/After improvement. | تدخل فعلي من نوع تدريب/اختبار/محتوى/مسار/واجب/دعم، مع evidence counts وthreshold قابل للضبط ونتيجة قابلة للتتبع. | `NOT STARTED` |
| `G6 — Controlled Pilot & Commercial Limits` | `SC-06` | Pilot حقيقي يثبت قابلية الاستخدام ويحدد limits اللازمة للعقد من القياس. | تقرير Pilot لاتصال ضعيف وتزامن وlatency/reconnect/write volume؛ لا ادعاء production scale من isolated CI. | `BLOCKED — يحتاج تفويض بيئة وبيانات Pilot بعد G5` |

## حدود لا تتغير

- User واحد وGroup SCHOOL/CLASS الحاليان؛ لا حسابات أو School system موازٍ.
- نعيد استخدام Question Bank وQuiz/QuizResult وSkillProgress والبنية المدرسية الحالية.
- Smart Classroom formative مستقل عن QuizResult الرسمي.
- Session Participation ليست حضورًا مدرسيًا رسميًا في Strong MVP.
- لا microservices أو tenantId عالمي أو role migration كبيرة أو Video/WebRTC داخلي.
- لا rollups قبل benchmark، ولا threshold تعليمي hard-coded، ولا أسماء/صحة فردية على Projector افتراضيًا.
- لا production migration أو بيانات Pilot أو تغيير scoring/payments دون تفويض صريح مستقل.

## طريقة العمل الأسرع والمحكومة

1. هدف واحد = branch/PR واحد مركز؛ الـcheckpoints داخله commits صغيرة وليست نقاط انتظار.
2. اقرأ هذا الملف وAgent Entry وقسم الهدف الحالي فقط؛ لا audit شامل ولا إعادة قراءة تقارير Gemini.
3. اكتب assessment قصيرًا ثم نفّذ مباشرة ما دام الهدف مصرحًا ولا يوجد قرار مالك حقيقي.
4. شغّل targeted tests أثناء checkpoint؛ شغّل build/final gates وCI مرة قرب إغلاق الهدف، ولا تكررها بلا تغير أو فشل جديد.
5. أغلق رحلة UI → API → DB → RBAC → states حيث ينطبق، واختبر العزل بمدرستين.
6. لا تضف تحسينًا من Goal لاحق لمجرد أنه قريب من الملف؛ سجله `DEFERRED`.
7. عند الإغلاق: diff/status، stage بالملفات المحددة، commit/push، exact-runtime CI، ثم تحديث هذا السجل و`CODEX_EXECUTION_STATE.md`.
8. لا تنتقل تلقائيًا إلى Goal جديد إلا إذا كان التفويض المستمر صريحًا. التفويض المستمر لا يشمل G6 أو production/data/payment/scoring changes.

## الاسترجاع بعد انقطاع المهمة

أي Agent جديد يستعيد العمل هكذا:

1. يقرأ `AGENTS.md` و`almeaa-goal-delivery/SKILL.md`.
2. يتحقق من Git HEAD/status وآخر خمسة commits.
3. يقرأ `MAIN_INTEGRATION_CHECKPOINT_AR.md` ثم هذا الملف.
4. يطابق Current Goal مع أحدث قسم Smart Classroom في `CODEX_EXECUTION_STATE.md`.
5. يقرأ `SMART_CLASSROOM_AGENT_ENTRY_AR.md` وقسم Goal/checkpoints الحالي فقط من Master.
6. إذا اختلفت الوثائق عن commit/CI evidence، فـGit والدليل التشغيلي هما الحقيقة ثم تُصحح الوثائق.

## سجل التقدم

يحدّث هذا الجدول فقط عند تغير حالة فعلية:

| Goal | Status | Runtime commit | CI / Evidence | Next exact action |
|---|---|---|---|---|
| `G0` | `CLOSED / VERIFIED WITH FOCUSED CI` | `c87e7b3e07eda578c4e7870fef27d32714404286` | focused smokes PASS; Backend Integration CI PASS; Deep E2E canceled by workflow time limit after all suites except final Barcode journey | begin G1 assessment only |
| `G1` | `CLOSED / VERIFIED` | `cd1cdb40244690ba85ee468f4c95505d3990f4f4` | policy smoke PASS; Backend Integration CI PASS | begin G2 assessment only |
| `G2` | `IN PROGRESS` | `d57c1376021fc2bc73385fa52c312f880f96384b` | isolated HTTP two-school lifecycle PASS داخل Backend CI [34394732870](https://github.com/nasef6464/almeaacodax/actions/runs/34394732870)؛ UI/API contract `12/12` PASS؛ Playwright surfaces audit PASS للمعلم/الطالب/العارض | إثبات reconnect ضد Socket حي ثم closure evidence |
| `G3` | `NOT STARTED` | — | — | بعد إغلاق G2 |
| `G4` | `NOT STARTED` | — | — | بعد إغلاق G3 |
| `G5` | `NOT STARTED` | — | — | بعد إغلاق G4 |
| `G6` | `BLOCKED` | — | يحتاج Pilot authorization | بعد إغلاق G5 وتفويض المالك |

## خريطة الملفات المرجعية

| الملف | وظيفته | هل يقرر التنفيذ؟ |
|---|---|---|
| `SMART_CLASSROOM_GOALS_AR.md` | الحالة، ترتيب الأهداف، والاسترجاع | نعم، للحالة والترتيب |
| `SMART_CLASSROOM_EXECUTION_MASTER_AR.md` | القرار المنتجـي والمعمار والعقود والتفاصيل | نعم |
| `SMART_CLASSROOM_AGENT_ENTRY_AR.md` | أقل سياق لازم لبدء Current Goal | نعم |
| `SMART_CLASSROOM_TERRA_EXECUTION_PROMPT_AR.md` | نص جاهز لإرسال الهدف إلى Terra | أداة تشغيل، لا يغيّر الحالة |
| `SMART_CLASSROOM_MASTER_SPEC_AR.md` | اقتراح Gemini V2 الأصلي | مرجع فقط |
| `SMART_CLASSROOM_SCHOOL_OS_PRODUCT_VISION_AR.md` | تصور Codex السابق | Superseded / مرجع فقط |

## قرار البداية

المصرح حاليًا هو تثبيت الخطة والملفات فقط. أول تنفيذ Runtime بعد أمر المالك هو
`G0 — Secure the Reused Foundation`. لا يُعد إنشاء هذه الوثائق تفويضًا لبدء الكود.
