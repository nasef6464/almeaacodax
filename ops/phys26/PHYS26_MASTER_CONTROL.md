# PHYS26 — Master Control / physics only

**Track:** ALMEAA / Physics (Tahsili)  
**State:** PHASE_1_IN_PROGRESS (source baseline verified locally; code/data migration not executed)  
**Master tracking:** https://github.com/nasef6464/almeaacodax/issues/460  
**Dedicated branch:** `content/phys26-full-closure`

## Source of truth
The three user-provided 2026 Yelo PDFs are recorded with page count, byte size and SHA-256 in `ops/phys26/PHYS26_SOURCE_INVENTORY.json`. They are *not* checked into GitHub.

**Important coverage distinction:** the foundation PDF contains 13 indexed lessons ending at thermal physics (first/second secondary); its third-secondary foundation section is explicitly absent. The question PDF contains 31 indexed lessons, both question sections. Supplemental summaries are references to laws, definitions and diagrams, not a third-secondary foundation substitute. Do not claim missing lessons are already complete. Rights clearance is required for any public reuse of protected source pages/questions.

## Target taxonomy (CANDIDATE ONLY)
- Approximate aim: **25 main / 90 subskills**; verified structural totals from the prior candidate artifact, not yet per-question certified.
- All **31 source lesson groups** have a proposed main-skill parent.
- Proposed editable initial free setting: first 5 main skill learning topics and their related drills, including subordinate topics. No hardcoded permanent restriction.
- No new or alternate PHYS26 taxonomy in production until a protected subject/reference baseline and mapping check passes.
- Existing draft artifacts in this conversation: `PHYS26_TAXONOMY_CANDIDATE_25x90.json` and `PHYS26_TAXONOMY_25x90_AR.md`. Import/export verified contents into this branch before freezing IDs; do not invent a replacement silently.

## Six gated execution phases
1. **Source & taxonomy:** PDFs fingerprinted, current live physics baseline and historic links audited, 25/90 candidate critically mapped to 31 lessons, executable verification and checkpoint. State: IN PROGRESS.
2. **Foundation:** main/subtopic mapping and rich law/unit/graph context, explicit gap list for missing foundation chapters. State: NOT STARTED.
3. **Question bank:** both source sections; each question's page/index, actual options, source-approved answer evidence, crop/layout and main/subskill, hashes and semantic dedupe. State: NOT STARTED.
4. **Content QA & drills:** source-authenticated all-bank questions; ~10 per subskill and 30–40 per main skill where enough verified source exists; avoid artificial fill or exhausting future reserve. State: NOT STARTED.
5. **Local release preparation:** immutable READY package SHA, dry-run, isolated Mongo UAT, integration and failure-mode contracts. State: NOT STARTED.
6. **Controlled production:** protected approvals/licensing, exact-head CI, R2+remote checksums, canary 5 then resumable draft import, integrity/learner/role/report E2E, final closure evidence. State: NOT STARTED.

## Safety rules
- **No PDF extraction/OCR/image crops on Render.** Perform heavy work in an isolated local/Codex environment; keep Atlas and Vercel lean.
- Never mutate existing physics records/skill progress/results without read-only baseline, protected snapshots and rollback plan.
- Never invent source content, option text, answer key, physical constants, diagrams or verification status.
- Quarantine bad/ambiguous items and move to independent batches without silently releasing them.
- Do not circumvent permissions, CI, RBAC, CSRF, endpoint credentials, licensing or deployment safety.
- Use CHEM26/BIO26 as design references, not shared subject IDs/skill IDs or untested importer scripts.
- Comprehensive mock exams are **out of scope for now**.
- **CLOSED only after actual production integrity + student E2E + reports/skill linking passes.**

## Evidence ledger
Update `ops/phys26/PHYS26_EXECUTION_LEDGER.json` with each real run; enter exact counts, branch/head, source artifacts, QAs, blockers and next step. Never count generated placeholders or mere scan attempts as verified questions.
