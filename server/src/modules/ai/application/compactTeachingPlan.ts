import { validateTeachingStoryboard, type TeachingStoryboard } from '../contracts/teachingStoryboard.js';
import { checkpointHints } from '../contracts/checkpointHints.js';

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
    narration: { ...text, description: 'One short spoken idea, at most 8 words, in requested language.' },
    board: { ...text, description: 'Only the given expression or concise reply; no options or step headings. LaTeX without dollars or plain text. No HTML.' },
    kind,
  };
  if (mode === 'lesson') Object.assign(properties, {
    prompt: { ...text, description: 'Ask for the next step before giving the solution.' },
    explanation: { ...text, description: 'One short solution narration, at most 8 words, using the trusted reference.' },
    solution: { type: 'array', items: { ...text, description: 'One compact operation or reasoning step, at most 160 characters; no options or headings.' }, minItems: 1, maxItems: 3, description: 'At most three compact steps including the result. Do not repeat the question or enumerate wrong options.' },
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
  mode: CompactTeachingMode; language?: TeachingStoryboard['language']; trustedAnswer?: string;
}): TeachingStoryboard | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (item.format !== 'compact_v1' || !['lesson', 'reply'].includes(String(item.mode)) ||
    (expected && (item.mode !== expected.mode || (expected.language && item.language !== expected.language)))) return null;
  const narration = item.mode === 'lesson' && typeof item.narration === 'string' && typeof item.prompt === 'string'
    ? `${item.narration} ${item.prompt}` : item.narration;
  let solution = item.solution;
  if (Array.isArray(solution)) {
    if (solution.length < 1 || solution.length > 3 || !solution.every(step => typeof step === 'string' && step.trim() && step.length <= 160)) return null;
    solution = solution.map(step => mathContent(step, item.solutionKind)).join('\n');
  }
  const answer = expected?.mode === 'lesson' && typeof expected.trustedAnswer === 'string' &&
    expected.trustedAnswer.trim() && expected.trustedAnswer.length <= 240 &&
    !/(?:<[A-Za-z!/][^>]*>|[\u0000-\u0008])/.test(expected.trustedAnswer) ? expected.trustedAnswer.trim() : '';
  const answerText = answer ? `${item.language === 'en-US' ? 'Answer' : 'الإجابة'}: ${answer}` : '';
  const first = { id: 'given', narration,
    actions: [{ type: 'write', id: 'given', kind: item.kind, content: mathContent(item.board, item.kind) }],
    ...(item.mode === 'lesson' ? { checkpoint: { prompt: item.prompt, hints: checkpointHints(String(item.prompt), String(item.language)) } } : {}) };
  return validateTeachingStoryboard({ version: 1, language: item.language, scenes: [first,
    ...(item.mode === 'lesson' ? [{ id: 'solution', narration: answerText && typeof item.explanation === 'string' ? `${item.explanation} ${answerText}` : item.explanation, actions: [
      { type: 'write', id: 'solution', kind: item.solutionKind, content: mathContent(solution, item.solutionKind) },
      ...(answerText ? [{ type: 'write', id: 'answer', kind: 'text', content: answerText }, { type: 'box', target: 'answer' }] : [{ type: 'box', target: 'solution' }]),
    ] }] : []),
  ] });
}

export function compactTeachingInstruction(mode: CompactTeachingMode, language?: TeachingStoryboard['language']) {
  return `حوّل الشرح المرجعي إلى محتوى سبورة قصير؛ لا تعِد الحل من الصفر. أرجع JSON فقط بالشكل compact_v1، mode=${mode}.
${language ? `كل النصوص المنطوقة والسؤال باللغة ${language}.` : 'اختر ar-SA أو en-US حسب طلب الطالب ولغة السؤال.'}
الحقول: format, mode, language, narration (فكرة قصيرة), board (المعطيات أو الرد), kind (formula أو text).
${mode === 'lesson' ? 'أضف prompt لسؤال الخطوة التالية دون إجابته، explanation جملة تفسير قصيرة، solution مصفوفة من 1 إلى 3 عمليات قصيرة تشمل النتيجة، solutionKind. كل عملية <=160 حرفًا. لا تكرر نص السؤال أو تختبر كل الخيارات الخاطئة؛ قدم الطريق المباشر من المرجع. لا تكتب hints؛ الكود يقدم توجيهين دون الإجابة. لا تكشف إجابة التدريب في narration أو board.' : 'أجب عن الاستفسار الحالي فقط؛ عند الخطأ اذكر سببه وأعط تلميحاً موجهاً دون كشف الحل. لا تضف حقول التدريب أو الحل الكامل.'}
الكود يبني المشاهد والأفعال؛ لا تكتب scenes أو actions أو IDs. للمسائل الرياضية استخدم kind=formula وLaTeX بدون $، واهرب الشرطة المائلة وفق JSON.
كل جملة منطوقة 8 كلمات كحد أقصى، السؤال 5 كلمات. استخدم فواصل أسطر JSON الصحيحة \\n عند الحاجة، ولا تكتب حرف n منفردًا كفاصل. لا تحيات ولا HTML ولا صور ولا تغيير درجات. استهدف أقل من 250 توكن كي تكتمل الاستجابة داخل حد 450.`;
}
