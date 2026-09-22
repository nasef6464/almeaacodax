# ALMEAA — TUTOR-X Master Integration Plan
## الخطة التكاملية المستقلة للمعلم الذكي + الصوت الحي + جاهزية قياس

**الكود:** `TUTOR-X`  
**الحالة:** `PLANNED / DEFERRED IMPLEMENTATION` — وثيقة تنفيذ معتمدة، لا تغييرات Runtime في هذه المرحلة  
**التاريخ:** 2026-09-22  
**الفرع المرجعي:** `chatgpt/tutor-v01-student-live-voice-plan`  
**النطاق:** منصة ALMEAA / المئة التعليمية  
**النمط المعماري الملزم:** Modular Monolith — بدون Microservices وبدون Big-Bang Rewrite

> هذه هي وثيقة التكامل المرجعية لأي مطور أو Agent يريد تنفيذ منظومة المعلم الذكي لاحقًا.
> يجب قراءتها مع `AGENTS.md` و`CODEX_EXECUTION_STATE.md` و`CURRENT_DIRECTORY_AND_MODULE_MAP.md` و`DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`.
> وثيقتا `TUTOR_01_PERSONAL_AI_TUTOR_MASTER_PLAN_AR.md` و`TUTOR_V01_STUDENT_LIVE_VOICE_PLAN_AR.md` تشرحان المنتج بالتفصيل، وهذه الوثيقة تحكم **كيف يدخل المنتج إلى ALMEAA دون تكسير المعمار أو رفع الباندويث/التوكنز بلا داعٍ**.

---

# 1. القرار التنفيذي

منظومة TUTOR-X تبقى **خطة مستقلة** ولا تختلط الآن مع:
- خطة الإصلاح العامة.
- Adaptive Mastery 0–11.
- إعادة ترتيب لوحة الطالب الحالية.
- إصلاح الأسئلة والمهارات والباقات.
- Batches الأداء/النشر الجارية.

لا يبدأ تنفيذ Runtime إلا بفرع جديد من أحدث `main` بعد التأكد من حالة الدمج وقت البدء.

الهدف عند التنفيذ ليس إضافة Chatbot آخر، بل إضافة طبقة تعليم شخصية فوق الموجود:

```text
Assessment / Question Evidence
        ↓
Adaptive Mastery
"ماذا يحتاج الطالب؟"
        ↓
Tutor Profile + Tutor Orchestrator
"كيف نشرح لهذا الطالب؟"
        ↓
Text / Image / Voice / Notebook / Math Lab
        ↓
Check Understanding
        ↓
Trusted Learning Evidence
        ↓
Adaptive Mastery
```

والقاعدة:
**AI يشرح ويتفاعل؛ النظام الحتمي هو صاحب الدرجة والإتقان والجاهزية.**

---

# 2. ما الموجود بالفعل ويجب إعادة استخدامه

## 2.1 Assessment / Adaptive
نعيد استخدام ولا نكرر:
- `SkillProgress`
- `QuestionAttempt`
- quiz results / question review
- mastery readiness
- Next Best Action
- remediation / recheck
- spaced review
- mock exam history
- timeSpentSeconds
- trusted question explanation

## 2.2 AI
موجود بالفعل:
- AI provider gateway متعدد المزودين.
- budgets.
- provider fallback.
- `AiInteraction`.
- question assistant.
- trusted question context.
- cache.
- text/image support في بعض المسارات.
- student target authorization.

## 2.3 Student UI
موجود:
- `Results.tsx` ومراجعة السؤال.
- `QuestionAssistantPanel`.
- `Dashboard.tsx`.
- `MockExamStudentHub.tsx`.
- Reports/readiness UI.
- `QuestionDrawingPad`.

## 2.4 Commerce
موجود:
- memberships/packages.
- purchases/entitlements.
- payment/access flow.
- B2B package concepts.

TUTOR-X لا ينشئ نظام عضويات أو scoring أو reports موازي.

---

# 3. الديون المعمارية التي تصبح شرطًا قبل التوسع

التدقيق الحالي يثبت أن:
- `server/src/routes/ai.routes.ts` كبير ويخلط schemas/config/providers/fallback/use-cases/context/telemetry.
- `pages/Results.tsx` و`pages/Dashboard.tsx` من ملفات high-change-radius.
- `store/useStore.ts` كبير ولا يجب زيادة مسؤوليته بلا ضرورة.
- Frontend `src/features` ما زال Target وليس البنية الفعلية؛ ممنوع bulk move فقط لمطابقة شكل نظري.

