# Security Checklist

## Critical Access Rules

- Learners cannot unlock paid courses or packages through a direct purchase API.
- Quiz results must be generated through server-side quiz submission.
- Question correctness must be computed by the server.
- Access-code redemption must be atomic.
- Paid/free visibility is controlled from learning-space placement settings.
- Foundation topic paid/free visibility is controlled by the topic itself.
- Sensitive admin and blocked access events must be written to admin audit logs.

## Backend Middleware

- Helmet enabled.
- Compression enabled.
- CORS restricted to configured frontend/local development origins.
- Global rate limiting enabled.
- Auth, payment, AI, access-code, and quiz-submit routes have stricter limits.
- JSON payload limit reduced from 20mb to 10mb.

## Remaining Hardening

- Move from localStorage bearer-token reliance to a safer production token strategy.
- Add refresh token rotation and logout invalidation.
- Expand admin audit-log coverage to every admin mutation route.
- Add input validation review for every mutation route.
- Add dependency and secret scanning in CI.
- Verify `DEV_LOCAL_ADMIN_BYPASS=false` in production.
- Keep `DEV_LOCAL_ADMIN_BYPASS=false` in `.env.example`; local overrides stay local only.
