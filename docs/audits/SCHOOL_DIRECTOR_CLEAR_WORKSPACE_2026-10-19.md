# وضوح لوحة مدير المدرسة — 2026-10-19

STATUS: IMPLEMENTED_LOCAL / production journey not proven.
Baseline main: 3f0f8151776b9007a086accb6683b45c63f24c0a.
Branch: codex/school-director-clear-workspace.

## Scope
- Owner corrected the role to school director, then authorized continuation of the proposed existing-workspace simplification.
- Shared grouped navigation and breadcrumb; overview, students, classes, teacher assignments, assessments, smart sessions, interventions, reports and transfer are separate permitted destinations.
- Compact overview and named path → subject → skill selectors. Switching a parent clears dependent selection. Interventions select students from the chosen class.
- Approved question picker reads20 per page only after choosing path/material, supports text and canonical imageUrl/imageAlt, search, selection across pages and reset across material/path.
- Create submits the existing director API payload with canonical question IDs. This existing API publishes directly to the chosen class; the form says so. No new draft/scoring/definition semantics.
- Latest assessment cards reuse existing school summary and learner panels, server context, reminder command and reopen dialog on demand. No100-card permission/report fan-out. Existing director list remains capped100 by its unchanged API, and the UI says latest assessments.
- The existing per-test API resolves stored actor.schoolId. Cards for another delegated school remain listable, but their detail action is disabled with an explanation. No role/context spoofing or backend widening. Editing content, visibility and cloning are not added in this bounded slice.
- School switching clears forms and guards refresh results and delayed roster mutation completions by actual selected school identity. No stale-school state takeover.

## Verification
- New browser regression390/1280 PASS: permitted destinations, no eager academic reads, choose-material-before-skills/reset, canonical text/image-only questions, pagination/selection reset, create payload, read-only server context controls, delayed school reads, delayed add(A) after switchingB, alternate-school report gate, no JS errors/viewport overflow.
- Initial new regression RED: closed academic centers still loaded. Image-only RED→GREEN and delayed mutation cross-school refresh RED→GREEN recorded locally.
- Existing role dashboard presentation PASS: nav permissions,27row lists12→24→12, print/filter behavior, teacher actions,390/1280.
- G9/G10/G11/G12 source contracts; G10 updated obsolete App.tsx route reference to actual AppRouteTree. G12 now checks reused scoped authority/report components rather than incidental explanatory copy.
- Typecheck and production build/PWA PASS on final product code before commit. Eight local verification groups PASS (four source contracts, two browser suites, typecheck, build). New browser gate included in existing deep pre-merge workflow. Required exact-head CI remains mandatory.
- Independent focused review cleared all P1/P2 after image preview, active-school gate and delayed mutation fixes.
- Auth setup for existing authorized director returned HTTP429 before credential submission. Published user journey is BLOCKED, not PASS. No production content/student/result writes or provider calls.

## Evidence / limits
Local images: scratch/director-clear-workspace-ui/390.png and1280.png; final logs scratch/director-workspace-typecheck-final.log and scratch/director-workspace-build-final.log.
No whole-schools closure, scale certificate, new permissions, migrations or AI usage claimed.

## Exact-head CI follow-up
PR578 initial head043f3e7f: required backend and cross-phase gates PASS; deep39208104247 FAIL in the new browser fixture during rapid school switching (a navigation button became hidden between its visibility read and click). Downstream skipped suites are not counted as passes. Product source unchanged; fixture now waits for the current overview breadcrumb and expanded overview group before selecting the next group. Local390/1280 PASS and independent review confirm unchanged assertions. Final exact-head CI must pass before merge.

## Published scoped verification
PR578 final29bbe099:15SUCCESS/5conditionalSKIP/all3requiredPASS; deep39208783066SUCCESS. Merged41cbe0d8; matching Vercel production dpl_2drkDkTjtByPx1gaKDMQMdz98ZUA READY and API41cbe0d81b7b ready=true. All5main checks SUCCESS (postdeploy39210123975; live roles39210123989).
Existing real school_admin login200 after normal browser503 wake-up resolved; no grants changed. Published390/1280 full replay PASS:14unique views,50API reads; settled overview recapture34extraAPI reads for the same two overview views. No page errors/scoped failed reads/domain writes/provider requests. Earlier read-only attempt20reads stopped because the exact heading selector omitted its live count badge; the corrected semantic heading selector then passed the full replay. No product change after source29bbe099.
Actual granted account covers overview/roster/teacher assignments/assessment report and creation form/smart-session counts/detailed report. It lacks intervention capability, correctly hidden; dependent material/skill selection remains locally/CI tested. No live creation/reminder/reopen writes executed. The existing API primary-school and full lifecycle limitations above remain explicit. Evidence scratch/director-clear-workspace-published-proof.json, director-clear-workspace-settled-overview-proof.json and director-clear-workspace-release-proof.json. Postrelease docs retained locally for next focused batch.