لذلك تنفيذ TUTOR-X يبدأ باستخراج **المسؤوليات التي سيمسها TUTOR-X فقط**.

لا نقسم ملفًا لأنه طويل فقط.
نقسمه عندما يوجد Owner/Responsibility واضحة يحتاجها المنتج الجديد.

---

# 4. Target module ownership

## 4.1 Backend — AI infrastructure

الهدف التدريجي:

```text
server/src/modules/ai/
├─ application/
│  ├─ authorization/
│  ├─ budgets/
│  └─ telemetry/
├─ infrastructure/
│  ├─ providerRegistry.ts
│  ├─ modelRouter.ts
│  ├─ providers/
│  └─ realtime/
└─ http/
   └─ registrar.ts
```

`ai.routes.ts` يبقى compatibility/transport facade أثناء الانتقال، ولا نعمل rewrite كامل.

## 4.2 Backend — Tutor domain

```text
server/src/modules/tutor/
├─ domain/
│  ├─ tutorProfile.ts
│  ├─ teachingPolicy.ts
│  ├─ tutorSession.ts
│  └─ tutorLearningEvent.ts
├─ application/
│  ├─ buildTutorContext.ts
│  ├─ orchestrateTutorTurn.ts
│  ├─ updateTeachingEvidence.ts
│  ├─ startTutorSession.ts
│  └─ endTutorSession.ts
├─ infrastructure/
│  ├─ tutorProfileRepository.ts
│  ├─ tutorMemoryRepository.ts
│  └─ voiceSessionAdapter.ts
└─ http/
   └─ tutorRoutes.ts
```

## 4.3 Qiyas readiness — Domain مستقل غير تابع للـLLM

```text
server/src/modules/qiyas-readiness/
├─ domain/
│  ├─ evidencePolicy.ts
│  ├─ readinessSnapshot.ts
│  └─ predictionConfidence.ts
├─ application/
│  ├─ buildReadiness.ts
│  ├─ getReadinessDrivers.ts
│  └─ buildImprovementPlanInput.ts
└─ infrastructure/
   └─ calibrationRepository.ts
```

الـTutor يستدعي هذا الدومين كـTool.
الـLLM لا يحسب الدرجة المتوقعة بنفسه.

## 4.4 Usage / Cost

لا نخلط تكلفة AI مع telemetry فقط.

```text
server/src/modules/ai-usage/
├─ application/
│  ├─ authorizeUsage.ts
│  ├─ reserveBudget.ts
│  ├─ settleUsage.ts
│  └─ getStudentBalance.ts
└─ domain/
   ├─ usageLedger.ts
   └─ entitlementPolicy.ts
```

يمكن أن تظل Mongoose models في نمط المشروع الحالي، لكن business ownership يكون واضحًا داخل module.

---

# 5. Frontend integration بدون تضخيم الملفات الكبيرة

## 5.1 Results

لا نضيف Realtime logic داخل `Results.tsx`.

يظل Results orchestrator ويستدعي:

```text
components/results/tutor/
├─ TutorLauncher.tsx
├─ TutorTextPanel.tsx
├─ TutorListenButton.tsx
├─ TutorVoicePanel.tsx
├─ TutorUnderstandingCheck.tsx
└─ hooks/
   ├─ useTutorSession.ts
   └─ useTutorVoice.ts
```

## 5.2 Dashboard

بطاقة `معلمي الذكي` و`جاهزية قياس` تكون Components مستقلة lazy-loaded.
لا نضيف business logic جديد إلى `Dashboard.tsx`.

## 5.3 API

نستمر في pattern الموجود:

```text
services/apiGroups/tutorApi.ts
services/apiGroups/qiyasReadinessApi.ts
```

ولا نضيف عشرات calls جديدة إلى `useStore.ts`.

## 5.4 State

- state قصير العمر للجلسة الصوتية: local hook/context.
- server truth: API/query cache.
- global Zustand فقط إذا ظهرت حاجة مشتركة مثبتة بين Routes.
- raw transcripts لا تدخل global store.

---

# 6. تجربة الطالب المستهدفة

## 6.1 البداية داخل مراجعة السؤال

داخل السؤال:

**معلمي الذكي**
- 🔊 اسمع الشرح
- 🎙 تحدث مع المعلم
- ⌨ اكتب سؤالك

السياق يأتي من الخادم:
- السؤال.
- اختيار الطالب.
- correct answer.
- trusted explanation.
- skill.
- relevant mastery.
- TutorProfile summary.

