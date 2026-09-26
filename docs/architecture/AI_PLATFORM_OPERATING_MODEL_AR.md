# ALMEAA — نظام الذكاء الاصطناعي الموحد للمنصة

> الحالة: **Canonical Target Operating Model**  
> آخر تحديث: 2026-09-24  
> الغرض: توحيد المفاتيح، المزودات، التوكنز، الميزانيات، المساعدين، الصوت، المراقبة، والـfallback في نظام واحد مفهوم وقابل للإدارة.

---

## 1. الفكرة الحاكمة

المنصة لا يجب أن تحتوي "ذكاء اصطناعي" منفصلًا لكل صفحة.

النموذج المعتمد:

**One AI Gateway → Multiple Capabilities → One Control Center**

أي واجهة تحتاج AI لا تتصل بـGemini أو OpenAI أو غيرهما مباشرة.  
كل الطلبات تمر من Backend Gateway واحد يطبق:
- الصلاحيات.
- بناء السياق.
- اختيار المزود.
- اختيار النموذج.
- حد التوكنز.
- الميزانية.
- cache.
- rate limit.
- circuit breaker.
- التسجيل والمراقبة.
- fallback.

---

## 2. ما هو AI وما ليس AI

### قرارات يجب أن تبقى deterministic في السيرفر
هذه لا تُسند إلى LLM:
- scoring.
- correct answer.
- SkillProgress.
- mastery calculation.
- readiness calculation.
- Next Best Action الأساسي.
- صلاحيات الطالب.
- اختيار السؤال من Question Bank وفق قواعد ثابتة.
- إنشاء/توجيه نتيجة رسمية.
- إعادة جدولة spaced review.
- RBAC.
- الدفع والباقات.

### AI يستخدم في
- شرح السؤال.
- التلميحات والحوار التعليمي.
- تلخيص نتيجة أو تقرير.
- صياغة خطة علاجية من بيانات محسوبة أصلًا.
- مساعد المدير.
- اقتراح صياغات محتوى للمعلم مع مراجعة بشرية.
- المحادثة العامة للطالب.
- الصوت الحي مستقبلًا.
- Vision فقط عندما يكون السياق البصري ضروريًا وغير موصوف نصيًا.

---

## 3. القدرات الموحدة

| Capability | المستخدم | مصدر السياق | هل يغير بيانات رسمية؟ |
|---|---|---|---|
| Student Tutor | الطالب | SkillProgress + نتائج حديثة + مسار الطالب | لا |
| Question Tutor | الطالب | Question + Review/Result context | لا |
| Voice Tutor | الطالب | نفس سياق Question/Student Tutor | لا |
| Admin Copilot | المدير | Operations audit + مؤشرات المنصة | لا |
| Authoring Assistant | مدير/معلم | موضوع/مهارة/Question Bank | Draft فقط |
| Remediation Narrator | الطالب/ولي الأمر | خطة deterministic + المهارات | لا |
| Report Explainer | الطالب/ولي/مشرف | Report read model | لا |

الهدف: كل هذه القدرات تستخدم نفس الـGateway، وليس Provider logic مختلفًا.

---

## 4. الوضع الحالي الذي يجب الحفاظ عليه أثناء التوحيد

الموجود فعليًا الآن:
- `/api/ai/*` كبوابة Backend.
- مزودات: Gemini, OpenRouter, Qwen, DeepSeek, OpenAI, Ollama, LM Studio, وfallback داخلي.
- إعدادات مزودات يمكن أن تأتي من env أو Admin Integrations.
- تشفير المفاتيح المخزنة باستخدام AES-256-GCM.
- إخفاء الأسرار في واجهة الإدارة والتاريخ.
- دعم أكثر من API key داخل بعض مزودات AI.
- provider order.
- circuit breaker على مستوى المزود.
- Question Assistant cache.
- global/user/school request budgets لبعض المسارات.
- سجل `AiInteraction`.
- fallback محلي يمنع توقف التجربة بالكامل.

لكن هذا الأساس **متبعثر وظيفيًا** بين:
- `ai.routes.ts`.
- Platform Integrations.
- AiAssistantManager.
- frontend compatibility service باسم `geminiService.ts`.
- endpoints بعضها يمر budget/logging وبعضها لا يمر.

التوحيد يجب أن يحافظ على السلوك الجيد ويزيل التشتت تدريجيًا.

---

## 5. الحقيقة التشغيلية المرصودة بتاريخ 2026-09-24

