import assert from 'node:assert/strict';
import { mergeInteractiveVideoProgress, normalizeInteractiveVideoProgress } from '../utils/interactiveVideoProgress.ts';

const restored = normalizeInteractiveVideoProgress('course-a', 'lesson-a', {
  positionSeconds: 91.8,
  answeredQuestionIds: ['video-question-1', 'video-question-1', 'video-question-2'],
}, 100);
assert.equal(restored.positionSeconds, 91);
assert.deepEqual(restored.answeredQuestionIds, ['video-question-1', 'video-question-2']);

const newer = normalizeInteractiveVideoProgress('course-a', 'lesson-a', {
  positionSeconds: 142,
  answeredQuestionIds: ['video-question-1', 'video-question-2'],
}, 200);
const otherLesson = normalizeInteractiveVideoProgress('course-a', 'lesson-b', {
  positionSeconds: 18,
  answeredQuestionIds: [],
}, 150);
const merged = mergeInteractiveVideoProgress([restored, otherLesson], newer);
assert.equal(merged.length, 2);
assert.deepEqual(merged.map((item) => `${item.lessonId}:${item.positionSeconds}`), ['lesson-a:142', 'lesson-b:18']);

console.log('PASS interactive video progress runtime: resumes the latest position and preserves answered-question state per lesson.');
