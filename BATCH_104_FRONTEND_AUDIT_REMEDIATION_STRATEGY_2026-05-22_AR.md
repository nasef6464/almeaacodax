# BATCH 104 - Frontend Audit Remediation Strategy

Date: 2026-05-22
Status: Closed with mitigations

## Goal

- Continue after BATCH 103 closure.
- Prepare and execute safe remediation strategy for residual frontend advisories:
  - `quill` (breaking-only upgrade path),
  - `xlsx` (no upstream patch in current audit output).
- Keep production stable and avoid breaking UX/API behavior.

## Constraints

- No `git add .`
- No destructive git operations
- No breaking dependency migration without explicit compatibility checks

## Initial Plan

1. Map exact usage of `react-quill-new` and `xlsx` in code.
2. Evaluate safe options:
   - keep + harden usage,
   - isolate and sanitize inputs,
   - substitute dependency only if low-risk path exists.
3. Implement minimal safe hardening.
4. Re-run builds and smoke checks.
5. Document final risk acceptance or residual blockers.

## Implemented

1. Added safe XLSX helpers in `utils/xlsxLoader.ts`:
- `readWorkbookFromBuffer`
- `registerXlsxRuntime`
- `sheetToSafeObjects`
- `sheetToSafeRows`
- recursive sanitization dropping unsafe keys (`__proto__`, `prototype`, `constructor`)

2. Switched import paths to safe helpers:
- `dashboards/admin/SchoolsManager.tsx`
- `dashboards/admin/LessonsManager.tsx`
- `dashboards/admin/QuestionBankManager.tsx`

3. Updated smoke contract compatibility:
- `scripts/smoke-performance-contract.mjs` now accepts secured xlsx loader imports without requiring the old exact single import line.

## Verification

- PASS `npm run typecheck`
- PASS `npm run build`
- PASS `npm run smoke:performance`
- PASS `npm --prefix server audit --omit=dev` (`0 vulnerabilities`)
- Frontend `npm audit --omit=dev` remains:
  - `quill` advisory with breaking-only fix path
  - `xlsx` advisory with no upstream patch in current channel

## Readiness Note

- Practical attack surface for spreadsheet imports is reduced through sanitization and safer workbook parse options.
- No UX/API/schema breaking changes introduced.
