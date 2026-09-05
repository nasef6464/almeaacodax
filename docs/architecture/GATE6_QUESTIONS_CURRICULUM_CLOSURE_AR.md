# Gate 6 — Questions + Curriculum Closure Evidence

التاريخ: 2026-09-05

الفرع: `codex/gate6-questions-curriculum-operations`

المرجع الأساسي: Gate 5 merged on `main` at `3554075747be7a9c542584a6af736cc71347f690`.

## Questions — CLOSED / VERIFIED Strong MVP

تم إغلاق نطاق Questions التجاري في Gate 6 بعد إثبات السلسلة الحالية كاملة بدل افتراض فجوات جديدة لمجرد الاستمرار في التطوير.

الإثبات الحالي يشمل:

- Question Bank حقيقي مع create/edit/delete/duplicate/preview ومراجعة واعتماد/رفض.
- الأنواع المدعومة والمخزنة: `mcq`, `true_false`, `essay`.
- تصنيف السؤال: Path → Subject → Main Skill/Section → Sub-skills، إضافة إلى difficulty / examType / source / year.
- قراءة server-backed paginated ومحدودة بحد أقصى 100 سؤال في الصفحة مع search/filter contracts.
- Excel import مع template، validation، row-level errors، وpreview-before-apply.
- Review-first AI draft عبر الـAI endpoint الحالي؛ التوليد لا يحفظ السؤال تلقائيًا.
- إزالة أي ادعاء مزيف باستخراج PDF/ملفات من مسار لا يدعم ذلك.
- Question-level usage/performance analytics مبنية على `QuestionAttempt` الموجود فعلًا، وتعرض attempts / accuracy / average recorded time بدون اختراع quality score أو thresholds.
- Teacher analytics تلتزم بنطاق managed paths/subjects الموجود، والرد لا يعيد هويات الطلاب.

### Evidence

- `scripts/smoke-gate6-question-ai-authoring-contract.mjs`
- `scripts/smoke-gate6-question-usage-analytics-contract.mjs`
- `scripts/smoke-gate6-questions-commercial-closure-contract.mjs`
- Platform V3 Phase + Handover run `33961396322` على commit `20fecf001caeb16be13246b7eacf39d62664c4c3` مر بنجاح، بما في ذلك عقود Questions الثلاثة والـfull handover suite.

لا يوجد مبرر حاليًا لإضافة نوع سؤال جديد أو quality heuristic أو إعادة بناء Question Bank ضمن Gate 6. أي توسع لاحق يعتبر Product Change منفصلًا.

## Curriculum / Learning Ownership — CLOSED / VERIFIED Strong MVP

تم إثبات أن تعريف المنهج/التصنيف منفصل عن تقدم المتعلم ومحتوى التعلم، وأن Subject Learning Space يستهلك هذه التعريفات ولا يملك نسخة موازية منها.

الإثبات الحالي يشمل:

- تعريفات Path / Level / Subject / Section / Skill موجودة في models/routes مستقلة للتصنيف.
- mutations للتصنيف على الخادم Admin-owned.
- `SkillProgress` منفصل ومقيد بـ`userId + skillId` ولا يتم تخزين mastery/attempts داخل taxonomy definitions.
- `Skill` يحتفظ بمراجع content associations فقط مثل lessonIds/questionIds، وليس learner progress.
- Subject settings الخاصة بالـLearning Space هي presentation/access policy وليست progress metrics.
- Admin UI يملك أسطح إدارة فعلية للمسارات والمواد والمهارات، وعملياتها تمر عبر `/taxonomy/*` API boundary.
- `PathsManager` يعيد استخدام مراكز Courses / Foundation / Questions / Quizzes / Library داخل سياق المادة بدل إنشاء persistence موازٍ.
- Gate 2 Subject Learning Space يظل مغلقًا ولا يُعاد فتحه في Gate 6.

### Evidence

- `scripts/smoke-gate6-curriculum-ownership-contract.mjs`
- `scripts/smoke-gate6-curriculum-commercial-closure-contract.mjs`
- Platform V3 Phase + Handover run `33961396322` مر بنجاح بعقدي Curriculum وباقي handover suite.

## Gate 6 status after this checkpoint

- Questions: `CLOSED / VERIFIED Strong MVP`.
- Curriculum/Learning ownership: `CLOSED / VERIFIED Strong MVP`.
- Courses: next active area. المطلوب فصل واضح في ownership بين Learning Product وبين Package/Commerce Product مع الحفاظ على compatibility الحالية وعدم عمل schema rewrite بلا داعٍ.
- Operations: بعد Courses، ثم final Gate 6 release-candidate proof.

## Guardrails

- لا global `tenantId`.
- لا SaaS multi-tenancy.
- لا microservices split.
- لا تعديل Assessment scoring/session semantics.
- لا أدوار RBAC جديدة.
- لا production restore أو destructive data operation بدون تفويض صريح.
- لا ادعاء capacity/load بدون staging test موثق ومصرح به.
