# ALMEAA — Course certificate progress source handoff

- Date: 2026-09-06
- Branch: `codex/course-system-next-gap-7`
- PR: `#50`
- Base main: `bd1a6fab4c82ef32ca29b283e3c619090dc98aa1`
- Exact runtime/test commit: `1e9500e239f17b23c50cd21bcb2d5b2ef1a6f4f7`
- Status: `PARTIAL — runtime checks green/in progress; merge blocked by exact-runtime Vercel build-rate-limit`

## الفجوة المثبتة

مسار إصدار الشهادة في الخادم يحسب نسبة الإكمال من `User.completedLessons` داخل دروس الدورة نفسها، ويرفض الإصدار إذا كانت النسبة أقل من 100%. في المقابل كانت `pages/CourseView.tsx` تعرض زر إصدار الشهادة اعتمادًا على `course.progress`، وهي قيمة موجودة على تعريف/كتالوج الدورة وليست مصدر تقدم المستخدم المؤكد. النتيجة التجارية المحتملة: طالب أكمل كل دروس الدورة قد لا يرى زر الشهادة، أو قد يظهر الزر مبكرًا بينما يرفضه الخادم.

## أصغر إصلاح متماسك

- `CourseView` يقرأ `completedLessons` المؤكدة من store.
- يجمع lesson IDs الخاصة بالدورة الحالية فقط ويحسب `courseCompletionProgress` منها.
- زر إصدار الشهادة يظهر فقط عندما تكون الدورة certificate-enabled ونسبة تقدم هذا المستخدم 100%.
- server certificate authorization/completion checks بقيت هي المصدر النهائي ولم تتغير.
- `scripts/smoke-certificate-integrity-contract.mjs` يحرس تطابق مصدر التقدم بين الواجهة والخادم ويمنع الرجوع إلى `course.progress` للـCTA.

## التحقق على exact runtime

على `1e9500e239f17b23c50cd21bcb2d5b2ef1a6f4f7`:

- Platform V3 Phase + Handover Gate `34027469606` — `SUCCESS`.
- Platform V3 Recovery Gate `34027469605` — `SUCCESS`.
- Course Free Enrollment UI Gate `34027469619` — `SUCCESS`.
- Refactor V2 Production Readiness Gate `34027469647` — `SUCCESS`.
- Refactor V2 Safety Gate `34027469642` — still running at handoff capture; completed checks so far include frontend/API typecheck, frontend/API production builds, architecture/module boundaries, security and product contracts.
- Platform V3 Public UI Gate `34027469611` — still running at handoff capture after successful typecheck/build/browser setup.
- Backend Integration / Deep Pre-Merge / Live Role / role preview gates are `SKIPPED` under their existing path/role conditions because this bounded batch changes no backend runtime or RBAC.
- Vercel exact-runtime status — `FAILURE` with explicit Hobby `build-rate-limit`; no build/product regression is evidenced by that status.

## الحدود المحفوظة

لا تغيير في route/API URL أو method، backend RBAC، scoring، payment semantics/provider، persisted schema، data ownership/query responsibility، production data migration/cutover، global tenantId، SaaS multi-tenancy، microservices، buyer-specific fork، أو UI redesign.

`MODULE_CATALOG.md` و`CHANGE_MAP.md` و`DATA_ACCESS_MAP.md` لا تحتاج تحديثًا لأن ملكية module والبيانات ومكان مسؤولية القراءة/الكتابة لم تتغير.

## handoff

1. افحص PR `#50` نفسه أولًا في التشغيل التالي.
2. لا تبدأ فجوة Course System جديدة قبل وصول Safety/Public UI إلى terminal ووجود دليل deployability مقبول وفق عقد Vercel الحالي.
3. إذا أصبحت كل البوابات المطلوبة خضراء على runtime commit النهائي، حدّث هذا handoff إلى `VERIFIED`, اجعل PR Ready، ادمجه بدمج يحفظ التاريخ، تحقق من deployment/health عند توفره، ثم أنشئ فرعًا جديدًا من أحدث `main`.
4. لا تغيّر server certificate semantics أو persisted progress contract أو تجري migration تاريخية ضمن هذا batch.
