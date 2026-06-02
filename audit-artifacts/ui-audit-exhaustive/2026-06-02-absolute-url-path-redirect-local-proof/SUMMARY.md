# Absolute URL Path Redirect Proof - 2026-06-02

## Scope

- Current browser symptom: the app was opened at a duplicated absolute URL path such as `/https://almeaacodax.vercel.app/`.
- Risk: BrowserRouter can treat that as an unknown internal route, producing a confusing app state and bad canonical metadata.

## Fix

- Added `AbsoluteUrlPathRedirect` in `App.tsx`.
- Same-origin absolute URLs pasted into the app path now redirect to the intended internal path.
- External absolute URLs pasted into the app path redirect to `/` instead of leaving the user on a malformed internal route.

## Verification

- `node scripts/smoke-route-loading-contract.mjs` -> PASS.
- `npm run typecheck` -> PASS.
- `npm run build` -> PASS.
- Production `npm run smoke:frontend:strict` -> PASS 29/29, serving commit `6d9ca9c5`.
- Local built preview proof:
  - `http://127.0.0.1:4173/http://127.0.0.1:4173/course/course_1779224794108?tab=tests`
  - redirected to `http://127.0.0.1:4173/course/course_1779224794108?tab=tests`.
  - `http://127.0.0.1:4173/http:/127.0.0.1:4173/course/course_1779224794108?tab=tests`
  - redirected to `http://127.0.0.1:4173/course/course_1779224794108?tab=tests`.
  - `http://127.0.0.1:4173/https://external.example/path`
  - redirected to `http://127.0.0.1:4173/`.
  - `http://127.0.0.1:4173/https:/external.example/path`
  - redirected to `http://127.0.0.1:4173/`.
- Production browser proof:
  - `https://almeaacodax.vercel.app/https://almeaacodax.vercel.app/course/course_1779224794108?tab=tests`
  - redirected to `https://almeaacodax.vercel.app/course/course_1779224794108?tab=tests`.
  - `https://almeaacodax.vercel.app/https:/almeaacodax.vercel.app/course/course_1779224794108?tab=tests`
  - redirected to `https://almeaacodax.vercel.app/course/course_1779224794108?tab=tests`.
  - `https://almeaacodax.vercel.app/https://external.example/path`
  - redirected to `https://almeaacodax.vercel.app/`.
  - `https://almeaacodax.vercel.app/https:/external.example/path`
  - redirected to `https://almeaacodax.vercel.app/`.

## Result

- The malformed URL state shown in the in-app browser is handled by the frontend router.
