# TUTOR-01 — خطة المعلم الشخصي الذكي لكل طالب

**الحالة:** PLAN ONLY — لا تغييرات تشغيلية  
**التاريخ:** 2026-09-22  
**الفرع:** `chatgpt/tutor-01-personal-ai-tutor-plan`  
**القاعدة:** `chatgpt/adaptive-phase11-final-certification`

## 1) الهدف

إضافة طبقة "معلم شخصي ذكي" لكل طالب فوق البنية الحالية لمنصة ALMEAA، بحيث يعرف أداء الطالب التعليمي، الأخطاء المتكررة، المهارات الضعيفة والقوية، سرعة الاستجابة، نوع المساعدة التي تنجح معه، ثم يكيّف الشرح والتدريب في الجلسات التالية.

الخطة لا تنشئ نموذج LLM مستقلًا مدرَّبًا من الصفر لكل طالب. البديل الأبسط والأرخص والأكثر قابلية للضبط هو:

**نموذج أساسي مشترك + ملف طالب تعليمي دائم + ذاكرة منظمة + سياسة تدريس شخصية + أدوات المنصة.**

يكون لكل طالب `TutorProfile` و`TutorRuntimeId` خاصان به، بينما مفاتيح مزودي AI تبقى سرية في الخادم.

---

## 2) ما هو موجود بالفعل ويمكن إعادة استخدامه

### موجود وقابل للبناء عليه

1. **التعلم التكيفي والإتقان**
   - `SkillProgress`: إتقان، حالة المهارة، عدد الأدلة، المحاولات، آخر نشاط، الإجراء المقترح.
   - مسار العلاج وإعادة الفحص ومراجعة الإتقان وNext Best Action.

2. **أدلة إجابة الطالب**
   - `QuestionAttempt`: السؤال، الإجابة، صحة الإجابة، الزمن، المهارات، نوع الدليل.
   - نتائج الاختبارات وتحليل المهارات.

3. **مساعد AI شخصي أولي**
   - `/ai/chat` يبني سياقًا من نقاط الضعف والنتائج الحديثة.
   - يدعم رسالة + صورة.
   - بوابة متعددة المزودين وفشل متسلسل وميزانيات وحماية.

4. **مساعد السؤال**
   - `/ai/question-assistant` بتدرج: تلميح، تلميح أقوى، مفهوم، خطوات، متابعة.
   - Context موثوق من الخادم، Cache، Rate Limit، Budget، Telemetry.
   - لا يكتب الدرجات أو الإتقان.

5. **الرسم**
   - `QuestionDrawingPad` Canvas يعمل عبر Pointer Events، وبالتالي أساس مناسب للقلم/اللمس/الماوس.
   - رسم حر وخط وسهم ومستطيل ودائرة وزاوية ونص.

6. **العضويات والدفع**
   - عضويات عامة وباقات ومشتريات وطلبات دفع.
   - توجد بنية Revenue Share في باقات المدارس يمكن الاستفادة من فكرتها.

7. **لوحة ذكاء الطالب**
   - `StudentIntelligenceProfile` تعرض المتوسط والتطور والمهارات القوية والضعيفة والمحاولات والدروس.

### غير موجود بالشكل المطلوب بعد

- ذاكرة تعليمية طويلة المدى للمعلم الشخصي.
- تحليل منظم لأسلوب الخطأ وطريقة الحل.
- Voice realtime ثنائي الاتجاه.
- دفتر طالب كامل قابل للحفظ والاسترجاع.
- مختبر رياضيات 2D/3D تفاعلي.
- Ledger تكلفة AI ورصيد خاص بكل طالب.
- محرك سياسات يختار تلقائيًا طريقة الشرح الأنسب حسب نتيجة الطالب السابقة.
- Attention assistance آمنة ومناسبة للطلاب.
- قياس جودة طريقة الشرح نفسها: هل نجحت مع هذا الطالب أم لا؟

---

## 3) المبدأ التربوي

لا نثبت الطالب في تسمية جامدة مثل "بصري" أو "سمعي". بدلًا من ذلك نحفظ **أدلة ديناميكية** عن طرق العرض التي حققت معه أفضل تعلم.

أمثلة:
- مثال محلول أولًا.
- رسم/تمثيل بصري.
- شرح صوتي قصير.
- خطوات قصيرة متتابعة.
- سؤال سقراطي بدل كشف الحل.
- تشبيه واقعي.
- صيغة رمزية مباشرة.
- نموذج 2D/3D قابل للتحريك.

النظام يرفع أو يخفض ثقة كل استراتيجية بناءً على:
- صحة السؤال التالي.
- زمن الحل.
- عدد التلميحات.
- إعادة الخطأ نفسه.
- نجاح النقل لسؤال جديد من نفس المهارة.
- طلب الطالب إعادة الشرح.

