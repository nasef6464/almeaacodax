import type { Quiz } from '../types';

export const isPathMockExam = (quiz: Quiz, pathId?: string) => {
  const enabled = quiz.mockExam?.enabled === true;
  const pathMatches = !pathId || quiz.mockExam?.pathId === pathId || quiz.pathId === pathId;
  return enabled && pathMatches;
};

export const isStandaloneMockExam = (quiz: Quiz) => quiz.mockExam?.enabled === true;

export const isMockExam = isStandaloneMockExam;

/**
 * يحدد ما إذا كان الاختبار يجب أن يظهر في QuizzesManager.
 * - يستبعد المحاكيات القديمة standalone التي لا تملك quizKind صريحاً
 *   (كانت تُنشأ بشكل منفصل قبل نظام quizKind).
 * - يسمح للمحاكيات الجديدة ذات quizKind: 'mock' بالظهور.
 */
export const isMaterialQuizCandidate = (quiz: Quiz) => {
  // إذا كانت لديها quizKind صريح → اعرضها دائماً (drill/test/mock كلها تظهر)
  if (quiz.quizKind) return true;
  // المحاكيات القديمة بدون quizKind وبها mockExam.enabled → أبق السلوك القديم (استبعاد)
  if (isStandaloneMockExam(quiz)) return false;
  return true;
};

export const getMockExamSections = (quiz: Quiz) =>
  [...(quiz.mockExam?.sections || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const flattenMockExamQuestionIds = (quiz: Quiz) => {
  const ids = getMockExamSections(quiz).flatMap((section) => section.questionIds || []);
  return Array.from(new Set(ids.length ? ids : quiz.questionIds || []));
};

export const getMockExamQuestionCount = (quiz: Quiz) => flattenMockExamQuestionIds(quiz).length;

export const getMockExamTimeLimit = (quiz: Quiz) => {
  const sectionTotal = getMockExamSections(quiz).reduce((sum, section) => sum + (Number(section.timeLimit) || 0), 0);
  return sectionTotal || quiz.settings?.timeLimit || 60;
};
export function getAllQuizQuestionIds(quiz: Quiz): string[] {
  const root = quiz.questionIds || [];
  const fromSections = (quiz.mockExam?.sections || []).flatMap(s => s.questionIds || []);
  return [...new Set([...root, ...fromSections])];
}

/** Keep section order while randomizing only the questions within each section. */
export const orderMockExamQuestions = <T extends { id: string }>(
  quiz: Quiz,
  questions: T[],
  randomize = false,
  random: () => number = Math.random,
): T[] => {
  const sections = getMockExamSections(quiz);
  if (!sections.length) return [...questions];
  const used = new Set<string>();
  const ordered = sections.flatMap((section) => {
    const ids = new Set(section.questionIds || []);
    const group = questions.filter((question) => ids.has(question.id) && !used.has(question.id));
    group.forEach((question) => used.add(question.id));
    if (randomize) {
      for (let index = group.length - 1; index > 0; index -= 1) {
        const target = Math.floor(random() * (index + 1));
        [group[index], group[target]] = [group[target], group[index]];
      }
    }
    return group;
  });
  // Keep already-resolved legacy references; never supplement from a bank.
  return [...ordered, ...questions.filter((question) => !used.has(question.id))];
};
