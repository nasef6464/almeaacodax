# Render cutover verification — 2026-09-17

Verified deployment topology for the ALMEAA platform:

- Repository: `nasef6464/almeaacodax`, branch `main`.
- Backend: Render service `almeaacodax-codex` in Frankfurt, auto-deploying from `main`.
- Frontend: Vercel project `almeaacodax`.
- Vercel `/api/*` proxy routes to the new Render backend.
- Production `/api/health` returned HTTP 200 with `ready: true`, `database: connected`, zero failed critical checks, and backend commit `81ca4e9ac299`.
- Response headers identify the origin as Render (`x-render-origin-server: Render`), confirming the Vercel production proxy reaches the new backend.
- The backend is on Render Free, so cold starts can occur. Login now performs a bounded GET health preflight before the single login POST to tolerate that startup delay without duplicating a sensitive POST.

No database migration or destructive data operation was performed during this cutover verification.