---

## 4) المكونات الجديدة

### A. StudentTutorProfile

سجل واحد لكل طالب، مثال حقول:

- `userId`
- `profileVersion`
- `explanationPolicy`
  - pace
  - detailLevel
  - examplesFirst
  - socraticStrength
  - languagePreference
- `representationScores`
  - workedExample
  - diagram
  - voice
  - shortSteps
  - analogy
  - symbolic
  - interactive2d
  - interactive3d
- `misconceptions[]`
  - skillId
  - misconceptionCode
  - evidenceCount
  - confidence
  - lastSeenAt
- `errorPatterns[]`
  - concept
  - procedure
  - calculation
  - reading
  - rushedGuess
  - unitOrSign
- `tutorMemorySummary`
- `lastSessionAt`

أي استنتاج يجب أن يكون معه Evidence/Confidence، ولا يحفظ كحقيقة نفسية عن الطالب.

### B. TutorSession

- sessionId
- userId
- subject/path/skill context
- startedAt/endedAt
- current goal
- current misconception
- selected teaching strategy
- session outcome
- linked attempts/resources

### C. TutorLearningEvent

أحداث قصيرة قابلة للتحليل:
- answer_submitted
- hint_requested
- explanation_repeated
- representation_changed
- canvas_used
- image_shared
- voice_started
- checkin_answered
- inactivity
- mastery_check

### D. AiUsageLedger

سجل مالي مستقل عن `AiInteraction`:
- userId
- sessionId
- provider/model
- modality: text/image/voice
- input/output usage
- estimated/actual vendor cost
- retail credits debited
- gross margin
- currency
- idempotencyKey
- status

`AiInteraction` يبقى للتشغيل والمراقبة، بينما `AiUsageLedger` للفوترة الدقيقة.

### E. TutorWallet / TutorPlan

لكل طالب:
- الرصيد.
- الخطة.
- حدود يومية/شهرية.
- ما المسموح: text / image / voice / premium reasoning.
- تنبيه الرصيد.
- سجل الاستهلاك.

---

## 5) Tutor Orchestrator

واجهة الطالب لا تتعامل مباشرة مع أي مزود AI.

المسار:

`Student UI -> Tutor Session Gateway -> Context Builder -> Teaching Policy -> Model Router -> Platform Tools -> Response`

### Context Builder

يرسل أقل سياق كافٍ فقط:
- المهارة الحالية.
- آخر أدلة مرتبطة بها.
- الأخطاء المتكررة المرتبطة بنفس المفهوم.
- ملخص TutorProfile.
- محتوى السؤال/الدرس الموثوق.
- سياق الجلسة القصير.

لا يرسل تاريخ الطالب الكامل في كل رسالة.

### Platform Tools

المعلم يمكنه قراءة:
- SkillProgress.
- QuestionAttempt.
- نتيجة السؤال الحالي.
- الشرح المعتمد.
- مصادر التعلم المناسبة.
- Next Best Action.

ويمكنه طلب إجراءات عبر APIs الخادم مثل:
- إنشاء تدريب علاجي.
- فتح مورد.
- إجراء فحص إتقان.

**لكن AI لا يكتب الدرجة أو الإتقان مباشرة.** الخدمات الحتمية الحالية تظل صاحبة القرار.

---

## 6) واجهة الطالب المقترحة

داخل لوحة الطالب نضيف مدخلًا واضحًا: **"معلمي الذكي"**.

الشاشة الرئيسية تكون بسيطة:
1. مساحة شرح.
2. Chat.
3. زر ميكروفون.
4. زر رفع/تصوير السؤال.
5. زر "افهم حلي".
6. زر "افتح الدفتر".
7. زر "افتح المختبر التفاعلي".
8. بطاقة صغيرة: "أنا أركز معك الآن على: …".
9. مستوى رصيد AI بدون تفاصيل تقنية مزعجة.

### أوضاع الاستخدام

- **اسأل**: سؤال حر.
- **اشرح لي**: شرح حسب ملف الطالب.
- **ساعدني ولا تعطيني الحل**.
- **شاهد حلي**: صورة أو Canvas.
- **درّبني**: يولد/يختار تدريبًا مناسبًا.
- **اختبر فهمي**: سؤال واحد قصير بعد الشرح.
- **ذاكر معي**: جلسة صوتية متتابعة.

---

## 7) الدفتر الذكي

نعيد استخدام فكرة `QuestionDrawingPad` ونفصلها إلى مكوّن مشترك مثل:

`LearningCanvas`

الإصدار الأول:
- Full screen.
- صفحات متعددة.
- قلم/ماوس/لمس.
- Pen / Highlighter / Eraser.
- Undo/Redo.
- خط/سهم/دائرة/مستطيل/زاوية.
- ورق أبيض/مسطر/شبكة إحداثيات.
- Text + Math.
- Zoom/Pan.
- حفظ تلقائي.

