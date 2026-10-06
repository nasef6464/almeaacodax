# CROSS SESSION CONTINUITY PLAYBOOK (AR)

Last updated: 2026-05-23

## قاعدة التشغيل الثابتة
- إذا قال المالك: `اكمل`
  - وكان لا توجد دفعة نشطة: ابدأ دفعة جديدة مباشرة.
  - وكان توجد دفعة نشطة: أكمل نفس الدفعة حتى الإغلاق النهائي.
- لا تبدأ أي دفعة جديدة قبل توثيق إغلاق الدفعة الحالية بالكامل.

## ترتيب التنفيذ الإلزامي لكل دفعة
1. قراءة:
   - `PROJECT_STATUS.md`
   - `docs/NEXT_SESSION_HANDOVER_AR.md`
   - `CODEX_HANDOFF.md`
2. تحديد نطاق الدفعة بوضوح في تقرير دفعة جديد.
3. تنفيذ التعديلات ضمن النطاق فقط.
4. تشغيل فحوص مرتبطة بالنطاق + فحوص readiness الأساسية.
5. تحديث ملفات الحالة/الهاندوفر/الليدجر.
6. `git status` ثم `git add` بملفات صريحة فقط (ممنوع `git add .`).
7. commit + push.
8. إعادة تحقق ما بعد النشر (Vercel/Render + browser verification عندما يكون متاحا).

## فحوص الإغلاق الأساسية (Baseline)
- `npm run smoke:health-readiness`
- `npm run smoke:frontend:strict`
- `npm run smoke:batch100q-operational-admin-runtime`

## قواعد الأمان
- ممنوع `git add .`
- ممنوع حذف ملفات تاريخية أو تنظيف شامل خارج النطاق.
- ممنوع تغيير API contracts أو DB schema بدون ضرورة موثقة.
- ممنوع إعلان `Fully closed` بدون:
  - فحوص PASS
  - push ناجح
  - تحديث ملفات التسليم

## قالب إغلاق مختصر
- Batch: `<ID>`
- Scope: `<scope>`
- Changes: `<files/summary>`
- Checks: `<PASS/FAIL>`
- GitHub: `<commit/push>`
- Deploy/Runtime: `<vercel/render/browser>`
- Remaining blockers: `<if any>`
- Next batch trigger: `عند "اكمل" ابدأ الدفعة التالية`

## مناطق لا تُلمس
- الملفات التاريخية غير المتتبعة.
- أي secrets أو env values حقيقية.
- تغييرات UI غير مطلوبة لإصلاح bug.
