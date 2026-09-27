# ALMEAA — ANTIGRAVITY MASTER EXECUTION PROMPT
## Tahsili Mathematics 2026 — Yellow Foundation Book Modified Edition

أنت المسؤول التنفيذي عن بناء واستيراد بنك أسئلة **التحصيلي — رياضيات** داخل مشروع ALMEAA. هذه ليست مهمة تحليل نظري؛ نفّذها فعليًا على نسخة محلية نظيفة مشتقة من GitHub، مع المحافظة على الإنتاج ومسار القدرات.

---

## A. ابدأ من الكود الصحيح — Local First لكن GitHub هو Source of Truth

المستودع الرسمي:
`nasef6464/almeaacodax`

النسخة المحلية الحالية قد تكون أقدم أو مختلفة. ممنوع البناء فوقها عميانيًا.

نفّذ:
```bash
git status
git remote -v
git branch --show-current
git fetch origin --prune
```

ممنوع على المشروع الحالي:
`git reset --hard`
`git clean -fdx`

إذا كان المحلي مختلفًا عن `origin/main`:
1. احتفظ بالمجلد المحلي الحالي دون تغيير.
2. أنشئ Git worktree جديدًا من `origin/main`.
3. أنشئ فرعًا مثل:
   `feat/tahsili-math-question-bank-v2`
4. اعمل داخل الـworktree الجديد فقط.
5. بعد الاختبارات: commit → push → Pull Request.
6. لا push مباشر إلى main.
7. لا Deploy متكرر أثناء extraction/pilot.

---

## B. ملفات المصدر المحلية

الكتاب المعدل والصور المرجعية before/after موجودة محليًا عند المستخدم.

ضعها في مجلد ignored:
`.local-imports/tahsili-math/YLM26/`

حدّث `.gitignore` إن لزم.

ممنوع رفع PDF المصدر أو صور الصفحات الخام إلى GitHub العام.

الصور النهائية للأسئلة تذهب إلى Cloudflare R2 فقط.

---

## C. افهم النظام الحالي قبل التعديل

اقرأ أولًا:
- `server/src/models/Question.ts`
- `server/src/modules/quizzes/http/questionQuerySchemas.ts`
- `server/src/modules/quizzes/http/questionImportSchemas.ts`
- `server/src/modules/quizzes/http/questionImportRoutes.ts`
- `server/src/modules/quizzes/application/questionSkillTaxonomy.ts`
- `server/src/modules/media/application/questionImportImageUpload.ts`
- `server/src/routes/media.routes.ts`
- `utils/quizPresentation.ts`
- `server/src/modules/quizzes/presentation/reviewQuestionPresentation.ts`
- `docs/architecture/QUESTION_BANK_V2_INGESTION_CONTRACT_AR.md`
- `docs/architecture/TEACHING_FINGERPRINT_V1_AR.md`
- `docs/architecture/QUESTION_VOICE_EXPLANATION_V1_AR.md`

مهم: الاستيراد الحالي مقيّد بالقدرات `QDR-QNT` في أكثر من مكان. قبل Tahsili Pilot عمّم العقد بشكل Backward Compatible ليقبل:
- Qudurat القديم كما هو.
- Tahsili Math الجديد.

لا تكسر أي اختبار أو Code Format موجود للقدرات.

---

## D. النطاق الحي للتحصيلي رياضيات

`pathId = p_1777779653351`
`subjectId = sub_1777784609152`
`subject = sub_1777784609152`
`examType = tahsili`

الـtaxonomy الحالية في MongoDB:
- 22 Main Skills
- 70 SubSkills

اقرأها حيًا من DB قبل التنفيذ.
ممنوع إنشاء Skill/SubSkill جديد أثناء ingestion.
أي عدم تطابق → review queue، وليس تخمينًا.

---

## E. بنية السؤال التي يجب أن تفهمها

كل سؤال ليس مجرد صورة وإجابة. اعتبره 9 طبقات:

1. **Identity**
   - questionCode
   - printedQuestionNumber
   - sourceItemId
   - page coordinates

2. **Visual Truth**
   - crop النهائي
   - imageHash
   - imageUrl
   - imageAlt

