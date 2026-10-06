# تقرير دفعة: تقوية أسرار التكاملات (Secret Hardening)

التاريخ: 2026-05-14  
الحالة: **مقفول نهائيًا (برمجيًا + اختبارات)**  
النطاق: بدون تغيير تصميم المنصة.

## الهدف
منع كشف مفاتيح التكاملات الحساسة داخل API/الواجهة، ومنع ضياع السر القديم عند الحفظ إذا ترك الحقل فارغًا.

## ما تم تنفيذه

1. **إخفاء القيم السرية في قراءة الإعدادات**
   - Endpoint:
     - `GET /api/content/platform-integrations`
   - أصبح يرجع القيم السرية كحقول فارغة (masked)، ويضيف `providerSecretState` كمؤشر أن السر محفوظ فعليًا.

2. **حفظ السر القديم تلقائيًا عند عدم تغييره**
   - Endpoint:
     - `PATCH /api/content/platform-integrations`
   - إذا كان الحقل السري في الطلب فارغًا، النظام يحتفظ بالقيمة القديمة بدل استبدالها بفارغ.

3. **توضيح UI للمشرف/المدير**
   - في `PlatformIntegrationsManager` يظهر تنبيه واضح:
     - “توجد مفاتيح سرية محفوظة لهذا المزود. اترك الحقل فارغًا إذا لا تريد تغييره.”

## الحقول السرية المحمية

- `appSecret`
- `clientSecret`
- `apiKey`
- `accessToken`
- `botToken`
- `verifyToken`

## الملفات المعدلة

- `server/src/routes/content.routes.ts`
- `dashboards/admin/PlatformIntegrationsManager.tsx`

## الفحوصات

- `npm run typecheck` ✅
- `npm --prefix server run build` ✅
- `npm run smoke:api-phase4` ✅

## نتيجة الدفعة

- أسرار التكاملات لم تعد تُعرض raw في واجهة الإدارة.
- تحديث إعدادات التكاملات أصبح آمنًا من فقدان الأسرار عند الحفظ الجزئي.
