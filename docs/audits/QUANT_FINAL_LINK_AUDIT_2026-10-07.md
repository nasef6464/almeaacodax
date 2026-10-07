# Quant Final Link Audit — 2026-10-07

## Scope

Subject: Qudurat Quant  
Subject ID: `sub_1777779748206`

Canonical source banks:
- FND26 — 858 source questions
- COL2627 — 946 source questions
- Total — 1804

This audit does **not** include future comprehensive exams. Those will be created later from a separate new question bank.

## Source-to-skill review status

The stricter source-rule audit requested on 2026-10-05 was completed and closed in Issue #368.

Final source review:
- FND26: 858 / 858 reviewed
- COL2627: 946 / 946 reviewed
- Total: **1804 / 1804**
- Source precedence: lesson/section -> explicit rule -> questions under that rule -> mathematical idea
- Keyword-only remapping is forbidden.

Issue #368 final closure also locked:
- strategy sections in FND26 P70-P74
- strategy sections in COL2627 P44-P46
- high-risk corrected anchors including FND26 P088 Q17-Q20 and COL2627 P079 Q11.

Historical evidence:
- Batch 07: `8cefee24395449f5cbb0efac4948c3606479b6c4`
- Regression gate: `e9f044b1c071f4ecaa3d7626a87ac8cd64dd2a2a`
- npm gate wiring: `f69211286d0be738ef6fe01cfdbe58fe6b78a791`
- Final closure report commit: `c9c386a7a281c8fc8e7db0e5fefb5d71aaa74637`

The original report and regression were left on the audit branch and did not reach `main`. This 2026-10-07 audit restores the regression protection to a main-targeting PR and re-verifies the live database.

## Live source-question integrity — 2026-10-07

Atlas live recheck:
- total = **1804**
- FND26 = **858**
- COL2627 = **946**
- missing/invalid `skillId`, `subSkillId`, or `difficulty` = **0**
- main skill exists = **1804 / 1804**
- subskill belongs to declared main = **1804 / 1804**
- canonical `skillIds` pair is valid on current source records = **1804 / 1804**
- `sectionId` matches current main skill = **1804 / 1804**

Current difficulty distribution after the completed source audit:
- FND26: Easy **279**, Medium **557**, Hard **22** = 858
- COL2627: Easy **297**, Medium **599**, Hard **50** = 946
- Combined: Easy **576**, Medium **1156**, Hard **72** = 1804

### Section-link repair

The live link census found 15 stale `sectionId` values while the current `skillId/subSkillId` mappings were already canonical.

Before repair, a full rollback copy was created:

`qudurat_rb_section_link_fix_15_20261007`

Rollback documents: **15 / 15**.

The 15 stale section fields were then aligned to the already-selected main skill. No question text, image, answer, primary skill, subskill, or difficulty was changed by this repair.

Post-write verification:
- section match = **1804 / 1804**
- subskill parent match = **1804 / 1804**

## Skill and topic graph

Canonical taxonomy:
- main skills = **25**
- subskills = **95**

Foundation topics:
- main topics = **25**
- subtopics = **95**
- subtopic own-skill link = **95 / 95**
- subtopic -> expected drill = **95 / 95**

Access policy:
- first 5 main foundation topics free
- main topics 6-25 paid
- subskill drills inherit the parent foundation access
- all main-skill training is paid

## Subskill foundation drills

Live audit:
- total drills = **95**
- total question references = **1200**
- all question refs resolve = **95 / 95 drills**
- duplicate IDs inside a drill = **0**
- every question matches the drill subskill = **95 / 95 drills**
- drill skill link correct = **95 / 95**
- drill -> topic placement correct = **95 / 95**
- topic -> drill backlink correct = **95 / 95**
- access matches parent topic = **95 / 95**
- size range = **9-15**

Known source ceilings intentionally preserved:
- `drill_sub_quant_13_2` = 9
- `drill_sub_quant_15_1` = 9

No fabricated question is added only to force the count to 10.

## Main-skill training

Live audit:
- total cards = **39**
- total question references = **1358**
- all refs resolve = **39 / 39 cards**
- duplicate IDs inside a card = **0**
- every question matches the intended main skill = **39 / 39**
- card skill link correct = **39 / 39**
- access = paid = **39 / 39**
- training placement = paid = **39 / 39**
- size range = **29-40**

Known exact-source ceiling:
- `bank_skill_quant_15_g01` = 29

No fabricated or wrongly remapped question is added only to force the count to 30.

## Source-question coverage in training

Previously closed and still authoritative:
- approved FND26 used = **856 / 856**
- approved COL2627 used = **939 / 939**
- approved source total used = **1795 / 1795**
- rejected source questions referenced in training = **0 / 9**

## Video / lesson links

Current live state:
- Quant lessons = **18**
- lessons with a video URL = **13**
- subtopics with non-empty `lessonIds` = **20 / 95**
- subtopics without `lessonIds` = **75 / 95**
- unique lesson records referenced by topics = **6**
- unreferenced lessons = **12**
- unreferenced lessons with a video URL = **11**

This is a real remaining content-link gap. Existing unreferenced videos must **not** be attached by title/keyword alone. They require a verified skill/topic match before linking.

## Global multi-subskill behavior

Multi-subskill authoring is a platform-wide question behavior, not a Quant-only feature.

PR #444 is responsible for making the behavior end-to-end:
- authoring/import persists `skillId`, `subSkillId`, `subSkillIds`, and complete `skillIds`
- quiz scoring and result analysis consume all linked subskills
- SkillProgress/review evidence retains all linked skills
- singular fields remain for backward compatibility

The Quant regression gate is compatible with both historical single-subskill records and future explicit multi-subskill records.

## Comprehensive exams

Excluded from this closure by current product decision.

The future Quant comprehensive/mock tests will be built from a **new question bank** supplied later. No new comprehensive exams are generated from FND26/COL2627 as part of this audit.

## Closure status

Closed:
- source-to-skill review: **1804 / 1804**
- source question structural links: **1804 / 1804**
- subskill drill graph: **95 / 95**
- main-skill training graph: **39 / 39**
- main training paid policy: **39 / 39**
- approved source usage: **1795 / 1795**
- rejected usage: **0 / 9**

Remaining:
- video/lesson mapping: **75 subtopics currently have no lesson link**
- PR #444 must pass CI and merge to make global multi-subskill behavior end-to-end in `main`.
