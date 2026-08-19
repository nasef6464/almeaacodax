# Store Domain Helpers Checkpoint — 2026-08-19

> نقطة تحقق بعد fresh repository audit ودفعتَي Content الآمنتين. العمل يظل على `refactor/repository-v2-safe` فقط. PR #3 يبقى Draft verification PR ولا يتم دمج `main` بدون موافقة المستخدم الصريحة.

## Baseline قبل Store batch ✅

على commit `4d02474a81d9c58ffea1b0aef757b619ef7c3bf7` مرّ Standard Safety Gate كاملًا:

- جميع خطوات code gate: PASS.
- repository/frontend/API typecheck: PASS.
- frontend/API production builds: PASS.
- architecture + module boundaries: PASS.
- security/RBAC/runtime/route-loading/product journey contracts: PASS.
- Vercel preview: PASS في هذا checkpoint.

إذًا Store extraction بدأ من baseline أخضر كامل وليس من حالة غير مستقرة.

## Store Domain Helpers ✅

### الإعداد

- setup commit: `e425eafba5b4e3faee0aca70977fac5bac7df660` — `ci(refactor): add store domain helpers gate`.
- أول run أثبت أن direct pre-boundary صحيح، لكنه توقف قبل apply لأن root `npm run typecheck` يشمل ملفات `server/` بينما workflow كان يثبت root dependencies فقط.
- لم يُكتب أي runtime diff في ذلك run.
- CI environment fix: `1bba229d42c6ee454b10c6f6a87c67fc57e441b9` — إضافة `npm --prefix server ci` قبل repository typecheck.

### runtime commit

- verified runtime commit: `cf52eba6319415e40e8708f04beeb00408067f56`.
- message: `refactor(store): extract pure domain helpers`.
- scope: ملفان فقط.
  - `store/useStore.ts`.
  - `store/storeDomainHelpers.ts`.
- `useStore.ts`: **2210 -> 2053** سطر حسب direct boundary evidence.
- `storeDomainHelpers.ts`: حوالي **169** سطر حسب direct line counter.

## الملكية الجديدة

تم نقل pure domain helpers فقط:

- `createGuestUser`.
- `packageMatchesScope`.
- `isPublicPackageAvailable`.
- `getUserSchoolIds`.
- `mergeQuizResultsForStore`.
- `isRegisteredUser`.
- `resolveEntityId`.
- `normalizeCourseForStore`.

وظائف داخلية تابعة لنفس الـpure owner:

- `getQuizResultIdentity`.
- `normalizeQuizResultForStore`.
- `toOptionalFiniteNumber`.

## ما بقي عمدًا داخل useStore

لم يتم نقل state orchestration أو side effects. يظل `store/useStore.ts` مالكًا لـ:

- Zustand `create<AppState>()`.
- `persist(...)`.
- `set/get` state orchestration.
- `api.*` calls.
- session/runtime sync decisions.
- browser/storage/state side effects.
- call sites التي تستهلك helpers الجديدة.

العقد يمنع `storeDomainHelpers.ts` من امتلاك Zustand، API service، browser storage، `fetch`, أو state mutation ownership.

## التحقق المباشر للدفعة ✅

run: `32240573684` / job: `96029986919`.

مرّ على:

- pre-boundary contract: PASS، 10 checks.
- repository typecheck: PASS.
- frontend production build: PASS.
- architecture gate: PASS.
  - unresolved runtime imports: 0.
  - dependency cycles: 0.
  - hotspots >=400 lines: 82 ضمن الحد الحالي 83.
- module boundary gate: PASS.
- post-apply Store Domain Helpers boundary: PASS.
- School Management: **22/22 PASS**.
- Results: **6/6 PASS**.
- Course Visibility: **3/3 PASS**.
- Auth Frontend: PASS.
- Performance: PASS.
- Route Loading: PASS.
- Runtime Source: PASS.
- Global Student Journey: **12/12 PASS**.
- changed scope: `store/useStore.ts` + `store/storeDomainHelpers.ts` فقط.
- remote-head verification قبل commit: PASS.
- no force push.

## Dependency nuance

في هذا run:

- root `npm ci`: **found 0 vulnerabilities**.
- `npm --prefix server ci` أظهر 17 إجمالًا: 1 Low + 16 Moderate.

هذا لا يغيّر dependency-closure conclusion السابقة: server **production-only** audit ما زال Critical 0 / High 0 / Low 0، والمتبقي المعروف في production هو Sentry/OpenTelemetry moderate cluster الذي يحتاج Sentry major migration منفصلة. لا يتم تشغيل `npm audit fix --force` أو override عشوائي.

## CI naming / idempotency checkpoint

الـroot script `npm run typecheck` يفحص repository TypeScript بما يشمل `server/`، لذلك تم تصحيح تسمية خطوة Store gate من “frontend typecheck” إلى **Repository typecheck** بدون تغيير السلوك.

Store phase review يدعم نفس قاعدة idempotency:

- `ALREADY_APPLIED` + zero diff بعد نجاح كل العقود = verified `mode: NO_OP`.
- partial diff = failure.
- unexpected file = failure.
- apply الحقيقي يسمح فقط بملفي Store المتوقعين.

## الاتجاه التالي

1. إثبات Store clean no-op على checkpoint بشري.
2. تشغيل Standard Safety Gate على runtime state بعد Store extraction.
3. بعد إغلاق الاثنين، مراجعة `services/api.ts` حسب coupling/risk.
4. لا يتم فصل CSRF/session/request/auth transport تلقائيًا لأنها security-sensitive.
5. المرشحات الآمنة هناك يجب أن تكون pure query/pagination/response helpers أو endpoint grouping بعد فحص source-coupled contracts.
6. `SchoolsManager.tsx` لا يُعاد تفكيكه لمجرد حجمه؛ هو بالفعل مقسم إلى panels/cards/helpers كثيرة.
7. Quiz business/security-sensitive decomposition يظل متوقفًا بدون owner واضح وقيمة أعلى من المخاطرة.
8. Production Readiness -> Freeze -> Full Safety Gate -> compare vs `main` -> explicit merge approval.
