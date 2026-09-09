# ALMEAA Smart Classroom — Agent Entry

> هذا هو المدخل المختصر لأي Agent. لا تعد بناء الخطة ولا تعمل audit شاملًا.

## اقرأ بهذا الترتيب

1. `AGENTS.md`.
2. `docs/architecture/MAIN_INTEGRATION_CHECKPOINT_AR.md`.
3. `docs/architecture/SMART_CLASSROOM_GOALS_AR.md` لمعرفة Current Goal وحالته.
4. هذا الملف.
5. قسم Goal/checkpoints الحالي فقط من `SMART_CLASSROOM_EXECUTION_MASTER_AR.md`.
6. أحدث قسم Smart Classroom في `CODEX_EXECUTION_STATE.md` وآخر 5 commits والملفات/الاختبارات المتأثرة فقط.

## الحقيقة الحالية

- Runtime base عند اعتماد الخطة: `main@9cf72176059e09466335f6d6ff20b51b43969e61`؛ تحقق من HEAD ولا تفترض بقاءه.
- Gates 1–6 مغلقة ولا تعاد.
- G0 / SC-00 مغلق بدليل CI مركّز على `c87e7b3e`; Deep E2E لم يكتمل بسبب حد الزمن.
- Current Goal: `G5 — Intervention & Proven Improvement` (`SC-05A + SC-05B`); G0–G4 مغلقة بدليلها المسجل في سجل الأهداف.
- Gemini V2 وCodex vision السابق reference فقط؛ Master V3 هو القرار النهائي.

## North Star

`ASSESS → DETECT → INTERVENE → MEASURE IMPROVEMENT`

Smart Classroom formative، منفصل عن formal QuizResult.

## ثوابت

- User واحد، Group SCHOOL/CLASS الحالي، Question Bank وQuiz engines الحالية.
- لا rewrite ولا tenantId ولا microservices ولا role migration كبيرة.
- لا correct answer للطالب قبل reveal.
- لا room join دون auth + school/class/session authorization.
- Session Participation ليست حضورًا مدرسيًا رسميًا.
- لا blended score بين School وPlatform.
- لا rollup قبل benchmark.
- Projector aggregate بلا أسماء افتراضيًا.

## بروتوكول العمل

قبل التعديل اكتب باختصار:

```text
CURRENT STATE
VERIFIED
REAL GAP
BLOCKERS
PURPOSE
REUSE
TOUCHED FILES
RISKS
EXIT EVIDENCE
```

نفذ Goal واحدة كاملة؛ checkpoints المجموعة داخلها لا تحتاج توقفًا إداريًا:

```text
code
→ targeted tests
→ typecheck/build المناسب
→ diff/status
→ exact-files commit
→ push
→ required exact-runtime CI
→ docs/ledger update
→ handoff
```

لا تبدأ Goal تالية داخل PR الحالي. لا تستخدم `git add .`. لا تغيّر production data
أو RBAC/scoring/payments خارج التفويض.

## G0 / SC-00 المختصر

- scope Barcode admin list/report/live-control لكل Teacher/Supervisor.
- scope session bookings أو تثبيتها Platform-only.
- socket handshake auth وauthorized room join foundation.
- ADR يثبت ClassroomResponse formative منفصلًا عن QuizResult.
- negative School A/B tests.
- الحفاظ على public Barcode journey والـbaseline الحالية.

بعد الإغلاق حدّث `SMART_CLASSROOM_GOALS_AR.md` وصف `SC-00` في Master V3
و`CODEX_EXECUTION_STATE.md`، وسجل next exact action: `G1 / SC-01A + SC-01B` فقط.
