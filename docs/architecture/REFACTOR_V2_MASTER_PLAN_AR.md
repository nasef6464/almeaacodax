# خطة إعادة الهيكلة V2 لمنصة ALMEAA

> الفرع الآمن: `refactor/repository-v2-safe`  
> القرار المعماري الحاكم: `ADR-001-RISK-MINIMIZED-MODULAR-MONOLITH.md`  
> القاعدة: **لا تغيير في منطق المنتج أو العقود أو الروابط أثناء مرحلة إعادة التنظيم البنيوي.**

## 1. الهدف

تحويل المشروع تدريجيًا من مستودع كبير بحدود مسؤولية غير واضحة إلى **Modular Monolith** منظم حسب نطاقات العمل، قابل للتوسع، وأسهل في الفهم والتطوير بواسطة المطورين وAgents، بدون Big Bang rewrite وبدون خلط إعادة ترتيب الكود مع تغيير البنية التشغيلية.

الأهداف غير القابلة للتفاوض:

- الحفاظ على URLs الحالية في الواجهة أثناء المرحلة البنيوية.
- الحفاظ على API methods/paths وrouter mounts الحالية.
- الحفاظ على MongoDB schema semantics وعدم تنفيذ destructive migration ضمن file-move/refactor commits.
- الحفاظ على أسماء متغيرات البيئة وعقود Vercel/Render/Docker الحالية.
- عدم حذف أي feature قبل إثبات عدم وجود callers أو عقود تعتمد عليها.
- كل تغيير يكون صغيرًا، قابلًا للاختبار والرجوع Commit-by-Commit.
- أي تحسن معماري نصل إليه يتحول إلى حد أدنى دائم في CI ولا يسمح بالتراجع عنه.

## 2. القرار المهم: تثبيت جذور النشر

لن ننقل المشروع في Refactor V2 إلى `apps/web` و`apps/api` لمجرد تحسين شكل المجلدات. هذا سيجمع مخاطرة تنظيم الكود مع مخاطرة تغيير جذور البناء والنشر في Vercel/Render/Docker.

لذلك تظل جذور التشغيل الحالية ثابتة:

```text
repository/
├─ package.json              # frontend/Vite root stays here
├─ index.html
├─ vite.config.ts
├─ vercel.json
├─ public/
├─ src/                      # target frontend source namespace
├─ server/                   # backend/Render package root stays here
│  └─ src/
├─ scripts/
├─ tools/
├─ tests/
└─ docs/
```

نقل package roots إلى workspace منفصل يمكن تقييمه لاحقًا فقط إذا وُجد سبب تشغيلي حقيقي، وليس كشرط للحصول على كود منظم.

## 3. صورة الوضع الحالي

المشروع وظيفيًا غني لكنه يحتوي على تراكمات تجعل التطوير عالي المخاطرة:

- frontend موزع حاليًا بين `pages/`, `components/`, `dashboards/`, `contexts/`, `services/`, `store/`, `utils/` وغيرها.
- backend داخل `server/src` لكنه يحتوي route/service files كبيرة تربط عدة مسؤوليات.
- `App.tsx` يجمع routing/bootstrap/prefetch/SEO/lifecycle.
- `store/useStore.ts` يجمع client state وserver state وعمليات عدة domains.
- `services/api.ts` facade كبير لعدد كبير من API domains.
- توجد God Components وGod Routes بعدة آلاف من الأسطر.
- عدد كبير من smoke/audit scripts يعتمد مباشرة على أسماء ومسارات ملفات المصدر الحالية، لذلك النقل الجماعي سيكسر أدوات الحماية حتى لو بدا التطبيق ظاهريًا سليمًا.

## 4. خط الأساس والحماية

لدينا خط أساس immutable داخل:

```text
docs/architecture/baseline/
```

ويتم توليد snapshot حالي باستخدام TypeScript AST عبر:

```text
tools/refactor/repository-audit.mjs
```

ثم المقارنة عبر:

```text
tools/refactor/architecture-gate.mjs
```

العقود المحمية تشمل:

- frontend route literals;
- backend HTTP methods/paths;
- router mounts;
- runtime environment-key contract;
- unresolved runtime imports;
- dependency cycles;
- progressive hotspot budget.

كما يوجد Quality Gate في GitHub Actions يقوم بـtypecheck/build وعقود route/runtime/quiz/auth/API security.

## 5. الـProgressive Architecture Budget

الـimmutable baseline يخبرنا كيف كان المشروع قبل النقل، لكنه لا يكفي بعد أن نحقق تحسينًا. لذلك يوجد:

```text
docs/architecture/ARCHITECTURE_BUDGET.json
```

القاعدة هي: **نشدّد الميزانية فقط ولا نرخيها لتجاوز CI.**

تم بالفعل الوصول في الفرع إلى:

- `0` unresolved runtime relative imports.
- `0` runtime dependency cycles.

