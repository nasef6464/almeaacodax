# مزامنة النسخة المحلية مع Refactor V2

هذا المرجع مخصص للجهاز المحلي الذي سيُفتح عليه المشروع لاحقًا عبر Codex أو أي Agent آخر.

## أثناء مرحلة Refactor V2

الفرع المرجعي هو:

```text
refactor/repository-v2-safe
```

لا تستخدم نسخة ZIP قديمة فوق المستودع الحالي، ولا تعمل `reset --hard` لمجرد المزامنة.

من PowerShell داخل مجلد المشروع شغّل:

```powershell
powershell -ExecutionPolicy Bypass -File tools/sync-refactor-local.ps1
```

السكربت يتوقف تلقائيًا إذا وجد تعديلات محلية غير محفوظة، ثم يستخدم `fetch` و`pull --ff-only` فقط حتى لا يمسح عملًا محليًا.

إذا أردت فرعًا مختلفًا:

```powershell
powershell -ExecutionPolicy Bypass -File tools/sync-refactor-local.ps1 -Branch main
```

استخدم `main` فقط بعد اعتماد ودمج Refactor V2 رسميًا.

## عند فتح المشروع في Agent جديد

ابدأ من جذر المستودع، ثم اجعل الـAgent يقرأ بالترتيب:

1. `AGENTS.md`
2. `docs/architecture/PROJECT_MAP.md`
3. `docs/architecture/CURRENT_REFACTOR_STATUS_AR.md`
4. `docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md`

هذه الملفات هي مرجع الهدف، الحدود المعمارية، آخر نقطة فحص، وما تم وما تبقى.

## قاعدة أمان مهمة

لا تنسخ أي token أو secret داخل prompt أو ملف tracked. إعدادات Vercel/Render/Mongo تبقى في مزودي الخدمة أو ملفات البيئة غير المتتبعة فقط.
