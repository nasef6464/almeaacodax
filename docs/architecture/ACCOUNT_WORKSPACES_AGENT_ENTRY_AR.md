# ALMEAA Account Workspaces — Agent Entry

> مدخل مختصر لتنفيذ أهداف `G7–G12` من دون إعادة فحص المشروع كله.

## اقرأ بهذا الترتيب

1. `AGENTS.md`.
2. `.codex/skills/almeaa-goal-delivery/SKILL.md` كاملًا وdelivery invariants.
3. `docs/architecture/MAIN_INTEGRATION_CHECKPOINT_AR.md` إن وجد.
4. `docs/architecture/ACCOUNT_WORKSPACES_GOALS_AR.md` لمعرفة Current Goal.
5. هذا الملف.
6. قسم Goal الحالي فقط من
   `docs/architecture/PLATFORM_TRAINER_AND_SCHOOL_DIRECTOR_PLAN_AR.md`.
7. أحدث قسم Account Workspaces من `CODEX_EXECUTION_STATE.md`، ثم HEAD/status وآخر
   خمسة commits والملفات/routes/tests المتأثرة فقط.

## الحقيقة الحالية

- Smart Classroom `G0–G6` مغلق ولا يعاد تنفيذه.
- Account Workspaces `G7` إلى `G10` مغلقة؛ G10 مثبت على runtime `5bd31bb1` وCI `34459589249`.
- الهدف الحالي المفوض هو `G11 — Delegated School Operations`، ثم يستمر التفويض إلى `G12` بالتسلسل.
- Git والكود وCI evidence يتقدمون على أي وصف قديم.

## ثوابت المنتج

- `User` واحد؛ لا نظام حسابات موازٍ.
- `teacher` القديم يبقى للتوافق؛ الواجهة تميز `مدرب منصة` عن `معلم مدرسة`.
- معلم المدرسة يعتمد على SchoolMembership + TeachingAssignment.
- مدير المدرسة `school_admin` additive، وصلاحياته محددة لكل SchoolMembership.
- كل permission خادمية ومن allowlist؛ لا حماية UI فقط.
- لا global tenantId أو microservices أو role migration كبيرة.
- لا تغيير scoring أو payments أو historical/production data دون تفويض مستقل.
- لا hard delete للطلاب ولا cross-school transfer افتراضيًا.

## بروتوكول كل Goal

ابدأ بتقرير مختصر:

```text
CURRENT STATE
VERIFIED
REAL GAPS
BLOCKERS
PURPOSE
REUSE
TOUCHED FILES
RISKS
EXIT EVIDENCE
```

ثم نفذ:

```text
vertical slice
→ targeted tests + RBAC negative tests
→ typecheck/build
→ diff/status
→ exact-files commit
→ push
→ exact-runtime CI
→ goals/state update
→ handoff
```

توقف بعد كل Goal لإغلاق branch/PR وتحديث الدليل، ثم ابدأ التالية تلقائيًا ما دام
تفويض المالك الحالي لـ`G7–G12` قائمًا ولا يوجد blocker حقيقي.
