# إغلاق فجوة إشعارات جلسة الـ Cookie

**الحالة:** `CLOSED / VERIFIED — bounded in-app delivery slice`

## النطاق

هذه الدفعة تعالج فقط استقبال وقراءة إشعارات `in_app` للمستخدم المسجل عبر جلسة الـ auth cookie الحالية. لا تغيّر إرسال الرسائل، RBAC، نماذج البيانات، Queue providers، البريد، WhatsApp، أو ملكية الوحدات.

## الفجوة المثبتة

قبل الإصلاح كانت طبقات المصادقة والإشعارات غير متوافقة مع بعضها:

- `AuthContext` يعمل بنمط cookie-first ويحذف أي `token` قديم من session storage.
- `Header` كان يمرر `user.token` إلى `NotificationBell` رغم أن المستخدم الطبيعي لا يحتفظ بهذا token.
- `NotificationBell` كان يمنع list/read/stream بالكامل عند غياب `token`.
- `useNotificationStream` كان يرسل `?token=...` مع `EventSource(..., { withCredentials: false })`.
- middleware الخادم يقبل Bearer header أو auth cookie فقط، ولا يقرأ token من query string.
- مسار `/api/notifications/stream` محمي أصلًا بـ `requireAuth`.

لذلك كان من الممكن أن يُنشأ إشعار الطالب على الخادم بينما يبقى جرس الواجهة صامتًا في جلسة cookie-auth العادية.

## الإصلاح المحدود

Runtime commit: `e4fbc96f59588d1d0e7a6f58ad1354c52e3eeb98` (`Fix cookie-session notification delivery`).

- `Header` يركّب `NotificationBell` للمستخدم المسجل دون الاعتماد على `user.token`.
- `NotificationBell` يستخدم نفس API cookie transport الموجود لباقي التطبيق في list/read/read-all.
- `useNotificationStream` يعيد استخدام `API_BASE_URL` الموجود أصلًا، ولا يضع token في URL.
- `EventSource` يستخدم `withCredentials: true` بحيث يصل auth cookie إلى endpoint المحمي.
- خيار `token?` بقي في interface الخاص بالـhook للتوافق مع callers قديمة فقط، لكنه لم يعد سلطة المصادقة أو جزءًا من transport.
- لا تعديل في `notification.routes.ts`, `auth.ts`, schema, RBAC أو notification sender ownership.

## دليل التحقق

Focused workflow run `33977039287` اجتاز قبل كتابة runtime commit:

- frontend typecheck: PASS
- API typecheck: PASS
- frontend production build: PASS
- API production build: PASS
- `scripts/smoke-notification-cookie-session-contract.mjs`: PASS
- `git diff --check`: PASS
- runtime commit/push: PASS

العقد الدائم يثبت كذلك أن:

- API transport ما زال `credentials: include`.
- browser session لا يعتمد bearer token مخزنًا.
- NotificationBell لا يحتوي `if (!token) return`.
- SSE لا يحتوي `?token=` ويستخدم `withCredentials: true`.
- backend auth ما زال يقبل cookie عبر نفس `requireAuth`.
- CORS الحالي يسمح بالطلبات credentialed للأصول المسموحة.

## حدود الإثبات

هذا الإغلاق يثبت مسار `in_app` في جلسة cookie-auth ولا يدعي نجاح مزودي email/WhatsApp الخارجيين أو Redis/BullMQ في بيئات الإنتاج. كما لا يثبت أو يغيّر ربط المشرف بالمدرسة داخل `UsersManager`; ذلك يحتاج فجوة مستقلة مثبتة قبل أي تعديل.

## قاعدة التشغيل التالية

لا يُعاد فتح هذه الدفعة بسبب غياب bearer token في الواجهة؛ هذا الغياب مقصود في cookie-first auth. أي مشكلة رسائل لاحقة يجب أولًا تحديد هل هي sender authorization، delivery persistence، UI receive/read، أو external provider قبل تعديل runtime جديد.
