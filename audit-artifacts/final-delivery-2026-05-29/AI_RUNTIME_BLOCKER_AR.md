# ملحق فجوة المساعد الذكي (خارجي) - 2026-05-30

## ملخص الحالة

- حالة المنصة (UI + API bridge + logging): `PASS`
- حالة المزود الذكي الفعلي: `BLOCKED (External Provider)`

## ما تم التحقق منه عمليًا

1. اختبار حي لمسار الطالب:
   - `POST /ai/chat` -> `200`
   - `provider = none`
   - `usedFallback = true`
2. اختبار المزودات مباشرة من الإدارة:
   - `gemini`: فشل `429` (quota exceeded)
   - `openrouter`: فشل `404` (model unavailable)
   - `openai/deepseek/qwen`: غير مفعلة بمفاتيح صالحة
   - `ollama/lmstudio`: غير متاحة runtime في الإنتاج

## إصلاح تم تنفيذه

- تم تعديل معادلة `ai/readiness` في السيرفر لتكون صادقة مع الواقع:
  - قبل: score قد يظهر `100` رغم وجود fallback فعلي.
  - بعد: يتم خصم score عند وجود fallback حديث.
- تم نشر الإصلاح على Render:
  - `serviceId: srv-d7qtcr9o3t8c73cs32sg`
  - `deployId: dep-d8daiu0js32c73fcjv30`
  - الحالة: `live`
- النتيجة بعد النشر:
  - `ai/readiness.score` انخفض من `100` إلى `86`

## المتبقي للإغلاق الكامل

- تفعيل مزود واحد صالح على الأقل (مفتاح صحيح + حصة/موديل متاح).
- بعد التفعيل يعاد اختبار:
  - `POST /ai/chat` من حساب طالب
  - `POST /ai/providers/test` للمزود المختار
  - التأكد أن `usedFallback = false` في آخر تفاعل ناجح.
