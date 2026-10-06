# ALMEAA — شهادة ما قبل الإنتاج لنظام الذكاء الاصطناعي

> التاريخ: 2026-09-25  
> الحالة: **PRE-PRODUCTION CERTIFIED — LIVE PROVIDER CERTIFICATION PENDING**  
> النطاق: الفرع `chatgpt/ai-platform-operating-model`  
> قاعدة الحقيقة: لا تعتبر أي خانة Live Verified إلا بعد دمج نفس الـSHA وتشغيلها على Production بالمفاتيح الفعلية.

## 1. الهدف

هذه الوثيقة لا تكرر خطة التنفيذ. وظيفتها الوحيدة هي الإجابة عن سؤالين:

1. ما الذي ثبت هندسيًا على الفرع المعزول؟
2. ما الذي ما زال يحتاج إثباتًا حيًا بعد الدمج أو بيانات خارجية حقيقية؟

## 2. الحكم الحالي

النظام أصبح **AI Domain واحدًا** داخل الـModular Monolith، ببوابة موحدة، سياسات تكلفة، Quota Pools، مفاتيح متعددة، Usage Ledger، Control Center، Tutor Sessions، Voice/Vision منخفض التكلفة، وReadiness deterministic.

هذا لا يعني أن مزودًا سحابيًا حقيقيًا يعمل في Production الآن؛ مفاتيح المزودات الفعلية لا تدخل في CI ولا تُخزن في المستودع.

## 3. مصفوفة الشهادة

| البند | الإثبات على الفرع | حالة ما قبل الإنتاج | المطلوب Live |
|---|---|---|---|
| بوابة AI واحدة | كل الاستدعاءات تمر عبر Gateway/Adapters | VERIFIED | Smoke بعد الدمج |
| أسرار خارج Frontend | تشفير + masking + server-only runtime | VERIFIED | فحص response حي |
| Multi-key داخل Pool | Adapter يجرب مفاتيح Pool | VERIFIED | اختبار بمفاتيح فعلية |
| 429 ينتقل Pool جديد | Break عند 429 ثم Pool التالي | VERIFIED | إثبات من مزود فعلي |
| Free-first | Free/Trial قبل Unknown/Paid | VERIFIED | مراقبة usage حية |
| Paid kill-switch | `paidAllowed=false` افتراضيًا | VERIFIED | فحص إعداد Production |
| Daily spend cap | Budget يقارن cost rollup بالسقف | VERIFIED | يحتاج pricing hints حقيقية |
| Token ledger | actual usage أو estimated flag | VERIFIED | مقارنة provider usage حي |
| Daily counters | Indexed rollups global/user/school/capability | VERIFIED | مراقبة ضغط حقيقية |
| Retention | detail log TTL + long-term rollup | VERIFIED | تحقق Atlas indexes |
| Question Tutor | cache + bounded context + no image by default | VERIFIED | Journey حي |
| Student Tutor | bounded SkillProgress/results/session memory | VERIFIED | Journey حي |
| Voice V1 | Push-to-talk browser STT + browser TTS | VERIFIED | Browser/mobile matrix |
| Vision V1 | client compression + explicit capability + Gemini only | VERIFIED | Gemini key + image test |
| Vision budget | capability daily cap | VERIFIED | threshold observation |
| Readiness | deterministic Mastery Readiness | VERIFIED | بيانات طالب حقيقية |
| Internal expected performance | evidence-gated range/confidence | VERIFIED | compare with future outcomes |
| Qiyas predicted score | intentionally disabled | GATED | calibration dataset + MAE |
| School/user isolation | auth/scope contracts + existing E2E | VERIFIED | post-deploy smoke |
| No-AI fallback | deterministic fallback paths | VERIFIED | disable providers and smoke |
| Admin observability | Control Center + usage + alerts + per-pool test | VERIFIED | configured provider proof |
| High concurrency | existing isolated read/deep gates | PARTIAL | production-like AI load profile |

## 4. ما لا نسمح للشهادة أن تدعيه

- لا نقول إن Gemini/Qwen/OpenRouter يعمل Live قبل إضافة مفتاح واختباره.
- لا نقول إن أربع Google Accounts تعني أربع حصص إلا إذا كانت Quota Pools مستقلة فعلًا وفق قواعد المزود.
- لا نقول «درجة قياس متوقعة» قبل وجود dataset معايرة وقياس خطأ.
- لا نقول إن الصوت الحي realtime مدفوع جاهز؛ V1 الحالي Browser Push-to-talk لتقليل التكلفة.
- لا نقول إن Vision متعدد المزودات؛ V1 يرسل الصور فقط إلى Gemini adapter المطبق فعليًا.

