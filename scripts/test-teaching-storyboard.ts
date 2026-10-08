import assert from 'node:assert/strict';
import { buildQuestionAssistantPrompt } from '../server/src/modules/ai/application/questionAssistant';
const promptInput = { level: 'steps' as const, questionText: '2 times 5?', options: ['8', '10'], correctOptionIndex: 1, explanation: 'Trusted reference: 2 times 5 equals 10.', skillLabels: ['Multiplication'], studentMessage: 'Explain in English.', hasImage: false };
const boardPrompt = buildQuestionAssistantPrompt({ ...promptInput, structuredBoard: true });
assert.ok(boardPrompt.includes(promptInput.explanation) && boardPrompt.includes(promptInput.studentMessage));
assert.ok(boardPrompt.includes('ممنوع تعديل الدرجة أو الإتقان') && boardPrompt.includes('الإجابة الصحيحة الموثوقة: 10'));
assert.doesNotMatch(boardPrompt, /الخطوة 3: الاستنتاج|شاملاً للحل|اجعل الرد بالعربية|كاملاً ومرتباً|NotebookLM/, 'structured requests must not inherit conflicting long-form or Arabic-only output rules');
assert.match(buildQuestionAssistantPrompt(promptInput), /الخطوة 3: الاستنتاج/, 'ordinary text/voice tutor keeps its existing format');
import { checkpointHints } from '../server/src/modules/ai/contracts/checkpointHints';
import { readableBoardText, readableBoardProse } from '../components/results/teaching/boardText';
assert.equal(readableBoardProse('نبحث عن 4 \\times \\text{آحاد الخيار} = \\text{آحاد 0}.'), 'نبحث عن 4 × آحاد الخيار = آحاد 0.');
assert.equal(readableBoardProse('\\implies \\text{الآحاد هي 0}'), '⇒ الآحاد هي 0');
assert.equal(readableBoardProse('\\nu + n \\timescale'), '\\nu + n \\timescale', 'prose cleanup preserves unknown commands and variable n');
assert.equal(readableBoardText('الخطوة 1: نص.nالخطوة 2: نص.nإذن النتيجة.'), 'الخطوة 1: نص.\nالخطوة 2: نص.\nإذن النتيجة.');
assert.equal(readableBoardText('الخيارات:n1) 309705n2) 309704'), 'الخيارات:\n1) 309705\n2) 309704');
assert.equal(readableBoardText('الخطوة 1: (0)n- الأول'), 'الخطوة 1: (0)\n- الأول');
assert.equal(readableBoardText('الخطوة 1: 2n-1'), 'الخطوة 1: 2n-1', 'mathematical n must not become a prose separator');
assert.equal(readableBoardText('\\nu \\neq 2n \\n الخطوة 2'), '\\nu \\neq 2n \n الخطوة 2');
assert.equal(readableBoardText('n(n-1) = 2n'), 'n(n-1) = 2n');
for (const [prompt, language] of [['ما هي خانة الآحاد؟', 'ar-SA'], ['What is the unit digit?', 'en-US'], ['ما العلاقة بين الكميات؟', 'ar-SA'], ['Which formula applies?', 'en-US']] as const) {
  const hints = checkpointHints(prompt, language);
  assert.equal(hints.length, 2);
  assert.equal(hints.some(hint => /\d|صفر|zero|309705|يساوي|equals|=/.test(hint)), false, 'procedural hints contain no generated answer or numerical value');
}
import { spokenTeachingText } from '../components/results/teaching/spokenMath';

