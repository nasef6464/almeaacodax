# TAH-MATH Full Taxonomy Closure — Master Control

Status: **IN PROGRESS**
Branch: `content/tah-math-full-taxonomy-closure`
Scope: Tahsili Mathematics only.

## Canonical source books

1. `كتاب تأسيس يلو للرياضيات 26 - النسخة المعدلة.pdf`
   - 96 pages.
   - Foundation index contains 31 lessons (30 core lessons + lesson 31 enrichment).
   - Lesson placement is the primary classification authority for YLM26 questions.
2. `كتاب تجميعات يلو للرياضيات 26 - النسخة المعدلة.pdf`
   - 160 pages.
   - 30 core lessons.
   - Each lesson has:
     - Section 1: 3-star questions, recent/high-priority set.
     - Section 2: 2-star questions, older/undated set.
   - The book itself states both sections should be studied; neither section is discarded.

## Logical bank model

One logical pool: `TAH-MATH`

Physical/source identity remains preserved:

- `YLM26` — foundation-source questions.
- `COL26` — collection Section 1.
- `COL26OLD` — collection Section 2 / all-bank continuation.

Do not flatten source identity or rewrite historical source metadata.

## Baselines to protect

These are repository/runtime baselines, not assumed closure claims:

- YLM26 historical baseline: 326 records.
- COL26 baseline: 1,012 records.
- COL26OLD source inventory: 1,258 source questions = 1,257 canonical + 1 alias to YLM26.
- COL26OLD final closure currently records 1,258/1,258 skill mapping coverage.

Every execution batch must re-read current runtime evidence before mutating production.

## Classification authority order

For every question:

1. Exact source lesson/page/block.
2. Source sub-heading / idea inside that lesson.
3. Mathematical idea actually required to answer.
4. Existing Tahsili Math taxonomy.
5. Existing mapping only as a candidate, never as proof.

No new skill/subskill is created solely to force-fit a question.

## Question review states

Every question must end in exactly one of:

- `KEEP` — current primary skill/subskill is supported by source + content.
- `REMAP` — current mapping is wrong; replace with source-supported mapping.
- `MULTI_SKILL` — one primary mapping + additional supported `subSkillIds`.
- `REVIEW` — source/content evidence is insufficient; no automatic production mutation.

## Review payload

For each question record, retain or derive:

- questionCode
- sourceBank
- sourcePage
- sourceSection
- sourceLessonNumber
- sourceLessonTitle
- sourceIdeaTitle
- primarySkillId
- primarySubSkillId
- additionalSubSkillIds[]
- answerVerified
- visualVerified
- mappingDecision
- mappingEvidence
- difficulty
- reviewerNotes

## Execution order

### Phase 0 — Freeze + inventory
- Re-read current main/runtime.
- Freeze source files and hashes outside production.
- Produce source lesson map.
- Produce per-bank count + status snapshot.
- No production mutation.

### Phase 1 — Foundation reference map
- Build 31-lesson foundation map.
- Extract source idea/sub-heading map inside every lesson.
- Resolve each source idea to the existing Tahsili Math taxonomy.
- This becomes the classification dictionary for all three banks.

### Phase 2 — YLM26 full audit
- Review every YLM26 question against exact source location.
- The book location is primary evidence.
- Verify answer + crop + skill in one pass.
- Exit gate: 100% questions are KEEP/REMAP/MULTI_SKILL; REVIEW=0 or explicitly blocked by source evidence.

### Phase 3 — COL26 1,012 full audit
- Review all 1,012 questions against Section 1 lesson/idea placement.
- No blind acceptance of existing IDs.
- Apply one primary subskill and bounded additional subskills where the problem is genuinely composite.
- Exit gate: missing mapping=0, invalid parent-child mapping=0, unresolved wrong-skill=0.

### Phase 4 — COL26OLD regression audit
- Preserve prior 1,258/1,258 closure evidence.
- Run distribution/anomaly audit + source-aligned review for any suspicious or affected mappings.
- Do not redo correct work blindly.
- Reopen individual rows only when evidence requires it.

### Phase 5 — Cross-bank dedupe
- Detect exact duplicates across YLM26/COL26/COL26OLD.
- Preserve source aliases.
- Do not dedupe merely because two questions share the same idea.

### Phase 6 — Coverage matrix
Generate:
`main skill -> subskill -> YLM26 count -> COL26 count -> COL26OLD count -> canonical total`

Flag:
- 0-count canonical skills/subskills
- implausible concentration
- orphan subskills
- invalid parent-child pairs
- missing skill IDs

Source shortage is reported, not filled with invented canonical questions.

