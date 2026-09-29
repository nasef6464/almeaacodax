# ALM-FND-SKILL-LOCK-001 — Foundation SubTopic ↔ SubSkill Canonical Control

آخر تحديث: 2026-09-29

## القانون الثابت

`Foundation SubTopic → exactly one SubSkill`

المصدر القانوني للربط هو `Topic.skillId` نفسه. لا يوجد جدول Mapping موازٍ.

## خط الأساس قبل الإغلاق

- Quant Main Skills ↔ Main Foundation Topics: `25/25`.
- Quant SubSkills ↔ Foundation SubTopics: `95/95`.
- Missing mappings: `0`.
- Mismatched mappings: `0`.
- PR #314 طبق حراسة الكتابة في API والإدارة وربط الموارد التابعة بالمهارة.
- Issue التتبع: #313.

## ضوابط الكتابة

- أي Topic ابن (`parentId != null`) يجب أن يحمل `skillId`.
- `skillId` يجب أن يكون SubSkill حقيقيًا، وليس Main Skill.
- Path / Subject / Section يجب أن تكون متوافقة مع SubSkill ومع Main Foundation Topic الأب.
- لا يسمح بتكرار نفس SubSkill على SubTopic آخر داخل نفس النطاق.
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
- `utils/skillActionLinks.ts`

## Regression Guards

- `scripts/smoke-adaptive-data-integrity-contract.mjs`
  - SubTopic بدون SubSkill.
  - Main Skill داخل SubTopic.
  - cross-path / cross-subject / cross-section.
  - duplicate SubSkill mapping.
  - فقد/استبدال الربط عند تعديل Topic.
  - inheritance للموارد المرتبطة.
- `scripts/smoke-adaptive-phase3-result-actions-contract.mjs`
  - توجيه SubSkill يعتمد على explicit `Topic.skillId` فقط.
  - منع legacy/title/scored fallback للـSubSkill.

## حدود المهمة

هذه المهمة لا تغير:
- نسب `SkillProgress`.
- احتساب نتائج الطلاب.
- تاريخ المحاولات أو درجات الاختبارات.

## حالة الإغلاق

- PR #314: merged على `main` عند `8fb8ec5b1776fe0ba833942ca527ba1e233bafe0`.
- Follow-up canonical routing hardening: قيد CI/PR.
- Production verification: يتم تثبيته هنا بعد نجاح البوابات والنشر.
