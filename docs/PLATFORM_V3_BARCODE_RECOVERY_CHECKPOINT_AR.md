# Platform V3 — Barcode Recovery Checkpoint

## الحالة
أثناء توسيع `Platform V3 Recovery Gate` نجحت كل عقود الباركود العامة تقريبًا، وظهر فشل واحد وظيفي محدد:

- الاختبارات الموجهة بالباركود يتم جلبها في `pages/Quizzes.tsx` عبر `api.listAssignedPublicBarcodeTests()`.
- البيانات تُحفظ في `assignedBarcodeTests`.
- قبل الإصلاح لم يكن هناك أي JSX يعرض هذه البيانات داخل مركز اختبارات الطالب.

## التصنيف
Product bug — student discoverability.

الطالب المستهدف يمكن أن يملك اختبار Barcode صالحًا في الـBackend، لكن لا يجد بطاقة الاختبار داخل مركز الاختبارات.

## الإصلاح الجاري
Guarded executor:
- `tools/recovery/apply-student-assigned-barcode-tests.mjs`
- `.github/workflows/platform-v3-student-barcode-repair.yml`

نطاق التعديل المسموح: `pages/Quizzes.tsx` فقط.

## شروط القبول
1. `npm run smoke:barcode-public-tests` = PASS.
2. Frontend typecheck = PASS.
3. API typecheck = PASS.
4. Frontend production build = PASS.
5. لا ملفات متغيرة خارج `pages/Quizzes.tsx` في commit الإصلاح.
6. يظهر قسم `student-assigned-barcode-tests` مع رابط `/barcode-test/:slug` داخل مركز اختبارات الطالب.
