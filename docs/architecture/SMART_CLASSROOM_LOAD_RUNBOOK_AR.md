# تشغيل حمل الفصل الذكي — P5

هذا التشغيل يكتب بيانات عابرة في **قاعدة اختبار فقط**. يرفض المحاكي تلقائياً
اسم قاعدة لا يحتوي `test` أو `ci` أو `dev` أو `local` أو `sandbox`.

## المتطلبات

- MongoDB محلي أو معزول، باسم قاعدة اختبار، وليس Atlas/الإنتاج.
- `NODE_ENV=development`.
- ضبط `MONGODB_URI` و`JWT_SECRET` في `server/.env` محلياً؛ لا تضع أسراراً في
  الأوامر أو Git.

## السيناريوهات

نفّذ من جذر المستودع في PowerShell:

```powershell
$env:SMART_CLASSROOM_SCENARIO = '30-students'
$env:SMART_CLASSROOM_LOAD_STUDENTS = '28'
npm --prefix server run simulate:smart-classroom-hardening
```

غيّر العدد إلى `98` لسيناريو 100 طالب، وإلى `118` لسيناريو 120 طالباً.
لـ4 فصول/120 طالباً شغّل أربع عمليات معزولة، كل منها `28` طالب تحميل إضافة
إلى الطالبين المرجعيين، وأعط كل عملية اسم سيناريو مختلف.

كل تشغيل ينتج سطر JSON بنوع `smart-classroom-load-metrics` يتضمن عدد طلبات
HTTP وp50/p95/p99 وحجم الاستجابات وRSS/heap وعدد اتصالات Socket المفتوحة.

## حدّ الدليل

هذه الأرقام تقيس العملية المحلية فقط. لإغلاق P5 أضف لوحات MongoDB/host
لـCPU وRAM والشبكة، واحتفظ بمخرجات كل سيناريو وتقرير Before/After. لا تدّعِ
أداء إنتاجي من تشغيل محلي معزول.
