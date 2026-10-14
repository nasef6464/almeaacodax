# Database index and grading-read safety — 2026-10-14

Owner-authorized continuation from main `d2c54d5cf4bc09cbdfeddbc651fe81e3ddb51bf8`, branch `codex/database-index-safety`. Focus: two proven invalid indexes and unnecessary taxonomy reads during grading. No API/auth/scoring change, historical rewrite, index drop, paid infrastructure or production pressure.

## Current production evidence

Read-only Atlas connector confirmed the production `almeaacodax` project / `almeaa` cluster in AWS Singapore, Free tier, MongoDB 8.0.34. Local direct SRV lookup failed with ENOTFOUND; it was not treated as production evidence. The connector successfully inventoried six collections and 52 index descriptors, including learner results, skill evidence/aggregates and users. These indexes are retained. This is a scoped inventory, not a whole-database relationship or capacity certification.

Both `commandcenterworkflows` and `commandcenterdrafts` contained zero documents and lacked their declared `idempotencyKey` indexes. The existing definitions combine `sparse:true` and `partialFilterExpression`; Mongo 7.0.14 reproduced code67. MongoDB explicitly forbids that combination: https://www.mongodb.com/docs/manual/core/index-partial/ . The repair removes only sparse, retaining the original unique-string predicate and index name. Existing application automatic initialization will create the two intended indexes after publication; there is no manual create/drop/migration command. Both collections must be rechecked before merge. No records are deleted or rewritten.

## Read efficiency and behavior

Fixing the index specification alone left a literal-key lookup examining 1,006 documents. A small shared model hook adds the equivalent string-type eligibility condition to literal-string find/findOne queries while retaining every other filter. The real-Mongo regression now examines one document via IXSCAN, without a forced hint. It verifies optional/missing/null keys, duplicate rejection, eight competing inserts with one winner per collection, ordinary findOne lookup and a mismatching owner filter. This proves database uniqueness, not concurrent HTTP idempotent replay: existing create-after-find handlers can still return a conflict/error on a race.

Quiz submission previously loaded every Subject and Section. The real HTTP regression seeded 4,000 unrelated rows of each type and three relevant rows: the old reader returned 4,003 of each, whereas the new related-taxonomy helper returns three of each. Main/nested/legacy skills, quiz fallback labels, score100 and frozen persisted skill analysis remain identical to the full-reader reference. An empty resolved skill list causes no taxonomy reads. Existing skill/question resolution, pure mapping, result/attempt/scoring policies remain unchanged. Production currently has16subjects and161sections; this prevents catalog growth from multiplying work at every submission, without claiming a measured production latency saving.

## Validation and limits

Real-Mongo index creation and indexed lookup RED→GREEN; real HTTP grading/work regression RED→GREEN; server compilation PASS. Passing full-app fixture initialized77registered model definitions on isolated Mongo. Related metadata-context and side-effect contracts retain delegation/persistence checks; a preexisting stale side-effect assertion was updated to the existing dedicated progress module/bulk upsert implementation. The workflow executes both new regressions and both contracts.

Some local test starts failed with connection buffering timeouts during isolated setup, before HTTP grading. These logs are preserved; successful standalone runs are not used to infer production capacity. The durable HTTP regression runs the compiled server artifact, avoiding runtime source transpilation during database initialization; its final standalone run passed. CI builds that artifact before the regression. Final exact-head CI and bounded published verification are required. One fresh independent reviewer approved the source with no blocking findings and explicitly left concurrent command HTTP replay unproven.

Remaining PARTIAL/NOT PROVEN: unfiltered school roster above1,000; shared-network sensitive-action budget; long-lived/large-scale production concurrency, CPU/RAM and billed egress; full relationship/orphan review; command HTTP race replay. No production grading fixture is created by this slice. Source publication and actual index existence are recorded in the delivery receipt when available.
