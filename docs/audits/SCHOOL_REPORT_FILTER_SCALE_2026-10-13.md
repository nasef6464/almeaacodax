# Targeted school report coverage — 2026-10-13

Baseline: main `ba906e0ee2d297d013fb27bafde85d159ca091a3`; branch `codex/isolated-mixed-scale`. This continues the owner-approved database, privacy and server-use investigation. No production load, data migration, index repair, paid infrastructure or scoring change.

## Proven defect and bounded repair

An isolated Mongo fixture containing 10,000 learners and 10,000 skill aggregate rows returned no rows for the oldest learner or an older class of 100 learners. The reader selected the newest 1,000 authorized learners before applying the requested student/class filter. Existing aggregates were therefore omitted.

`resolveScopedStudents` now intersects the optional class/student selectors with the existing role authority inside Mongo before sorting, limiting and counting. `schoolSkillAggregateView` supplies those selectors. Persisted legacy `User.id` aliases retain precedence over native `_id`; query-local `strictQuery:false` preserves that intentional predicate without changing global configuration. No caller-supplied filter keys are accepted. Existing defensive filters, response fields and the global 1,000-learner cap remain.

The durable 1,100-learner regression reproduced RED and now passes: old learner/class coverage; selected scope counts; unchanged unfiltered cap/truncation; unauthorized and invalid selectors; contradictory student/class intersection; historical alias selection and native ID shadowing. It runs in the Student Data and Report Hardening workflow. Server compilation and the school aggregate/RBAC contracts pass. A fresh independent review approved the final source; its identity-compatibility concern was reproduced and fixed before approval.

## Measurement limits and separate gaps

Mixed grading/history/report pressure uses an isolated loopback app process and synthetic Mongo data. Setup failures are not capacity measurements: a fixture initially referenced the question's native ID instead of its canonical ID. A first unprepared run exceeded the 15-second timeout; its cause is not certified. A subsequent correctly seeded run reached HTTP 429 under the default shared-source sensitive-action budget. The measurement rerun changes only isolated environment limits (global 5,000/minute; sensitive 2,000/minute), leaving protection enabled. Production settings and school-network capacity were not verified or changed.

Mongo 7.0.14 rejects two preexisting index definitions: `CommandCenterWorkflow.idempotencyKey_1` and `CommandCenterDraft.idempotencyKey_1` combine `sparse:true` and `partialFilterExpression`, causing code 67. These are recorded separately; no production index operation occurred. The benchmark records their failures and measures the grading/report models only. It cannot certify the whole database.

Remaining NOT PROVEN: unfiltered school report completeness above 1,000 learners; 10,000 simultaneous learners; Render CPU/RAM capacity; billed bandwidth; long exams, AI and media traffic; production index inventory and safe repair. Automatic publication, exact-head CI and bounded read-only runtime proof are recorded in the delivery receipt when available.

## Completed isolated mixed measurement

Inventory: 10,000 learners, 20,000 historical results, 20,000 skill evidence records and 10,000 aggregates. One canonical math question, 50 actors, two consecutive profiles: 10 and 25 workers. 500 timed HTTP requests passed: 200 submissions, 200 history reads and 100 school reports. One separate warmup submission brings the new persisted results/evidence to201; evidence total20201. Scores100, one learner's cumulative totals24questions/20correct/6attempts and selected100-learner class coverage were checked.

At10workers, P95 submission/history/report:1826/318/544ms; child peakRSS198MiB, averageCPU0.707cores, event-loopP95105ms. At25workers:1817/651/670ms; peakRSS254MiB, averageCPU0.914cores, event-loopP95135ms. These are short, warmed synthetic profiles on this workstation; CPU/RSS cover the app child only, excluding Mongo and driver, startup/index initialization and warmup. Initial incomplete fixture lacked a canonical skill alias; its otherwise successful HTTP run was rejected by persisted-integrity assertions and excluded. Machine variability and test-only rate budgets limit comparison with production. Full numeric evidence: SCHOOL_REPORT_FILTER_SCALE_2026-10-13.json.