## 6.2 بعد نجاح التجربة

يمتد لاحقًا إلى:
- الدرس.
- التأسيس.
- التدريب.
- لوحة الطالب.
- مركز المحاكيات.

ولا نضع voice SDK في كل Route من البداية.

---

# 7. Voice architecture — أعلى جودة بأقل Bandwidth ممكن

## 7.1 المستويات

1. `Listen`: قراءة شرح.
2. `Push-to-Talk`: مقطع قصير → رد.
3. `Realtime`: full-duplex live AI مثل فئة Gemini Live / Realtime AI.

## 7.2 اتصال Realtime

المفضل:
- Browser ↔ provider realtime transport مباشرة عند الأمان/المزود المناسب.
- Server يصدر session/ephemeral authorization قصير العمر.
- API key الدائم لا يصل للمتصفح.
- Node/Render لا يكون audio relay افتراضيًا.

الفائدة:
- latency أقل.
- origin egress أقل.
- CPU/Memory أقل على API.
- لا ندفع Bandwidth مرتين عبر Render.

إذا أجبر مزود/سياسة على proxy:
- يوثق السبب.
- يقاس egress قبل الإطلاق.
- لا يعتمد كافتراضي بصمت.

## 7.3 Audio payload

- نستخدم codec مناسب للصوت الحي مثل Opus عندما يدعمه transport/provider.
- لا نخزن raw PCM.
- لا نخزن التسجيل الصوتي افتراضيًا.
- transcript/summary فقط عندما يلزم.
- idle timeout.
- silence detection.
- hard session duration.
- reconnect محدود.

## 7.4 Listen/TTS cache

الشرح الثابت أو trusted explanation المتكرر:
- لا يولد TTS كل مرة إذا كانت نفس النسخة/الصوت/اللغة.
- cache key يشمل content version + voice + speed/profile.
- audio artifact العام/المسموح يوضع على object storage/CDN وليس Mongo/Node JSON.
- protected audio يحتاج signed delivery عند الحاجة.

المحتوى الشخصي الديناميكي لا يدخل shared cache بطريقة قد تسرب بيانات الطالب.

---

# 8. Media / Images / Notebook bandwidth contract

يتبع TUTOR-X عقد المنصة الحالي:

1. DB يخزن URL/key + metadata، لا binary blobs.
2. لا Base64 images/audio داخل JSON العادي إلا استثناء صغير موثق.
3. public heavy media → object storage/CDN.
4. private media → signed/protected delivery.
5. لا proxy للصور الكبيرة عبر Node بلا سبب مثبت.
6. الصور lazy-loaded/decode async حيث يناسب.
7. السؤال النصي يرسل للـAI كنص أولًا.
8. image vision call فقط عندما الصورة ضرورية للفهم.
9. لا نعيد إرسال نفس صورة السؤال في كل turn.
10. Smart Notebook يخزن vector strokes/events، وsnapshot فقط عند طلب AI أو export.

---

# 9. Token Economy — عقد توفير التوكنز

الهدف ليس استخدام أرخص Model دائمًا، بل:
**أقل تكلفة تحقق الهدف التعليمي المطلوب بجودة قابلة للقياس.**

## 9.1 Context Packet وليس Full History

كل turn يبني packet محدودًا:

```text
current goal
current question / lesson
trusted explanation
relevant skill snapshot
1–3 recent relevant mistakes
TutorProfile compact summary
short rolling session memory
explicit student request
```

ممنوع إرسال:
- تاريخ الطالب كاملًا.
- كل نتائج الاختبارات.
- كل SkillProgress.
- transcript كامل لجلسة طويلة كل turn.
- بيانات unrelated.

## 9.2 Rolling Memory

الجلسة الطويلة:
- recent turns window.
- ثم summary structured.
- القديم يضغط إلى memory summary.
- critical misconception/evidence يخرج كstructured fields.
- لا نحشو prompt بتاريخ متكرر.

## 9.3 Prompt reuse

- system/policy templates ثابتة versioned.
- context fields compact JSON/schema.
- عدم تكرار نصوص السياسة في عدة layers.
- provider prompt caching يستخدم فقط عندما يدعمه المزود فعليًا ويثبت أنه مفيد.

## 9.4 Deterministic-first

قبل LLM:
- readiness calculation.
- scoring.
- access.
- entitlement.
- question answer truth.
- available resources.
- skill evidence.
- Qiyas estimate.

