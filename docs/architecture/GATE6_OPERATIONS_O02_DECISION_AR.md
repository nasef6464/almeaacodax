# Gate 6 Operations — O-02 Decision

التاريخ: 2026-09-05

الفرع: `codex/gate6-operations-media-contract`

PR: #31

## القرار

O-02 — Operations audit/status query shape: `NOT PROVEN / BLOCKED-ENV` للسعة الإنتاجية الكبيرة، و`DEFERRED` كتحسين scale. لا توجد حاليًا فجوة تشغيل مثبتة تمنع Strong MVP controlled customer instance، لذلك لا يبرر هذا البند تغيير semantics أو إضافة sampling/limits اعتباطية.

## الدليل الحالي

- `GET /api/operations/status` و`GET /api/operations/audit` كلاهما محميان بـAdmin-only auth/RBAC.
- status يستخدم projections صريحة و`lean()` بدل hydrated documents.
- status وaudit يستخدمان cache لمدة 30 ثانية وsingle-flight لمنع تكرار نفس القراءة العميقة عند الطلبات المتزامنة.
- audit يستخدم projections صريحة للمجموعات المقروءة.
- فحص وجود نص الدرس يتم داخل Mongo aggregation عبر `contentPresent`/`$strLenCP` بدل تحميل حقل lesson content الكامل فقط لمعرفة هل هو فارغ.
- `scripts/smoke-operations-read-memory-contract.mjs` و`scripts/smoke-performance-contract.mjs` يثبتان أجزاء من حدود الذاكرة/cache الحالية.

## ما لم يثبت

لم يُنفذ benchmark أو production-like load test على staging مفوضة بأحجام مثل 50k سؤال أو 20k درس. لذلك لا يوجد claim للسعة أو latency القصوى أو memory ceiling لهذه التشخيصات.

## لماذا لا نغير runtime الآن

إضافة `.limit()` أو sampling ستغيّر الأرقام الدقيقة إلى أرقام جزئية وتكسر عقد أداة Admin بصمت. تحويل التشخيص إلى aggregations bounded/exact يحتاج workload حقيقي وقياسًا قبل اختيار التصميم الصحيح. بدون staging/benchmark مفوض، أي optimization سيكون تخمينًا وليس إصلاحًا مثبتًا.

## الحماية الدائمة

`scripts/smoke-gate6-operations-audit-boundary-contract.mjs` يقفل الحدود التالية:

- status/audit يظلان Admin-only؛
- projections وlean/cache/single-flight الحالية لا تُفقد بلا قصد؛
- lesson content presence لا يعود إلى hydration كامل للنص؛
- وثائق Gate 6 تبقي production-scale certification مصنفة `NOT PROVEN / BLOCKED-ENV` حتى يوجد دليل خارجي مناسب.

## أثر الخرائط

لا ownership أو data-access contract جديد، ولا schema/API/RBAC/scoring/payment mutation. لذلك لا تعديل على `MODULE_CATALOG.md` أو `CHANGE_MAP.md` أو `DATA_ACCESS_MAP.md` في O-02.

## التالي

بعد تثبيت عقد O-02 في CI، افحص فقط evidence إغلاق Operations الموجود للhealth/queues/observability/backup/release. لا تبدأ live restore/provider/load proof بدون بيئة staging مفوضة وowner authorization.
