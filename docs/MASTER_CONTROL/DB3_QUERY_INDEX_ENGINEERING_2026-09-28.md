# DB-3 — Index & Query Engineering Evidence

Date: 2026-09-28
Baseline branch head before DB-3: `0d0a6e47635286ba200710d1df3331b243cc6512`
Plan: #300
PR: #301

## Atlas Performance Advisor
Production Atlas `almeaa` returned:
- suggested indexes: 0
- drop-index suggestions: 0
- slow query logs: 0
- schema suggestions: 0

Therefore DB-3 does not add speculative indexes or bulk-drop existing indexes.

## Production executionStats
Read-only `explain("executionStats")` was executed against representative critical shapes.

| Journey | Winning index | Returned | Keys | Docs | ms |
|---|---|---:|---:|---:|---:|
| ReviewCard saved/review list | userId+savedForReview+updatedAt | 9 | 9 | 9 | 7 |
| SkillProgress scoped next action | userId+pathId+subjectId+mastery+lastAttemptAt | 9 | 9 | 9 | 9 |
| QuestionAttempt recent learner evidence | userId+createdAt | 12 | 12 | 12 | 3 |
| QuizResult learner history | userId+createdAt | 1 | 1 | 1 | 2 |
| SchoolMembership school/role/status | schoolId+role+status | 1 | 1 | 1 | 1 |
| TeachingAssignment teacher/status/school | teacherId+status+schoolId | 1 | 1 | 1 | 3 |
| NotificationDelivery recipient/channel | recipientUserId+channel+createdAt | 1 | 1 | 1 | 2 |
| AiInteraction user history | userId+createdAt | 50 | 50 | 50 | 2 |
| PaymentRequest status queue | status+createdAt | 1 | 1 | 1 | 1 |

All nine winning plans used IXSCAN. No COLLSCAN was observed in these certified shapes.

## Proven index debt
Production `lessonprogresses` contains two indexes with the same key pattern `{userId:1,lessonId:1}`:
- canonical named unique index `user_lesson_unique`;
- duplicate `userId_1_lessonId_1`.

DB-3 aligns the Mongoose schema with the canonical existing index names so future index reconciliation does not create another name for the same compound key.

A dedicated cleanup script is:
- dry-run by default;
- limited to this exact collection/key/name pair;
- refuses action unless `user_lesson_unique` exists, has the exact key, and is unique;
- supports explicit rollback that recreates only the removed duplicate definition.

No production index is dropped while this branch is under development.

## Index-overgrowth rule
The database currently carries a relatively high index footprint. This plan does not infer that every single-field index is redundant. Removal requires a concrete query-shape/explain or Performance Advisor signal plus rollback. Exact key duplicates are handled separately because equivalence can be proven mechanically.

## DB-3 closure rule
- critical query shapes must remain IXSCAN/bounded;
- no speculative index additions;
- exact duplicates must have deterministic cleanup/rollback;
- required CI must remain green;
- post-merge production explain evidence must still match.
