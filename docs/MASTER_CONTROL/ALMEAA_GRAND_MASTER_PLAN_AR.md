# ALMEAA — Grand Master Execution & Market Readiness Plan

> المرجع التنفيذي الأعلى بعد توحيد تقرير المراجعة العميقة، Release Hardening، Adaptive 0–11، Student Review، AI Platform، Production Closure، مراجعة الفروع، والخطط السابقة.

## الهدف النهائي

> تنفيذ المتبقي من 2026-10-10 يتبع ملحق «إغلاق المتبقي دون تكرار» في نهاية هذا الملف، مع نقطة الاستئناف أعلى CURRENT_EXECUTION_STATUS_AR.md. الملحق جزء من هذه الخطة، وليس خارطة تنفيذ موازية. حالات WAITING القديمة لا تعيد فتح عمل ثبت دمجه أو إغلاقه لاحقًا.

الوصول إلى نسخة سوقية من ALMEAA تكون:
- مستقرة وقابلة للاستعادة.
- آمنة ومعزولة الصلاحيات.
- سريعة وقليلة الباندويث.
- Modular Monolith واضح.
- رحلة الطالب فيها كاملة E2E.
- Question Bank موثوق بصريًا ومرجعيًا.
- Adaptive/Mastery/Reports صحيحة متعددة المسارات.
- AI موحد منخفض التكلفة مع quota/budget/failover/ledger.
- النشر محكوم ببوابات CI وPR ولا يعتمد على ادعاءات غير مثبتة.
- Market Readiness مبني على Evidence فقط.

## التسلسل الرسمي

### PLAN 0 — Master Control & Safe Delivery
**الحالة: CLOSED ✅**

تم:
- اعتماد هذا المجلد + Issue #269 كمرجع تنفيذي وحيد.
- جرد الفروع القديمة وتصنيف merged / superseded / real gaps.
- تفعيل GitHub Ruleset `Protect main` على default branch.
- PR مطلوب قبل الدمج.
- منع force push والحذف.
- Required checks:
  - `Auth + RBAC + assessments + courses + commerce on isolated Mongo`
  - `Full-stack roles + CRUD + school + quiz flows on isolated Mongo`
  - `Cross-phase + handover regression`
- Vercel Preview Branch Tracking معطل للفروع غير المعيّنة.
- Production branch بقي `main`.
- اختبار Vercel: commit `ab30963e0fd9e45e94bed31bd24499e107e609ad` → **0 deployment records**.
- الخطة القديمة لم تعد تقود التنفيذ؛ تبقى Evidence/Supporting فقط.

**Exit Gate: PASS.**

---

### PLAN 1 — Repository Reconciliation & Missing-Work Closure
**الحالة: CLOSED ✅**

الهدف: ضمان أن `main` يحتوي كل الوظائف المعتمدة، بدون دمج فروع قديمة بالجملة.

المهام:
1. إغلاق فجوة PR #260 فقط:
   - backend يعيد `voiceExplanation`.
   - STT/TTS + QuestionAssistantPanel + session isolation موجودة.
   - المطلوب فقط إظهار `QuestionVoiceExplanationPlayer` داخل `ReviewSession` دون إفساد UI الحالي.
2. مراجعة `chatgpt/r2-v2-audit`:
   - `.github/workflows/col2627-r2-v2-audit.yml`
   - `scripts/audit-col2627-r2-v2.mjs`
   وإعادة التطبيق clean فقط إذا كان متوافقًا مع #264.
3. إثبات أن Adaptive 0–11، Student Review، AI Platform، sidebar، quant image parity، production closure tooling ممثلة على main.
4. لا merge wholesale لأي فرع diverged تاريخي.

تم:
- إعادة تطبيق فجوة PR #260 فقط: teacher voice playback داخل `ReviewSession` مع الحفاظ على Smart Tutor والـmobile quant UI.
- تمديد smoke contract لتثبيت هذا السلوك.
- إعادة تطبيق R2 V2 reachability tooling بشكل يدوي current-compatible، مع فصل reachability عن visual correctness وربطه بقواعد #264.
- توثيق matrix للـPRs والفروع التاريخية وإثبات أن الأعمال المعتمدة ممثلة على main.
- عدم دمج أي stale/diverged branch wholesale.

