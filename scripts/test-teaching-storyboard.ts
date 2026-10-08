import assert from 'node:assert/strict';
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
assert.equal(compileCompactTeachingPlan({ ...compact, hints: ['one'] }), null);
assert.equal(compileCompactTeachingPlan({ ...compact, solution: '\\href{javascript:bad}{x}' }), null);
assert.equal(compileCompactTeachingPlan(compact, { mode: 'reply' }), null);
assert.equal(compileCompactTeachingPlan(compact, { mode: 'lesson', language: 'en-US' }), null);
const compactReply = { format: 'compact_v1', mode: 'reply', language: 'en-US', narration: 'Multiply the units instead of adding.', board: '2 \\times 5', kind: 'formula' };
assert.equal(compileCompactTeachingPlan(compactReply)?.scenes.length, 1);
assert.equal(compileCompactTeachingPlan(compactReply)?.scenes[0].checkpoint, undefined);
assert.equal(teachingRequestLanguage('Explain in English'), 'en-US');
assert.equal(teachingRequestLanguage('اشرح بالإنجليزية'), 'en-US');
assert.equal(teachingRequestLanguage('اشرح بالعربي'), 'ar-SA');
assert.equal(normalizeQuestionTeachingPlan(JSON.stringify(compact), 'fallback', { mode: 'lesson' }), JSON.stringify(compiled));
assert.equal(normalizeQuestionTeachingPlan(JSON.stringify(example), 'fallback', { mode: 'lesson' }), 'fallback', 'new generation must not bypass required practice via a legacy full plan');
const practiceExample = { ...example, scenes: [{ ...example.scenes[0], checkpoint: { prompt: 'ما الخطوة التالية؟', hints: ['ابدأ بالفكرة.', 'طبق القانون.'], unexpected: 'stripped' } }, ...example.scenes.slice(1)] };
assert.deepEqual(validateTeachingStoryboard(practiceExample)?.scenes[0].checkpoint, { prompt: 'ما الخطوة التالية؟', hints: ['ابدأ بالفكرة.', 'طبق القانون.'] });
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
delete (globalThis as any).window;
delete (globalThis as any).SpeechSynthesisUtterance;
// Bounded lesson generation reserves its unchanged output cap for visible JSON.
const originalFetch = globalThis.fetch;
const requests: any[] = [];
let providerModel = 'gemini-2.5-flash';
globalThis.fetch = async (_url, init) => {
  requests.push(JSON.parse(String(init?.body)));
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
  for (providerModel of ['gemini-2.5-pro', 'gemini-3.8-flash']) {
    await adapters.callProvider('gemini', 'trusted reference', 'application/json', undefined, { maxOutputTokens: 450, disableThinking: true });
    assert.equal(requests.at(-1).generationConfig.thinkingConfig, undefined, 'unsupported models must not receive a thinking-off parameter');
  }
} finally { globalThis.fetch = originalFetch; }
console.log('Teaching storyboard: validation, deterministic transforms/seek, invalid JSON fallback, narration interruption/resume PASS');
