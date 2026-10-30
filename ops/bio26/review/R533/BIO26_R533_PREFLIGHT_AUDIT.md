# BIO26 R533 preflight reconciliation | 2026-10-30

## Frozen sources
- Taxonomy: a2ee6daf6279354db6bce723c8110c9d966e3370.
- Question range map: 9e38eb5b9d2adc8750d135d2f1c3410b456177cd.
- AI-context index: 2,832 effective canonical records, 2,835 source appearances, 0 pending, source-key answer cross-check PASS 2,832/2,832.

## Prior coverage
- R523 exact IDs: S03-03, S04-01, S10-02, S13-02, S16-04, S17-01, S22-02, S26-03.
- R524 exact IDs: S09-01, S10-03, S14-01, S16-02, S17-04, S23-04, S25-04, S27-03.
- R525-R530: 48 IDs from local manifests.
- R531: 8 IDs from remote skill index.
- R532: 8 IDs from remote skill index.
- Total before R533: 80 unique skills.

## Exact alias IDs
L10-Q025, L35-Q036, L40-Q092.

R532's checkpoint described exclusions as whole lessons L10/L35/L40, which was overbroad. R532 selected S26-02 from L40 Q15-Q28; that range does not contain excluded Q092 and remains canonical. No R533 range contains any alias ID.

## R533 ranges
| Skill | Lesson | Source ranges | Items |
|---|---|---|---:|
| S23-03 | L36 | Q23-Q27; Q80-Q86 | 12 |
| S09-02 | L08 | Q69-Q79 | 11 |
| S18-01 | L29 | Q1-Q4; Q23-Q29 | 11 |
| S18-03 | L30 | Q1-Q6; Q12-Q16 | 11 |
| S19-03 | L31 | Q10-Q14; Q19-Q23 | 10 |
| S07-02 | L06 | Q13-Q16; Q61-Q65 | 9 |
| S12-02 | L17 | Q8-Q11; Q24-Q28 | 9 |
| S12-03 | L17 | Q12-Q16; Q29-Q32 | 9 |
| Total | | 15 range rows | 82 |

## Source-context limitation
The base BIO26_AI_CONTEXT.json returned zero bytes/too-large. The index and all 15 range-map rows were read, but the 82 original stems and answer explanations were not individually reread. The new teaching content and questions were authored independently and are not transcriptions.

## R531 binary recovery
The R531 remote review directory contains checkpoint, indexes, source references, QA, manifest summary and archive-hash sidecar only. No binary archive, diagram HTML/PNG/PDF, skill HTML/PDF, or unified book payload is present. Original R531 binaries remain unrecovered.

## Drive
Direct folder open returned Internal Error; no Drive connector is exposed. No Drive read or upload is claimed.