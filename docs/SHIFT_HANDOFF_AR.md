# دليل التسليم بين الحسابات (نسخة التشغيل)

آخر تحديث: 2026-05-10

## الهدف
هذا الملف هو المرجع الموحد لأي حساب جديد حتى يكمل مباشرة بدون:
- إعادة شغل سابق
- كسر أجزاء مستقرة
- استهلاك توكن بدون تقدم فعلي

## قاعدة مهمة جدا
المحادثات نفسها لا تنتقل تلقائيا بين الحسابات.  
المرجع الحقيقي المشترك هو ملفات المشروع داخل GitHub/الريبو، وعلى رأسها هذا الملف.

## اقرأ هذا الترتيب قبل أي تعديل
1. `docs/SHIFT_HANDOFF_AR.md` (هذا الملف)
2. `docs/CURRENT_EXECUTION_PLAN_AR.md`
3. `docs/CURRENT_DEVELOPMENT_STATUS_AR.md`
4. `docs/AGENT_HANDOFF_AR.md`

## طريقة العمل الإلزامية (نفس النهج)
1. اختر جزئية واحدة فقط من الخطة.
2. نفذها كاملة (كود + فحص + تجربة الدور المناسب).
3. لا تلمس جزئية أخرى إلا بعد إغلاق الحالية.
4. حدّث هذا الملف بجملة: ماذا أُغلق؟ وما الذي بقي؟

## تعريف "الإغلاق"
الجزئية تعتبر مغلقة فقط إذا:
- الكود مكتمل
- فحوصها مرت
- تجربة الواجهة تمت للدور المعني (طالب/ولي أمر/مدير/مشرف/معلم حسب الحالة)
- تم توثيق النتيجة هنا

## حدود الصلاحيات والمنصات
- الاستمرار يعتمد على صلاحية نفس الجهاز/البيئة (GitHub/Render/Vercel/Mongo).
- لا نضع أسرار حساسة داخل المحادثة.
- أي تعديل بيئة إنتاج يتم توثيقه كـ "تغيير إعدادات" داخل هذا الملف.

## سياسة منع التكرار
- ممنوع إعادة تصميم جزء مستقر إلا لو ظهر خلل واضح.
- أي طلب جديد لا يلغي ما قبله إلا إذا كان "تعديل صريح".
- الأولوية: رحلة الطالب + البساطة + ثبات السلوك.

## سجل التسليم السريع
### 2026-05-10
- تم تثبيت مرجع تسليم موحّد بين الحسابات.
- المطلوب من أي حساب لاحق: البدء من هذا الملف ثم الخطة الحالية.
- تم إغلاق جزئية (المكتبة + ملف الدعم + مجاني/مدفوع حسب مكان العرض) بعد فحص ناجح:
  - `smoke:library-support` (10/10)
  - `smoke:student-journey` (6/6)
  - `smoke:quiz-access` (17/17)
- الجزئية الجارية التالية: ثبات رحلة الطالب داخل المادة بعد تحديث الصفحة (refresh) مع الحفاظ على نفس التبويب والسياق.
- تم تنفيذ دفعة أولى في الدورات: منشئ الدورة يستطيع الآن اختيار المدرب/المعلم، حفظ نسبة المدرب من دخل الدورة، واستدعاء درس موجود أو اختبار موجود داخل أقسام الدورة بدل الإضافة الجديدة فقط. الفحوص:
  - `smoke:course-builder` (4/4)
  - `smoke:quiz-access` (17/17)
  - `server build`
  - `frontend build`
- تم بدء وإغلاق عقد أسئلة الفيديو التفاعلية: الدرس يستطيع حفظ أسئلة بتوقيت محدد، والسؤال إما من بنك الأسئلة أو سؤال جديد ينشأ من منشئ الأسئلة الموحد، والمشغل يمررها في موضوعات التأسيس والدورات. الفحص: `smoke:video-questions` (5/5).
- تم إغلاق دفعة الباقات المدرسية ونسبة المعلم: الباقة المدرسية لها الآن معلم/مدرب ونسبة دخل محفوظة في النوع والسيرفر، وتظهر في إدارة المدارس وتقرير التصدير ولوحة المالية. الفحص: `smoke:package-revenue` (4/4)، مع نجاح `smoke:course-builder` و`smoke:quiz-access` والبناء الكامل.

