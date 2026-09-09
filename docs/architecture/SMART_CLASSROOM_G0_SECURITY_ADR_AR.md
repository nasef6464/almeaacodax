# ADR — G0 Security & Reuse Boundary

> الحالة: `IMPLEMENTED / CI PENDING`
> التاريخ: 2026-09-09

## السياق

تملك ALMEAA بالفعل Barcode Public Tests وحجوزات حصص فردية وSocket.IO. قبل إعادة
استخدام أي منها في Smart Classroom، كانت قراءة Barcode والتحكم الحي والتقرير متاحة
لكل Staff role، وكان أي Socket يستطيع الانضمام إلى أي `workspaceId`، بينما حجوزات
الحصص لا تخزن مدرسة أو فصلًا موثوقًا.

## القرار

1. **Barcode admin resources**: النطاق server-authoritative. يقرأ Staff الاختبار
   إذا كان منشئه، أو مملوكًا لمدرسته، أو يستهدف مجموعة داخل نطاقه. Admin فقط يرى
   الكل. ينطبق ذلك على list وlive-control وreport.
2. **Barcode ownership**: لا يؤخذ `ownerType` و`ownerId` من طلب العميل عند الإنشاء؛
   يشتقهما الخادم من المستخدم المصادق عليه.
3. **Socket**: لا اتصال بلا JWT صالح ومستخدم active حالي. يسمح `workspace:join`
   فقط بغرف `user:<id>` الذاتية و`school:<id>` المطابقة و`class:<id>` ضمن group أو
   direct-supervisor scope. كل صيغة أخرى مرفوضة. غرف ClassroomSession المستقبلية
   تحتاج policy مخصصة عند G2؛ لا توجد صلاحية افتراضية لها.
4. **Session bookings الحالية**: هي طلبات دعم فردي لمنصة ALMEAA، وليست جلسات
   مدرسة. لا تحمل `schoolId`/`classId`/assignment موثوقًا، لذا أصبحت إدارتها
   Platform Admin-only. تخفى queue من Teacher/Supervisor بدل تخمين انتمائها
   المدرسي. سيبني G1/G5 حجوزات مدرسية جديدة بسياق صريح إذا احتاجها المنتج.
5. **التحليلات**: Barcode وClassroomResponse التكوينيان لا ينشئان `QuizResult`
   رسميًا تلقائيًا. سيظل الفصل النهائي بينهما عقدًا في G2 وما بعده.

## الأثر

- يبقى Barcode public route بلا تسجيل دخول متوافقًا مع الاستخدام الحالي.
- لا تتغير API URLs أو scoring أو payment أو بيانات إنتاج.
- قد يتلقى Supervisor/Teacher الذي كان يفتح queue العامة سابقًا منعًا مقصودًا؛ هذا
  تصحيح حدود وصول، وليس نقلًا للحجز إلى مدرسة بلا دليل.

## التحقق

- `smoke:smart-classroom-g0` يتضمن School A/B policy checks وSocket negative cases.
- `smoke:barcode-public-tests` و`smoke:student-session-booking` يحميان الرحلات
  القائمة.
- الإغلاق النهائي يحتاج exact-runtime CI؛ حالة build المحلي معلقة دون error في
  هذه البيئة وتبقى `NOT PROVEN` حتى دليل CI.