assert.equal(spokenTeachingText('نضرب $2 \\times 5 = 10$.', 'ar-SA'), 'نضرب 2 في 5 يساوي 10.');
assert.equal(spokenTeachingText('Multiply 2 \\times 5 = 10.', 'en-US'), 'Multiply 2 times 5 equals 10.');
assert.equal(spokenTeachingText('well-known method', 'en-US'), 'well-known method');
assert.equal(spokenTeachingText('x \\neq -2', 'en-US'), 'x not equal to minus 2');
assert.equal(spokenTeachingText('\\nu = 5', 'en-US'), 'nu equals 5', 'newline cleanup must not destroy Greek commands');
assert.equal(spokenTeachingText('\\frac{1}{\\frac{2}{3}}', 'en-US'), 'fraction numerator 1 denominator fraction numerator 2 denominator 3 end fraction end fraction', 'nested fraction grouping must remain unambiguous');
assert.equal(spokenTeachingText('x^{2-1}', 'ar-SA'), 'x أس 2 ناقص 1 نهاية المؤشر');
assert.equal(spokenTeachingText('\\sqrt[3]{8}', 'en-US'), 'root of order 3 of 8 end root');
assert.equal(spokenTeachingText('F = m \\times a', 'en-US'), 'F equals m times a');
assert.equal(spokenTeachingText('2H_2 + O_2 \\rightarrow 2H_2O', 'en-US'), '2H subscript 2 end index plus O subscript 2 end index yields 2H subscript 2 end index O');
assert.equal(spokenTeachingText('\\frac{1}{', 'en-US'), 'Refer to the expression shown on the board.');
assert.equal(spokenTeachingText('\\unknown{x}', 'ar-SA'), 'راجع الصيغة المعروضة على السبورة.');
assert.equal(spokenTeachingText('**شرح**\\n\\textbf{واضح}', 'ar-SA').includes('\\'), false);
import { validateTeachingStoryboard } from '../server/src/modules/ai/contracts/teachingStoryboard';
import { decodeQuestionTeachingPlan, inspectQuestionTeachingPlan, normalizeQuestionTeachingPlan } from '../server/src/modules/ai/application/questionTeachingPlan';
import { boardAt, sceneDuration } from '../components/results/teaching/boardState';
import { BrowserNarrationEngine } from '../components/results/teaching/narrationEngine';
import { createAiProviderAdapters } from '../server/src/modules/ai/infrastructure/providers/aiProviderAdapters';
import { compileCompactTeachingPlan, compactTeachingSchema, teachingRequestLanguage } from '../server/src/modules/ai/application/compactTeachingPlan';

