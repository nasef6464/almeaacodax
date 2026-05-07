# نقطة مرجع كودكس الحالية

آخر تحديث: 2026-05-07

ابدأ من هنا عند فتح المشروع من أي حساب Codex جديد.

## ماذا تفعل أولًا

1. اقرأ هذا الملف.
2. اقرأ `docs/AGENT_HANDOFF_AR.md`.
3. اقرأ `docs/USER_NOTES_BATCH_AR.md` إذا كانت هناك ملاحظات جديدة من المستخدم.
4. شغّل `git status --short --branch`.
5. لا ترجع أي تعديل قبل فهمه.

## حالة التشغيل المحلية

- الواجهة المحلية تعمل على: `http://localhost:3000`
- الـ API المحلي يعمل على: `http://127.0.0.1:4000/api`
- فحص الصحة المحلي أعطى `status=ok` و`database=connected`.
- تم فتح المتصفح الداخلي على الصفحة الرئيسية بنجاح.
- عنوان الصفحة في المتصفح الداخلي: `منصة المئة | قدرات وتحصيلي`.
- الصفحة الرئيسية تظهر وليست شاشة بيضاء.

ملاحظة مهمة:

- عند فتح `http://127.0.0.1:3000` ظهرت تحذيرات API بسبب اختلاف origin/CORS.
- استخدم `http://localhost:3000` للفحص المرئي المحلي لأنه يطابق إعداد `CLIENT_URL`.

## آخر فحوص ناجحة

- `npm run typecheck`
- `npm run build`
- `npm --prefix server run check`
- `npm --prefix server run build`
- `npm run smoke:quiz-access`
- `npm run smoke:mock-exams`
- `npm run smoke:my-quizzes`
- `npm run smoke:reports-role`
- `npm run smoke:saher-skills`
- `npm run smoke:library-support`
- `npm run smoke:results`

## فحص رحلة التعلم

كان `npm run smoke:learning-quiz` يفشل بسبب بيانات إنتاج فيها مرجع سؤال مكسور:

- السؤال المفقود: `q_1777887544584_copy`
- موجود كمرجع داخل اختبارات منسوخة قديمة، لكنه غير موجود في `/api/quizzes/questions`.

الاختبارات المتأثرة:

- `quiz_1777887903014_copy`
- `quiz_1777887902510_copy`
- `quiz_1777887901798_copy`
- `quiz_1777887901198_copy`

تم الإصلاح في 2026-05-07:

- تم حفظ نسخة احتياطية محلية داخل `backups/quiz-ref-repair-20260507-135818.json`.
- تم حذف المرجع المكسور فقط من `questionIds` في الاختبارات الأربعة.
- بعد الإصلاح نجح `npm run smoke:learning-quiz` بنتيجة 7/7.

لا تعيد فتح هذا الجزء إلا إذا فشل الحارس مرة أخرى.

## الملفات المفتوحة الآن

- `store/useStore.ts`: إصلاح TypeScript صغير من `unansweredQuestions` إلى `unanswered`.
- `scripts/smoke-quiz-access-contract.mjs`: إضافة حراسة ظهور بطاقات المسار.
- `docs/AGENT_HANDOFF_AR.md`: تسليم كامل للحسابات القادمة.
- `docs/CODEX_REFERENCE_POINT_AR.md`: هذه النقطة المختصرة.
- `docs/USER_NOTES_BATCH_AR.md`: مكان تجميع ملاحظات الدفعة الجديدة قبل التنفيذ.

## نهج التطوير

- نطور دفعات صغيرة.
- كل دفعة لها حارس smoke أو فحص واضح.
- لا نعيد فتح جزء مغلق إلا عند فشل حارسه أو ظهور خلل واضح.
- واجهة الطالب وولي الأمر تبقى بسيطة.
- التفاصيل الكثيفة تبقى في الإدارة.
- لا نكتب أسرار أو مفاتيح داخل `docs` أو أي ملف مرفوع.
