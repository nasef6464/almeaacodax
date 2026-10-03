# ALM-FND-SKILL-LOCK-001 — Foundation SubTopic ↔ SubSkill Canonical Control

آخر تحديث: 2026-09-30

## القانون الثابت

`Foundation SubTopic → one or more SubSkills`

المصدر القانوني للربط هو `Topic.skillIds`. يبقى `Topic.skillId` هو المهارة الأساسية/الأولى للتوافق مع المسارات القديمة. يمكن أن ترتبط المهارة نفسها بأكثر من Topic، ولا يوجد جدول Mapping موازٍ.

## خط الأساس قبل الإغلاق

- Quant Main Skills ↔ Main Foundation Topics: `25/25`.
- Quant SubSkills ↔ Foundation SubTopics: `95/95`.
- Missing mappings: `0`.
- Mismatched mappings: `0`.
- PR #314 طبق حراسة الكتابة في API والإدارة وربط الموارد التابعة بالمهارة.
- Issue التتبع: #313.

## ضوابط الكتابة

- أي Topic ابن (`parentId != null`) يجب أن يحمل مهارة فرعية واحدة على الأقل داخل `skillIds`، مع حفظ أول مهارة أيضًا في `skillId` للتوافق.
- كل عنصر داخل `skillIds` يجب أن يكون SubSkill حقيقيًا، وليس Main Skill.
- جميع المهارات المختارة للموضوع الفرعي يجب أن تتبع نفس Main Skill / Section للأب، وأن تتوافق مع Path / Subject.
- يسمح بربط Topic واحد بأكثر من SubSkill، كما يسمح باستخدام نفس SubSkill في أكثر من Topic تأسيسي.
- عند تعديل `skillId` يتم استبدال المهارة القديمة على الموارد المرتبطة بدل إبقاء ربط stale.
- الفيديوهات/الدروس والتدريبات وملفات الدعم ترث مهارة الـSubTopic؛ لا تحتاج Mapping مستقل.

## ضوابط الإدارة

`dashboards/admin/FoundationManager.tsx`

- اختيار المهارة الفرعية مطلوب عند إنشاء/تعديل SubTopic.
- زر الحفظ معطل حتى اختيار SubSkill.
- القائمة تضيق حسب Main Foundation Topic / Section.
- يمكن ربط أكثر من فيديو/درس وتدريب وملف دعم بالـSubTopic نفسه.

## توجيه الطالب

- شرح/فيديو → نفس SubTopic المرتبط Canonically عبر `Topic.skillId`.
- تدريب → تبويب تدريبات نفس SubTopic.
- ملف الدعم → تبويب دعم نفس SubTopic.
- إعادة القياس → نفس SubSkill.
- SubSkill لا يملك `Topic.skillId` مطابقًا → **لا fallback بالعنوان أو legacy id أو scoring**؛ لا يتم توجيه الطالب إلى محتوى عام أو Topic آخر.
- Heuristic compatibility يبقى فقط للـMain Skill، وليس SubSkill.

الملفات الرئيسية:
- `utils/foundationSkillTarget.ts`
- `pages/Reports/recommendationViewModel.ts`
- `pages/Results.tsx` — يستخدم نفس Recommendation ViewModel ولا يملك Router موازيًا.
- `components/LearningSection.tsx` — يحترم `content=lessons|quizzes|support` ويُبقي نفس SubTopic.
- `components/SkillDetailsModal.tsx` — تدريب SubTopic = attachment/placement صريح أو exact `Topic.skillId` مع slot `training|foundation` فقط؛ لا title/id fallback للـSubTopic.
- `pages/Reports/studentSkillTaxonomy.ts` + `studentAnalyticsViewModel.ts` — يحلان Main/SubSkill من taxonomy الحالية حتى لا تعرض النتائج التاريخية ذات ID صحيح باسم «مهارة غير مسماة».
- `utils/skillActionLinks.ts`

## Regression Guards