فحص `/api/ai/status` في الإنتاج بعد Merge #257 أظهر:
- لا يوجد Gemini key فعال.
- لا يوجد OpenRouter/Qwen/DeepSeek/OpenAI key فعال.
- runtime يعتبر Ollama وLM Studio configured بسبب defaults الحالية.
- كلا المزودين المحليين دخلا circuit-open بعد فشل الاتصال.
- النظام يستطيع الرجوع إلى `none/local-fallback`.

هذا لا يعني أن Ollama أو LM Studio يعملان فعليًا على Render.  
بل يكشف فجوة يجب إصلاحها: **المزود المحلي لا يعتبر configured في Production إلا عند تفعيل صريح + endpoint صالح قابل للوصول.**

---

## 6. إدارة المفاتيح

### القاعدة
**المفتاح لا يصل إلى Frontend أبدًا.**

### مكان الإدارة
واجهة واحدة داخل:
**Admin → AI Control Center → Providers & Keys**

### لكل Provider
نعرض:
- enabled.
- model.
- base URL عند الحاجة.
- priority.
- capability eligibility.
- keys count.
- masked last characters فقط.
- last tested.
- last success.
- last failure.
- latency.
- quota/rate signal.
- status: Active / Degraded / Disabled.

### أكثر من مفتاح
مسموح عند وجود أكثر من مفتاح شرعي لنفس الحساب/المشروع:
- keyId داخلي.
- label.
- encrypted secret.
- state: active / draining / disabled.
- lastUsedAt.
- errorCount.

لا نسجل قيمة المفتاح في logs.

### مصدر الحقيقة
في النسخة الأولى:
- نحافظ على التخزين المشفر الموجود داخل PlatformIntegrationSettings.
- ننشئ `AiConfigService` كواجهة موحدة فوقه.
- env يبقى bootstrap/emergency fallback.
- لا نقوم الآن بMigration مدمرة.

لاحقًا، إذا ثبتت الحاجة، يمكن استخراج `AiProviderConfig` مستقل دون تغيير واجهات المستهلكين.

### مفتاح التشفير
في Production يجب الاعتماد على:
`PLATFORM_INTEGRATIONS_SECRET_KEY`
كمفتاح مخصص ثابت.

لا يفضّل الاعتماد على `JWT_SECRET` كخيار دائم لتشفير أسرار المزودات.

---

## 7. Routing — كيف نختار المزود؟

لا يكفي ترتيب عالمي واحد لجميع الحالات.

نستخدم **Capability Profiles**:

### Fast / Cheap
للـ:
- hint.
- short student chat.
- report explanation القصير.

### Strong Reasoning
للـ:
- authoring draft.
- admin diagnosis المعقد.
- شرح رياضي يحتاج reasoning أعلى.

### Realtime / Voice
للصوت الحي مستقبلًا.

### Vision
فقط عند عدم كفاية `aiContext.visualDescription`.

كل Profile لديه:
- primary provider/model.
- fallback providers.
- max input.
- max output.
- timeout.
- temperature.
- vision allowed?
- cache policy.
- daily budget.

إذا فشل provider:
1. key-level retry الآمن.
2. provider circuit breaker.
3. provider التالي.
4. trusted local fallback.

---

## 8. التوكنز — النظام المطلوب

الوضع الحالي يقيس أساسًا **عدد التفاعلات** وليس الاستهلاك الحقيقي للتوكنز.

المطلوب أن يصبح لكل طلب سجل Usage:

- inputTokens.
- outputTokens.
- totalTokens.
- cachedTokens إن أمكن.
- provider.
- model.
- capability.
- userId.
- schoolId.
- latencyMs.
- estimatedCostUsd أو وحدة تكلفة داخلية.
- cacheHit.
- fallback.
- requestId.

إذا المزود يرجع Usage نستخدم الرقم الحقيقي.
إذا لا يرجع، نسجل تقديرًا واضحًا:
`usageEstimated=true`.

---

## 9. الميزانيات

نحتاج طبقتين معًا:

### Rate limits
لمنع spam:
- per minute.
- per user.
- per endpoint/capability.

### Token / Cost budgets
لمنع فاتورة مفتوحة:
- Global/day.
- School/day.
- User/day.
- Capability/day.
- Voice minutes/day.
- Vision requests/day.

قبل الطلب:
1. Estimate context.
2. تحقق من الميزانية.
3. Reserve usage تقريبيًا.

بعد الطلب:
4. سجل actual usage.
5. صحح الفرق.
6. حدث dashboard.

عند تجاوز الميزانية:
- لا تنهار الصفحة.
- استخدم deterministic/trusted fallback.
- اعرض رسالة مناسبة بدون كشف تفاصيل مالية.

---

## 10. التحكم في الاستهلاك

ترتيب توفير التكلفة:

