# ALMEAA CODAX Exams Logic Handoff

Date: 2026-06-18

## Current Exam Types

- Regular exams: platform question-bank based quizzes used for training or normal tests.
- Mock exams: path-level simulated exams with sections, timing, and mock-exam layout.
- Directed exams: central quizzes sent by admin, school supervisor, or class supervisor to scoped students or groups.
- Self exams / Saher: student-created practice flow for the student only.
- Barcode public tests: public QR tests created from approved question-bank items.

## Creation And Targeting Map

- Regular exams are created from the admin quiz center and use existing question IDs.
- Mock exams are managed from the mock exam center and store `mockExam.enabled` with ordered sections.
- Directed exams use `mode: "central"` with `targetGroupIds` and/or `targetUserIds`.
- Saher remains a student self-practice flow and is not used to send tests to other students.
- Students only see directed exams that target their user ID or one of their group IDs.
- Quiz submission is checked again on the backend before saving results.

## Supervisor Rules

- School supervisor can create directed exams only for students/groups inside the school scope.
- Class supervisor can create directed exams only for students/groups inside the class scope.
- Supervisor can choose existing question-bank questions only.
- Supervisor cannot create, edit, or delete questions.
- Supervisor cannot open question center, skills center, or the standalone mock exam content manager.
- Supervisor sees directed quiz results through scoped reports only.

## Changes Completed

- Removed supervisor access to question create/update/delete API routes.
- Added backend guard for supervisor directed quiz targets.
- Scoped supervisor quiz list to owned or targeted directed quizzes.
- Limited supervisor quiz builder target groups/students to school/class scope.
- Hid question creation and auto-generation tools from supervisors in quiz builder.
- Hid question creation from supervisors in barcode test workflow.
- Kept admin and teacher question creation unchanged.

## Verification

- PASS: `npm run typecheck`
- PASS: `npm run build`
- PASS: `npm run server:check`
- PASS: `npm run smoke:reports-role`
- PASS: `npm run smoke:rbac-school-scope`
- PASS: `npm run smoke:quiz-access`
- PASS: `npm run smoke:quiz-client-security`
- PASS: `npm run smoke:quiz-integrity-guard`
- PASS: `npm run smoke:quiz-answer-exposure`
- PASS: `npm run smoke:mock-exams`
- PASS: `npm run smoke:barcode-public-tests`
- PASS: `npm run smoke:saher-skills`
- PASS: `npm run smoke:my-quizzes`
- BLOCKED data fixture: `npm run smoke:learning-quiz` expects production quiz `quiz_smoke_math_training_learning`, but that quiz is not present in the current Render API response.
- BLOCKED missing script: `npm run smoke:course-quiz-context` is not defined in `package.json`.

## Pilot Decision

Exam organization and supervisor permissions are Pilot Ready after the passing checks above.
The blocked learning-quiz smoke is an environment data fixture issue, not a supervisor permission regression.
