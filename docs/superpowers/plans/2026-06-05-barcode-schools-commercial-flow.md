# Barcode Tests And Schools Commercial Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn barcode tests and school management into a professional school-sales workflow: quick public tests, complete per-test reports, scoped supervisors, and a clear school setup journey.

**Architecture:** Keep barcode tests separate from normal quizzes and mock exams, but reuse the question center and unified question builder. Keep one `supervisor` role, with scope derived from school, classroom/group, or assigned teacher relation instead of creating too many roles. School management should become a guided workspace: school -> classes -> students -> supervisors -> packages/access -> reports.

**Tech Stack:** React, TypeScript, Zustand store, existing admin dashboard modules, existing server routes, Vercel production deployment, smoke/live Playwright audits.

---

## User Requirements Captured

### Barcode Tests

- Barcode tests must show approved questions from the question center clearly.
- The manager must be able to add a new question from inside barcode test creation using the same `UnifiedQuestionBuilder`.
- The created question must be saved to the question center and selectable immediately.
- The public test should open as a full page or embedded professional workspace, not a narrow side panel.
- The admin view should list previous barcode tests; opening one should show link, QR, settings, submissions, top students, weak skills, school/class breakdown, and exports.
- Barcode tests can be quick tests or mock-like tests with real settings.
- Consider an external form mode for very large school events: Google Forms/Microsoft Forms embed or link, to reduce server load when hundreds of students enter at once.
- The internal mode remains preferred when skill analysis, automatic marking, top students, and weak-skill reports are required.

### School / Group Commercial Flow

- Separate platform admin from school manager concept.
- Prefer one `supervisor` role with scoped access:
  - School scope: school manager sees the full school.
  - Classroom/group scope: teacher/supervisor sees only assigned classes or groups.
  - Teacher scope: future option to supervise assigned teacher groups without adding extra roles.
- School management must be complete from inside one flow:
  - Add/edit/delete school.
  - Add/edit/delete classes.
  - Add/import students.
  - Assign students to classes.
  - Assign supervisors to whole school or specific classes.
  - Open/close paths, subjects, courses, foundation, training, tests, mock exams, and library through school packages.
  - Generate access codes tied to school packages.
  - Show school, class, supervisor, and student reports.
- The interface must be simple and comprehensive: next-step cards, clear missing items, and no scattered hidden workflows.

## Recommended Product Direction

### Barcode Test Modes

1. **Internal Smart Test (recommended default)**
   - Uses question center.
   - Supports skill reports, top students, weak skills, school/class results, exports.
   - Best for diagnostics, marketing tests, and classroom QR sessions.

2. **External Form Embed**
   - Stores title, embed URL, public URL, and school context.
   - Shows embedded Google/Microsoft form inside the platform.
   - Best when the goal is a very high-concurrency simple survey or lead capture.
   - Does not provide automatic skill analysis unless results are imported later.

3. **Hybrid**
   - Internal test for scored diagnostics.
   - External form for large no-grade surveys.
   - Same admin list, clearly labeled by mode.

## Implementation Tasks

### Task 1: Barcode Workspace Layout

**Files:**
- Modify: `dashboards/admin/PublicBarcodeTestsManager.tsx`
- Modify: `scripts/smoke-barcode-public-tests-contract.mjs`
- Modify: `scripts/live-barcode-public-tests-audit.mjs`

- [ ] Replace the current creation + side summary layout with a full workspace:
  - top command bar: mode, new test, saved tests, reports
  - main area: setup and question selection
  - report area: opens as an in-page full report panel
- [ ] Add stable test IDs:
  - `barcode-workspace-shell`
  - `barcode-tests-list`
  - `barcode-test-full-report`
  - `barcode-test-top-students`
  - `barcode-open-full-preview`
- [ ] Update live audit to fail if the report/test remains only a small side widget.
- [ ] Run:
  - `npm run smoke:barcode-public-tests`
  - `npm run smoke:barcode-public-tests-live`

### Task 2: Question Center Visibility And Quick Add

**Files:**
- Modify: `dashboards/admin/PublicBarcodeTestsManager.tsx`
- Reuse: `dashboards/admin/builders/UnifiedQuestionBuilder.tsx`
- Modify if needed: `store/useStore.ts`
- Modify if needed: `services/api.ts`
- Modify: `scripts/smoke-barcode-public-tests-contract.mjs`

- [ ] Add a clear empty state when no approved questions match the selected path/subject:
  - show current filters
  - show button: `إنشاء سؤال لهذا الاختبار`
- [ ] Add `UnifiedQuestionBuilder` modal or full section from inside barcode creation.
- [ ] On save:
  - create the question in the question center
  - apply selected path/subject/section
  - mark or route to approval according to existing question-bank rules
  - select it for the barcode test if it is approved/usable
- [ ] Add stable test IDs:
  - `barcode-add-question-from-builder`
  - `barcode-unified-question-builder`
  - `barcode-question-center-empty-state`
- [ ] Run:
  - question bank contract
  - barcode contract
  - build

### Task 3: Barcode Reports And Previous Tests

**Files:**
- Modify: `dashboards/admin/PublicBarcodeTestsManager.tsx`
- Modify: `server/src/routes/publicTests.routes.ts`
- Modify: `scripts/smoke-barcode-public-tests-contract.mjs`

