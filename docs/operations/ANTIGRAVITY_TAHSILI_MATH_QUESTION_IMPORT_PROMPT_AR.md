# Antigravity IDE — تحصيلي رياضيات 2026 — Prompt تشغيلي شامل

## الهدف
اعمل على مستودع `nasef6464/almeaacodax` لبناء مسار **Question Bank V2 للتحصيلي — رياضيات** بالاعتماد على كتاب **تأسيس يلو للرياضيات 2026**، وبنفس جودة مسار القدرات الكمي، مع فصل كامل بين المسارين.

المسار الحي:
- pathId: `p_1777779653351` — التحصيلي
- subjectId: `sub_1777784609152` — رياضيات
- examType: `tahsili`

الـtaxonomy الحية النهائية موجودة بالفعل في MongoDB:
- 22 Main Skills
- 70 SubSkills

ممنوع إنشاء Main Skill أو SubSkill جديد أثناء الاستيراد.

## مصدر الحقيقة
- PDF الأصلي هو المرجع البصري الأول.
- OCR/PDF text مساعد فقط.
- لا تعتمد على OCR وحده في الجذور والأسس والكسور والمعادلات والجداول والرسوم والزوايا والاختيارات.
- من كتاب التأسيس الحالي: **استورد فقط الأسئلة الموسومة صراحة بوسم/شارة "تجميعات"**.
- لا تستورد أمثلة الشرح، بطاقات "مثال"، الحلول، القواعد، الملاحظات، الخرائط والجداول التعليمية كأسئلة.
- استخدم الشرح والقواعد والأمثلة غير المستوردة لبناء Teaching Fingerprint للمهارات.

## Taxonomy
اقرأ الـtaxonomy الحية من MongoDB ولا تعيد كتابتها يدويًا كمرجع تنفيذي وحيد. IDs تبدأ:
- Main: `skill_tah_math_01` ... `skill_tah_math_22`
- Sub: `sub_tah_math_XX_YY`

التوزيع النهائي:
1. المنطق والتبرير والبرهان — 2
2. الهندسة الأساسية والمستقيمات — 3
3. المثلثات والعلاقات في المثلث — 3
4. المضلعات والأشكال الرباعية — 2
5. التشابه — 2
6. التحويلات الهندسية — 2
7. الدائرة — 3
8. الأعداد الحقيقية والدوال والمتباينات — 3
9. المصفوفات — 2
10. المعادلات التربيعية وكثيرات الحدود — 4
11. العمليات على الدوال والدوال الجذرية — 3
12. العلاقات والدوال النسبية — 2
13. المتتابعات والمتسلسلات — 3
14. الاحتمالات ونظرية ذات الحدين — 4
15. حساب المثلثات — 4
16. تحليل الدوال — 5
17. الدوال الأسية واللوغاريتمية — 3
18. المتطابقات المثلثية — 3
19. القطوع المخروطية — 4
20. المتجهات والإحداثيات القطبية والديكارتية — 4
21. الإحصاء — 4
22. النهايات والاشتقاق والتكامل — 5

المجموع = 70 SubSkills.

الهدف التعليمي: كل SubSkill تكون قابلة غالبًا لشرح فيديو مستقل **8–12 دقيقة**.

## A/B/C/D
التحصيلي رياضيات يجب أن يعرض للطالب:
`A / B / C / D`

ولا يحولها إلى أ/ب/ج/د.

إذا كانت الاختيارات مطبوعة داخل صورة السؤال:
```ts
options = ["A","B","C","D"]
optionsEmbeddedInImage = true
```

وضع القيم الحقيقية للاختيارات في:
`aiContext.optionTexts`

الربط:
- A = أول اختيار بصريًا
- B = الثاني
- C = الثالث
- D = الرابع
- correctOptionIndex: A=0, B=1, C=2, D=3

لا تعدل صورة المصدر لمجرد تغيير حروف الخيارات.

نفّذ تعديلًا Backward Compatible بحيث:
- القدرات الحالية تبقى أ/ب/ج/د.
- التحصيلي الذي خزنت خياراته صراحة A/B/C/D يحافظ عليها.
- راجع خصوصًا:
  - `utils/quizPresentation.ts`
  - `server/src/modules/quizzes/presentation/reviewQuestionPresentation.ts`
  - QuizPage
  - Results
  - ReviewSession
- الأفضل احترام explicit labels المخزنة بدل hard-code حسب المسار.
- أضف smoke tests تثبت أن القدرات لم تتغير وأن التحصيلي يعرض A-D.

## Question Code
Namespace مستقل:
`TAH-MATH-{DOCUMENT_CODE}-P{PAGE_3}-Q{QUESTION_2}`

كتاب التأسيس الحالي:
`DOCUMENT_CODE=YLM26`

مثال:
`TAH-MATH-YLM26-P025-Q03`

إن لم يوجد رقم سؤال واضح:
`TAH-MATH-YLM26-P025-C02`

