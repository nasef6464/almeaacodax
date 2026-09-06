# ALMEAA — Live Session Package Scope Handoff

التاريخ: 2026-09-06

## الحالة

`VERIFIED` لدفعة واحدة محدودة على سطح `/live-sessions`.

هذه الدفعة لا تعيد فتح Product Gates 1–6. المرجع الحالي يبقى `MAIN_INTEGRATION_CHECKPOINT_AR.md`: Gates 5 و6 مغلقة، والعمل الحالي هو owner-approved bounded Course System / release-readiness review بفجوة واحدة مثبتة في كل دفعة.

## الفجوة المثبتة

كان `pages/LiveSessions.tsx` يعتبر امتلاك الطالب لأي عنصر داخل `subscription.purchasedPackages` كافيًا لإظهار أي حصة مباشرة مقيدة، حتى لو كانت الباقة المشتراة لا تطابق مسار أو مادة الحصة. هذا overgrant تجاري على سطح الطالب لأن package entitlement في ALMEAA مصمم أصلًا ليكون scope-aware حسب نوع المحتوى + path + subject.

## الإصلاح المحدود

- أبقينا الحصص `public` كما هي.
- أبقينا `specific_groups` كما هي.
- أبقينا وصول staff وPremium كما هو.
- الحصة المقيدة العادية تستخدم الآن resolver الموجود أصلًا:
  `hasScopedPackageAccess('foundation', lesson.pathId, lesson.subjectId)`.
- أضيف contract إلى `scripts/smoke-quiz-access-contract.mjs` يثبت استخدام scoped resolver ويمنع رجوع `(purchasedPackages || []).length > 0` كـglobal unlock في `/live-sessions`.

## الحدود التي لم تتغير

لا تغيير في:

- API URL/method/response contract.
- backend RBAC أو auth.
- scoring.
- payment semantics.
- persisted schema أو data ownership.
- production data أو migration/cutover.
- tenant model أو SaaS multi-tenancy.
- microservices أو buyer-specific core forks.
- UI redesign أو polish خارج الحاجة المباشرة لإغلاق الفجوة.

`MODULE_CATALOG.md` و`CHANGE_MAP.md` و`DATA_ACCESS_MAP.md` لا تحتاج تعديلاً لهذه الدفعة لأن module ownership وquery/data boundary لم تتغير؛ الإصلاح يعيد استخدام access resolver قائمًا على سطح قائم.

## commits

- Runtime: `de3a287cae2421b1f20bd42dcc6902fd152b8bb0` — `fix(live-sessions): enforce scoped package access`
- Runtime/test verification head: `3015ee91490327f1552ef72cfa478f32984e3a2b` — `test(access): guard live-session package scope`

الـdiff من `main@292eeba8df138ffd16f98d464b496b6e409f9d74` إلى runtime/test head محصور في:

1. `pages/LiveSessions.tsx`
2. `scripts/smoke-quiz-access-contract.mjs`

## CI على exact runtime/test head

- Refactor V2 Safety Gate — run `34019311974` — `SUCCESS`.
  - frontend typecheck: PASS
  - API typecheck: PASS
  - frontend production build: PASS
  - API production build: PASS
  - immutable architecture + module/schema/security contracts: PASS
- Platform V3 Public UI Gate — run `34019311926` — `SUCCESS`.
- Platform V3 Phase + Handover Gate — run `34019311953` — `SUCCESS`.
- Platform V3 Recovery Gate — run `34019311945` — `SUCCESS`.
- Vercel preview status on `3015ee91490327f1552ef72cfa478f32984e3a2b` — `SUCCESS`.
- Backend Integration/Deep/role-only workflows skipped by path rules for this frontend-only bounded change; no backend runtime file changed.

## ما لا تدعيه هذه الدفعة

هذا الإغلاق خاص بسطح `/live-sessions`. لا ندعي هنا أن كل surfaces الأخرى التي تعرض lesson meeting/recording data تم تدقيقها أو تغييرها. أي surface مستقل يحتاج إثبات فجوة منفصل ودفعة مستقلة لاحقة.

## handoff للدفعة التالية

بعد دمج PR #47 والتحقق من `main`/deployment، ابدأ من `main` الجديد في branch جديد. افحص فجوة Course System واحدة فقط وفق الترتيب التجاري. لا توسّع هذه الدفعة لتشمل Dashboard أو content bootstrap أو backend lesson payload إلا إذا تم إثبات defect مستقل وحدوده واختباره في دفعة لاحقة.
