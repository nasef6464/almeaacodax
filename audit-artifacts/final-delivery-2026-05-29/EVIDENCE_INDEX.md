# فهرس أدلة التسليم - 2026-05-29

## صور الفحص المحلي

- `local-admin-memberships.png`
- `local-admin-platform-integrations.png`
- `local-admin-ai-assistant.png`
- `local-admin-overview.png`
- `local-admin-paths.png`
- `local-admin-financial.png`
- `local-admin-users.png`
- `local-admin-groups.png`
- `local-admin-monitoring.png`
- `local-admin-settings.png`

## صور الفحص الحي قبل النشر

- `live-predeploy-admin-memberships.png`
- `live-predeploy-admin-platform-integrations.png`
- `live-predeploy-admin-ai-assistant.png`
- `live-predeploy-admin-overview.png`
- `live-predeploy-admin-paths.png`
- `live-predeploy-admin-financial.png`
- `live-predeploy-admin-users.png`
- `live-predeploy-admin-groups.png`
- `live-predeploy-admin-monitoring.png`
- `live-predeploy-admin-settings.png`

## ملفات نتائج آلية

- `local-admin-sweep-results.json`
- `live-predeploy-admin-sweep-results.json`
- `../admin-live-handoff/2026-05-29-admin-tabs-live-followup/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-29-admin-tabs-live-followup/SUMMARY.md`

## صور فحص حي لاحق

- `../admin-live-handoff/2026-05-29-admin-tabs-live-followup/overview.png`
- `../admin-live-handoff/2026-05-29-admin-tabs-live-followup/platform-integrations.png`
- `../admin-live-handoff/2026-05-29-admin-tabs-live-followup/ai-assistant.png`
- `../admin-live-handoff/2026-05-29-admin-tabs-live-followup/settings.png`

## فحص عملي بصري (مجموعات + مدارس + مستخدمين)

- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/SUMMARY.md`
- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/admin-deep-groups-schools-audit.json`
- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/groups-initial.png`
- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/groups-action-open.png`
- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/school-portal-initial.png`
- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/school-portal-action-open.png`
- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/users-initial.png`
- `../admin-live-handoff/2026-05-29-admin-deep-groups-schools/users-search.png`

## فحص داخلي آمن (نماذج وإجراءات)

- `../admin-live-handoff/2026-05-29-admin-internal-safe-flow/SUMMARY.md`
- `../admin-live-handoff/2026-05-29-admin-internal-safe-flow/admin-groups-schools-internal-safe-flow-audit.json`
- `../admin-live-handoff/2026-05-29-admin-internal-safe-flow/groups-home.png`
- `../admin-live-handoff/2026-05-29-admin-internal-safe-flow/groups-action.png`
- `../admin-live-handoff/2026-05-29-admin-internal-safe-flow/school-home.png`
- `../admin-live-handoff/2026-05-29-admin-internal-safe-flow/users-action.png`

## فحص ما بعد الإصلاح والنشر (School Portal Closure)

- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-final/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-final/admin-groups-schools-internal-safe-flow-audit.json`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-final/groups-home.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-final/groups-action.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-final/school-home.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-final/users-action.png`

## فحص متابعة لاحق (Continuation Live)

- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont2/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont2/admin-groups-schools-internal-safe-flow-audit.json`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont2/groups-home.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont2/school-home.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont2/users-home.png`

## فحص شامل تبويبات الإدارة (Continuation Full Sweep)

- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation/platform-integrations.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation/ai-assistant.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation/school-portal.png`

## فحوصات readiness والتكاملات

- `npm run smoke:health-readiness` (PASS)
- `npm run smoke:integrations-runtime` (PASS)

## قرار جاهزية الإنتاج - 2026-06-01

