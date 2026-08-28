# ALMEAA — Master Architecture Plan

## القرار الحاكم

ALMEAA منتج تعليمي **White-label Single-Deployment**: كل عميل يحصل على نسخة مستقلة، وDatabase وHosting وBranding مستقلين. لا نضيف `tenantId` أو Multi-Tenant مشتركًا إلا إذا تغير نموذج العمل بقرار Product صريح.

الأسلوب التنفيذي هو **Modular Monolith** مع الحفاظ على جذور النشر الحالية: Vite في الجذر وRender API داخل `server/`.

## الحالة الحالية — 2026-08-28

- HEAD: `91b4e3ba` على `main` ومرفوع إلى GitHub.
- Fresh audit: 1,066 tracked files، 426 runtime files، 131,543 runtime lines.
- 49 frontend routes، 236 backend route entries، و25 router mounts.
- Runtime unresolved imports: `0`.
- Runtime dependency cycles: `0`.
- Hotspots >=400 lines: `83`؛ الميزانية الحالية `83`، لذلك يمنع إنشاء Hotspot جديد.
- Architecture gate: PASS.
- Scale certification: **NOT PROVEN**؛ لا توجد حتى الآن شهادة 20–30 ألف مستخدم متزامن أو ملايين attempts.

## الهدف التشغيلي

تحمل 80k+ سؤال مع صور، مئات المناهج والدورات، آلاف/عشرات آلاف الفيديوهات، ملايين المحاولات والنتائج، وتقارير الطالب والمدرسة التي تغلق الحلقة:

`Attempt → Scoring → Skill mastery → Weakness recommendation → Targeted content → Progress → Report`

## مبادئ غير قابلة للكسر

1. لا Big Bang rewrite ولا Microservices مبكرة.
2. لا تغيير Database/RBAC/scoring/payment semantics في Structural Refactor.
3. كل Batch مسؤولية واحدة، Commit مستقل، قابل للرجوع.
4. Backend هو مصدر الحقيقة للتصحيح، الوصول، المحاولات، الدفع والصلاحيات.
5. كل Collection نامية تحتاج query shape وprojection وpagination/index قبل اعتمادها.
6. لا نعلن Scale إلا بدليل Benchmark يحمل حالات VERIFIED / PARTIAL / NOT PROVEN / BLOCKED.

## المراحل المرتبة

| المرحلة | الهدف | معيار الخروج |
|---|---|---|
| 0 | Control Plane وFresh Baseline | وثائق الحالة والحدود محدثة، gates خضراء |
| 1 | مخاطر التوسع الحرجة | بث إشعارات event-driven، scheduler موزع، bootstrap scoped، caching آمن |
| 2 | حدود Assessments الخلفية | تعريف/تعيين/جلسة/محاولة/إرسال/تصحيح/نتيجة بعقود واضحة |
| 3 | تجربة الطالب | Runner سريع، حفظ آمن، استئناف، نتيجة مفهومة، مهارات وتوصيات |
| 4 | نمو بيانات الاختبارات | Versioning وAssignment وSession وResponses بإضافة تدريجية وdual-read/write |
| 5 | المدارس | classes، staff، parents، scope، imports، interventions، school workflows |
| 6 | التقارير والتحليلات | student/class/school/skill، read models فقط بعد قياس |
| 7 | بنك الأسئلة | authoring، types، search، import، review، approval، analytics |
| 8 | Curriculum وLearning | taxonomy boundary، lessons، library، study plans، route-scoped loading |
| 9 | Courses | catalog، builder، delivery، progress، assessment linkage |
| 10 | Composition | Zustand slices، API groups، router composition، public feature APIs |
| 11 | White-label | ProductConfig، branding، feature flags، provider adapters |
| 12 | العلاقات والبيانات | تقييم arrays ثم migrations additive عند ثبوت الحاجة |
| 13 | Media | MediaAsset وStorageAdapter وprocessing وthumbnails وvideo metadata |
| 14 | Search وData Scale | cursors، indexes، query budgets، قرار search provider مبني على benchmark |
| 15 | Performance Certification | load/concurrency/DB/queue/realtime benchmarks موثقة |
| 16 | Delivery | install/deploy/customize/backup/restore/release checklist |

## أول دفعة تنفيذ بعد اعتماد الخطة

`P0-01 Notification Fan-out Readiness`: فحص عقد SSE والـclient events، إضافة abstraction لمصدر الأحداث، اختبار عدم التسريب بين المستخدمين، ثم نقل fan-out إلى Redis/PubSub مع fallback مضبوط، دون تغيير URL أو أسماء الأحداث. بعدها `P0-02` للـweekly reports عبر BullMQ scheduler/idempotency/lock، ثم `P0-03` للـbootstrap والقراءات غير المحدودة.

## Definition of Done

فهم واضح للملكية، لا تغيير غير مقصود في السلوك، typecheck وbuild للواجهة والخادم، architecture/module gates، smoke/security/integrity الخاصة بالنطاق، توثيق، Commit، Push، وrollback معروف.