1. **لا تستخدم LLM إذا لا نحتاجه.**
2. استخدم `speechText` وtrusted explanations قبل AI.
3. لا ترسل full student history.
4. أرسل أضعف 3–5 مهارات فقط.
5. أرسل آخر نتائج محدودة فقط.
6. لا ترسل الصورة افتراضيًا.
7. استخدم `visualDescription` بدل Vision عندما يكفي.
8. cache للسؤال + help level + context version.
9. in-flight dedupe للطلبات المتطابقة.
10. output limits قصيرة.
11. session summary بدل إعادة كامل الحوار.
12. النموذج الاقتصادي افتراضيًا.
13. النموذج الأقوى فقط عند الحاجة.
14. Browser TTS للنص الثابت بدل توليد صوت مدفوع.

---

## 11. المساعد النصي للطالب

يوجد مساعد عام للطالب، لكنه يجب أن يصبح Capability واضحة باسم:
**Student Tutor**

السياق المسموح:
- اسم الطالب عند الحاجة.
- المسار الحالي.
- SkillProgress المختصر.
- أضعف المهارات.
- آخر 3–5 نتائج ذات صلة.
- الخطوة المقترحة من النظام.

لا يرسل:
- كل history.
- بيانات طلاب آخرين.
- أسرار.
- full database rows.

وظيفته:
- يشرح.
- يساعد الطالب يقرر ماذا يراجع.
- يربطه بدرس/تدريب موجود.
- يجيب على أسئلة الدراسة.

لا يحسب mastery ولا يخترع readiness.

---

## 12. Question Tutor

هذا أكثر مكان يجب أن يكون اقتصاديًا.

المصدر:
`questionId` فقط + context المصرح.

يستخدم بالتدرج:
1. trusted hint.
2. trusted solvingStrategy.
3. trusted explanation.
4. AI عند الحاجة.

المستويات:
- hint.
- stronger_hint.
- concept.
- steps.
- follow_up.

في saved/mistake review:
- لا يرسل correctOptionIndex للـAI.
- يعتمد على السياق التعليمي الموثوق.

الصورة:
- لا ترسل bytes افتراضيًا.
- Vision fallback فقط إذا احتاج السؤال وصفًا بصريًا غير موجود.

---

## 13. الصوت

### الموجود الآن
`QuestionVoiceExplanationPlayer`:
- audioUrl إن وجد.
- وإلا SpeechSynthesis عربي من النص.
- هذا منخفض التكلفة ولا يحتاج LLM.

### Voice Tutor الحي مستقبلًا
ليس تشغيل microphone مفتوح طول الوقت.

النموذج المقترح:
- Push-to-talk أو turn-based.
- STT → Tutor Gateway → response → TTS.
- session قصيرة.
- session context مختصر.
- maximum turn count.
- idle timeout.
- daily voice minutes budget.
- لا إرسال صورة مع كل turn.
- إذا السؤال معروف، يمر `questionId` بدل إعادة محتواه كاملًا.

---

## 14. المساعد الإداري

**Admin Copilot** يستخدم:
- operations audit.
- readiness.
- errors.
- AI usage.
- content integrity summaries.

لا ينفذ أوامر مدمرة من chat تلقائيًا.
أي Action حقيقي يحتاج:
- زر واضح.
- permission.
- confirmation عند الأثر الحساس.
- audit trail.

---

## 15. توليد المحتوى

أي Question/شرح/ملخص يولده AI يكون:
**Draft → Review → Approve → Publish**

لا ينشر سؤال AI مباشرة للطلاب.

المولد يجب أن ينتج structured JSON ثم يمر validation:
- options.
- answer index.
- skill mapping.
- source/provenance إن كان مطلوبًا.
- math formatting.
- duplicate check.

---

## 16. AI Usage Ledger

نمدد `AiInteraction` تدريجيًا بدل إنشاء تخزين مكرر.

حقول مطلوبة:
- capability.
- requestId.
- inputTokens.
- outputTokens.
- totalTokens.
- usageEstimated.
- cost.
- keyId masked reference.
- cacheHit.
- contextChars.
- outputLimit.
- failureCategory.

لا نخزن prompt/response كاملين افتراضيًا.
الـpreview المحدود الحالي مناسب للمراقبة.

---

## 17. AI Control Center

بدل التشتت بين Integrations وAI Manager، تكون الواجهة الرئيسية:

### Overview
- هل AI يعمل؟
- provider الحالي.
- fallback rate.
- tokens today.
- estimated cost.
- errors.
- latency.

### Providers & Keys
- إضافة/تعطيل/اختبار/تدوير المفاتيح.

### Routing
- profiles لكل Capability.

