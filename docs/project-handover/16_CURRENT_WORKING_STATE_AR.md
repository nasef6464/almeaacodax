# حالة العمل الحالية وتسليم الاستكمال

آخر تحديث: 2026-08-19  
Production branch: `main`  
فرع الاستعادة والتطوير النشط: `develop/platform-v3-recovery`  
Draft PR النشط: `#26 — Platform V3 Recovery & Development`  
Production baseline عند بدء الدورة: `fab4e31f037feeeb178788dd2a79971e4fce2cbc`  
رابط الواجهة الإنتاجية: `https://almeaacodax.vercel.app/`  
رابط API الإنتاجي: `https://almeaacodax-k2ux.onrender.com/api`  
مستودع GitHub: `https://github.com/nasef6464/almeaacodax.git`

هذا الملف هو نقطة البداية لأي Codex أو Antigravity أو مطور جديد. اقرأه قبل لمس الكود.

## القاعدة الأساسية الآن

- `main` هو خط الإنتاج المستقر فقط.
- لا يتم التطوير مباشرة على `main`.
- لا تستخدم `git push <feature-branch>:main`.
- أي إصلاح أو تطوير يمر عبر Branch ثم Pull Request ثم Build/Typecheck/Contracts/Preview المناسب.
- لا دمج إلى `main` قبل موافقة صريحة بعد اكتمال التحقق.
- لا Force Push.
- لا أسرار أو كلمات مرور أو Tokens داخل المستودع أو سجلات CI.
- لا تغييرات مدمرة لقاعدة البيانات أثناء دورة الاستعادة.
- لا تغيّر شكل الموقع أو الخطوط أو الألوان إلا ضمن مهمة UI مقصودة ومع فحص بصري Desktop + Mobile.

## لماذا توجد دورة Platform V3

تم دمج Refactor V2 إلى `main` بعد بوابات Safety/Readiness ناجحة. دورة `Platform V3 Recovery & Development` لا تعيد المشروع للكود القديم؛ هدفها:

1. تأكيد أن كل وظائف المنصة ما زالت تعمل فوق الهيكلة الجديدة.
2. اكتشاف وإصلاح أي Regression حقيقي.
3. تحديث عقود الاختبار القديمة التي ما زالت تشير إلى ملفات أو بنية ما قبل الـrefactor.
4. تشغيل فحص UI عام وفحص حي لكل الأدوار.
5. بعد الاستقرار، بدء تطوير المنتج في Features صغيرة وآمنة.

## حالة الإنتاج المؤكدة عند بدء الدورة

- Frontend Production منشور على Vercel.
- Backend Production يعمل على Render.
- `/api/health` أكد اتصال MongoDB.
- Redis rate-limit وqueue كانا Ready في فحص الإنتاج.
- `/courses` و`/quizzes` كانا متاحين على Production.
- Learning bootstrap أعاد بيانات تعليمية حقيقية من قاعدة البيانات.
- `/api/auth/me` بدون جلسة يعيد `401` كما يجب.
- Admin users API بدون جلسة يعيد `401` كما يجب.
- CSRF endpoint يعمل ويصدر cookie.

## بوابات Platform V3 الحالية

### Platform V3 Recovery Gate
يغطي على الأقل:
- Frontend/API typecheck وproduction builds.
- architecture snapshot + immutable contract + module boundaries.
- Student journey / Mock exams / Quiz integrity / Results.
- Auth / Cookie / CSRF / RBAC / API security / NoSQL sanitizer.
- Schools / Supervisor / Reports / Packages / Payments.
- Content / Course builder / Library / Integrations / Admin tabs.
- Admin data integrity / Question bank / Course linkage.
- Homepage/Admin UX contracts.
- Production readiness / monitoring / database / notifications / Sentry / SEO.

### Platform V3 Public UI Gate
- يبني الفرع نفسه.
- يشغل Chromium.
- يفحص الصفحات العامة والمحروسة على Desktop وMobile.
- يجمع evidence بدل الاعتماد على أن Build فقط يساوي UI سليم.

### Platform V3 Phase + Handover Gate
- يعيد تشغيل العقود التاريخية المهمة من Phase 4 حتى Phase 20.
- يستخدم المراجع الحالية للملفات بعد نقل التقارير إلى `docs/archive_reports/`.
- يمنع أن تصبح ملفات التسليم القديمة مصدر تعليمات خاطئة للمطور التالي.

### Platform V3 Live Role Gate
Workflow يدوي آمن يستخدم GitHub Actions Secrets فقط ويشغل `smoke:role-pages-live` بالحسابات التجريبية للأدوار:
- Student
- Admin
- Parent
- Teacher
- Supervisor

لا تضع بيانات هذه الحسابات في ملفات المستودع.

## إصلاحات Recovery المهمة حتى الآن

