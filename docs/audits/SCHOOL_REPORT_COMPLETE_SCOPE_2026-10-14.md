# Complete authorized school-skill report coverage — 2026-10-14

Baseline main `d41f3289eb194c6acb3411ca19d398dd927ff779`; focused branch `codex/school-report-complete-scope`. Owner-authorized database/report continuation. CI/publication pending at this source checkpoint.

The unfiltered report previously counted the authorized roster but only aggregated its newest1000 learners. A real1100-learner RED test observed sampledStudents1000 rather than1100. Targeted student/class selectors already worked and are retained. The report now reuses the same authority/selector builder, keeps the complete roster inside Mongo, deduplicates canonical `String(id || _id)` identities, joins evidence by indexed userId, and applies existing grouping/ranking and final result limit. Native-ID shadowing by stored aliases and the oldest-name winner for duplicate aliases are preserved. Other resolveScopedStudents callers retain their original500default/1000maximum; no global cap removal.

Scope DTO fields are retained: totalStudents and sampledStudents now cover the complete authorized roster and isTruncated=false. Row limits remain unchanged. Group/class averages, weighted mastery, historical multi-class row support/trend counts, distinct user counts, taxonomy resolution and teacher path/subject restrictions retain their formulas. Distinct identity sets are converted to counts inside Mongo before returning rows. No full roster or identity array reaches Node; the aggregate uses allowDiskUse for database-side working sets. Database work still grows with authorized users/evidence; this does not make large reports constant-cost or certify arbitrary concurrency. Existing database memory/document limits remain relevant beyond tested inventory.

## Measured index need

An isolated1100-row userId lookup initially examined1100 documents/0keys for one result. The new nonunique userId_1 index reduced that to1document/1key, without hinting. Full joined report executionStats on10001 authorized roster documents (10000 canonical identities) and11002 aggregate records used userId_1,0foreign collection scans,11002documents/keys examined,11001joined rows returned internally. The initial test expected11001documents examined; Mongo reported one additional examined document, so the checked budget is the actual11002-record inventory, rather than claiming exact once-only examination. No repeated full evidence scan per learner.

Read-only production baseline:4aggregate documents,4existing index descriptors, userId_1 absent. Existing indexes retained. Deployment may add the declared nonunique index through normal model initialization; no manual create/drop, migration, record rewrite, paid infrastructure or production pressure is part of this slice. A source rollback retains the harmless added index.

## Verification

- 1100-user targeted/full coverage and authority/contradictory/legacy selector regression PASS.
- User join index RED→GREEN:1100→1documents examined PASS.
- Isolated10000 initial learners,10001final roster after duplicate alias,11002aggregate rows: global topN includes older learners, all3groupings, null averages, historical multi-class rows, alias dedup/name and native shadowing PASS.
- Actual Express/JWT/Mongo HTTP7requests: admin/school_admin/class supervisor/teacher/parent/student/anonymous, expected200/403/401 PASS. Full report payload990bytes/2rows; evidence100005. One local full report3625ms; local HTTP large reports3893–5880ms. These are serial correctness observations on a busy workstation, not throughput/production P95.
- Server typecheck/build, adaptive phase8/10/11 contracts,20reports-role checks and4RBAC-school-scope checks PASS. Legacy smoke:saher-skills had2checksPASS/3FAIL: it reads old almeaacodax-k2ux deployment and fixed path/subject fixture returned0skills, plus string assertions expect old Quiz.tsx pool fragments. The smoke and Quiz/Results files have zero diff from baseline main; this is not evidence of a regression in the report repair. No fixtures/content were generated to force it green. The process also emitted a Windows libuv handle-close assertion after the failed legacy check. Whole schools/Saher certification is NOT claimed.
- Fresh whole-branch review approved without actionable blocker; reviewer independently ran aggregate contract/whitespace checks. Their isolated rerun lacked NODE_PATH runner; root behavior runs above supplied that path and passed. Exact-head CI and bounded published reads/index metadata remain the closure gate.

Production capacity, shared-source request budgets, comprehensive relationship/retention review and concurrent command HTTP replay remain PARTIAL/NOT PROVEN. This repair performs no production learning/result/grade writes.
