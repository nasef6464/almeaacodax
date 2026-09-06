# ALMEAA — Interactive Video Preference Write Serialization Handoff

## GOAL

إغلاق فجوة سلامة واحدة ضمن post-Gate-6 Course System release-readiness: منع طلبات حفظ تفضيلات المستخدم المتداخلة — وبالأخص snapshots تقدم الفيديو التفاعلي — من الوصول بترتيب عكسي واستبدال تقدم أحدث بتقدم أقدم.

## STATUS

`CLOSED / VERIFIED` لهذه الدفعة المحدودة فقط.

## PROVEN GAP

المشغل يحفظ `interactiveVideoProgress` عبر مسار التفضيلات الحالي `PATCH /api/auth/me/preferences`. قبل هذه الدفعة كانت `services/apiGroups/authApi.ts` ترسل كل `updateMyPreferences` مباشرة دون serialization مشترك. لذلك كان ممكنًا أن يبقى طلب أقدم قيد التنفيذ بينما يبدأ طلب أحدث، ثم يصل الطلب الأقدم بعده إلى الخادم ويستبدل snapshot الأحدث لأن مسار التفضيلات يحدّث المصفوفة المرسلة كقيمة كاملة.

هذه ليست إعادة فتح لـ`VIDEO-PLAY-02` أو Product Gate 6؛ إنها defect جديد مثبت في سلامة persistence أثناء الاستخدام الفعلي.

## DELIVERED

- أصبح `updateMyPreferences` يمر عبر queue تسلسلية واحدة داخل مجموعة Auth API الحالية، بحيث لا تتداخل كتابات التفضيلات من نفس جلسة الواجهة.
- تستمر الـqueue بعد نجاح أو فشل أي طلب ولا تبقى عالقة بسبب rejection سابق.
- انتقالات جلسة المصادقة المعتادة تنتظر أي كتابة تفضيلات معلقة قبل تغيير هوية الجلسة:
  - login بالبريد وكلمة المرور؛
  - register؛
  - logout؛
  - WhatsApp verify login؛
  - National ID login.
- بقي `CoursePlayer` ومسار `/auth/me/preferences` وشكل payload ونموذج `interactiveVideoProgress` كما هي.
- امتد `scripts/smoke-video-questions-contract.mjs` بعقد بنيوي يمنع الرجوع إلى إرسال متداخل بلا serialization/session-transition guard.

## VERIFIED

Exact runtime/test commit:

`4c56c597f7f986cd1cb09bcbc9891df8aab722dc`

GitHub Actions على نفس الـruntime:

- Platform V3 Phase + Handover Gate `34049088542` — `SUCCESS`.
- Platform V3 Recovery Gate `34049088490` — `SUCCESS`.
- Refactor V2 Safety Gate `34049088540` — `SUCCESS`.
  - Frontend typecheck — `SUCCESS`.
  - API typecheck — `SUCCESS`.
  - Frontend production build — `SUCCESS`.
  - API production build — `SUCCESS`.
  - immutable architecture / module boundaries / security / contracts — `SUCCESS`.
  - Vercel preview deployment gate — `SUCCESS`.
- Platform V3 Public UI Gate `34049088538` — `SUCCESS`.
- Vercel exact-head status — `SUCCESS`.
- Backend Integration / Deep Pre-Merge / Live Role / Assessment / role-preview — `SKIPPED` بشروط المسارات الحالية؛ هذه الدفعة لا تغيّر backend runtime route أو RBAC أو Assessment ownership/scoring.

## BOUNDARIES PRESERVED

لا تغيير في:

- API URL/method أو public route contracts.
- auth/RBAC role semantics.
- Assessment/Quiz scoring أو QuestionAttempts/grades.
- payments/commerce semantics.
- persisted schema أو data ownership/query responsibility.
- ProductConfig أو tenant model.
- migrations/cutover/production data.
- microservices أو buyer-specific forks.
- CoursePlayer UI أو تصميم المشغل.

`MODULE_CATALOG.md`, `CHANGE_MAP.md`, و`DATA_ACCESS_MAP.md` تبقى بلا تغيير لأن ownership/query responsibility لم تتحرك.

## COMMITS

- Runtime: `94237b80bd239a34a97112791ec7d3a6cdf56420` — `fix(video): serialize preference progress writes`.
- Contract test / exact verified runtime head: `4c56c597f7f986cd1cb09bcbc9891df8aab722dc` — `test(video): guard serialized preference writes`.
- هذا الملف docs-only بعد ثبوت الـruntime ويستخدم `[skip ci]`.

## PR

- Branch: `codex/course-system-next-gap-10`.
- PR: `#56` — `Video progress: serialize preference persistence`.

## NEXT GOAL

بعد دمج هذه الدفعة، ابدأ من `main` الجديد وافحص فجوة واحدة مثبتة فقط ضمن post-Gate-6 Course/Operations release-readiness. لا تعِد فتح Gates 1–6 أو `VIDEO-PLAY-02` بلا defect جديد أو authorization صريح، ولا تبدأ تحسينات Analytics/UI غير مطلوبة.
