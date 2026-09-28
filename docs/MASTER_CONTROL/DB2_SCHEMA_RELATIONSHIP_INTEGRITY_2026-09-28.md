# DB-2 — Schema & Relationship Integrity Evidence

Date: 2026-09-28
Baseline: DB-1 certified head `ff7ffb007edefb8016e4935b5dcf8e1e6a572355`
Plan: #300
Branch/PR: `chatgpt/db-architecture-hardening-plan` / #301

## Production read-only findings before DB-2 writes

Atlas production `almeaa` was queried read-only.

### Canonical identity duplicates
Zero duplicate identity groups were found for:
- SchoolMembership `userId + schoolId + role`;
- TeachingAssignment `schoolId + teacherId + classId + subjectId`;
- ParentStudentRelationship `parentUserId + studentUserId`;
- ReviewCard `userId + questionId`;
- SkillProgress `userId + pathId + subjectId + skillId`;
- LessonProgress `userId + lessonId`;
- non-empty QuizResult `submissionKey`.

### Relationship state
- users: 110
- groups: 24
- schoolmemberships: 11
- teachingassignments: 6
- parentstudentrelationships: 0
- reviewcards: 51
- skillprogresses: 777
- lessonprogresses: 13
- questionattempts: 20
- quizresults: 6

The 11 current SchoolMembership rows reference users/schools that no longer exist in current production data. They are stale historical/synthetic authority rows and are **not deleted by DB-2**.

TeachingAssignment inventory contains stale historical/synthetic rows as well; no destructive cleanup is performed without a provenance-safe cleanup rule.

### Legacy-to-canonical school migration
36 users currently carry a non-empty legacy `User.schoolId`.
- 29 point to a current SCHOOL group and have no canonical SchoolMembership for that school.
- 7 point to a school that no longer exists and are intentionally excluded from backfill.
- among the 29 valid candidates: 28 users are active and 1 is inactive.

This proves production school scope still relies heavily on the legacy fallback. DB-2 adds a dry-run-first idempotent migration; it does not silently flip authority during branch development.

### Parent authority
There are currently 0 canonical ParentStudentRelationship rows. Five parent users have non-empty legacy `linkedStudentIds` and therefore still use the documented compatibility fallback. The existing parent backfill remains dry-run by default.

### Historical learner evidence
- ReviewCard contains historical rows whose source question has since been removed. These are not blindly deleted because they may still represent learner review history.
- LessonProgress contains historical rows whose source lesson has since been removed. These are retained pending explicit archival semantics.
- 4 of 6 QuizResult records refer to a quiz no longer present, but all 4 contain `quizSnapshot`.
- No missing-quiz QuizResult was observed without its historical snapshot.
- all current QuestionAttempt user/question references resolve.
- SkillProgress includes historical skill identifiers that no longer resolve to the current taxonomy; they are retained until a taxonomy-history mapping is defined.

## Preventive fixes in DB-2

The generic admin School Access writers now validate before upsert:
- contract target is a current SCHOOL;
- membership user exists;
- membership role matches the user's platform role;
- inactive users cannot receive active membership;
- assignment school exists;
- class exists and belongs to the school;
- assignment target is a teacher;
- active teacher assignment requires an active teacher membership in the same school.

The checks are centralized in `schoolReferenceIntegrity.ts` so new admin writers do not drift from the canonical rules.

## Migration safety

`backfillSchoolMemberships.ts`:
- defaults to dry-run;
- validates current SCHOOL references;
- reports invalid legacy references rather than fabricating schools;
- refuses role/status conflicts;
- is idempotent through the canonical unique identity;
- tags inserted rows with `DB2_SCHOOL_MEMBERSHIP_20260928`;
- exposes explicit rollback dry-run / rollback apply;
- refuses rollback while active teaching assignments depend on the migration rows.

No production backfill is performed until exact-head CI is green and the dry-run remains conflict-free.

## DB-2 closure rule

DB-2 may be marked DONE only after:
1. exact-head typecheck/build + required CI are green;
2. dry-run output is reproduced against current production;
3. no approved runtime writer can create the identified school-reference orphan classes;
4. historical QuizResult integrity remains preserved;
5. any production apply, if performed, is additive/idempotent and followed by parity verification.