الأفضل حفظ **strokes/events كبيانات vector** وليس PNG فقط، مع إمكانية توليد Snapshot عند الحاجة للـAI.

في V1 لا تُرسل كل حركة قلم للـAI. الطالب يضغط **"افهم حلي"** فيرسل Snapshot محددًا، ثم نضيف لاحقًا التحليل المرحلي إذا أثبتت فائدته.

---

## 8) المختبر الرياضي 2D/3D

نفصل بين:

### Math Lab 2D
مناسب للمثلثات والدائرة والمستوى الإحداثي والدوال:
- تحريك الرؤوس.
- إظهار الزوايا والأطوال.
- الحفاظ على القيود.
- Zoom/Pan.
- Slider للمتغيرات.

### Math Lab 3D
مناسب فعليًا لـ:
- المنشور.
- الهرم.
- المجسمات الدورانية.
- المتجهات.
- الإحداثيات ثلاثية الأبعاد.
- المقاطع.

نضيف مكتبة WebGL/Three.js في مرحلة مستقلة.

الـAI لا يولد JavaScript عشوائيًا. يولد **Geometry Scene Spec** آمنًا ومحدودًا، مثال:
- objects
- coordinates
- constraints
- labels
- measurements
- cameraPreset

ثم Renderer موثوق يحول الـspec إلى مشهد.

---

## 9) الصوت

الصوت يكون Realtime وليس مجرد تحويل نص إلى صوت.

المطلوب:
- الطالب يتكلم.
- المعلم يسمع ويجيب صوتيًا.
- Interrupt/Bararge-in: الطالب يستطيع مقاطعة الشرح.
- المعلم يسأل سؤالًا قصيرًا كل فترة.
- ينتظر إجابة الطالب ويعدّل الشرح.
- يمكنه استدعاء أدوات المنصة أثناء الجلسة.

### ضبط التكلفة
- Text tutor هو الافتراضي الأرخص.
- Voice يكون ضمن خطة أعلى أو رصيد منفصل.
- نموذج realtime اقتصادي افتراضيًا.
- ترقية لنموذج أقوى فقط عند الحاجة.
- Silence timeout.
- إيقاف الجلسة عند عدم النشاط.
- حدود زمنية لكل جلسة.

---

## 10) الانتباه والتركيز

### V1 — بدون كاميرا
الأفضل للبدء:
- Page Visibility.
- inactivity timer.
- عدم الرد على check-in.
- نقرات سريعة عشوائية/تخمينات متتابعة.
- طول صمت غير معتاد في الجلسة الصوتية.

رد المعلم يكون لطيفًا وغير عقابي:
"نكمل؟ أشرحها بطريقة أقصر؟"

### V2 — كاميرا اختيارية فقط
إذا تقرر إضافتها:
- Opt-in صريح.
- سياسات مدرسة/ولي أمر عند الحاجة.
- الأفضل معالجة محلية على الجهاز.
- لا تسجيل فيديو.
- لا تخزين صور الوجه.
- لا رفع Frames للخادم افتراضيًا.
- نستخدم فقط إشارة بسيطة مثل present / away.
- لا نستنتج المشاعر أو الذكاء أو الحالة النفسية.
- لا تستخدم للإعطاء درجات أو عقوبات.

---

## 11) نموذج البيع الصحيح

لا نعطي الطالب مفتاح API لمزود خارجي.

المنتج المباع هو:
**"رصيد المعلم الذكي / AI Tutor Credits"**

مفتاح المزود يبقى في الخادم، والطالب يحصل على `TutorRuntimeId` داخلي.

### خيارات البيع
- Add-on شهري.
- باقة 500/1000/3000 رصيد.
- دقائق Voice.
- خطة مدرسية برصيد مشترك.
- تجربة مجانية صغيرة.
- Auto top-up اختياري.

### التسعير
السعر الداخلي لكل عملية يحسب:
`Vendor Cost + Infra + Payment Fees + Tax/Buffer + Platform Margin`

ويتحول إلى Credits كي لا نربط واجهة الطالب بتغير أسعار المزودين.

يمكن للمدير تحديد:
- Target margin.
- حد يومي.
- حد شهري.
- الحد الأعلى لتكلفة الطلب.
- نماذج مسموحة لكل خطة.

---

## 12) التكامل مع العضويات الحالية

نضيف نوع صلاحية جديد بدل إعادة بناء الدفع:

- `aiTutorEnabled`
- `aiTutorPlanId`
- `aiTutorCredits`
- `voiceEnabled`
- `visionEnabled`
- `premiumReasoningEnabled`

