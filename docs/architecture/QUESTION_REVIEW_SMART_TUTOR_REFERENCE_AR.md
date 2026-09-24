# ALMEAA — مرجع السؤال الموحد + أسئلتي للمراجعة + المعلم الذكي

> تاريخ الاعتماد: 2026-09-24
> الغرض: مرجع ثابت للقرارات المتفق عليها في محادثة تصميم Question Bank V2، مراجعة الطالب، المعلم الذكي، التحليلات، وتقليل التخزين/الباندويث/التوكنز.
> هذا المرجع لا يلغي `ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md` بل ينسق معه ويشرح تجربة السؤال والمراجعة والمعلم الذكي بصورة عملية.

## 1) القاعدة الأساسية — سؤال واحد فقط

القاعدة المعتمدة:

**One Question -> One Image -> One Code -> Unlimited Reuse**

- السؤال كيان واحد في مركز الأسئلة.
- لكل سؤال `id/questionCode` ثابت.
- الصورة الأصلية للسؤال تحفظ مرة واحدة فقط على Cloudflare R2/CDN.
- MongoDB يحتفظ بمرجع الصورة `imageUrl` و`imageHash/imageVersion`، وليس بنسخ الصورة أو Base64.
- الاختبار لا ينسخ السؤال؛ يحتفظ فقط بـ `questionIds`.
- التدريب لا ينسخ السؤال؛ يحتفظ/يستدعي نفس `questionId`.
- الاختبار المحاكي يحفظ `questionIds` داخل الأقسام.
- مراجعة الطالب تحفظ `questionId` فقط.
- المعلم الذكي يعمل على نفس `questionId/questionCode`.
- لا يرفع نفس ملف الصورة مرة أخرى إذا لم يتغير الـhash.
- أي تصحيح في السؤال أو صورته ينعكس على مواضع إعادة الاستخدام وفق سياسة snapshot/attempt history المعتمدة.

### الموجود فعليًا الآن
- `Question.ts`: questionCode + imageUrl + sourceMeta.imageHash/imageVersion.
- `Quiz.ts`: questionIds فقط، وmockExam.sections[].questionIds فقط.
- `ReviewCard.ts`: userId + questionId، مع unique index على (userId, questionId).
- الخطة التكيفية: AI context text-first والصورة من storage/CDN ولا تمر عبر API/AI افتراضيًا.

## 2) بنية Question Bank V2 الحديثة

السؤال الحديث المطلوب يدعم:
- questionCode ثابت.
- sourceItemId + documentCode + page/question provenance.
- text + 4 options + correctOptionIndex.
- explanation.
- hint.
- solvingStrategy.
- skillId/main skill + subSkillId.
- path/subject scope.
- aiContext.readableText.
- aiContext.speechText.
- aiContext.visualDescription عند الحاجة.
- aiContext.mathExpressions مع spokenArabic.
- concepts/requiredData عندما تكون مناسبة.
- imageUrl + imageHash/imageVersion للصورة.
- workflow/approval status.

### الهدف من aiContext
تجهيز السؤال مسبقًا بحيث المعلم الذكي لا يعيد تحليل الصورة أو تأليف فهم السؤال في كل مرة:
- القراءة من `speechText`.
- الرموز من `mathExpressions[].spokenArabic`.
- الشرح من trusted explanation/strategy/hints.
- Vision fallback فقط عند الحاجة الحقيقية.

## 3) حالة الدفعة الحديثة التي تمت مراجعتها

المجموعة الحديثة المعترف بها حاليًا هي أسئلة V2، وليست بنك Legacy القديم.

- FND26: 125 سؤال.
- COL2627 Pilot: 40 سؤال.
- الإجمالي الذي تمت مراجعته في هذه المحادثة: 165 سؤال V2.

البيانات الأساسية والذكية لهذه المجموعة قوية ومناسبة للمعلم الذكي والتحليلات.

### ما يحتاج استكمالًا
- ربط `imageUrl` الفعلي مع صور R2/CDN حيث ما زال فارغًا.
- Visual Source Audit للتأكد من:
  - questionCode
  - sourceItemId
  - page/question number
  - options
  - correctOptionIndex
  - الصورة الفعلية
- حالة COL2627 واحدة على الأقل تحتاج مراجعة mapping المصدر/الصفحة قبل الاعتماد النهائي.
- لا يتم اختراع imageHash أو source mapping عند غياب الدليل.

## 4) الأسئلة القديمة Legacy

الأسئلة القديمة التي دخلت قبل اعتماد Question Bank V2 لا تعتبر مرجعًا لجودة V2.

