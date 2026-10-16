import assert from 'node:assert/strict';
import { boardAt, actionDuration } from '../components/results/teaching/boardState';
import type { TeachingStoryboard } from '../server/src/modules/ai/contracts/teachingStoryboard';

const write = { type: 'write', id: 'answer', kind: 'formula', content: '2+3=5' } as const;
const plan: TeachingStoryboard = { version: 1, language: 'ar-SA', scenes: [
  { id: 'solution', narration: 'نجمع ثم نحدد الناتج.', actions: [write, { type: 'box', target: 'answer' }] },
] };
const start = actionDuration(write);
const middle = boardAt(plan, 0, start + 125, true)[0];
assert.equal(middle.emphasis, 'box');
assert.equal(middle.inkProgress, 0.5, 'mark progress must come from the playback clock, not a CSS animation');
assert.deepEqual(boardAt(plan, 0, start + 125, true), [middle], 'pausing preserves exact mark/hand position');
assert.equal(boardAt(plan, 0, start + 250, true)[0].inkProgress, 1);
assert.equal(boardAt(plan, 0, 100, true)[0].emphasis, undefined, 'seeking backwards removes a future mark');
assert.equal(boardAt(plan, 0, start + 125)[0].inkProgress, undefined, 'local animation metadata stays out of provider context');
console.log('Teaching motion clock PASS');
