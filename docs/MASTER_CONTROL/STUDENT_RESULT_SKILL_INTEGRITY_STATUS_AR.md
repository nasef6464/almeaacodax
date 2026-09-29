# ALM-STUDENT-RESULT-SKILLS-001 — Student Result Skill Integrity

آخر تحديث: 2026-09-29  
Issue: #309  
Branch: `chatgpt/student-result-skill-integrity`  
Base main: `5ab5d2409237708c1e4ad3e70d1dbe162eead272`  
الحالة: **IN PROGRESS**

## الهدف
بعد إنهاء الطالب أي اختبار، يجب أن يكون تحليل النتيجة مستمدًا فقط من أسئلة نفس المحاولة، ويعرض المهارة الرئيسية والمهارة الفرعية الحقيقية من Taxonomy المعتمد.

## Before — دليل Atlas الحي

### السؤال Canonical صحيح
عينة FND26:
- `QDR-QNT-FND26-P014-Q24`
  - main: `skill_quant_01` — أساسيات الأعداد والعمليات الحسابية
  - sub: `sub_quant_01_5` — تحديد خانة الآحاد للنواتج والعمليات الحسابية
- السؤال يخزن `skillId` و`subSkillId` والاثنين داخل `skillIds`.

### النتيجة كانت غير صحيحة في Resolution
في `quizresults.skillsAnalysis` ظهرت subskills مثل `sub_quant_01_5` باسم:
- **مهارة غير مسماة**

السبب: subskills مخزنة nested داخل `Skill.subSkills`، بينما Result builder كان يبحث عنها كسجل Skill مستقل.

### لا يوجد دليل على تلوث Quant ↔ Verbal في البيانات الحالية
Live Atlas:
- Quant questions with verbal `skillIds`: **0**
- Quant questions missing canonical main in `skillIds`: **0**
- Quant questions missing canonical sub in `skillIds`: **0**
- Quant results with verbal skill IDs: **0**
- Quant results with stored reading/verbal skill names: **0**

إذن ظهور مهارة مثل «فهم قرائي» لا يأتي من الربط Canonical الحالي لبنك القدرات الكمي.

## أخطاء الرحلة التي تم اكتشافها

1. Submission stats كانت تعتمد على `question.skillIds[]` فقط.
2. Nested subskill لم يكن يُحل اسمه أو parent main skill.
3. Results UI كان يخفي `مهارة غير مسماة` بدل حل الاسم من Taxonomy.
4. DetailedAnalysisModal كان يعرض مهارات افتراضية Fake عندما لا توجد بيانات حقيقية.
5. Result URL مع attempt غير موجود كان يستطيع fallback إلى نتيجة أخرى.
6. Review result كان يستطيع تعويض سؤال ناقص بسؤال من البنك العام.
7. QuizPage نفسه كان يستطيع تعويض question reference ناقص بسؤال آخر من البنك العام.

## الإصلاح الحالي

- Canonical evidence = `skillId + subSkillId`; legacy `skillIds` fallback فقط إذا الحقول Canonical غير موجودة.
- Skill read model يflatten main skill + nested subskills مع parent metadata.
- Result output يحفظ:
  - `level: main | sub`
  - `parentSkillId`
  - `parentSkill`
  - inherited path/subject/section
- Unresolved taxonomy IDs لا تُعرض للطالب كمهارة وهمية.
- Historical result UI يحاول حل subskill من Taxonomy الحالي.
- لا default skills وهمية.
- لا generic review-question fallback.
- لا silent result fallback عند explicit attempt.
- Published quiz page لا inject أسئلة غير موجودة في `questionIds`.
- Self quiz/client result logic يستخدم نفس main/subskill hierarchy.

## Regression Gate
`npm run smoke:results` يتضمن:
- `scripts/smoke-results-contract.mjs`
- `scripts/smoke-student-result-skill-integrity-contract.mjs`

## Exit Gate
- [ ] Frontend typecheck green
- [ ] Server build/check green
- [ ] `smoke:results` green
- [ ] Assessment read-model/answer-review/skills-analysis contracts green
- [ ] Backend integration green
- [ ] Deep student journey green
- [ ] Production test result demonstrates exact main/subskill hierarchy
- [ ] No unrelated skill/question fallback

## لمن يكمل بعدي
ابدأ من Issue #309 وهذا الملف. لا تعالج الشاشة فقط؛ مصدر الحقيقة هو:
`Question(skillId, subSkillId) → submission → QuizResult.skillsAnalysis → Results/QuizDetailsModal`.
