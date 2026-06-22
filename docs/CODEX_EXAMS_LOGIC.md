# ALMEAA CODAX Exams Logic Handoff

Date: 2026-06-22

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

## Unified Question Source (2026-06-22)

- `utils/exams/questionBankSource.ts` is now the shared, API-backed source for exam builders.
- It reads approved questions from `api.getQuestionsPaginated` (`/quizzes/questions`) and supports path, subject, section, skill, and search filters.
- `QuizBuilder`, `PublicBarcodeTestsManager`, and `MockExamManager` no longer consume the stale `useStore().questions` snapshot.
- Directed exams use the same `QuizBuilder` source and open as an unsaved form. Opening the builder no longer persists a zero-question draft.
- Normal, barcode, and mock exam saves are blocked when no real question IDs are selected.
- Supervisors can read and select approved questions, but question creation controls remain hidden. Backend question POST/PATCH/DELETE routes remain restricted to admin and teacher roles.

## Production Evidence (2026-06-22)

- Admin question center: 47 questions are present in the real bank.
- Admin normal builder, Qudrat path + quantitative subject: 9 approved questions are available.
- Admin barcode builder, Qudrat path + quantitative subject: the same 9 approved questions are available.
- Admin mock exam center: 9 approved path questions were verified from the shared bank; the mock source code was unchanged by the final directed-form follow-up.
- Supervisor directed builder, Qudrat path + quantitative subject: 9 approved questions are available, no add-question action is shown, save is disabled at zero questions, and becomes enabled after selecting a real question.
- Barcode live audit: admin workspace PASS on desktop and mobile with zero console errors and zero network 5xx. The public test route missed only the legacy audit minimum-body-length threshold; required selectors, layout, console, and network checks passed.
- Supervisor live audit: zero console errors and zero network 5xx on all checked routes. Two legacy text-expectation rows remain FAIL because the audit expects old wording.
- Production data blocker: both available supervisor fixtures currently report zero scoped students and zero classes. A supervisor-directed quiz cannot be validly targeted, approved, solved by a target student, or denied to a non-target student without changing school fixture data. No QA users/questions were added and no RBAC was weakened.

## Verification (Unified Source)

- PASS: `npm run typecheck`
- PASS: `npm run build`
- PASS: `npm run server:check`
- PASS: `npm run smoke:exam-question-source` (13/13)
- PASS: `npm run smoke:reports-role` (20/20)
- PASS: `npm run smoke:rbac-school-scope` (4/4)
- PASS: `npm run smoke:quiz-access` (18/18)
- PASS: `npm run smoke:quiz-client-security` (4/4)
- PASS: `npm run smoke:quiz-integrity-guard` (4/4)
- PASS: `npm run smoke:quiz-answer-exposure` (5/5)
- PASS: `npm run smoke:barcode-public-tests` (40/40)
- PASS: `npm run smoke:mock-exams` (9/9)
- PASS: `npm run smoke:saher-skills` (5/5)
- PASS: `npm run smoke:my-quizzes` (9/9)

## Decision (Unified Source)

The unified question-source fix is code-complete and deployed. Production is PASS for the real bank in normal, barcode, mock, and supervisor-directed builders, with supervisor question-bank RBAC preserved. The full directed student delivery/result journey remains DATA BLOCKED until a real student/class is linked to a supervisor scope and the normal admin approval step is performed.