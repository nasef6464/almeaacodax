# COL26OLD — الإغلاق الإنتاجي النهائي

## النطاق
- المصدر المعتمد: كتاب تجميعات يلو للرياضيات 26 — القسم الثاني (أسئلة النجمتين).
- تغطية المصدر الكاملة: **1,258 سؤالًا** عبر **29 بلوكًا/درسًا**.
- السجلات الجديدة canonical في المنصة: **1,257**.
- تم منع سجل مكرر واحد وربطه كـ alias بالسؤال القائم في YLM26:
  - COL26OLD source: `TAH-MATH-COL26OLD-P011-Q29`
  - canonical existing: `TAH-MATH-YLM26-P007-Q01`
- لذلك: **1,258 مصدرية = 1,257 سجل جديد + 1 alias**.

## جودة المصدر والصور
- الجرد: 29/29 PASS.
- الإجابات: 1,258/1,258 PASS.
- ربط المهارات: 1,258/1,258.
- taxonomy المستخدمة: القائمة التحصيلية الحالية فقط، بدون إنشاء taxonomy موازية.
- المهارات المستخدمة: 22 Main Skills + 67 SubSkills.
- الصور: WebP lossless، سؤال واحد لكل صورة.
- لا يظهر في الصورة رقم السؤال أو سنة التجميع أو شارة التجميع/النجوم.
- رقم السؤال والصفحة وsourceItemId محفوظة في metadata.
- Crop QA: A/B/C/D ظاهرة، قص ناقص=0، سؤالان في صورة=0، تسريب عنوان الفكرة التالية=0.

## Production
- batch: `TAH-MATH-COL26OLD-SEC2-V1`
- Production canonical records: **1,257/1,257**
- Approved: **1,257**
- Draft: **0**
- missing image: 0
- missing imageHash: 0
- missing skillIds: 0
- invalid correctOptionIndex: 0
- duplicate questionCode: 0
- duplicate imageHash: 0
- duplicate sourceItemId: 0
- 30 live R2 image samples were fetched and matched their stored SHA-256.

## Live E2E
A five-question production canary using actual COL26OLD questions verified:
- learner can open and render the quiz;
- no correct answer is exposed before submission;
- student answers and submits successfully;
- QuizResult is created;
- QuestionReview contains the exact five canonical question IDs;
- SkillsAnalysis is derived from the same questions and contains:
  - `skill_tah_math_01` — المنطق والتبرير والبرهان
  - `sub_tah_math_01_01` — العبارات المنطقية وقيم الصواب والعبارات الشرطية
- live canary result: 5 questions, 2 correct / 3 wrong, mastery 40% for both main/sub skill, proving attempt→questions→skills consistency.

## Regression safety
Production counts remained unchanged for existing closed banks:
- COL26 = 1,012
- YLM26 = 326
- QDR COL2627 = 946

No historical QuizResult or SkillProgress records were rewritten as part of content import/approval. The designated smoke account's live E2E evidence is retained rather than applying a speculative rollback.

## Closure
**COL26OLD = CLOSED 100%**

Exit gates passed:
- source inventory PASS
- crops PASS
- answers PASS
- skills PASS
- cross-bank dedupe PASS
- R2/Mongo integrity PASS
- Production approval PASS
- student submit/result/skills live evidence PASS

The temporary import trigger was disabled after completion to prevent future re-execution.
