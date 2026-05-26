# BATCH 167 - فحص بصري عملي للعضويات وفصلها عن باقات التعلم

التاريخ: 2026-05-26  
الحالة: Implementation + local visual verification + runtime gate PASS, pending production deploy/push closure

## Summary

تم تنفيذ فحص عملي على صفحة `/pricing` بعد شكوى المالك أن العضويات تقود المستخدم إلى مكان آخر وأن إدارة العضويات غير واضحة.

النتيجة: تم إثبات العطل بصريًا وبرمجيًا. أزرار العضويات المدفوعة كانت تربط المستخدم بـ`/courses`، وهذا يخلط عضويات المنصة العامة مع باقات ساحة التعلم. تم إصلاح ذلك بأصغر تغيير آمن: العضويات المدفوعة أصبحت تفتح طلب عضوية عام عبر واتساب، والعضوية المجانية تذهب إلى مسار الحساب، مع توضيح إداري أن إدارة العضويات العامة تتم من لوحة المدير داخل إدارة المسارات > الباقات الشاملة مع خيار "عضوية عامة تفتح كل المنصة".

## Deep Runtime Stability Report

### Runtime bugs discovered

Bug:
عضويات `/pricing` لا تبدأ تدفق عضوية، بل تنقل المستخدم إلى `/courses`.

Location:
`pages/Pricing.tsx`

Role affected:
Guest / Student / any user opening pricing page.

Steps to reproduce:
1. فتح `/pricing`.
2. الضغط على "اشترك في الأساسية" أو "اشترك في المميزة".

Expected behavior:
الزر يبدأ طلب عضوية عامة أو يوضح أنه اشتراك منصة مستقل.

Actual behavior:
الزر كان يذهب إلى `/courses`، ما يخلط العضويات العامة مع باقات التعلم.

Root cause:
كل الخطط كانت تحتوي `ctaLink: '/courses'` وتستخدم `Link to={plan.ctaLink}`.

Fix applied:
تم تحويل الخطط إلى نوع إجراء واضح:
- المجانية: رابط داخلي إلى `/dashboard` للمستخدم المسجل أو `/login` للضيف.
- المدفوعة: رابط واتساب برسالة عضوية عامة، وليس رابط كورسات.
- إضافة تنبيه صريح أن `/pricing` عضويات عامة وليست باقات ساحة التعلم.

Files changed:
- `pages/Pricing.tsx`
- `scripts/smoke-membership-pricing-contract.mjs`
- `package.json`

Retest result:
PASS بصريًا على `http://127.0.0.1:4173/pricing`:
- عنوان الصفحة ظهر: `عضويات المنصة`.
- التنبيه ظهر: `ليست باقات ساحة التعلم داخل المسارات`.
- لا يوجد `href="/courses"` داخل صفحة العضويات.
- زر "اطلب العضوية الأساسية" أصبح `https://wa.me/...`.
- الضغط على الزر لم ينقل الصفحة إلى `/courses`.

Regression risk:
منخفض. التغيير محصور في صفحة التسعير وتوضيح الإدارة، ولا يغير عقود الدفع/الباقات الحالية.

### Admin management clarity

Bug:
إدارة العضويات العامة موجودة ضمن إدارة باقات المسارات، لكن التسمية لم تكن واضحة للمدير.

Location:
`dashboards/admin/PathsManager.tsx`

Role affected:
Admin.

Expected behavior:
وجود مسمى واضح يدل أن هذا القسم يدير العضويات العامة وباقات المسارات، مع فصلها عن باقات المدارس.

Actual behavior:
النص كان يتحدث عن "الباقات والعروض العامة" فقط، ما يجعل مكان إدارة العضويات غير واضح.

Root cause:
الوظيفة موجودة بالفعل عبر `packageType: 'membership'` وخيار `عضوية عامة تفتح كل المنصة`، لكن النص الإداري غير صريح.

Fix applied:
تحديث عناوين ونصوص التبويب والنموذج إلى:
- `إدارة العضويات العامة وباقات المسارات`
- `إنشاء عضوية/باقة`
- `إنشاء عضوية أو باقة عامة`
- توضيح أن تفعيل خيار "عضوية عامة تفتح كل المنصة" ينشئ عضوية عامة منفصلة.

Files changed:
- `dashboards/admin/PathsManager.tsx`
- `scripts/smoke-membership-pricing-contract.mjs`

Retest result:
PASS تعاقديًا عبر `npm run smoke:membership-pricing`.

Regression risk:
منخفض. تغييرات النصوص فقط مع الحفاظ على نفس نموذج البيانات والسلوك.

### Console/Network notes

- أثناء فحص production قبل الإصلاح ظهر تحذير سابق في console:
  - `Failed to hydrate non-critical session data: Error: Internal server error`
- لم يثبت أنه مرتبط بتغيير العضويات، ولم يظهر كمانع في فحوص الإنتاج التشغيلية.
- يسجل كـLow/Follow-up إذا ظهر مجددًا في جولة متعددة الأدوار أوسع.

## Visual/user verification

Browser used:
Codex in-app Browser.

Pages/flows checked:
- `/pricing` production before fix: confirmed CTA path confusion.
- `/pricing` local preview after fix: confirmed membership-specific copy and CTA behavior.
- Paid CTA click: confirmed no navigation to `/courses`, and href points to WhatsApp membership request.
- `/admin-dashboard?tab=paths` as guest: protected route redirects away, confirming no guest admin access.

## Command verification

PASS:
- `npm run smoke:membership-pricing`
- `npm run typecheck`
- `npm run build`
- `npm run server:check`
- `npm run server:build`
- `npm run smoke:real-usage-readiness`
- `npm run smoke:payment-package`
- `npm run smoke:health-readiness`
- `npm run smoke:frontend:strict`
- `npm run smoke:operational` against production API with session-only admin token and `SMOKE_ALLOW_PASSWORD_LOGIN=true` => `71/71`

Notes:
- `npm run build` and `npm run server:build` initially hit local `EPERM` sandbox/write restrictions and passed after rerun with elevated execution.
- First `smoke:operational` run without production API base used localhost and was discarded as invalid closure evidence.
- Final accepted operational run used:
  - `SMOKE_API_BASE_URL=https://almeaacodax-k2ux.onrender.com/api`
  - session-only admin token
  - redeemed fallback `student.a@almeaa.local`

## Remaining issues

Critical:
- None found in this focused membership batch.

High:
- None found in this focused membership batch.

Medium:
- Full admin CRUD visual verification for creating/editing an actual global membership should be completed after production deploy in a logged-in admin session.

Low:
- Non-critical session hydration warning observed earlier on production; follow up if repeated during broader multi-role visual audit.

## Readiness decision

Focused membership fix is ready for commit/deploy after current git staging review.

Do not mark the entire platform as final delivery-ready solely from this batch; this batch closes the membership/package confusion track and keeps broader multi-role QA rule active for future batches.

## Next exact task

1. Commit and push explicit changed files only.
2. Let Vercel production update via Git integration or run CLI deploy if credentials are valid.
3. Re-run `smoke:health-readiness` + `smoke:frontend:strict` for production commit-match.
4. Run a logged-in admin browser pass on production to open `admin-dashboard?tab=paths` and visually confirm membership management labels after deploy.
