# Customer Instance Packaging

هذا المجلد يعرّف طبقة التغليف الخاصة بنسخ العملاء في ALMEAA بدون تحويل المنتج إلى SaaS متعدد المستأجرين.

## نموذج المنتج

- كل عميل / مشتري = Deployment مستقل.
- لكل Deployment قاعدة بيانات واستضافة ودومين وSecrets مستقلة.
- يمكن أن يحتوي Deployment الواحد على عدة مدارس.
- المدرسة ليست Tenant.
- لا يوجد `tenantId` عالمي.
- لا توجد فروع Core خاصة باسم العميل ولا شروط من نوع `if customerName === ...`.
- التخصيص يتم من خلال Manifest آمن + الإعدادات الموجودة أصلًا في المنصة + Environment Secrets الخاصة بالـDeployment.

## Manifest v1

ملف الـManifest يصف فقط القيم غير السرية التي نحتاجها لتجهيز نسخة عميل:

- `customerKey`
- `productName`
- `domain`
- `branding`
- `navigation`
- `typography`
- `features`
- provider capability flags (`enabled` + `mode` فقط)
- registration copy/links
- SEO
- contact widget

الأمثلة في `examples/` هي إثبات أن نفس الـCore يستطيع إنتاج أكثر من هوية ومنتج بدون fork.

## ما لا يوضع في Manifest

ممنوع وضع أسرار مزودي الخدمات أو مفاتيح الوصول في ملفات العميل. من الحقول المحظورة:

- `clientId`
- `clientSecret`
- `appSecret`
- `apiKey`
- `apiKeys`
- `apiSecret`
- `accessToken`
- `botToken`
- `verifyToken`
- `webhookSecret`

هذه القيم تبقى في Environment / Secret Store الخاص بكل Deployment أو في مسار إدارة التكاملات الآمن الموجود في المنصة.

## التحقق قبل أي كتابة

من جذر المستودع:

```bash
npm --prefix server run verify:product-config
npm --prefix server run plan:customer-instance -- --manifest=../customer-instances/examples/alpha-learning.json
npm --prefix server run bootstrap:customer-instance -- --manifest=../customer-instances/examples/alpha-learning.json
```

آخر أمر يعمل افتراضيًا كـDry Run ولا يحتاج MongoDB أو JWT secrets ولا يكتب أي بيانات.

## الكتابة الفعلية

الكتابة لا تتم إلا عند طلب `--apply` ومع وجود تأكيدين منفصلين على الأقل:

```bash
CUSTOMER_INSTANCE_WRITE_ACK=<customerKey> \
npm --prefix server run bootstrap:customer-instance -- \
  --manifest=../customer-instances/<customer>.json \
  --apply \
  --confirm=<customerKey>
```

وفي Production توجد طبقة تأكيد إضافية عبر:

```text
CUSTOMER_INSTANCE_PRODUCTION_WRITE_ACK=<customerKey>
```

لا تضف هذه القيم بصورة دائمة إلى المستودع.

## قاعدة التحديث والرجوع

الـManifest هو وصف declarative للقيم التي يملكها ProductConfig. لذلك:

1. احتفظ بالـManifest السابق الذي تم اعتماده للـDeployment.
2. شغّل Dry Run للنسخة الجديدة.
3. طبّق النسخة الجديدة فقط على Deployment العميل المقصود.
4. تحقق من `/api/product-config` ومن الصفحة العامة وتسجيل الدخول قبل إكمال التسليم.
5. عند الحاجة للرجوع، أعد تطبيق الـManifest السابق بنفس آلية التأكيد.

الـbootstrap يستخدم `$set` للحقول التي يملكها ProductConfig فقط؛ ولا يمسح أسرار providers الموجودة في قاعدة البيانات.

## حدود Gate 5

هذه الطبقة لا تنقل Ownership للمدارس ولا تغيّر RBAC أو Assessment أو Payments أو Learning logic. هدفها إعطاء نسخة مستقلة قابلة للبيع والتخصيص فوق نفس الـCore المعياري.