## قالب تحديث مختصر (انسخه عند كل دفعة)
```
تاريخ:
الدفعة:
ما تم:
ما تم فحصه:
المتبقي المباشر:
مخاطر/ملاحظات:
```

## تحديث دفعة 2026-05-10 - فصل التدريب عن الاختبارات بصريًا
- القاعدة المثبتة: التدريب والاختبارات يظلان قسمين منفصلين في واجهة الطالب وإدارة المحتوى، حتى لو اشتركا داخليًا في نفس مشغل الأسئلة وبنك الأسئلة.
- ما تم: تحسين قائمة التدريب/الاختبارات داخل مساحة التعلم بإظهار ملخص بسيط: إجمالي العناصر، المفتوح الآن، وما هو ضمن باقة، مع شارات واضحة على كل عنصر.
- ما تم: زر التدريب يظهر كـ "ابدأ التدريب"، وزر الاختبار يظهر كـ "ابدأ الاختبار"، والاختبار/التدريب المغلق يفتح مسار الباقة.
- فحص الحماية المضاف: `smoke:quiz-access` يتحقق الآن من أن `mode="bank"` للتدريب، وأن مصادر `training` و`tests` منفصلة، وأن النصوص البصرية لا تدمج القسمين.
- المتبقي المباشر: استكمال تحسين تجربة الباقات/الإعلانات/تقارير الطالب وولي الأمر بنفس قاعدة البساطة وعدم نقل تفاصيل الإدارة للطالب.
## Production Hardening Sprint - 2026-05-10
- Closed critical direct-unlock route: `POST /api/auth/me/purchase` now returns `410 Gone`; paid access must come from payment review/webhook or access-code redemption.
- Closed direct quiz-result injection: `POST /api/quizzes/results` now returns `410 Gone`; real quiz results must come from `/api/quizzes/:id/submit`.
- Question attempts no longer trust client `isCorrect`; the server compares the selected option with the stored correct answer.
- Access-code redemption now reserves usage with MongoDB atomic `$inc` and `$expr` guard.
- Added baseline backend hardening: Helmet, compression, global rate limit, stricter auth/payment/AI/quiz-submit limits, and smaller JSON payload limit.
- Added docs: `PRODUCTION_READINESS_REPORT.md`, `SECURITY_CHECKLIST.md`, `LOAD_TEST_REPORT.md`, `BACKUP_RESTORE_GUIDE.md`.
- Added guard: `npm run smoke:production-hardening`.

## Production Audit + Paid/Free Foundation Sprint - 2026-05-10
- Added `AdminAuditLog` storage and `/api/operations/admin-audit-logs` for admin-only review of sensitive actions.
- Logged sensitive events: payment settings updates, payment request reviews, admin user upserts/updates, blocked direct purchase attempts, and blocked direct quiz result attempts.
- Changed `server/.env.example` so `DEV_LOCAL_ADMIN_BYPASS=false` is the safe default.
- Foundation topics now respect the topic itself for paid/free status. If a foundation topic is not locked, the student sees it as free and can open it directly. Locked topics still open the matching package/payment path.
- Added guard: `npm run smoke:production-audit`.
- Next direct work: complete package choice UX for public discount codes, memberships, and package variants (foundation only, tests only, full subject, full path, full membership) without merging training and tests.

## Payment Packages Sprint - 2026-05-10
- Closed the first package-choice pass: locked content can now pass several suitable public packages to the payment modal, so the student sees choices such as foundation-only, tests-only, subject/path package, or full package when those packages exist.
- Added optional `discountCode` to payment requests and the payment modal. This records the code for admin review only; real automated discounts still need a dedicated discount-code rules screen.
- Path package tabs now include global membership-style packages with no path binding, so a future "membership opens everything" package can be visible from path package pages.
- Guard added: `npm run smoke:payment-package`.
- Next direct work: build the real discount-code/ membership management UI and final package entitlement rules, while keeping training and tests as separate sections.