- `JUNE_01_PRODUCTION_READINESS_DECISION_AR.md`
- Vercel production recheck after delivery evidence update: `Ready`; latest post-push smoke verifies the expected commit from GitHub `main`.
- Script integrity recheck: 115 package scripts checked; no missing `node scripts/...` targets.
- `../admin-live-handoff/2026-06-01-admin-school-package-linkage-final/SUMMARY.md` - ربط باقات المدارس والمجموعات: PASS 7/7.
- `../ui-audit-exhaustive/2026-06-01-role-pages-final-readiness/SUMMARY.md` - صفحات الأدوار: PASS 20/20.
- `../ui-audit-exhaustive/2026-06-01-student-learning-final-readiness/SUMMARY.md` - رحلة الطالب: PASS 10/10.
- `../admin-live-handoff/2026-06-01-live-ai-final-readiness-v4/SUMMARY.md` - AI حي: PASS 6, REVIEW 2 بسبب Gemini quota 429 وfallback.
- `../admin-live-handoff/2026-06-01-live-ai-final-recheck-multikey-guard/SUMMARY.md` - AI حي بعد تقوية عقد تعدد المفاتيح: PASS 6, REVIEW 2 بسبب Gemini quota 429 وfallback.
- `npm run smoke:ai-config-bridge` - PASS 12/12، يتضمن تعدد مفاتيح المزود، failover، وفصل نجاح المزود الحقيقي عن fallback.
- `npm run smoke:admin-memberships-ai-closure` - PASS 6/6.
- `npm run smoke:payment-package` - PASS 8/8.
- `npm run smoke:security-rbac-phase6` - PASS 5/5.
- Postdeploy `npm run smoke:frontend:strict` - PASS 29/29, entry asset `index-zbtr9KJP.js`.
- Postdeploy `npm run smoke:health-readiness` - PASS.
- Handover scripts tracking fix: added the five `scripts/smoke-handover-*-contract.mjs` files that were referenced by `package.json` but not tracked.
- `npm run smoke:handover:all` - PASS.
- `../admin-live-handoff/2026-06-01-admin-mock-exams-final-check/SUMMARY.md` - admin mock exams live visual/functional check: PASS with REVIEW note.
- `../admin-live-handoff/2026-06-01-admin-mock-exams-final-check/mock-exams-admin-live.png` - live screenshot.
- `../admin-live-handoff/2026-06-01-admin-mock-exams-final-check/mock-exams-admin-live.json` - live DOM/state and console evidence.
- Focused mock exam checks: `smoke:mock-exams 9/9`, `smoke:quiz-access 18/18`, `smoke:my-quizzes 8/8`, `smoke:quiz-integrity-guard 4/4`, `smoke:quiz-client-security 4/4`.
- Script tracking recheck: 102 `node scripts/...` references, no missing targets and no untracked targets.
- Launch risk guard recheck:
  - `npm run smoke:api-security` - PASS 6/6.
  - `npm run smoke:csrf` - PASS 4/4.
  - `npm run smoke:auth-cookie` - PASS 5/5.
  - `npm run smoke:payment-providers` - PASS 7/7.
  - `npm run smoke:payment-tampering` - PASS 9/9.
  - `npm run smoke:production-audit` - PASS 9/9.
  - `npm run smoke:production-hardening` - PASS 5/5.
  - `npm run smoke:xlsx-safety` - PASS 16/16.
  - `npm run smoke:reports-role` - PASS 11/11.
  - `npm run smoke:rbac-school-scope` - PASS 4/4.
  - `npm run smoke:sentry-runtime` - PASS 5/5.
- In-app Browser visual check: `/admin-dashboard` loaded on production, no login redirect, admin/integrations/users signals visible in DOM.
- Vercel inspect logs: production Ready ويبني من GitHub `main`; استخدم logs كدليل commit المنشور بعد أي commit توثيقي لاحق.

## فحص مركّز التكاملات + مساعد الذكاء (Continuation 7)

- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-7/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-7/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-7/platform-integrations.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-7/ai-assistant.png`
- `npm run smoke:admin-memberships-ai-closure` (PASS)
- `npm run smoke:ai-config-bridge` (PASS)

## جاهزية عملية + إثباتات إنتاج حديثة (Continuation 8)

- `npm run smoke:real-usage-readiness` (PASS)
- `npm run smoke:frontend:strict` (PASS)
- `npm run smoke:health-readiness` (PASS)
- `vercel inspect almeaacodax.vercel.app` (Ready, fresh production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## جولة بصرية حيّة جديدة + إثباتات AI/Integrations (Continuation 9)

- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-9/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-9/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-9/platform-integrations.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-9/ai-assistant.png`
- `npm run smoke:admin-memberships-ai-closure` (PASS)
- `npm run smoke:ai-config-bridge` (PASS)

## تدقيق إغلاق نهائي (Continuation 10)

- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-10/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-10/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-10/platform-integrations.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-10/ai-assistant.png`
- `vercel inspect almeaacodax.vercel.app` (Ready, fresh production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## لقطة استقرار سريعة (Continuation 11)

- `npm run smoke:frontend:strict` (PASS)
- `npm run smoke:health-readiness` (PASS)
- `npm run smoke:sentry-runtime` (PASS)
- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## لقطة Runtime/Observability (Continuation 12)

- `npm run smoke:integrations-runtime` (PASS)
- `npm run smoke:health-readiness` (PASS)
- `npm run smoke:sentry-runtime` (PASS)
- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## تحقق مدمج جديد (Continuation 13)

- `npm run smoke:frontend:strict` (PASS)
- `npm run smoke:integrations-runtime` (PASS)
- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## فحص بصري مركز (Continuation 14)

- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont14/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont14/admin-groups-schools-internal-safe-flow-audit.json`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont14/groups-home.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont14/school-home.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont14/users-home.png`

## فحص ثبات بدون صلاحيات إضافية (Continuation 15)

- `npm run smoke:frontend:strict` (PASS)
- `npm run smoke:health-readiness` (PASS)
- `npm run smoke:sentry-runtime` (PASS)

## لقطة جديدة Vercel + Sentry (Continuation 16)

- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## لقطة جديدة Frontend + Vercel + Sentry (Continuation 17)

- `npm run smoke:frontend:strict` (PASS)
- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## لقطة جديدة Vercel + Sentry (Continuation 18)

- `npm run smoke:sentry-runtime` (PASS)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)
- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)

## جولة حيّة كاملة + Vercel/Sentry (Continuation 19)

- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-19/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-19/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-19/platform-integrations.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-19/ai-assistant.png`
- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## لقطة مباشرة جديدة (Continuation 20)

- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)
- `node scripts/smoke-sentry-live-proof.mjs` (PASS, status=202)

## جولة إدارة حيّة إضافية (Continuation 21)

- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-21/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-21/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-21/platform-integrations.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-21/ai-assistant.png`
- `npm run smoke:health-readiness` (PASS)
- `vercel inspect almeaacodax.vercel.app` (Ready, latest production target)

## سجل الفجوات الحقيقية (Continuation 22)

- `REAL_GAPS_REGISTER_AR.md`
- `live-real-gaps-probe-2026-05-30.json`
- تم تحويل الملاحظات العملية إلى فجوات حقيقية فقط: وضوح زر، وظيفة ناقصة، شاشة تحتاج تبسيط، أو حالة مقبولة وليست عطلا.

## نشر وإثبات ما بعد الإصلاح (Continuation 23)

- GitHub latest pushed commit: `44af1355`
- Vercel production deployment: `dpl_7EETRCrGiTz2eQhpgUc5nG9SYioz` (`Ready`)
- Production alias: `https://almeaacodax.vercel.app`
- Production HTML proof: `assets/index-GjGaWa4t.js`
- Postdeploy gap proof: `live-real-gaps-postdeploy-2026-05-30.json`

## إعادة تثبيت جسر AI (Continuation 24)

- `npm run smoke:ai-config-bridge` (PASS)
- `npm run smoke:admin-memberships-ai-closure` (PASS)
- `npm run smoke:integrations-runtime` (PASS)
- `vercel inspect almeaacodax.vercel.app` -> `dpl_5gTur5BX3KRPafYyJbEGG9zPgExh` (Ready)
- `node scripts/smoke-sentry-live-proof.mjs` -> `BLOCKED: Missing SMOKE_ADMIN_TOKEN`