- لا نحذفها لمجرد أنها قديمة.
- لا نخلطها مع عداد V2.
- لا نعتبر بنيتها القديمة معيارًا للسؤال الحديث.
- يمكن ترحيل الصالح منها لاحقًا عبر Migration/Enrichment مضبوط.
- لا يجوز أن تسبب تعارضًا مع الدفعات الحديثة.

## 5) تجربة الطالب — أسئلتي للمراجعة

لا نحتاج قسم `المفضلة` كفكرة منفصلة.

الاسم المقترح للطالب:
**أسئلتي للمراجعة**

وتحتها مصدران فقط:

### أ) حفظتها للمراجعة
- الطالب أثناء اختبار/تدريب/مراجعة يضغط: `مراجعة لاحقًا`.
- يحفظ النظام ارتباط الطالب بـ questionId فقط.
- لا ينشئ نسخة سؤال ولا نسخة صورة.

### ب) أخطأت فيها
- تدخل تلقائيًا من QuestionAttempt/نتائج المحاولات.
- السؤال يظهر مرة واحدة حتى لو أخطأ فيه الطالب عدة مرات.
- عدد المحاولات وتاريخها يظل ضمن التحليلات/evidence.

### إذا اجتمع السببان
إذا السؤال محفوظ للمراجعة وأخطأ فيه الطالب:
- يظهر مرة واحدة.
- يمكن إظهار سببين بصريًا: `حفظته للمراجعة` + `خطأ سابق`.

## 6) المشكلة الحالية في مراجعة لاحقًا

الوضع الحالي فيه مسارين منفصلين:
- واجهة Favorites/Review Later/Mistakes تعتمد جزئيًا على frontend store.
- ReviewCard هو نظام server-side للمراجعة الذكية/المتباعدة.

المشكلة:
قد يكون ID محفوظًا في reviewLater محليًا لكن السؤال غير موجود في قائمة questions المحملة حاليًا، فيظهر للطالب كأنه اختفى.

### القرار
- توحيد `مراجعة لاحقًا` Server-side.
- استخدام ReviewCard/نظام مراجعة موحد كمحرك خلفي بدل الاعتماد على local persisted IDs وحدها.
- عدم إنشاء نظام مراجعة ثالث.

## 7) تدريب من أسئلة المراجعة

داخل `أسئلتي للمراجعة` يستطيع الطالب بدء تدريب من:
- أخطائي فقط.
- المحفوظة فقط.
- الكل.

المهم:
- لا يتم نسخ السؤال.
- لا يتم نسخ الصورة.
- ينشأ Session/Quiz أو selection يحوي questionIds فقط.
- المحاولات الجديدة تسجل على نفس questionId.
- SkillProgress والتحليلات تستفيد من نفس الهوية.

## 8) المعلم الذكي — موقعه الصحيح

المعلم الذكي ليس صفحة مستقلة لكل مكان ولا نظامًا منفصلًا عن السؤال.

يكون Component/Service واحدًا مرتبطًا بـ `questionId`، ويظهر حيث يسمح السياق، مثل:
- مراجعة نتيجة الاختبار.
- أسئلتي للمراجعة.
- سؤال أخطأ فيه الطالب.
- تدريب علاجي.
- جلسة ReviewCard.

زر مقترح:
**اسأل المعلم 🎙️**

نفس المكون يستخدم في كل الأماكن؛ لا ننسخ منطقًا مختلفًا لكل شاشة.

## 9) أسلوب المعلم الذكي

في وضع المراجعة لا يعطي الإجابة مباشرة.

التدرج:
1. يسأل الطالب كيف يفكر.
2. Hint بسيط.
3. Stronger hint.
4. شرح الفكرة/المفهوم.
5. خطوات الحل.
6. الحل الكامل عند السماح/الحاجة.
7. Follow-up حسب سؤال الطالب.

هذا ينسق مع Phase 9 الحالي:
`hint -> stronger_hint -> concept -> steps -> follow_up`.

المعلم يستخدم trusted question data ولا يؤلف أرقامًا أو حقائق من عنده.

## 10) الفرق بين الاختبار والمراجعة

### أثناء الاختبار
- لا يكشف الحل أو correctOptionIndex للطالب.
- المساعدة، إن سمحت سياسة الاختبار، تكون محدودة.

### بعد التسليم / في المراجعة
- يمكن استخدام explanation/hint/strategy/correct answer وفق السياسة.
- يمكن الحوار التعليمي الكامل.

## 11) تقليل AI Tokens

القاعدة:
**AI عند الحاجة فقط، وليس في كل عرض سؤال.**