### Phase 7 — Rebuild trainings/tests from corrected mapping
Only after mapping freeze:
- foundation subskill drills pull from corrected subskill mappings;
- main-skill training uses balanced child-subskill coverage;
- comprehensive tests use balanced all-bank selection;
- rejected/draft/untrusted questions remain excluded.

### Phase 8 — Live learner certification
Verify:
Student -> Test -> Question -> Submit -> Result -> SkillsAnalysis -> SkillProgress -> Foundation -> Training.

Must include:
- YLM26 question
- COL26 question
- COL26OLD question
- single-skill item
- multi-skill item
- correct and incorrect attempts

### Phase 9 — Final closure
Closure requires:
- source inventory PASS
- answer verification PASS
- visual/crop verification PASS
- taxonomy mapping PASS
- dedupe PASS
- coverage matrix PASS
- training/test reconstruction PASS
- live learner E2E PASS
- no silent production mutation outside exact approved scope

## Full question completeness gate

A question is not considered reviewed only because its skill ID is valid. Every completed row must also carry:

- difficulty: easy / medium / hard;
- complete question text and A/B/C/D option texts;
- approved answer (correctOptionIndex + answerLetter);
- explanation + whyCorrect + whyOthersWrong;
- hint (and hint2 when useful) without leaking the answer immediately;
- solvingStrategy and any genuinely applicable fast/mental/elimination/option-testing method;
- commonMistakes;
- AI context: readableText, speechText, visualDescription, mathExpressions, concepts, requiredData;
- foundationReference linking back to the matching lesson/idea/topic/training where available;
- questionFingerprint + teachingFingerprint;
- source identity: document/bank, sourceItemId, PDF/printed page/question numbers, imageHash/imageVersion;
- source/answer/visual/taxonomy/audit verification status.

No placeholder content is accepted. AI/teaching content must stay grounded in the actual source question and source book.

## Mutation safety

- Review first, mutate second.
- Work in large source-aligned batches.
- Production changes require deterministic manifest and rollback evidence.
- Do not repeatedly deploy Render/Vercel for content-only review work.
- Do not rewrite historical QuizResult/SkillProgress to fabricate new granularity.
- Do not create synthetic source questions during taxonomy repair.

## Current execution checkpoint

Started from main:
`4ced0cdf609e31fdb29338d9fc46b788752559c8`

Current active task:
**P1 is now complete. The exact production taxonomy snapshot (22 main / 67 subskills) is frozen and the 31 source lessons are bound to it. P2 YLM26 is IN PROGRESS with a 326-row deterministic review manifest. Structural core fields are complete 326/326, parent-child taxonomy integrity is 326/326, but difficulty is invalid as a pedagogical distribution (326 Medium / 0 Easy / 0 Hard). Five page-vs-skill anomalies were triaged: 3 confirmed REMAP and 2 KEEP after source/content review. No production mutation has been applied yet.**

Production pre-audit also confirms:
- COL26 = 1,012 approved records, skill mapping populated, but 1,012/1,012 lack hint and AI context and all are Medium.
- COL26OLD = 1,257 approved canonical records (1,258 source inventory including one protected alias), 67 mapped subskills, but all are Medium and hint/AI enrichment is absent.
- Exact cross-bank imageHash duplicate scan currently returns 0; historical protected alias remains handled by source identity rather than relying on imageHash alone.

Next heavy gate:
**finish YLM26 difficulty + pedagogical enrichment review, finalize the 326-row manifest, then apply only reviewed mapping corrections with rollback evidence; immediately continue into COL26 1,012 full content review.**

## RUN24 — 2026-10-08

- 209 سؤالًا فريدًا من كتاب التأسيس الرسمي تمت مراجعة صورها وحساب إجاباتها مصدرًا (176 + 33)، مع 31 سؤالًا سبق حلها؛ 178 مراجعة إجابة جديدة فريدة مقارنةً بأدلة RUN19–23. إجمالي مرشحات التحقق الرياضي الفريدة 326/326، وليس اعتمادًا تربويًا نهائيًا.
- المقارنة الحية: 208 تطابقًا من 209 مرشحات إجابة، وخطأ جديد مثبت `P021-Q04` (المصدر: قطر 3 وقوس π/2 = B؛ الإنتاج: قطر 12 من المثال المجاور وقوس 2π = C). التصحيح لم يُطبق.
- فحص 326 شرحًا حيًا كشف 23 حالة يذكر فيها الشرح حرفًا مخالفًا لمفتاح الإجابة. تحتاج فصل خطأ الشرح عن خطأ المفتاح؛ 3 حالات دلالية لم تعتمد نهائيًا.
- الإنتاج دون تعديل. إغلاق YLM26 ما زال معلقًا على نصوص الاختيارات الفعلية والشرح الكامل والربط والبصمات وصور الإنتاج.

