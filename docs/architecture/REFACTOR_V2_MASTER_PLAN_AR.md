# خطة إعادة الهيكلة V2 لمنصة ALMEAA

> الفرع الآمن: `refactor/repository-v2-safe`
> نقطة الأساس: `f1e8a35950e3c952ab3609235ef8c2ed85584267`
> القاعدة: **لا تغيير في منطق المنتج أو العقود أو الروابط أثناء مرحلة النقل البنيوي.**

## 1. الهدف

تحويل المشروع من مستودع متضخم يصعب فهمه وتعديله إلى **Modular Monolith** واضح الحدود، قابل للتوسع أفقيًا، وآمن للتطوير بواسطة مطورين أو Agents بدون الحاجة لتحميل عشرات آلاف الأسطر في سياق واحد.

الأهداف غير القابلة للتفاوض:

- الحفاظ على جميع URLs الحالية في الواجهة.
- الحفاظ على جميع API endpoints الحالية في المرحلة البنيوية.
- الحفاظ على MongoDB schema compatibility وعدم تنفيذ أي destructive migration أثناء إعادة ترتيب الملفات.
- الحفاظ على أسماء متغيرات البيئة وواجهات Vercel/Render الحالية ما لم توجد Migration مستقلة.
- عدم حذف feature لأن مكانها غير واضح؛ يتم تحديد owner/domain لها أولًا.
- كل نقل ملف له mapping من المسار القديم إلى الجديد.
- كل خطوة قابلة للرجوع Commit-by-Commit.

## 2. صورة الوضع الحالي

المشروع يحتوي أساسًا جيدًا من الناحية الوظيفية والأمنية، لكنه يعاني من تضخم وحدود غير واضحة:

- frontend موزع في الجذر بين `pages/`, `components/`, `dashboards/`, `contexts/`, `services/`, `store/` وغيرها.
- backend مجمع تحت `server/src` مع route files كبيرة جدًا تربط عدة مسؤوليات.
- `App.tsx` مسؤول عن routing + bootstrap + prefetch + SEO + lifecycle.
- `store/useStore.ts` يجمع server state وclient state وCRUD لعدة domains.
- `services/api.ts` facade ضخم لكل API domains.
- بعض الشاشات الإدارية أصبحت God Components ضخمة يصعب تعديلها بأمان.
- يوجد Redis/BullMQ/Socket.IO بالفعل، وهي قاعدة جيدة للتوسع ويجب استغلالها بدل إضافة تقنيات بلا داعٍ.

## 3. مخاطر التوسع التي تحتاج معالجة بعد تثبيت الهيكل

### P0 - Realtime notifications

SSE الحالي يعمل polling على MongoDB لكل اتصال كل 10 ثوانٍ، ويجري query للإشعارات الجديدة + count لغير المقروء. هذا لا يجب أن يكون المسار النهائي عند نمو عدد الطلاب. الهدف: الاحتفاظ بعقد realtime للمستخدم مع تحويل المصدر إلى event fan-out عبر Redis/Socket/PubSub بدل polling لكل مستخدم.

### P0 - Scheduled parent reports

التقرير الأسبوعي يعمل داخل عملية API عبر `setInterval`، يقرأ كل أولياء الأمور ثم ينفذ query لكل ولي أمر. عند تشغيل عدة API instances يمكن تنفيذ المهمة أكثر من مرة. الهدف: نقلها إلى Queue/Scheduler مع idempotency + distributed lock + batch aggregation.

### P0 - Bootstrap payload growth

`/content/bootstrap` يستطيع تحميل topics/lessons/libraryItems كمجموعات كبيرة دفعة واحدة. هذا سيصبح عبئًا على Mongo/network/browser كلما زاد المحتوى. الهدف: route-scoped data loading + pagination/cursors + cache، مع Compatibility Layer خلال الانتقال.

### P1 - Group membership model