### Budgets
- global/school/user/capability.

### Usage & Cost
- اليوم/الأسبوع/الشهر.
- by provider/model/capability/school.

### Capabilities
- Student Tutor.
- Question Tutor.
- Admin Copilot.
- Authoring.
- Voice.

### Logs
- masked previews.
- errors.
- fallback reasons.
- request IDs.

### Test Lab
- اختبار كل provider.
- latency.
- structured output.
- Arabic/math sample.
- لا يستخدم بيانات طالب حقيقية.

Platform Integrations يبقى للـGoogle/WhatsApp/Email/... ويضع فقط رابطًا إلى AI Control Center.

---

## 18. فجوات P0 قبل تفعيل مفاتيح مدفوعة

1. local provider configuration:
   - Ollama/LM Studio لا يعتبران configured في Production من defaults فقط.

2. كل endpoint AI يجب أن يمر من نفس budget/metering:
   - بعض المسارات الحالية تستخدم `callAi` مباشرة ولا تسجل usage/budget بنفس صرامة chat/question-assistant.

3. `/ai/course-summary` يجب ألا يكون endpoint مفتوحًا غير محدود يستهلك Provider.

4. actual token usage:
   - request counting الحالي ليس كافيًا كميزانية مالية.

5. dedicated secret key:
   - تثبيت `PLATFORM_INTEGRATIONS_SECRET_KEY` في Production.

6. rename compatibility layer:
   - `services/geminiService.ts` لم يعد Gemini مباشرًا؛ هو facade للـAI Gateway، والاسم مربك.

---

## 19. خطة التنفيذ بدون إعادة بناء المنصة

### AI-0 — Canonicalize
- هذه الوثيقة.
- Capability registry.
- لا تغيير سلوك.

### AI-1 — Secure Gateway
- استخراج provider registry/router من `ai.routes.ts`.
- توحيد كل endpoint على gateway واحد.
- إصلاح local provider false-ready.
- حماية public cost endpoints.
- exact-head tests.

### AI-2 — Usage & Budgets
- token usage ledger.
- cost estimator.
- token budgets.
- dashboard.

### AI-3 — Capability Routing
- profiles بدل global order فقط.
- cheap/strong/vision/realtime.

### AI-4 — Student + Question Tutor unification
- common session/context layer.
- summary memory قصيرة.
- links/actions إلى محتوى المنصة.

### AI-5 — Live Voice
- STT/TTS/realtime adapter.
- voice minute budgets.
- mobile UX.
- interruption/timeout.

### AI-6 — Readiness / predicted score layer
- readiness تبقى deterministic.
- AI يشرحها فقط.
- predictive score لا يطلق إلا بعد calibration/evidence كافٍ.

---

## 20. استراتيجية Free-First والمفاتيح المتعددة

الهدف هو الاستفادة من الطبقات المجانية **بشكل مشروع ومستقر**، لا بناء النظام على التحايل على حصص المزودات.

### القاعدة الأساسية
كل مفتاح يحمل هوية Quota Pool، وليس مجرد secret مستقل:

```
Provider
  └─ Account / Organization
      └─ Project / Workspace   ← quota pool
          ├─ Key A
          ├─ Key B
          └─ Key C
```

إذا كان مفتاحان تابعين لنفس Project/Workspace ويشتركان في نفس quota، **لا نعاملهما كمصدرين لحصة إضافية**. فائدتهما تكون rotation/security فقط.

### Gemini / Google AI Studio
- حدود Gemini API تُطبق أساسًا على **المشروع** لا على API key المنفرد.
- لذلك إنشاء عدة keys داخل نفس المشروع لا يضاعف RPM/TPM/RPD.
- يمكن تسجيل أكثر من مشروع مشروعًا مستقلًا عندما يكون لديك سبب مشروع للعزل أو البيئات أو الملكية، لكن لا نصمم النظام لإنشاء حسابات/مشاريع بهدف تجاوز حدود Free Tier.
- كل Gemini key يسجل معه:
  - projectLabel
  - projectId إن توفر
  - accountLabel إداري غير حساس
  - plan: free/paid/unknown
  - quotaPoolId = `gemini:<project>`

### OpenRouter
- يدعم free models.
- Free plan محدود جدًا ومناسب للـfallback والتجارب أكثر من الاعتماد الإنتاجي.
- quota pool يكون على مستوى الحساب/workspace حسب المزود.

### Qwen / Alibaba Model Studio
- يمكن الاستفادة من Free Quota للنماذج المؤهلة.
- free quota عادة مرتبطة بالحساب/الموديل، وليست بكل API key.
- نفعل Free Quota Only من لوحة المزود حين يكون الهدف منع أي رسوم تلقائية.
- quotaPoolId = `qwen:<account/workspace>:<model-family>` عند الحاجة.