3. **Learner Answer Contract**
   - options = A/B/C/D
   - optionTexts
   - correctOptionIndex

4. **Curriculum Classification**
   - sectionId
   - mainSkillId
   - subSkillId
   - skillIds

5. **Question Analysis Fingerprint**
   - primaryConcept
   - secondaryConcepts
   - representationType
   - taskType
   - requiredOperations
   - visualDependency
   - cognitiveDemand
   - difficultyEvidence
   - distractorPatterns
   - commonMistakeTargeted
   - estimatedSolveSeconds
   هذه تحفظ في manifest/analysis JSON في V1 ولا تضف Schema جديدًا بدون ضرورة.

6. **AI Safe Context**
   - readableText
   - speechText
   - visualDescription
   - optionTexts
   - mathExpressions
   - concepts
   - requiredData

7. **Verified Solution**
   - correctOptionIndex
   - explanation
   - hint
   - solvingStrategy

8. **Teaching Link**
   - Teaching Fingerprint للـSubSkill
   - لا تكرر البصمة كاملة داخل كل سؤال

9. **Media Link**
   - videoUrl لاحقًا مربوط بـquestionCode
   - voiceExplanation.text بعد التسليم/المراجعة

---

## F. Source of Truth

الترتيب:
1. PDF المعدل بصريًا.
2. الصورة المرئية للصفحة.
3. answer key/solution في الكتاب للتحقق.
4. PDF extracted text/OCR مساعد فقط.

ممنوع اعتماد OCR وحده في:
الجذور، الأسس، الكسور، المصفوفات، المعادلات، المتباينات، الرموز، الرسوم، الجداول، الزوايا، القطوع، المتجهات، النهايات، والاختيارات.

---

## G. ما الذي يدخل Question Bank؟

من كتاب التأسيس الحالي:
- استورد أسئلة التجميعات الفعلية فقط.
- استخدم badge/anchor "تجميعات + رقم السؤال" لاكتشاف السؤال.
- الشرح، القاعدة، المثال، الحل، الخرائط والجداول التعليمية ليست Question records.
- هذه المواد تستخدم لبناء Teaching Fingerprint وفهم الأسلوب.

---

## H. هوية السؤال — ثابتة إلى الأبد

Document code:
`YLM26`

Question Code:
`TAH-MATH-YLM26-P{PRINTED_PAGE_3}-Q{QUESTION_2}`

مثال سؤال 7 في صفحة 6:
`TAH-MATH-YLM26-P006-Q07`

Source Item ID:
`YLM26-PDF{PDF_INDEX_3}-P{PRINTED_PAGE_3}-N{QUESTION_2}`

مثال:
`YLM26-PDF006-P006-N07`

قواعد:
- لا تدخل skillId داخل questionCode.
- لا تغير questionCode عند تغيير المهارة أو الصورة أو الفيديو.
- printedQuestionNumber يبقى محفوظًا حتى لو حُذف الرقم بصريًا من crop.

---

## I. قواعد القص — المرجع هو before/after الذي قدمه المستخدم

استخدم الشريط الأزرق الذي يحمل "تجميعات" ورقم السؤال **كـAnchor للاكتشاف فقط**.

الصورة النهائية يجب أن تحتوي:
- نص السؤال كاملًا.
- أي رسم/جدول/شكل/محاور/مخطط تابع للسؤال.
- الاختيارات A/B/C/D والقيم المقابلة لها.
- هامش أبيض صغير ومريح.

الصورة النهائية يجب ألا تحتوي:
- الشريط الأزرق.
- كلمة "تجميعات".
- رقم السؤال المطبوع.
- سؤال سابق أو لاحق.
- حل السؤال.
- بطاقة "الحل".
- عنوان درس غير لازم للسؤال.
- مفتاح الإجابة أسفل الصفحة.
- هوامش كبيرة غير ضرورية.

لا تقص:
- أس أو جذر.
- سهم أو محور.
- رمز رياضي.
- حافة جدول.
- جزءًا من شكل هندسي.
- اختيارًا أو قيمة اختيار.

إذا لم تستطع فصل السؤال بثقة:
`cropStatus=manual_review_required`
ولا تعتمد crop ناقصًا.

---

## J. Python Crop Pipeline

