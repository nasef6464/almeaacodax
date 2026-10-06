# ALMEAA — Interactive Video Completion Integrity Handoff

## GOAL

إغلاق فجوة سلامة واحدة في رحلة الفيديو التفاعلي: منع تسجيل درس فيديو كمكتمل بينما توجد أسئلة `mustPass` لم تُجب بنجاح بعد.

## STATUS

`CLOSED / VERIFIED` لهذه الدفعة المحدودة فقط.

## PROVEN GAP

قبل هذه الدفعة كان `CoursePlayer.handleMarkComplete` يستدعي `markLessonComplete` لأي درس نشط دون ربط الإكمال بحالة الأسئلة الإلزامية داخل الفيديو. لذلك كان يمكن للطالب تجاوز حماية `mustPass` التي ينفذها المشغل ثم رفع تقدم الدورة/الشهادة عبر زر "تحديد كمكتمل".

## DELIVERED

- يحسب `CoursePlayer` معرّفات الأسئلة الإلزامية من `activeLesson.interactiveQuestions` فقط.
- يقارنها بحالة `answeredQuestionIds` المحفوظة في `activeVideoProgress` الحالية.
- `handleMarkComplete` يفشل مغلقًا إذا بقي سؤال إلزامي غير مجاب.
- زر إكمال الدرس يُعطّل للدرس غير المكتمل أثناء وجود متطلبات إلزامية غير مستوفاة.
- تظهر رسالة واضحة للطالب تشرح أن الأسئلة الإلزامية يجب إنهاؤها أولًا.
- امتد `scripts/smoke-video-questions-contract.mjs` ليحرس هذا الحد البنيوي.

## VERIFIED

Exact runtime/test commit:

`37a0924655e828d7c27780d921eb165742278575`

GitHub Actions على نفس الـruntime:

- Platform V3 Phase + Handover Gate `34042688188` — `SUCCESS`.
- Course Free Enrollment UI Gate `34042688194` — `SUCCESS`.
- Platform V3 Recovery Gate `34042688187` — `SUCCESS`.
- Refactor V2 Safety Gate `34042688176` — `SUCCESS`.
  - Frontend typecheck — `SUCCESS`.
  - API typecheck — `SUCCESS`.
  - Frontend production build — `SUCCESS`.
  - API production build — `SUCCESS`.
  - Immutable architecture and security/contracts — `SUCCESS`.
  - Vercel exact-head preview deployment gate — `SUCCESS`.
- Platform V3 Public UI Gate `34042688185` — `SUCCESS`.
- Backend Integration / Deep Pre-Merge / Live Role / Assessment / role-preview — `SKIPPED` by their existing path/role conditions; this batch changes no backend runtime, RBAC, Assessment ownership, or scoring.

## BOUNDARIES PRESERVED

لا تغيير في:

- API URL/method أو public route contracts.
- auth/RBAC.
- Assessment/Quiz scoring أو QuestionAttempts/grades.
- payments/commerce semantics.
- persisted schema أو data ownership/query responsibility.
- ProductConfig أو tenant model.
- migrations/cutover/production data.
- microservices أو buyer-specific forks.
- analytics أو player redesign.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, و`DATA_ACCESS_MAP.md` لا تحتاج تغييرًا لأن ownership/query responsibility لم تتحرك.

## DEFERRED

يبقى ما سجله VIDEO-PLAY-02 مؤجلًا: grade-bearing attempts، analytics، AI recommendations، player redesign، cross-device conflict UI، والتحكم الكامل في iframe providers. هذه الدفعة لا تعيد فتح تلك العناصر.

## COMMITS

- Runtime/test: `37a0924655e828d7c27780d921eb165742278575` — `fix(video): require must-pass questions before lesson completion`.
- هذا الملف هو docs-only descendant باستخدام `[skip ci]` بعد ثبوت الـruntime.

## NEXT GOAL

بعد الدمج، ابدأ من `main` الجديد وافحص فجوة واحدة مثبتة فقط ضمن post-Gate-6 Course/Operations release-readiness. لا تعِد فتح VIDEO-PLAY-02 أو Gates 1–6 بدون defect جديد أو authorization صريح.