const example = {
  version: 1, language: 'ar-SA', scenes: [
    { id: 'question', narration: 'عندنا معادلة أسية.', actions: [{ type: 'write', id: 'equation', kind: 'formula', content: '3^{2x-1}=27' }] },
    { id: 'convert', narration: 'نكتب سبعة وعشرين كقوة للثلاثة.', actions: [{ type: 'transform', target: 'equation', content: '3^{2x-1}=3^3' }, { type: 'highlight', target: 'equation' }] },
    { id: 'solve', narration: 'نساوي الأسس ثم نحل.', actions: [{ type: 'transform', target: 'equation', content: '2x-1=3' }, { type: 'write', id: 'result', kind: 'formula', content: 'x=2' }, { type: 'box', target: 'result' }] },
  ],
};
const plan = validateTeachingStoryboard(example)!;
const compact = { format: 'compact_v1', mode: 'lesson', language: 'ar-SA', narration: 'نركز على آحاد الأعداد.', board: '$2 \\times 5 \\times 8$', kind: 'formula', prompt: 'ما الخطوة التالية؟', hints: ['اضرب الآحاد.', 'ابدأ بأول عددين.'], explanation: 'الناتج ينتهي بصفر.', solution: '$2 \\times 5=10 \\Rightarrow 0 \\times 8=0$', solutionKind: 'formula' };
const compiled = compileCompactTeachingPlan(compact, { mode: 'lesson', language: 'ar-SA' })!;
assert.equal(compiled.scenes.length, 2);
assert.ok(compiled.scenes[0].narration.includes(compact.prompt), 'the teacher asks the practice question aloud before pausing');
assert.equal(compiled.scenes[0].checkpoint?.hints.length, 2);
assert.equal(compiled.scenes[1].checkpoint, undefined);
assert.equal(compiled.scenes[0].actions[0].type === 'write' && compiled.scenes[0].actions[0].content.startsWith('$'), false, 'strip math delimiters before KaTeX');
assert.equal(boardAt(compiled, 1, sceneDuration(compiled, 1)).find(item => item.id === 'solution')?.emphasis, 'box');
assert.deepEqual(compileCompactTeachingPlan({ ...compact, hints: ['Answer is 42'] })?.scenes[0].checkpoint?.hints, compiled.scenes[0].checkpoint?.hints, 'provider hint text is never used');
const { hints: removedHints, ...withoutHints } = compact;
assert.ok(compileCompactTeachingPlan(withoutHints), 'provider no longer needs to generate hint tokens');
const compactSteps = { ...withoutHints, solution: ['$2 \\times 5 = 10$', '$10 \\times 8 = 80$', '0'] };
assert.ok(compileCompactTeachingPlan(compactSteps));
assert.equal(compileCompactTeachingPlan(compactSteps)?.scenes[1].actions[0].type === 'write' && compileCompactTeachingPlan(compactSteps)?.scenes[1].actions[0].content, '2 \\times 5 = 10\n10 \\times 8 = 80\n0');
for (const solution of [[], ['1','2','3','4'], ['x'.repeat(161)], [3], ['']]) assert.equal(compileCompactTeachingPlan({ ...withoutHints, solution }), null);
assert.equal(compactTeachingSchema('lesson').properties.solution.type, 'array');
assert.equal(compactTeachingSchema('lesson').properties.solution.maxItems, 3);
const completeLesson = compileCompactTeachingPlan(compactSteps, { mode: 'lesson', trustedAnswer: '309705' })!;
assert.ok(completeLesson);
assert.equal(JSON.stringify(completeLesson.scenes[0]).includes('309705'), false, 'trusted answer must stay out of the pre-practice scene and hints');
assert.ok(completeLesson.scenes[1].narration.includes('309705'));
assert.equal(boardAt(completeLesson, 1, sceneDuration(completeLesson, 1)).find(item => item.id === 'answer')?.content, 'الإجابة: 309705');
assert.equal(boardAt(completeLesson, 1, sceneDuration(completeLesson, 1)).find(item => item.id === 'answer')?.emphasis, 'box');
assert.ok(compileCompactTeachingPlan({ ...compactSteps, language: 'en-US' }, { mode: 'lesson', trustedAnswer: '309705' })?.scenes[1].narration.includes('Answer: 309705'));
assert.equal(compileCompactTeachingPlan({ ...compactSteps, language: 'en-US' }, { mode: 'lesson', trustedAnswer: '<img src=x>' })?.scenes[1].actions.length, 2, 'unsafe reference markup is never added');
assert.equal('hints' in compactTeachingSchema('lesson').properties, false);
assert.equal(compileCompactTeachingPlan({ ...compact, solution: '\\href{javascript:bad}{x}' }), null);
assert.equal(compileCompactTeachingPlan(compact, { mode: 'reply' }), null);
assert.equal(compileCompactTeachingPlan(compact, { mode: 'lesson', language: 'en-US' }), null);
const compactReply = { format: 'compact_v1', mode: 'reply', language: 'en-US', narration: 'Multiply the units instead of adding.', board: '2 \\times 5', kind: 'formula' };
assert.equal(JSON.stringify(compileCompactTeachingPlan(compactReply, { mode: 'reply', trustedAnswer: '309705' })).includes('309705'), false, 'attempt replies cannot inherit the final reference answer');
assert.equal(compileCompactTeachingPlan(compactReply)?.scenes.length, 1);
assert.equal(compileCompactTeachingPlan(compactReply)?.scenes[0].checkpoint, undefined);
assert.equal(teachingRequestLanguage('Explain in English'), 'en-US');
assert.equal(teachingRequestLanguage('اشرح بالإنجليزية'), 'en-US');
assert.equal(teachingRequestLanguage('اشرح بالعربي'), 'ar-SA');
assert.equal(normalizeQuestionTeachingPlan(JSON.stringify(compact), 'fallback', { mode: 'lesson' }), JSON.stringify(compiled));
assert.equal(normalizeQuestionTeachingPlan(JSON.stringify(example), 'fallback', { mode: 'lesson' }), 'fallback', 'new generation must not bypass required practice via a legacy full plan');
const practiceExample = { ...example, scenes: [{ ...example.scenes[0], checkpoint: { prompt: 'ما الخطوة التالية؟', hints: ['ابدأ بالفكرة.', 'طبق القانون.'], unexpected: 'stripped' } }, ...example.scenes.slice(1)] };
assert.deepEqual(validateTeachingStoryboard(practiceExample)?.scenes[0].checkpoint, { prompt: 'ما الخطوة التالية؟', hints: checkpointHints('ما الخطوة التالية؟', 'ar-SA') });
const cachedLeakingPractice = { ...practiceExample, scenes: [{ ...practiceExample.scenes[0], checkpoint: { prompt: 'ما هي خانة الآحاد؟', hints: ['الإجابة هي صفر.', 'صفر هو المطلوب.'] } }, ...practiceExample.scenes.slice(1)] };
assert.deepEqual(validateTeachingStoryboard(cachedLeakingPractice)?.scenes[0].checkpoint?.hints, checkpointHints('ما هي خانة الآحاد؟', 'ar-SA'), 'old cached or received provider hints are replaced at validation in server and browser');
assert.equal(validateTeachingStoryboard({ ...practiceExample, scenes: practiceExample.scenes.map(scene => ({ ...scene, checkpoint: practiceExample.scenes[0].checkpoint })) }), null, 'practice must remain bounded to one checkpoint');
assert.equal(validateTeachingStoryboard({ ...practiceExample, scenes: [practiceExample.scenes[0]] }), null, 'a solution scene must follow the checkpoint');
for (const checkpoint of [{ prompt: 'x', hints: ['one'] }, { prompt: '<script>x</script>', hints: ['one', 'two'] }, { prompt: 'x', hints: ['one', 'x'.repeat(241)] }]) {
  assert.equal(validateTeachingStoryboard({ ...example, scenes: [{ ...example.scenes[0], checkpoint }] }), null);
}
assert.ok(plan);
assert.equal(boardAt(plan, 0, 0)[0].progress, 0);
assert.equal(boardAt(plan, 0, sceneDuration(plan, 0))[0].progress, 1);
const partial = boardAt(plan, 1, 300);
assert.equal(partial.length, 1, 'a transformation must retain the same equation element');
assert.equal(partial[0].id, 'equation');
assert.ok(partial[0].progress > 0 && partial[0].progress < 1);
assert.deepEqual(boardAt(plan, 1, 300), partial, 'pause/resume/seek replay must be deterministic');
const final = boardAt(plan, 2, sceneDuration(plan, 2));
assert.equal(final.find(item => item.id === 'result')?.emphasis, 'box');
assert.equal(boardAt(plan, 0, sceneDuration(plan, 0))[0].content, '3^{2x-1}=27', 'seek must undo later transformations');
const invalid = (actions: unknown[]) => validateTeachingStoryboard({ version: 1, language: 'ar-SA', scenes: [{ id: 's', narration: 'شرح', actions }] });
assert.ok(invalid([{ type: 'write', id: 'comparison', kind: 'formula', content: 'x < 5' }]), 'comparison symbols must not be treated as HTML');
assert.equal(invalid([{ type: 'highlight', target: 'missing' }]), null);
assert.equal(invalid([{ type: 'fetch', target: 'url' }]), null);
assert.equal(invalid([{ type: 'write', id: 'a', kind: 'formula', content: '\\href{javascript:bad}{x}' }]), null);
assert.equal(invalid([{ type: 'write', id: 'a', kind: 'text', content: '<script>bad</script>' }]), null);
assert.equal(invalid([{ type: 'write', id: 'a', kind: 'text', content: 'x'.repeat(501) }]), null);
assert.equal(invalid([{ type: 'write', id: 'a', kind: 'text', content: 'x' }, { type: 'write', id: 'a', kind: 'text', content: 'y' }]), null);
assert.equal(invalid([{ type: 'write', id: 'a', kind: 'text', content: 'x' }, { type: 'erase', target: 'a' }, { type: 'box', target: 'a' }]), null);
assert.equal(validateTeachingStoryboard({ ...example, version: 2 }), null);
assert.equal(validateTeachingStoryboard({ ...example, scenes: Array(9).fill(example.scenes[0]) }), null);
assert.ok(decodeQuestionTeachingPlan(JSON.stringify(example)).storyboard);
assert.equal(normalizeQuestionTeachingPlan('{"scenes":', 'شرح معتمد'), 'شرح معتمد');
assert.equal(normalizeQuestionTeachingPlan(JSON.stringify({ ...example, version: 2 }), 'شرح معتمد'), 'شرح معتمد');
assert.equal(decodeQuestionTeachingPlan('شرح قديم').text, 'شرح قديم');
assert.equal(inspectQuestionTeachingPlan('{"scenes":').jsonComplete, false);
assert.equal(inspectQuestionTeachingPlan(JSON.stringify(example)).valid, true);
assert.equal(inspectQuestionTeachingPlan(JSON.stringify({ ...example, scenes: [{ id: 's', narration: 'PRIVATE_REFERENCE', actions: [{ type: 'highlight', target: 'unknown' }] }] })).issues?.missingTargets, 1);
assert.equal(JSON.stringify(inspectQuestionTeachingPlan(JSON.stringify(example))).includes('معادلة'), false, 'diagnostics must not include question or narration text');

