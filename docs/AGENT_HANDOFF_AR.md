# تسليم العمل للوكيل أو الحساب التالي

آخر تحديث: 2026-05-07

هذا الملف هو نقطة البداية لأي حساب أو وكيل جديد يعمل على المشروع. الهدف منه منع التكرار أو التخريب، واستكمال نفس النهج الذي كان متبعًا: تطوير صغير، فحص واضح، ثم توثيق ورفع.

## قاعدة العمل

- ابدأ دائمًا من ملفات الريبو الحالية، وليس من صور أو مرفقات قديمة.
- لا تعد فتح أجزاء أُغلقت بحارس smoke إلا إذا فشل فحصها أو ظهر خلل مباشر في التجربة.
- حافظ على بساطة واجهة الطالب وولي الأمر، واجعل التفاصيل والتحكم الكثيف داخل الإدارة.
- لا ترجع أي تغييرات موجودة في Git قبل فهمها؛ اعتبرها عملًا قيد التنفيذ.
- قبل أي رفع: شغل فحوص الجزء المستهدف، ثم `npm run build` و`npm --prefix server run build`.
- بعد الرفع: شغل فحص الإنتاج المناسب للتأكد من Vercel/Render/MongoDB Atlas.

## ما أعرفه من حالة الريبو الحالية

- الفرع الحالي: `main`.
- الريموت: `origin` على GitHub repository `nasef6464/almeaacodax`.
- المشروع مبني على:
  - Frontend: Vite + React.
  - Backend: Express + TypeScript داخل `server`.
  - Database: MongoDB Atlas في الإنتاج، مع خيار MongoDB محلي.
  - Deploy: Vercel للواجهة وRender للـ API.
- المستندات النشطة:
  - `docs/ACTIVE_BATCH_CHECKLIST_AR.md`
  - `docs/CURRENT_EXECUTION_PLAN_AR.md`
  - `docs/CURRENT_DEVELOPMENT_STATUS_AR.md`
  - `docs/DEPLOYMENT.md`
  - `docs/OPERATIONAL_QA_FLOW_AR.md`

## الحالة الفنية الأخيرة

الفحوص التي نجحت في هذه الجلسة:

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

فحص رحلة التعلم:

- كان `npm run smoke:learning-quiz` يفشل في بيانات الإنتاج لأن الاختبارات المنسوخة القديمة كانت تحتوي مرجع سؤال غير موجود:
  - `q_1777887544584_copy`
- الاختبارات المتأثرة في API الإنتاجي:
  - `quiz_1777887903014_copy`
  - `quiz_1777887902510_copy`
  - `quiz_1777887901798_copy`
  - `quiz_1777887901198_copy`
- تم حفظ نسخة احتياطية محلية قبل الإصلاح في `backups/quiz-ref-repair-20260507-135818.json`.
- تم حذف المرجع المكسور فقط من `questionIds` في الاختبارات الأربعة عبر API المحلي المتصل بقاعدة `almeaa`.
- بعد الإصلاح نجح `npm run smoke:learning-quiz` بنتيجة 7/7.

## التغيير المفتوح حاليًا

يوجد تعديل غير ملتزم في:

- `scripts/smoke-quiz-access-contract.mjs`
- `store/useStore.ts`
- `docs/AGENT_HANDOFF_AR.md`

محتوى التعديل:

- إضافة حراسة إلى `smoke:quiz-access` تؤكد أن نموذج المسار يدعم إعدادات ظهور بطاقات:
  - المواد.
  - الاختبارات المحاكية.
  - الباقات.
- تؤكد أن المدير يستطيع التحكم في ظهور هذه البطاقات.
- تؤكد أن صفحة المسار للطالب تحترم هذه الإعدادات وتحافظ على ترتيب البطاقات.

الفحص المستهدف نجح:

- `npm run smoke:quiz-access` نجح: 13/13.

تعديل `store/useStore.ts`:

- تم استبدال الحقل غير الموجود `unansweredQuestions` بالحقل الرسمي `unanswered` داخل `normalizeQuizResultForStore`.
- بعد هذا الإصلاح نجح `npm run typecheck`.

## الدفعات المغلقة بحراس

- نتائج الاختبار ومراجعة الحلول: `npm run smoke:results`
- مركز المكتبة وملفات الدعم: `npm run smoke:library-support`
- صلاحيات الاختبارات والباقات: `npm run smoke:quiz-access`
- مركز الاختبارات المحاكية المستقل: `npm run smoke:mock-exams`
- صفحة اختباراتي: `npm run smoke:my-quizzes`
- تقارير الأدوار: `npm run smoke:reports-role`
- ساهر متعدد المهارات: `npm run smoke:saher-skills`

لا تعد تصميم هذه الأجزاء من الصفر. أصلح فقط ما يفشل في الحارس أو ما يظهر كخلل واضح.

## الخطوة التالية المقترحة

1. أعد تشغيل فحوص الإغلاق قبل أي رفع:
   - `npm run typecheck`
   - `npm run build`
   - `npm --prefix server run check`
   - `npm --prefix server run build`
   - `npm run smoke:quiz-access`
   - `npm run smoke:learning-quiz`
2. إذا نجحت، ثبّت تحديث ملفات التسليم في commit صغير جديد أو عدل commit المرجع السابق إذا كان هذا مناسبًا قبل الدفع.
3. بعدها انتقل إلى فحص الإنتاج حسب `README.md` و`docs/DEPLOYMENT.md`:
   - `npm run smoke:frontend`
   - وعند اكتمال Vercel: `npm run smoke:frontend:strict`

## بخصوص الحساب القديم والصلاحيات

لا يمكن للوكيل الجديد قراءة محادثة حساب ChatGPT/Codex القديم تلقائيًا. إن احتجنا سياقًا منه، أفضل شيء أن يضع الحساب القديم ملخصًا داخل هذا الملف أو ملف جديد في `docs`.

لكن لا يلزم الحساب القديم إذا كانت هذه الأشياء متاحة في البيئة الحالية:

- الريبو موجود محليًا ومربوط بـ GitHub.
- إعدادات الإنتاج موثقة في `README.md` و`docs/DEPLOYMENT.md`.
- أسرار Render/MongoDB/Vercel موجودة في منصاتها أو في ملفات env المحلية غير المرفوعة.
- أدوات CLI، إن كانت مطلوبة، مسجلة دخول في الجهاز الحالي.

إذا لم تكن أدوات GitHub/Vercel/Render مسجلة دخول في الحساب الحالي، فالخطوة الصحيحة ليست نسخ أسرار داخل المحادثة، بل تسجيل الدخول محليًا أو استخدام لوحات المنصات.
