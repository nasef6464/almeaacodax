import { validateTeachingStoryboard, type TeachingStoryboard } from '../contracts/teachingStoryboard.js';

export const teachingPlanInstruction = `
أنت تشرح على سبورة حية. الشرح المعتمد مرجع لصحة الحل، وليس نصاً تقرؤه حرفياً. ابدأ مباشرة دون تحيات.
أرجع JSON فقط: {"version":1,"language":"ar-SA","scenes":[{"id":"s1","narration":"كلام قصير واضح","actions":[{"type":"write","id":"eq","kind":"formula","content":"x=2"}]}]}.
اختر ar-SA أو en-US حسب لغة السؤال والطالب. افصل الكلام المنطوق عن LaTeX المكتوب؛ انطق الرموز بكلمات مفهومة.
استخدم مشهدين فقط للشرح الأساسي: المعطيات مع سؤال تدريبي، ثم الحل والنتيجة. فعل واحد لكل مشهد وجملة منطوقة من 5 كلمات كحد أقصى. لا تحل من الصفر: حوّل الشرح المرجعي إلى خطوات قصيرة. الأفعال المسموحة فقط:
write: id فريد، kind=text أو formula، content.
transform: target لعنصر مكتوب سابقاً، content جديد؛ لتحويل المعادلة في نفس الموضع.
highlight أو box أو erase: target لعنصر مكتوب سابقاً.
ابدأ بكتابة السؤال/المعطيات، ثم القانون والتعويض، ثم النتيجة المسموح بها في سياق المراجعة.
عند الاستفسار اشرح النقطة الحالية تحديداً على سبورة فرعية؛ لا تعِد الحل كله إلا بطلب صريح.
لا تخترع رسماً أو معطيات بصرية غير موجودة في المرجع. لا تكتب HTML أو أوامر LaTeX مخصصة.
في الشرح الأساسي أضف لمشهد واحد قبل الحل checkpoint: {"prompt":"سؤال قصير عن الخطوة التالية","hints":["تلميح للفكرة","تلميح أكثر تحديداً"]}.
لا تكشف إجابة هذا السؤال في نفس المشهد أو التلميحات؛ اجعل الحل في المشهد التالي. التلميحات ليست درجات أو تقييم إتقان.
عند طلب مراجعة محاولة الطالب: استخدم المرجع لتحديد صحة الخطوة، وإذا أخطأ أعطه تلميحاً موجهاً دون كشف الحل كله. لا تضف checkpoint في ردود الاستفسار.
السؤال التدريبي لا يتجاوز 5 كلمات، وكل تلميح 3 كلمات. للمتابعة مشهد واحد فقط. طلب الطالب الصريح للإنجليزية يحدد en-US ولو كان السؤال عربياً. اكتب JSON مضغوطًا بلا مسافات زائدة أو أسوار كود، واستهدف أقل من 300 توكن للإخراج كي تكتمل الأقواس داخل حد 450.`;

/** Safe structural diagnostics; never include question text or raw provider output. */
export function inspectQuestionTeachingPlan(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    const elements = new Set<string>();
    const issues = { missingFields: 0, invalidIds: 0, duplicateWrites: 0, missingTargets: 0, invalidHints: 0 };
    for (const scene of Array.isArray(parsed?.scenes) ? parsed.scenes : []) {
      if (!scene || typeof scene.narration !== 'string' || !Array.isArray(scene.actions)) { issues.missingFields++; continue; }
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(String(scene.id || ''))) issues.invalidIds++;
      if (scene.checkpoint && (!Array.isArray(scene.checkpoint.hints) || scene.checkpoint.hints.length !== 2)) issues.invalidHints++;
      for (const action of scene.actions) {
        if (action?.type === 'write') {
          if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(String(action.id || ''))) issues.invalidIds++;
          if (elements.has(action.id)) issues.duplicateWrites++;
          elements.add(action.id);
          if (typeof action.content !== 'string' || !['text', 'formula'].includes(action.kind)) issues.missingFields++;
        } else if (!elements.has(action?.target)) issues.missingTargets++;
        if (action?.type === 'erase') elements.delete(action.target);
      }
    }
    return { jsonComplete: true, valid: Boolean(validateTeachingStoryboard(parsed)), issues,
      versionCorrect: parsed?.version === 1, languageCorrect: ['ar-SA','en-US'].includes(parsed?.language),
      scenes: Array.isArray(parsed?.scenes) ? parsed.scenes.length : 0,
      checkpointIndices: Array.isArray(parsed?.scenes) ? parsed.scenes.flatMap((scene: any, index: number) => scene?.checkpoint ? [index] : []) : [] };
  } catch { return { jsonComplete: false, valid: false, chars: raw.length }; }
}

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