`Group` يحتوي arrays مثل `studentIds` و`supervisorIds`. هذا مناسب للبداية لكنه يصبح سقفًا عند المدارس الكبيرة بسبب نمو الوثيقة وعمليات تحديث arrays. الهدف طويل المدى: `GroupMembership` collection مفهرسة، مع migration تدريجي وdual-read/dual-write قبل إزالة arrays القديمة.

### P1 - PWA API caching

Service Worker لا يجب أن يخزن authenticated API responses كقاعدة عامة. سيتم حصر caching في endpoints عامة ومعلومة بدل pattern عام `/api/`.

## 4. الهيكل المستهدف

```text
ALMEAA/
├─ apps/
│  ├─ web/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ router/
│  │  │  │  ├─ bootstrap/
│  │  │  │  ├─ providers/
│  │  │  │  └─ seo/
│  │  │  ├─ core/
│  │  │  │  ├─ api/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ state/
│  │  │  │  └─ observability/
│  │  │  ├─ features/
│  │  │  │  ├─ quizzes/
│  │  │  │  ├─ questions/
│  │  │  │  ├─ exams/
│  │  │  │  ├─ schools/
│  │  │  │  ├─ reports/
│  │  │  │  ├─ payments/
│  │  │  │  └─ ...
│  │  │  └─ shared/
│  │  │     ├─ ui/
│  │  │     ├─ lib/
│  │  │     └─ types/
│  │  └─ public/
│  └─ api/
│     └─ src/
│        ├─ app/
│        ├─ modules/
│        │  └─ <domain>/
│        │     ├─ http/
│        │     ├─ application/
│        │     ├─ domain/
│        │     └─ infrastructure/
│        ├─ shared/
│        └─ infrastructure/
├─ packages/
│  └─ contracts/        # مرحلة لاحقة، API DTOs/schemas المشتركة
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  ├─ smoke/
│  ├─ audits/
│  └─ load/
├─ tools/
├─ infrastructure/
├─ docs/
└─ legacy/
```

## 5. قاعدة ownership

الكود يوضع حسب **business domain أولًا** وليس حسب نوع الملف فقط.

أمثلة:

- بنك الأسئلة -> `questions`
- الاختبارات القصيرة/الموجهة -> `quizzes`
- المحاكيات والجلسات الامتحانية -> `exams`
- النتائج -> `results`
- التحليلات المركبة -> `reports`
- المدارس والفصول والعلاقات المؤسسية -> `schools`
- المحتوى والدروس -> `lessons/learning-content`
- الاشتراكات والدفع -> `payments/access`

أي cross-domain dependency جديد يجب أن يمر عبر service/contract واضح بدل import عشوائي لمكون داخلي من feature آخر.

## 6. استراتيجية التنفيذ الآمن

### Phase 0 — Baseline & Safety Gates

1. تثبيت الفرع الحالي وعدم لمس `main`.
2. تسجيل commit baseline وحالة deployment قبل أي refactor.
3. عمل inventory لكل الملفات + migration map.
4. إضافة structural/import validators.
5. تحديد route/API contract manifests.
6. عدم دمج أي commit إذا أحدث broken imports أو route loss.

### Phase 1 — Structural Migration فقط

- نقل frontend إلى `apps/web`.
- نقل backend إلى `apps/api`.
- نقل smoke/audit/load tests.
- نقل deployment/tools/docs.
- تحديث relative imports/config paths/npm scripts.
- **ممنوع** تعديل business logic في نفس commit.

Gate:

```bash
npm ci
npm --prefix apps/api ci
npm run typecheck
npm run server:check
npm run build
npm run server:build
```

ثم smoke/route/import regression checks.

### Phase 2 — Compatibility Facades

تفكيك الملفات المركزية مع الحفاظ على API الداخلي الحالي:

- `App.tsx` -> router/bootstrap/seo/providers.
- `services/api.ts` -> domain API clients مع إبقاء `api` facade مؤقتًا.
- `store/useStore.ts` -> slices مع إبقاء `useStore` public API.
- route files -> routers/controllers/services/schemas بدون تغيير endpoints.

