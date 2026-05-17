# PROJECT STATUS

- Project: ALMEAA CODAX
- Last Update: 2026-05-17
- Active Batch: BATCH 17R - Auth Cookie Production Closure
- Status: Programmatically closed, production verification pending

## Delivered in this update
- Removed OAuth token payloads from Google callback URL (`oauth_token` / `oauth_user` no longer emitted).
- Frontend auth flow now defaults to cookie-first and no longer persists auth token in localStorage.
- Session profile persistence moved to sessionStorage (non-sensitive profile only).

## Checks
- `npm --prefix server run build` PASS
- `npm run typecheck` PASS (after one timeout retry)
- `npm run build` PASS
- `npm run smoke:auth-cookie` PASS (5/5)
- `npm run smoke:health-readiness` PASS

## Next Suggested Step
- Deploy to production and run live verification for BATCH 17R, then mark Fully closed.
