# FINAL_REMAINING_2_CLASSIFICATION

## 1) guest /reports / a:???? ??? ??????
- Classification: External/manual-review blocker (checklist text mismatch with current guest guard UX)
- Why: route redirects to `/?auth=login`; target CTA is not reachable in current guard state.
- Evidence:
  - audit-artifacts/ui-audit-exhaustive/2026-05-26-full-audit/guest/_reports/focused-retest-1-before.png
  - audit-artifacts/ui-audit-exhaustive/2026-05-26-full-audit/guest/_reports/focused-retest-1-after.png

## 2) teacher /reports / button:????? ??????
- Classification: External/manual-review blocker (selector/label drift vs runtime control labeling)
- Why: page is reachable as teacher, but exact text selector `????? ??????` is not matched in runtime controls.
- Evidence:
  - audit-artifacts/ui-audit-exhaustive/2026-05-26-full-audit/teacher/_reports/focused-retest-12-before.png
  - audit-artifacts/ui-audit-exhaustive/2026-05-26-full-audit/teacher/_reports/focused-retest-12-after.png

## Summary
- Focused retest (22): 20 PASS / 2 FAIL
- Remaining 2 are classified blockers pending manual product-level acceptance of updated UX labels/guard flow.