Evidence:
`docs/MASTER_CONTROL/PLAN_1_RECONCILIATION_EVIDENCE_AR.md`

**Exit Gate: PASS عند دمج PR الخاص بالخطة بعد required CI.**

---

### PLAN 2 — Production Closure / Runtime / DR / Governance
**الحالة: IN PROGRESS ⚠️ — external owner/billing controls remain**

المهام الرئيسية:
- #234 Runtime integrations: Redis / Sentry / R2 / Google OAuth live evidence.
- #235 DR: scheduled backup، off-site، full isolated restore، RPO/RTO.
- #236 Performance/Topology: Render↔Atlas topology + production-like evidence.
- #237 Governance/Network: branch/ruleset أصبح جزءه GitHub مغلقًا؛ يكمل ما بقي من network/allowlists/release operations.
- post-deploy smoke + release identity.
- لا Production cutover بلا rollback/restore proof.

**Current evidence:** `docs/MASTER_CONTROL/PLAN_2_PRODUCTION_CLOSURE_EVIDENCE_AR.md`

**Exit Gate:** #234–#237 مغلقة بالأدلة الحية.

---

### PLAN 3 — Speed, Bandwidth & Runtime Footprint
**الحالة: WAITING / tracked by #268**

المهام:
- route-specific bootstrap.
- on-demand lessons/library/questions.
- قياس request count + transferred bytes + payload.
- p50/p95/p99.
- Zustand persist allowlist.
- static assets WebP/AVIF + budget guard.
- R2/CDN direct delivery وcache policy.
- منع preload غير الضروري.
- regression budgets للواجهة والـAPI.

**Exit Gate:** before/after evidence مع عدم كسر Student/Reports/Adaptive/Review.

---

### PLAN 4 — Data Model & Storage Hardening
**الحالة: WAITING FOR DR BASELINE**

المهام:
- LessonProgress normalization خارج User تدريجيًا.
- تنظيف legacy favorites/reviewLater بعد إثبات ReviewCard كـserver truth.
- QuestionRevision immutable/deduplicated للحفاظ على تاريخ المحاولة.
- QuizResult يخزن attempt facts + revision references بدل تكرار snapshot كامل حيث تسمح الهجرة.
- `id/_id` compatibility migration تدريجيًا.
- document growth budgets.
- additive → dual write → backfill → shadow read → cutover → cleanup.

**Exit Gate:** هجرات قابلة للعكس + parity proof + لا فساد لنتائج تاريخية.

---

### PLAN 5 — Residual Architecture / Modularity
**الحالة: PARTIALLY COMPLETE / WAITING**

لا نعيد:
- content route decomposition.
- store decomposition baseline.
- quiz modules التي تم فصلها.

المتبقي:
- auth.routes decomposition.
- residual quiz.routes decomposition.
- App.tsx route/bootstrap ownership split.
- residual store ownership.
- module-boundary tests.
- منع God files جديدة.
- لا Microservices لمجرد التنظيم.

**Exit Gate:** bounded modules + architecture gates + unchanged contracts.

---

### PLAN 6 — Student Journey & Learning Loop Certification
**الحالة: MOSTLY MERGED / REGRESSION PROGRAM**

الحلقة:
Dashboard → Content/Test → Question → Attempt → Result → Review → Saved/Mistake → Voice/Smart Tutor → Remediation → SkillProgress → Next Best Action.

الثوابت:
- One Question → One Image → One Code.
- Quant image choices: أ/ب/ج/د فقط.
- ReviewCard server truth.
- multi-track / subject scope.
- mobile-first density.
- wrong/review-later flows.
- create practice from mistakes.
- voice tutor in result/review.
- direct SkillProgress evidence.
- AI لا يقرر scoring/mastery/routing وحده.

**Exit Gate:** full current-main E2E بعد تغييرات الخطط السابقة.

---

### PLAN 7 — AI Platform Live Certification
**الحالة: PRE-PRODUCTION ENGINEERING CLOSED / LIVE PROVIDER PENDING**

