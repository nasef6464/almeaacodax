# ALMEAA — TUTOR-X Agent / Developer Entry

**الحالة:** READ FIRST — PLAN ONLY  
**Canonical Plan:** `docs/architecture/TUTOR_X_PLATFORM_INTEGRATION_MASTER_PLAN_AR.md`

إذا كنت مطورًا أو Agent وتريد العمل على المعلم الذكي/الصوت الحي/جاهزية قياس في ALMEAA:

1. لا تبدأ من المحادثات أو من وثيقة فرعية وحدها.
2. اقرأ `AGENTS.md` ثم `.codex/skills/almeaa-goal-delivery/SKILL.md`.
3. اقرأ:
   - `CODEX_EXECUTION_STATE.md`
   - `CURRENT_DIRECTORY_AND_MODULE_MAP.md`
   - `DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`
4. اقرأ:
   - `TUTOR_01_PERSONAL_AI_TUTOR_MASTER_PLAN_AR.md`
   - `TUTOR_V01_STUDENT_LIVE_VOICE_PLAN_AR.md`
5. ثم اعتبر:
   **`TUTOR_X_PLATFORM_INTEGRATION_MASTER_PLAN_AR.md` هو المرجع التنفيذي/المعماري الحاكم.**

## الوضع الحالي

- لا Runtime implementation مطلوب الآن.
- لا تعدل `main` بسبب هذه الخطة.
- لا تقفز إلى Realtime Voice.
- أول Gate عند بدء التنفيذ مستقبلًا:
  **TUTOR-G00 — Architecture & Resource Baseline**.

## قواعد مختصرة لا تُكسر

- Modular Monolith.
- no Big-Bang rewrite.
- لا تضخم `ai.routes.ts`, `Results.tsx`, `Dashboard.tsx`, `useStore.ts`.
- heavy voice/3D/notebook libraries lazy-loaded.
- media bytes خارج Node/API JSON.
- AI context محدود، لا full student history.
- token/usage budgets قبل billable calls.
- AI لا يغير scoring/mastery ولا يحسب Qiyas prediction.
- Qiyas prediction يأتي من deterministic/calibrated engine مع confidence.
- كل Bandwidth/Scale claim يحتاج قياسًا.
- حافظ على العقود الحالية إلا بتغيير versioned ومصرح.

## الوثائق

- Product vision: `TUTOR_01_PERSONAL_AI_TUTOR_MASTER_PLAN_AR.md`
- Live voice + Qiyas feature detail: `TUTOR_V01_STUDENT_LIVE_VOICE_PLAN_AR.md`
- Canonical platform integration/resource plan: `TUTOR_X_PLATFORM_INTEGRATION_MASTER_PLAN_AR.md`