### Phase 3 — Hotspot Decomposition

قاعدة: **Hotspot واحد لكل PR/commit group**.

أولوية البداية:

1. `SchoolsManager`
2. `Reports`
3. `content.routes`
4. `quiz.routes`
5. `Dashboard`
6. `useStore`
7. `api client`

نستخرج أولًا UI/pure helpers، ثم hooks/services، وأخيرًا business logic. لا يتم تغيير data model أثناء extraction.

### Phase 4 — Scalability Hardening

- استبدال per-client Mongo polling في realtime.
- Queue/Scheduler للتقارير الأسبوعية والمهام الثقيلة.
- server-side pagination/cursors للبيانات المتزايدة.
- تقليل global bootstrap وإلغاء تحميل full datasets للطالب دون حاجة.
- مراجعة Mongo indexes عبر query plans، وليس إضافة indexes عشوائيًا.
- migration تدريجي لـ GroupMembership.
- Redis يصبح mandatory للتشغيل متعدد النسخ للـrate limit/realtime/queues.

### Phase 5 — Contracts & Test Pyramid

- shared API contracts في `packages/contracts` تدريجيًا.
- unit tests للخدمات pure/business rules.
- API integration tests للـcritical workflows.
- Playwright E2E لمسارات الطالب/المشرف/الإدارة.
- الاحتفاظ بالـsmoke static contracts كطبقة إضافية، لا كبديل عن الاختبارات السلوكية.
- load-test gates موثقة حسب البيئة الفعلية.

### Phase 6 — Deployment & Rollout

- Preview deployment من refactor branch.
- Smoke/E2E ضد Preview + API staging.
- مقارنة main/refactor على المسارات الحرجة.
- merge بعد green gates فقط.
- rollback = الرجوع إلى commit السابق، بدون DB destructive changes.

## 7. Definition of Done لكل خطوة

لا تعتبر أي خطوة مكتملة إلا إذا تحقق:

- لا broken relative imports.
- لا route/API endpoint مفقود مقارنة بالbaseline.
- frontend typecheck/build لا يتراجع عن baseline.
- backend typecheck/build لا يتراجع عن baseline.
- smoke tests الناجحة في baseline لا تتحول إلى failed.
- auth/RBAC/CSRF/quiz submission/payment flows لم تتغير ضمن structural refactor.
- deployment configs تشير إلى المسارات الجديدة الصحيحة.
- docs/migration map محدثة.

## 8. قاعدة التعامل مع أحدث تعديلات Codex/Agents

الحقيقة المصدرية هي **آخر محتوى موجود في GitHub branch عند بدء النقل**، وليس نسخة ZIP أقدم. أي mapping/هيكل سابق يستخدم كمرجع للتنظيم فقط؛ محتوى الملفات المنقول يجب أن يحتفظ بأحدث إصلاحات GitHub، ومنها إصلاحات quiz integrity/group re-validation/quiz snapshot وغيرها.

## 9. قرارات معمارية

- لا Microservices الآن. المشروع مناسب أكثر لـModular Monolith منظم وقابل للتوسع أفقيًا.
- لا إعادة كتابة شاملة Big Bang.
- لا تغيير UI/UX ضمن commits الخاصة بالنقل البنيوي.
- لا تغيير DB schema مع نقل الملفات.
- لا تغيير endpoint path لإجبار frontend على التنظيم الجديد.
- نستخدم compatibility facades ثم نحذفها فقط بعد اكتمال migration واختبار callers.

## 10. أول مخرجات التنفيذ

1. Inventory آلي للمستودع الحالي.
2. Migration map V2 من كل old path إلى owner جديد.
3. Safety validators.
4. Structural migration على هذا الفرع.
5. تقرير build/smoke قبل وبعد.
6. بعد ثبات الهيكل: تفكيك hotspots والتوسعة بالتدرج.
