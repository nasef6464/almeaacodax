import assert from 'node:assert/strict';
import { createVideoQuestionSnapshot, isValidVideoQuestionSnapshot } from '../utils/videoQuestionSnapshot';
import type { Question } from '../types';

const sourceQuestion: Question = {
  id: 'question-beyond-bootstrap-100',
  text: 'ما ناتج ٢ + ٢؟',
  options: ['٣', '٤'],
  correctOptionIndex: 1,
  type: 'mcq',
  difficulty: 'Easy',
  subject: 'math',
  imageUrl: 'https://cdn.example.test/question.png',
  explanation: 'نجمع العددين.',
  videoUrl: 'https://cdn.example.test/explanation.mp4',
};

const snapshot = createVideoQuestionSnapshot(sourceQuestion);
assert.equal(snapshot.text, sourceQuestion.text, 'snapshot must retain question text');
assert.deepEqual(snapshot.options, sourceQuestion.options, 'snapshot must retain options');
assert.equal(snapshot.correctOptionIndex, 1, 'snapshot must retain the answer needed by the formative video flow');
assert.equal(snapshot.imageUrl, sourceQuestion.imageUrl, 'snapshot must retain question media');
assert.equal(isValidVideoQuestionSnapshot(snapshot), true, 'a bank question outside the initial client bootstrap must remain playable from its snapshot');
assert.equal(isValidVideoQuestionSnapshot({ ...snapshot, options: ['واحد'], correctOptionIndex: 1 }), false, 'invalid snapshots must be rejected before lesson save');

console.log('PASS interactive-video snapshot runtime: bank question remains playable without global question-bank hydration.');
