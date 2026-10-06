# Performance And Speed Audit - BATCH 102

Date: 2026-05-22

## Current Findings

- Vite build passed after this batch.
- Largest build chunks observed: `spreadsheet` about 429 kB, `react-core` about 308 kB, `charts` about 304 kB, `math-rendering` about 259 kB, `PathsManager` about 246 kB, and editor about 207 kB before gzip.
- Existing code already lazy-loads route pages, admin dashboard modules, reports charts, `xlsx`, payment modal, file modal, and video player pieces.
- `CoursePlayer` remains behind `CourseView`; package marketplace page does not import `CoursePlayer`.
- Removed old Render preconnect from `index.html`; Hostinger/VPS should use its own domain or same-origin `/api`.
- `smoke:production-speed` passed functionally but reported timing warnings for frontend shell, API health, course list, and announcement ads.

## Safe Fixes Made

- Updated `smoke:performance` contract to assert migration-friendly API routing instead of hardcoded Render/Vercel coupling.
- Kept UI/design unchanged.

## Remaining Risks

- Large dashboards and admin managers remain heavy but are lazy-loaded.
- Full Lighthouse/browser performance pass on the owner domain should be run after DNS and production env are final.
- Docker image build was not run; only compose configuration was verified.
- Redis and backend warm-up should be revisited before claiming 10k-scale readiness.