- [ ] Expand report summary to include:
  - top students
  - weak skills
  - low performers
  - school breakdown
  - classroom breakdown
  - latest submissions
  - printable report
  - CSV/Excel export
- [ ] Make previous tests list actionable:
  - open report
  - copy link
  - open student page
  - print QR
  - show status and submissions
- [ ] Add stable test IDs:
  - `barcode-previous-test-open-report`
  - `barcode-report-leaderboard`
  - `barcode-report-school-breakdown`
  - `barcode-report-classroom-breakdown`

### Task 4: External Form Mode

**Files:**
- Modify: `server/src/models/PublicBarcodeTest.ts`
- Modify: `server/src/routes/publicTests.routes.ts`
- Modify: `dashboards/admin/PublicBarcodeTestsManager.tsx`
- Modify: `pages/BarcodeTest.tsx`

- [ ] Add `deliveryMode: "internal" | "external_form"` to barcode tests.
- [ ] Add optional fields:
  - `externalFormUrl`
  - `externalEmbedUrl`
  - `externalProvider: "google_forms" | "microsoft_forms" | "other"`
- [ ] In admin:
  - show mode selector
  - validate embed URL
  - explain that external mode reduces platform load but does not produce automatic skill analysis unless imported
- [ ] In public test page:
  - if external mode, render the embedded form full width
  - keep platform identity wrapper only if needed
- [ ] Add test IDs:
  - `barcode-delivery-mode-selector`
  - `barcode-external-form-embed`

### Task 5: School Workspace Setup Wizard

**Files:**
- Modify: `dashboards/admin/SchoolsManager.tsx`
- Modify: `scripts/smoke-school-management-contract.mjs`
- Modify: `scripts/live-supervisor-school-command-audit.mjs`

- [ ] Add one visible school setup progress strip:
  - school info
  - classes
  - students
  - supervisors
  - packages/access
  - reports
- [ ] Every missing item gets one direct button.
- [ ] Add stable test IDs:
  - `school-workspace-shell`
  - `school-setup-progress`
  - `school-next-action`
  - `school-classes-panel`
  - `school-students-panel`
  - `school-supervisors-panel`
  - `school-packages-panel`
  - `school-reports-panel`

### Task 6: Scoped Supervisor Model

**Files:**
- Inspect/modify: `types.ts`
- Inspect/modify: `server/src/models/User.ts`
- Inspect/modify: `server/src/models/Group.ts`
- Modify: `server/src/services/visibility.ts`
- Modify: report and content scope helpers
- Modify: `scripts/smoke-rbac-school-scope-contract.mjs`

- [ ] Keep role names simple:
  - `admin`: platform-wide control
  - `supervisor`: scoped school/class/group control
  - `teacher`: keep if already used, but school contracts can use supervisor accounts for teacher-like scope
- [ ] Define scope from group assignments:
  - school group means full school
  - class group means that class only
  - parent/child group relationship expands school scope to child classes
- [ ] Ensure reports and school portal honor this scope.
- [ ] Add live proof for:
  - school-scoped supervisor
  - class-scoped supervisor

### Task 7: School Packages And Access

**Files:**
- Modify: `dashboards/admin/SchoolsManager.tsx`
- Modify: relevant package/access code server routes if needed
- Modify: package smoke contracts

- [ ] Make packages read like access policies:
  - what paths open
  - what subjects open
  - what content types open
  - student limit
  - active codes
  - expiration
- [ ] Add “preview as student in this school” if feasible.
- [ ] Add clear warnings before deleting; prefer disabling over deleting.

### Task 8: Live Verification Gate

**Files:**
- Modify: `scripts/smoke-goal-live-core-contract.mjs`
- Modify: `package.json`
- Modify live audit scripts as needed

- [ ] Add barcode workspace checks to core live gate.
- [ ] Add school setup workflow checks to core live gate.
- [ ] Run before deploy:
  - `npm run build`
  - `npm run server:build`
  - `npm run smoke:barcode-public-tests`
  - `npm run smoke:school-management`
  - `npm run smoke:goal-live-core-contract`
- [ ] Deploy to Vercel.
- [ ] Run after deploy:
  - `npm run smoke:barcode-public-tests-live`
  - `npm run smoke:supervisor-school-live`
  - `npm run smoke:goal-live-core`

## First Execution Batch

Start with Tasks 1, 2, and 3. They directly fix the manager-visible barcode issues:

1. Full barcode workspace.
2. Question center visibility and quick add using unified builder.
3. Strong previous-test report with top students.

Then move to Tasks 5, 6, and 7 for the school commercial flow.

## Current Evidence From Code Inspection

- `dashboards/admin/PublicBarcodeTestsManager.tsx` already has QR creation, saved tests, live monitoring, reports, and approved question filtering.
- `server/src/routes/publicTests.routes.ts` already validates barcode question IDs against approved question-center questions.
- `dashboards/admin/SchoolsManager.tsx` already has school creation, classes, student import, relation import, supervisor assignment, packages, access codes, and reports.
- The gap is product flow and clarity: workflows exist but are scattered, labels are not always clear, and the manager does not see a single professional path from setup to reporting.
