import assert from 'node:assert/strict';
import { validateTeachingStoryboard } from '../server/src/modules/ai/contracts/teachingStoryboard';
import { decodeQuestionTeachingPlan, normalizeQuestionTeachingPlan } from '../server/src/modules/ai/application/questionTeachingPlan';
import { boardAt, sceneDuration } from '../components/results/teaching/boardState';
import { BrowserNarrationEngine } from '../components/results/teaching/narrationEngine';

const example = {
  version: 1, language: 'ar-SA', scenes: [
    { id: 'question', narration: 'عندنا معادلة أسية.', actions: [{ type: 'write', id: 'equation', kind: 'formula', content: '3^{2x-1}=27' }] },
    { id: 'convert', narration: 'نكتب سبعة وعشرين كقوة للثلاثة.', actions: [{ type: 'transform', target: 'equation', content: '3^{2x-1}=3^3' }, { type: 'highlight', target: 'equation' }] },
    { id: 'solve', narration: 'نساوي الأسس ثم نحل.', actions: [{ type: 'transform', target: 'equation', content: '2x-1=3' }, { type: 'write', id: 'result', kind: 'formula', content: 'x=2' }, { type: 'box', target: 'result' }] },
  ],
};
const plan = validateTeachingStoryboard(example)!;
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
console.log('Teaching storyboard: validation, deterministic transforms/seek, invalid JSON fallback, narration interruption/resume PASS');
