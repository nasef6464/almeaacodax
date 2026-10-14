# ALMEAA Quant — Einstein taxonomy reconciliation and student journey (2026-10-14)

**Status: DRAFT / SOURCE QA REQUIRED / NO PRODUCTION MUTATIONS.**
This is an independent handoff for ongoing GitHub PR #529 and NotebookLM candidate review; NOT approval for taxonomy deployment.

## Evidence-based baseline
- Production-facing identifiers such as skill_quant_03 / sub_quant_03_1 are stable IDs. NotebookLM aliases such as Q04.02 must never overwrite them.
- PR #529 reports 25 main / 95 subskills, 858 FND26 + 946 COL2627 = 1,804 questions (2026-10-12 checkpoint).
- PR #529 reports 918 question codes matched to page/chapter manifests, BUT ONLY FIVE individually cross-checked against a printed Einstein rule and Atlas text; production images were not certified.
- An earlier repair removed two unsupported zero-question legacy subskills. Do not reintroduce old IDs from the deprecated deployment script.
- server/src/models/Skill.ts contains durable nested subskills. utils/foundationSkillTarget.ts resolves topic skillId / skillIds. server/src/models/SkillProgress.ts keys mastery by skillId.
- NotebookLM's submission claims 29/108 but actually contains 29 distinct main codes and 104 unique candidate subskill rows. Its page/rule statements are still not independently verified; candidate aliases change meaning between versions.

## Preflight artifacts, intentionally non-deployable
- ops/quant-skill-redesign/EINSTEIN_NOTEBOOKLM_20261014_CANDIDATE.json: 104 candidate rows. source_verified=false; no canonical ID mapping.
- scripts/audit-quant-einstein-proposal.mjs: read-only structural audit and blockers. Does not connect to MongoDB, API or Render.
- Run from repo root: node scripts/audit-quant-einstein-proposal.mjs --fail-on-block
- Expected outcome now is a NONZERO exit code (declared 108 versus actual 104, no source verification or complete crosswalk).

## Design choice — simple student experience, fine-grained mastery
1. Student navigation: quantitative subject → main foundation topic → existing lesson page with the video and a short relevant practice. Never show 104 flat links on the student's home screen.
2. Main skills: topic-group cards with mastery/progress. Subskills: small expandable checklist, targeted practice and foundation-video redirects.
3. One foundation topic can link to multiple subskills using the existing Topic.skillIds array; preserve topic/subtopic IDs, their hierarchy and all video URLs.
4. A question's primary subskill is the actual printed Einstein mathematical rule, not its apparent chapter. Attach auxiliary skills only when mathematically necessary.
5. Merge like operations when pedagogy aligns: add/subtract fractions, multiply/divide fractions; same for decimals. Keep root add/subtract separate from root multiply/divide.
6. "Solve backwards", "test the choices", etc. are usually solving strategies rather than replacing the primary mathematical concept.
7. Target subskill/topic drills: 10–15 diverse, verified questions. Main skill drills: ~30–40 items each, use 2–3 drills only when the bank permits; reserve questions for mock examinations and never leak the full bank. Access to initial 4–5 items is admin-configurable free/paid, not a permanent code rule.
8. Weak subskill in student results → exact existing foundation topic → relevant video/practice. Preserve historical question attempt IDs; no automatic re-scoring without review.

## Required OLD → NEW crosswalk (read-only)
Fields: canonical_main_skill_id, canonical_main_skill_name, canonical_subskill_id, canonical_subskill_name, candidate_code, candidate_name, source_book, printed_rule, source_page, original_question_code, original_question_crop_checked, existing_topic_id, existing_subtopic_id, relation (keep/merge/split/add/review), review_decision, reviewer, confidence.
- No name-based automatic migration; canonical IDs never change merely because proposed headings or Q codes differ.
- Every old ID must be preserved or explicitly reviewed for retirement; avoid changing topic/video/free-paid IDs and links.
- Question identity stays internal id plus stable questionCode, NOT a generated NotebookLM row number.
- Verify actual source pages and question images; page adjacency or a declared "verified" label is not evidence.
- Resolve overlapping root rationalization, clocks/ages/finance, geometry, statistics, patterns, and strategy tagging.

## Sequenced execution
1. Read-only current baseline export: 25/95 live skill IDs, all foundation topic/subtopic IDs, videos, bank question IDs/source codes, drills, quizzes.
2. Finish FND26 original-book rule+image review, then COL2627. Track unique question IDs and review status, prioritizing 886 unmanifested and 913 manifested-but-not-individually-reviewed records in PR #529.
3. Produce explicit many-to-many crosswalk of candidate concepts → existing ID(s) and topic(s); independent mathematical QA for every proposed split/merge.
4. Dry-run on isolated Mongo with snapshots; reconstruct drills if their verified question assignments changed; maintain reserve for tests.
5. Browser UAT: student sees clear domain/topic/skill links, video/drill opens correct existing topic, reports identify weak subskills; test free/paid, admin, teacher.
6. Exact-head CI, canary, integrity audit, approval, then controlled release. Never run migration from this proposal.

## Acceptance gates
- Original book page AND individual question/image evidence for affected skills (no estimates).
- Confirm all 1,804 bank question identities and their actual final scope on a fresh read-only snapshot; no duplicate or missing questionCode.
- Preserve student and media IDs, lesson links and entitlement flags. All Question skillId/subSkillId/subSkillIds, Topic skillId/skillIds and drill/report references valid.
- Explicit reviewed mapping, isolated dry-run, rollback artifact, exact-head CI and browser PASS.
- PR #529 remains draft until its own source-first audit closes; avoid competing mutations on production.

**Current status:** CANDIDATE ONLY. The 29/104 candidate table is not approved and source PDFs were not independently accessible in this review.
