# Deployment Guide

Primary operational deployment notes live in `docs/DEPLOYMENT.md`.

## Current Production Targets

- Frontend: Vercel, `https://almeaacodax.vercel.app`
- Backend: Render, `https://almeaacodax-k2ux.onrender.com/api`
- Database: MongoDB Atlas
- Production branch: `main`

## Required Production Checks

Run these before pushing a release intended for students:

```bash
npm run smoke:deployment-cache
npm run smoke:load-tests
npm run smoke:monitoring
npm run smoke:database
npm run smoke:performance
npm run typecheck
npm run build
npm --prefix server run build
```

## Vercel Cache Rule

Do not use `Cache-Control: no-store` for all files. Vite builds hashed asset names, so Vercel should cache them aggressively:

- Built assets: `public, max-age=31536000, immutable`
- HTML shell: `no-cache, max-age=0, must-revalidate`

This keeps repeat visits fast while still allowing new deployments to be discovered.

## Load Test Gate

Use `load-tests/k6-platform-journey.js` against staging or production-like infrastructure before claiming high traffic readiness.

```bash
k6 run load-tests/k6-platform-journey.js \
  -e API_BASE=https://YOUR_RENDER_SERVICE.onrender.com/api \
  -e STUDENT_EMAIL=student@example.com \
  -e STUDENT_PASSWORD=StrongPassword123
```

For quiz-submit pressure, add `QUIZ_ID` and `QUIZ_SOURCE`.

## Monitoring And Slow Request Logs

Set these in Render:

- `REQUEST_LOG_LEVEL=normal`
- `SLOW_REQUEST_LOG_MS=1000`

Use `REQUEST_LOG_LEVEL=debug` only briefly when investigating a specific issue. Backend logs now emit structured `http_request` lines for failed and slow API requests without logging request bodies or secrets.

## Still Needed For Large Launch

- Upgrade Render away from free cold-start behavior.
- Run measured load tests against 100, 500, and 1000 concurrent users before any 10k-user claim.
- Add queue-backed notification delivery before bulk messaging.
- Keep production secrets in Vercel/Render only, never in Git.
