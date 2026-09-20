# Platform V3 — Canonical Execution Handoff

آخر تحديث: 2026-09-20

هذه الوثيقة تكمل الوثائق المعمارية والتنفيذية الحالية، وتثبت طريقة العمل المطلوبة لأي Agent يتابع رحلة Platform V3. لا تعيد فتح دفعات مغلقة أو تعيد الفحص من الصفر؛ ابدأ دائمًا من GitHub truth والـ CI evidence الحاليين.

## Baseline الموثق

- `main`: `57bb05d2bb0d13bd11e825e98edcd730450394dd`
- آخر دمج: `Merge Batch 9 authority consolidation`.
- لا توجد PRs مفتوحة عند تثبيت هذا الـhandoff.
- Post Deploy Smoke run `35464815299` وصل إلى نسخة الإنتاج الصحيحة `57bb05d`.
- `smoke:frontend:strict`: 34/34 PASS.
- `smoke:production-hardening`: 5/5 PASS.
- `smoke:operational`: 71/71 PASS.
- البوابة الوحيدة الفاشلة: `smoke:sentry-live-proof`؛ production يعيد HTTP 412: `Sentry is not configured on this environment`.
- Delivery readiness observable حاليًا: score=64, status=blocked. لا تعتبر مجرد نجاح endpoint إغلاقًا؛ عالج أسباب الـblocked في دفعة production readiness المسؤولة.
- Backup readiness: `ready_with_notes`.
- dependency audit الظاهر في CI: root = 4 vulnerabilities (1 low, 1 moderate, 2 high)، server = 20 vulnerabilities (1 low, 19 moderate). لا تستخدم `npm audit fix --force` عشوائيًا.

## دورة العمل الإلزامية لكل Batch/منطقة

ليست المهمة `inspect -> fix` فقط. الدورة المطلوبة هي:

`Inspect -> Diagnose Root Cause -> Remediate -> Restructure/Modularize when justified -> Preserve Compatibility -> Bandwidth/Performance/Security audit -> Targeted tests -> CI evidence -> Update architecture/module maps -> Close batch -> Next batch`.

### قواعد modularization

1. أثناء فحص أي منطقة، راجع تنظيم الملفات والموديولات في نفس الجولة؛ لا تؤجل كل التنظيم إلى sweep أخير.
2. قسّم الملف أو الموديول فقط عند وجود حد مسؤولية حقيقي: routing/controller، business service، repository/data access، shared utility، presentation/state، إلخ. لا تقسّم لمجرد عدد الأسطر.
3. إذا كانت migration غير مكتملة، حافظ على exports/routes/contracts القديمة عبر compatibility layer صغير ومؤقت، وسجل جهة إزالته والـBatch المسؤول.
4. امنع duplicate authority: بعد نقل المسؤولية، يجب أن يكون هناك مصدر سلطة واحد واضح، مع alias/adapter فقط عندما يلزم للتوافق.
5. لا تغيّر سلوكًا مقفولًا بحارس smoke لمجرد تحسين الشكل المعماري. أي refactor يجب أن يحافظ على العقد الحالي وتثبت ذلك الاختبارات.
6. أي hotspot أو coupling أو legacy authority جديد يظهر أثناء العمل يُضاف لخريطة الموديولات/المعمارية ويُنسب للـBatch الصحيح بدل إصلاح عشوائي خارج النطاق.
7. الـfinal architecture sweep مخصص للبقايا فقط، وليس مكانًا لتأجيل modularization الواضح الذي يظهر داخل Batch جارٍ.

## Performance / bandwidth contract

أثناء كل Batch افحص ما يخص منطقته: payload size، over-fetching، duplicated requests، polling، caching، bundle/lazy loading، media delivery، database query shape/index implications، Render CPU/memory/latency/bandwidth عندما تتوفر metrics. لا تعمل optimization تخمينيًا يغير السلوك بلا evidence؛ سجّل baseline ثم التغيير ثم evidence.

## CI / production rules

