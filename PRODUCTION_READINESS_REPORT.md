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

## Still Required Before Large Launch

- Connect the webhook foundation to the final payment provider contract and live provider dashboard.
- Cookie-based session hardening or safer refresh-token strategy.
- Email verification, forgot password, and optional Google/OTP providers.
- Queue-backed notifications for bulk delivery.
- Full RBAC and tenant-scope audit.
- Monitoring, structured logs, uptime checks, and a richer audit-log UI.
- Load testing at 100, 500, and 1000 concurrent students.
- Automated offsite backup and tested restore workflow.

## Launch Recommendation

Use a staged rollout:

1. Internal admin/teacher validation.
2. 20-student pilot.
3. 100-student pilot.
4. Load test and observe bottlenecks.
5. Production launch after reports are clean.