وبالتالي أصبح رجوع أي منهما ممنوعًا في التغييرات التالية.

## 6. الهيكل المستهدف للواجهة

مع إبقاء Vite package في جذر المستودع:

```text
src/
├─ app/
│  ├─ router/
│  ├─ bootstrap/
│  ├─ providers/
│  └─ seo/
├─ core/
│  ├─ api/
│  ├─ auth/
│  ├─ state/
│  └─ observability/
├─ features/
│  ├─ auth/
│  ├─ schools/
│  ├─ courses/
│  ├─ learning/
│  ├─ questions/
│  ├─ quizzes/
│  ├─ exams/
│  ├─ reports/
│  ├─ payments/
│  ├─ notifications/
│  ├─ ai/
│  ├─ content/
│  └─ operations/
└─ shared/
   ├─ ui/
   ├─ lib/
   └─ types/
```

`shared` ليس مكانًا للكود الذي لا نعرف صاحبه؛ يجب أن يحتوي فقط على كود محايد فعليًا عن الـbusiness domains.

## 7. الهيكل المستهدف للـAPI

مع إبقاء `server` كـpackage root:

```text
server/src/
├─ app/                          # composition فقط
├─ modules/
│  └─ <domain>/
│     ├─ http/                   # routes/controllers/validation
│     ├─ application/            # use cases/orchestration
│     ├─ domain/                 # policies/types/contracts
│     └─ infrastructure/         # persistence/providers/adapters
├─ shared/
└─ infrastructure/
```

الـHTTP layer يجب أن يصبح رفيعًا: auth/validation -> application use case -> response mapping.

## 8. خريطة الـDomains

- `auth`: الهوية، الدخول، الحساب، كلمات المرور، الأدوار.
- `schools`: المدارس، الفصول/المجموعات، المشرفون، المعلمون، علاقات الطالب وولي الأمر.
- `courses`: الكتالوج، المواد، الأقسام، إعداد المناهج.
- `learning`: الدروس، المواضيع، المشغل، المكتبة، المراجعة.
- `questions`: بنك الأسئلة، المهارات، التأليف والاستيراد.
- `quizzes`: الإنشاء، التعيين، الوصول، الإرسال، التصحيح وسياسات الاختبار.
- `exams`: المحاكيات والاختبارات العامة والجلسات الامتحانية.
- `reports`: النتائج والتحليلات والتقدم وread models.
- `payments`: الباقات والعضويات والدفع وسياسة الوصول التجاري.
- `notifications`: إنشاء الإشعارات، التسليم، providers، read state، realtime.
- `ai`: مزودو ووظائف الذكاء الاصطناعي.
- `content`: المحتوى التحريري والصفحة الرئيسية والإعدادات العامة للمحتوى.
- `operations`: health/backups/monitoring/integrations والمهام التشغيلية.

## 9. ما تم إنجازه في المرحلة التأسيسية

- إنشاء inventory وmigration candidates آليًا.
- تثبيت route/API/env contract baseline.
- إضافة architecture gate وCI safety gate.
- إصلاح مشاكل baseline كانت تمنع فحوصات النوع/سلامة الاختبارات.
- استخراج `AuthUser` إلى عقد domain حقيقي بدل اعتماد JWT على declaration file.
- إزالة unresolved runtime import الذي كان موجودًا في auth/JWT.
- استخراج notification delivery contracts إلى `modules/notifications/domain`.
- فك دورة الاعتماد بين `notificationService` و`notificationProviders` بدون تغيير API العام.
- استخراج عقود panels في `SchoolsManager` وإزالة child-to-parent imports.
- الوصول إلى **صفر runtime dependency cycles** مع استمرار typecheck/build وجميع العقود الحرجة بالنجاح.

## 10. استراتيجية التنفيذ من الآن

### Phase A — Boundaries before moves

قبل نقل مئات الملفات:

1. استخراج contracts/types/pure helpers من الـGod files.
2. إنشاء public facades واضحة لكل domain.
3. منع child -> parent imports والدورات الدائرية.
4. تقليل اعتماد smoke scripts على أسماء الملفات الداخلية كلما أمكن.
5. تشغيل Quality Gate بعد كل مجموعة صغيرة.

### Phase B — Compatibility facades

- `services/api.ts` -> domain API clients مع إبقاء facade الحالي مؤقتًا.
- `store/useStore.ts` -> domain slices/selectors مع الحفاظ على public API أثناء الانتقال.
- `App.tsx` -> router/bootstrap/providers/SEO تدريجيًا.
- backend routes -> validation/controller/application services بدون تغيير endpoint.

### Phase C — Hotspot decomposition

Hotspot واحد في كل batch عالي المخاطرة. الأولوية الحالية:

