# ALMEAA — Current Architecture State

## Source of truth

الكود الحالي في `main` هو المصدر. آخر Commit موثق: `91b4e3ba`. آخر تدقيق مولد من هذا الرأس، وليس من ZIP أو نسخة قديمة.

## Runtime topology

Browser/PWA → Vercel/Vite → `/api/*` rewrite → Render/Express → MongoDB Atlas، مع Redis/BullMQ/Socket.IO عند تفعيلها.

## الموجود حاليًا

- Frontend React 19 + Vite + React Router + Zustand.
- Backend Express + TypeScript + Mongoose.
- Auth/security/rate limiting/CSRF وSocket.IO/Redis foundations موجودة.
- API facade `services/api.ts` بدأ يتفرع إلى `services/apiGroups/*`.
- `useStore.ts` بدأ يعتمد slices مع إبقاء facade.
- حدود آمنة مستخرجة من Paths وResults وDashboard، مع إبقاء orchestration في الصفحات.
- `server/src/modules/` موجود جزئيًا، بينما ما زالت routes/models/services القديمة تعمل كحدود توافق.

## قياسات HEAD

| القياس | القيمة | الحالة |
|---|---:|---|
| Runtime imports غير محلولة | 0 | VERIFIED |
| Runtime cycles | 0 | VERIFIED |
| Routes frontend/backend | 49 / 236 | VERIFIED |
| Hotspots >=400 | 83 | VERIFIED، عند الحد |
| 80k سؤال/صور | — | NOT PROVEN |
| 20–30k مستخدم | — | NOT PROVEN |
| ملايين attempts/results | — | NOT PROVEN |

## المخاطر المؤكدة

1. `openNotificationSseStream.ts` يعمل polling على Mongo لكل اتصال.
2. `startWeeklyParentReportSchedule.ts` يستخدم timer داخل عملية API ويقرأ الآباء ثم النتائج في حلقات متتابعة.
3. taxonomy/content وعمليات التشغيل تحتوي قراءات كاملة مناسبة للتشغيل الإداري الصغير، لكنها تحتاج حدودًا قبل نمو البيانات.
4. `vite.config.ts` يستخدم NetworkFirst واسعًا لمسارات `/api/`؛ يلزم تصنيف cache قبل بيانات المستخدم المصادق عليها.
5. بعض النماذج تعتمد arrays عضوية مثل `studentIds` و`linkedStudentIds`؛ لا Migration الآن، فقط قياس وتصنيف.

## خارج النطاق الحالي

لا Database migration، لا تغيير RBAC، لا تغيير URLs/API contracts، لا تغيير scoring/payment، لا حذف ملفات، ولا إعادة بناء شاملة.