كلها Server deterministic/read-model.

الـLLM يستخدم للصياغة/التفسير/الحوار، لا لإعادة حساب ما يعرفه النظام أصلًا.

## 9.5 Model Router

لا نستخدم أقوى Model لكل شيء.

Routing categories:
- cached/static explanation.
- lightweight rewrite.
- normal tutoring.
- vision-required.
- hard reasoning.
- realtime voice.

قرار النموذج يأخذ:
- task class.
- modality.
- student entitlement.
- budget.
- latency.
- provider health.
- quality requirement.

## 9.6 Output control

كل use-case له:
- max output.
- response style.
- stop condition.
- retry ceiling.

المعلم لا يرد بمقال طويل عندما المطلوب hint.

## 9.7 Token telemetry

لكل provider call نسجل ما يسمح به provider:
- input usage.
- output usage.
- cached usage إن توفر.
- image/audio units.
- estimated vendor cost.
- latency.
- model.
- fallback.
- outcome category.

ولا نخزن prompt كاملًا في telemetry إذا كان يحتوي بيانات طالب بلا ضرورة.

---

# 10. AI cost / retail credit contract

كل call غالي يمر:

```text
Entitlement
→ Wallet/Budget Gate
→ Model Router
→ Provider
→ Usage Settlement
→ Margin Ledger
```

ممنوع:
- كشف provider key.
- بيع API key.
- call بلا budget gate.
- negative wallet race.
- retry مفتوح.

الطالب يشتري:
- Tutor Credits / AI allowance.
وليس مفاتيح المزود.

---

# 11. Qiyas Readiness integration

## 11.1 الفصل

- `MasteryReadiness`: هل ينتقل الطالب للمهارة التالية؟
- `QiyasReadiness`: هل أدلة الطالب الحالية تغطي اختبار قياس بصورة كافية؟
- `ExpectedQiyasScore`: estimate calibrated، وليس official score.

## 11.2 Inputs

فقط evidence المناسبة:
- full mock attempts.
- section performance.
- skill coverage.
- time pressure.
- unanswered.
- recency.
- consistency.
- trend.
- evidence confidence.

## 11.3 Output

واجهة الطالب تعرض:
- readiness 0–100.
- estimated range.
- confidence.
- strongest area.
- blockers.
- next action.

إذا evidence ضعيفة:
**لا رقم متوقع.**
النظام يطلب محاكيًا صالحًا أولًا.

## 11.4 Calibration

Phase A:
- platform estimate.
- range واسع.
- label واضح.

Phase B بعد outcomes حقيقية كافية:
- calibration dataset.
- holdout validation.
- MAE.
- interval coverage.
- drift.
- model version.

الـLLM لا يصنع الرقم.

---

# 12. Privacy / student isolation

إلزامي:

- userId من auth context، لا من body للطالب إلا contract مصرح.
- كل query student-scoped.
- cross-student negative tests.
- minimum data sent to provider.
- raw voice recording = off by default.
- camera = خارج Strong MVP.
- لا emotion/intelligence/mental-state inference.
- no provider training assumptions؛ إعدادات وسياسات المزود تراجع وقت التنفيذ.
- retention matrix لكل TutorSession/Event/Transcript/Usage.
- deletion lifecycle يحدد ما يحذف/يُجهّل/يحتفظ به قانونيًا.

---

# 13. Performance & Bandwidth budgets

قبل أول runtime phase نسجل baseline للرحلات:

1. فتح Dashboard.
2. فتح Result review.
3. فتح Question Assistant.
4. بدء Tutor text.
5. بدء Listen.
6. بدء Realtime.
7. فتح Mock Exam Hub.

نقيس:
- JS initial bytes.
- lazy chunk bytes.
- request count.
- compressed API bytes.
- duplicate bytes.
- image/audio bytes.
- origin egress.
- realtime bitrate/session.
- provider token/audio cost.
- cache hit ratio.

## Guardrails

- Voice/3D/Notebook heavy libraries لا تدخل initial app bundle.
- dynamic import عند أول استخدام.
- لا preload لصوت/3D لمستخدم غير مؤهل أو لم يفتح الميزة.
- أي زيادة ملحوظة في initial-route payload تحتاج evidence وقرار، وليست مقبولة تلقائيًا.
- نثبت budget رقمي في CI بعد قياس baseline الحقيقي، لا نخترع رقمًا قبل القياس.

---

# 14. Database / query safety

