# Courses/packages repair evidence — 2026-10-11

Status: IN_PROGRESS. Owner explicitly requested repair of twelve confirmed audit findings. Baseline main `4e1bd10b06159a686d80285b973e3114d6c71c7a`; branch `codex/courses-packages-repair` in existing isolated linked worktree. This is a defect repair, not whole-product certification.

Spec and original evidence: `COURSES_PACKAGES_END_TO_END_AUDIT_2026-10-11_AR.md`; original private scratch receipts remain preserved. Scope: F01 protected bootstrap, F02 expired/revoked grant provenance, F03 premium expiry, F04 canonical pricing, F05 recoverable fulfillment, F06 official Tap hash, F07 captured amount/currency/charge binding, F08 stale actor enrollment, F09 direct-course quiz, F10 exact certificate completion, F11 lesson navigation loop, F12 callback transitions.

No production data writes, real payments, price changes, historical cleanup, content-bank creation or manual previews are authorized by this repair. Existing successful classroom and student-plan production trials are reused and not repeated. New isolated behavioral tests must preserve normal paid/free/sale-price journeys. Required exact-head checks and published read-only verification are pending.

## Verification ledger
- Access batch implementation: `8b72deb09c6ca76427e01fc93a2d2426d5ae48f2` plus compatibility fix `81453e8b9378307e987ce929251f65dbd9567acd`; 32 behavioral cases PASS and 6 focused discussion/admin compatibility cases PASS, final API TypeScript PASS. Original 32 cases were not replayed after the focused fix. Independent task review and scoped re-review approved. Initial actual route/Mongo reproduction had 13 failures; auth projection and comprehensive scope regressions each reproduced before repair. Historical arrays and expiry fields unchanged; effective authorization is a read projection. Existing source-contract assertions need relocation to the shared policy and exact completion guard.
- Commerce batch: `110555e3` locally verified with 33 behavioral cases PASS and API TypeScript PASS; independent spec PASS / quality approved. Signed Tap fixtures, amount/currency/charge binding, callback races, failure injection, concurrent discount/subscription application and legacy reconciliation exercised actual isolated routes/Mongo. The final two terminal-status cases explain 31 → 33; completed access cases were not replayed. No real provider call or payment. Exact-head required CI and published evidence remain pending.
- Frontend batch: pending implementation and independent review.
- Integration and exact-head required CI: pending.
- Bounded published guest bootstrap, canonical offer presentation and public-preview URL stability: pending.
- Real Tap sandbox capture/settlement: NOT PROVEN; isolated signed callback fixtures are not provider certification.
