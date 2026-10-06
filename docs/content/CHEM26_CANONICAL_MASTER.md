# CHEM26 CANONICAL MASTER

## Purpose
هذا الملف هو المصدر الرسمي الوحيد لحالة CHEM26. أي محادثة كيمياء أخرى يجب أن تقرأه أولًا وألا تنشئ مسارًا موازيًا أو تعيد تنفيذ أعمال مغلقة.

## Canonical production state
- Question bank batch: `TAH-CHEM-CHEM26-FULL-V1`
- Questions approved: **1708**
- Draft questions: **0**
- Taxonomy: **27 Main Skills / 99 SubSkills**
- Foundation topics: **27 Main Topics / 99 SubTopics = 126**
- Question source: كتاب التجميعات، القسم الأول + القسم الثاني.
- Foundation source: كتاب التأسيس للشرح والمفاهيم وبناء المهارات، وليس كبنك أسئلة.

## Closure ownership
- PR #391: canonical question-bank closure / restart-safe closed importer.
- PR #410: canonical foundation + skill-training structure.
- PR #367 and #371 are superseded and intentionally closed.

## Foundation access policy
- Main topics orders 1–5: free / unlocked.
- Main topics orders 6–27: locked / package-gated.
- Subtopics inherit the same policy through their parent main skill.
- Current production:
  - Main topics free: 5
  - Main topics locked: 22
  - Subtopics free: 23
  - Subtopics locked: 76

## Canonical training structure
Only IDs beginning with the following are canonical:
- `chem26_foundation_*`
- `chem26_training_*`

Current production:
- Foundation drills: **99**
- Main-skill training drills: **40**
- Total canonical drills: **139**
- All 139: approved, published, and visible.

### Foundation drills
- One drill per SubSkill.
- Exact SubSkill scope.
- Up to 10 approved source questions per drill.
- If fewer than 10 source questions exist, use all available source questions only; do not invent filler questions.
- Free for SubSkills under Main Skills 1–5.
- Package-gated for the remaining SubSkills.

Current access split:
- Foundation drills free: 23
- Foundation drills paid/package: 76

### Main-skill training
- 30–40 questions where source inventory permits.
- A Main Skill with at least 60 approved questions is split into two parts.
- Question selection balances across SubSkills and prefers questions not already used in foundation drills.
- No duplicate question between part 1 and part 2 of the same Main Skill.
- Main Skills 1–5 are free in Training; all parts belonging to those five skills are free.
- Remaining Main Skills are package-gated.

Current access split:
- Main-skill training quizzes free: 8
- Main-skill training quizzes paid/package: 32

## Legacy cleanup
A temporary manually-created duplicate training set was removed after the canonical PR #410 runtime structure was verified:
- Legacy quiz IDs removed:
  - `drill_sub_tah_chem_*`
  - `bank_skill_tah_chem_*`
- Removed legacy quiz count: **130**
- Backup collection: `quizzes_backup_chem_manual_pre_unify_20261006`
- Backup count: **130**
- Legacy links removed from all 99 SubTopics.
- Canonical SubTopic links remain 99/99.

## Non-regression rules
1. Do not change the 1708-question classification when working on training/foundation.
2. Do not create a second chemistry taxonomy.
3. Do not create alternative drill IDs.
4. Do not revive PR #367 or #371.
5. Do not change free/paid policy outside the first-five rule without a new explicit product decision.
6. Any future CHEM26 work must update this master record and the canonical verifier rather than starting a parallel path.

## Current source of truth
- Repository main at master creation: `d388c74ea040ab38456faaaa257bebd6327f0da5`
- Production question bank: 1708 approved / 0 draft.
- Production learning structure: 139 canonical drills.
- Canonical structure implementation:
  - `server/src/app/bootstrap/chem26LearningStructurePlan.ts`
  - `server/src/app/bootstrap/runChem26LearningStructure.ts`
  - `server/src/scripts/verifyChem26LearningStructure.ts`

## Status
**CHEM26 question bank: CLOSED**
**CHEM26 taxonomy: CLOSED**
**CHEM26 foundation/training structure: CANONICAL AND ACTIVE**