- `scripts/smoke-adaptive-data-integrity-contract.mjs`
  - SubTopic بدون SubSkill.
  - Main Skill داخل SubTopic.
  - cross-path / cross-subject / cross-section.
  - صحة تعدد SubSkills داخل Topic وعدم خلط Main Skill / Section.
  - فقد/استبدال الربط عند تعديل Topic.
  - inheritance للموارد المرتبطة.
- `scripts/smoke-adaptive-phase3-result-actions-contract.mjs`
  - توجيه SubSkill يعتمد على explicit `Topic.skillId` فقط.
  - منع legacy/title/scored fallback للـSubSkill.
  - يمنع `Results.tsx` من إعادة إنشاء `topic_sub_<skillId>` أو Router heuristic مستقل.
  - يتحقق من فتح `support` كتَبويب دعم حقيقي.
  - يتحقق من أن تدريب SubTopic يعتمد exact SubSkill + training/foundation slot، مع منع title/id fallback.
- `scripts/smoke-reports-student-analytics-boundary-contract.mjs`
  - يثبت فهرسة Main Skills وSubSkills معًا في read-model التقارير.
  - يثبت أن اسم SubSkill يُحل من taxonomy الحالية بدل الاعتماد على label تاريخي stale.

## حدود المهمة

هذه المهمة لا تغير:
- نسب `SkillProgress`.
- احتساب نتائج الطلاب.
- تاريخ المحاولات أو درجات الاختبارات.

## حالة الإغلاق

- PR #314: merged على `main` عند `8fb8ec5b1776fe0ba833942ca527ba1e233bafe0`.
- PR #315: merged على `main` عند `9f01b5fb603313247a4e4133e7a72d9b80dcfa4b` — canonical SubSkill routing + منع fallback في Reports.
- PR #317: يغلق بقية فجوات رحلة الطالب: Results canonical routing، Support tab، exact-SubSkill training routing، وقراءة أسماء SubSkills التاريخية من taxonomy الحالية. لا يكتب إلى SkillProgress ولا يعيد احتساب/تعديل QuizResult المخزن.
- Atlas read-only audit (2026-09-30):
  - Quant child topics: `95/95` لديها `Topic.skillId`.
  - Latest live training result for `sub_quant_01_5`: `5/5` question evidence في النتيجة يحمل نفس SubSkill، ومحاولات الأسئلة المقابلة تحمل `sub_quant_01_5` كذلك.
  - التدريب الحي `تدريب العمليات الحسابية` يحمل `skillIds=[sub_quant_01_5]` وslot=`training` بينما Topic نفسه كان `quizIds=[]`; PR #317 يجعل العرض يربطه بالـSubTopic بالـexact skill بدل heuristics.
  - يوجد `20` Topic→Lesson links حالية وتفتح عبر `Topic.lessonIds`; tags القديمة داخل `Lesson.skillIds` ما زالت legacy/stale. لم تُعدّل تلقائيًا لأن بعض الدروس مشتركة بين عدة SubTopics؛ حراسة PR #314 تطبق canonical inheritance على عمليات الربط/التعديل الجديدة.
- PR #317: merged على `main` عند `77761835d464687283f7ca9d65f43799ccd43962`.
- Exact-head CI على `5ab3a2c4325a75514fa95785a930652e37c15221`: Deep Pre-Merge E2E + Backend Integration + Production Readiness + Recovery + Public UI + Phase/Handover + Safety Gate = Green.
- Production backend: Render deploy `dep-daudbmff3r2c73fnknbg` نشر نفس merge SHA وأصبح `live` في 2026-09-30؛ build TypeScript ناجح، MongoDB connected، Redis connected، والـAPI listening.
- Production frontend: Vercel status على merge SHA = `success`.
- سجل Production بعد النشر أظهر طلبات الطالب/الإدارة/التقارير بحالات 200؛ تحذيرات latency فوق 1s مسجلة كأداء وليست فشلًا في canonical routing.
- لا توجد في هذا الإغلاق أي كتابة إلى `SkillProgress` أو إعادة احتساب/تعديل QuizResult/mastery percentages.
- **الحالة النهائية: CLOSED / GREEN.**