## فحص بصري جديد + إغلاق التدفق الداخلي (Continuation 25)

- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-25/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-25/admin-live-handoff-audit.json`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-25/platform-integrations.png`
- `../admin-live-handoff/2026-05-30-admin-tabs-live-continuation-25/ai-assistant.png`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont25b/SUMMARY.md`
- `../admin-live-handoff/2026-05-30-admin-internal-safe-flow-live-cont25b/admin-groups-schools-internal-safe-flow-audit.json`

## ختم نهائي AI/Integrations Runtime (Continuation 26)

- `npm run smoke:ai-config-bridge` (PASS)
- `npm run smoke:integrations-runtime` (PASS)
- `npm run smoke:health-readiness` (PASS)
- `npm run smoke:admin-memberships-ai-closure` (PASS)
- `vercel inspect almeaacodax.vercel.app` -> `dpl_ARwx79KxJkSDK5UmpqTU1JYks6g4` (Ready)
- `live-ai-runtime-check-2026-05-30.json`
- `live-cont26-platform-integrations.png`
- `live-cont26-ai-assistant.png`

## فحص وصول مساعد الطالب (Continuation 27)

- `npm run smoke:student-learning-journey` (PASS)
- `live-student-assistant-check-2026-05-30.json`
- `live-cont27-student-dashboard.png`
- `live-cont27-student-assistant-direct-click.png`
- `live-cont27-student-qa-route.png`

## أوامر تحقق تم تشغيلها

- `npm run typecheck`
- `npm --prefix server run check`
- `npm run build`
- `npm --prefix server run build`

## AI Runtime Truth Sync (Continuation 34)

- `AI_RUNTIME_BLOCKER_AR.md`
- `live-admin-ai-provider-tests-cont34.json`
- `live-admin-ai-readiness-postfix-cont33.json`
- `live-student-ai-chat-postfix-cont33.json`
- `live-admin-ai-readiness-post-render-cont33.json`
- `live-student-ai-chat-post-render-cont33.json`
- Render deploy proof:
  - service: `srv-d7qtcr9o3t8c73cs32sg`
  - deploy: `dep-d8daiu0js32c73fcjv30` (`live`)
- `npm run smoke:ai-config-bridge`
- `npm run smoke:admin-memberships-ai-closure`
- `npm run smoke:health-readiness`
- `npm run smoke:frontend:strict`
- `npm run smoke:payment-package`
- `npm run smoke:batch136-admin-users-schools-parent-payment`

## Final Admin And Student Delivery Closure (2026-06-01)

- `JUNE_01_FINAL_DELIVERY_CLOSURE_AR.md`
- Production frontend smoke: `npm run smoke:frontend:strict` -> PASS 28/28.
- Health readiness: `npm run smoke:health-readiness` -> PASS.
- Payment/package contract: `npm run smoke:payment-package` -> PASS 8/8.
- Reports role contract: `npm run smoke:reports-role` -> PASS 11/11.
- XLSX safety contract: `npm run smoke:xlsx-safety` -> PASS 16/16.
- Performance/lazy-loading contract: `npm run smoke:performance` -> PASS.
- Admin visual tabs evidence: `../admin-live-handoff/2026-05-31-admin-tabs-final-after-5dffc7e5/`
- Admin UI gap evidence: `../admin-live-handoff/2026-05-31-admin-ui-gap-final-after-5dffc7e5/`
- Live AI runtime evidence: `../admin-live-handoff/2026-05-31-live-ai-runtime-final-after-5dffc7e5/`
- Student learning deep postdeploy evidence: `../ui-audit-exhaustive/2026-05-31-student-learning-deep-postdeploy-12d26857/`

## Student Course And Payment Closure (2026-06-02)

- Course tabs evidence: `../ui-audit-exhaustive/2026-06-02-student-course-tabs-live-a52ad041/`
  - Course syllabus: PASS.
  - Course tests: PASS; official course tests are separated from suggested subject tests.
  - Course files: PASS; empty state is scoped to the course and does not leak files from other content.
  - Category course cards: PASS; price, old price, instructor, student count, preview, and purchase actions are visible.
- Guest purchase guards evidence: `../ui-audit-exhaustive/2026-06-02-guest-course-purchase-guards-live-8e4ba865/`
  - Preview link opens the paid course page: PASS.
  - Guest purchase requires login: PASS.
  - Guest locked course test requires login: PASS.
- Student payment modal evidence: `../ui-audit-exhaustive/2026-06-02-student-payment-modal-live-v2-2ab8e5e5/`
  - Tested account: `student.d@almeaa.local`.
  - Tested course: `course_1779224794108`.
  - Payment intro opens: PASS.
  - Payment methods step opens: PASS.
  - No real payment request was submitted.
- Production frontend smoke after deploy: `npm run smoke:frontend:strict` -> PASS 29/29, production serving commit `2ab8e5e5`.

## Student Support And Session Booking Closure (2026-06-02)

- Arabic closure note: `STUDENT_SUPPORT_SESSION_BOOKING_CLOSURE_2026-06-02_AR.md`
- Commit deployed: `0a94707a` (`Persist student session booking requests`).
- Frontend deployment:
  - Vercel production alias: `https://almeaacodax.vercel.app`
  - `npm run smoke:frontend:strict` -> PASS 29/29.
  - Production served expected commit/version `0a94707a`.