استخدم Python في:
- PDF → high-resolution page render.
- كشف badge الأزرق/رقم السؤال كـanchors.
- اكتشاف bounds.
- crop.
- white-space trimming مع padding آمن.
- تحويل WebP.
- SHA-256.
- QA contact sheets.
- manifest JSON/CSV.

لا تستخدم OCR ليقرر الحدود وحده.
اجمع:
- visual/color anchors
- layout geometry
- OCR/text hints
- validation rules

لكل crop أنشئ preview يحتوي خارج الصورة النهائية على:
page / questionNumber / questionCode / crop dimensions / confidence.

---

## K. R2 — استخدم النظام الموجود ولا تخترع مسارًا موازيًا

اقرأ إعدادات البيئة من النظام الحالي. المتغيرات المعتمدة:
- `R2_UPLOAD_ENABLED`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`
- `R2_UPLOAD_MAX_BYTES`
- `R2_PRESIGN_EXPIRES_SECONDS`
- `MONGODB_URI`

لا تطبع قيم الأسرار في logs أو التقارير ولا تكتبها في Git.

إذا أي متغير مطلوب مفقود:
أخرج أسماء المتغيرات المفقودة فقط واعتبر الرفع BLOCKED حتى تتوفر.

استخدم flow الموجود:
`POST /api/media/question-import-images/presign`

ثم PUT للصورة إلى signed URL.

المسار الحالي المعتمد في backend:
`questions/v2/{QUESTION_CODE}/{IMAGE_SHA256}.webp`

لا تغيّره إلى بنية أخرى بدون حاجة.

مهم: `questionImportImageUpload.ts` حاليًا يقبل QDR-QNT فقط؛ عممه ليقبل Tahsili code الجديد مع بقاء Qudurat كما هو.

---

## L. A/B/C/D

الكتاب المعدل يحتوي A/B/C/D بالفعل.

لكل سؤال مصور:
```json
{
  "options": ["A","B","C","D"],
  "optionsEmbeddedInImage": true
}
```

وفي:
`aiContext.optionTexts`
احفظ القيم الرياضية الحقيقية حسب الترتيب البصري A ثم B ثم C ثم D.

`correctOptionIndex`:
A=0
B=1
C=2
D=3

لا تغير crop لإعادة كتابة الاختيارات.

مهم: review presentation الحالي يستبدل optionsEmbeddedInImage بـ أ/ب/ج/د. أصلح ذلك بشكل Backward Compatible:
- Qudurat يبقى أ/ب/ج/د.
- Tahsili يحترم A/B/C/D المخزنة صراحة.
- أضف smoke tests للمسارين.

---

## M. تعميم Pilot Import Contract

عدّل بدون كسر Qudurat:
- `questionImportSchemas.ts`
- `questionImportRoutes.ts`
- `questionImportImageUpload.ts`

حاليًا هذه الملفات تبني/تتحقق من هوية `QDR-QNT` فقط.

أنشئ parser/identity policy مشتركة بدل hard-code متكرر، تدعم:
1. QDR-QNT legacy.
2. TAH-MATH-YLM26.

بالنسبة Tahsili:
- expected questionCode = `TAH-MATH-{DOC}-P###-Q##`
- expected sourceItemId = `{DOC}-PDF###-P###-N##`
- expected image path = `/questions/v2/{questionCode}/{imageHash}.webp`

أضف اختبارات:
- valid Qudurat still passes.
- valid Tahsili passes.
- malformed Tahsili rejected.
- duplicate code rejected.
- duplicate source item rejected.
- wrong image hash/path rejected.

---

## N. Question V2 payload

لكل سؤال:
```text
questionCode
text
options
correctOptionIndex
explanation
hint
solvingStrategy
videoUrl
imageUrl
imageAlt
optionsEmbeddedInImage
aiContext
voiceExplanation
sourceMeta
skillIds
skillId
subSkillId
pathId
subject
subjectId
sectionId
examType
source
year
difficulty
type
approvalStatus
reviewerNotes
```

القيم:
- pathId = p_1777779653351
- subject = sub_1777784609152
- subjectId = sub_1777784609152
- examType = tahsili
- source = imported
- year = 2026
- type = mcq
- approvalStatus = draft
- ownerType = platform

