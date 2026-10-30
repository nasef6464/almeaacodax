# BIO26 R528 checkpoint | 2026-10-30 | REVIEW ONLY

## Verified inputs
- Frozen taxonomy: `ops/bio26/BIO26_TAXONOMY_PRODUCTION.json`, blob `a2ee6daf6279354db6bce723c8110c9d966e3370`.
- Frozen totals: 29 main maps, 98 subskills, 2,832 canonical questions, 2,835 source occurrences, 147 learning quizzes, 71 standard tests.
- Read R527 checkpoint, manifest summary, question register, dedupe audit, QA and complete ZIP; its 575-entry archive passed CRC.
- R527 review branch head: `483a5a1daf1ae51c37d46eb7aa010fc842397265`; it was 38 commits ahead of main and 0 behind. Main head remained `bf7281fc9fe34165a070e3d2d58f65f91b4a3ef7`.
- Read the question-range map, AI-context index, 2,091-item editable AI context, and L39/L40/L43 shards for selected-skill ranges, concepts and canonical/alias status.
- Read existing-bank QA, dedupe and import manifests. No protected source question, answer key or test was changed.
- Drive folder access was attempted, but no Drive content could be read and no Google Drive connector is exposed in this session. No Drive read/upload is claimed.

## New R528 slice
| Skill | Map | Source occurrences | Canonical |
|---|---|---:|---:|
| BIO26-S07-03 | BIO26-M07 | 31 | 31 |
| BIO26-S04-02 | BIO26-M04 | 30 | 30 |
| BIO26-S20-01 | BIO26-M20 | 30 | 30 |
| BIO26-S01-03 | BIO26-M01 | 29 | 29 |
| BIO26-S06-01 | BIO26-M06 | 29 | 29 |
| BIO26-S27-04 | BIO26-M27 | 29 | 29 |
| BIO26-S26-04 | BIO26-M26 | 28 | 27 |
| BIO26-S25-02 | BIO26-M25 | 27 | 27 |

Total: **233 source occurrences / 232 canonical items**. The one-item difference is the frozen L40 alias exclusion.

## Delivered
- 8 deepened skill pages, each with a teaching idea, case, causal explanation, concept map, comparisons, exam traps and 2 original explained MCQs.
- 16 original editorial questions, marked NOT BANK ITEM.
- 8 original editable HTML diagrams, 8 PNGs and 8 PDFs.
- 8 updated main-map summaries.
- Updated 127-chapter unified HTML, 29-map atlas HTML, skill/map addenda, individual skill PDFs, unified PDF, atlas PDF and EPUB.
- Unified PDF: 286 pages. Atlas PDF: 59 pages (49-page R527 atlas plus 10-page R528 map addendum). Skill supplement: 32 pages. Map addendum: 10 pages.
- EPUB: 127 chapters, 130 XML/XHTML/OPF files, CRC PASS, zero XML errors, 8 new diagram images.

## QA limits and open gates
- Unified HTML contains 127 articles = 29 maps + 98 skills; selected IDs occur once; zero missing local images.
- Lexical audit: 16 new questions compared with 149 visible prior editorial blocks; maximum similarity 0.464; zero pairs at or above 0.65. This is preliminary, not full semantic approval against all 2,832 canonical question images.
- Still required: independent biology review, full-bank semantic comparison, PDF/UA, Arabic screen-reader test, official EPUBCheck and authorized non-production import dry-run.
- Full-book WeasyPrint rendering timed out twice. The unified PDF was recovered by replacing only the eight selected map pages and eight selected two-page skill ranges in the validated R527 PDF; untouched pages were preserved.

## Protected state
No changes to taxonomy, canonical question crops, answer keys, AI-context records, 147 learning quizzes, 71 tests, commercial policy or student data. No production import, PR, merge to main or publication.
