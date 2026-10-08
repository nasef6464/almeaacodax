import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reviewSessionSource = fs.readFileSync(path.join(root, 'pages/ReviewSession.tsx'), 'utf8');
const practiceSummarySource = fs.readFileSync(path.join(root, 'components/review/PracticeExamSummary.tsx'), 'utf8');
const practiceFeedbackSource = fs.readFileSync(path.join(root, 'components/review/PracticeQuestionFeedback.tsx'), 'utf8');
const allReviewSources = `${reviewSessionSource}\n${practiceSummarySource}\n${practiceFeedbackSource}`;
const favoritesSource = fs.readFileSync(path.join(root, 'pages/Favorites.tsx'), 'utf8');

console.log('Testing ReviewSession Practice Exam runner contract...');

// 1. Identity & unrecorded diagnostic nature
assert.ok(allReviewSources.includes('اختبار تدريبي'), 'must be framed as a Practice Exam');
assert.ok(allReviewSources.includes('تدريب حر غير مسجل رسمياً'), 'must state that it is unrecorded diagnostic practice');

// 2. Immediate feedback & answer evaluation
assert.ok(allReviewSources.includes('currentFeedback'), 'must have feedback state for active learning');
assert.ok(allReviewSources.includes('isCorrect'), 'must evaluate correctness');
assert.ok(allReviewSources.includes('السؤال التالي'), 'must support stepping through questions');

// 3. Results celebration & review
assert.ok(allReviewSources.includes('نسبة الإتقان'), 'must calculate and display mastery percentage');
assert.ok(allReviewSources.includes('تفاصيل أسئلة الجلسة التدريبية'), 'must provide question-by-question breakdown');
assert.ok(allReviewSources.includes('تدرّب على دفعة أخرى'), 'must allow starting another batch');

// 4. Governance & contract preservation
assert.ok(reviewSessionSource.includes('useSearchParams'), 'contract: useSearchParams required');
assert.ok(reviewSessionSource.includes('eventIdsRef'), 'contract: eventIdsRef required');
assert.ok(reviewSessionSource.includes('loading="lazy"'), 'contract: loading="lazy" required');
assert.ok(reviewSessionSource.includes('تحقق وسجّل المراجعة'), 'contract: تحقق وسجّل المراجعة required');
assert.ok(reviewSessionSource.includes('key={`review-tutor-${current.reviewType || "review"}-${current.questionId}`}'), 'contract: tutor key required');
assert.ok(reviewSessionSource.includes('key={`review-teacher-voice-${current.questionId}`}'), 'contract: voice player key required');
assert.ok(reviewSessionSource.includes('QuestionVoiceExplanationPlayer'), 'contract: voice player component required');
assert.ok(reviewSessionSource.includes('QuestionAssistantPanel'), 'contract: assistant panel component required');

// 5. Favorites entry point
assert.ok(favoritesSource.includes('to={`/review?mode=${activeTab}`}'), 'favorites must link to review with activeTab');
assert.ok(favoritesSource.includes('اختبار تدريبي'), 'favorites button must clarify practice test mode');

console.log('Review Practice Exam runner contract: ALL PASS ✅');
