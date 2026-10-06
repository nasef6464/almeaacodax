# ALM-SKILL-MASTERY-001 — Unified Skill Mastery Status

آخر تحديث: 2026-09-29  
Issue: #311  
Branch: `chatgpt/unified-skill-mastery-1-8`  
Depends on: #309 / PR #310  
Status: **IMPLEMENTATION COMPLETE — MERGE ONLY WHEN EXACT-HEAD CI IS GREEN**

## الهدف النهائي

مصدر حقيقة واحد:

`Question → exact main/subskill → Result evidence → SkillProgress → Smart Learning → Student Reports → Parent → Teacher/Supervisor`

لا توجد نسبة مهارة مستقلة لكل شاشة.

## 1) نتيجة الاختبار والمهارات الدقيقة

**منفذ في PR #310 / #309.**

- Canonical question evidence = `skillId + subSkillId`.
- Nested subskills resolve from `Skill.subSkills`.
- Result analysis stores main/sub hierarchy.
- No unrelated question supplementation.
- No silent fallback to another result attempt.

## 2) SkillProgress موحد

تم:
- إضافة `level`, `parentSkillId`, `parentSkill`.
- writer يحفظ main/sub hierarchy.
- `skillMasteryProjection.ts` يحل الاسم والنطاق من Taxonomy الحالي.
- unresolved historical IDs تحصل على `unresolvedTaxonomy=true` ولا تدخل التوصيات.
- `GET /quizzes/skill-progress` يعيد projection Canonical.
- صلاحيات الأدوار بقيت على المسارات الموجودة أصلًا: الطالب عبر `GET /quizzes/skill-progress`، ولي الأمر عبر `/parent/children-progress`، والمعلم/المشرف عبر `SchoolSkillAggregate`. لم نضف Endpoint موازيًا جديدًا.

## 3) Historical reconciliation

### Live Atlas Before
- Total `skillprogresses`: **693**
- Placeholder names: **29**
- Placeholder rows with current exact Taxonomy mapping: **28**
- Placeholder row without current mapping: **1**
  - `sk_1778134116475`

### Live Atlas Applied Safely
تم تحديث الـ28 صفًا القابلة للحل فقط:
- name
- level
- parentSkillId
- parentSkill
- pathId
- subjectId
- sectionId

**لم يتم تعديل:** mastery / evidenceCount / attempts / recentEvidence / history.

### Live Atlas After
- Placeholder names: **1**
- الـ1 المتبقي Legacy وغير محلول؛ لم يتم تخمين Mapping له.

تم إضافة:
- `npm --prefix server run audit:skill-progress-taxonomy` — Dry Run
- `npm --prefix server run repair:skill-progress-taxonomy` — Apply canonical metadata only

ملاحظة: توجد SkillProgress IDs تاريخية كثيرة لا تطابق Taxonomy الحالي؛ هذا متوافق مع ملاحظة DB-2 السابقة. لا يتم حذفها أو دمجها تلقائيًا حتى يوجد Historical Taxonomy Mapping صريح.

## 4) تقارير الطالب

تم تحويل Mastery source إلى `SkillProgress`:
- `pages/Reports/skillProgressReportProjection.ts`
- `Reports.tsx` يقرأ `api.getSkillProgress`.
- `examResults/questionAttempts` أصبحت compatibility/evidence fallback فقط عند تعذر read-model، وليست المصدر الأساسي للإتقان.
- النص الظاهر يوضح أن المهارة = حالة إتقان حالية من الأدلة.

### أزرار المهارة في «تقاريري»

لكل مهارة فعلية:
1. **شرح/فيديو** → نفس Foundation topic/subtopic.
2. **تدريب** → نفس Foundation topic + `topic.quizIds`.
3. **ملف الدعم** → نفس Foundation topic support tab.
4. **إعادة قياس** → recheck scoped لنفس skill.
5. دعم إضافي/حجز حصة اختياري عند استمرار الضعف.

