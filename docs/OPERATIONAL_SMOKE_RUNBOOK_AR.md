# Operational Smoke Runbook (AR)

آخر تحديث: 2026-05-24

## الهدف
تشغيل `npm run smoke:operational` بنجاح بطريقة ثابتة، وتجنب فشل تسجيل الدخول بسبب متغيرات بيئة ناقصة.

## المتطلبات
واحد فقط من المسارين:

1) **Token مباشر**
- `SMOKE_ADMIN_TOKEN`

أو

2) **بيانات دخول Admin**
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

بدائل مقبولة بدل `SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD`:
- `GOLIVE_ADMIN_EMAIL` + `GOLIVE_ADMIN_PASSWORD`
- `ADMIN_EMAIL` + `ADMIN_PASSWORD`

## ملاحظة مهمة
تم تحصين `scripts/smoke-operational-auto.mjs` ليعمل **fail-fast** برسالة واضحة إذا لا يوجد token ولا credentials.

## أوامر Windows PowerShell (جلسة مؤقتة)

### خيار A: Token
```powershell
$env:SMOKE_ADMIN_TOKEN = "<PUT_TOKEN_HERE>"
npm run smoke:operational
```

### خيار B: Email/Password
```powershell
$env:SMOKE_ADMIN_EMAIL = "<ADMIN_EMAIL>"
$env:SMOKE_ADMIN_PASSWORD = "<ADMIN_PASSWORD>"
npm run smoke:operational
```

## أوامر Linux/macOS (جلسة مؤقتة)

### خيار A: Token
```bash
export SMOKE_ADMIN_TOKEN="<PUT_TOKEN_HERE>"
npm run smoke:operational
```

### خيار B: Email/Password
```bash
export SMOKE_ADMIN_EMAIL="<ADMIN_EMAIL>"
export SMOKE_ADMIN_PASSWORD="<ADMIN_PASSWORD>"
npm run smoke:operational
```

## عند الفشل

### 1) رسالة: Missing/Requires admin auth context
المعنى: لا يوجد token ولا credentials.
الحل: طبق أحد المسارين أعلاه.

### 2) 400 Invalid request payload (email/password)
المعنى: القيم فارغة أو غير صالحة.
الحل:
- تأكد من عدم وجود مسافات/قيم فارغة.
- جرب token مباشر.

### 3) 401/403
المعنى: الحساب غير صحيح أو لا يملك الصلاحية.
الحل:
- استخدم حساب Admin صالح للإنتاج.
- تحقق من البيئة المستهدفة (`SMOKE_API_BASE_URL` إذا كنت تستخدم API غير الافتراضي).

## التحقق بعد النجاح
- حفظ مخرجات PASS في تقرير الدفعة.
- إعادة `npm run smoke:health-readiness`.
- إعادة `npm run smoke:frontend:strict` للتأكد من محاذاة النشر.