### Groq
- مرشح ممتاز كـOpenAI-compatible provider للسرعة والـfree developer usage.
- limits لها سقف على مستوى organization؛ إنشاء projects متعددة لا يلغي سقف المنظمة.
- يضاف لاحقًا عبر Provider Adapter مستقل، لا كمنطق خاص داخل الواجهات.

### سياسة التدوير
التدوير بين المفاتيح يكون لأحد الأسباب التالية فقط:
- key revocation.
- key health failure.
- credential rotation.
- عزل dev/staging/prod.
- مفاتيح/مشاريع مستقلة مسموح بها لها quota pools مستقلة فعلًا.

ولا يستخدم لإخفاء أو تجاوز rate-limit policy للمزود.

### Free-First Router
للطلبات منخفضة المخاطر:
1. Trusted deterministic response/cache.
2. Free healthy quota pool مناسب للـcapability.
3. Free provider آخر.
4. Paid-cheap provider إذا policy تسمح.
5. Trusted fallback.

للطلبات الحرجة:
1. trusted context.
2. provider موثوق ضمن budget.
3. fallback provider.
4. safe deterministic fallback.

---

## 21. نموذج الإدارة المقترح

نبدأ Logical Model فوق التخزين الحالي قبل أي migration:

### AiProvider
- id: gemini/openrouter/qwen/deepseek/openai/groq/...
- enabled.
- adapterType.
- baseUrl.
- supportedCapabilities.
- health.

### AiQuotaPool
يمثل الحصة الحقيقية:
- id.
- providerId.
- accountLabel.
- projectOrWorkspaceLabel.
- plan: free/paid/trial/unknown.
- quotaScope: project/account/organization/model.
- resetRule.
- enabled.
- freeOnly.
- notes.

### AiCredential
- id.
- quotaPoolId.
- label.
- encryptedSecret.
- maskedFingerprint.
- state: active/draining/disabled/invalid.
- lastUsedAt.
- lastSuccessAt.
- lastFailureAt.
- failureCount.
- createdAt/rotatedAt.

### AiModelProfile
- providerId.
- modelId.
- capabilityTags.
- supportsVision.
- supportsAudio.
- supportsStructuredOutput.
- pricing metadata.
- freeEligible.
- qualityTier.
- speedTier.

### AiRouteProfile
مثال:
- `question_hint`: cheap-fast-first.
- `question_reasoning`: strong-text.
- `student_chat`: cheap-fast.
- `admin_diagnosis`: strong.
- `authoring`: strong-structured.
- `voice_live`: realtime.
- `vision_question`: vision-only.

ويحتوي:
- ordered model candidates.
- maxInputTokens.
- maxOutputTokens.
- timeout.
- cache policy.
- paidAllowed.
- freeFirst.
- fallbackMode.

### AiBudgetPolicy
- scopeType: global/school/user/capability/quotaPool.
- period: minute/day/month.
- requestLimit.
- tokenLimit.
- costLimit.
- voiceMinuteLimit.
- visionRequestLimit.
- hardStop/softFallback.

### AiUsageLedger
- requestId.
- capability.
- provider/model.
- quotaPoolId.
- credentialId (reference only).
- user/school.
- input/output/total tokens.
- estimated/actual.
- cost.
- latency.
- cacheHit.
- fallback.
- error category.

---

## 22. AI Control Center — شكل لوحة الإدارة

### Overview
بطاقات:
- AI Status.
- Requests today.
- Tokens today.
- Free quota usage.
- Paid spend.
- Fallback rate.
- Error rate.
- Average latency.

### Providers
لكل Provider:
- Enabled/Disabled.
- Models.
- عدد quota pools.
- عدد المفاتيح الفعالة.
- health.
- current quota state.
- Test.

### Accounts / Projects / Keys
مثال:

| Provider | Pool | Plan | Keys | الحالة | استخدام اليوم |
|---|---|---|---:|---|---:|
| Gemini | Google Project A | Free | 2 | Healthy | ... |
| Gemini | Google Project B | Free/Unknown | 1 | Healthy | ... |
| OpenRouter | Main Workspace | Free | 1 | Limited | ... |
| Qwen | Singapore Workspace | Trial Free | 1 | Healthy | ... |
| Groq | Main Org | Free | 1 | Healthy | ... |

المهم أن اللوحة تفرق بين **عدد المفاتيح** و**عدد حصص quota المستقلة**.

### Routing
يظهر كل Capability ومزوده الحالي وfallback chain.

