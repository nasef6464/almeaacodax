# Gate 6 — Operations Audit

التاريخ: 2026-09-05

الفرع الحالي: `codex/gate6-operations-media-contract`

## CURRENT STATE

- Questions: `CLOSED / VERIFIED Strong MVP`.
- Curriculum/Learning: `CLOSED / VERIFIED Strong MVP`.
- Courses: `CLOSED / VERIFIED Strong MVP`.
- Operations: `ACTIVE`.
- O-01 Media/storage contract accuracy: `VERIFIED`.

## VERIFIED — الموجود بالفعل ولا يُعاد بناؤه

1. **Health / readiness**
   - `/api/health/live` منفصل عن readiness.
   - `/api/health/ready` يفحص MongoDB وRedis حسب scale features المفعلة.
   - Redis ping bounded timeout موجود.
   - graceful shutdown يغلق HTTP ثم notification queue ثم Redis ثم MongoDB.
   - العقد: `scripts/smoke-production-ops-phase14-contract.mjs`.

2. **Queues / jobs**
   - BullMQ notification queue موجودة وتستخدم Redis.
   - `NOTIFICATION_QUEUE_ENABLED` و`NOTIFICATION_QUEUE_CONCURRENCY` ضمن config الحالي.
   - shutdown يغلق queue resources؛ لا نبني queue system جديد.

3. **Observability**
   - request logging، client error capture، health/readiness، Sentry adapter/readiness موجودة.
   - Sentry الحقيقي يظل dependent على owner-provided DSN؛ هذا configuration proof وليس runtime provider proof.

4. **Backup / restore primitives**
   - app-level learning backup/restore موجود.
   - DB backup/restore scripts موجودة.
   - uploads backup/restore scripts موجودة للـfilesystem deployments.
   - restore path يتضمن guards/confirmation، ويوجد Admin Backup surface.
   - staging restore drill الحقيقي لم يُثبت بعد؛ لا ندعيه من وجود scripts فقط.

5. **Deployment / handover**
   - Phase 19 deployment handover contract موجود ويمر داخل Full Handover Suite.
   - Gate 5 أضاف customer manifest/bootstrap/package boundary؛ لا ننشئ packaging system موازٍ.

6. **O-01 — Media/storage contract accuracy**
   - الحالة: `VERIFIED` لهذه الفجوة المحددة، وليس إغلاق Operations بالكامل.
   - `Lesson.videoSource='upload'` بقي كما هو للتوافق التاريخي؛ لا schema migration ولا API rename.
   - `UnifiedLessonBuilder` يعرض هذه القيمة الآن كـ`رابط مباشر / CDN` ويوضح أن المسار يحفظ URL ولا يرفع binary video إلى الخادم.
   - أمثلة backend runtime env لم تعد تعلن `UPLOAD_DIR` أو `MAX_UPLOAD_SIZE` لأن `server/src/config/env.ts` لا يقرأهما.
   - `UPLOAD_DIR` بقي مدعومًا فقط كـoperations-script override في `scripts/backup-uploads.sh` وrestore tooling؛ لم تُحذف أدوات النسخ الاحتياطي للـfilesystem deployments.
   - Hostinger/Feature Activation docs أصبحت تطلب إثبات تشغيل media URL بدل ادعاء direct upload غير موجود.
   - العقد الدائم: `scripts/smoke-gate6-media-reference-contract.mjs` ومربوط بـPlatform V3 Phase + Handover Gate.
   - runtime/integrated commit: `d85b74630fc00db0cadaee017e8c1902be482832`.
   - CI evidence على نفس الـcommit:
     - Platform V3 Phase + Handover `33963567571`: `SUCCESS`، بما فيه `Gate 6 media reference contract` والـFull Handover suite.
     - Refactor V2 Production Readiness `33963567576`: `SUCCESS`، بما فيه frontend/API typecheck وproduction builds وبوابات architecture/security/readiness.
     - Platform V3 Recovery `33963567567`: `SUCCESS`.
   - لا StorageAdapter/provider جديد، لا secrets، لا binary-upload API، لا RBAC/scoring/payment/data migration، ولا production write.

## REAL GAPS AFTER O-01

### O-02 — Operations audit/status query shape is not scale-certified

`operations.routes.ts` و`operationsAudit.ts` يبنيان تشخيصات عميقة من مجموعات محتوى كاملة، ومنها Questions/Lessons/Courses. هذا مفيد كأداة Admin، لكنه ليس production-scale certification لـ50k سؤال أو 20k درس/فيديو. لا نغير semantics قبل قياس أو تصميم bounded/exact aggregation واضح؛ يُعامل كـ`PARTIAL` حتى يثبت.

لا نضع `.limit()` اعتباطيًا ونحوّل الأرقام الدقيقة إلى sampled بدون تغيير صريح في العقد. التشغيل التالي يفحص أولًا إن كانت O-02 فجوة تشغيل تمنع Strong MVP controlled customer instance أو أنها تحسين scale مؤجل يحتاج benchmark/staging.

### O-03 — External runtime proofs

الآتي لا يمكن اعتباره VERIFIED من CI isolated فقط:
- Sentry live delivery.
- managed Redis on target production/staging deployment unless health proves it.
- restore drill on staging.
- production-like load capacity.
- payment/provider live proofs التي تحتاج owner secrets.

هذه عناصر `NOT PROVEN/BLOCKED-ENV` وليست سببًا لاختراع أرقام أو كتابة أسرار في المستودع.

## NEXT BOUNDED ACTION

1. ابدأ من هذا الـhandoff والـPR الحالي، وافحص O-02 فقط.
2. لا تغير query shape إلا إذا ثبت أن المسار الحالي خطر تشغيل حقيقي ضمن Strong MVP ويمكن الحفاظ على exact semantics بعقد واضح.
3. إذا كانت O-02 تحتاج benchmark/staging مفوضًا قبل قرار صحيح، صنفها `NOT PROVEN/BLOCKED-ENV` بدل تنفيذ sampling أو limits اعتباطية.
4. بعد ذلك اجمع Evidence الموجود للqueues/observability/backup/release بدل إعادة بنائه.
5. production-like load/restore/live-provider proofs تظل `NOT PROVEN/BLOCKED` حتى توجد staging مفوضة وبيئة مناسبة.

## STRONG MVP BOUNDARY

Operations يمكن إغلاقها تجاريًا عندما:
- media strategy المعروضة للمستخدم تطابق ما ينفذه المنتج فعلًا؛ `VERIFIED` عبر O-01.
- health/queue/observability/recovery/release paths لها contracts قابلة للإعادة؛
- أي proof يحتاج بيئة خارجية مصنف بوضوح ولا يتحول إلى claim مزيف؛
- لا توجد فجوة أمن/بيانات/تشغيل مثبتة تمنع تسليم customer instance controlled.

Advanced binary media ingestion/transcoding/CDN automation وproduction-scale certification ليست ضمن الادعاء الحالي إلا بعد provider/staging evidence مستقل.
