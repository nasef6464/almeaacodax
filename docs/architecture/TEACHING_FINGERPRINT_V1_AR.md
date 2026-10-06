# ALMEAA — TEACHING_FINGERPRINT_V1

## الهدف
تثبيت بصمة تعليمية موحدة لكل مهارة فرعية في القدرات الكمية، بحيث يستخدمها المعلم الذكي لاحقًا كأسلوب شرح عام للمهارة دون نسخ نص كتاب التأسيس حرفيًا ودون تخمين طرق غير مدعومة.

## النطاق المعتمد
- المسار: `p_1777779639431`
- المادة: `sub_1777779748206`
- المهارات الرئيسية: 25
- المهارات الفرعية: 95
- المصدر المرجعي: `FND26`
- النسخة: `TEACHING_FINGERPRINT_V1`

## عقد السجل
التقرير النصي السابق ذكر "15 حقلاً"، لكن القائمة الفعلية تحتوي **16 حقلاً**. العقد البرمجي يعتمد القائمة الفعلية التالية:

1. `mainSkillId`
2. `subSkillId`
3. `subSkillName`
4. `conceptSummary`
5. `coreLawOrIdea`
6. `standardMethod`
7. `quduratFastMethod`
8. `mentalMathMethod`
9. `eliminationMethod`
10. `optionTestingMethod`
11. `commonMistakes`
12. `hintStyle1`
13. `hintStyle2`
14. `explanationStyle`
15. `speechStyle`
16. `representativePatterns`

الطرق غير المدعومة من المصدر يجب أن تكون `null`، لا نصًا مخترعًا ولا سلسلة فارغة.

## بوابة الإغلاق قبل الدمج
شغّل:

```bash
npm --prefix server run validate:teaching-fingerprint -- ../scratch/teaching_fingerprint_v1_95.json
```

ولا تعتبر الملف صالحًا للإدخال إلا إذا كانت النتيجة:
- `status = PASS`
- `totalItems = 95`
- `coveredMainSkills = 25`
- `coveredSubskills = 95`
- `errors = 0`

التحذيرات يجب مراجعتها قبل التجميد النهائي.

## قواعد السلامة
- لا يتم تعديل Taxonomy من ملف البصمة.
- لا يتم إنشاء Skill أو SubSkill جديد.
- الاسم والمعرف والأب الحقيقي للمهارة الفرعية يجب أن يطابقوا Taxonomy الحية.
- البصمة ليست Answer Key ولا تحتوي إجابة سؤال بعينه.
- لا يتم نسخ أمثلة أو صياغات طويلة من المصدر؛ المحتوى مجرد ومهاري.
- لا يتم ربط البصمة بكل سؤال على حدة؛ المرجع النهائي سيكون `subSkillId` لتقليل تكرار البيانات والتوكنز والباندويث.
