# PLAN 8 — Question Bank / Content Integrity Live Evidence

Date: 2026-09-28
Baseline: main@851f28ec34504179cbbaf87f5e0642282c01b6d6
PR: #295

## Production read-only audit

### FND26 — audited legacy lock

The canonical FND26 content lock remains the authority for historical batches whose import metadata predates content-addressed hashes.

Live Atlas evidence:
- approved usable questions: 856
- main skills represented: 25 / 25
- subskills represented: 93 / 95
- imageUrl/questionCode mismatches: 0
- malformed four-choice records: 0
- invalid correctOptionIndex: 0
- missing canonical skill/section scope: 0

The exhaustive source-page review is recorded in:
- `docs/audits/FND26_CONTENT_LOCK_FINAL_2026-09-28.md`

That source audit established:
- 858 total source records;
- 856 usable approved;
- 2 source-defect questions rejected;
- 0 source-page mismatches;
- 0 imageUrl/questionCode identity mismatches;
- 0 answer inconsistencies after corrections.

Historical FND26 batches are therefore trusted through the immutable content-lock audit, not by inventing missing legacy hashes. Any future visual-identity edit or new approval is subject to the stricter PLAN 8 approval gate.

### YLM26 — modern strict integrity

Live Atlas audit of approved imported image questions:
- total approved: 87
- invalid/missing SHA-256 imageHash: 0
- missing sourceItemId: 0
- missing explicit visual verification note: 0
- image URL missing questionCode/hash content addressing: 0
- malformed A/B/C/D or invalid answer index: 0

### COL26 / COL2627

Current COL26 imported pilot rows are draft-first and therefore not learner-visible.
No draft question is promoted by PLAN 8.

## Full-bank counter proof

Production API:
`GET /api/quizzes/questions?pathId=p_1777779639431&subject=sub_1777779748206&includeCoverage=true&paginate=true&page=1&limit=1`

Observed:
- pagination.total = 856
- coverage.total = 856
- coverage.mainSkillCount = 25
- coverage.subSkillCount = 93
- approvedCount = 856
- pendingCount = 0

The same counts were independently reproduced directly from Atlas over the entire approved FND26 set. This proves coverage cards are calculated from the full filtered bank and are not page-size artifacts.

## Preventive PLAN 8 controls

PR #295 adds:
- learner queries cannot let visible quiz linkage bypass explicit question workflow;
- new approval / approved visual-identity edits for canonical imported image questions require:
  - visual verification note,
  - trusted source page/item,
  - SHA-256 imageHash,
  - HTTPS content-addressed image URL,
  - exactly four choices,
  - valid A/B/C/D answer index;
- imports remain draft-first;
- full-bank coverage remains server-side and independent of pagination.

## Exit Gate assessment

No currently approved modern imported image batch has an unresolved visual/hash/answer integrity anomaly.
FND26 historical batches are covered by the exhaustive source-page content lock rather than synthetic metadata.
Full-bank counters are truthful against Atlas.

PLAN 8 may close only after exact-head CI remains green, PR #295 is merged, and production health is verified on a main SHA containing the merge.
