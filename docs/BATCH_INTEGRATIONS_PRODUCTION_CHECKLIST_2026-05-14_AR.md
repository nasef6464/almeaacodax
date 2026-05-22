# تقرير دفعة: تكاملات التشغيل الإنتاجي (Checklist + Diagnostics)

التاريخ: 2026-05-14  
الحالة: **مقفول نهائيًا (برمجيًا + فحوصات)**  
النطاق: بدون تغيير شكل الموقع العام، تطوير داخل لوحة المدير فقط.

## ماذا أُنجز في الدفعة

1. **API جديد لتشخيص التكاملات**
   - `GET /api/content/platform-integrations/setup-checklist`
   - يرجع:
     - `publicBaseUrl` و `apiBaseUrl`
     - ملخص الجاهزية (`enabled`, `configuredEnabled`, `blockers`)
     - Checklist لكل مزود (Google/Facebook/WhatsApp/Email/Sentry/Redis/Zoom/Meet/Teams/YouTube)
     - مفاتيح ENV المطلوبة + Callback/Webhook URLs الجاهزة

2. **تحسين لوحة إدارة التكاملات**
   - ملف: `dashboards/admin/PlatformIntegrationsManager.tsx`
   - إضافة قسم جديد: **جاهزية الربط الإنتاجي**
   - عرض حالة كل مزود:
     - غير مفعل
     - مفعل ناقص
     - مفعل ومكتمل
   - أزرار نسخ مباشرة لـ Callback/Webhook URLs
   - تحديث مباشر للقائمة من نفس الصفحة

3. **استمرار دعم سجل التغييرات والاسترجاع**
   - محفوظ من الدفعة السابقة:
     - سجل نسخ قبل التحديث
     - استرجاع نسخة سابقة من إعدادات التكاملات

## الملفات التي تغيّرت

- `server/src/routes/content.routes.ts`
- `services/api.ts`
- `dashboards/admin/PlatformIntegrationsManager.tsx`

## الفحوصات المنفذة

- `npm run typecheck` ✅
- `npm --prefix server run build` ✅
- `npm run smoke:frontend` ✅

## مخرجات تشغيلية مهمة

- التحقق الإنتاجي الحالي يثبت أن النسخة المنشورة على Vercel تعمل وتخدم routes الأساسية.
- Checklist الآن يعطي صاحب المنصة قائمة مفاتيح/روابط دقيقة بدل التخمين.

## ملاحظات أمان

- لا يتم طباعة الأسرار في التقارير.
- أي مفاتيح OAuth/Provider تمت مشاركتها سابقًا في المحادثة يجب تدويرها (Rotate) قبل الإنتاج النهائي.