- Backend deployment:
  - Render service: `srv-d7qtcr9o3t8c73cs32sg`
  - Render deploy: `dep-d8f5kjt53gjs739nh13g`
  - Status: `live`.
- Student support visual audit:
  - Evidence folder: `../ui-audit-exhaustive/2026-06-02-student-support-routes-live-post-session-booking-0a94707a/`
  - Result: PASS 7/7.
  - Covered routes: `/dashboard?tab=sessions`, `/book-session`, `/live-sessions`, `/qa`, `/my-quizzes`, `/reports`, `/plan`.
- Live persisted booking smoke:
  - Evidence folder: `../ui-audit-exhaustive/2026-06-02-student-session-booking-live-postdeploy-0a94707a/`
  - Result: PASS.
  - Verified `/activities/me` POST creates a `session_booked` activity and `/activities/me` GET returns it from the backend.
- Product note:
  - Student booking is now real backend persistence, not local-only UI success.
  - Remaining improvement: add a dedicated admin queue for reviewing and managing session booking requests; current proof stores and returns them as student activities.

## Admin Session Booking Queue Closure (2026-06-02)

- Commit deployed: `be1d060a` (`Add admin session booking queue`).
- Frontend deployment:
  - Vercel production alias: `https://almeaacodax.vercel.app`
  - `npm run smoke:frontend:strict` -> PASS 29/29.
  - Production served expected commit/version `be1d060a`.
- Backend deployment:
  - Render deploy: `dep-d8f67n5sichs73an7110`
  - Status: `live`.
- Evidence folder: `../admin-live-handoff/2026-06-02-admin-session-bookings-live-be1d060a/`
- Verified:
  - Admin API list for session bookings -> PASS.
  - Admin API status update -> PASS.
  - Admin live-sessions tab visual queue -> PASS by screenshot.
  - Student dashboard sessions tab now reloads persisted bookings from backend.

## Student Learning Progress Persistence (2026-06-02)

- Evidence folder: `../ui-audit-exhaustive/2026-06-02-student-learning-progress-persistence/`
- Verified:
  - Foundation/topic progress is calculated from visible completed lessons and completed quizzes, not a fixed demo zero.
  - Marking a lesson complete persists `completedLessons` through `/auth/me/preferences`.
  - Backend preferences endpoint now accepts and stores `completedLessons`.
- Checks:
  - `node scripts/smoke-student-learning-progress-contract.mjs` -> PASS.
  - `npm --prefix server run check` -> PASS.
  - `npm --prefix server run build` -> PASS.
  - `npm run build` -> PASS.
  - Production `npm run smoke:frontend:strict` -> PASS 29/29, serving commit `7c4a4d0e`.
  - Live persistence probe -> PASS; temporary completed-lesson marker was verified and removed.