الموجود:
- unified backend gateway.
- free-first/quota pools.
- budgets/spend caps.
- usage ledger.
- Control Center.
- bounded tutor sessions.
- low-cost browser STT/TTS.
- deterministic readiness foundation.

المتبقي:
- real provider/quota pool.
- per-pool tests.
- 429/failover evidence.
- real token/cost accounting.
- no-AI fallback live.
- Student/Question Tutor live proof.
- Qiyas predicted score يظل gated حتى calibration dataset + MAE/calibration evidence.

**Exit Gate:** LIVE PROVIDER CERTIFIED بلا كشف أسرار أو تكلفة غير منضبطة.

---

### PLAN 8 — Question Bank / Content Integrity
**الحالة: ACTIVE DOMAIN / sequenced here**

الثوابت:
- ALMEAA V1 للقدرات الكمي: 25 main / 95 subskills؛ ممنوع اختراع IDs جديدة.
- PDF/source visual truth قبل ربط الصور.
- A/B/C/D order proof.
- correctOptionIndex يطابق الاختيار المرئي.
- questionCode/source/page provenance.
- R2 content-addressed media.
- لا base64 أو image duplication في Mongo.
- FND26 + COL2627 batches.
- counters والـskills coverage على كامل البنك، لا أول page فقط.

**Exit Gate:** لا سؤال منشور بمصدر بصري غير موثوق أو mapping غير مثبت.

---

### PLAN 9 — Final Global Certification & Market Readiness
**الحالة: BLOCKED BY 1–8**

يشمل:
- typecheck/build.
- security/RBAC/tenant isolation.
- Student/Teacher/Supervisor/Admin/School journeys.
- assessment/payments/entitlements.
- Smart Classroom.
- Reports/Adaptive/Review/Voice/AI.
- DR full restore.
- realistic staged load.
- frontend performance/Core Web Vitals.
- error rate/observability.
- rollback.
- privacy/data lifecycle.
- accessibility/mobile/RTL.

الناتج النهائي فقط:
- NOT READY
- CONTROLLED PILOT READY
- PRODUCTION READY

لا تُستخدم كلمة Production Ready بدون evidence كاملة.

## Foundations مثبتة ولا تُعاد من الصفر

