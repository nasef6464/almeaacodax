## New question activity provenance — 2026-10-10
Owner confirms all existing results are trial data with no real students. Historical source repair is removed from the real-user launch blocker list; no trial records were deleted or reclassified. Baseline main09b21c4c; branch codex/student-activity-provenance.

Additive activity metadata separates standalone practice, review, and quiz question activity. Quiz origin uses existing verified definition/access/assignment policies and canonical drill/bank type, not school membership, navigation source, or posted schoolId. Quiz-question membership is validated. Missing older-client metadata remains unknown. Existing scoring/mastery side effects, grades and histories are unchanged.

Student reports count answered practice/review/platform-quiz/school-quiz separately; unanswered events excluded. The existing question-attempt response updates only the matching optimistic row and is ignored after actor change; hydration preserves verified provenance. No extra client request, polling, AI or new bank. Quiz activity adds bounded definition/user/scope reads on the existing write; no measured resource-saving claim.

Verification: real reports and hooks1280/390 PASS during initial focused check; client scoring-security4/4PASS; backend typecheckPASS. Final frontend/build/performance, updated store-response regression, exact-head required isolated HTTP/CI and published journey are pending. Isolated integration checks cover enrolled/independent practice/review, definition type vs misleading navigation, assigned school source, forbidden outsider, missing quizId/unrelated question/forged school, old-client compatibility and owned persisted reads.

Scope remains PARTIAL until final gates and live proof. Full plan completion/training/Qiyas/server timer/physical classroom pressure are outside this slice. Existing trial data are retained only as experiment evidence, not certified real-student history.