## Course Quiz Context Access (2026-06-02)

- Evidence folder: `../ui-audit-exhaustive/2026-06-02-course-quiz-context-access/`
- Verified:
  - Course quiz links now carry course context.
  - Embedded course quizzes carry both course and course-lesson context.
  - `source=course` in the quiz page resolves access from the course lesson/assessment before falling back to global quiz access.
  - A quiz can remain reusable: free preview in one course, paid in another, and separately configured in the quiz center.
- Checks:
  - `node scripts/smoke-course-quiz-context-contract.mjs` -> PASS.
  - `npm run build` -> PASS.
  - `npm --prefix server run check` -> PASS.
  - Production `npm run smoke:frontend:strict` -> PASS 29/29, serving commit `fa4ab8d6`.

## Course File Access Control (2026-06-02)

- Evidence folder: `../ui-audit-exhaustive/2026-06-02-course-file-access-control/`
- Verified:
  - Course files now have per-course access: free preview or included with course purchase.
  - Backend route and database model both preserve course file access.
  - Admin course builder exposes the access choice for each course file.
  - Student course overview separates visible files from locked paid files.
  - Course player hides paid course files during preview unless the student owns the course/package or the viewer is staff.
  - Guest course cards no longer trust global `course.isPurchased`; a paid course shows preview + purchase, not learning access.
  - Guest direct `?learn=1` no longer opens an empty player when the course has no free preview lessons.
  - Admin course builder lets the manager choose which course lessons are free preview and which require purchase.
  - Guest preview boundary is enforced: the second preview lesson cannot continue into the third purchase-only lesson via Next or sidebar click.
- Checks:
  - `node scripts/smoke-course-file-access-contract.mjs` -> PASS 14/14.
  - `npm run typecheck` -> PASS.
  - `npm run build` -> PASS.
  - `npm --prefix server run check` -> PASS.
  - `npm --prefix server run build` -> PASS.
  - `npm run smoke:arabic-mojibake` -> PASS.
  - `npm run smoke:frontend:strict` -> PASS 29/29; production serves commit `1a904b9a`.
- Visual note:
  - Production screenshot: `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-course-description-a55f578f.png`.
  - Guest course card screenshot: `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-guest-course-cards-1a904b9a.png`.
  - Guest preview screenshot: `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-guest-paid-course-preview-1a904b9a.png`.
  - Guest purchase screenshot: `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-guest-paid-course-buy-1a904b9a.png`.
  - Guest direct learning URL screenshot: `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-guest-direct-learn-paid-course-ff2a72dd.png`.
  - Live two-preview-lessons screenshots:
    - `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-guest-two-preview-lessons-course-page.png`.
    - `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-guest-two-preview-lessons-player.png`.
  - Guest preview boundary screenshot: `../ui-audit-exhaustive/2026-06-02-course-file-access-control/live-guest-preview-boundary-locked-third-90799d7f.png`.
  - Purchase proof JSON confirms clicking purchase as guest redirects to `/?auth=login` and does not enter `learn=1`.
  - Direct learning proof JSON confirms paid course without preview lessons renders locked lesson list and purchase CTA rather than an empty player.
  - Two-preview proof JSON confirms course `course_1779224794108` now has 2 free preview lessons and 3 purchase-only items for guests.
  - Boundary proof JSON confirms the guest remains on the second preview lesson after Next/sidebar attempts against the third locked lesson.

## Course Admin Management Live Audit (2026-06-02)

- Evidence folder: `../admin-live-handoff/2026-06-02-course-admin-management-live-152158ae/`
- Verified:
  - Admin reaches `القدرات -> الكمي -> إدارة الدورات` on production.
  - The target course edit action opens the course builder.
  - The course builder exposes importing existing lessons and existing quizzes.
  - Course lessons/quizzes expose per-course preview vs paid access.
  - Course assessments and course files sections are present.
  - Quiz item settings open the course-scoped quiz modal, not the lesson builder.
  - Final proof recorded no blocking console errors or 5xx network failures.
  - Post-repair guest check confirms the target course card remains visible with purchase and preview actions.
