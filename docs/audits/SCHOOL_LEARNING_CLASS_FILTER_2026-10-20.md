# School learning material/class filter regression

Baseline main3b0655346e67b8e0de3fd5330e16540527125587; branch codex/learning-evidence-class-filter. Owner continuation of the approved subject-first school learning flow.

The teacher caller flattened all assignment classes without subject identity. The shared panel deduplicated those options without filtering and retained classId across subject/path changes. A valid teacher with material A/class A and material B/class B could select an invalid combination and receive the correct backend rejection.

Bounded correction: keep subjectId in teacher class options; filter matching/wildcard options before ID dedup; clear classId whenever material/path changes. Supervisor/director options without subject identity retain existing behavior. Backend scope, APIs, scoring, stored evidence and production data are unchanged.

Browser regression RED: actual math options included bio-class. GREEN390/1280 checks matching classes, wildcard access, shared-class dedup, material/path resets, and absence of stale class/material request pairs; retains previous source/race/error/retry checks. Independent read-only review has no actionable P1/P2. Frontend typecheck/build and exact-head CI/merge/published proof follow.

Final local UI390/1280,typecheck,production build and architecture gate PASS. Generated architecture artifacts preserved byte-for-byte. Independent review: no actionable P1/P2.

Published2026-10-20: PR581 source6dd06dac2d4630fb22799aa89f3bcf6b8851a959:17SUCCESS/5conditionalSKIP/all3requiredPASS; merge09d7a32afbc4c2a736b0616246bfa4473565452b. Automatic Render new_commit deploydep-dbbevdss728c73bc6dkg LIVE and Verceldpl_2g6C67jSipZX4hbu1mgfhitjoC6B READY main alias; API09d7a32afbc4 ready+scaleReady true. Published3roles20views390/1280,6different-material class-reset cases,138API reads,0JS/scoped failures/domain writes/provider calls. Central-school target settings were viewed without submission; no production data created. Existing current authorized accounts/school only; no full schools/concurrency certification claim. Four main checks passed; paced role retry pending after initial auth CSRF timeout during server rollout. Postrelease documentation remains local for next evidence batch.
Final main role retry39370439164 attempt2SUCCESS. All5main checks SUCCESS; bounded slice PUBLISHED_SCOPED. No required work remains for this regression.
