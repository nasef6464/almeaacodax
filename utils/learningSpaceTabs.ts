/**
 * URL-facing values are intentionally kept stable. The canonical names let new
 * learning features use product vocabulary without rewriting existing links or
 * subject settings.
 */
export type LearningTab = 'courses' | 'skills' | 'banks' | 'tests' | 'library';

export type LearningSpace = 'courses' | 'foundation' | 'practice' | 'assessments' | 'library';

export const learningSpaceByTab: Record<LearningTab, LearningSpace> = {
  courses: 'courses',
  skills: 'foundation',
  banks: 'practice',
  tests: 'assessments',
  library: 'library',
};

const learningTabAliases: Record<string, LearningTab> = {
  courses: 'courses',
  course: 'courses',
  skills: 'skills',
  foundation: 'skills',
  topics: 'skills',
  banks: 'banks',
  bank: 'banks',
  training: 'banks',
  trainings: 'banks',
  practice: 'banks',
  tests: 'tests',
  test: 'tests',
  quizzes: 'tests',
  quiz: 'tests',
  assessments: 'tests',
  assessment: 'tests',
  library: 'library',
  files: 'library',
  support: 'library',
};

export const normalizeLearningTab = (value?: string | null): LearningTab | null => {
  if (!value) return null;
  return learningTabAliases[value.toLowerCase()] || null;
};
