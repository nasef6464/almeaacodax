# Database relationships and retention — bounded read-only audit

2026-10-14; baseline main `7861e34d26f5064acce724367363842fea3ff4aa`. Current production Atlas `almeaa` was inspected without record/index writes. This is an evidence refresh of DB-2 and the existing privacy retention matrix, not a cleanup, backfill, account-erasure run or whole-database certification. Source/CI publication of this report is pending at this checkpoint.

## Canonical relationships

| Collection | Read rows / active | Duplicate identities | Missing references |
| --- | --- | --- | --- |
| SchoolMembership |113 /112|0|11 missing users;11 missing schools, all flagged active |
| TeachingAssignment |14 /14|0|3 missing teachers;3 missing schools;3 missing classes, flagged active |
| ParentStudentRelationship |6 /6|0|0 missing parents/students |

The11 missing membership references match the previously documented historical/synthetic gap in DB-2 (2026-09-28). Teaching staleness was documented there without an exact count;3 is the current measurement, not a previously certified count. These are counts per predicate, not distinct-record totals to add together; provenance of individual rows was not re-certified. No cleanup was performed. Resolved references have zero observed role/type mismatch, and teaching classes have zero observed parent-school mismatch. Active rows have zero references to a user explicitly marked isActive=false; absent users are reported separately. This does not certify authorization on every reader or prove complete lifecycle/transfer concurrency.

## Historical evidence

27 quiz results:9 have no current source quiz, all9 have an object-valued quizSnapshot;0 missing-source results lack an object snapshot. Snapshot content/reconstruction was not tested. Of400 review cards,27 reference a missing current question; of18 lesson progress rows,17 reference a missing current lesson. Missing current content does not make durable learner history disposable. No result/progress data was changed.

## Retention findings

| Collection | Rows examined | Older than30days within rows examined | Expiry observation |
| --- | --- | --- | --- |
| AiInteraction |1001 capped sample|404|550 date-valued retentionUntil,451 without a date;0 expired date-valued entries in this sample |
| ClientEvent |52|52|no expiry field/index declared by current model |
| NotificationDelivery |136|71|no expiry field/index declared by current model |
| AdminAuditLog |656|593|no expiry field/index declared by current model |
| LiveExamSession |0|0|source declares updatedAt TTL86400seconds |
| AiQuestionAssistCache |0|0|source declares expiresAt TTL0 |

The AI sample is not the total collection inventory or a random sample. Oldest observed AI record is2026-05-03; there are legacy rows without expiry dates. Current ai.routes writer sets retentionUntil30days ahead; source AiInteraction declares TTL0. A retentionUntil index name/key was observed, but the connector's index tool and indexStats output did not expose expireAfterSeconds. Runtime TTL options/cleanup execution remain NOT PROVEN. Two empty-collection index metadata calls and one AdminAuditLog metadata call returned connector internal errors; all three collections exist in the111-collection inventory. Native metadata fallback tried the prior configured local URI selection and alternate process-only DNS resolution, but three attempts failed ENOTFOUND. This is a local metadata-access limitation, not evidence of a production database outage; bounded connector data reads succeeded. No configuration, index, cleanup or service was changed to conceal this gap.

The existing privacy lifecycle service revokes school/parent/access authority and clears operational identity fields, while preserving academic/payment/audit evidence. Existing static contracts pass, but no production account was erased and free-text/metadata anonymization completeness was not certified. Financial, academic, audit, notification and telemetry durations remain policy decisions under PRIVACY_DATA_LIFECYCLE_RETENTION_MATRIX.md. Do not infer a new approved deletion window from the30day diagnostic age bucket or the existing AI writer.

## Method and checks

15 data aggregations, each starting with limit1001, on sequential live reads; no transactionally consistent snapshot. Source counts below1001 did not reach the cap at query time;1001 means capped/possibly incomplete. Foreign identity resolution matches native ObjectId converted safely from the reference OR the legacy id, returns at most1 projected foreign row and exports only counts. Duplicate keys use the canonical model identities. Group roles/types and class parent links are checked only after resolution. The foreign limit bounds returned rows, not documents examined; this is not a query-plan or production-scale benchmark. No names, emails, tokens, prompts or row identifiers were exported in the report. Reproducible aggregation pipelines/results are retained in the adjacent DATABASE_RELATIONSHIPS_RETENTION_2026-10-14_QUERIES.json ledger.

Five existing static contract commands PASS: DB-2 references, DB-4 growth budgets, privacy lifecycle, school relationship status boundary, and nine student result/skill integrity checks (13 assertion groups total). No runtime behavior was changed; no database pressure test, migration/backfill, account lifecycle action, new TTL duration or automatic cleanup was run. Focused evidence PR and exact-head required CI remain the publication gate for these documents.

## Next bounded decisions

1. Reconcile provenance of stale authority rows before any scoped deactivation/cleanup proposal; protect canonical tombstones and legacy compatibility.
2. Verify full TTL index options with an authorized metadata path; do not drop/recreate an index from partial metadata.
3. Approve operational retention durations and preview counts before implementing a bounded cleanup/anonymization policy. Preserve academic, financial and audit evidence; treat free-text independently from userId clearing.
4. Measure actual server resources, database connections, bandwidth/billing and capacity separately. Concurrent command replay and legacy Saher smoke remain separate known gaps.