- Release Hardening through Batch 14.
- Adaptive/Mastery 0–11 (#211/#212).
- Student sidebar (#224).
- Question Voice (#248).
- Student Review (#256/#257).
- AI Platform (#258).
- Mobile quant review (#259/#262).
- Voice tutor session isolation (#263).
- production repository closure work (#254/#255/#265/#266).
- Google OAuth frontend routing #267.
- content route modularization.
- store decomposition baseline #185.
- structural audit #186.

## قاعدة الانتقال

بعد كل مهمة:
```
Plan:
Task:
Baseline SHA:
Branch/PR:
Status: DONE | IN PROGRESS | BLOCKED
Changed:
Tests/CI:
Live proof:
Problems found:
Decision:
Remaining:
Next exact action:
```

## ملحق 2026-10-10 — إغلاق المتبقي دون تكرار

طلب المالك: خطة للمشروع بالكامل تقلل إعادة العمل واستهلاك التوكنز. خط الأساس `main@9c2dfd98f120ba43f13ef0b7550cb633f64d42ae`؛ توثيق خطة الطالب #508 مدمج، CI على ae1ce158:14SUCCESS/3conditionalSKIPPED/all3requiredPASS، والنشر المتطابق وفحوص main الأربعة PASS. هذا الملحق ينظم العمل القادم؛ لا يدعي تنفيذ بواباته.

### 1. قاعدة الاستئناف والتصنيف

- ابدأ بنقطة الاستئناف أعلى CURRENT_EXECUTION_STATUS_AR.md، وGit HEAD/status وPR النشط فقط. اقرأ مرجع المهمة الحالية والأجزاء المتأثرة؛ لا تدقيق شامل متكرر ولا قراءة تاريخ المحادثة كله.
- VERIFIED = دليل مطابق للنطاق ومندمج: يُعاد استخدامه. لا إعادة إلا بعطل جديد موثق، أو تغيير يمس نفس المسار، أو بوابة تجميع نهائية تستلزم مرورًا محددًا.
- PARTIAL = تنفيذ موجود وفجوة مثبتة: أصلح الفجوة فقط. NOT_PROVEN = تحقق مفقود: اختبر الموجود أولًا، ولا تعتبره ميزة مفقودة أو تبدأ بناءه من الصفر.
- BLOCKED = اعتماد خارجي محدد؛ سجّل الإجراء المطلوب وانتقل لبند مستقل مسموح دون الادعاء بإغلاق البند. DEFERRED = تحسين خارج إطلاق المدرسة؛ لا توسع المهمة الحالية إليه.
- عند تعارض جدول قديم مع commit/PR/evidence حديثة: سجّل التصحيح مرة واحدة في السجل المختصر؛ لا تعِد فتح الخطة لمجرد عنوان WAITING.

### 2. الأدلة المحفوظة — لا تُعاد من الصفر

| النطاق | الدليل المعتمد لإعادة الاستخدام | الحد الذي لا يغطيه |
|---|---|---|
| التحميل والكاش وpersist والصور | #282 / merge8724cd50، إغلاق #268 بتاريخ2026-09-27؛ قياس 4 مسارات محدود: API 111→96 وbytes 34673→17726 | ليس إجمالي باندويث مدرسة أو قياسًا جديدًا على النسخة الحالية |
| التخزين والتقسيم | PLAN4_DATA_STORAGE_EVIDENCE_2026-09-28.md؛ a5bcd4a1 و6a65d5bd موجودان في تاريخmain | الدمج يثبت التنفيذ؛ لا يفترض إغلاق كل هجرة/حذف legacy أو كل بوابة حية |
| التقويم داخل الحصة | audits/CLASSROOM_WAITING_AND_PREPARED_BATCHES_2026-10-09.md؛ بدء منتظر و3×5 وعودة للانتظار وتقرير محفوظ | واجهة طالب واحد؛ لا اعتماد 20 تابلت |
| حفظ فصل متزامن | audits/SCHOOL_ASSESSMENT_QUALITY_AND_CLASS_LOAD_2026-10-09.md؛24 عميل API / 360 إجابة | ليس24 متصفحًا؛ p95 = 11.339s وليس زمنًا مريحًا معتمدًا؛ bytes لأجسام الطلبات والردود فقط |
| المدرسة والأدوار والتكليفات | audits/SUPERVISOR_DIRECTED_RESULTS_AND_SCHOOL_LINKAGE_2026-10-09.md وTEACHER_DIRECTED_ASSESSMENT_DISCOVERY_2026-10-09.md | نطاقات ثابتة محدودة؛ ليست إدارة جميع السياسات |
| التقارير ومصدر النشاط | audits/STUDENT_PLATFORM_SCHOOL_CONTEXT_REPORTS_2026-10-10.md وSTUDENT_QUESTION_ACTIVITY_PROVENANCE_2026-10-10.md؛#501–505 | تغطية بيانات محملة محدودة؛ لا تدعي كامل التاريخ/المواد |
| خطة الطالب | audits/STUDENT_PLAN_COMPLETION_2026-10-10.md؛#506–508؛6 فحوص منشورة فريدة،29 سيناريو واجهة + ثبات جدول | لا تغطي التدريب التكيفي كله أو جدولًا دائمًا محفوظًا |
| المحاكي المحدود | audits/STUDENT_AND_SCHOOL_SYSTEM_VERIFICATION_2026-10-10.md؛#497 ترتيب/استعادة/قفل/انتهاء | وقت محلي؛ لا وقت سلطوي بالخادم أو مطابقة قياس كاملة |
| المعلم الذكي | audits/TEACHING_BOARD_REAL_PROVIDER_2026-10-08.md + أحدث تحقق مسجل فيCURRENT_EXECUTION_STATUS؛#478 تجربة قسمة 3/3 بمزود حقيقي | ليس اعتماد الصوت والميكروفون على أجهزة فعلية أو كل المواد والتكلفة تحت الضغط |
| المحتوى المغلق | BIO26 مغلق بدليله فيCURRENT_EXECUTION_STATUS | لا إعادة بنك/استيراد؛ باقي البنوك تُراجع بحسب أدلتها فقط |

النتائج القديمة تجارب بلا طلاب حقيقيين وفق المالك؛ ليست بوابة لإصلاح تاريخ الطلاب. لا حذف أو تصفير أو تعديل درجات. لا إنشاء تدريب/بنك/محاكي لفظي جديد دون إعادة تفويضه صراحة. لا إزالة legacy أو تشغيل backfill اعتمادًا على هذه الخطة وحدها.

### 3. دفعات الإغلاق — واحدة نشطة في كل مرة

| ID / الترتيب | حالة البداية وما ننفذه | شرط الإغلاق المحدد | ما نعيد استخدامه / الاعتماد |
|---|---|---|---|
| R01 الاستعادة الآمنة | PARTIAL: استئناف أدوات #235 ومسار النسخ من Render؛ التحقق من التشغيل والجدولة | نسخة كاملة مستقلة، استعادة Mongo والوسائط في بيئة معزولة، تطابق وchecksum، تنبيه فشل، RPO/RTO مقاسان | دليل PLAN 2 وأدوات #235؛ لا شراء خدمة أو نقل قاعدة دون التفويض المناسب |
| R02 حلقة تعلم الطالب | NOT_PROVEN كاملة: أصل تدريبي قائم، حل ومراجعة وإعادة تقييم وتقدم للمستقل والملتحق | خطوات محفوظة، مصدر منصة/مدرسة منفصل، تقدم بعد دخول جديد، إعادة تقييم بلا افتراض تحسن؛ نقص الأصل يسجل كفجوة محتوى | #501–508؛ لا تكرار فحوص الخطة الستة أو إنشاء تدريب لتسهيل الاختبار |
| R03 إدارة الاختبار المدرسي | PARTIAL: فتح وإغلاق بزمن واضح، إعادة انتقائية، تعديل آمن، تحليل اختبارات المدرسة الفردية | قبل/داخل/بعد الإتاحة، مستهدف وغير مستهدف، محاولة إضافية محددة، نتائج سابقة ثابتة، صلاحيات مدير/مشرف/معلم صحيحة | التقارير والأدوار الحالية؛ سجل التفويض والأثر قبل تغيير عقد أو سياسة بيانات |
| R04 المحاكيات والتحليل | PARTIAL: محاكي مسار كامل من أصول معتمدة، تحليل مواد وأقسام ومهارات وفصول وتطور؛ وقت عبر الأجهزة | مجاميع تطابق الإجابات، ترتيب وقفل واضحان، جهاز آخر لا يعيد الوقت؛ سياسة موثقة دون ادعاء مطابقة قياس | #497 وتقارير الأقسام؛ لا إعادة BIO26 لإثبات كل مادة؛ تنبؤ قياس معطل حتى المعايرة |
| R05 الصوت والذكاء | PARTIAL: أجهزة فعلية عربي/إنجليزي، رياضيات/كيمياء/فيزياء؛ حوار ومقاطعة وعودة؛ usage/failover/fallback | شرح يتبع المرجع دون تسريب أثناء التقويم، صوت وميكروفون فعليان، تكلفة وميزانية صحيحتان، فشل آمن في بيئة اختبار | gateway/Gemini والخطط القائمة؛ حدد سقف العينات والاستدعاءات مسبقًا، وأعد استخدام الرد المحفوظ |
| R06 فصل كامل والأداء | NOT_PROVEN أجهزة وباندويث كامل: حدد الحمل وحدود النجاح مسبقًا، شخص سبب p95 ثم قارن قبل/بعد | 20 متصفحًا مستقلًا على الأقل؛ التابلت الفعلي بوابة بشرية منفصلة؛ قياس HTTP وSocket والأصول والوسائط وموارد الخادم وزمن التسليم | 24 عميل API و544 طلبًا دليل سابق؛ لا إعادة بلا سبب؛ إصلاح سبب الزمن/أعطال المتصفح فقط |
| R07 التجاري والمحتوى | NOT_PROVEN شامل: راجع دليل الدفع والاشتراك والبنوك القائمة، ثم أغلق الفجوات فقط | دفع اختباري نجاح/فشل/idempotency وتفعيل صلاحية؛ المال الفعلي بتفويض محدد؛ مصدر ومفتاح وصور ومهارات موثوقة؛ خصوصية ودورة بيانات واضحة | لا افتراض Stripe من فتح صفحته أو بطاقة Render، ولا إعادة BIO26 أو بنك مغلق |
| R08 اعتماد المدرسة والإطلاق | NOT_PROVEN شامل: مدير→مشرف→معلم→طلاب، يجمع R01–07 | البوابات اللازمة PASS، عزل وصلاحيات، RTL وموبايل وإمكانية وصول، مراقبة وتراجع؛ حكم pilot/production بحسب الدليل | مرور تجميعي واحد على الرأس النهائي؛ لا تكرار جميع العينات أو اعتماد مع بوابة مفتوحة |

هذه حالات بدء، وليست وعدًا بأن كل ميزة غير منفذة. أسماء المواد والحقوق وسياسات الأداء تُحدد عند دفعتها من المرجع الموافق عليه. تحسينات تجميلية غير لازمة للإطلاق مؤجلة، وتقسيم الملفات يجري فقط حين يتأثر ملف كبير بهذه الدفعة.

### 4. آلية كل دفعة وتقليل التكلفة

1. تحقق قصير من HEAD/PR/checkpoint والدليل المرتبط، ثم حدد فجوة واحدة/مجموعة مترابطة مع شروط قبول؛ لا فتح نطاقات جديدة أثناءCI.
2. اختبر الموجود بمسار محدود قابل للاستئناف. استعمل معرفات التجربة المحفوظة؛ بعد نجاح كتابة لا تكررها عند إعادة الأداة. سجّل تشخيص الفشل منفصلة واحتسب checks فريدة فقط.
3. أصلح السبب المثبت؛ فحص محلي متناسب، ثم commit/PR مركز وفحوص مطلوبة على الرأس النهائي. لاskip-ci لتجاوز البوابات المطلوبة، ولا معاينة يدوية أو agents أو استدعاءات AI بلا مبرر.
4. أثبت نشر الرأس والرحلة المتأثرة عند وجود تغيير runtime. الدليل السابق يستخدم للمسارات غير المتأثرة؛ لا تنشر إثباتًا مصطنعًا أو تعيد اختبارًا قديمًا لتحديث التقرير.
5. حدّث نفس checkpoint والصف الحالي فقط: baseline/head/PR/status، الدليل، أعداد الفحوص والكتابات والطلبات، العطل/الاعتماد، والخطوة التالية. لا إنشاء خطة جديدة أو سجل متكرر لكل «أكمل».
6. آخر الرد للمستخدم: ما أغلق، ما بقي، التالي في 3–5 أسطر. لا نسب اكتمال تقديرية ولا فحص واسع حتى يتطلبه R08. الغرض تقليل القراءة والإعادات؛ لا وعد رقمي بتوفير توكنز غير مقاس.

قالب نقطة الاستئناف (يستبدل في الموضع نفسه):
```text
Active: Rxx | status | baseline/head/PR
Verified/reuse: evidence links + exact boundary
Gap/blocker: one concrete condition
Last run: unique checks/writes/requests + diagnostics path (no credentials)
Next: one executable step; no repeat list
```

### 5. نقطة البدء المعتمدة

R01: اقرأ آخر حالة تشغيل #235 ومسار النسخ القائم وإعدادات الجدولة بالقراءة فقط؛ حدّد هل ينقص تشغيل/سر/خدمة/دليل قبل أي تعديل. لا تعِد اكتشاف المشروع أو تفتح R02 بناءً على الذاكرة. إذا كان اعتماد خارجي ثابتًا وثقه واعمل في R02 المستقل؛ لا شراء أو هجرة إنتاج أو حذف تلقائي. هذه الجولة تسلم الخطة فقط؛ تشغيل دفعاتها يبدأ عند متابعة التنفيذ.
