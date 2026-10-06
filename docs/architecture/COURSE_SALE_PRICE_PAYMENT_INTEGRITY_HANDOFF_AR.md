# ALMEAA — Course Sale Price Payment Integrity Handoff

## الحالة

- `VERIFIED` كدفعة تجارية محدودة ضمن Course System.
- PR: `#45` — `Course payments: charge the displayed sale price`.
- Runtime commit الموثق: `a19d053226acaf3588dbb536ada2547498d9424b`.
- Runtime behavior: سعر الدورة الحالي `price` هو المبلغ السلطوي لطلب الدفع؛ `originalPrice` يبقى سعر مقارنة/عرض فقط.

## الفجوة التي أغلقت

كانت واجهة الدورة تعرض `price` كسعر البيع الحالي و`originalPrice` كسعر قديم مشطوب، بينما مسار الدفع الموثوق كان يفضل `originalPrice`. لذلك دورة معروضة بـ120 ريال وسعر أصلي 200 ريال كان يمكن أن تنشئ طلب دفع بـ200 ريال.

## الإصلاح المحدود

- `server/src/routes/payment.routes.ts`: الاعتماد على `primaryTarget.price` فقط كمبلغ الدورة السلطوي.
- لا تغيير لمسار API العام أو طريقة الدفع أو RBAC أو الـschema.
- اختبار القبول موجود تحت `.github/scripts/courseSalePricePaymentGate.ts` حتى لا يصبح test harness جزءًا من runtime المنتج.
- Backend Integration يشغل الاختبار على API حقيقي + Mongo معزول، وينشئ دورة `price=120` و`originalPrice=200` ثم يثبت أن `amount` و`originalAmount` في Payment Request يساويان 120 SAR.

## الدليل

على verification head `fbf9e90c037587f56f33910ef37d9d7b843e596d`:

- Platform V3 Phase + Handover Gate `34016745042`: `SUCCESS`.
- Platform V3 Backend Integration Gate `34016745128`: `SUCCESS`، بما في ذلك Course Sale-Price Payment Integrity journey.
- Platform V3 Recovery Gate `34016744932`: `SUCCESS`.
- Refactor V2 Production Readiness Gate `34016744950`: `SUCCESS`.
- Refactor V2 Safety Gate `34016745017`: baseline + Vercel preview gate كلاهما `SUCCESS`.

Vercel:
- `a19d053...` runtime preview: `READY`.
- `c991e7e...` لاحقًا: `READY`.
- عندما أعاد Vercel rate-limit على verification head، Safety قبل الـREADY ancestor فقط بعد إثبات أن الملفات التالية له تقع تحت `.github/**` ولا يوجد deployable runtime diff.

## الحدود

لم تتغير:
- RBAC.
- scoring.
- payment providers أو public payment routes.
- persisted schema.
- data ownership.
- tenancy.
- production data.

## التالي

الدفعة التالية داخل Course System هي فجوة مستقلة في `CourseView`: الدورة المجانية لا تعني entitlement تلقائيًا. يجب إبقاء public preview مفتوحًا، لكن المحتوى `enrolled` لا يفتح إلا بعد canonical free enrollment مؤكد من الخادم.
