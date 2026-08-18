# سجل تنفيذ Refactor V2 — ALMEAA

> هذا الملف هو المرجع التشغيلي المستمر أثناء إعادة الهيكلة.
> الفرع الوحيد لهذه المرحلة: `refactor/repository-v2-safe`.

## الهدف الثابت

تحويل المنصة تدريجيًا إلى **Modular Monolith** واضح الحدود، أسهل في الصيانة والتوسع والعمل بواسطة المطورين والـAgents، مع الحفاظ الكامل على منطق المنتج والعقود التشغيلية الحالية أثناء النقل البنيوي.

### قيود لا يتم كسرها

- لا تغيير في frontend URLs أو API methods/paths أو router mounts بسبب refactor بنيوي.
- لا تغيير في auth/RBAC أو quiz scoring/integrity أو payment/access semantics.
- لا destructive Mongo migration ولا تغيير أسماء environment variables أو جذور Vercel/Render/Docker.
- لا Big Bang rewrite لملف ضخم. كل concern يُستخرج على دفعة صغيرة ثم يُفحص.
- لا circular dependencies ولا unresolved runtime imports.
- لا تخفيف Architecture Budget فقط لتمرير CI.
- أي تحسن في الحدود أو الاختبارات يتحول إلى gate دائم كلما كان ذلك عمليًا.

## ما تم إنجازه قبل دفعة الاستيراد

- Baseline معماري ثابت + repository audit + architecture gate + module boundary gate.
- الوصول إلى `0` runtime dependency cycles و`0` unresolved runtime relative imports.
- فك دورة notifications بدون تغيير API العام.
- فصل عقود وواجهات فرعية من `SchoolsManager` وإزالة child-to-parent imports.
- فصل `dataAdapters.ts` من `SchoolsManager`.
- فصل بنية التصدير والطباعة إلى `SchoolsManager/exportHelpers.ts` مع الحفاظ على escape/safety contract.
- إزالة كود CSV قديم غير قابل للتنفيذ.
- آخر Safety Gate قبل دفعة الاستيراد كان أخضر بالكامل.

## الدفعة الحالية — Schools Import Decomposition

الحالة: **قيد التنفيذ، ولا تُغلق إلا بعد نجاح Phase Review وRefactor V2 Safety Gate.**

الهدف من الدفعة:

1. نقل تطبيع headers العربية/الإنجليزية وتحويل rows إلى عقود الطلاب والعلاقات إلى `importRowParsing.ts`.
2. نقل قراءة CSV/TSV/XLSX واستخدام safe lazy XLSX runtime إلى `importFileReaders.ts`.
3. إضافة اختبار تنفيذي مباشر لمنطق parsing والـaliases والأخطاء والduplicates و10,000-row performance ceiling في `smoke-schools-import-parsing-contract.mjs`.
4. استخدام `tools/refactor/phase-review-schools-import.mjs` لمراجعة typecheck/build والعقود والمنطق والأداء والمعمار والأمن قبل إغلاق الدفعة.
5. تحديث XLSX/performance contracts لتقبل التفويض إلى feature-owned reader بدل إجبار God Component على امتلاك parser مباشرة.
6. إضافة parser/performance checks إلى Refactor V2 Safety Gate كحماية دائمة بعد اكتمال الاستخراج.

### معايير قبول الدفعة

- `SchoolsManager.tsx <= 5100` سطر بعد الاستخراج.
- ملفات parsing الجديدة تحت حدود الملفات الجديدة المسموح بها.
- Arabic/English header behavior محفوظ.
- required-column errors محفوظة.
- duplicate email semantics محفوظة (`trim + case-insensitive`).
- 10k-row pure parsing ينجح داخل safety ceiling الفضفاض لمنع انحدار O(n²).
- XLSX يبقى lazy ويستخدم `readWorkbookFromBuffer` + `registerXlsxRuntime` + safe row conversion.
- typecheck/build frontend + API PASS.
- architecture/module boundaries/school contracts/performance/security PASS.

## ترتيب العمل التالي بعد إغلاق دفعة الاستيراد

1. مواصلة تفكيك `SchoolsManager.tsx` بالبدء في pure/readiness/report view-model helpers ثم UI sections كبيرة، بدون تغيير السلوك.
2. تخفيض `SchoolPackagesPanel.tsx` و`SchoolRelationsPanel.tsx` إلى وحدات presentation/application أصغر مع حدود dependency واضحة.
3. بعد وصول hotspot المدارس إلى نقطة مستقرة، الانتقال إلى `pages/Reports.tsx`.
4. ثم `server/src/routes/content.routes.ts` و`server/src/routes/quiz.routes.ts` بتحويل routes تدريجيًا إلى thin HTTP + application services.
5. بعد تثبيت facades والحدود، يبدأ النقل المنظم إلى `src/features/*` و`server/src/modules/*` مع compatibility exports.

## بروتوكول الإغلاق لأي مرحلة لاحقة

قبل اعتبار أي مرحلة مكتملة:

1. فحص diff وعدم وجود whitespace/merge artifacts.
2. frontend + API typecheck.
3. frontend + API production build.
4. اختبارات منطقية خاصة بالجزء الذي تم نقله، وليس source-text فقط متى أمكن.
5. performance contract ذي صلة.
6. domain smoke contracts.
7. repository audit + architecture gate + module boundary gate.
8. route/runtime/quiz/auth/API security gates.
9. إصلاح أي failure قبل commit، ثم إعادة نفس المراجعة.
10. Safety Gate أخضر على commit النهائي للمرحلة.

## قاعدة الاستمرار

أي Agent يكمل العمل يبدأ من: `AGENTS.md` -> `PROJECT_MAP.md` -> هذا السجل -> آخر Safety Gate، ثم يغيّر concern واحدًا فقط ويحدّث هذا السجل عند إغلاق دفعة كبيرة.
