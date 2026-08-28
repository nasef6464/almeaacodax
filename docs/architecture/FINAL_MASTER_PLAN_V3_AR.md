# ALMEAA — Final Master Plan V3

هذه الوثيقة هي ملخص التسليم التنفيذي الموحد. مصدر الكود هو Git HEAD الحالي، وليست ZIP أو محادثة قديمة.

## القرار التجاري والمعماري

ALMEAA هي White-label Educational Source Platform بنشر مستقل لكل Customer/Buyer. النسخة الواحدة قد تحتوي عددًا كبيرًا من المدارس. لكل مشتري Deployment وDatabase وHosting وDomain وBranding وIntegrations مستقلة. لا Multi-Tenant مركزي ولا `tenantId` شامل بلا قرار Product صريح.

الأسلوب: Modular Monolith مع إبقاء Vite في الجذر وRender API داخل `server/`. لا Microservices مبكرة ولا Big Bang Rewrite.

## المنتج الأساسي

```text
Path → Level/Stage اختياري → Subject → Subject Learning Space
                                      ├─ Courses
                                      ├─ Foundation
                                      ├─ Practice
                                      ├─ Assessments
                                      └─ Library
```

القاعدة: `Definition ≠ Classification ≠ Placement ≠ Assignment ≠ Access ≠ Consumption`.

مسار الطالب:

`Learn → Practice → Assess → Analyze → Intervene → Relearn → Reassess`.

## الأولويات

1. تجربة الطالب: سرعة، وضوح، حفظ واستئناف، نتيجة مفهومة، تحليل مهارات، خطوة تالية.
2. المدارس: classes، students، teachers، supervisors، parents، reports، interventions، imports، scope.
3. Assessment Engine: تعريف، اختيار، توزيع، جلسة، محاولة، تصحيح، نتيجة، تحليلات.
4. قابلية التخصيص: Config وFeature Flags وPolicies وAdapters، دون نسخ Core أو customer conditionals.
5. التوسع: pagination، indexes، queues، realtime، observability، benchmarks.

## مراحل التنفيذ

### Phase 0 — Control Plane

تحديث PROJECT_MAP وMODULE_CATALOG وCHANGE_MAP وDATA_ACCESS_MAP وSCALE_TARGET_MATRIX وMIGRATION_REGISTRY وADRs وCODEX_EXECUTION_STATE. فصل `AUDITED_SOURCE_COMMIT` عن `CURRENT_HEAD` و`LATEST_CONTROL_PLANE_COMMIT`.

### Phase 1 — Runtime/Security/Scale P0

`P0-00` فحص PWA/authenticated API cache، ثم `P0-01` إزالة Mongo polling لكل SSE connection عبر Redis/PubSub، ثم `P0-02` نقل التقارير المجدولة إلى BullMQ مع lock/idempotency/retry، ثم `P0-03` حصر bootstrap والقراءات غير المحدودة، ثم `P0-04` baseline للـqueries/payload/runtime، ثم Phase Gate.

### Phase 2A — Assessment Backend

حدود definition، question-selection، assignment، placement، sessions، attempts، submission، scoring، results، analytics. تبقى Quiz وQuizResult كـcompatibility facades.

### Phase 2B — Builder/Authoring

فصل builder، validation، question selection، sections، preview، publishing عن scoring والتقارير.

### Phase 3 — Runner + Results

Timer، autosave، reconnect، integrity، submission، result summary، review، skills، history، next action.

### Phase 4 — Subject Learning Space Consolidation

فحص `GenericPathPage` و`LearningSection` و`SubjectLearningPage`، اختيار Canonical Runtime، توحيد vocabulary إلى courses/foundation/practice/assessments/library، جعل Admin Subject Workspace Composer، وإبقاء URLs وdeep links.

### Phase 5 — Assessment Data Evolution

Versioning وAssignment وSession وAttempt/Response separation عبر Additive → Adapter → Dual Read/Write → Backfill → Verification → Cutover → Rollback.

### Phase 6 — Schools/Academic Operations

profile، classes، students، teachers، supervisors، parents، memberships، relationships، imports، access، interventions، settings، packages، reports. إثبات أن teacher/supervisor/parent/school يرى نطاقه فقط.

### Phase 7 — Reports & Analytics

فصل Result عن Report، ثم student/class/school/assessment/skill/comparison/exports. Read models فقط بعد قياس.

### Phase 8 — Questions Platform

bank، authoring، types، classification، search، import، review، approval، analytics. إضافة نوع السؤال عبر editor/renderer/validator/scorer contract خفيف.

### Phase 9 — Curriculum/Learning

الفصل بين Curriculum وLearning Content، وتطوير foundation/topics/lessons/library تدريجيًا دون Migration مدمرة.

### Phase 10 — Courses

فصل Course Learning Product عن Package Commerce Product تدريجيًا.

### Phase 11 — App/API/Store Composition

Zustand slices، API groups، Admin Shell، route composition، public feature APIs، وfacades متوافقة.

### Phase 12 — White-label

ProductConfig للهوية والـbranding والـfeatures والـnavigation والـlearningSpace والـproviders.

### Phase 13–17 — Relationships, Media, Search, Certification, Delivery

تقييم arrays، MediaAsset وStorageAdapter، search/query budgets، load certification، backup/restore/deployment/release checklist.

## التخصيص للمدارس والعملاء

كل طلب خاص يصنف إلى: Branding، Feature Flag، School Configuration، Policy، Domain Capability، Provider Adapter، أو Extension نادر موثق. ممنوع `if customerName === ...` وممنوع نسخ صفحات أو قواعد بيانات بسبب طلب منفرد.

## Rails في كل Batch

Security، Testing، Observability، Performance، Data Integrity، Backward Compatibility. لا نعلن 80k سؤال أو 30k مستخدم أو ملايين النتائج إلا بتقرير Load قابل لإعادة التشغيل يحمل `VERIFIED / PARTIAL / NOT PROVEN / BLOCKED`.

## Git والتسليم

لا Refactor طويل على `main` لأنه Production-connected. استخدم فرعًا آمنًا واحدًا موثقًا. كل Batch Commit مستقل وPush بعد نجاح البوابات. Merge إلى main بعد Phase Gate فقط.

## التوقف الإلزامي

نتوقف لقرار المالك فقط عند Migration مدمرة، حذف بيانات، تغيير Scoring/Payment/RBAC، Product behavior غير محسوم، خطر Data Loss، أو فشل أساسي لا يمكن إصلاحه بأمان.