- لا `find({})` جديد على collections نامية في student journey.
- skill/evidence reads تكون scoped ومحدودة.
- Tutor context يستخدم projections.
- transcript/event history paginated.
- usage ledger indexed by user/date/session/provider.
- readiness reads لا تسحب كل history كل مرة؛ snapshot/read model + bounded refresh.
- aggregation الثقيلة تقاس قبل cache/precompute.
- no polling per student؛ realtime يكون event/session driven.

---

# 15. Caching policy

## قابل للكاش المشترك
- trusted question explanation.
- static learning resource metadata.
- static TTS للشرح العام إذا سمحت السياسة.
- generic hint عندما لا يحتوي personalization.

## كاش scoped
- tutor context summary.
- readiness snapshot.
- entitlement.
- student teaching policy.

## لا shared cache
- transcript.
- personalized response.
- private image.
- wallet data.
- private readiness details.

كل cache key يشمل versions المناسبة لمنع stale learning truth.

---

# 16. Smart Notebook

يبنى من `QuestionDrawingPad` بالتدريج.

`LearningCanvas`:
- full screen.
- pages.
- pen/highlighter/eraser.
- undo/redo.
- shapes.
- grid/coordinate plane.
- zoom/pan.
- autosave.

Resource rules:
- vector-first.
- no screenshot every stroke.
- snapshot on demand.
- lazy-load editor engine.
- local/offline draft where appropriate.
- upload only changed payload.
- AI receives cropped/optimized snapshot عند الحاجة فقط.

---

# 17. 2D / 3D Math Lab

لا يدخل initial bundle.

## 2D first
- coordinates.
- triangles.
- circles.
- functions.
- draggable constraints.

## 3D later
- solids.
- vectors.
- sections.

الـAI يرجع declarative scene spec فقط.
Renderer موثوق يفسر spec.
ممنوع arbitrary JavaScript from AI.

3D engine dynamic import عند فتح المختبر فقط.

---

# 18. Focus assistance

Strong MVP بدون كاميرا:
- visibility.
- inactivity.
- unanswered check-in.
- rapid guessing.
- long silence during active session.

Response:
- gentle check-in.
- shorter explanation.
- pause option.

الكاميرا Future/Optional فقط بعد privacy/business approval.

---

# 19. Execution Gates

## TUTOR-G00 — Architecture & Resource Baseline
**Purpose**
- استخراج AI provider/runtime boundaries التي يحتاجها Tutor.
- baseline للbundle/API/tokens/egress.
- contracts فقط.

**Exit**
- ai route لم يعد المكان الذي نضيف فيه كل business logic الجديد.
- baseline evidence محفوظ.
- no behavior regression.

## TUTOR-G01 — Learner Tutor Profile
- StudentTutorProfile.
- evidence-backed teaching strategy scores.
- misconception/error patterns.
- compact memory.
- no rigid learning-style labels.

## TUTOR-G02 — Tutor Orchestrator + Text/Image
- bounded context builder.
- trusted tools.
- Result Review integration.
- text first.
- image on demand.

## TUTOR-G03 — Usage Ledger / Entitlement / Token Budget
- usage metering.
- wallet/budget gate.
- router policy.
- cost telemetry.
- admin limits.

**لا Realtime production قبل هذا Gate.**

## TUTOR-G04 — Voice Listen + Push-to-Talk
- TTS cache.
- mic permission.
- short speech turn.
- resource measurement.

## TUTOR-G05 — Live Realtime Tutor
- full duplex.
- interruption.
- ephemeral session.
- reconnect.
- idle/session limits.
- live cost settlement.

## TUTOR-G06 — Qiyas Readiness
- evidence policy.
- readiness snapshot.
- initial estimated range.
- confidence.
- dashboard/mock hub/result integration.
- tutor tools.

## TUTOR-G07 — Qiyas Calibration
- optional official outcome capture.
- calibration dataset.
- validation.
- versioned predictor.

## TUTOR-G08 — Smart Notebook
- reusable LearningCanvas.
- AI snapshot understanding.

## TUTOR-G09 — Interactive Math Lab
- 2D.
- then 3D.
- scene spec.

## TUTOR-G10 — Student / Parent / School / Admin Integration
- student dashboard.
- package entitlements.
- usage reports.
- parent/school visibility policy.
- admin controls.

## TUTOR-G11 — Scale & Final Certification
- functional.
- security.
- cross-student isolation.
- privacy.
- provider fallback.
- bundle.
- bandwidth.
- egress.
- token/cost.
- concurrency.
- mobile.
- accessibility.
- recovery.

