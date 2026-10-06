# Course System — Price Integrity Handoff

الحالة: **VERIFIED** ضمن دفعة Course System محدودة بعد إغلاق Product Gates 1–6.

## الفجوة المثبتة

كان عقد إنشاء/تحديث الدورة يقبل أي رقم finite للسعر، بما في ذلك القيم السالبة، بينما رحلة التسجيل تعتبر فقط `price > 0` دورة مدفوعة. بذلك كان من الممكن حفظ سعر سالب ثم التعامل مع الدورة عمليًا كدورة مجانية.

## ما أصبح يعمل

- إنشاء Course يرفض `price < 0` بـ HTTP 400 ولا يحفظ سجلًا غير صالح.
- تحديث Course يرفض `price < 0` بـ HTTP 400 ويحافظ على السعر السابق في Mongo.
- `price = 0` يبقى الدلالة canonical للدورة المجانية، والأسعار الموجبة تبقى ضمن رحلة الشراء الحالية دون تغيير semantics الدفع أو entitlement.
- لا يوجد تغيير RBAC أو route contract أو schema migration أو tenant model أو buyer-specific fork.

## التنفيذ

- Runtime implementation: `621330f04a4a58a2252a3c028466d94ab890a3c6`.
- Runtime acceptance commit: `76b5a36d4858771fd8d9e9d53096e5da527cd7bc`.
- CI-only Vercel contract correction: `80f5aa83d878fbb829b857e0f8108cb17f71ee35`.
- CI-only Backend Integration branch enablement: `dbfd4d5799603819cabb81ccbb4e251a4e7a56c4`.
- المقارنة من runtime acceptance `76b5a36...` إلى CI head `dbfd4d57...` تحتوي فقط `.github/workflows/**`؛ لا توجد runtime files بعد commit القبول.

## دليل CI

على CI head `dbfd4d5799603819cabb81ccbb4e251a4e7a56c4`، الذي يشغّل نفس runtime tree المثبت في `76b5a36...`:

- Platform V3 Backend Integration Gate — **SUCCESS** — run `34011518857`.
- Platform V3 Phase + Handover Gate — **SUCCESS** — run `34011518817`.
- Platform V3 Recovery Gate — **SUCCESS** — run `34011518828`.
- Refactor V2 Production Readiness Gate — **SUCCESS** — run `34011518973`.
- Refactor V2 Safety Gate — **SUCCESS** — run `34011518830`، بما فيه typecheck/build/architecture/security والعقد المصحح لـVercel preview.

## Vercel / سبب تصحيح العقد

- Vercel لديه preview **READY** للـruntime acceptance commit `76b5a36d4858771fd8d9e9d53096e5da527cd7bc` (`dpl_42jy8gFwoou1RBLMLNow6Cg119Xo`).
- Vercel أعاد على CI-only head السابق status `failure` بوصف صريح: `Deployment rate limited — retry in 24 hours.`؛ هذا ليس build أو product regression.
- عقد Safety القديم كان يقبل READY ancestor فقط عندما يكون status `missing`، لكنه يفشل فورًا لأي `failure`، بما فيه build-rate-limit الخارجي.
- التصحيح محدود: أي failure عادي يبقى fail-closed؛ fallback إلى READY ancestor مسموح فقط عندما يثبت وصف Vercel أنه rate limit، وفقط إذا أثبت `git diff` عدم وجود أي deployable changes بعد ذلك ancestor.

## الأثر التجاري

لم يعد من الممكن تكوين Course بسعر تجاري سالب يتحول ضمنيًا إلى وصول مجاني. هذا يحمي سلامة catalog/pricing دون توسيع payment أو entitlement boundaries.

## الخرائط والحدود

لا تعديل على `MODULE_CATALOG.md` أو `CHANGE_MAP.md` أو `DATA_ACCESS_MAP.md`: لم تنتقل ملكية module أو data/query responsibility، ولم تتغير schema أو access boundary.

## مؤجل / مخاطر متبقية

- لا production-data migration أو historical cleanup؛ لا حاجة له ضمن هذه الدفعة ولم يُصرح به.
- Vercel Hobby build-rate-limit عامل تشغيلي خارجي؛ عقد CI الآن يميزه عن product failure دون إخفاء deployable runtime changes.

## التالي

بعد دمج هذه الدفعة إلى `main` والتحقق من deployment/health عند توفره، يبدأ فرع جديد من `main` لفحص **فجوة Course System واحدة فقط** ذات قيمة منتج/تجارة/أمان/تشغيل. لا تعاد Gates 1–6 دون defect مثبت.
