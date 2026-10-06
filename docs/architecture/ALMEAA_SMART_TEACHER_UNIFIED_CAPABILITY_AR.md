# ALMEAA Smart Teacher + Smart Whiteboard — Unified Capability

> الحالة: implementation in progress
> التاريخ: 2026-10-06
> الفرع: `feat/almeaa-smart-teacher-command-center-2026-10-06`

## القرار

لا نبني مساعد طالب جديدًا ولا AI Gateway جديدًا.

المعلم الذكي التفاعلي يتوسع من:
- `QuestionAssistantPanel`
- `/api/ai/question-assistant`
- نفس AI provider routing / budgets / caching / safety
- نفس question/result/review authorization

ويظهر كواجهة كاملة فوق نفس سياق السؤال.

## تجربة الطالب

يبقى الزر الحالي:
- `المعلم الصوتي`

ويضاف زر مستقل:
- `افتح المعلم الذكي`

الشاشة التفاعلية تحتوي:
- سبورة ذكية.
- حوار نصي.
- محادثة صوتية عربية STT.
- قراءة صوتية TTS.
- أزرار:
  - أبسط أكثر
  - مثال آخر
  - لماذا؟
  - أعد الشرح
- سؤال حر داخل نفس question context.

## الحدود

- لا AI scoring.
- لا AI mastery calculation.
- لا تغيير إجابة الطالب أو QuizResult.
- لا كشف correct answer أثناء اختبار نشط.
- التجربة تعمل في سياقات المراجعة المصرح بها الحالية.
- لا إرسال صورة السؤال للمزود افتراضيًا.
- لا طلب AI تلقائي بمجرد فتح الصفحة؛ الطالب يبدأ التفاعل صراحة.
- Smart Classroom يبقى authority لأي live classroom session.
- السبورة هنا تعليمية/توضيحية وليست collaborative realtime engine موازٍ.

## الربط مع Command Center

إدارة providers والمفاتيح والتكلفة والجاهزية تبقى في مركز قيادة ALMEAA.
المعلم الذكي يستهلك نفس الـAI Gateway ولا يملك إعدادات provider مستقلة.

## المرحلة التالية

1. إغلاق UI + contract.
2. ربط teacher/classroom context بشكل read-only عند الحاجة.
3. إضافة structured board actions فقط إذا احتجنا رسمًا/معادلات beyond text.
4. لا نضيف collaborative state إلا بعد قياس الحاجة، ويظل Smart Classroom هو session authority.
