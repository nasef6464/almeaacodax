# Teacher directed assessment discovery — 2026-10-09

Status: PARTIAL pending exact-head CI and matching production replay.

- Baseline main `cb4c49d5`; preceding supervisor/student/director delivery #493 remains verified.
- Actual teacher login: workspace200 and quiz200, but individually directed existing quiz `quiz_1791553976796_mmk8i` missing from workspace. Teacher has one assigned class with24 roster students. Evidence is untracked `scratch/teacher-directed-discovery-before.json`.
- Existing teacher reader now joins explicit school/class/student targets to validated active teaching assignments and the existing school-scoped roster. `teacherAssessmentClassIds.ts` derives only affected assigned classes. Visibility still requires published or teacher-owned/created; role guards, API shapes, questions, results, scoring and previous records remain unchanged.
- Same roster query and one projected assessment query, limit100, no question bodies, new polling, or additional database read. Assessment query follows roster resolution to avoid trusting unvalidated individual IDs. No scale claim.
- Real isolated HTTP regression covers assigned individual, school-wide, other class student, other school student, other school target, unpublished foreign assessment and own draft; visible rows must map only to the assigned class. Existing class/roster and hybrid-persona assertions retained.
- Local workspace and roster contracts PASS. Final typechecks/required CI and production UI evidence to be appended on completion. No new production test quiz, notification or account needed.