questionCode ثابت لا يتغير مع تحديث الصورة أو الإجابة أو الفيديو.

## R2
لا Base64 في MongoDB.

المسار المقترح:
`questions/v2/tahsili/math/YLM26/p025/TAH-MATH-YLM26-P025-Q03-v1.webp`

قواعد القص:
- قص بطاقة السؤال فقط.
- أبقِ كل المعطيات والرسم والاختيارات اللازمة للحل.
- لا تقص أسًا أو جذرًا أو رمزًا أو سهمًا أو جزءًا من الرسم.
- لا تضع بطاقة الحل داخل صورة السؤال.
- WebP واضح.
- imageVersion + imageHash.
- عند الاستبدال استخدم v2/v3 ولا تستبدل الملف القديم في مكانه قبل QA.

## Question V2
استخدم Model الحالي ولا تنشئ Model موازيًا.

لكل سؤال:
- id
- questionCode
- text
- imageUrl
- imageAlt
- options
- optionsEmbeddedInImage
- correctOptionIndex
- explanation
- hint
- solvingStrategy
- videoUrl
- pathId=`p_1777779653351`
- subject=`sub_1777784609152`
- subjectId=`sub_1777784609152`
- sectionId
- skillIds=[MAIN_SKILL_ID,SUB_SKILL_ID]
- subSkillId
- difficulty
- type=mcq
- examType=tahsili
- source=imported
- year=2026
- approvalStatus
- aiContext
- sourceMeta

## AI Context
لكل سؤال:
- readableText: نص السؤال والمعطيات دون الحل.
- speechText: صياغة عربية طبيعية للمعلم الصوتي.
- visualDescription: وصف الرسم/الجدول/الأبعاد الضرورية دون استنتاج.
- optionTexts: قيم الخيارات الحقيقية حسب A/B/C/D.
- mathExpressions: [{latex,spokenArabic}]
- concepts
- requiredData
- version=1

ممنوع داخل aiContext:
- correctOptionIndex
- الإجابة الصحيحة
- الحل الكامل
- تلميح يكشف الناتج مباشرة

## الحل والتحقق
لكل سؤال:
1. اقرأ الصورة بصريًا.
2. استخرج الاختيارات بالترتيب.
3. حل السؤال رياضيًا بشكل مستقل.
4. قارن مع مفتاح/حل المصدر إن وجد.
5. إن اتفقا: `answerValidation=VERIFIED`.
6. عند التعارض:
   - `answerValidation=CONFLICT`
   - `needsReview=true`
   - `approvalStatus=draft`
   - لا تصحح المصدر تلقائيًا.
7. خزّن:
   - explanation
   - hint
   - solvingStrategy

## التصنيف
لا تصنف السؤال بالصفحة وحدها:
1. حدد الدرس.
2. اقرأ الفكرة الحاسمة للحل.
3. اختر Main Skill من الـ22.
4. اختر أدق SubSkill من الـ70.
5. تحقق من علاقة الأب/الابن من taxonomy الحية.
6. عند الشك = needsReview، ولا تخترع ID.
7. المهارة الإضافية تستخدم فقط إذا كانت مطلوبة فعليًا.

## الصفوف والفصول
الكتاب مقسم إلى أولى/ثاني/ثالث ثانوي.
احتفظ بـgradeLevel في manifest/source metadata.

لا تخمّن term من الذاكرة إذا لم يكن مؤكدًا من المصدر أو مرجع منهجي موثوق.
إذا لم يكن مؤكدًا:
`term=null`

## Manifest مستقل للتحصيلي
لا تكسر Validator القدرات.
أنشئ:
`server/src/scripts/validateTahsiliMathManifest.ts`

وأضف script:
`validate:tahsili-math-manifest`

حقول الـmanifest:
- documentCode
- pdfPageIndex
- printedPageNumber
- printedQuestionNumber
- sourceItemId
- sourceBadge
- gradeLevel
- term
- lessonNumber
- lessonTitle
- itemType
- importAction
- needsReview
- reviewReason
- questionCode
- mainSkillId
- subSkillId
- questionText
- optionA/B/C/D
- correctLetter=A|B|C|D
- correctOptionIndex
- aiReadableText
- speechText
- visualDescription
- mathExpressionsJson
- hint1
- hint2
- solvingStrategy
- fullExplanation
- answerValidation
- confidence
- cropInstruction
- anchorStartText
- anchorEndText
- imagePath/imageUrl/imageHash عند توفرها

الـvalidator يجب أن:
- يقرأ taxonomy الحية.
- يثبت 22/70.
- يرفض unknown IDs.
- يتحقق أن subskill تتبع main.
- يمنع duplicate questionCode/sourceItemId.
- يتحقق A-D مع index.
- في كتاب التأسيس يرفض IMPORT لأي item ليس sourceBadge="تجميعات".
- يخرج PASS/FAIL + errors/warnings + counts + coverage.

