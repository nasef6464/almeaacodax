# DB-5 — Consistency, Idempotency & Recovery Safety

Date: 2026-09-28
Plan: #300
PR: #301

## Production read-only duplicate audit
Current production returned zero duplicate groups for:
- pending PaymentRequest identity `userId + itemType + itemId`;
- non-empty gateway provider/event IDs;
- non-empty gateway provider/transaction IDs;
- AccessGrant idempotency keys;
- AccessGrant sourceType/sourceId identities;
- QuizResult submissionKey;
- AssessmentAttempt submissionKey;
- students with active SchoolMemberships in more than one school.

## Existing strong guards retained
Payment webhook events already reserve a unique gateway-event guard. Approved payment transition uses compare-and-set from pending. AccessGrant uses unique idempotency/source identities with duplicate-key recovery. QuizResult and AssessmentAttempt use unique sparse submission keys. ReviewCard/SkillProgress use unique upsert/replay-key semantics. Privacy erasure revokes authority and anonymizes operational identity before deleting the User, so retrying the lifecycle is safe.

## Fixed race: pending purchase
The old request flow checked for a pending purchase and then created one, leaving a race window. DB-5 adds a partial unique index on `userId+itemType+itemId` only while `status=pending`. The route catches duplicate-key races and returns the concurrently-created pending request as a conflict.

## Fixed race: cross-school transfer
The previous implementation was sequential across User, Group and SchoolMembership documents with no concurrency lock.

DB-5 now:
1. validates source, target and student;
2. recognizes already-completed target state as an idempotent retry;
3. compare-and-swaps the User only while `schoolId=source`, so one concurrent transfer wins;
4. updates source/target Group and Membership mirrors;
5. on downstream failure, conditionally restores the original User state and performs best-effort mirror compensation;
6. prevents a losing concurrent transfer from overwriting the winner.

The isolated race gate launches two competing transfers concurrently and requires one winner, one loser, exactly one active school membership, matching User school/class state, matching Group rosters, and an idempotent retry.

## Exit
DB-5 closes only when the executable isolated race gate and shared exact-head CI are green.
