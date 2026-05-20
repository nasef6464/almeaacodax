# إغلاق تنفيذ A1 → A6

التاريخ: 2026-05-20
البيئة: Production + Local verification

## A1 — تثبيت Cookie Auth في أدوات الإدارة

تم:
- إزالة الاعتماد على `user.token` من حفظ إعدادات الصفحة الرئيسية.
- إزالة الاعتماد على `user.token` من حفظ إعدادات الخطوط.
- تعديل إعادة إرسال تأكيد البريد لتعمل بجلسة الكوكي.
- تحديث عقود smoke المواكبة.

تحقق:
- `npm run typecheck` PASS
- `npm run smoke:auth-cookie` PASS
- `npm run smoke:csrf` PASS
- `npm run smoke:homepage-hero` PASS
- `npm run smoke:platform-fonts` PASS

## A2 — إصلاح جذري لمسار دخول الإيميل/الباسورد

تم:
- إضافة متغير بيئة اختياري `ADMIN_PASSWORD_SYNC_ON_BOOT`.
- عند تفعيله: مزامنة كلمة مرور المدير من البيئة مع الحساب الموجود عند الإقلاع.
- بدون تفعيله: يبقى السلوك القديم كما هو (آمن وغير مفاجئ).

تحقق:
- `npm --prefix server run build` PASS
- `npm run smoke:auth-login-security` PASS
- `npm run smoke:auth-account` PASS

## A3 — واتساب OTP (تسجيل اختياري)

تم:
- إنشاء موديل `PhoneOtp`.
- إضافة:
  - `POST /api/auth/whatsapp/start`
  - `POST /api/auth/whatsapp/verify`
- إضافة قيود محاولات/انتهاء صلاحية OTP.
- ربط واجهة الدخول بزر واتساب داخل مودال تسجيل الدخول.

تحقق:
- `npm --prefix server run build` PASS
- `npm run typecheck` PASS
- `npm run smoke:auth-login-security` PASS
- `npm run smoke:auth-account` PASS

ملاحظة تشغيلية:
- يلزم تفعيل مزود واتساب فعلي (`WHATSAPP_PROVIDER`) للإرسال الحقيقي.
- في غياب المزود يرجع API رسالة إعداد غير مكتمل.

## A4 — حارس ميزانية المساعد الذكي

تم:
- إضافة:
  - `AI_DAILY_LIMIT`
  - `AI_PER_USER_DAILY_LIMIT`
- إذا تم تجاوز الحد: النظام يتحول تلقائيا إلى `local-fallback` بدل استهلاك غير مضبوط.

تحقق:
- `npm --prefix server run build` PASS
- `npm run smoke:monitoring` PASS
- `npm run smoke:sentry-runtime` PASS

## A5 — فحص لوحة المدير (تشغيلي/عقود)

تحقق smoke:
- `npm run smoke:admin-tabs` PASS
- `npm run smoke:dashboards-phase11` PASS
- `npm run smoke:school-management` PASS
- `npm run smoke:supervisor-dashboard` PASS
- `npm run smoke:admin-school-command` PASS
- `npm run smoke:school-portal-command` PASS
- `npm run smoke:announcement-ads` PASS
- `npm run smoke:reports-role` PASS
- `npm run smoke:homepage-hero` PASS
- `npm run smoke:platform-fonts` PASS

## A6 — تنظيف آمن

تم:
- حذف مخلفات `tmp` غير المتتبعة.
- إضافة تجاهل في `.gitignore`:
  - `tmp/`
  - `tmp_*`
  - `load-tests/results/*.jsonl`

إجراء أمان:
- تمت استعادة ملفات `load-tests/results/*.jsonl` المتتبعة وعدم حذفها من تاريخ المشروع.

## Probe إنتاجي سريع

- `GET /api/health` => `status=ok`, `ready=true`, `database=connected`
- `GET /api/ai/status` => `provider=none`, `model=local-fallback`

## الحالة

- A1: Closed
- A2: Closed
- A3: Closed (functionally, pending provider env for live WhatsApp delivery)
- A4: Closed
- A5: Closed (contract/smoke scope)
- A6: Closed (safe cleanup)