`skillIds=[MAIN_SKILL_ID,SUB_SKILL_ID]`
`skillId=MAIN_SKILL_ID`
`subSkillId=SUB_SKILL_ID`
`sectionId` يجب أن يطابق الـMain Skill الحالية.

---

## O. text و AI Context

`text`:
نص السؤال الأساسي للبحث والإدارة، دون الحل.

`aiContext.readableText`:
نسخة كاملة مفهومة آليًا لكل المعطيات.

`aiContext.speechText`:
قراءة عربية طبيعية للسؤال والرموز، دون الحل.

`aiContext.visualDescription`:
وصف ما يحتاجه النموذج من الرسم/الجدول/المحاور فقط، دون استنتاج الإجابة.

`aiContext.optionTexts`:
القيم الحقيقية A/B/C/D.

`aiContext.mathExpressions`:
كل تعبير مهم:
```json
{"latex":"...","spokenArabic":"..."}
```

`concepts`: المفاهيم.
`requiredData`: المعطيات التي لا يجوز إسقاطها.
`version=1`.

ممنوع في safe aiContext:
- الإجابة الصحيحة.
- correctOptionIndex.
- full solution.
- عبارة تكشف الاختيار الصحيح.

---

## P. Question Analysis Fingerprint

حلل كل سؤال قبل تصنيفه وأنشئ داخل manifest:
```json
{
  "primaryConcept": "",
  "secondaryConcepts": [],
  "representationType": "text|algebra|graph|table|geometry|logic|probability|statistics|calculus|mixed",
  "taskType": "identify|compute|solve|compare|infer|apply-law|read-graph|transform|mixed",
  "requiredOperations": [],
  "visualDependency": "none|low|high",
  "cognitiveDemand": "recall|direct_application|multi_step|reasoning",
  "difficultyEvidence": [],
  "distractorPatterns": [],
  "commonMistakeTargeted": [],
  "estimatedSolveSeconds": 0
}
```

استخدمها لاختيار SubSkill وdifficulty وAI context.
في V1 احتفظ بها في manifest؛ لا توسع Mongo schema بلا ضرورة.

---

## Q. تصنيف السؤال

1. حدد lesson من الصفحة.
2. افهم الفكرة الحاسمة للحل.
3. اقرأ الـ22 Main/70 Sub حيًا.
4. اختر أدق SubSkill.
5. تحقق أن SubSkill تتبع Main Skill.
6. لا تعتمد على عنوان الدرس وحده إذا مضمون السؤال أدق.
7. عند الشك لا تخمن؛ ضع `needsReview` في manifest.

---

## R. الحل والتحقق

لكل سؤال:
1. اقرأ الصورة.
2. استخرج A/B/C/D.
3. حل مستقلًا.
4. اقرأ مفتاح الإجابة/حل المصدر إن وجد.
5. قارن.

الحالات:
- VERIFIED: الحل المستقل + المصدر متفقان.
- CONFLICT: تعارض.
- UNVERIFIED: لا يوجد دليل كافٍ.

فقط VERIFIED يدخل batch التلقائي.
الباقي review queue.

أنشئ:
- `explanation`: حل كامل واضح.
- `hint`: تلميح غير كاشف.
- `solvingStrategy`: فكرة/قانون مختصر.
- `voiceExplanation.text`: شرح صوتي طبيعي يستخدم بعد التسليم، وليس قبل الإجابة.

---

## S. Teaching Fingerprint للـ70 SubSkills

كتاب التأسيس كله مرجع للبصمة، وليس أسئلة التجميعات فقط.

أنشئ سجلًا واحدًا لكل SubSkill:
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

الهدف: كل SubSkill قابلة غالبًا لفيديو تأسيس 8–12 دقيقة.

لا تنسخ نصوص المصدر الطويلة حرفيًا.
لا تكرر fingerprint في كل Question.

---

## T. الفيديو والـPDF لاحقًا

هوية الربط الوحيدة هي `questionCode`.

ربط YouTube:
`PATCH /api/quizzes/questions/video-links`

Batch:
```json
{
  "items": [
    {
      "questionCode": "TAH-MATH-YLM26-P006-Q07",
      "videoUrl": "https://youtube.com/..."
    }
  ]
}
```

