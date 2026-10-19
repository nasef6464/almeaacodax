# School director assessment management — 2026-10-19

Status: IMPLEMENTED_LOCAL; exact-head CI, merge and matching published read-only verification pending.
Baseline: main41cbe0d81b7bfdea148eea05b0a211322dea2c95 (PR578). Branch: codex/director-assessment-management.

## Behavior
Existing cards now open the canonical UnifiedQuizBuilder under the actual school_admin role, with the selected school and its classes as targets. Scoped persistence uses the existing quiz PATCH; publication/hiding/copying reuse existing versioned lifecycle behavior. Published or attempted content stays protected; a private copy allows a separate editable definition without changing saved results. Legacy regular directed tests retain their mode. New private copies appear in their owning school before targeting.

## Authority
The optional schoolId is validated context for directors only. Every report, paginated learner/review, context, definition, command, clone and PATCH reloads current stored identity and membership/capability/module. Detailed evidence requires existing detailed-report capability. No stored primary school or permissions are changed. Default callers keep existing scope.
Private school drafts must match their owning school; legacy author-owned drafts retain primary scope. Reviewer reproduced a missing-binding200 instead of404; the regression now rejects definition and PATCH through B after A membership is revoked. Fresh A access and draft-list isolation are covered. Independent follow-up review found no remaining P1/P2.

## Verification
- Isolated HTTP/DB lifecycle: delegated school read/edit/publish/hide, locked content/copy, scoped learners, foreign audience rejection, read-only/revoked membership/module, unchanged saved result/primary school; private draft owner binding and list isolation PASS. Extended legacy regular-mode edit/publication, scoped reminder command and invalid scope rejection PASS. One fixture initially requested a reminder on an unpublished test and correctly received400; corrected to the published fixture before final PASS.
- Actual builder390/1280 PASS: canonical IDs, real role, scoped targets, injected persistence, no generic store write/platform publication.
- Card actions390/1280 PASS: edit/publish/hide, save error/retry, locked copy, read-only controls and explicit school propagation.
- Existing school context/workspace, editing, learners and release regressions PASS; frontend/server type checks and production build/PWA PASS. Existing workspace390/1280 PASS, including school-switch races, canonical creation and delegated-school report access.
- No production domain writes, new test accounts/memberships, provider requests, migrations or broad school/scale closure claimed.

## Delivery
Required CI must pass on final source SHA before merge. Production verification will open/cancel existing forms and read results only; isolated writes are not production write certification.

## First exact-head CI follow-up
Initial d37a883d CI exposed an outdated supervisor source assertion for the builder publication default and an unregistered additive definition GET. Updated the assertion to include the actual director role and registered that one authorized route in APPROVED_CONTRACT_EXTENSIONS; immutable baseline untouched. The new reminder HTTP assertion requires transactions; moved the test into the existing isolated replica step rather than standalone Mongo. Product code unchanged by these CI corrections. Local supervisor contract PASS; current architecture re-audit/gate preserves all preexisting generated artifacts byte-for-byte. Final source SHA must pass required checks.

## Published scoped proof
Finala7b619e7:23SUCCESS/6conditionalSKIP/all3requiredPASS; merge62d17cb7. Verceldpl_2yMbxZ25HZHVYiwPjfnxvnZhLdad productionREADY/main alias matches; API62d17cb78690 ready=true. All5main checksSUCCESS. Existing director login200/workspace200 (1school);14published views390/1280,52API reads,zero page errors/scoped failures/domain writes/provider calls. Read-only replay verifies scoped report/learner/context requests and publication/copy controls. Existing selected hidden test has saved outcome: editor correctly absent, copy offered. Actual editor/save and delegated second school writes proven isolated only; no new live fixtures/grants. Proof scratch/director-management-published-proof.json; postrelease docs retained locally for next focused batch.