- قراءة السؤال لا تحتاج LLM إذا speechText جاهز.
- رموز الرياضيات تستخدم spokenArabic الجاهز.
- لا ترسل full test أو full student history.
- context = السؤال الحالي + المطلوب فقط + skill/fingerprint المختصر.
- trusted explanation/hints تستخدم قبل توليد شرح من الصفر.
- لا يعاد تحليل الصورة عبر Vision افتراضيًا.
- Question Assistant cache/dedupe/token cap/rate limit تبقى فعالة.

## 12) تقليل Bandwidth/Storage

- الصورة تحفظ مرة واحدة فقط.
- WebP/optimized media على R2/CDN.
- لا Base64 في Mongo.
- لا نسخ للصورة داخل Quiz/Review/Result.
- lazy loading للصورة.
- CDN cache للصورة الثابتة.
- إذا تغيرت الصورة يتغير hash/version؛ إذا لم تتغير فلا رفع جديد.
- لا تمر image bytes عبر Render/API افتراضيًا.
- TTS/voice إن أضيف لاحقًا لا يكرر ملفات ثابتة بلا داعٍ.

## 13) التحليلات

هوية السؤال ثابتة عبر كل الاستخدامات.

مثال:
نفس السؤال يدخل في:
- اختبار عادي.
- تدريب.
- محاكي.
- مراجعة خطأ.
- تدريب علاجي.

كل المحاولات تشير لنفس questionId، ولذلك يمكن معرفة:
- عدد مرات رؤية السؤال.
- correct/wrong history.
- response time.
- التحسن عبر الزمن.
- skill/subSkill evidence.
- evidenceType/context.

لا تنشأ نسخة Question جديدة لكل Quiz أو Training.

## 14) الموجود بالفعل ولا يعاد بناؤه

لا نعيد بناء:
- Question Bank identity.
- questionCode.
- Quiz questionIds contract.
- QuestionAttempt.
- ReviewCard/SM-2.
- SkillProgress.
- AI Gateway.
- Phase 9 Question Assistant.
- Adaptive mastery / Next Best Action.
- Teaching Fingerprint.
- تحليل المهارات.
- Readiness.
- R2/CDN media strategy.

المطلوب توحيد وربط هذه المكونات، لا مضاعفتها.

## 15) المطلوب تنفيذه لاحقًا

1. إعادة تسمية/تبسيط تجربة Favorites إلى `أسئلتي للمراجعة`.
2. حذف مفهوم `المفضلة` كقسم مستقل من تجربة الطالب إذا لم يعد له استخدام آخر.
3. تبويبان فقط: `حفظتها للمراجعة` و`أخطأت فيها`.
4. نقل reviewLater إلى backend/server truth.
5. توحيد ReviewCard مع شاشة أسئلتي للمراجعة.
6. Component عرض سؤال Review موحد reusable.
7. Component `AskTeacher` واحد reusable حسب questionId.
8. توسيع Phase 9 من Results-only إلى كل Review Context مصرح به.
9. إنشاء تدريب من questionIds المختارة بدون نسخ الأسئلة.
10. التأكد من evidenceType وعدم double counting.
11. ربط imageUrl لدفعات V2 الحديثة.
12. Visual Source Audit قبل اعتماد الأسئلة المصورة.
13. E2E كامل:
   test -> wrong answer -> review list -> smart teacher -> short practice -> new attempt -> SkillProgress -> spaced review.

## 16) معيار عدم التضخم

أي تنفيذ جديد يجب أن يمر بهذا السؤال:

> هل أنشأنا نسخة جديدة من Question أو Image بينما كان يمكن الإشارة إلى الأصل بالـID؟

إذا نعم، فهذا مخالف لهذا المرجع ما لم توجد ضرورة موثقة مثل immutable historical snapshot لنتيجة اختبار، ويجب أن تكون الـsnapshot نصية/محدودة بقدر الحاجة وليس نسخة media.

## 17) مرجع الخطط القائمة

هذا المرجع ينسق مع:
- `docs/architecture/ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md`
- `docs/architecture/ADAPTIVE_PHASE9_QUESTION_ASSISTANT_EVIDENCE_2026-09-21.md`
- `docs/architecture/QUESTION_VOICE_EXPLANATION_V1_AR.md`
- `docs/architecture/VISUAL_QUESTION_AI_READINESS_AUDIT_2026-09-21.md`
- `docs/STUDENT_JOURNEY_AND_TESTS_PLAN_AR.md`

عند التنفيذ:
- Backend/server truth أولًا.
- تغييرات additive وآمنة.
- لا destructive migration.
- لا duplicate question/media.
- لا AI في scoring/mastery/routing.
- قياس token/bandwidth/cache بعد التنفيذ.