لا تربط الفيديو باسم الصورة أو المهارة أو ترتيب PDF.

عند تصدير PDF لاحقًا:
- استخدم crop النظيف.
- خارج الصورة اطبع:
  `رقم السؤال: 7 | الكود: TAH-MATH-YLM26-P006-Q07`
- ترتيب PDF يمكن أن يتغير، لكن questionCode لا يتغير.

---

## U. Manifest

أنشئ manifest كاملًا لكل candidate:
- documentCode
- documentTitle
- pdfPageIndex
- printedPageNumber
- printedQuestionNumber
- sourceItemId
- questionCode
- lessonNumber
- lessonTitle
- gradeLevel
- sourceBadge
- cropStatus
- cropConfidence
- cropFile
- imageHash
- imageUrl
- mainSkillId
- subSkillId
- sectionId
- questionFingerprint
- text
- optionA/B/C/D
- correctLetter
- correctOptionIndex
- answerValidation
- explanation
- hint
- solvingStrategy
- aiContext
- voiceExplanationText
- difficulty
- importStatus
- reviewReason

---

## V. Pilot

ابدأ بـ30 سؤالًا متنوعة.

قبل WRITE:
1. Crop QA.
2. R2 upload QA.
3. manifest validator.
4. import endpoint `dryRun=true`.
5. إذا PASS فقط استخدم WRITE.

استخدم:
`POST /api/quizzes/questions/import-batch`

كل imported question يبقى `draft`.

بعدها:
`GET /api/quizzes/questions/import-batch/:batchId`

يجب:
- allDraft=true
- linkedQuizCount=0
- integrityIssues=[]

إذا batch خاطئ بالكامل ومازال Draft وغير مربوط:
استخدم rollback الموجود فقط بعد التأكد:
`DELETE /api/quizzes/questions/import-batch/:batchId`

---

## W. Acceptance Gates

Pilot لا ينجح إلا إذا:
- crop complete = 100%
- number badge excluded = 100%
- question identity preserved in metadata = 100%
- R2 URLs valid = 100%
- SHA-256 correct = 100%
- options A/B/C/D correct = 100%
- optionTexts complete = 100%
- taxonomy link valid = 100%
- duplicate questionCodes = 0
- duplicate sourceItemIds = 0
- AI safe context complete = 100%
- verified answers for auto-import = 100%
- Qudurat regression tests pass

بعد نجاح Pilot، أكمل Full Import آليًا للأسئلة VERIFIED.
CONFLICT/UNVERIFIED/crop ambiguous تبقى في review queue ولا تخمن.

---

## X. E2E

اختبر:
student opens question
→ crop visible
→ A/B/C/D visible
→ choose answer
→ submit
→ result
→ review
→ wrong/review list
→ voice tutor safe context
→ post-submit explanation
→ video link lookup by questionCode

---

## Y. الأسرار والصلاحيات

استخدم الصلاحيات الموجودة محليًا/في runtime فقط.
لا تطبع:
- MONGODB_URI
- R2 secret keys
- JWTs
- admin passwords
- API keys

إذا credentials ناقصة، أعطني أسماء المفاتيح الناقصة فقط.

---

## Z. التقرير بعد كل Batch

أخرج:
- DONE
- CURRENT BRANCH / BASE SHA
- CHANGED FILES
- TAXONOMY 22/70 STATUS
- PDF PAGES SCANNED
- QUESTION CANDIDATES
- CROPPED
- CROP REVIEW REQUIRED
- R2 UPLOADED
- MANIFEST PASS/FAIL
- ANSWER VERIFIED/CONFLICT/UNVERIFIED
- IMPORTED DRAFT
- SKIPPED
- SKILL COVERAGE
- TESTS
- QUDURAT REGRESSION
- BLOCKERS
- NEXT ACTION

لا تقل "تم" بدون Evidence.

ابدأ الآن بهذا الترتيب:
**sync-safe worktree → architecture audit → generalize QDR-only import contract → A/B/C/D presentation fix → PDF/crop pipeline → manifest → 30-question pilot → R2 → dry-run → draft import → E2E → full verified import.**
