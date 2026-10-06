# إغلاق مسار ربط الذكاء والتكاملات من لوحة الإدارة
التاريخ: 2026-05-20  
الحالة: Fully Closed

## ما تم إغلاقه
- فصل واضح للمسؤولية:
  - `إدارة التكاملات`: تعديل المفاتيح والإعدادات.
  - `إدارة المساعد الذكي`: مراقبة الحالة + اختبار المزود.
- ربط تبادلي مباشر بين التبويبين بأزرار انتقال.
- إضافة قوالب AI جاهزة بنقرة واحدة داخل `المنصات الخارجية`.
- إضافة `تهيئة مجانية تلقائية` لمسار:
  - `gemini -> openrouter -> qwen -> none`
- إضافة تنبيهات تكوين AI + زر `إصلاح تلقائي`.
- إضافة عرض مصدر الإعداد داخل تبويب المساعد:
  - مصدر المزود (`admin/env/fallback`)
  - مصدر ترتيب المزودات (`ai-global` أو `env`)
- حماية واجهة + API من IDs فارغة/مكررة في `externalPlatforms`.
- إضافة smoke contract جديد:
  - `smoke:ai-config-bridge`

## أوامر التحقق النهائية (PASS)
- `npm run smoke:ai-config-bridge`
- `npm run smoke:integrations-runtime`
- `npm run smoke:monitoring`
- `npm run smoke:admin-tabs`
- `npm run smoke:ai-admin-closure`
- `npm run typecheck`
- `npm --prefix server run build`

## قاعدة التشغيل النهائية
1. عدّل مفاتيح AI من `إدارة التكاملات > ربط المنصات الخارجية`.
2. راقب المصدر والحالة من `إدارة المساعد الذكي`.
3. قبل أي تسليم، شغّل:
   - `smoke:ai-config-bridge`
   - `smoke:integrations-runtime`
   - `smoke:monitoring`

## ملاحظات تشغيلية
- `local-fallback` يظل شبكة أمان مجانية دائمة.
- عند نفاد رصيد مزود، التبديل يتم تلقائيًا حسب `ai-global` order.
