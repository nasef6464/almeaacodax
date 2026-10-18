import { createHash } from 'node:crypto';
import { buildQuestionAssistantPrompt } from './questionAssistant.js';
import { compactTeachingInstruction } from './compactTeachingPlan.js';
import { TEACHING_IMAGE_GROUNDING_POLICY } from './teachingImageGrounding.js';

const openingRequest = 'اشرح حل هذا السؤال مباشرة بخطوات قصيرة، واكتب المعطيات والمعادلات على السبورة.';
export const SHARED_TEACHING_CACHE_OWNER = '@shared-teaching-scenario';

/** Only the fixed opening lesson is reusable. Follow-ups remain learner-scoped. */
export function sharedTeachingScenario(
  request: { boardMode?: string; helpLevel: string; message?: string; boardContext?: string },
  source: { questionId: string; questionCode: string; questionVersion: string; questionText: string; options: string[];
    correctOptionIndex?: number; explanation: string; skillLabels: string[]; visualDescription: string;
    hasImage: boolean; imageVersion: string; schoolId: string },
) {
  if (!['storyboard_v1','storyboard_v2'].includes(request.boardMode || '') || request.helpLevel !== 'steps' || request.boardContext || request.message !== openingRequest) return null;
  const prompt = `${buildQuestionAssistantPrompt({
    structuredBoard: true, level: 'steps', questionText: source.questionText, questionCode: source.questionCode,
    visualDescription: source.visualDescription, options: source.options, correctOptionIndex: source.correctOptionIndex,
    explanation: source.explanation, skillLabels: source.skillLabels, hasImage: source.hasImage,
    studentMessage: openingRequest,
  })}\n${compactTeachingInstruction('lesson', 'ar-SA')}`;
  // Hash full source values, not lengths: same-length edits must invalidate cached plans.
  const digest = createHash('sha256').update(JSON.stringify([
    request.boardMode === 'storyboard_v2' ? `shared-teaching-v2-${TEACHING_IMAGE_GROUNDING_POLICY}` : 'shared-teaching-v1', source.schoolId, source.questionId, source.questionVersion, source.imageVersion, prompt,
  ])).digest('hex');
  return { cacheKey: `teaching:${digest}`, prompt };
}