---

# 20. Acceptance / quality gates

أي Phase لا تعتبر `VERIFIED` إلا بدليل مناسب.

Minimum contracts:
- tutor auth.
- cross-student denial.
- context boundedness.
- prompt injection around trusted answer.
- no AI mastery/scoring writes.
- usage idempotency.
- wallet concurrency.
- provider timeout/fallback.
- image blocked unless required.
- voice permission denied.
- session expiry.
- interrupted speech.
- network reconnect.
- Qiyas insufficient evidence.
- Qiyas predictor cannot be overridden by LLM.
- cache isolation.
- deletion/retention.
- build/typecheck.
- initial bundle regression.
- request/byte evidence.
- exact-head CI.

Realtime/scale claims تحتاج staging/live-like evidence ولا تثبتها smoke tests فقط.

---

# 21. Metrics

## Education
- post-explanation success.
- transfer question success.
- misconception recurrence.
- time-to-mastery.
- repeat-explanation rate.
- hints-to-success.

## Product
- tutor activation.
- session completion.
- voice adoption.
- text→voice conversion.
- helpfulness/continue rate.

## AI Quality
- fallback.
- unsafe/untrusted answer rate.
- hallucination against trusted question.
- tool-call correctness.
- response latency.

## Cost
- tokens per successful remediation.
- cost per successful remediation.
- voice cost/minute.
- cached saving.
- image-call rate.
- gross margin.

## Resource
- initial JS.
- lazy chunks.
- API bytes.
- media bytes.
- origin egress.
- realtime bitrate.
- cache-hit ratio.

## Qiyas
- readiness stability.
- prediction MAE when calibrated.
- interval coverage.
- drift.
- confidence calibration.

---

# 22. Non-negotiable engineering rules

1. Modular Monolith فقط.
2. لا Big-Bang rewrite.
3. لا bulk move إلى `src/features` لمجرد الشكل.
4. لا AI business logic جديد في `ai.routes.ts` mega-file.
5. لا Tutor realtime logic داخل `Results.tsx` أو `Dashboard.tsx`.
6. لا إضافة غير لازمة إلى `useStore.ts`.
7. no raw media in Mongo/API JSON.
8. heavy libraries lazy-loaded.
9. no provider API key to browser.
10. no AI call before entitlement/budget gate when billable.
11. no full student history per prompt.
12. no full transcript per turn.
13. no shared cache for personalized/private output.
14. AI does not own scoring/mastery/Qiyas prediction.
15. Qiyas estimate must expose confidence/insufficient-data state.
16. every optimization measured; no bandwidth claims by intuition.
17. every model choice routed by task/cost/quality.
18. production scale requires real evidence.
19. preserve current routes/contracts unless a phase explicitly authorizes versioned change.
20. every Gate updates execution evidence only when implementation actually happens.

---

# 23. Files that must be read before implementation

At the start of any TUTOR-X implementation session:

1. `AGENTS.md`
2. `.codex/skills/almeaa-goal-delivery/SKILL.md`
3. `docs/architecture/CODEX_EXECUTION_STATE.md`
4. `docs/architecture/CURRENT_DIRECTORY_AND_MODULE_MAP.md`
5. `docs/architecture/DEEP_MODULARITY_AND_RESOURCE_AUDIT.md`
6. `docs/architecture/ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md`
7. `docs/architecture/TUTOR_01_PERSONAL_AI_TUTOR_MASTER_PLAN_AR.md`
8. `docs/architecture/TUTOR_V01_STUDENT_LIVE_VOICE_PLAN_AR.md`
9. **هذه الوثيقة**.

ثم:
- inspect latest main.
- inspect latest merged state.
- create fresh focused branch.
- لا تعيد تنفيذ work موثق VERIFIED.

---

# 24. ما نفعله الآن

**الآن: لا ننفذ Runtime.**

هذه الخطة محفوظة لكي:
- لا تضيع الفكرة.
- لا تختلط بخطط الإصلاح.
- يبدأ أي مطور لاحقًا من Architecture صحيحة.
- نمنع تضخم الملفات الكبيرة.
- نمنع استهلاك Bandwidth/Tokens عشوائي.
- نصل في النهاية إلى Tutor متكامل مع ALMEAA وليس Plugin جانبيًا.

عند إعطاء أمر البدء مستقبلًا، يبدأ التنفيذ من:
**TUTOR-G00 — Architecture & Resource Baseline**
ولا يقفز مباشرة إلى Realtime Voice.