## Teaching Fingerprint
أنشئ:
`TEACHING_FINGERPRINT_TAHSILI_MATH_V1`

بصمة واحدة لكل SubSkill = 70 سجلًا.

لكل سجل:
- mainSkillId
- subSkillId
- subSkillName
- gradeLevel
- sourceLessons
- conceptSummary
- coreLawOrIdea
- standardMethod
- tahsiliFastMethod
- mentalMathMethod nullable
- eliminationMethod nullable
- optionTestingMethod nullable
- commonMistakes
- hintStyle1
- hintStyle2
- explanationStyle
- speechStyle
- representativePatterns

لا تكرر البصمة داخل كل سؤال. المرجع هو subSkillId.
لا تنسخ نصوصًا طويلة حرفيًا من المصدر.
أي طريقة غير مدعومة = null.

## Pilot
لا تبدأ Full Import مباشرة.

Pilot = 30 سؤالًا موزعة على:
- منطق/هندسة
- جبر ودوال
- احتمال
- مثلثات
- قطوع/متجهات
- إحصاء
- نهايات/تفاضل/تكامل

ويشمل:
- جذور
- أسس
- كسور
- رسوم
- جداول
- أشكال هندسية
- معادلات
- options embedded in image

لكل سؤال في التقرير:
- questionCode
- page/question
- imageUrl
- mainSkillId/subSkillId
- optionTexts A-D
- correctLetter/index
- answerValidation
- AI-context completeness
- crop QA
- approvalStatus

بوابة النجاح:
- image coverage = 100%
- valid answer mapping = 100% للأسئلة المعتمدة
- valid skill linkage = 100%
- duplicate codes = 0
- AI context complete = 100%
- imported non-"تجميعات" from foundation = 0

## Teaching Fingerprint Pilot
ابدأ 10 مهارات متنوعة.
تحقق أن كل واحدة قابلة لفيديو 8–12 دقيقة.
إذا وجدت مهارة تحتاج فعليًا تقسيمًا إضافيًا: لا تعدّل taxonomy تلقائيًا، ارفع تقرير اقتراح أولًا.

## المعلم الذكي
قبل التسليم يستخدم:
- fingerprint
- readableText
- speechText
- visualDescription
- optionTexts
- mathExpressions
- hint الآمن

لا ترسل قبل التسليم:
- correctOptionIndex
- fullExplanation

بعد التسليم/المراجعة يمكن إضافة الحل.

الهدف: أقل Tokens/Bandwidth مع جودة شرح مرتفعة.

## الفيديو
فيديو المهارة مرتبط بـsubSkillId، والهدف 8–12 دقيقة.
فيديو سؤال بعينه اختياري ويرتبط بـquestionCode عبر:
`PATCH /api/quizzes/questions/video-links`

## حماية القدرات
لا:
- تغيّر IDs القدرات 25/95
- تغيّر عرض اختيارات القدرات
- تحذف أسئلة/صور/اختبارات القدرات
- تكسر Review/Results/Voice Tutor

شغّل regression على المسارين.

## ملفات التوثيق المطلوبة
أنشئ/حدّث:
1. `docs/architecture/TAHSILI_MATH_TAXONOMY_V1_AR.md`
2. `docs/architecture/TAHSILI_MATH_QUESTION_BANK_V2_INGESTION_CONTRACT_AR.md`
3. `docs/architecture/TEACHING_FINGERPRINT_TAHSILI_MATH_V1_AR.md`
4. هذا الـprompt
5. validator
6. smoke tests لـA-D + manifest + taxonomy

## ترتيب التنفيذ
1. Audit للكود الحالي.
2. إثبات taxonomy الحية 22/70.
3. إصلاح A-D Backward Compatible.
4. Manifest contract + validator.
5. Docs + fingerprint contract.
6. Manifest كامل للـPDF: "تجميعات"=IMPORT، الباقي SKIP/REFERENCE.
7. Pilot 30.
8. Crop + R2.
9. Import Pilot كـdraft.
10. QA بصري/رياضي/skills.
11. تقرير قبل Full Import.
12. Full Import بعد نجاح Pilot فقط.
13. Final audit: counts/coverage/duplicates/images/answers/AI.
14. لا تعمل Deploy متكرر؛ اختبر ثم Deploy واحد عند الجاهزية.

## E2E المطلوب
student opens question → image visible → A/B/C/D → submit → result/review بنفس mapping → wrong/review list يعمل → voice tutor يأخذ safe context.

## صيغة تقرير كل Batch
- DONE
- CHANGED FILES
- DB/TAXONOMY STATUS
- IMPORTED / SKIPPED / NEEDS REVIEW
- IMAGE R2 COUNT
- ANSWER VERIFIED / CONFLICT
- SKILL COVERAGE
- TESTS
- BLOCKERS
- NEXT ACTION

لا تقل "تم" دون دليل فعلي.
