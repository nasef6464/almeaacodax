import type { Quiz } from '../types';

/** Preserve the published mock policy when converting the API definition. */
export const normalizeMockExam = (
  mock: any,
  cleanText: (value: unknown) => string = (value) => String(value || '').trim(),
): Quiz['mockExam'] => mock ? ({
  enabled: mock.enabled === true,
  pathId: String(mock.pathId || ''),
  qiyasCategory: ['qudrat', 'tahsili', 'specialized'].includes(mock.qiyasCategory) ? mock.qiyasCategory : undefined,
  targetScore: typeof mock.targetScore === 'number' && Number.isFinite(mock.targetScore) ? mock.targetScore : undefined,
  isStrictSectionLock: typeof mock.isStrictSectionLock === 'boolean' ? mock.isStrictSectionLock : undefined,
  presentationMode: ['qiyas_strict', 'flexible'].includes(mock.presentationMode) ? mock.presentationMode : undefined,
  sections: Array.isArray(mock.sections) ? mock.sections.map((section: any) => ({
    id: String(section?.id || ''),
    title: cleanText(section?.title),
    subjectId: section?.subjectId ? String(section.subjectId) : undefined,
    questionIds: Array.isArray(section?.questionIds) ? section.questionIds.map(String) : [],
    timeLimit: typeof section?.timeLimit === 'number' ? section.timeLimit : undefined,
    order: typeof section?.order === 'number' ? section.order : 0,
    domain: ['quantitative', 'verbal', 'math', 'physics', 'chemistry', 'biology', 'general'].includes(section?.domain) ? section.domain : undefined,
    isStrictSectionLock: typeof section?.isStrictSectionLock === 'boolean' ? section.isStrictSectionLock : undefined,
  })) : [],
}) : undefined;
