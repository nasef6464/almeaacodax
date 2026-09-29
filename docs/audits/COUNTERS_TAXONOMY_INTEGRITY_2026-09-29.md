# Counters & Taxonomy Integrity — Before / After — 2026-09-29

## Scope
Production MongoDB Atlas + API/UI counter integrity for ALMEAA.

## Before
- Global questions: 3062
- Quant filter visible: 858
- FND26: 858
- COL2627: 946, but `subject="general"` while `subjectId="sub_1777779748206"`
- Tahsili Math: 1258
- Global Skills Center: 100 main / 364 sub
- Valid canonical taxonomy after excluding orphan branch: 87 main / 322 sub
- Quant taxonomy: 25 main / 95 sub
- Question coverage: 47 main / 163 sub
- Workflow: approved 1795 / draft 1258 / rejected 9 / pending_review 0
- Legacy orphan branch: `sub_quant` with 13 sections / 42 skills plus stale `p_qudrat` seed runtime data.

## Data repair applied
- Precondition: exactly 946 COL2627 records matched the legacy subject mismatch.
- Updated only those 946 records from `subject="general"` to `subject="sub_1777779748206"`.
- Deleted orphan `sub_quant` sections (13).
- Deleted stale `p_qudrat` lessons (24).
- Deleted stale `p_qudrat` library items (7).
- Deleted stale `sub_quant` courses (2).
- Legacy skill/skill-progress residue is detached from canonical subjects/sections and is not returned by the canonical taxonomy branch. Any final physical purge must preserve the verified canonical counts below.

## Verified Atlas state after repair
- Quant filter: 1804
- FND26: 858
- COL2627: 946
- Tahsili Math: 1258
- Global question total: 3062
- Skills Center Quant: 25 main / 95 sub / 1804 questions
- Global Skills Center canonical: 87 main / 322 sub
- Question Center coverage: 47 main / 163 sub
- Quant coverage: 25 main / 93 sub
- pending_review: 0
- draft: 1258
- approved: 1795
- rejected: 9

## Code hardening
- Reject question writes when `subject` and explicit `subjectId` diverge.
- Coverage API exposes `draftCount`.
- Question Center displays a separate Draft counter.
- Staff taxonomy bootstrap only returns sections/skills attached to an existing canonical path/subject/section.
- Section and skill writes validate canonical taxonomy parents.
- Regression coverage added to `smoke-question-skill-full-coverage-contract.mjs`.

## Acceptance gate
The task is GREEN only after PR CI is green and Atlas → API → UI shows the verified counts above.
