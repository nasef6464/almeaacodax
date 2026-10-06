# ALMEAA — بروتوكول استلام وتنفيذ التعلم التكيفي لأي Agent

> Companion إلزامي لـ `ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md`.
> الغرض: إذا توقف Agent، يستلم التالي من آخر Evidence مثبتة، لا من الذاكرة ولا من التخمين.

## ترتيب القراءة قبل أي تعديل
1. `docs/architecture/ADAPTIVE_MASTERY_FINAL_MASTER_PLAN_AR.md`
2. `docs/CURRENT_EXECUTION_PLAN_AR.md`
3. أحدث handoff/current-state وmodule/directory maps.
4. حالة GitHub الفعلية: main SHA، branch/PR HEAD، CI exact-head، open PRs.
5. ملفات/اختبارات المرحلة الجارية فقط بعد تحديدها من السجل.

## قاعدة مصدر الحقيقة
- GitHub/CI exact-head = حقيقة حالة التنفيذ الزمنية.
- Master Plan = حقيقة التصميم والعقود لهذه المنظومة.
- Backend = حقيقة scoring/evidence/mastery/access.
- لا تعتبر رسالة محادثة أو تقرير Agent دليلاً إذا خالف الكود/CI.
- لا تعيد عملاً موثقًا ومثبتًا Green إلا إذا ظهر regression جديد.

## دورة كل مرحلة
Inspect -> reproduce/baseline -> root-cause -> design smallest safe change -> implement full-stack as needed -> modularize only at real responsibility boundaries -> preserve compatibility/data -> targeted tests -> typecheck/build/backend checks -> performance/bandwidth/security check -> commit/push -> exact-head CI -> inspect/fix failures -> update docs/maps/ledger -> mark phase closed -> next phase.

## قواعد Full-stack
- لا UI-only fix إذا العقد يحتاج backend/API/data correction.
- لا backend change بدون فحص consumers/frontend/contracts.
- API payloads bounded: projection/pagination، ولا full history/question bank.
- Models/migrations additive أولاً؛ dry-run/backfill/verify/cutover؛ rollback معروف.
- Evidence idempotent؛ منع double-counting.
- multi-path scope دائمًا: user + path + subject + skill.
- reports/adaptive/readiness تعتمد server truth/read models، localStorage cache UI فقط.

## قواعد الأداء والتكلفة
- Internal-first؛ لا AI للmastery/trend/readiness/routing/reports/review.
- YouTube links/metadata فقط؛ video bytes لا تمر عبر API.
- text-first للفظي.
- صور الأسئلة على التخزين الحالي حتى migration مستقلة مقاسة.
- incremental aggregates + indexes + cache/ETag عند الملاءمة.
- لا N+1/COLLSCAN غير مبرر؛ bulk operations عند ثبوت الحاجة.
- AI Gateway explicit action، minimal context، sequential provider fallback، circuit breaker، token/rate budgets.
- سجل baseline/after: requests, bytes, API p50/p95, DB queries/indexes, CPU/RAM إن توفر, media bandwidth, AI calls/tokens.

## قواعد التقسيم
- Modular Monolith؛ لا microservices مبكرة.
- قسّم عند ownership حقيقي: domain/service/repository/read-model/presentation/adapter.
- لا تقسيم تجميلي لمجرد عدد الأسطر.
- لا duplicate authority بعد النقل؛ compatibility adapter مؤقت ومسجل.
- لا God files جديدة.

## بوابة الانتقال
لا تبدأ المرحلة التالية إلا بعد:
1. Definition of Done للمرحلة.
2. targeted/local checks المناسبة Green.
3. exact-head required CI Green أو blocker خارجي موثق بدقة.
4. تحديث execution ledger/handoff بالـSHA/PR/run IDs وما تغير وما بقي.
إذا blocker خارجي لا يمنع عملاً مستقلاً آمناً، استمر في ذلك العمل ولا تخفِ blocker.

## سجل الاستلام الإلزامي لكل مرحلة
عند بدء/إنهاء مرحلة، حدّث handoff/ledger بهذه الحقول:
- Phase / status: NOT_STARTED | IN_PROGRESS | BLOCKED | DONE
- branch / PR / exact HEAD SHA
- objective
- inspected ownership/files
- root cause/findings
- changes made
- data/schema/migration impact
- API/backend/frontend impact
- tests run locally + outcomes
- CI run IDs + outcomes
- resource baseline/after
- compatibility/rollback
- known blockers
- next exact action

## ممنوعات
- لا weakening لاختبار لتمرير CI.
- لا destructive migration أو حذف legacy قبل إثبات cutover.
- لا hard-coded path/subject assumptions.
- لا خلط نتائج قدرات/تحصيلي/نافس أو كمي/لفظي.
- لا AI fallback متوازٍ يضاعف التكلفة.
- لا ادعاء performance/scale/production readiness بلا evidence.
- لا merge لأن PR mergeable فقط؛ required gates أولاً.
- لا تنفيذ ميزة جديدة أثناء إصلاح root cause إذا كانت خارج المرحلة إلا لو dependency ضرورية ومسجلة.

## نقطة الاستئناف الحالية
المرحلة الحالية هي Phase 0: إغلاق PR #186 exact-head. بعد إغلاقها ينتقل التنفيذ بالترتيب الموجود في Master Plan، ولا يقفز مباشرة لمرحلة لاحقة.
