# ALMEAA — Course lesson progress persistence handoff

- Date: 2026-09-06
- Branch: `codex/course-system-next-gap-6`
- PR: `#48`
- Base main: `d9f1ecaae509ba063ae8e11d621afefe09bee653`
- Exact runtime/test commit: `9d891c144107f0d00cbd14f498636defe14ae5ba`
- Merge commit: `0224c91fe1e76a8e3aca255460514183ca2355a8`
- Status: `VERIFIED / MERGED`

## الفجوة المثبتة

`store/slices/learningProgressSlice.ts` كان يضيف الدرس مباشرة إلى `completedLessons` ثم يرسل `updateMyPreferences` ويكتفي بتسجيل أي فشل في console. واجهات Course وDashboard وPlan وLearning Space تعتمد على `completedLessons` لعرض التقدم، لذلك كان من الممكن إظهار إنجاز غير محفوظ فعليًا ثم فقدانه بعد refresh.

## أصغر إصلاح متماسك

- جلسات المستخدم المتزامنة لا تضيف إكمال الدرس محليًا قبل نجاح `updateMyPreferences`.
- النقرات المكررة على نفس الدرس أثناء الحفظ تُمنع عبر pending set محدود.
- تحديثات إكمال الدروس تُسلسل عبر queue واحدة حتى تبني كل كتابة على أحدث `completedLessons` مؤكدة بدل سباق كتابات arrays كاملة.
- المهمة المؤجلة تتحقق من بقاء نفس المستخدم قبل إرسال/عكس الحالة حتى لا ينتقل تقدم درس بين جلستين مختلفتين.
- جلسات dev/local غير المتزامنة تحتفظ بالسلوك المحلي الفوري الحالي.
- `scripts/smoke-batch100d-admin-course-flow.mjs` يثبت عقد fail-closed الجديد بجانب عقود Course الحالية.

## التحقق على exact runtime

- Platform V3 Phase + Handover Gate `34024872807` — `SUCCESS`.
- Platform V3 Recovery Gate `34024872805` — `SUCCESS`.
- Refactor V2 Safety Gate `34024872806` — `SUCCESS`، ويتضمن frontend/API typecheck، production builds، immutable architecture، security/contracts.
- Platform V3 Public UI Gate `34024872780` — `SUCCESS`، ويتضمن frontend typecheck/build وdesktop/mobile public/guarded UI audit.
- Vercel exact-runtime deployment `dpl_BJSkVVRQB5zX4cyTbGxR69QUaBdC` على `9d891c144107f0d00cbd14f498636defe14ae5ba` — `READY`.
- Backend Integration / Deep Pre-Merge / Live Role / role preview workflows تم `SKIPPED` وفق شروطها الحالية لأن الدفعة لا تغيّر backend runtime أو RBAC؛ لم يتم تعديل workflows لإجبار بوابات غير مرتبطة بنيويًا.

## الدمج والنشر

- PR `#48` أصبح Ready ثم دُمج إلى `main` بدمج عادي يحفظ التاريخ عند commit `0224c91fe1e76a8e3aca255460514183ca2355a8`.
- Vercel لم ينشئ production deployment جديدًا للـmerge commit بسبب Hobby `build-rate-limit`، وليس بسبب build أو product regression؛ GitHub Vercel status للـmerge يشير صراحة إلى build-rate-limit.
- آخر production deployment ما زال `READY` على main السابق `d9f1ecaae509ba063ae8e11d621afefe09bee653`.
- production alias `https://almeaacodax.vercel.app/` تم فحصه بعد الدمج وأعاد HTTP `200 OK`.
- لا ندّعي أن merge commit نفسه نُشر production؛ exact runtime preview قبل الدمج هو دليل deployability لهذه الدفعة.

## الحدود المحفوظة

لا تغيير في route/API URL أو method، backend RBAC، scoring، payment semantics/provider، persisted schema، data ownership/query responsibility، production data migration/cutover، global tenantId، SaaS multi-tenancy، microservices، buyer-specific fork، أو UI redesign.

`MODULE_CATALOG.md` و`CHANGE_MAP.md` و`DATA_ACCESS_MAP.md` لا تحتاج تحديثًا لأن ملكية module والبيانات ومكان مسؤولية القراءة/الكتابة لم تتغير.

## handoff للدفعة التالية

1. ابدأ من أحدث `main` بعد هذا التحديث التوثيقي على `codex/course-system-next-gap-7`.
2. أثبت فجوة واحدة فقط في رحلة Courses وفق الترتيب التجاري/التشغيلي.
3. لا تعِد فتح Gates 1–6 بدون defect مثبت مستقل.
4. لا توسع هذه الدفعة إلى تغيير API للتقدم أو migration تاريخية؛ أي تغيير persisted contract يحتاج owner authorization منفصل.
