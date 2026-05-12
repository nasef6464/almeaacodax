# Production Readiness Report

## Current Status

The platform is an advanced MVP. It is usable for controlled pilots, but broad production launch should wait until the full hardening checklist is complete.

## Closed In This Sprint

- Disabled direct learner purchase unlock through `POST /api/auth/me/purchase`.
- Disabled direct quiz-result creation through `POST /api/quizzes/results`.
- Question attempts now calculate `isCorrect` on the server from the stored question answer.
- Access-code redemption now reserves usage with an atomic MongoDB update.
- Added baseline API security middleware: Helmet, compression, global rate limiting, stricter auth/payment/AI/quiz-submit rate limits, and reduced JSON payload limit.
- Added admin audit-log foundation for sensitive production events: payment-settings changes, payment-request reviews, admin user changes, blocked direct purchase attempts, and blocked direct quiz-result attempts.
- Updated the production env template so `DEV_LOCAL_ADMIN_BYPASS=false` by default.
- Tightened the learning-space paid/free foundation rule: foundation topics now use the topic's own paid/free flag, so explicitly free topics stay open for students even when other content is paid.
- Improved locked-content package choice: when a student opens paid content, the payment flow can now show multiple suitable package choices instead of a single generic package.
- Added server-side discount-code management: admins can create, pause, and review codes, payment requests calculate discounts on the server, store original/final amounts, and count redemptions only after admin approval.
- Hardened discount approval order: the server now verifies the buyer still exists and reserves the discount-code redemption before marking the payment request as approved.
- Students can preview discount-code validity and final amount from the payment modal before sending the payment request; the server still recalculates it when the request is created.
- Path package pages now include global membership-style packages that are not bound to one path.
- Admins can now create a global membership package from path package management. It is saved as `packageType=membership`, scoped to all content types, appears as a platform-wide purchase option, and unlocks content through the existing scoped package-access rules after approval.
- Manual payment requests now require review evidence before approval can unlock access. The server rejects approval without a transfer reference, wallet number, receipt, card note, or explicit admin evidence, and the admin UI disables risky approvals.
- Added a verified payment webhook foundation at `POST /api/payments/webhooks/payment`: it requires an HMAC signature, rejects mismatched amount/currency, stores gateway event/transaction data, prevents duplicate approval, and unlocks access only after the trusted gateway event is accepted.
- Polished the locked-content package choice flow: when several packages can unlock the same item, the student sees a wider comparison-style package picker instead of a cramped vertical list.
- Added a lightweight paid-content intro before payment methods so students first see a clear locked-content message and suitable package choices, then continue to payment details only if they choose.
- Fixed Vercel cache policy: hashed production assets now use long immutable caching, while the HTML shell only revalidates. This removes the previous `no-store` rule that forced browsers to redownload every JavaScript/CSS asset on every visit.
- Added `smoke:deployment-cache` so production cache headers cannot silently regress to a slow no-store configuration.
- Added a k6 load-test journey and `smoke:load-tests` contract so traffic readiness is measured instead of guessed.
- Monitoring Diagnostics Sprint - 2026-05-12: added structured backend request diagnostics for failed and slow API requests, configurable `SLOW_REQUEST_LOG_MS`, `REQUEST_LOG_LEVEL`, `MONITORING_AND_LOGGING_GUIDE.md`, and `smoke:monitoring`.
- Database Index Sprint - 2026-05-12: added MongoDB indexes for learning bootstrap, package discovery, payment review, discount codes, audit logs, AI metrics, groups, users, and announcement ads; documented the review in `DATABASE_REVIEW.md`; added `smoke:database`.
- Notification Foundation Sprint - 2026-05-12: added backend notification templates, delivery logs, in-app notifications, pending email/WhatsApp delivery records, admin APIs, provider-safe console mode, `NOTIFICATION_SYSTEM_GUIDE.md`, `WHATSAPP_INTEGRATION_GUIDE.md`, and `smoke:notifications`.
- Auth Recovery Sprint - 2026-05-12: added hashed email verification tokens, hashed password reset tokens, generic forgot-password responses, reset/verify/resend endpoints, notification-queued recovery messages, `AUTH_ACCOUNT_SECURITY.md`, and `smoke:auth-account`.
- External Notification Providers Sprint - 2026-05-12: added provider adapters for Resend email, generic email webhooks, WhatsApp Cloud API, generic WhatsApp webhooks, safe console staging mode, env documentation, and smoke coverage.
- Auth Frontend Recovery Sprint - 2026-05-12: added student-facing forgot-password, reset-password, and verify-email screens, linked password recovery from the login modal, and added `smoke:auth-frontend`.
- Auth Login Security Sprint - 2026-05-12: added password-strength enforcement, failed-login counters, temporary account lock after repeated failed attempts, reset-on-success behavior, frontend guidance, and `smoke:auth-login-security`.
- API Surface Hardening Sprint - 2026-05-12: tightened production CORS configuration, added request IDs to responses/logs/errors, added route-scoped body limits, hid production 5xx details, and added `smoke:api-security`.
- Runtime Source-Of-Truth Sprint - 2026-05-12: forced production frontend/runtime paths to use the real Mongo-backed API, limited legacy Firebase sync to local development only, blocked local admin bypass in production, and added `smoke:runtime-source`.
- NoSQL Injection Guard Sprint - 2026-05-12: added a backend request sanitizer that rejects Mongo operator keys and dotted keys in request bodies/query strings before route handlers, keeps rejected requests traceable with `requestId`, and added `smoke:nosql-sanitizer`.
- Public Shell Performance Sprint - 2026-05-12: the public landing/auth shell now renders without waiting for the heavy content bootstrap, delays public-page bootstrap until idle, and still blocks data-heavy routes such as dashboard, category, quiz, results, and admin until bootstrap is ready; `smoke:performance` now guards this behavior.
- Homepage Hero Management Sprint - 2026-05-12: added an optimized platform-study boy hero image, wired it as the default hero across frontend/backend/admin, added admin image upload with recommended dimensions and size guidance, added image alt text, forced homepage-settings reads to bypass browser cache, and added `smoke:homepage-hero`.

## Still Required Before Large Launch

- Connect the webhook foundation to the final payment provider contract and live provider dashboard.
- Cookie-based session hardening or safer refresh-token strategy.
- Optional Google/OTP providers and Redis/BullMQ automation for bulk delivery retries.
- Full RBAC and tenant-scope audit.
- External monitoring/Sentry, uptime checks, MongoDB slow-query dashboards, and a richer audit-log UI.
- Real load-test execution at 100, 500, and 1000 concurrent students with Render/MongoDB metrics recorded.
- Automated offsite backup and tested restore workflow.

## Launch Recommendation

Use a staged rollout:

1. Internal admin/teacher validation.
2. 20-student pilot.
3. 100-student pilot.
4. Load test and observe bottlenecks.
5. Production launch after reports are clean.