## RUN30 — 2026-10-08

- راجعت فعليًا 200 سؤال من صفحات كتاب التأسيس الرسمي، بالصور والاختيارات، وأعدت توليدها ومطابقتها بكسليًا بالمصدر: 200/200 PASS. كلها أسئلة سبق جردها، وليست أسئلة canonical جديدة.
- صالحت 200 مفتاح إجابة مع مراجعات المصدر السابقة وحللت 4 أسئلة مستقلة جديدة. مقارنة Atlas المباشرة: 199/200 تطابق، والخطأ المعروف P021-Q04 ما زال B بالمصدر وC بالإنتاج.
- أصلحت محليًا أربع قصاصات مع حدود وبصمات قبل/بعد قابلة للرجوع: P023-Q12 وP033-Q08 وP034-Q01 وP038-Q02. صححت 3 حالات فشل وهمي في كشف حروف الاختيارات بسبب حروف أ/ج العربية.
- أعددت 4 سجلات تربوية كاملة مرشحة، لكنها ليست معتمدة إنتاجيًا. جميع سجلات YLM26 الحية الـ326 ما زالت خياراتها A/B/C/D مؤقتة، وعنوان المصدر يقول تجميعات خطأ، وتفتقد الحقول التربوية والبصمات المطلوبة. تطابقت هوية المصدر والمهارات مع المرجع المجمد 326/326.
- لم تُختبر مطابقة صور الإنتاج بسبب تعذر تنزيل صور R2، ولم يحدث أي تعديل إنتاجي. P2 ما زالت IN PROGRESS، والانتقال إلى COL26 مرهون باعتماد YLM26 الكامل.

## RUN46 — 2026-10-09

- فُحصت بصريًا 160 صورة سؤال مختلفة من كتاب تأسيس يلو للرياضيات 26 الأصلي (SHA-256: `3e2b6bfd33fcb349e527a9797785f8803303e0a9611b3d634b7c9c692a5c564c`) في 20 لوحة مصدرية. أُعيد تصيير 160 قصاصة من ملف PDF الأصلي؛ المطابقة البكسلية مع أدلة RUN42: **160/160 PASS**.
- جرت مراجعة رياضية/تعليمية كاملة مرشحة لـ24 سؤالًا مع نصوص الخيارات الأربعة، منها 4 لم يكن لها تفصيل بدائل في الأدلة المتاحة RUN36–RUN45. نجحت **21/21** اختبارات SymPy بعد تصحيح افتراض متغير حقيقي كان يستبعد الجذور التخيلية في الاختبار الأولي.
- المرشحات السابقة للإجابات 158/160، والحالتان `P036-Q09` و`P036-Q15` بقيتا HOLD؛ لا اعتماد بالافتراض. التراكمي المشروط لأحداث مراجعة المصدر RUN21–RUN46 = **4496** مع التكرار، والجرد الفريد 326.
- الحقول التعليمية والبصمات وروابط موضوعات التأسيس وصور R2 لم تُعتمد إنتاجيًا؛ الاعتماد canonical الجديد صفر، ولا توجد production mutation. مرحلة YLM26 **IN PROGRESS / NOT GREEN**.
- الدليل المنشور: `ops/tah-math/TAH_MATH_RUN46_160_FRESH_SOURCE_PIXEL_24_PEDAGOGY_CHECKPOINT.json`. الخطوة التالية: حسم الاستثناءات واعتماد كامل 326 مع manifest قابل للرجوع، ثم COL26 1012.

## RUN51 — 2026-10-09

- Reviewed 150 distinct official YLM26 source questions: 24 exact RGB-matched crops plus 126 questions from 35 rendered original PDF pages; 45 source pages inspected.
- Completed 40 new source-grounded pedagogical candidate reviews: 34 source answer PASS, 6 semantic HOLD; 35 symbolic PASS; 4 local crop repairs.
- Three mapping candidates: P023-Q14 07_03 to 06_01; P047-Q07 14_02 to 14_04; P047-Q09 14_03 to 14_04. No production mutation.
- New hold P064-Q04: exponent question yields an answer absent from listed options. Existing holds remain.
- Conditional cumulative review events 5346 (repeats included), unique YLM26 inventory 326, final canonical approvals 0. Status YLM26 NOT GREEN. Next: adjudicate holds, canonical fields, R2 parity, rollback manifest, then COL26.
