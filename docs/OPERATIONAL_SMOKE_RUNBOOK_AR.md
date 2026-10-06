# Operational Smoke Runbook (AR)

آخر تحديث: 2026-05-24

## الهدف
تشغيل `npm run smoke:operational` بنجاح بطريقة ثابتة، وتجنب فشل التشغيل بسبب نقص متغيرات البيئة.

## المتطلبات
وفّر واحدًا فقط من المسارات التالية:

1. Token مباشر:
- `SMOKE_ADMIN_TOKEN`

2. أو بيانات دخول أدمن:
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

بدائل مقبولة:
- `GOLIVE_ADMIN_EMAIL` + `GOLIVE_ADMIN_PASSWORD`
- `ADMIN_EMAIL` + `ADMIN_PASSWORD`

## ملاحظة مهمة
سكريبت `scripts/smoke-operational-auto.mjs` يعمل الآن Fail-Fast برسالة واضحة إذا لم يجد token أو credentials.

## أوامر Windows PowerShell

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

## أوامر Linux/macOS

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

1. `Missing/Requires admin auth context`
- السبب: لا يوجد token ولا credentials.
- الحل: استخدم أحد المسارات أعلاه.

2. `400 Invalid request payload`
- السبب: قيم ناقصة/فارغة.
- الحل: تأكد من القيم وجرب token مباشر.

3. `401/403`
- السبب: الحساب غير صالح أو لا يملك صلاحية كافية.
- الحل: استخدم حساب Admin صالح للإنتاج.

## التحقق بعد النجاح
- احفظ PASS في تقرير الدفعة.
- شغّل:
  - `npm run smoke:health-readiness`
  - `npm run smoke:frontend:strict`

## Fast Closure Path (next session)
بعد ضبط بيانات الأدمن في البيئة، شغّل بالترتيب:

1. `npm run smoke:operational`
2. `npm run smoke:health-readiness`
3. `npm run smoke:frontend:strict`

إذا كلها PASS:
- اعتبر blocker الخاص بـ BATCH 136 محلول.
- حدّث `PROJECT_STATUS.md` و `CODEX_HANDOFF.md`.
- أعلن الإقفال النهائي للدفعة بمصفوفة PASS/FAIL النهائية.
