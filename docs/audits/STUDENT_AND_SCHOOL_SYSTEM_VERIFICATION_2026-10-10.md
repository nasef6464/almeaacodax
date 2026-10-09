# Current student and school assessment verification — 2026-10-10

Status: PARTIAL. This is a bounded production audit, not certification of the whole platform.
Baseline runtime/main: 71359ae319ed698d794867adbb5528e590d94e01. Branch: codex/student-system-certification.

## Actual production evidence
- 11 current audit checks PASS: fresh student/supervisor sessions, prior saved score40/5questions and exact owned review, canonical progress21rows in4path/subject scopes, supervisor outcome parity, student school-analytics403, dashboard/reports/plan/history/mock hub/result pages1280/390 without horizontal overflow and browser errors0.
- One private mock was created for one existing authorized audit student, using three existing approved canonical question IDs: biology/math/chemistry. No bank, question, verbal path or public assessment was generated. Existing records were preserved.
- 8 mock checks PASS: persisted3sections/3questions/1target, autosave survives reload with same attempt, saved2correct/3 and stored score67, section scores100/0/100, exact review6main/subskill rows, supervisor same outcome, persisted section analytics, new attempt in actual mock-history UI, desktop/mobile result without overflow.
- 6 fresh post-submission checks PASS: oldscore40 preserved and new result accessible, three subject analyses with math mastery0/correctCount0/questionCount1, canonical skill evidence for all three subjects, subject-scoped readiness and next actions for each subject, no official Qiyas score claim.
- 1 actual lesson completion persistence check PASS: one existing canonical quantitative lesson completed by the audit account; after fresh login completedLessons0→1, prior evidence preserved. This is API persistence proof, not full video consumption or completion-to-weekly-plan UI certification.
- Total:26 bounded live checks PASS. Private details/screenshots/credentials remain in untracked scratch. Main runtime was not changed by this audit.

## Verification tooling findings
- First result-detail probe used id instead of the actual _id response field. Corrected harness; owned detail200. Invalid URL failure retained, not classified as a valid-user product failure.
- Mock probe initially assumed all questions render a textual quiz-current-question node. Math question is image-based; after matching the actual canonical image and checking persisted answers, the same mock and attempt completed. No second fixture was created.
- Post-mock probe initially used score for skill rows; canonical schema uses mastery/questionCount/correctCount. Corrected assertion, retained first failure.
- Learning progress contract still expected an inline obsolete preferences schema. Updated it to check actual imported bounded authSchemas and unchanged persistence handler; all5checks PASS.
- Weekly-plan presentation boundary remains FAIL: Reports.tsx3025lines exceeds original guard2710. Child panel68lines and other4checks PASS. Gate was not weakened. This is a modularity debt, not evidence of failed saved results.
- Existing student-learning catalog smoke7checks PASS, but allows absent published Foundation training quiz and skips actual runner/retry in that case. For top_quant_main_quant_01, no linked published training quiz was observed. This must not be reported as an executed complete Foundation→training→retry journey.

## School closure matrix (requested assessment scope)
| Page / action | API | Persisted data | RBAC | Loading/error/success | Test | State |
|---|---|---|---|---|---|---|
| Student previous result/review | quiz-results/my and exact result | score40 retained | owned detail200 | loaded actual review | current API/UI | PASS |
| Student dashboard/reports/plan | existing scoped reads | canonical skill progress | student session | actual pages loaded, no pageerrors |1280/390 | PASS for read/display only |
| Complete one lesson | auth/me/preferences | completedLessons0→1 after new login | own audit user | response200 | actual write/new read | PASS for persistence |
| Private multi-subject mock | quizzes create + runner/submit |3sections/3answers/1result | one explicit audit target | autosave and result visible | actual browser/API | PASS bounded flexible mock |
| Mock resume | live-exams/progress/session | same assessmentAttemptId | owned session | answer survives reload | actual browser/API | PASS |
| Mock history | quiz-results/my | saved current attempt | own student | history card visible | actual UI | PASS for sampled history |
| Subject skill progression | skill-progress/readiness/next-best-action |6saved main/sub rows + canonical projection | three subject scopes | responses200 | fresh login/API | PASS bounded sample |
| Supervisor directed outcome | results/scoped/section-analytics | same score/sections | scoped staff + student403 | reads200 | current API | PASS |
| Teacher/director relation and school assessment discovery | existing school-workspace/director reads | active assignments/membership | prior real scoped403 evidence | prior actual UI | #493/#494/#496 evidence reused | Previously VERIFIED; not repeated |
| Full school CRUD/parent/payment operations | existing domain APIs | not changed | existing gates | outside this assessment slice | not repeated | NOT RUN this slice |

