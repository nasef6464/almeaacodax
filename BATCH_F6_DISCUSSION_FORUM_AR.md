# BATCH_F6_DISCUSSION_FORUM_AR

التاريخ: 2026-05-20
الحالة: Fully closed

## الهدف
إكمال منتدى النقاش داخل الدورة بحيث يدعم:
- عرض النقاشات
- الردود التفصيلية لكل نقاش
- إنشاء ردود جديدة
- تعليم النقاش كمحلول من المدرس/المدير

## ما تم تنفيذه
- Backend:
  - إضافة endpoint جديد:
    - `GET /api/discussions/:threadId/replies`
  - endpoint يجلب ردود النقاش مع أسماء أصحاب الردود ويطبّق نفس صلاحيات الوصول.

- Frontend API:
  - إضافة methods في `services/api.ts`:
    - `getDiscussionReplies(threadId)`
    - `createDiscussionReply(threadId, { body })`
    - `resolveDiscussionThread(threadId)`

- Frontend UI (داخل صفحة الدورة):
  - تحديث `components/CourseOverview.tsx`:
    - زر "عرض الردود" لكل نقاش.
    - عرض الردود التفصيلية داخل النقاش.
    - حقل + زر "إرسال الرد".
    - زر "تعليم كمحلول" للأدوار (admin/teacher/supervisor).
    - شارة "تم الحل" للنقاشات المحلولة.

## الفحوص
- `npm run typecheck` => PASS
- `npm --prefix server run build` => PASS
- `npm run build` => PASS

## مخرجات الإغلاق
- منتدى النقاش أصبح مكتملًا تشغيليًا (سؤال + ردود + حل).
- جاهز للاستخدام داخل تبويب "سؤال وجواب" في صفحة الدورة.
