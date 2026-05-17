# BATCH_10_RBAC_API_HARDENING_BATCH_1_2026-05-17_AR

**التاريخ:** 2026-05-17  
**اسم الدفعة:** BATCH 10R — RBAC/API Hardening Production Verification  
**الحالة:** Programmatically closed, production verification pending ⚠️

## ما تم
- تنفيذ تحقق حي على الإنتاج لمسارات المدارس الحساسة:
  - `GET /api/content/schools/:id/report`
  - `POST /api/content/schools/:id/import-students`
  - `POST /api/content/schools/:id/relations`
- النتيجة على النسخة المنشورة الحالية: مشرف جديد بدون نطاق واضح تمكن من الوصول (200/201) => خطر قائم في الإنتاج.

## الإصلاح المنفذ في الكود (جاهز للنشر)
- تضييق دالة `resolveAccessCodeSchoolsForSupervisor` في:
  - `server/src/routes/content.routes.ts`
- النطاق الآن يعتمد فقط على مصادر صريحة:
  - `user.schoolId`
  - `user.groupIds` (ومدرسة parent للمجموعات الصفّية)
  - `Group(type=SCHOOL, supervisorIds includes userId)`
- إزالة الاعتماد على conditions واسعة قد توسع النطاق بلا قصد.

## الفحوص البرمجية
- `npm --prefix server run build` → PASS
- `npm run smoke:security-rbac-phase6` → PASS

## فحص الإنتاج
- **قبل نشر الإصلاح الجديد**: FAIL (المشرف وصل خارج النطاق).
- **بعد نشر الإصلاح**: Pending (لم يتم بعد).

## القرار
- الدفعة غير مغلقة نهائيًا حتى نشر commit الإصلاح وإعادة التحقق الحي 403/200.

## الدفعة التالية المقترحة
- BATCH 10R-DEPLOY — Deploy RBAC scope fix + Live re-verification