- إصلاح مسار اعتماد الدفع اليدوي ليشترط evidence قبل فتح الوصول.
- فصل شراء الدورة المباشر عن استبداله تلقائيًا بباقة.
- حفظ Payment Country Preset للسعودية/مصر عبر Backend بدل تغيير UI محلي فقط.
- تحديث عقود قديمة لتتبع وحدات الـquiz الحالية بدون إضعاف حماية إخفاء الإجابة الصحيحة.
- تحديث عقود التقارير التي انتقلت من root إلى `docs/archive_reports/`.

التفاصيل والـcheckpoints محفوظة في:

`docs/PLATFORM_V3_RECOVERY_PLAN_AR.md`

## رحلة التطوير الآمنة

ابدأ دائمًا من أحدث `main` أو من فرع الاستعادة حسب المهمة:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/<short-feature-name>
```

أثناء دورة Platform V3 الحالية يمكن للمهام المتعلقة بالاستعادة أن تبدأ من:

```bash
git fetch origin
git switch develop/platform-v3-recovery
git pull --ff-only origin develop/platform-v3-recovery
```

بعد التعديل شغّل الحد الأدنى المناسب:

```bash
npm ci
npm --prefix server ci
npm run typecheck
npm run server:check
npm run build
npm run server:build
```

ثم شغّل الـsmoke/contract المرتبط بالجزء الذي عدلته. لا تعتمد على Build فقط.

## قواعد الاختبارات والـCI

- إذا فشل Contract: حدد أولًا هل كشف Bug حقيقي أم أن العقد نفسه يعتمد شكل كود/مسار ملف قديم.
- لا تغيّر الاختبار لمجرد جعله أخضر إذا كان يحمي سلوكًا أمنيًا أو وظيفيًا.
- عند نقل logic إلى module جديد، حدّث العقد ليتحقق من الـmodule الجديد ومن wiring داخل route/component.
- `npm audit fix --force` ممنوع في هذه الدورة.
- أي Major dependency migration، خصوصًا Sentry، تعامل معها كمشروع مستقل بعد الاستقرار.

## الفحص الحي المطلوب قبل إغلاق Recovery

### Guest
- Landing / Pricing / Blog.
- تأكيد حراسة Reports/My Requests بدون تسجيل دخول.

### Student
- Login.
- Dashboard.
- Course/Lesson.
- Quiz start → answer → submit → Results → Reports.
- Plan/Profile/My Quizzes.

### Admin
- Login.
- Admin dashboard.
- Users / Schools / Paths / Courses / Question Bank / Quizzes.
- Packages / Memberships / Finance.
- Reports / Settings / Integrations.

### Supervisor
- Login.
- School scope فقط.
- Reports.
- رفض الوصول خارج نطاق المدرسة.

### Teacher
- Login.
- المحتوى والطلاب المسموح بهم فقط.
- Reports وصلاحيات الدور.

### Parent
- Login.
- الطالب المرتبط فقط.
- Reports.
- رفض أي طالب غير مرتبط.

## Infrastructure / Deployment

### Frontend
- Production: `https://almeaacodax.vercel.app/`
- Build: `npm run build`

### API
- Base: `https://almeaacodax-k2ux.onrender.com/api`
- Health:
  - `/health/live`
  - `/health/ready`
- Build: `npm --prefix server run build`

### Environment names
احتفظ بالقيم السرية خارج GitHub files. أسماء المتغيرات المهمة تشمل:

```text
VITE_API_URL
MONGODB_URI
JWT_SECRET
REDIS_URL
RATE_LIMIT_REDIS_ENABLED
NOTIFICATION_QUEUE_ENABLED
PAYMENT_WEBHOOK_SECRET
SENTRY_DSN
```

## الفروع القديمة

الفروع من نوع `refactor/*runner*` و`refactor/*trigger*` هي آثار تنفيذ Refactor V2. لا تدمجها تلقائيًا. نظفها فقط بعد التأكد من أن `main` يحتوي المطلوب ولا يوجد PR أو workflow يعتمد عليها.

## تعريف النجاح قبل الانتقال من Recovery إلى Product Development

نعتبر الاستعادة مغلقة عندما:

1. Recovery Gate = PASS.
2. Phase + Handover Gate = PASS.
3. Public UI Gate = PASS على Desktop + Mobile.
4. Live Role Gate = PASS للحسابات التجريبية المطلوبة أو يتم توثيق أي Blocker خارجي بوضوح.
5. لا توجد Runtime errors حرجة مرتبطة بالتغييرات.
6. Preview للفرع ناجح عند وجود تغييرات deployable.
7. PR يظل Draft حتى اكتمال الأدلة والموافقة الصريحة على الدمج.

بعد ذلك تبدأ Features جديدة في فروع منفصلة، وليس دفعة تغييرات ضخمة مباشرة على `main`.
