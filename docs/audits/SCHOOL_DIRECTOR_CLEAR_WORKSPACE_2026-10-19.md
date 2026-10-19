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