والعضوية/الباقة الحالية تستطيع تضمين:
- بدون AI.
- AI Text.
- AI Text + Image.
- AI Full Tutor.
- AI Full Tutor + Live Voice.

عملية الشراء الحالية تمنح Entitlement ثم ينشئ النظام/يشحن TutorWallet.

---

## 13) المراحل التنفيذية

### TUTOR-01 — Foundation Contract
- تثبيت الحدود: AI لا يغير score/mastery.
- تعريف schemas والعقود والFeature Flags.
- لا UI كبير.

### TUTOR-02 — Learner Model
- StudentTutorProfile.
- Misconception/Error evidence.
- تحديث profile من أحداث موثوقة.
- Confidence لكل استنتاج.

### TUTOR-03 — Tutor Orchestrator
- Session gateway.
- Context builder.
- Tool registry.
- Teaching policy.
- Model router.
- Memory summarization.

### TUTOR-04 — Personal Text/Image Tutor
- واجهة "معلمي الذكي".
- chat + image.
- ربط السؤال والمهارة والمحتوى.
- "افهم حلي".
- اختبار فهم قصير بعد الشرح.

### TUTOR-05 — Smart Notebook
- تحويل DrawingPad إلى LearningCanvas.
- Full screen + pages + persistence + stylus/touch/mouse.

### TUTOR-06 — Live Voice
- Realtime voice.
- interruptions.
- checkpoints.
- cost controls.

### TUTOR-07 — Interactive Math Lab
- 2D أولًا.
- safe scene spec.
- 3D بعد إثبات 2D.
- rotate/zoom/pan/drag/measure.

### TUTOR-08 — Focus Assistance
- non-camera engagement signals.
- optional on-device presence mode لاحقًا.

### TUTOR-09 — Credits & Billing
- TutorPlan.
- Wallet.
- Usage Ledger.
- pre-authorization.
- final settlement.
- margin/admin reports.

### TUTOR-10 — Parent/School/Admin Controls
- limits.
- permissions.
- visibility.
- usage reports.
- privacy/retention.

### TUTOR-11 — Certification
- security.
- cost/load.
- AI failure fallback.
- privacy.
- payment integrity.
- learner isolation.
- mobile/stylus/voice tests.
- final rollout gate.

---

## 14) ترتيب التنفيذ الأنسب

لا نبدأ بالصوت أو 3D أو الكاميرا.

الترتيب الأعلى عائدًا والأقل مخاطرة:
1. Learner Profile.
2. Text/Image tutor فوق AI الموجود.
3. Feedback loop: أي أسلوب شرح أدى لتحسن؟
4. Notebook.
5. Billing/Credits.
6. Voice.
7. 2D/3D.
8. Optional attention camera only if justified.

بهذا نحصل مبكرًا على "المعلم الذي يعرف الطالب" قبل دفع تكلفة الواجهات الثقيلة.

---

## 15) مقاييس النجاح

لا نقيس النجاح بعدد رسائل AI فقط.

- نسبة صحة سؤال التحقق بعد الشرح.
- انخفاض تكرار نفس misconception.
- time-to-mastery.
- hints-to-success.
- إعادة الشرح لكل استراتيجية.
- transfer success على سؤال جديد.
- cost per successful remediation.
- AI gross margin.
- voice minutes per successful outcome.
- fallback/error rates.
- student/parent opt-out and privacy events.

---

## 16) قواعد لا تُكسر

1. AI لا يملك سلطة الدرجات أو الإتقان.
2. لا نبيع أو نكشف مفاتيح API الخارجية للطالب.
3. كل بيانات طالب معزولة عن غيره.
4. لا نرسل تاريخًا كاملًا للمزود بلا داع.
5. لا نخزن فيديو كاميرا أو وجه افتراضيًا.
6. لا نعامل "أسلوب التعلم" كتسمية نفسية ثابتة.
7. كل استنتاج عن طريقة التعلم مرتبط بأدلة وثقة.
8. أي عملية AI مرتفعة التكلفة تمر عبر Budget/Wallet gate.
9. كل provider call قابل للرصد والمحاسبة والفشل الآمن.
10. لا نكرر أنظمة adaptive الحالية؛ المعلم الذكي يستهلكها كأدوات.

---

## 17) النتيجة المعمارية المستهدفة

في النهاية كل طالب يرى "معلمًا واحدًا" ثابت الهوية داخل المنصة، لكن تقنيًا هو:

- StudentTutorProfile خاص.
- Memory خاصة.
- Teaching Policy خاصة.
- Session Context خاص.
- Wallet خاص.
- Shared secure model gateway.
- Shared platform tools.
- Existing deterministic adaptive engine.

وهذا يحقق شخصية عالية لكل طالب بدون تكلفة إنشاء/تدريب نموذج مستقل فعليًا لكل طالب.
