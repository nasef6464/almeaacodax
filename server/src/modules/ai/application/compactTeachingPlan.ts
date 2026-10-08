import { validateTeachingStoryboard, type TeachingStoryboard } from '../contracts/teachingStoryboard.js';

export type CompactTeachingMode = 'lesson' | 'reply';
export function teachingRequestLanguage(message: string): TeachingStoryboard['language'] | undefined {
  if (/english|إنجليز|انجليز/i.test(message)) return 'en-US';
  if (/arabic|بالعربي/i.test(message)) return 'ar-SA';
  return undefined;
}

/** The model supplies content; server code owns scene count, IDs and checkpoint placement. */
export function compactTeachingSchema(mode: CompactTeachingMode, language?: TeachingStoryboard['language']) {
  const text = { type: 'string' };
  const kind = { type: 'string', enum: ['formula', 'text'] };
  const properties: Record<string, unknown> = {
    format: { type: 'string', enum: ['compact_v1'] },
    mode: { type: 'string', enum: [mode] },
    language: { type: 'string', enum: language ? [language] : ['ar-SA', 'en-US'] },
    narration: { ...text, description: 'Short spoken explanation, in requested language.' },
    board: { ...text, description: 'LaTeX formula without dollar delimiters, or plain text. No HTML.' },
    kind,
  };
  if (mode === 'lesson') Object.assign(properties, {
    prompt: { ...text, description: 'Ask for the next step before giving the solution.' },
    hints: { type: 'array', items: text, minItems: 2, maxItems: 2, description: 'Two progressive hints without the answer.' },
    explanation: { ...text, description: 'Short solution narration using the trusted reference.' },
    solution: { ...text, description: 'Solution steps and result as LaTeX or plain text.' },
    solutionKind: kind,
  });
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

const mathContent = (value: unknown, kind: unknown) => {
  if (typeof value !== 'string' || kind !== 'formula') return value;
  return value.trim().replace(/^\$\$([\s\S]*)\$\$$/, '$1').replace(/^\$([\s\S]*)\$$/, '$1')
    .replace(/^\\\(([\s\S]*)\\\)$/, '$1').replace(/^\\\[([\s\S]*)\\\]$/, '$1').trim();
};

export function compileCompactTeachingPlan(value: unknown, expected?: {
  mode: CompactTeachingMode; language?: TeachingStoryboard['language'];
}): TeachingStoryboard | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.format !== 'compact_v1' || !['lesson', 'reply'].includes(String(item.mode)) ||
    (expected && (item.mode !== expected.mode || (expected.language && item.language !== expected.language)))) return null;
  const narration = item.mode === 'lesson' && typeof item.narration === 'string' && typeof item.prompt === 'string'
    ? `${item.narration} ${item.prompt}` : item.narration;
  const first = { id: 'given', narration,
    actions: [{ type: 'write', id: 'given', kind: item.kind, content: mathContent(item.board, item.kind) }],
    ...(item.mode === 'lesson' ? { checkpoint: { prompt: item.prompt, hints: item.hints } } : {}) };
  return validateTeachingStoryboard({ version: 1, language: item.language, scenes: [first,
    ...(item.mode === 'lesson' ? [{ id: 'solution', narration: item.explanation, actions: [
      { type: 'write', id: 'solution', kind: item.solutionKind, content: mathContent(item.solution, item.solutionKind) },
      { type: 'box', target: 'solution' },
    ] }] : []),
  ] });
}

export function compactTeachingInstruction(mode: CompactTeachingMode, language?: TeachingStoryboard['language']) {
  return `حوّل الشرح المرجعي إلى محتوى سبورة قصير؛ لا تعِد الحل من الصفر. أرجع JSON فقط بالشكل compact_v1، mode=${mode}.
${language ? `كل النصوص المنطوقة والسؤال والتلميحات باللغة ${language}.` : 'اختر ar-SA أو en-US حسب طلب الطالب ولغة السؤال.'}
الحقول: format, mode, language, narration (فكرة قصيرة), board (المعطيات أو الرد), kind (formula أو text).
${mode === 'lesson' ? 'أضف prompt لسؤال الخطوة التالية، hints تلميحين تدريجيين دون الإجابة، explanation لشرح الحل، solution لخطوات الحل والنتيجة، solutionKind.' : 'أجب عن الاستفسار الحالي فقط؛ عند الخطأ اذكر سببه وأعط تلميحاً موجهاً دون كشف الحل. لا تضف حقول التدريب أو الحل الكامل.'}
الكود يبني المشاهد والأفعال؛ لا تكتب scenes أو actions أو IDs. للمسائل الرياضية استخدم kind=formula وLaTeX بدون $، واهرب الشرطة المائلة وفق JSON.
كل جملة منطوقة 8 كلمات كحد أقصى، السؤال 5 كلمات وكل تلميح 3 كلمات. لا تحيات ولا HTML ولا صور ولا تغيير درجات. استهدف أقل من 250 توكن كي تكتمل الاستجابة داخل حد 450.`;
}
