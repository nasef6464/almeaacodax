# BATCH_COURSE_RELATED_FILES_ACTIONS_PARITY_2026-05-21_AR.md

## الهدف
إغلاق فجوة سلوك أزرار معاينة/تحميل الملفات داخل تبويب "ملفات الدورة" عندما تأتي الملفات من مسار fallback (`relatedFiles`) بدل المسار الرئيسي.

## سبب المشكلة
كانت أزرار fallback تظهر للمستخدم لكن بدون نفس منطق التنفيذ/الحماية الموجود في الملفات الرئيسية، مما يسبب سلوكًا غير متسق.

## ما تم تنفيذه
في الملف `components/CourseOverview.tsx`:
1. توحيد سلوك زر المعاينة في بطاقات `relatedFiles` ليستخدم `openExternalUrl` بشرط وجود `file.url`.
2. توحيد سلوك زر التحميل في بطاقات `relatedFiles` ليستخدم `triggerFileDownload(file.url, file.title)`.
3. تعطيل أزرار المعاينة/التحميل تلقائيًا عند عدم توفر رابط الملف، لمنع النقرات غير الصالحة.

## نتيجة التشغيل
- أصبح fallback مطابقًا للسلوك الرئيسي: 
  - معاينة تعمل فعليًا عند وجود رابط.
  - تحميل يعمل فعليًا عند وجود رابط.
  - الأزرار تتعطل بوضوح عند غياب الرابط.

## الفحوص
- `npm run typecheck` PASS
- `npm run build` PASS
- `npm run smoke:frontend:strict` PASS
- `npm run smoke:course-visibility` PASS

## حالة الدفعة
`Fully closed`.