// Two narration owners: a follow-up must not destroy the main lesson checkpoint.
const spoken: any[] = [];
const calls = { pause: 0, resume: 0, cancel: 0 };
(globalThis as any).window = { speechSynthesis: {
  speak: (utterance: any) => spoken.push(utterance), pause: () => calls.pause++,
  resume: () => calls.resume++, cancel: () => calls.cancel++,
} };
(globalThis as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
const main = new BrowserNarrationEngine();
const branch = new BrowserNarrationEngine();
let mainEnded = 0, branchEnded = 0;
main.speak('الشرح الأساسي', 'ar-SA', () => mainEnded++);
main.pause();
branch.speak('جواب المقاطعة', 'ar-SA', () => branchEnded++);
assert.equal(spoken[0].onend, null, 'interrupted audio must detach stale callbacks');
spoken[1].onend();
assert.equal(branchEnded, 1);
assert.equal(mainEnded, 0);
main.resume();
assert.equal(spoken[2].text, 'الشرح الأساسي');
spoken[2].onend();
assert.equal(mainEnded, 1);
assert.ok(calls.pause > 0 && calls.resume > 0);
main.cancel(); branch.cancel();
const remoteArabic = { lang: 'ar-SA', localService: false, name: 'remote' };
const localArabic = { lang: 'ar-SA', localService: true, name: 'local' };
const localEnglish = { lang: 'en-US', localService: true, name: 'English' };
(globalThis as any).window.speechSynthesis.getVoices = () => [remoteArabic, localEnglish, localArabic];
main.speak('2 \\times 5 = 10', 'ar-SA', () => {});
assert.equal(spoken.at(-1).text, '2 في 5 يساوي 10');
assert.equal(spoken.at(-1).voice, localArabic, 'prefer an available local voice in the requested language');
main.cancel();
main.speak('2 \\times 5 = 10', 'en-US', () => {});
assert.equal(spoken.at(-1).text, '2 times 5 equals 10');
assert.equal(spoken.at(-1).voice, localEnglish);
main.cancel();
delete (globalThis as any).window;
delete (globalThis as any).SpeechSynthesisUtterance;
// Bounded lesson generation reserves its unchanged output cap for visible JSON.
const originalFetch = globalThis.fetch;
const requests: any[] = [];
let providerModel = 'gemini-2.5-flash';
let missingModel = false;
globalThis.fetch = async (_url, init) => {
  requests.push(JSON.parse(String(init?.body)));
  if (missingModel && String(_url).includes('/gemini-2.5-flash:')) return new Response('{}', { status: 404 });
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(example) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 80, totalTokenCount: 180 } }), { status: 200 });
};
try {
  const adapters = createAiProviderAdapters({ getProviderRuntime: () => ({ apiKey: 'fixture-key', model: providerModel }), defaultTimeoutMs: 1000, clientUrl: 'https://example.com', qwenBaseUrl: 'https://example.com', redactDiagnostic: () => 'redacted' });
  const schema = compactTeachingSchema('lesson', 'en-US');
  await adapters.callProvider('gemini', 'trusted reference', 'application/json', undefined, { maxOutputTokens: 450, disableThinking: true, jsonSchema: schema });
  assert.deepEqual(requests.at(-1).generationConfig.responseJsonSchema, schema);
  assert.deepEqual(requests.at(-1).generationConfig.thinkingConfig, { thinkingBudget: 0 });
  assert.equal(requests.at(-1).generationConfig.maxOutputTokens, 450);
  await adapters.callProvider('gemini', 'normal chat');
  assert.equal(requests.at(-1).generationConfig.thinkingConfig, undefined, 'other capabilities retain their existing behavior');
  assert.equal(requests.at(-1).generationConfig.responseJsonSchema, undefined);
  for (providerModel of ['gemini-2.5-pro']) {
    await adapters.callProvider('gemini', 'trusted reference', 'application/json', undefined, { maxOutputTokens: 450, disableThinking: true });
    assert.equal(requests.at(-1).generationConfig.thinkingConfig, undefined, 'unsupported models must not receive a thinking-off parameter');
  }
  providerModel = 'gemini-3.8-flash';
  const direct = await adapters.callProvider('gemini', 'trusted reference', 'application/json', undefined, { maxOutputTokens: 450, disableThinking: true, jsonSchema: schema });
  assert.deepEqual(requests.at(-1).generationConfig.thinkingConfig, { thinkingLevel: 'low' });
  assert.equal(requests.at(-1).generationConfig.maxOutputTokens, 1024);
  assert.equal(direct.model, 'gemini-3.8-flash');
  await adapters.callProvider('gemini', 'normal chat', undefined, undefined, { maxOutputTokens: 450 });
  assert.equal(requests.at(-1).generationConfig.thinkingConfig, undefined);
  assert.equal(requests.at(-1).generationConfig.maxOutputTokens, 450, 'ordinary chat retains its budget');
  providerModel = 'gemini-2.5-flash';
  missingModel = true;
  const fallback = await adapters.callProvider('gemini', 'trusted reference', 'application/json', undefined, { maxOutputTokens: 450, disableThinking: true, jsonSchema: schema });
  assert.equal(fallback.model, 'gemini-3.8-flash', 'metadata records the model actually called after 404');
  assert.deepEqual(requests.at(-1).generationConfig.thinkingConfig, { thinkingLevel: 'low' });
  assert.equal(requests.at(-1).generationConfig.maxOutputTokens, 1024);
  assert.deepEqual(requests.at(-1).generationConfig.responseJsonSchema, schema);
} finally { globalThis.fetch = originalFetch; }
console.log('Teaching storyboard: validation, deterministic transforms/seek, invalid JSON fallback, narration interruption/resume PASS');
