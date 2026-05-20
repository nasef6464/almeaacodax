# BATCH_F8_SPACED_REPETITION_AR

التاريخ: 2026-05-20
الحالة: Fully closed

## الهدف
تفعيل SM-2 للمراجعة المتباعدة وربطه بتدفق إجابات الطالب.

## حالة التنفيذ (متحقق)
- موديل المراجعة موجود:
  - `server/src/models/ReviewCard.ts`
- خوارزمية SM-2 موجودة:
  - `server/src/services/spacedRepetition.ts`
  - تشمل `easeFactor`, `interval`, `repetitions`, `nextReviewDate`
- API المراجعة موجود:
  - `GET /api/review/due`
  - `POST /api/review/:cardId/answer`
  - `GET /api/review/stats`
  - في `server/src/routes/review.routes.ts`
- الربط مع تسليم الاختبار موجود:
  - إنشاء/تحديث ReviewCards عند تسليم الاختبار
  - في `server/src/routes/quiz.routes.ts`
- واجهة الطالب موجودة:
  - جلسة مراجعة: `pages/ReviewSession.tsx`
  - بطاقة المراجعة اليومية في الداشبورد: `pages/Dashboard.tsx`

## التحقق
- سبق تمرير build/typecheck في آخر دفعات.
- smoke المرتبط بالرحلة التعليمية والنتائج PASS:
  - `npm run smoke:learning-quiz` => PASS
  - `npm run smoke:results` => PASS

## النتيجة
- SM-2 مفعّل تشغيليًا (Backend + API + UI) ضمن رحلة الطالب.