### Budgets
- Global.
- per school.
- per student.
- per capability.
- per paid provider.

### Usage & Cost
Charts/Tables:
- tokens by provider/model.
- free vs paid.
- top capabilities.
- top schools/users.
- cache savings.
- fallback savings.

### Alerts
- Free quota قرب ينتهي.
- 429.
- invalid key.
- provider circuit-open.
- paid spend threshold.
- abnormal token spike.

### Test Lab
اختبار مزود بدون بيانات طالب:
- Arabic quality.
- math formatting.
- JSON output.
- latency.
- token usage.
- vision capability.

---

## 23. قاعدة مهمة بخصوص تعدد الحسابات

يمكن للمنصة تقنيًا تخزين أكثر من credential وأكثر من quota pool، لكن **لا نعتمد سياسة إنشاء حسابات كثيرة لتجاوز Free Tier أو rate limits**.

السبب هندسي قبل أن يكون تنظيميًا:
- غير مستقر.
- يمكن إيقاف الحسابات.
- يجعل الإنتاج يعتمد على سلوك غير مضمون.
- يصعب مراقبة التكلفة والحصة.
- بعض المزودات تطبق limit أعلى من مستوى المشروع أصلًا.

التصميم الصحيح:
- استفد من كل free tier رسمي.
- افصل quota pools الحقيقية.
- استخدم provider diversity.
- استخدم cache/fallback.
- وعند النمو الفعلي انتقل للـpaid-cheap provider ضمن spend cap واضح.

---

## 24. معيار النجاح

نعتبر AI Platform متماسكة عندما:
- كل AI call يمر من Gateway واحد.
- لا API key في frontend.
- كل request له usage record.
- كل capability له budget.
- يمكن تعطيل Provider واحد بدون تعطيل المنصة.
- fallback يعمل.
- no-AI mode يعمل.
- لا AI في scoring/mastery/RBAC.
- AI Control Center يوضح الحالة الفعلية لا مجرد configuration.
- Student Tutor وQuestion Tutor وAdmin Copilot يستخدمون نفس infrastructure.
- الصوت الحي له ميزانية منفصلة.
- يستطيع المدير معرفة: من استهلك؟ كم؟ لماذا؟ وعلى أي نموذج؟ بدون رؤية بيانات حساسة كاملة.

---

## 21. الخلاصة

النظام المستهدف ليس "Gemini في صفحة وOpenAI في صفحة أخرى".

هو:

```
Student / Question / Admin / Authoring / Voice
                  ↓
           AI Capability Layer
                  ↓
        Context + Policy + Budget
                  ↓
              AI Gateway
                  ↓
      Provider Router + Key Health
                  ↓
Gemini / OpenRouter / Qwen / DeepSeek / OpenAI / Local
                  ↓
 Usage Ledger + Cache + Monitoring + Fallback
```

بهذا الشكل تبقى المنصة بسيطة، قليلة التوكنز، قابلة لتغيير المزود، وقابلة للمراقبة والتسعير دون ربط المنتج بمزود واحد.


## 25. جرد المشروع الحالي بعد الفحص الشامل — 2026-09-24

### واجهات المستخدم والإدارة
- `components/ChatWidget.tsx`: مساعد الطالب العام، يدعم نصًا وصورة.
- `components/results/QuestionAssistantPanel.tsx`: مساعد السؤال في result/saved/mistake/mastery review.
- `components/results/QuestionVoiceExplanationPlayer.tsx`: تسجيل المعلم أو Browser SpeechSynthesis.
- `dashboards/admin/AiAssistantManager.tsx`: مركز إدارة موجود بالفعل ويضم:
  - مساعد المدير.
  - المزودات وسلسلة الانتقال.
  - سجل التفاعلات.
  - جاهزية المساعد والطلاب.
  - اختبار/benchmark للمزودات.
- `dashboards/admin/PlatformIntegrationsManagerLegacy.tsx`: مكان تعديل مفاتيح AI حاليًا عبر `externalPlatforms`.
- `dashboards/admin/builders/UnifiedQuestionBuilder.tsx`: إنشاء Draft سؤال بمساعدة AI.
- `dashboards/admin/builders/QuestionVoiceExplanationEditor.tsx`: تسجيل/رفع صوت المعلم.