## Remaining honest gates
1. Required CI for verification-tool correction on its exact commit.
2. Fix Reports hotspot without raising the original size guard; preserve layout and scope.
3. End-to-end completion-to-plan credit, actual Foundation drill/retry for a published canonical training asset, all previous attempts/pagination, strict timed mock section locking/expiry, and full four-science-subject mock still NOT PROVEN by this audit.
4. Approved question reads for current supervisor/path/physics returned no scoped candidate; this is an observed availability gap for the audit, not a count of the global physics bank. Do not silently substitute another subject.
5. Existing directed windows/selective retakes/teacher report actions/individual school aggregate context remain prior documented open scope. No historical grade or cutover changed.
6. Previous24APIclients/360answers persistence evidence retained. Full physical tablets/comfortable latency/complete billable bandwidth remain NOT PROVEN; not re-run here.

## Private evidence locations
scratch/student-system-current-audit.json; student-multi-subject-live.json; student-post-mock-progress.json; student-lesson-completion-live.json. First failures retained separately. Production test fixture/result remain scoped to audit accounts, with canonical IDs and history intact.

## Required CI infrastructure recovery
Both required Mongo suites failed twice before checkout due Docker Hub anonymous pull rate limits. The isolated suites now use the official Docker Mongo7.0 image from its ECR Public mirror, pinned to verified Linux amd64 manifest sha256:494b956596706b19ba44908cb9d03648b585214600987b86cd2a34249358e572. ECR manifest read200; no production database or test health/suite gate changed. All three affected Mongo service workflows share the pin. Exact-head CI remains the proof of container startup and suite execution. [Official mirror provenance](https://aws.amazon.com/blogs/containers/docker-official-images-now-available-on-amazon-elastic-container-registry-public/).

## Proved strict-mock start defect and bounded correction
A second private2question/2section fixture, directed only to audit student02, preserved the actual default randomizeQuestions=true. Three fresh browser contexts started in sections1,0,0; expected start0. The first strict-flow probe therefore could not show its expected section-advance confirmation. Definition read confirmed qiyas_strict and isStrictSectionLock=true; this is not an absent-mode assumption. The fixture was safely submitted using its already saved answers (201), without a second attempt or historical changes.
QuizPage globally shuffled mock questions, allowing the final section to appear first. The bounded correction keeps configured section order and shuffles only inside each section. Existing draft answers are retained, and the current question is restored by identity when an older interleaved draft is regrouped. Normal quizzes retain their current ordering/index behavior. Actual ordering/seeded shuffle/resume identity/immutable input/exact-question regression is wired into the existing mock smoke;11existing contracts plus runtime regression PASS. Typecheck/build/exact-head CI and post-deploy fresh strict UI proof remain required. Strict timer expiry/reload persistence is still NOT PROVEN; no claim of complete Qiyas certification.

## Published mock policy lost in the client adapter
The second strict-flow audit used explicit randomizeQuestions=false to isolate section transitions. The server definition retained qiyas_strict/isStrictSectionLock=true, but the actual student UI never opened the strict section-confirm modal. Trace: services/adapter.ts normalized mockExam down to enabled/pathId/sections and dropped presentationMode, isStrictSectionLock, qiyasCategory, targetScore, plus section domain/lock. Thus strict UI was actually treated as flexible. This is a separate real cause, not a passed strict journey.
The correction delegates to services/mockExamNormalization.ts, preserving validated strict/flexible policy and optional legacy behavior. Actual normalizer regression checks fields, explicit false, omitted legacy flags and real adapter/runner delegation. Local typecheck and mock smoke PASS; exact-head CI and published strict replay required. The failed ordered-timer probe did not reach the timer assertions and cannot be reported as a proved timer reset.
Additional fresh current mock role evidence: teacher assigned-class workspace discovers the mock, director same-school list includes it, and another student gets403 for its result;3PASS. Teacher must be checked using school-access/teacher-workspace and its assessmentId field, not the general quiz catalog or id; initial harness failures retained. Total named bounded production positive checks29, with separate strict-mode failures still open.
Controlled Plan503 probe intercepted one POST with no production writes, but did not observe the expected visible success message; marked NOT_PROVEN, not a product failure. No plan logic changed from this inconclusive probe.

## Exact local strict-runner reload defect
Actual production build47297754, served locally with the authorized existing production audit fixture, proved the policy correction opens the strict transition modal and starts section0. It also positively reproduced section timer172→180seconds after reload and loss of the previous section's closed-state title. Evidence: scratch/strict-local-policy-and-timer.json. This is exact local UI evidence, not deployed frontend certification. The earlier production probe could not reach these assertions; this later replay is the proof.
The bounded correction adds optional strictSectionDeadlines/lockedSectionIds to the existing local draft. A started strict section uses its absolute deadline; reload subtracts elapsed time and retains valid configured closed IDs. Legacy drafts, normal quizzes and flexible policy keep their existing behavior. Restore filters unknown sections/invalid deadlines and caps future deadlines to the configured duration. No API, scoring, historical result or server timing authority changes. Deadline/elapsed/expiry/lock/legacy executable regression added; published replay and final exact-head CI remain required.
