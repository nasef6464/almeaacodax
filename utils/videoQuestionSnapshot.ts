import { InteractiveQuestion, Question } from '../types';

export type VideoQuestionPlaybackSnapshot = NonNullable<InteractiveQuestion['inlineQuestion']>;

export const createVideoQuestionSnapshot = (question: Question): VideoQuestionPlaybackSnapshot => ({
  text: question.text,
  options: question.options,
  correctOptionIndex: question.correctOptionIndex,
  type: question.type === 'true_false' ? 'true_false' : 'mcq',
  imageUrl: question.imageUrl || undefined,
  explanation: question.explanation || undefined,
  videoUrl: question.videoUrl || undefined,
});

export const isValidVideoQuestionSnapshot = (snapshot?: VideoQuestionPlaybackSnapshot) => Boolean(
  snapshot &&
  snapshot.text.trim() &&
  snapshot.options.length >= 2 &&
  snapshot.correctOptionIndex >= 0 &&
  snapshot.correctOptionIndex < snapshot.options.length,
);
