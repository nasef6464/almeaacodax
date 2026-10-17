# Einstein FND26 + COL2627 — source-first quantitative taxonomy audit

Status: **IN PROGRESS / NO PRODUCTION DATA MUTATIONS** (2026-10-12)

## Scope and source authority

- Frozen production taxonomy: **25 main skills / 95 subskills**. Keep all skill IDs stable.
- Original approved sources: `تاسيس انشتين معدل .pdf` (FND26) and `تجميع انشيتن معدل(1).pdf` (COL2627).
- Production Atlas read-only snapshot at audit opening: FND26 **858** records, COL2627 **946** records.
- Existing prior source locks: `docs/audits/FND26_CONTENT_LOCK_FINAL_2026-09-28.md` and `docs/audits/COL2627_CONTENT_LOCK_FINAL_2026-09-28.md`; source defects **2/7 rejected**. Previous structural locks are not automatic proof that each subskill concept is pedagogically optimal.
- Do not transfer a question based only on nearby questions, chapter/page number, question numbering, or its old database classification.

## First executed review — operations on numbers

Read both original PDFs, source explanation/rules, and current live identifiers:
- FND26 printed pages **5–9**: **18 live question records** in the examined rule spans (book pages 6–9); 1.2, 1.3, 1.4.
- COL2627 printed pages **5–6**: **30 live question records**; 1.1, 1.2, 1.3, 1.4.
- Saved source-to-code-to-subskill mapping in `ops/einstein-taxonomy/source_first_chapter_crosswalk_20261012.json`.
- **0 confirmed safe reassignments so far for the initial 48**. Most current groupings match source rules, and no production question was changed.
- Explicit review: `QDR-QNT-COL2627-P005-Q07` (sum of squares) is printed inside rule 1 but may require a different pedagogical presentation; DO NOT move it without a source/video/drill review.
- FND26 source questions numbered **14–15** on p8 and **16–19** on p9 were visible in the source, while exact-code lookups did not find the expected live identities. Check aliases, extraction choices, and import history before treating as missing. Do not fabricate new question records.

## Second executed review — divisibility and deliberate cross-topic cases

- FND26 printed pages **10–14**: **23** live item codes matched, with division/prime questions and intentional *absolute value* (7.4) and *units digit* (1.5) exceptions.
- COL2627 printed pages **7–8**: **29** live item codes matched, including the age/divisibility item tagged 16.1 and absolute-value/units-digit exceptions.
- Source/code/current-subskill mapping preserved in `ops/einstein-taxonomy/source_second_chapter_crosswalk_20261012.json`.
- **0 automatic skill rewrites**: all 52 current primary subskills match the source-aware proposed groups. Two FND26 p14 late items remain marked for pedagogical review, as printed division questions require proving their underlying units-digit shortcut.
- Total saved source-group mappings from first two chapters: **100** (FND26 41, COL2627 59); all awaiting final individual-question image check and, where needed, drill-level approval. Zero production edits.

## First-pass chapter-triage across both banks

A read-only comparison of stored subskills with original book section boundaries showed numerous **cross-chapter concepts**:
- Source FND26 p13 contains *absolute value* questions currently linked to 7.4 — conceptually correct even though the page is in the divisibility chapter.
- Source FND26 p14 contains *units digits* questions linked to 1.5 — conceptually relevant.
- Source COL2627 p8 has absolute-value items linked to 7.4, and p32 has GCD/LCM items linked to 2.3.
- Similar valid cross-chapter examples include zakat in proportionality sections and shaded-area problems in quadrilateral sections.

**Crucial:** Cross-chapter mismatch is a review flag, not evidence of misclassification. Several were positively identified as correct. Do not mass-update all exceptions to the current chapter.

## Execution requirements for subsequent batches

1. Source-first scan of FND26 from start to finish, then COL2627 in book order. Review *actual question image*, printed rule heading, mathematical idea, correct response, and neighboring examples.
2. For each question, produce `questionCode, imageHash, sourcePage, sourceRule, currentMainSkillId, currentSubskillId, proposedMainSkillId, proposedSubskillId, evidence, confidence, disposition`.
3. When book rules are small and share the same mathematical method, keep one canonical subskill (e.g. 1.2 combines repeated addition and common factors). A large independent concept (e.g. order of operations 1.4) remains its own subskill.
4. If the source page and concept disagree, favor mathematically demonstrated solution method and the stable taxonomy, and **require visual review**. Never relabel automatically by page boundaries.
5. Only approved confirmed mismatches may enter a guarded migration: backup exact original question fields by canonical code, verify expected image hash and current skill pair, change minimal skill fields, preserve old quiz/assessment attempts, retest learning links and student skill reports, and run rollback verification.
6. Once both Einstein banks are fully certified, and only then, apply the same audit to MNSF26; never contaminate approved source banks with MNSF26 heuristics.
7. Generate teacher PPT files **after** the training `questionIds` and verified skills are synchronized. The question text/photo must match the live `questionCode`. Audit interactive video and per-question media separately.

## Read-only scanner

`cd server && npx tsx src/scripts/auditEinsteinTaxonomySource.ts /tmp/einstein-source-taxonomy-audit.json`

Reads the two Einstein banks and the frozen taxonomy, checks both chapter manifests' question codes, flags structural issues, and collects cross-chapter triage records. Never updates the database. The script has not yet been run in the repository execution environment; observed live database reads were performed independently using the connected read-only Atlas operations.

**Done is NOT:** passing a schema validation, counting 858/946 records, or mapping all items automatically from printed chapter headings.

**Final close gate:** item-by-item source/image-semantic review, 25/95 stable, verified migrations only, drills and quiz selections revalidated, no change to historical student attempts, sample browser student/teacher/admin retests and provenance report.
