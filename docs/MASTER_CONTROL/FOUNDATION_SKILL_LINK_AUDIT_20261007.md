# Foundation Skill ↔ Topic Production Audit — 2026-10-07

## Scope
Read-only audit of production MongoDB Atlas `almeaa` after PR #432 reached Vercel production.
The audit checks learner-facing Foundation routing and current content availability for the active Qudurat/Tahsili subjects.

## Routing contract
Every learner skill action targets the same canonical Foundation topic:
- Video → `content=lessons`
- Training → `content=quizzes`
- Support file → `content=support`

A missing canonical topic must remain unavailable. No student route may guess another subject/course/quiz.

## Production mapping results
| Subject | Canonical skills | Explicit Skill→Topic | Notes |
|---|---:|---:|---|
| Qudurat Quant | 120 (25 main + 95 sub) | 120/120 | PASS |
| Qudurat Verbal | 98 (22 main + 76 sub) | 98/98 | 9 root topics were title-only before this audit; repaired to explicit `skillId/skillIds` in production |
| Tahsili Math | 92 (22 main + 70 sub) | 92/92 | PASS routing |
| Tahsili Physics | 9 legacy flat skills | 0/9 | No visible Foundation topics exist; do not fabricate topics |
| Tahsili Chemistry | 126 (27 main + 99 sub) | 126/126 | Every parent skill also appears in child `skillIds`; resolver must prefer root for main skills |
| Tahsili Ecology | 9 legacy flat skills | 0/9 | No visible Foundation topics exist; protected legacy subject |
| BIO26 Biology | 127 (29 main + 98 sub) | 127/127 | Every parent skill also appears in child `skillIds`; resolver must prefer root for main skills |

No duplicate explicit mapping was found in Quant, Verbal, or Tahsili Math. Chemistry and BIO26 intentionally carry parent skill IDs on child topics, so generic `find()` order is unsafe for main-skill routing. The follow-up code change makes root/child type part of resolution.

## Current child-topic content availability
These counts describe **current production content**, not routing correctness.

| Subject | Child topics | Playable lesson/video now | Usable training now | Support file now |
|---|---:|---:|---:|---:|
| Qudurat Quant | 95 | 20 | 95 | 0 |
| Qudurat Verbal | 76 | 0 | 76 | 0 |
| Tahsili Math | 70 | 0 | 0 | 0 |
| Tahsili Chemistry | 99 | 0 | 99 | 0 |
| BIO26 Biology | 98 | 0 | 0 | 0 |

Interpretation:
- A valid topic link can correctly open an empty tab when content has not yet been attached. Future media/training/support linked to that same topic will appear without changing report/result URLs.
- Support remains empty because visible Foundation topics currently have no `libraryItemIds` attachments, even though a small number of subject library items exist.
- Physics/Ecology are not routing defects: there are no visible Foundation topics to route to.

## Production data repair performed
Nine Verbal root topics `top_verbal_main_14` … `top_verbal_main_22` were unique exact-title matches inside the Verbal subject but lacked explicit skill mapping.
They were updated in production to:
- `skillId = skill_verbal_14 … skill_verbal_22`
- `skillIds = [same skillId]`

Verification after the update: **98/98 Verbal canonical skills now have an explicit visible topic mapping; 0 ambiguous mappings.**

## Follow-up code hardening
`resolveFoundationSkillTarget` is changed so:
1. main skill → explicit root topic first;
2. subskill → explicit child topic only;
3. subskill never falls back by title/legacy guesses;
4. unknown/legacy input keeps the conservative compatibility path.

This removes reliance on topic array order for Chemistry and BIO26.

## Acceptance status
- PR #432 production deployment: PASS.
- Universal Foundation action routing contract: PASS.
- Verbal explicit root mapping: PASS after repair.
- Quant/Verbal/Chemistry training availability: present as counted above.
- Math/BIO26 training content: not yet present in production; do not report as a routing failure.
- Foundation support attachments: not yet present on current visible topics.
- Physics/Ecology Foundation routing: unavailable until real Foundation topics are authored and linked.

No new learning content was invented by this audit.