- Visual evidence:
  - `../admin-live-handoff/2026-06-02-course-admin-management-live-152158ae/admin-subject-courses-list.png`.
  - `../admin-live-handoff/2026-06-02-course-admin-management-live-152158ae/admin-course-builder-curriculum-controls.png`.
  - `../admin-live-handoff/2026-06-02-course-admin-management-live-152158ae/admin-course-quiz-settings-modal.png`.
  - `../admin-live-handoff/2026-06-02-course-admin-management-live-152158ae/guest-course-card-post-admin-repair-2de284bb.png`.

## Course Tests Curriculum Visibility (2026-06-02)

- Evidence folder: `../ui-audit-exhaustive/2026-06-02-course-tests-curriculum-live-dd03ea3a/`
- Verified:
  - Course tests tab now reads both explicit course assessments and quiz lessons embedded inside the course curriculum.
  - The student sees `اختبارات الدورة والمنهج` instead of the old misleading "no official tests linked" message when course quiz lessons exist.
  - Missing linked quiz sources are not silently hidden; they appear with `رابط الاختبار يحتاج مراجعة` and a disabled `غير جاهز` action.
  - Ready linked quiz opens from the course tests tab with course context and course lesson context.
  - Files tab shows a clear empty state when the course has no directly uploaded files.
- Checks:
  - `node scripts/smoke-course-file-access-contract.mjs` -> PASS 18/18.
  - `npm run typecheck` -> PASS.
  - `npm run build` -> PASS.
  - Production `npm run smoke:frontend:strict` -> PASS 29/29; production serves commit `dd03ea3a`.
- Visual evidence:
  - `../ui-audit-exhaustive/2026-06-02-course-tests-curriculum-live-dd03ea3a/course-tests-tab-viewport.png`.
  - `../ui-audit-exhaustive/2026-06-02-course-tests-curriculum-live-dd03ea3a/course-ready-test-dom-click-viewport.png`.
  - `../ui-audit-exhaustive/2026-06-02-course-tests-curriculum-live-dd03ea3a/course-files-tab-viewport.png`.
- Remaining content action:
  - In admin, replace or repair the missing source for `اختبار موجّه جديد`; the platform now surfaces this as a clear admin/content issue instead of hiding it.

## Course Missing Guided Quiz Content Repair (2026-06-02)

- Evidence folder: `../ui-audit-exhaustive/2026-06-02-course-missing-guided-quiz-content-repair/`
- Closed the remaining content action from `2026-06-02-course-tests-curriculum-live-dd03ea3a`.
- Verified:
  - Existing production quiz `quiz_1777929187194_central` now has 4 approved question references.
  - The quiz is published, visible, and approved.
  - The target course still links the same quiz lesson in its curriculum.
  - General quiz access remains private, so the item is repaired for course context without making it broadly public.
- Checks:
  - `node scripts/smoke-course-file-access-contract.mjs` -> PASS 18/18.
  - Production API course/quiz check -> PASS.

## Absolute URL Path Redirect (2026-06-02)

- Evidence folder: `../ui-audit-exhaustive/2026-06-02-absolute-url-path-redirect-local-proof/`
- Closed the malformed in-app browser URL case where the app opens at a duplicated absolute URL path.
- Verified:
  - Same-origin absolute URLs pasted into the app path redirect to the intended internal route.
  - External absolute URLs pasted into the app path redirect to `/`.
- Checks:
  - `node scripts/smoke-route-loading-contract.mjs` -> PASS.
  - `npm run typecheck` -> PASS.
  - `npm run build` -> PASS.
  - Production `npm run smoke:frontend:strict` -> PASS 29/29, serving commit `6d9ca9c5`.
  - Production browser redirect proof -> PASS for same-origin `https://...` and browser-normalized `https:/...` path forms.