إذا Mapping التأسيس غير موجود:
- يظهر **غير مرتبط بالتأسيس بعد**
- لا يوجد fallback إلى `/courses` أو `/dashboard?tab=saher` لمهارة معروفة.

## 5) Smart Learning Path

تم:
- إزالة `buildSmartPathSkillsFromResults(examResults)`.
- إضافة `useStudentSkillProgress`.
- Smart Path وOverview «خطوتك اليوم» يقرآن نفس SkillProgress المستخدم في Reports.

الهدف: نفس المهارة + نفس النسبة في التقرير والمسار الذكي.

## 6) ولي الأمر

تم:
- `/parent/children-progress` يقرأ الضعف من SkillProgress Canonical.
- `weakSkills: string[]` محفوظ للتوافق.
- إضافة `weakSkillDetails`: skillId/parent/path/subject/mastery/trend/evidence.
- التقرير الأسبوعي يستخدم SkillProgress بدل مهارات آخر اختبار فقط.
- Dashboard ولي الأمر وReports يفضلان البيانات Canonical، مع fallback قديم للقراءة فقط عند تعذر endpoint.

## 7) المعلم والمشرف

تم:
- `SchoolSkillAggregate` يخزن hierarchy في النتائج الجديدة.
- historical aggregate read يحل الاسم والـparent من Taxonomy.
- staff Reports يجلب `getSchoolSkillAggregates(groupBy='skill')` ويستخدمه كـ`weakestSkills` truth.
- quiz results تظل evidence/detail وليست mastery truth.
- RBAC/scoped student relationships لم يتم تخفيفها.

Live Atlas الحالي:
- `schoolskillaggregates` = **0 rows** في العينة الحالية؛ لا يوجد historical aggregate data لتعديله. يبدأ الامتلاء من evidence المدرسي الجديد.

## 8) End-to-End / Regression Gate

تم إضافة:
`scripts/smoke-unified-skill-mastery-contract.mjs`

ويتحقق من:
1. exact question main/subskill.
2. SkillProgress write/read hierarchy.
3. safe historical reconciliation.
4. Student Reports = SkillProgress.
5. Smart Path = SkillProgress.
6. Parent = child SkillProgress.
7. Teacher/Supervisor = SchoolSkillAggregate.
8. scoped RBAC.
9. Foundation actions lessons/quizzes/support/recheck.
10. منع generic remediation fallbacks.

تم ربطه بـ:
`npm run smoke:results`

## Exit Gate قبل الإغلاق

- [x] Frontend typecheck Green
- [x] API typecheck/build Green
- [x] `smoke:results` Green
- [x] `smoke:reports-role` Green
- [x] `smoke:global-student-journey` Green
- [x] Backend Integration Green
- [x] Deep Student E2E Green
- [x] Parent/Teacher/Supervisor role boundaries/contracts Green
- [x] Merge #310 first
- [ ] Merge stacked unified mastery PR (#312)
- [ ] Production live-safe verification on deployed SHA
- [x] One deterministic proof:
  - synthetic canonical rows A/B/C are checked in `smoke-unified-skill-mastery-contract.mjs`.
  - A = weak (35), B = strong (90).
  - unresolved/unrelated C is excluded.
  - structural contracts prove Student Report / Smart Path / Parent / Teacher-Supervisor consume the unified mastery chain.

## تعليمات لمن يكمل بعدي

ابدأ من Issue #311 وهذا الملف، ثم افحص exact-head CI. آخر دورة كاملة قبل إضافة هذا الـhandoff كانت Green على head `e005d0607ca7b9325281569f54027eee14ac0635`; أي commit بعده يجب أن يعيد كل الـgates قبل الدمج.  
لا تعيد بناء mastery من `examResults` داخل أي شاشة جديدة.  
لا تعدّل mastery/history أثناء taxonomy reconciliation.  
لا تعالج unresolved legacy IDs بالتخمين.  
أي remediation لمهارة معروفة يجب أن يبقى داخل Foundation mapping لنفس المهارة.
