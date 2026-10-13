# Live sessions — flexible hosting first delivery

Status: IMPLEMENTED / local final checks and independent review PASS; exact-head CI/publication/runtime pending; not production-certified.
Baseline main7f1165b9; branch codex/live-sessions-flexible-hosting. Design10f2b6eb and plan d0c2d548 approved by owner; implementation approved with low-token/native preference.

Existing Activity requests, Lesson/Course content and integration settings reused. Added canonical LiveSession references, host metadata, Mongo transactional resource revisions/reservations, current audience/source visibility, guarded join/recording URLs and internal-only private-session notifications. Booking success is pending; server ID survives client hydration; actor switching rejects stale responses. Course live rendering and student/admin/teacher schedules use shared session identity. All four providers and teacher/platform/manual hosting choices are configurable. Per-teacher defaults supported; accounts are NOT represented as connected without authorization.

Verification scripts: test-session-booking-requests.ts (pure and isolated concurrent Mongo), test-live-session-access.ts, test-live-session-scheduling.ts, test-live-session-http.ts (actual local Express/JWT/Mongo transactions), test-live-session-ui.mjs and test-live-booking-ui.mjs (real Chromium mobile rendering/interaction). Existing booking/integration contracts pass. Final typechecks/build/CI/review receipts will be appended after completion.

No product dependency, media pipeline, financial transaction, entitlement/scoring change, production data write or history backfill. Mongo-memory runner is transient test tooling; pinned Mongo7.0.14 after Windows8.2.6 runtime crashes. StrictQuery matches production.

Known limits: manual links usable; teacher/platform host registration tracks scheduling and default capacity1, but real provider license/concurrency remains unverified without connection. No automatic vendor meeting creation/teacher OAuth in this first delivery. Existing unowned legacy live_conv_ lessons are withheld from learners pending ownership review, without deletion/backfill; previous external links cannot be revoked by source-only changes. Student requests preferred times; published teacher availability/instant self-booking and wide course/group notification fanout remain subsequent scope within the approved design. No production-scale or provider certification claim.

Next: finish exact-head CI and bounded publication journey; automatic provider plan needs authorized accounts.

Final local verification: frontend and API typechecks PASS; production build PASS (166 PWA entries); all four behavioral scripts PASS including Mongo/Express authorization races and host controls; all three Chromium suites PASS; existing booking5 and integration10 contracts PASS. Independent review rechecked and cleared its five findings. Evidence logs: scratch/live-final-{typecheck,server,behavior,ui,build}.log. TypeScript behavioral runner uses server tsx (same as CI), not raw Node strip-types because imports resolve .js to .ts.