## 5. بوابة Exact-head المطلوبة

قبل الدمج يجب أن ينجح على **نفس SHA**:
- Frontend typecheck.
- API typecheck.
- Frontend production build.
- API production build.
- Backend Integration.
- Recovery.
- Safety.
- Production Readiness.
- Public UI.
- Deep Pre-Merge E2E.
- `smoke:ai-admin-closure` بما فيه AI phases 1→8.

أي Commit بعد نجاح البوابة يلغي الشهادة ويحتاج Exact-head جديد.

## 6. بوابة ما بعد الدمج

بعد دمج الـSHA المعتمد:
1. تحقق أن Vercel وRender يعملان على SHA المقصود.
2. افتح `/api/ai/status` وتأكد أن local providers لا تظهر جاهزة من defaults.
3. أضف أول Quota Pool حقيقي من AI Control Center، وليس من Frontend code/env مكشوف.
4. اختبر Pool من Test Lab.
5. نفذ Student Tutor text request.
6. نفذ Question Tutor saved/mistake request.
7. اختبر fallback بتعطيل Pool مؤقتًا في بيئة آمنة.
8. تحقق من Token/Cost/Quota Pool في Usage Ledger.
9. إن تم تفعيل paid، ضع pricing hints + hard spend cap أولًا.
10. لا تفعل Qiyas prediction حتى إغلاق بوابة calibration.

## 7. بوابة Qiyas المستقبلية

المنتج الحالي يعرض **تقدير أداء داخلي** فقط.

لتفعيل Qiyas prediction نحتاج:
- نتائج قياس فعلية يضيفها المستخدم أو مصدر مصرح.
- ربطها بزمن ومستوى الطالب وقت القياس.
- فصل train/validation.
- قياس MAE وcalibration error حسب المسار والفئة.
- حد أدنى لحجم العينة.
- Range + confidence، وليس رقمًا وهميًا.
- مراجعة دورية لانحراف النموذج.

حتى يتحقق ذلك يبقى:
`calibratedToQiyas=false` و`qiyasScoreEstimate=null`.

## 8. دليل Exact-head للإغلاق

تم إغلاق بوابة ما قبل الإنتاج على head سابق للتوثيق فقط:
`cdc99722e658910cc84e1897a00c1209776cdc68`

والبوابات المسجلة على هذا الـhead كانت:
- Recovery Gate — Run `36053012592` — SUCCESS
- Phase + Handover Gate — Run `36053012433` — SUCCESS
- Safety Gate — Run `36053012253` — SUCCESS
- Public UI Gate — Run `36053012144` — SUCCESS
- Dependency Audit — Run `36053012297` — SUCCESS
- Production Readiness Gate — Run `36053012191` — SUCCESS
- Backend Integration Gate — Run `36053012139` — SUCCESS
- Deep Pre-Merge E2E Gate — Run `36053012210` — SUCCESS

هذا التحديث توثيقي فقط، ولذلك **يجب أن تعود نفس البوابات Green على الـPR head النهائي بعد هذا التحديث قبل الدمج**. لا يجوز اعتبار رقم الـSHA أعلاه هو SHA الدمج النهائي إذا تغير الرأس.

## 9. نتيجة الإغلاق

الوصف المسموح بعد نجاح Exact-head النهائي:
**PRE-PRODUCTION CERTIFIED**

الوصف غير المسموح بعد:
**LIVE PROVIDER CERTIFIED**

ولا يصبح Live Provider Certified إلا بعد:
- دمج نفس الـhead الأخضر.
- تطابق Vercel/Render مع نسخة الدمج.
- إضافة Quota Pool حقيقي واحد على الأقل من Control Center.
- نجاح Per-Pool Test Lab.
- إثبات Student Tutor وQuestion Tutor وUsage Ledger مع المزود الحقيقي.
- إثبات fallback في بيئة آمنة.
- عدم كشف أي secret في responses/logs.

حتى ذلك الوقت، عدم وجود مفتاح Cloud فعلي **ليس عيبًا في الشهادة الهندسية**؛ بل بوابة تشغيل مقصودة تمنع ادعاء تشغيل مزود لم يتم تزويده بعد.
