# Teacher and supervisor interior audit — 2026-10-18

## Scope and baseline

Owner-requested continuation of PR575: inspect assessment creation, management, targeting, reports and their mobile states inside teacher/supervisor workspaces. Baseline main: `fd1dcde54f613230b9f8532f36482455bff05a10`. This batch changes documentation only; no application, API, RBAC, scoring or data semantics changes.

Each PASS below is bounded by its named test. It does not certify every school feature, production capacity or live AI quality. No production domain data was written. Mutation tests use disposable loopback Mongo replica sets; AI is disabled. Browser component tests use injected gateways, while separate HTTP tests exercise real application routes and persistence.

## Action closure matrix

| Page / button | API | Database | RBAC | Loading / error / success | Test | Result |
|---|---|---|---|---|---|---|
| Create from specifications | POST school-assessments/compose | Approved Question bank reads; no preview writes | Active assignment, subject, skill and class scope | Shortage blocks save; changed filters clear preview; retry | composition-http + composition-ui | PASS |
| Publish directed test | POST quizzes | Quiz and definition evidence | Staff scope; target learner discovers published test | Draft preview hydrates builder before save | subjects-http + editing | PASS |
| Edit definition / make independent copy | context, clone, PATCH quizzes/:id | New private Quiz; original evidence retained; optimistic write fence | Management permission reloaded from stored actor | Permission loading, denial, clone failure and retry | editing + management-ui | PASS |
| Update targeted class / students | POST :id/commands retarget | Quiz live audience + command receipt | Foreign target denied; current target catalog follows audience | Form preserved on failure; local state changes after await | commands-http + commands-ui | PASS |
| Remind absent learners | POST :id/commands remind | Transactional notification deliveries + receipt | Current authorized audience only | Pending guard, explicit count, repeat same lost-response identity | commands-http + commands-ui | PASS |
| Grant selected retake | POST :id/commands retake | Per-student QuizRetake + receipt | Student cannot issue command; scoped targets | Selected form retained; successful retry | commands-http + commands-ui | PASS |
| Reopen availability window | POST :id/commands reopen | Current availability; frozen definition retained | Fresh teacher/director scope revocation tested | Separate window dialog; awaited save | commands-http + commands-ui | PASS |
| Overall report | GET :id/report | Complete targeted denominator, latest school outcome | Foreign and self-study results excluded | Missing evidence explicit; empty scores not fabricated | report + report-ui | PASS |
| Material / skill / mixed-section analysis | GET :id/report; submit | Saved subject results and question evidence | Each subject retains its own section/skill breakdown | Mobile + desktop; partial evidence explicit | subjects-http + subjects-ui | PASS |
| Student results, search, filters and next page | GET :id/learners | Paginated latest outcomes and target roster | Fresh scope; foreign/parent/student denied | Old page replaced; identity change clears roster; retry | learners + learners-ui | PASS |
| View selected saved result | GET :id/results/:resultId | Selected frozen review only | Foreign result / self-study evidence denied | Detail failure/retry; filter clears selected result | learners + learners-ui + subjects-http | PASS |

`school-assessments/:id` prefixes are abbreviated in the matrix. Client ownership is `services/apiGroups/schoolAssessmentsApi.ts`; router ownership is `server/src/modules/quizzes/http/schoolAssessmentsRouter.ts`; policy is `schoolAssessmentManagementPolicy.ts`. UI command deduplication is `useSchoolAssessmentCommands.ts`; transactional operations and stored receipts are in `schoolAssessmentCommands.ts` and `schoolAssessmentCommandOperations.ts`.

The published definition edit fence is separate from correcting bank question content. These tests prove that structural edits cannot silently rewrite saved student evidence; this audit does not introduce a new bank propagation policy.

## Fresh execution

Six existing data/HTTP suites:

- `scripts/test-school-assessment-composition-http.ts`
- `scripts/test-school-assessment-commands-http.ts`
- `scripts/test-school-assessment-subjects-http.ts`
- `scripts/test-school-assessment-report.ts`
- `scripts/test-school-assessment-editing.ts`
- `scripts/test-school-assessment-learners.ts`

Six existing component/report suites:

- `scripts/test-school-assessment-management-ui.mjs`
- `scripts/test-school-assessment-commands-ui.mjs`
- `scripts/test-school-assessment-composition-ui.mjs`
- `scripts/test-school-assessment-subjects-ui.mjs`
- `scripts/test-school-assessment-learners-ui.mjs`
- `scripts/test-school-assessment-report-ui.mjs`

For five Playwright component suites, local scratch copies only set the installed Chromium executable path (1243); assertions and fixtures are unchanged. Report rendering runs directly. Data tests use the recovered MongoDB 7.0.14 binary via `MONGOMS_SYSTEM_BINARY`, without downloading another binary. Logs are local `scratch/interior-*`; no screenshots, credentials or database files are tracked.

The 1005-learner fixtures prove denominator completeness and pagination, not 1005 simultaneous users or production load readiness. Mock subject journey proves preview → publish → discovery → solve → material breakdown → reload → retake and normal-test compatibility.

The existing nine-part `smoke:teacher-supervisor-final-certification` contract bundle is also rerun. Navigation, teacher prepared questions, scheduler and other non-assessment interiors retain the previous full-stack evidence from [the exact PR575 source CI run](https://github.com/nasef6464/almeaacodax/actions/runs/39139624792), checked successful at `e63a39019e120534e03f78dce1a0fda53a57b94c`; these are not relabeled as freshly performed production writes.

## Limits and finding

No new product defect was demonstrated in the audited assessment actions. Existing safeguards and error recovery are retained. PR575 published mobile evidence remains in `SUPERVISOR_TEACHER_CALM_UX_2026-10-18.md`. Full school administration certification, external live-session integrations, production load tests and paid AI calls are outside this bounded review.

Fresh outcome: all 12 suites exited 0; the nine-part certification bundle exited 0. No failed suite and no application fix in this batch.
