# School assessment workspace — implementation checkpoint

Status: IN_PROGRESS. Branch `codex/school-assessment-workspace`, baseline `1bebcd4a58d44212177919411ef25d2ff2c72c51`.

The owner approved the existing inventory and authorized implementation. Named students, class membership and whole-school audiences must discover their assigned tests in the existing school-tests student area. Existing builders, discovery, retakes, notifications and scoring remain authoritative.

## First implemented slice

- Added protected `/api/school-assessments/:id/context` and `/report` reads. Fresh database principals, canonical school membership, active class/subject teaching assignments and existing school-director permission/module checks bound the context. Class-limited readers see only their intersection; full definition management additionally requires ownership and complete audience authority.
- Added Mongo-only full-audience latest-school-attempt summary. Personal training and anonymous evidence are excluded. No page-sized browser array supplies participation or grade totals. The summary returns no learner identities, question bodies or answers.
- Skills retain subject/hierarchy identity. Sections use frozen section results. Started/incomplete-session counts and historical mock subject totals are explicitly unavailable rather than fabricated. Experimental legacy-unknown results are excluded; no history is modified.
- Integrated the summary in the supervisor report with loading/error/retry and empty states. Existing paginated attempt/question inspection remains separately labeled.

## Verification evidence and limits

- Local isolated Mongo fixture:1005 target learners, latest-attempt replacement, foreign learner and personal-training exclusion, distinct same-ID subject skills, empty averages and denominators passed.
- Local report rendering and existing directed-scope/report-boundary contracts passed. Frontend and server typechecks passed.
- Independent read-only review identified teacher subject/class pairing and cross-subject skill grouping gaps; implementation and regression cases address them. Director authorization also reuses the existing permission/module authority.
- Six isolated HTTP GETs passed: named learner/class/school discovery, unrelated learner exclusion, scoped staff report access, unrelated staff404 and student403. Teacher class×subject mismatch, inactive teaching membership/assignment and director revoked permission/contract cases passed. New isolated scope/discovery/report tests are registered in the existing backend CI gate, using a uniquely named disposable loopback database. Final build/exact CI remain pending.
- Local test recovery: missing test dependency restored locally without manifest/lock changes; Mongo8.2 crashed with Windows illegal-instruction `0xC000001D`. Mongo7.0.14 executable recovered from the existing official archive fragment with decompressed size and CRC verification. No production database or infrastructure changes.

## Still required

Complete bank specification/AI-assisted composition, unified editing/cloning workspace, safe mutation after attempts begin, durable targeting/reminder/reopen/retake commands and replay evidence. Finish full normal/mock role journeys, exact-head CI and bounded automatic-release verification. No claim that the complete school module or production capacity is certified. No production writes/deletes/migrations, provider spend or manual previews.
