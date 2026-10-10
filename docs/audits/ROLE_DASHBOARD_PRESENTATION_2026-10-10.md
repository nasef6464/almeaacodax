# Role dashboard presentation — 2026-10-10

Status: PARTIAL until exact-head required CI, protected merge and published read-only verification.

## Scope and baseline

Owner requested simpler presentation across student, school teacher, supervisor, parent and school director dashboards. Base: main f17b2073ed5af88233a2b7c85aed22dd66db3d90. Prior student tests slice (#510/#511) and its 16 published checks are reused, not repeated or counted as new checks.

Read-only inventory: 41 layout snapshots across five roles, no page errors. Snapshots include loading/empty views and are not functional certification. Long lists: supervisor reports 107 intervention cards; director settled mobile height 9500 and width 408 at viewport390. School teacher overview repeated generic classroom-start actions. Supervisor mobile repeated horizontal and drawer navigation. Some student exam labels and supervisor badge labels were skipped by the inventory locator; prior student certification remains separate evidence.

The normal trial teacher redirects from the instructor route to its school workspace: live platform-trainer persona is NOT_EXERCISED. Do not broaden persona or permissions for this cosmetic task.

## Changes

- Shared DashboardSectionNav groups only existing permitted entries, preserves caller selection and ungrouped permitted entries. School teacher: preparation/teaching and follow-up; supervisor: daily work and analysis; parent: children/account/help; platform teacher: content/preparation and teaching/assessment.
- Remove duplicated generic teacher start buttons and supervisor mobile horizontal navigation. Keep contextual per-class actions. School teacher full roster opens on demand.
- DisplayListControls bounds rendered rows only: supervisor students12, skill categories8, intervention rows12, class comparisons8 and director students12. Scope/filter changes reset the screen limit. All data remains in aggregates/export; beforeprint expands every row synchronously, afterprint restores the screen limit.
- Supervisor has one global print/export location; distinct class-comparison CSV is explicitly labelled. ClassReportPanel retains default actions for other callers.
- Director delegated and academic centers are native disclosure sections; existing children stay mounted with unchanged requests/permissions. Narrow inputs/selects respect mobile width.
- Student exam menu and source separation remain unchanged. Favorites empty-state wording explains the actual action in plain Arabic.

No API/routes/auth/RBAC/scoring/payment/data changes, new requests, polling, AI or paid services. This is screen organization, not measured server/bandwidth optimization.

## Validation

- Actual React presentation fixture PASS: permitted menu selection and restricted subset; 27-row intervention list12→24→27print→24restore→12; filter reset; director12→24→12; delegated permission visibility; teacher single generic start and folded27-student roster; director viewport1280/390 no overflow; zero page errors.
- Existing staff panel smoke PASS: four staff roles, student/parent visibility, parent selector, nine callbacks, pending/error/success and empty exports.
- Focused school roster9, account workspace10, reports role20, student journey14, quizzes10, performance/Plan3 footprint contracts PASS during implementation.
- Final exact-head typecheck/build/CI and published evidence pending. Full project remains PARTIAL; no production-scale or complete business-flow claim from this presentation fixture.
- Initial CI 9858d432 found one stale presentation assertion: mobile overview expected the reports navigation label in page body after duplicate horizontal navigation removal; controls19/actions8, no overflow/5xx, scope/role contracts passed. Updated the audit to open the actual mobile drawer and prove all seven section buttons plus exactly one active section, then close it and retain the page, scope, actions, overflow and network assertions. No feature or protection was removed to pass the test. Final CI must run on the follow-up exact head.

## Continuation

Branch codex/role-dashboard-simple-ux. Next: focused commit/PR, exact-head required checks, protected merge, normal main deploy, read-only role navigation/progressive lists and settled mobile screenshots. Preserve all scratch/unowned changes and records.