### Backend
- `server/src/routes/ai.routes.ts`: ما زال يحتوي معظم الـGateway + providers + endpoints + budgets + telemetry في ملف واحد كبير.
- `server/src/modules/ai/application/questionAssistant.ts`: boundary جيدة مستقلة.
- `server/src/modules/ai/application/providerCircuitBreaker.ts`: circuit breaker حالي process-local.
- `server/src/modules/ai/application/aiStudentTargetAuthorization.ts`: authorization جيد ومبني على الدور/المدرسة/التكليف.
- `server/src/middleware/aiStudentTargetGuard.ts`: scope guard للعمليات التي تستهدف طالبًا.
- `server/src/models/AiInteraction.ts`: سجل التفاعلات.
- `server/src/models/AiQuestionAssistCache.ts`: cache TTL لمساعد السؤال.
- `PlatformIntegrationSettings` + encryption helpers: تخزين الأسرار المشفر الحالي.

### Endpoints الحالية
- `GET /ai/status`
- `GET /ai/readiness`
- `GET /ai/interactions`
- `POST /ai/providers/test`
- `POST /ai/chat`
- `POST /ai/question-assistant`
- `POST /ai/admin-assistant`
- `POST /ai/generate-mock-exam`
- `POST /ai/study-plan`
- `POST /ai/learning-path`
- `POST /ai/remediation-plan`
- `POST /ai/question`
- `POST /ai/course-summary`

### ملاحظة معمارية
`generate-mock-exam` الحالي لا يحتاج LLM في جوهره؛ هو اختيار deterministic من Question Bank وفق نتائج/مهارات الطالب. مكانه المنطقي على المدى المتوسط Assessment/Adaptive capability مع إبقاء AI فقط للتسمية/الشرح الاختياري.

---

## 26. نقاط القوة الحالية التي لا نعيد بناءها

- كل provider call من الخادم، لا مفاتيح في الواجهة.
- تشفير الأسرار عند التخزين + masking في الردود والتاريخ.
- Multi-key موجود فعليًا لكل provider.
- Sequential failover بدل parallel fan-out المكلف.
- SSRF guard يمنع provider URLs الخاصة/غير HTTPS.
- Student target authorization قوي.
- Question Tutor explicit-click، لا يعمل عند render.
- Question Tutor لا يرسل الصورة افتراضيًا.
- cache + in-flight dedupe.
- output/prompt bounds.
- fallback داخلي.
- AI لا يكتب scoring/mastery.
- Authoring AI يفتح Draft للمراجعة بدل الحفظ التلقائي.

---

## 27. الفجوات المكتشفة — الأولويات

### P0 — تكلفة/تشغيل
1. `/ai/course-summary` لا يتطلب auth ولا يمر budget/usage ledger موحد؛ يجب تحويله إلى authoring/precompute أو حمايته.
2. `/ai/chat` يسمح guest حاليًا؛ رغم global/sensitive limits يمكن لزائر استنزاف الحصة اليومية المشتركة. نحتاج Guest policy مستقلة أو Auth للـStudent Tutor.
3. `study-plan / learning-path / remediation-plan / question / course-summary` لا تمر كلها حاليًا بنفس budget/recording pipeline.
4. token usage الحقيقي غير مسجل؛ الموجود request counts + chars فقط.
5. local providers: defaults تجعل Ollama/LM Studio يبدوان configured في Production حتى بدون endpoint فعلي. فحص الإنتاج على `main@4aec4bc26529` أكد أن الحالة تعلن الاثنين configured رغم عدم وجود cloud provider key فعال.
6. Generic chat يسمح Base64 image داخل body حتى حد route البالغ 1MB؛ يجب وضع image policy/size validation/compression وفصل Vision capability عن chat العادي.

### P1 — حمل الخادم/قاعدة البيانات
1. `loadRuntimeAiConfig` يقرأ PlatformIntegrationSettings من Mongo في كل AI call؛ نحتاج cache قصير + invalidation بعد حفظ الإعداد.
2. `withinAiBudget` ينفذ global/user/school `countDocuments` لكل طلب؛ يتحول إلى atomic daily counters (Redis عند توفره، Mongo bucket fallback).
3. Question Assistant minute limit أيضًا يعتمد count على interaction log.
4. `/ai/readiness` ينفذ counts متعددة ويمكن cache 30–60 ثانية لأنه Admin dashboard.
5. `/ai/interactions` يعمل counts/aggregates على السجل كله؛ نحتاج date window + daily aggregates.
6. `AiInteraction` ليس له retention TTL حاليًا؛ نحتاج سياسة retention ودaily rollups حتى لا يتضخم Mongo.
7. Circuit breaker وin-flight dedupe process-local؛ عند multi-instance نستخدم Redis/shared state أو نقبل best-effort بوضوح.

### P1 — تنظيم
- اسم `services/geminiService.ts` مضلل؛ لا يتصل Gemini مباشرة بل Backend AI Gateway.
- AI config محشور داخل generic `externalPlatforms`؛ مناسب compatibility لكنه ليس UX نهائيًا.
- `ai.routes.ts` يحمل provider adapters + policy + endpoints + analytics في ملف واحد.
- Admin AI وPlatform Integrations متداخلان وظيفيًا.

