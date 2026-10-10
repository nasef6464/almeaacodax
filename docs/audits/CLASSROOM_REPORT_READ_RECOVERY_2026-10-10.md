# Classroom report reads and explicit recovery — 2026-10-10

Status: IN_PROGRESS. Published baseline `535192eda1044e129b7cf561c02873e76709ce37`; branch `codex/classroom-report-read-recovery`. Owner deferred email setup and requested the next project slice. Reuse #518 login and #516 classroom persistence evidence.

ClassSkillGapsRadar requested full teacher history including student outcomes although diagnostics consume only question summaries. The report history loader accepted a late prior-school response. Radar swallowed errors as an empty list. Failed student details required closing and reopening the report.

`hooks/useClassroomTeacherReports.ts` now owns per-mounted-view summary reads, pending deduplication, school/enabled response isolation, explicit error and retry. Both views reuse it. No global cache, polling, new service or server query/schema/API/scoring/RBAC change. Student details remain one on-demand read for the selected report, with a detail-only retry button. This does not repair or explain the upstream historical gateway502.

The existing history endpoint defaults to latest50ended/archived sessions (max100). Both views explicitly describe coverage up to50recent sessions. No all-history certification or new pagination contract.

Read-only comparison at2026-10-10T16:26:24Z: existing authenticated trial teacher, two history reads, both200,50sessions. Full339974JSON bytes/35972compressed response-body bytes; summary221492JSON/33903compressed. Skill diagnostics deep-equal; only summary omits student arrays. Observed118482fewer JSON bytes and2069fewer transferred body bytes; not full-browser/billable bandwidth or school capacity. Summary5732ms/full3948ms are sequential observations, not a latency improvement. No production session/answer/password/result mutation. Evidence `scratch/classroom-history-summary-measure.json`.

Actual bundled React/browser acceptance PASS: summary arguments, no duplicate pending read, old-school response ignored, explicit error/retry, detail retry without history reload, radar failure distinct from no evidence, preserved60%skill accuracy,390pxviewport. Existing supervisor report UI/evidence/scope/hook tests and classroom insight/student outcome contracts PASS; frontend typecheck/build PASS. Exact-head CI/publication/bounded published report/radar browser check pending. Real devices/whole-school traffic and historical gateway cause NOT_PROVEN. Mail setup owner-deferred.

## Published checkpoint — supersedes pending startup status

VERIFIED bounded slice: #519 exact059655def99d3381993e6676d729384bfa2de8bf18SUCCESS/3conditionalSKIPPED/all3requiredPASS. Protected merge2026-10-10T16:49:07Z ->f040865c450dd5c23434ea55e5f8b8cf743c4211. Renderlive/frontend/canonical+directready match;DBRedisPASS;4mainworkflowsSUCCESS. Initialbuild-in-progressprobe retained separately.

Read-only published browser journey PASS:2summaryhistory200reads;1detail502injected locally into the browser, explicit retry, actualserver200restored student evidence with no history reload.8views1280/390for history,error,recovered detail and radar;JSerrors0/overflow0/businesswrites0. Mobileerror/retry and radar screenshots visually inspected. No production failure was induced, and this does not explain/reproduce the historical gateway502. Evidence scratch/classroom-report-read-final-ci-proof.json,classroom-report-read-deploy-proof.json,classroom-report-read-published-ui.json,classroom-report-read-main-ci-proof.json. These postpublication additions are locally prepared for the next documentation delivery.

Initialcandidate static history test was updated to follow the extracted owner, with an actual negative active-session fixture. A subsequent UI test checked absence of loading before React committed the response; fixed to await recovered report heading, retaining all assertions. Final exactheadpassed; initialfailed logs retained. Raw taxonomy IDs still appear in some legacy report labels, a deferred presentation improvement; no new taxonomy or score migration here.
