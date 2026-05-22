# تقرير الدفعة 09 — خطة تدقيق أمان RBAC
**التاريخ:** 2026-05-16
**الموديل:** GPT-5.3-Codex / High
**الحالة:** مكتملة ✅

## ما تم
- تنفيذ تدقيق RBAC فعليًا من الكود على مستوى middleware + routes.
- حصر نقاط المخاطر حسب الشدة والأولوية التنفيذية للدفعة 10.
- توثيق مسارات سليمة (protected + role-check) ومسارات تحتاج hardening.

## النتائج الأساسية (مرتبة بالأولوية)
1. **[عالي] صلاحيات واسعة جدًا على Taxonomy CRUD**
- الملف: `server/src/routes/taxonomy.routes.ts`
- الملاحظة: عمليات `POST/PATCH/DELETE` على `paths/levels/subjects/sections/skills` تسمح بـ `admin/teacher/supervisor` مباشرة دون scope business واضح داخل نفس الراوتر.
- الأثر: مخاطر تعديل/حذف بنية تعليمية عالمية بواسطة أدوار غير admin.
- مثال مواقع:
  - `/paths*` تقريبًا قرب السطور 229–309
  - `/levels*` قرب 314–390
  - `/subjects*` قرب 394–477
  - `/sections*` قرب 481–566
  - `/skills*` قرب 570–615

2. **[متوسط] DEV_LOCAL_ADMIN_BYPASS يحتاج حراسة تشغيلية صارمة**
- الملف: `server/src/middleware/auth.ts`
- الملاحظة: يوجد bypass محلي مشروط (`DEV_LOCAL_ADMIN_BYPASS` + non-production + strict loopback).
- الأثر: آمن تصميميًا في الإنتاج، لكن يحتاج متابعة تشغيلية ثابتة لمنع أي تهيئة خاطئة.

3. **[متوسط] اعتماد واسع على role-level بدون object-scope ببعض المسارات**
- الملف: `server/src/routes/content.routes.ts`
- الملاحظة: عدد كبير من مسارات CRUD محمية role-wise فقط (`admin/teacher/supervisor`) مع تفاوت scope-check.
- الأثر: احتمال تجاوز نطاق العمل المتوقع في سيناريوهات متعددة المدارس/المجموعات إذا فشل check ثانوي.

## نقاط قوية مؤكدة
- `requireRole` يقوم بإعادة تحميل المستخدم من قاعدة البيانات قبل السماح، ويتحقق من `isActive` (جيد جدًا).
- مسارات حساسة كثيرة محمية `requireAuth + requireRole(["admin"])` مثل:
  - `operations.routes.ts`
  - `backup.routes.ts`
  - أجزاء حرجة من `notification.routes.ts` و`payment.routes.ts`
- مسار نتائج الكويز الإداري الجديد محمي إداريًا:
  - `server/src/routes/quizResults.routes.ts` -> `/admin/quiz-results` (admin only)

## خطة التنفيذ المقترحة للدفعة 10 (RBAC/API Hardening Batch 1)
**هدف واحد فقط عالي الأولوية:**
- تقييد Taxonomy destructive actions (`PATCH/DELETE` على الأقل) إلى `admin` فقط كبداية.
- إبقاء `GET` عامًا/اختياريًا حسب المنطق الحالي.
- إضافة smoke contract مخصص للتأكد من:
  - teacher/supervisor يحصلون `403` على عمليات الحذف والتعديل البنيوي
  - admin يستمر `200/204`

## الفحوصات المنفذة ضمن الدفعة 09
- `npm --prefix server run build` ✅
- `npm run typecheck` ✅
- `npm run build` ✅

## المخاطر المتبقية
- لم يتم تنفيذ hardening في هذه الدفعة (دفعة تدقيق/خطة فقط).
- يلزم تنفيذ Batch 10 لتخفيض المخاطر العالية فعليًا.

## الدفعة التالية المقترحة
BATCH-10 — RBAC/API Hardening Batch 1
