# Einstein source-first mapping decision — 2026-10-12

Project: ALMEAA Quant. This is an active execution decision, not an optional recommendation.

- The books `تاسيس انشتين معدل .pdf` (FND26) and `تجميع انشيتن معدل(1).pdf` (COL2627) are the primary authority for lesson sequence, numbered rules, and original question grouping.
- Numbered rules restart per **lesson**: match lesson + rule, never rule number alone.
- The platform keeps the existing 25 parent skills and 95 subskills as stable target IDs. Map each book lesson/rule into those IDs by a **documented, source-evidenced** dictionary.
- Never invent book labels or mathematically reinterpret a question against a clearly printed rule/heading. An unclear heading or question belongs to `SOURCE_REVIEW_REQUIRED`.
- Printed source pages with two distinct rules must have per-question visual alignment before promotion to `VERIFIED`. Merely reading a question from that page does not prove which printed rule it belongs to.
- Correct the question's stored skill when a true mismatch is proven; then rebuild affected drill assignments and experimental quiz distributions. Existing student results are **demo/test data** (per project owner) and are not a blocker to this cleanup.
- Keep canonical question IDs, original source images, printed question numbers, and source tags to prevent re-import duplicates.
- First complete FND26, then COL2627, then MNSF26. Book-scoped audits and grouped teacher slides must not mix banks arbitrarily.
- Before applying edits: generate a snapshot of the fields changing, compare current values and the PDF evidence, dry-run isolated, then guarded minimal write and a post-write verification. This is for data integrity, not protection of any real learner records.
- Status vocabulary: `SOURCE_GROUP_MAPPED` → `INDIVIDUAL_VISUAL_VERIFIED` → `CORRECTION_APPROVED` → `APPLIED_AND_RECHECKED`. Mapping a code alone never means fully reviewed or approved.

## 2026-10-12 persisted checkpoint

Source-linked grouped manifests now cover **304 distinct live question codes**:
- Operations chapter: 48 (FND26 18, COL2627 30)
- Divisibility chapter and source exceptions: 52 (FND26 23, COL2627 29)
- Fractions chapter: 137 (FND26 43, COL2627 94)
- Decimals chapter: 67 (FND26 27, COL2627 40)

Total: FND26 **111/858**, COL2627 **193/946** (not necessarily final visual approval).
Explicit page-transition checks remain open. No confirmed source-backed database retagging was applied in this checkpoint. Production mutations: **0**.

Do not report closure until every one of the 858 FND26 and 946 COL2627 source question records has a reviewed assignment and any downstream practice/quiz selection errors are rectified.
