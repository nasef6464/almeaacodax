# API Query Utilities Checkpoint — 2026-08-19

> العمل يظل على `refactor/repository-v2-safe` فقط. PR #3 يبقى Draft verification PR، ولا يتم تعديل/دمج `main` بدون موافقة المستخدم الصريحة.

## نقطة البداية ✅

بدأت دفعة API من Store checkpoint أخضر:

- Store runtime: `cf52eba6319415e40e8708f04beeb00408067f56`.
- Store checkpoint: `3c621173ed5516ca6942d68bb7e65542d91743a3`.
- Store clean no-op: PASS.
- Standard Safety Gate code job على Store checkpoint: 63/63 PASS.
- Vercel على ذلك checkpoint كان محجوبًا فقط بـ`upgradeToPro=build-rate-limit`؛ لم يكن code regression.

## API Query Utilities ✅

### الهدف

فصل pagination/query compatibility فقط من `services/api.ts` بدون لمس transport/security/cache ownership.

الـowner الجديد:

- `services/apiQueryUtilities.ts`.

تم نقل:

- `PaginationOptions`.
- `QuizResultsPaginationOptions`.
- `QuizResultsPageResponse`.
- `PaginatedResponseShape`.
- `PaginationMeta`.
- `extractList`.
- `withQuery`.

### ما بقي عمدًا في `services/api.ts`

- `API_BASE_URL`.
- request/session transport.
- CSRF cookie/header names.
- `ensureCsrfToken`.
- `request<T>`.
- `credentials: "include"` behavior.
- public cache helpers.
- `requestCached`.
- كل endpoint call sites و`api` object.

العقد يمنع utility module من امتلاك `fetch`, browser storage, CSRF, cache, API base URL, credentials أو endpoint orchestration.

## commits

- setup: `609d88f80585e121aa8f66de1957d246ecb630d0` — `ci(refactor): add api query utilities gate`.
- أول executor run أثبت pre-boundary/typecheck/apply/build/architecture/API boundary/API Phase4، ثم أوقف الحفظ بسبب source-coupled Frontend Phase5 assertion قديم في `services/adapter.ts`. لم يُكتب runtime commit في ذلك run.
- contract ownership/runtime-follow-up: `5de6c9abb3eac6b85ccf984cadfe9d431c49827a` — `test(frontend): follow paginated adapter calls`.
  - العقد أصبح يتبع السلوك الحالي: `api.getCourses(params)` و`api.getQuizzes(params)` مع `map(normalizeCourse)` و`map(normalizeQuiz)`.
  - لا runtime code تغيّر في هذا commit.
- verified runtime: `5fbe7d54be973b4ba50bd10e055cd55c051dcde6` — `refactor(api): extract query compatibility utilities`.

## scope / الحجم

runtime commit غيّر 3 ملفات فقط:

- `services/api.ts`.
- `services/apiQueryUtilities.ts`.
- `scripts/smoke-frontend-phase5-contract.mjs`.

Direct boundary evidence:

- `services/api.ts`: **2036 -> 1970** سطر.
- `services/apiQueryUtilities.ts`: **76** سطر حسب direct line counter (75 source lines في commit patch + newline accounting).
- unresolved runtime relative imports: 0.
- dependency cycles: 0.
- hotspots >=400: 82 ضمن الحد 83.

## source-coupled Phase 5 ownership repair

`smoke-frontend-phase5-contract.mjs` أصبح:

- يقرأ `services/apiQueryUtilities.ts` للـ`PaginationOptions` owner.
- يبقي endpoint/query call-site checks على `services/api.ts`.
- يتبع التقرير الحالي في `docs/archive_reports/05_FRONTEND_IMPLEMENTATION_REPORT.md` بدل root path القديم.
- يتبع adapter pagination calls الحالية بدل signature قديمة بدون params.

هذا ownership/path repair وليس تخفيفًا للمتطلبات.

## التحقق المباشر ✅

run: `32242076538` / job: `96034634426`.

مرّ على:

- pre-boundary: 8 checks PASS.
- repository typecheck: PASS قبل apply وبعده.
- frontend production build: PASS.
- architecture gate: PASS.
- module boundary: PASS.
- post-apply API Query Utilities boundary: 8 checks PASS.
- API Phase 4: **7 checks PASS**.
- Frontend Phase 5: **4 checks PASS**.
- CSRF: **4/4 PASS**.
- Auth Cookie: **5/5 PASS**.
- API Security: **5 checks PASS**.
- Performance: PASS.
- Route Loading: PASS.
- Runtime Source: PASS.
- Global Student Journey: **12/12 PASS**.
- exact changed-file scope: PASS.
- remote-head verification: PASS.
- no force push.

## dependency state

- root install: 0 vulnerabilities.
- server install ما زال يظهر 17 إجمالًا (1 Low + 16 Moderate) في all-dependencies install output.
- server production security closure لا تتغير: Critical 0 / High 0 / Low 0، والمتبقي المعروف Sentry/OpenTelemetry moderate cluster يحتاج Sentry major migration منفصلة.
- لا `npm audit fix --force` ولا overrides عشوائية.

## checkpoint protocol

هذا checkpoint يغيّر اسم خطوة workflow فقط إلى `Verify API query utility boundary on source head` لتشغيل نفس executor مرة أخرى من commit بشري/غير-bot وإثبات:

- `ALREADY_APPLIED`.
- كل العقود PASS.
- zero runtime diff.
- `mode: NO_OP`.
- لا bot runtime commit إضافي.

وبعدها Standard Safety Gate هو دليل الحالة المجمعة.

## الاتجاه التالي

1. API clean no-op proof.
2. Standard Safety Gate على checkpoint الحالي؛ Vercel يصنّف منفصلًا إذا ظهر quota/rate-limit.
3. fresh repository audit بعد Store + API reductions.
4. مراجعة CI workflow trigger hygiene لأن PR #3 التراكمي يعيد تشغيل phase-specific workflows كثيرة عند كل synchronize.
5. عدم لمس `request`/CSRF/session/auth/cache تلقائيًا.
6. عدم استئناف Quiz business/security-sensitive decomposition لمجرد line-count.
7. إعادة ترتيب hotspots حسب coupling + product impact + change risk، ثم Production Readiness -> Freeze -> Full Safety Gate -> compare vs `main` -> explicit merge approval.
