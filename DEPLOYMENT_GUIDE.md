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

## Still Needed For Large Launch

- Upgrade Render away from free cold-start behavior.
- Run measured load tests against 100, 500, and 1000 concurrent users before any 10k-user claim.
- Add queue-backed notification delivery before bulk messaging.
- Keep production secrets in Vercel/Render only, never in Git.
