# Gate 6 — Operations Audit

التاريخ: 2026-09-05

الفرع: `codex/gate6-questions-curriculum-operations`

## CURRENT STATE

- Questions: `CLOSED / VERIFIED Strong MVP`.
- Curriculum/Learning: `CLOSED / VERIFIED Strong MVP`.
- Courses: `CLOSED / VERIFIED Strong MVP`.
- Operations: `ACTIVE`.

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

## REAL GAPS

### O-01 — Media/storage contract is ambiguous

`Lesson.videoSource` يحتفظ legacy value باسم `upload`، بينما الـLesson Builder الفعلي يحفظ `videoUrl` ولا توجد binary-media route أو `StorageAdapter` runtime مثبت في الخادم. يوجد `UPLOAD_DIR`/`MAX_UPLOAD_SIZE` في بعض deployment docs/examples، لكن `server/src/config/env.ts` لا يملك هذين المتغيرين كـbackend runtime contract.

هذا يخلق خطرين تجاريين:
- UI قد يوحي بوجود direct binary upload غير موجود فعليًا.
- deployment docs قد توحي بوجود upload runtime setting غير موصول بالخادم.

الـStrong-MVP الآمن الحالي يجب أن يكون صريحًا: **المنصة تحفظ مراجع media URLs (direct/CDN/YouTube/Vimeo)؛ binary upload provider ليس مثبتًا بعد**. لا نضيف مزود تخزين أو secret جديد بدون قرار deployment/provider واضح.

### O-02 — Operations audit/status query shape is not scale-certified

`operations.routes.ts` و`operationsAudit.ts` يبنيان تشخيصات عميقة من مجموعات محتوى كاملة، ومنها Questions/Lessons/Courses. هذا مفيد كأداة Admin، لكنه ليس production-scale certification لـ50k سؤال أو 20k درس/فيديو. لا نغير semantics قبل قياس أو تصميم bounded/exact aggregation واضح؛ يُعامل كـ`PARTIAL` حتى يثبت.

### O-03 — External runtime proofs

الآتي لا يمكن اعتباره VERIFIED من CI isolated فقط:
- Sentry live delivery.
- managed Redis on target production/staging deployment unless health proves it.
- restore drill on staging.
- production-like load capacity.
- payment/provider live proofs التي تحتاج owner secrets.

هذه عناصر `NOT PROVEN/BLOCKED-ENV` وليست سببًا لاختراع أرقام أو كتابة أسرار في المستودع.

## MINIMAL EXECUTION PLAN

1. إغلاق O-01 بدون API جديد أو storage provider وهمي:
   - توضيح media reference semantics في الواجهة/التوثيق.
   - عدم إعلان `UPLOAD_DIR/MAX_UPLOAD_SIZE` كـbackend runtime env إذا لم يكن الخادم يقرأهما.
   - إبقاء persisted `videoSource='upload'` للتوافق التاريخي، لكن اعتباره direct/CDN URL في presentation فقط.
   - إضافة Gate 6 media contract يمنع رجوع claim "رفع مباشر" دون implementation.

2. بعد O-01، تقييم O-02 فقط إذا كان تغيير query shape يمكن أن يحافظ على دقة readiness contract. لا نضع `.limit()` اعتباطيًا ونحوّل الأرقام الدقيقة إلى sampled بدون تغيير صريح في العقد.

3. تجميع Evidence الموجود للـqueues/observability/backup/release بدل إعادة بنائه.

4. production-like load/restore/live-provider proofs تظل `NOT PROVEN/BLOCKED` حتى توجد staging مفوضة وبيئة مناسبة.

## STRONG MVP BOUNDARY

Operations يمكن إغلاقها تجاريًا عندما:
- media strategy المعروضة للمستخدم تطابق ما ينفذه المنتج فعلًا؛
- health/queue/observability/recovery/release paths لها contracts قابلة للإعادة؛
- أي proof يحتاج بيئة خارجية مصنف بوضوح ولا يتحول إلى claim مزيف؛
- لا توجد فجوة أمن/بيانات/تشغيل مثبتة تمنع تسليم customer instance controlled.

Advanced binary media ingestion/transcoding/CDN automation وproduction-scale certification ليست ضمن الادعاء الحالي إلا بعد provider/staging evidence مستقل.
