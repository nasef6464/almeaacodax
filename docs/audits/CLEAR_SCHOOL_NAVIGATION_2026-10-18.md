# Clear teacher and supervisor navigation — 2026-10-18

## Owner intent and recovered gap

The owner clarified that passing button/API tests does not prove that a teacher or supervisor can find the right screen. Continue the already approved UX scope: organize the right sidebar and interiors, show readable names, and choose a material before skills. Baseline main `00ca0bb2b39ef33e5a1c6e618eb542fab8c87308`; branch `codex/clear-school-navigation`.

The earlier scope improved the school teacher skill radar, but the platform trainer opens a different screen: `SkillsTreeManager` still showed all main skills before choosing a material. This is a real remaining UX gap, not a reopened school assessment backend defect.

## Bounded change

- Reuse `DashboardSectionNav` with an optional single-expanded-group mode for school teacher, platform trainer and supervisor. Existing callers retain the old default. Groups explicitly name skills/questions/reports rather than hiding these destinations under broad preparation labels. The current destination opens its group; mobile group expansion leaves the drawer open and selecting a page closes it through the existing layout.
- Add a small breadcrumb using the same permitted item list and existing tab handlers. Home returns to the existing overview. No route IDs or permission predicates change.
- Teacher/supervisor skill management starts with material selection; skills, counters and creation remain undisplayed/disabled until a material is selected. Material can be chosen directly without a prerequisite path. Switching/resetting material changes the visible list. Admin and subject-pinned callers retain existing behavior.
- Skip the existing broad coverage read while staff have not selected a material. Once selected, the existing request sends its material filter. No new API or query shape.
- Resolve school assessment material IDs through the existing catalog helper and show Arabic test-kind labels. Replace the internal B2B label in the school sidebar with a plain school workspace label.
- Mobile workspace captions identify the actual teacher/supervisor workspace instead of calling every workspace platform administration; the default for other callers is retained.

## Owner screenshot: clipped student profile

The supplied screenshot showed the student header behind the fixed site header and an undimmed sidebar. `StudentIntelligenceProfile` was a fixed child of the dashboard's animated opacity stacking context, so its z-index could not escape above the site header/sidebar. Its start/end alignment also placed the card at the side rather than centered.

The profile now portals to `document.body`, above the site layers, with a viewport-bounded centered flex card and internally scrolling content. Header/close stay visible; the dialog is labelled, receives initial focus, traps Tab, closes on Escape and restores focus/body scrolling. Existing report, alert and assignment callbacks and all score derivation are unchanged.

The shared presentation boundary is `components/DashboardDialog.tsx`, reused by the student profile and its assignment picker so moving between them does not reintroduce the same stacking problem. Student selection, titles and callbacks remain in the existing dashboard/profile.

`test-student-profile-overlay-ui.mjs` reproduces a fixed child constrained by a transformed/clipped ancestor (RED:400px rather than740px coverage). GREEN additionally covers an opacity stacking ancestor beneath a128px site header at390/1280, using hit testing to prove the close button is above the header; checks all three actions, scrolling, focus, Escape, reopening, overflow and restoration. Screenshot review confirms the entire card stays in the viewport. No student record is required for this fixture.

## Clarified assignment catalog

The owner explicitly clarified that the individual-student assignment picker must list tests created by the current supervisor personally. The old predicate checked only `isPublished`, incorrectly admitting the platform catalog and other authors. `supervisorAssignmentCatalog.ts` now requires current `createdBy`, school ownership, central school mode and publication. Owner IDs and assigned-teacher IDs do not substitute for authorship. The picker resolves its selected definition from this same eligible list, shows an actionable empty state and preserves existing assignment persistence/alert callbacks. Backend authorization remains authoritative.

`test-supervisor-own-assignment-catalog.ts` observed RED with the former broad publication predicate, then GREEN for the current author, other authors, assignment/owner-ID privilege widening, public definitions, drafts and missing identity. The canonical quiz object is retained. The existing supervisor dashboard contract also passes, including preserved assignment behavior. All seven existing navigation destinations are tested by opening their groups, with the current page restored and visibly selected; no hidden-text substitution.

No authentication, RBAC, scoring, payment, schema or production data changes. No provider calls. This is navigation and display work, not a redesign of every school subsystem.

## Verification and release boundary

`test-school-workspace-navigation-ui.mjs`: observed RED on zero expanded groups before implementation; GREEN at390/1280 with one open group, discover/select skill, keyboard Enter, mobile drawer behavior, active destination, breadcrumb/home, external selection, restricted entries and overflow checks. The fixture replaces Header only, retaining its64px height contract.

`test-staff-skills-entry-ui.mjs`: observed RED because choose-first was absent in the actual skill manager; GREEN for teacher/supervisor material switching/reset, no initial broad coverage read, pinned subject, unchanged admin listing, and readable school assessment labels. Gateways are isolated fixtures. This is a browser behavior test, not a production persistence claim.

The existing school skills display and role-dashboard presentation browser suites pass, and the nine-part teacher/supervisor contract bundle passes. Question coverage, HTML safety and PLAN8 integrity contracts pass. Typecheck and production build are run for the final code. All three new browser suites are included in the existing isolated deep premerge gate. Independent read-only review found no confirmed P1/P2 issues in the navigation/skills slice. A subsequent independent read-only frontend review also found no actionable P1/P2 in the final shared dialog, profile and current-author assignment catalog. Reviewers did not run the tests; the execution evidence above comes from the primary worktree.

Published journeys and exact-head CI are release requirements and remain pending until separately recorded. No synthetic production records will be created for navigation certification.

## Permission-render test synchronization

Deep run39163771903 at53261aea stopped in the new navigation fixture: after requesting a restricted render it counted3 groups before React committed the new one-group state. The overview button already existed, so waiting for that button did not synchronize the permission change. The harness now waits for the second summary to detach before asserting the unchanged exact count1. A controlled500ms permission-render delay reproduces the old assertion failure (3 versus1) and passes with this synchronization at390/1280. No product or permission rule changed. Backend and directed school journey checks on that source passed; skipped downstream deep journeys are not claimed as verified.
