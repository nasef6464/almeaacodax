# MNSF26 Run 016 — Source skill classification is mandatory

## Owner clarification incorporated
The MNSF26 source books are already organized/classified by skill/topic/lesson. That source classification is now treated as first-class provenance for every question.

Policy:
1. Preserve the source test/lesson skill label from the book.
2. Use that source label as the primary domain constraint.
3. Select the exact canonical subskill only from the approved 25-main / 95-subskill taxonomy by the actual mathematical method of the question.
4. A mapping to an unrelated source topic is not allowed silently; it requires explicit review.
5. No new skills are created.

## Changes
- Arithmetic source index test 9 now preserves its source classification: `العمليات على الاعداد`.
- All 138 already-analyzed arithmetic records now carry `sourceClassification` with:
  - source part
  - test number/title
  - source skill label
  - evidence
  - mapping policy
- Content-manifest verifier now cross-checks every stored source classification against the arithmetic source index by PDF page.
- Arithmetic index verifier now fails if a crop-eligible test is missing its source skill/topic label.
- Geometry index verifier now fails unless every test's `lessonName` exactly matches the declared source lesson name.

## Mapping rule
`SOURCE_SKILL_FIRST_THEN_QUESTION_MATH_TO_CANONICAL_25_95`

This deliberately avoids two bad behaviors:
- keyword-only reassignment that ignores the book's classification;
- forcing a broad source lesson to one subskill when the actual question method points to a more specific canonical subskill inside the same source domain.

## Current source examples
Arithmetic source groups include reading/ordering numbers, arithmetic operations, divisibility/order of operations, primes/factors/remainders, fractions, percentages, ratios/proportions, speed, ages, clocks, and equations/conversions.
Geometry explicitly declares lessons such as shapes, angles, triangles, coordinate geometry, rectangle, square, rhombus/trapezoid, shaded areas, circle, mixed shapes, and solids.

## Production
No production import was performed in this run. Full-book crops/classification/dedupe remain prerequisites before R2/dry-run/canary/import.
