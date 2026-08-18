# نقطة متابعة Refactor V2 الحالية

هذا الملف مختصر سريع بجانب السجل الكامل `REFACTOR_V2_EXECUTION_LEDGER_AR.md` حتى يستطيع أي مطور أو Agent معرفة آخر نقطة موثقة قبل المتابعة.

## الهدف الثابت

إعادة تنظيم ALMEAA كـ Modular Monolith واضح وقابل للتوسع بدون تغيير سلوك المنتج أو الـURLs أو API contracts أو auth/RBAC أو quiz integrity أو payment/access semantics أو بيانات الإنتاج.

## ما أصبح ثابتًا حتى الآن

- العمل فقط على `refactor/repository-v2-safe`، و`main` غير مدموج معه.
- Architecture Gate يمنع فقد routes/mounts وruntime broken imports وdependency cycles وتجاوز budget المتفق عليه.
- Module Boundary Gate يحمي الوحدات الجديدة وحدود Schools child/parent.
- Quick Gate أثناء الدفعات الصغيرة، وFull Phase Review + Safety Gate عند إغلاق كل دفعة.
- تم فصل import parsing/XLSX، readiness/portfolio، relationships، decision/handover، roster pagination، package/access projections وعدة presentation boundaries من SchoolsManager.
- أصبح نجاح Vercel Preview شرطًا إضافيًا لإغلاق أي دفعة؛ المرجع: `docs/architecture/DEPLOYMENT_STAGE_GATE_AR.md`.

## آخر نتيجة مؤكدة

- Safety Gate run `#277`: **PASS بالكامل** بعد إصلاح عقد relations-import.
- Frontend + API typecheck/build: **PASS**.
- Architecture + module boundaries: **PASS**.
- School management/import/readiness/relationship/workspace/roster/package/access/presentation contracts: **PASS**.
- Performance + routes + runtime + quiz integrity + auth/API security: **PASS**.
- repository audit في هذا التشغيل: `49` frontend routes، `236` backend route entries، `25` router mounts، `0` unresolved runtime imports، `0` dependency cycles، و`82` hotspot فوق 400 سطر مقابل budget `83`.
- `SchoolsManager.tsx` ظهر في آخر import contract عند `4308` أسطر.
- Vercel commit status على آخر checkpoint قبل إضافة بوابة النشر كان `success`، وهو متوافق مع رسالة Vercel التي تقول إن Preview Deployments أصبحت ready.

## ما تم اكتشافه وإصلاحه أخيرًا

عقد `smoke-schools-relations-import-boundary-contract.mjs` كان يبحث عن action قديم باسم `downloadSchoolReport` بينما الـcomponent الحالي يستخدم `downloadRelationsReport`. تم إصلاح العقد ليتحقق من الاسم الفعلي ومن الربط `onClick={downloadRelationsReport}` بدل تمرير failure كاذب أو إضعاف الحماية.

## التغيير الجاري الآن

تمت إضافة `Vercel preview deployment gate` إلى `Refactor V2 Safety Gate`. بعد نجاح فحوص الكود ينتظر GitHub حالة Vercel لنفس commit:

- success -> Preview مثبت.
- failure/error -> المرحلة حمراء.
- timeout -> المرحلة حمراء بدل افتراض أن النشر تم.

هذا يحقق شرط أن كل مرحلة كبيرة يكون لها CI أخضر **وPreview Deployment ناجح** قبل إعلان إغلاقها، مع إبقاء Production و`main` منفصلين حتى Release Candidate آمن.

## الخطوة التالية

1. التحقق من نجاح Safety Gate + Vercel Preview Gate على commit إضافة بوابة النشر.
2. مواصلة تفكيك `SchoolRelationsPanel`/School workspace إلى presentation components صغيرة دون نقل API/store ownership إلى children.
3. إغلاق hotspot المدارس فقط بعد Full Gate + Preview Gate.
4. الانتقال إلى `pages/Reports.tsx` ثم `content.routes.ts` و`quiz.routes.ts` بنفس البروتوكول.

## قاعدة الإغلاق

لا تُغلق أي دفعة إذا كان أي من التالي أحمر: typecheck، frontend/API build، direct logic contract، performance، architecture، module boundaries، routes/runtime، quiz integrity، auth، API security، أو Vercel Preview deployment status.
