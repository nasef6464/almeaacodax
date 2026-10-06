# ALMEAA — Course Lesson Completion Session Isolation Handoff

## GOAL

إغلاق فجوة سلامة واحدة ضمن post-Gate-6 Course System release-readiness: منع طلب إكمال درس معلّق لحساب من تعطيل محاولة إكمال نفس الدرس لحساب آخر على نفس جلسة المتصفح.

## STATUS

`CLOSED / VERIFIED` لهذه الدفعة المحدودة فقط.

## PROVEN GAP

قبل هذه الدفعة كان `store/slices/learningProgressSlice.ts` يحتفظ بطلبات إكمال الدروس المعلقة في `pendingLessonCompletions` باستخدام `lessonId` وحده كمفتاح على مستوى الموديول. ومع أن كتابة التفضيلات نفسها تتحقق من هوية المستخدم قبل الحفظ، كان القفل المحلي المشترك يستطيع أن يعتبر طلب حساب آخر لنفس `lessonId` طلبًا مكررًا ويمنع المحاولة الجديدة مؤقتًا.

## DELIVERED

- أصبح مفتاح الحماية من التكرار مبنيًا على `learner identity + courseId + lessonId`.
- بقيت آلية serialization الحالية لكتابات التفضيلات كما هي.
- بقي فحص هوية المستخدم مرة أخرى قبل الكتابة كما هو.
- لم يتغير شكل `completedLessons` أو API أو persistence contract.
- امتد `scripts/smoke-video-questions-contract.mjs` ليمنع الرجوع إلى global `lessonId` pending lock.

## VERIFIED

Exact runtime/test commit:

`a3b64b2954cccdb16dd93c083c20dd8b5616308b`

GitHub Actions على نفس الـruntime:

- Platform V3 Phase + Handover Gate `34045597631` — `SUCCESS`.
- Platform V3 Recovery Gate `34045597610` — `SUCCESS`.
- Refactor V2 Safety Gate `34045597623` — `SUCCESS`.
  - Frontend typecheck — `SUCCESS`.
  - API typecheck — `SUCCESS`.
  - Frontend/API production builds and architecture/security/contracts — `SUCCESS` ضمن البوابة.
- Platform V3 Public UI Gate `34045597635` — `SUCCESS`.
- Vercel status على exact runtime commit — `SUCCESS`.
- Backend Integration / Deep Pre-Merge / Live Role / Assessment / role-preview — `SKIPPED` بشروط المسارات الحالية؛ هذه الدفعة لا تغير backend runtime أو RBAC أو Assessment ownership/scoring.

## BOUNDARIES PRESERVED

لا تغيير في:

- API URL/method أو public route contracts.
- auth/RBAC semantics.
- Assessment/Quiz scoring أو QuestionAttempts/grades.
- payments/commerce semantics.
- persisted schema أو data ownership/query responsibility.
- ProductConfig أو tenant model.
- migrations/cutover/production data.
- microservices أو buyer-specific forks.
- UI design.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, و`DATA_ACCESS_MAP.md` تبقى بلا تغيير لأن ownership/query responsibility لم تتحرك.

## COMMITS

- Runtime: `f638c8a44518d7fdba06c1045d41841bc9e08d29` — `fix(courses): isolate pending lesson completion by learner`.
- Contract test / exact verified runtime head: `a3b64b2954cccdb16dd93c083c20dd8b5616308b` — `test(courses): guard learner-scoped pending completion`.
- هذا الملف docs-only بعد ثبوت الـruntime ويستخدم `[skip ci]`.

## NEXT GOAL

بعد الدمج، ابدأ من `main` الجديد وافحص فجوة واحدة مثبتة فقط ضمن post-Gate-6 Course/Operations release-readiness. لا تعِد فتح Gates 1–6 أو VIDEO-PLAY-02 بلا defect جديد أو authorization صريح.
