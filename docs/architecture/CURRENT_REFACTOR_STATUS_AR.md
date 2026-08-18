# نقطة متابعة Refactor V2 الحالية

هذا الملف مختصر سريع بجانب السجل الكامل `REFACTOR_V2_EXECUTION_LEDGER_AR.md` حتى يستطيع أي مطور أو Agent معرفة آخر نقطة موثقة قبل المتابعة.

## الهدف الثابت

إعادة تنظيم ALMEAA كـ Modular Monolith واضح وقابل للتوسع بدون تغيير سلوك المنتج أو الـURLs أو API contracts أو auth/RBAC أو quiz integrity أو payment/access semantics أو بيانات الإنتاج.

## ما أصبح ثابتًا حتى الآن

- العمل فقط على `refactor/repository-v2-safe`، و`main` غير مدموج معه.
- Architecture Gate: يمنع فقد routes/mounts وruntime broken imports وdependency cycles وتجاوز budget المتفق عليه.
- Module Boundary Gate: يحمي الوحدات الجديدة وحدود Schools child/parent.
- Quick Gate أثناء الدفعات الصغيرة، وFull Phase Review + Safety Gate عند إغلاق كل دفعة.
- تم فصل import parsing/XLSX، readiness/portfolio، relationships، decision/handover، roster pagination، package/access projections وعدة presentation boundaries من SchoolsManager.

## آخر فحص قبل هذا checkpoint

Safety Gate وصل بنجاح عبر typecheck للواجهة والـAPI، production build للواجهة والـAPI، architecture/module boundaries، وإجمالي عقود Schools الجديدة حتى `School access codes presentation boundary`.

ظهر failure واحد فقط في `smoke-schools-relations-import-boundary-contract.mjs`: الاختبار كان يبحث عن اسم قديم `downloadSchoolReport` بينما الـcomponent الفعلي يستخدم `downloadRelationsReport` والزر مربوط به بالفعل. تم إصلاح **الاختبار نفسه بدون إضعاف السلوك**: الآن يتحقق من وجود `downloadRelationsReport` ومن الربط الصريح `onClick={downloadRelationsReport}`، مع استمرار منع تسرب action التقرير إلى child الخاص باستيراد العلاقات.

## الخطوة التالية

1. تشغيل Safety Gate كامل بعد إصلاح العقد وعدم الاكتفاء بإعادة الجزء الفاشل فقط.
2. إذا أصبح أخضر: إغلاق دفعة relations-import presentation في السجل الرئيسي.
3. مواصلة تفكيك `SchoolRelationsPanel`/School workspace إلى presentation components صغيرة من دون نقل API/store ownership إلى children.
4. بعد استقرار Schools hotspot، الانتقال إلى `pages/Reports.tsx` ثم `content.routes.ts` و`quiz.routes.ts`.

## قاعدة الإغلاق

لا تُغلق أي دفعة إذا كان أي من التالي أحمر: typecheck، frontend/API build، direct logic contract، performance، architecture، module boundaries، routes/runtime، quiz integrity، auth أو API security.