### P2 — مستقبل
- Capability-specific routing.
- token/cost metering.
- live voice.
- vision-on-demand.
- predicted score calibration.
- provider/model deprecation watcher.

---

## 28. القرار المعماري النهائي

**AI Domain واحد مستقل داخل الـModular Monolith، وليس Microservice الآن.**

الهيكل المقترح:

```
server/src/modules/ai/
  domain/
    provider.ts
    capability.ts
    quota.ts
    budget.ts
    usage.ts
  application/
    aiGateway.ts
    aiConfigService.ts
    providerRouter.ts
    contextBuilder.ts
    budgetService.ts
    usageMeter.ts
    questionTutor.ts
    studentTutor.ts
    adminCopilot.ts
    authoringAssistant.ts
    voiceTutor.ts
  infrastructure/
    providers/
      gemini.ts
      openaiCompatible.ts
      groq.ts
      qwen.ts
      openrouter.ts
      deepseek.ts
      openai.ts
    config/
    usage/
    cache/
  http/
    aiRoutes.ts
    adminAiRoutes.ts
```

لا ننشئ Process/Server منفصل للـAI في هذه المرحلة.

### لماذا؟
- أقل تكلفة تشغيلية.
- لا network hop إضافي.
- نفس auth/RBAC.
- نفس Mongo/Redis.
- deploy واحد.
- نستطيع استخراج خدمة مستقلة لاحقًا إذا أثبت الحجم الحاجة.

---

## 29. شكل موديول الإدارة

في القائمة الجانبية:
**إدارة الذكاء الاصطناعي**

داخلها تبويبات:
1. **نظرة عامة** — health/free-vs-paid/tokens/cost/errors.
2. **المساعدون** — Student Tutor / Question Tutor / Admin Copilot / Authoring / Voice.
3. **المزودات والمفاتيح** — Accounts/Projects/Quota Pools/Keys.
4. **التوجيه والنماذج** — route profiles.
5. **الحدود والتكلفة** — budgets/spend caps.
6. **الاستخدام** — tokens/cost/cache/fallback per capability/school.
7. **السجل والتنبيهات**.
8. **مختبر الاختبار**.

`Platform Integrations` يبقى مسؤولًا عن Google Login/WhatsApp/Email/Zoom/... ويحتوي فقط رابطًا إلى AI Management، لا يكون مكان الإدارة الأساسي للـAI.

---

## 30. سياسة تقليل الحمل على السيرفر

- ممنوع تشغيل Ollama/LM Studio على Render production الحالي.
- لا inference محلي داخل Node.
- Node يقوم orchestration فقط.
- لا AI call على page render.
- Question Tutor explicit click فقط.
- Course summaries تُولد مرة وتخزن، لا عند كل مشاهدة.
- Browser TTS للشرح النصي الثابت.
- الصور من R2/CDN ولا تمر عبر Node إلا في Vision request مصرح ومحدود.
- config cache.
- usage counters O(1).
- Redis optional للتوسع وليس شرطًا لو single instance؛ Mongo daily buckets fallback.
- interaction logs لها retention + aggregation.
- لا workers دائمة للصوت قبل وجود استخدام فعلي.

---

## 31. تقدير تكلفة القدرات

هذه تقديرات هندسية وليست فاتورة مضمونة؛ تتغير حسب provider/model/context.

### Question Tutor
Typical short call: ~700 input + ~150 output tokens.
- Free tier/cache/trusted explanation: قريب من صفر.
- Paid cheap model: عادة أجزاء من السنت لكل طلب.
- الهدف: معظم hints المتكررة من trusted/cache بلا provider call.

### Student Tutor
Typical: ~1,000–1,500 input + 200–400 output.
- context محدود إلى أضعف مهارات + نتائج قليلة.
- لا full history.

### Admin Copilot
Typical: ~2,000–4,000 input + 400–800 output.
- عدد الطلبات قليل؛ يمكن استخدام model أقوى هنا.

### Authoring
- يستخدم عند الطلب فقط.
- كل ناتج Draft.
- batch authoring لا يمر من synchronous UI route عند التوسع.

### Static Voice
- Browser SpeechSynthesis: $0 provider cost.
- teacher audio stored once on R2.

### Live Voice
- أعلى capability تكلفة.
- يبدأ Push-to-talk/turn-based.
- يمكن فصل STT عن LLM عن TTS لاختيار الأرخص.
- budget بالدقائق إلزامي.

---