1. `SchoolsManager.tsx`
2. `pages/Reports.tsx`
3. `server/src/routes/content.routes.ts`
4. `server/src/routes/quiz.routes.ts`
5. `pages/Dashboard.tsx`
6. `store/useStore.ts`
7. `services/api.ts`

الترتيب داخل hotspot:

1. pure constants/types/helpers;
2. presentation components;
3. hooks/state adapters;
4. application/domain services;
5. إزالة compatibility code فقط بعد إثبات عدم وجود callers.

لا يتم استبدال ملف 3k–5k سطر دفعة واحدة.

### Phase D — Normalize frontend under `src/`

بعد تقليل coupling مع المسارات الحالية:

- ننقل مجموعات صغيرة تحت `src/app`, `src/core`, `src/features`, `src/shared`.
- يبقى package root كما هو.
- أي caller path-coupled smoke contract يتم تحديثه atomically مع النقل.
- لا يتم تغيير routes أو UI behavior بسبب النقل.

### Phase E — Backend domain modules

نحوّل `server/src/routes/models/services` تدريجيًا إلى `server/src/modules/<domain>` مع إبقاء composition الحالية وcompatibility exports لحين اكتمال callers.

## 11. مخاطر التوسع التي ستعالج بعد تثبيت الحدود

### P0 — Realtime notifications

المسار الحالي الذي يعتمد polling على Mongo لكل اتصال لا يصلح للنمو الكبير. الهدف event-driven fan-out عبر Redis/Socket/PubSub مع الحفاظ على عقد الواجهة.

### P0 — Scheduled parent reports

المهام الحرجة لا تبقى process-local `setInterval` عند تشغيل عدة API instances. الهدف Queue/Scheduler + idempotency + distributed lock.

### P0 — Growing read/bootstrap payloads

المحتوى والنتائج والقوائم الكبيرة تنتقل إلى route-scoped reads + server pagination/cursors + cache policy، بدل تحميل datasets كاملة.

### P1 — Group membership

الـarrays المتضخمة مثل `studentIds` تحتاج مستقبلًا `GroupMembership` collection مفهرسة عبر backfill وdual-read/dual-write قبل إزالة الشكل القديم.

### P1 — PWA authenticated caching

يجب تضييق runtime caching إلى endpoints عامة/آمنة صراحةً بدل caching عام لكل `/api/`.

## 12. قواعد الأداء والتوسع

- لا endpoint جديد يعيد collection متزايدة بلا pagination/cursor إلا لسبب موثق وحد صغير معروف.
- مراجعة query shape/indexes قبل وصف feature بأنه قابل للتوسع.
- أي background work متعدد النسخ يحتاج idempotency/locking.
- لا per-user polling loops جديدة على Mongo.
- لا نضيف microservice قبل وجود سبب isolation/scaling/deployment واضح.
- Redis/queues الموجودة تُستخدم قبل إدخال بنية تحتية جديدة مكررة.

## 13. قواعد حجم الملفات

- الهدف الطبيعي للملف الجديد/المعاد تنظيمه: 300–400 سطر أو أقل.
- 400–700 يحتاج سببًا واضحًا.
- أكثر من 700 لا يُقبل في كود جديد عادي بدون مبرر استثنائي.
- عدد legacy files فوق 400 سطر يجب أن ينخفض تدريجيًا، وليس أن يزيد.

## 14. Definition of Done لكل Batch

لا تعتبر الخطوة ناجحة إلا إذا:

- frontend typecheck ناجح.
- backend typecheck ناجح.
- frontend production build ناجح.
- backend production build ناجح.
- architecture gate ناجح.
- routes/API/env contracts لم تتغير في structural batch.
- unresolved runtime imports لا تتجاوز الميزانية الحالية.
- dependency cycles لا تتجاوز الميزانية الحالية.
- عدد hotspots لا يتجاوز الميزانية الحالية.
- route loading/runtime source/quiz integrity/auth/API security contracts ناجحة.
- لا schema/product/security change مخفي داخل refactor commit.

## 15. قاعدة التعامل مع Codex وAgents

الحقيقة المصدرية هي آخر محتوى في GitHub branch، وليس نسخة ZIP أو reorganized snapshot أقدم. قبل تعديل أي domain يجب قراءة:

1. `AGENTS.md`
2. `docs/architecture/PROJECT_MAP.md`
3. هذا الملف
4. الـpublic entry points/callers الخاصة بالـdomain

ثم تعديل أصغر مساحة ممكنة وتشغيل البوابات قبل الانتقال للخطوة التالية.

## 16. Rollout النهائي

بعد ثبات الهيكل والـcritical journeys:

1. Preview/Staging deployment من فرع refactor.
2. Smoke + API integration + E2E للمسارات الحرجة.
3. Load tests بأحجام واقعية ومقاييس واضحة.
4. مقارنة main/refactor.
5. دمج تدريجي بعد green gates فقط.
6. rollback يبقى commit-based بدون destructive DB migration في نفس الإصدار.
