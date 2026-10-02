# ALMEAA Platform — Backend Performance & Reliability Optimization Blueprint
## وثيقة المهام والتحسينات الموجهة لـ ChatGPT / المهندس المسؤول عن الـ Backend

> **الغرض:** تزويد مهندس الباك إند أو نموذج ذكاء اصطناعي (مثل ChatGPT) بجميع التفاصيل التقنية الدقيقة، وسجلات الأداء الحقيقية، والمسارات البرمجية لتنفيذ تحسينات الأداء والموثوقية التي تم رصدها أثناء الـ UAT الحقيقي للمنصة.

---

### 1. سياق النظام والبيئة التقنية (Architecture Context)
- **البيئة:** Node.js (TypeScript) + Express.
- **قاعدة البيانات:** MongoDB Atlas (Mongoose ODM).
- **التخزين السحابي:** Cloudflare R2 (S3-compatible).
- **المسار الرئيسي لكود الباك إند:** `server/src/`.
- **نظام التوجيه:** Express Routers داخل `server/src/routes/`.

---

### 2. قائمة المشكلات المرصودة بالدلائل والحلول المطلوبة (Optimization Specs)

---

#### المهمة 1: تحسين زمن استجابة التجميع في الحصص الذكية (Classroom Aggregate Latency)
- **الملف المستهدف:** [`server/src/routes/classroom/registerClassroomAggregateRoutes.ts`](file:///c:/ALMEAA%20MAY%20-%20codax/server/src/routes/classroom/registerClassroomAggregateRoutes.ts)
- **المشكلة الحالية بالدليل الحي:**
  في سجلات السيرفر أثناء اختبار الحصة المباشرة:
  ```json
  {"level":"warn","event":"http_request","method":"GET","path":"/api/classroom/sessions/6abff278fe3257264dce0fc6/aggregate","statusCode":200,"durationMs":4858.32}
  ```
  استغرق الطلب **4858 ملي ثانية (حوالي 4.8 ثوانٍ)**! وهذا يتكرر كل 3 إلى 5 ثوانٍ مع كل نبضة استطلاع (Polling) أو تحديث للوحة المعلم والبروجيكتور.
- **السبب الجذري (Root Cause):**
  في كل طلب وارد، يقوم الراوت بتنفيذ 4 إلى 5 استعلامات متتالية لقاعدة البيانات البعيدة:
  1. `ClassroomSessionModel.findById(sessionId)`
  2. `resolveSchoolEntitlement(session.schoolId, "SMART_CLASSROOM")` (قراءة عقد المدرسة)
  3. `ensureTeacherSchoolAccess(...)` (قراءة عضوية المدرسة)
  4. `TeachingAssignmentModel.exists(...)` (فحص جدول إسناد الفصول)
  5. `ClassroomResponseModel.find({ sessionId })` + `ClassroomParticipantModel.find(...)` ثم تجميع في الذاكرة.
- **المطلوب تنفيذه من ChatGPT / المطور:**
  1. **تخزين صلاحية المعلم مؤقتاً (Session Scope In-Memory Cache):**
     - حفظ نتيجة التحقق من صلاحية المعلم للجلسة النشطة لمدة 60 ثانية (أو طوال عمر الجلسة طالما هي `live`).
  2. **التجميع التراكمي المسبق (Incremental Response Aggregation):**
     - عند استلام إجابة جديدة في `POST /api/classroom/sessions/:id/submit`، يتم تحديث ملخص الإحصائيات (Counter) داخل الجلسة أو كائن في الذاكرة مباشرة.
     - الراوت `/aggregate` يعيد الملخص الجاهز مباشرة بدون عمل Full Scan لجميع وثائق الإجابات في كل ثانية.
  3. **الهدف المقاس:** خفض زمن الاستجابة من `4858ms` إلى أقل من `50ms`.

---

#### المهمة 2: تصحيح حالة الانتظار في استطلاع الأسئلة (Fix 404 Polling on Empty Question)
- **الملف المستهدف:** [`server/src/routes/classroom/registerClassroomBatchRoutes.ts`](file:///c:/ALMEAA%20MAY%20-%20codax/server/src/routes/classroom/registerClassroomBatchRoutes.ts) أو مسار `/sessions/:id/current`.
- **المشكلة الحالية بالدليل الحي:**
  في سجلات السيرفر:
  ```json
  {"level":"warn","event":"http_request","method":"GET","path":"/api/classroom/sessions/6abff278fe3257264dce0fc6/current","statusCode":404,"durationMs":1452.69}
  ```
  عندما يكون الطلاب داخل الفصل بانتظار إطلاق السؤال الأول من المعلم، يرسل فرونت إند الطالب طلبات متكررة لجلب السؤال الحالي، فيرد السيرفر بـ `404 Not Found`.
  هذا يسبب:
  - امتلاء سجلات السيرفر بتحذيرات وأخطاء وهمية.
  - إطلاق استثناءات في الـ `catch` بالفرونت إند.
- **المطلوب تنفيذه من ChatGPT / المطور:**
  - تعديل الراوت ليعيد `200 OK` مع كائن ذي دلالة واضحة عندما لا يكون هناك سؤال نشط:
    ```json
    {
      "sessionId": "6abff278fe3257264dce0fc6",
      "state": "waiting",
      "question": null,
      "questions": [],
      "message": "بانتظار المعلم لنشر الدفعة التالية"
    }
    ```
  - إرجاع `404` فقط إذا كانت الجلسة نفسها (`sessionId`) غير موجودة في النظام.

---

#### المهمة 3: كاش البيانات الشبه ثابتة (Taxonomy & Content Bootstrap Caching)
- **الملفات المستهدفة:**
  - `server/src/routes/taxonomy.routes.ts` (أو راوت `/api/taxonomy/bootstrap`)
  - `server/src/routes/content.routes.ts` (أو راوت `/api/content/bootstrap`)
- **المشكلة الحالية بالدليل الحي:**
  في سجلات السيرفر:
  ```json
  {"level":"warn","event":"http_request","method":"GET","path":"/api/content/bootstrap","statusCode":200,"durationMs":2078.37}
  {"level":"warn","event":"http_request","method":"GET","path":"/api/taxonomy/bootstrap","statusCode":200,"durationMs":1310.57}
  ```
  تستغرق هذه البيانات الأساسية من 1.3 إلى 2.1 ثانية في كل مرة يتم فيها فتح المنصة أو تحديث الصفحة، على الرغم من أن شجرة المهارات والمواد لا تتغير كل ثانية!
- **المطلوب تنفيذه من ChatGPT / المطور:**
  1. تطبيق ترويسات التخزين المؤقت (HTTP Cache Headers):
     ```typescript
     res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
     ```
  2. دعم `ETag` قوي: إذا لم يتغير تاريخ آخر تعديل للتصنيفات، يرجع السيرفر `304 Not Modified` فوراً خلال أقل من `10ms`.
  3. حفظ نسخة مجمعة في الذاكرة (Memory Memoization) على السيرفر، ويتم تفريغها (Invalidate) فقط عند قيام الأدمن بتعديل أو إضافة مهارة/مادة جديدة.

---

#### المهمة 4: فهارس قاعدة البيانات المركبة (Compound Database Indexes)
- **الملفات المستهدفة:**
  - `server/src/models/ClassroomResponse.ts`
  - `server/src/models/ClassroomParticipant.ts`
  - `server/src/scripts/ensureSmartClassroomIndexes.ts`
- **المطلوب تنفيذه:**
  - التأكد من وجود الفهارس التالية:
    ```typescript
    ClassroomResponseSchema.index({ sessionId: 1, questionId: 1, studentId: 1 });
    ClassroomResponseSchema.index({ sessionId: 1, isCorrect: 1 });
    ClassroomParticipantSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
    ```
  - تشغيل كود الفهارس تلقائياً عند بدء تشغيل السيرفر أو عبر المهاجرة (Migration).

---

### 3. البرومبت الجاهز للنسخ والإرسال المباشر لـ ChatGPT (Prompt Template)

انسخ النص التالي بالكامل وأعطه لـ ChatGPT:

```text
أنت مهندس Backend خبير في Node.js و Express و MongoDB Mongoose.
لدينا منصة تعليمية كبرى (ALMEAA) ونريد تحسين أداء وموثوقية الـ Backend بناءً على رصد حقيقي لسجلات السيرفر في بيئة التشغيل.

إليك المهام المطلوبة بدقة:

1. تحسين الراوت /api/classroom/sessions/:id/aggregate:
- حالياً يستغرق 4.8 ثوانٍ بسبب الاستعلامات المتكررة في كل طلب Polling (صلاحيات المعلم، العضوية، إسناد الفصل، وتجميع إجابات الطلاب).
- المطلوب: إضافة In-Memory Caching لصلاحيات المعلم للجلسة النشطة لمدة 60 ثانية، واستخدام Incremental Aggregation لإحصائيات الإجابات بدلاً من قراءة وفلترة جميع الإجابات من قاعدة البيانات في كل طلب.

2. تصحيح استجابة /api/classroom/sessions/:id/current:
- حالياً يعيد 404 Not Found عندما لا يكون هناك سؤال نشط، مما يملأ سجلات السيرفر بأخطاء Polling وهمية.
- المطلوب: إرجاع 200 OK مع كائن { state: "waiting", question: null, questions: [] } طالما أن الجلسة موجودة والمعلم لم ينشر أسئلة بعد، وإرجاع 404 فقط إذا كانت الجلسة نفسها غير موجودة.

3. تحسين استجابة /api/taxonomy/bootstrap و /api/content/bootstrap:
- حالياً يستغرقان ما بين 1.3 و 2.1 ثانية لجلب شجرة المهارات والمواد.
- المطلوب: تطبيق In-Memory Caching وترويسات HTTP Cache-Control مع stale-while-revalidate ودعم ETag لإرجاع 304 Not Modified.

رجاء كتابة الأكواد والتعديلات بدقة مع شرح خطوات التطبيق في كود الـ Express و Mongoose.
```
