# BATCH 151 - Runtime Logging Continuity and Payment Tampering Hardening (2026-05-25)

## الهدف
- توثيق واضح ومتاح لأي حساب جديد لما تم تنفيذه فعليًا الآن.
- تسجيل خطة الإكمال الدقيقة للدُفعة التالية بدون فجوات.
- تثبيت سلامة ربط البيانات الحساسة (الدفع + العلاقات بين المستخدمين والمدارس).

## ما تم تنفيذه
1. اكتشاف عطل حرج في عقد الأمان:
   - `npm run smoke:payment-tampering`
   - الفشل: `approval flow grants access from stored server-verified request only`
2. إصلاح خادمي صغير وآمن في:
   - `server/src/routes/payment.routes.ts`
   - داخل `grantApprovedPaymentAccess`
3. إعادة تحقق فوري بعد الإصلاح:
   - `npm run server:build` -> PASS
   - `npm run smoke:payment-tampering` -> PASS (9/9)
   - `npm run smoke:payment-package` -> PASS (8/8)

## حالة الربط والبيانات (Linkage/Data Integrity)
- **الدفع/الوصول**:
  - منح الوصول بعد الاعتماد يعتمد على طلب الدفع المعتمد المخزن في السيرفر (server-owned source of truth).
  - `includedCourseIds` مشتقة من الطلب المعتمد مع قيد `package` فقط.
- **علاقات المستخدمين**:
  - ربط ولي الأمر محمي ويقبل طلابًا فقط.
  - rollback للـ optimistic updates في علاقات المستخدمين موجود ومفعل.
- **علاقات المدارس**:
  - مزامنة حالة المدرسة المختارة بعد الربط/إلغاء الربط موجودة ومثبتة.

## الحالة الحالية
- الدفعة **قيد الإكمال** توثيقيًا وتشغيليًا (Interim).
- الإصلاح الحرج تمّ، لكن إقفال دورة النشر الكاملة لـ BATCH 151 ما زال مطلوبًا.

## خطة الإكمال الدقيقة (للجلسة/الحساب التالي)
1. تشغيل بوابة التحقق الكاملة:
   - `npm run typecheck`
   - `npm run build`
   - `npm run server:build`
   - `npm run smoke:health-readiness`
   - `npm run smoke:frontend:strict`
   - `npm run smoke:real-usage-readiness`
   - `npm run smoke:batch136-admin-users-schools-parent-payment`
   - `npm run smoke:payment-package`
   - `npm run smoke:payment-tampering`
   - `npm run smoke:operational` مع env الإنتاج المعتمد
2. إقفال Git:
   - staging صريح فقط (بدون `git add .`)
   - commit واضح لدفعة 151
   - push إلى `main`
3. نشر وتحقق:
   - trigger Render على `srv-d7qtcr9o3t8c73cs32sg`
   - انتظار الحالة `live`
   - إعادة `smoke:frontend:strict` للتأكد من commit-match على الإنتاج
4. تحديث ملفات التسليم النهائية:
   - `PROJECT_STATUS.md`
   - `docs/SPARK_BATCH_LEDGER_AR.md`
   - `docs/NEXT_SESSION_HANDOVER_AR.md`
   - `CODEX_HANDOFF.md`

## ملاحظات تشغيل مهمة
- حساب smoke `student.d@almeaa.local` معطل على الإنتاج؛ استخدم fallback نشط أو token مخصص.
- لا يتم تعديل التصميم أو العقود العامة ما لم يكن هناك blocker حقيقي.
