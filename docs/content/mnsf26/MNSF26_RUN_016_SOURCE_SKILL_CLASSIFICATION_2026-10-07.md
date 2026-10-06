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

## Follow-up hardening
- Added consolidated source skill index: `MNSF26_SOURCE_SKILL_INDEX_V1.json`.
- Current source groups: **28 total = 17 arithmetic/algebra + 11 geometry**.
- Coverage in that index: **63/63 arithmetic nominal tests + 50/50 geometry tests**.
- Added `verifyMnsf26SourceSkillIndex.ts` and wired `verify:mnsf26:source-skills` into `verify:mnsf26:all`.
- Connector-level structural validation after writes: arithmetic missing source labels = 0; geometry lesson-name mismatches = 0; manifest source-classification mismatches = 0 across all 138 analyzed records.

### Commits in this run
- `34c823c6ffd3215dd54f15efff88b027a25059c6` — restore source label for arithmetic test 9.
- `ca5a6e61139c06cde5ae0736d517159f372634e3` — persist source classification on 138 records.
- `197d7683b554470c714c0eab869b016460a9348d` — enforce content-manifest/source-index classification parity.
- `b0a98f58418e60229c47ae14bf4d01424f0e6456` — require arithmetic source skill labels.
- `6bc7aad9f7bc5fea1585e36d522e7330644eeea5` — require geometry source lesson labels.
- `88c89c94f54ee79f69b52ac7b7c9584a2f05ab29` — add consolidated source skill index.
- `c25aefa729b3aa2d58bcf4d055406452be0cebcb` — add source-skill verifier.
- `c42154c2fd3faee0f01dae4cafe1581c67d1835c` — wire source-skill verifier into full MNSF26 gate.
