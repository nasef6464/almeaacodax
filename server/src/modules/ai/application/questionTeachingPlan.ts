import { validateTeachingStoryboard, type TeachingStoryboard } from '../contracts/teachingStoryboard.js';

export const teachingPlanInstruction = `
أنت تشرح على سبورة حية. الشرح المعتمد مرجع لصحة الحل، وليس نصاً تقرؤه حرفياً. ابدأ مباشرة دون تحيات.
أرجع JSON فقط: {"version":1,"language":"ar-SA","scenes":[{"id":"s1","narration":"كلام قصير واضح","actions":[{"type":"write","id":"eq","kind":"formula","content":"x=2"}]}]}.
اختر ar-SA أو en-US حسب لغة السؤال والطالب. افصل الكلام المنطوق عن LaTeX المكتوب؛ انطق الرموز بكلمات مفهومة.
استخدم 3 إلى 5 مشاهد قصيرة، وفعل أو فعلين لكل مشهد. الأفعال المسموحة فقط:
write: id فريد، kind=text أو formula، content.
transform: target لعنصر مكتوب سابقاً، content جديد؛ لتحويل المعادلة في نفس الموضع.
highlight أو box أو erase: target لعنصر مكتوب سابقاً.
ابدأ بكتابة السؤال/المعطيات، ثم القانون والتعويض، ثم النتيجة المسموح بها في سياق المراجعة.
عند الاستفسار اشرح النقطة الحالية تحديداً على سبورة فرعية؛ لا تعِد الحل كله إلا بطلب صريح.
لا تخترع رسماً أو معطيات بصرية غير موجودة في المرجع. لا تكتب HTML أو أوامر LaTeX مخصصة.
ابقَ ضمن حد الإخراج: جمل قصيرة وJSON مختصر، وبدون حقول إضافية.`;

/** Existing cache stores a string; no collection migration is necessary. */
export function decodeQuestionTeachingPlan(raw: string): { text: string; storyboard?: TeachingStoryboard } {
  try {
    const storyboard = validateTeachingStoryboard(JSON.parse(raw));
    if (storyboard) return { text: storyboard.scenes.map(scene => scene.narration).join('\n'), storyboard };
  } catch { /* legacy text */ }
  return { text: raw };
}

export function normalizeQuestionTeachingPlan(raw: string, fallback: string): string {
  const decoded = decodeQuestionTeachingPlan(raw);
  if (decoded.storyboard) return JSON.stringify(decoded.storyboard);
  // Never expose invalid JSON as a lesson; use the already-authorized explanation.
  const text = raw.trim();
  return (!text || /^[{\[]|^```/.test(text)) ? fallback : text.slice(0, 4000);
}
