# BATCH 105 - React Quill Replacement Feasibility

Date: 2026-05-22
Status: Closed with safe containment

## Goal

- Continue after BATCH 104 closure.
- Evaluate and execute a safe path to reduce `quill` risk without breaking editor workflows.
- Keep production stable and preserve current UX/contracts.

## Scope

1. Map exact `react-quill-new` integration points.
2. Assess low-risk replacement or containment path.
3. Implement only if regression risk is controlled.
4. Re-run build/smoke verification and close with honest PASS/FAIL.

## Implemented

- Kept `react-quill-new` integration to avoid breaking editor workflows.
- Added containment hardening in `components/RichTextEditor.tsx`:
  - sanitize editor output before propagating changes:
    - `onChange={(nextValue) => onChange(normalizeQuestionHtml(nextValue))}`
- This blocks unsafe tags/attributes/protocols through existing project sanitizer while preserving editor UX.

## Verification

- PASS `npm run typecheck`
- PASS `npm run build`
- PASS `npm run smoke:performance`
- PASS `npm --prefix server audit --omit=dev` (`0 vulnerabilities`)
- Frontend `npm audit --omit=dev` remains:
  - `quill` advisory (breaking-only upstream fix path),
  - `xlsx` advisory (no upstream patch in current channel).

## Verdict

- Practical risk reduced with non-breaking containment.
- Full advisory elimination still depends on a later controlled replacement/migration batch.
