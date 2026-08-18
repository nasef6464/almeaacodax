# بوابة التحقق من النشر لكل مرحلة — Refactor V2

هذا المرجع يحدد متى تُعتبر دفعة Refactor جاهزة فعلًا. الهدف ليس فقط نجاح الكود محليًا أو داخل CI؛ بل إثبات أن Vercel أنشأ Preview Deployment ناجحًا لنفس commit قبل إغلاق المرحلة.

## ما الذي يعنيه إغلاق المرحلة؟

تُغلق المرحلة فقط عندما يتحقق التالي على نفس commit في `refactor/repository-v2-safe`:

1. Frontend typecheck: PASS.
2. API typecheck: PASS.
3. Frontend production build: PASS.
4. API production build: PASS.
5. Architecture Gate: PASS.
6. Module Boundary Gate: PASS.
7. اختبارات المنطق/الأداء الخاصة بالجزء الجاري: PASS.
8. Routes/runtime/quiz integrity/auth/API security: PASS.
9. GitHub commit status باسم `Vercel`: `success`.
10. لا يتم دمج `main` أو نشر Production لمجرد نجاح Preview؛ Production يبقى خطوة مستقلة بعد اكتمال مرحلة كبيرة ومراجعتها.

## بوابة Vercel الآلية

تمت إضافة job باسم:

`Vercel preview deployment gate`

داخل `.github/workflows/refactor-v2-guard.yml`.

بعد نجاح Quality Gate، ينتظر الـjob حالة Vercel لنفس commit لمدة تصل إلى 10 دقائق تقريبًا:

- `success` -> المرحلة اجتازت نشر الـPreview.
- `failure` أو `error` -> المرحلة تفشل ولا تُغلق.
- عدم ظهور حالة Vercel حتى انتهاء المهلة -> المرحلة تفشل بدل افتراض أن النشر تم.

لا تحتاج هذه البوابة إلى Vercel token؛ تستخدم GitHub commit status الذي تنشره Vercel integration.

## الفرق بين Preview وProduction

- كل دفعة على فرع الـRefactor: يجب أن تحصل على **Preview Deployment ناجح**.
- `main`: لا يتغير أثناء إعادة الهيكلة غير المكتملة.
- Production/قاعدة البيانات: لا يتم تغييرهما تلقائيًا مع كل refactor صغير، لأن ذلك سيحوّل كل تعديل تجريبي إلى مخاطرة على الطلاب والمستخدمين.
- عند الوصول إلى Release Candidate سنضيف/نستخدم post-deploy smoke على Production قبل اعتبار الإصدار منشورًا نهائيًا.

## تنبيه أمني

أي PAT أو Vercel/Render token يظهر في محادثة أو سجل غير مخصص للأسرار يُعتبر مكشوفًا ويجب إلغاؤه وتدويره. لا تُحفظ tokens داخل المستودع؛ فقط GitHub/Vercel/Render secret stores عند الحاجة.