- لا تضعف test أو smoke gate حتى يصبح أخضر. أصلح السبب الجذري.
- لا تستبدل production proof بفحص mock/local إذا كانت البوابة تطلب live proof.
- بعد أي تغيير كود: targeted checks ثم build/typecheck/server checks المناسبة ثم CI.
- بعد deployment: تحقق أن الإنتاج يقدم commit المتوقع قبل تفسير smoke results.
- أي فشل environment/configuration يبقى blocker حقيقيًا إذا كان جزءًا من production contract؛ لا تحوله إلى optional فقط لتمرير البوابة.

## نقطة الاستكمال الحالية

1. لا تعد Batch 9؛ هو مدمج على `main`.
2. أغلق production observability root cause: Sentry غير مهيأ في البيئة التي يخدمها `/api`، ثم أعد `Post Deploy Smoke` وتأكد من نجاح live proof فعليًا.
3. افحص أسباب Delivery Readiness `blocked` (score 64) وأغلق البنود التشغيلية الحقيقية، مع إبقاء backup notes واضحة.
4. تابع الـremaining batches حسب canonical architecture/execution docs، وفي كل Batch طبق دورة inspect/remediate/modularize أعلاه.
5. نفّذ dependency/security remediation تدريجيًا مع lockfile evidence واختبارات؛ لا force upgrades غير الآمنة.
6. استمر في bandwidth/performance audit باستخدام evidence حقيقي، واربط كل finding بالـBatch/owner المعماري.
7. لا تعلن Final Production Certification إلا بعد إغلاق remaining batches وكل required gates/live proofs باللون الأخضر وعدم وجود blocker موثق.
8. إذا أصبحت الخطة كاملة وكل البوابات المطلوبة Green، توقف عن صنع تغييرات غير لازمة وسجل Final Closure فقط.

## ملاحظة عن الوثائق الأقدم

`docs/AGENT_HANDOFF_AR.md` و`docs/CURRENT_EXECUTION_PLAN_AR.md` يحتويان تاريخًا مهمًا لكن أجزاء منهما ترجع إلى مايو 2026. عند التعارض في حالة التنفيذ الزمنية، استخدم GitHub/CI الحالي ثم هذه الوثيقة كـhandoff للحالة الحالية، مع الرجوع للوثائق المعمارية الأصلية للعقود التي لم تتغير.


## تحديث التنفيذ — Batch 13 / PR #184

- Batch 13 يعمل على الفرع `chatgpt/batch13-measured-performance` ومبني الآن مباشرة فوق `main` بعد دمج PR #183 بنجاح.
- الفحص كشف أن مساري k6 وAutocannon للحمل كانا يسمحان بتصعيد مستويات الحمل داخل تشغيل واحد؛ تم تحويلهما إلى profile صريح مستقل، والافتراضي الآمن `pilot`.
- تم تحديث smoke contract ليحرس عدم التصعيد الضمني ويحافظ على evidence منفصل لكل profile.
- لا يتم تشغيل 500/1000 مستخدم على البنية الحالية لمجرد إنتاج رقم؛ إثبات scale الحي يتطلب Redis/scale-ready أخضر، release identity متزامن، وسعة/metrics مناسبة من Render وAtlas مع queue/realtime/bandwidth evidence.
- تم دمج Batch 12 عبر PR #183 بعد نجاح بوابات الكود exact-head؛ بقي Vercel preview rate-limit عائقًا خارجيًا موثقًا بدون bypass.


## Batch 13 repository-side completion checkpoint

تم إغلاق العمل المستقل الآمن داخل المستودع لـ Batch 13: عزل مستويات الحمل، منع التصعيد الضمني، قياس bytes/cache، قياسات queue/realtime محمية للمدير، وتحويل جمهور حملات الإشعارات إلى keyset pages بحجم 500 بدل تحميل الجمهور الكامل في استعلام واحد. لم يتم تشغيل 500/1000 VU على البنية الحالية.

PR #184 أصبح الآن مستهدفًا إلى `main` مباشرة بعد دمج #183. بوابات GitHub exact-head مطلوبة على الرأس الحالي قبل الدمج؛ Vercel exact-head ما زال محجوبًا حاليًا بحد أكثر من 100 deployments/day، بينما الشهادة الحية الكاملة تحتاج release identity متزامن وRedis scale-ready وسعة/metrics من Render/Atlas/provider. لا يتم bypass لأي gate.
