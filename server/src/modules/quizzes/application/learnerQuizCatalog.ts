import { QuestionModel } from "../../../models/Question.js";
import { QuizModel } from "../../../models/Quiz.js";
import { getQuizQuestionIds } from "./quizQuestionSelection.js";
import { buildDocumentsByIdsQuery, uniqueStrings } from "../infrastructure/quizDocumentQuery.js";
import { isQuestionContentUsable } from "../presentation/questionPresentation.js";

const RAW_SCAN_BATCH_SIZE = 200;

type LearnerQuizCatalogPageOptions = {
  filter: Record<string, unknown>;
  page: number;
  limit: number;
  noTotal: boolean;
  learnerAudience?: any;
};

const isQuizTargetedToLearner = (quiz: any, user?: any) => {
  const targetUserIds = new Set((quiz.targetUserIds || []).map(String));
  const targetGroupIds = new Set((quiz.targetGroupIds || []).map(String));
  if (targetUserIds.size === 0 && targetGroupIds.size === 0) {
    return true;
  }
  if (!user) {
    return false;
  }

  const userGroupIds = uniqueStrings([
    ...(user.groupIds || []).map(String),
    ...(user.schoolId ? [String(user.schoolId)] : []),
  ]);
  return (
    targetUserIds.has(String(user.id || user._id || "")) ||
    userGroupIds.some((groupId: string) => targetGroupIds.has(groupId))
  );
};

const buildQuestionUsabilityMap = async (quizzes: any[]) => {
  const questionIds = uniqueStrings(quizzes.flatMap((quiz) => getQuizQuestionIds(quiz).map(String)));
  if (questionIds.length === 0) {
    return new Map<string, boolean>();
  }

  const questions = await QuestionModel.find(buildDocumentsByIdsQuery(questionIds))
    .select("id text imageUrl options type")
    .lean();

  const usableById = new Map<string, boolean>();
  questions.forEach((question: any) => {
    const usable = isQuestionContentUsable(question);
    const aliases = uniqueStrings([
      question.id ? String(question.id) : "",
      question._id ? String(question._id) : "",
    ]);

    aliases.forEach((alias) => {
      usableById.set(alias, usable);
      const withoutCopySuffix = alias.replace(/_copy(?:_\d+)?$/i, "");
      if (withoutCopySuffix && withoutCopySuffix !== alias) {
        usableById.set(withoutCopySuffix, usable);
      }
    });
  });

  return usableById;
};

const sanitizeLearnerQuizQuestionRefs = (quiz: any, usableById: Map<string, boolean>) => {
  const isUsableQuestionId = (questionId: unknown) =>
    usableById.get(String(questionId || "").trim()) === true;

  const safeQuestionIds = getQuizQuestionIds(quiz).filter(isUsableQuestionId);
  const mockSections = Array.isArray(quiz?.mockExam?.sections) ? quiz.mockExam.sections : [];
  const sanitizedSections = quiz?.mockExam?.enabled === true
    ? mockSections
        .map((section: any) => ({
          ...section,
          questionIds: uniqueStrings(
            (Array.isArray(section?.questionIds) ? section.questionIds : [])
              .map(String)
              .filter(isUsableQuestionId),
          ),
        }))
        .filter((section: any) => section.questionIds.length > 0)
    : mockSections;

  return {
    ...quiz,
    questionIds: safeQuestionIds,
    ...(quiz?.mockExam
      ? {
          mockExam: {
            ...quiz.mockExam,
            sections: sanitizedSections,
          },
        }
      : {}),
  };
};

const filterLearnerSafeQuizzes = async (quizzes: any[], learnerAudience?: any) => {
  if (quizzes.length === 0) {
    return [];
  }

  const usableById = await buildQuestionUsabilityMap(quizzes);
  return quizzes.flatMap((quiz) => {
    if (!isQuizTargetedToLearner(quiz, learnerAudience)) {
      return [];
    }

    const sanitizedQuiz = sanitizeLearnerQuizQuestionRefs(quiz, usableById);
    if (getQuizQuestionIds(sanitizedQuiz).length === 0) {
      return [];
    }

    const hasExplicitTarget =
      (quiz.targetUserIds || []).length > 0 ||
      (quiz.targetGroupIds || []).length > 0;

    return [
      hasExplicitTarget
        ? { ...sanitizedQuiz, viewerAudienceVerified: true }
        : sanitizedQuiz,
    ];
  });
};

/**
 * Learner eligibility is a post-query rule because it depends on question
 * usability and the resolved learner audience. Raw Mongo pagination therefore
 * cannot be authoritative: a raw page can shrink after filtering and hide
 * older valid quizzes. Scan bounded raw batches and paginate the safe stream.
 */
export async function loadLearnerSafeQuizCatalogPage({
  filter,
  page,
  limit,
  noTotal,
  learnerAudience,
}: LearnerQuizCatalogPageOptions) {
  const safeSkip = Math.max(0, (page - 1) * limit);
  const requestedSafeCount = noTotal ? limit + 1 : limit;
  const pageItems: any[] = [];
  let rawSkip = 0;
  let safeCount = 0;
  let hasMore = false;

  while (true) {
    const rawBatch = await QuizModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(rawSkip)
      .limit(RAW_SCAN_BATCH_SIZE)
      .lean();

    if (rawBatch.length === 0) {
      break;
    }

    rawSkip += rawBatch.length;
    const safeBatch = await filterLearnerSafeQuizzes(rawBatch, learnerAudience);

    for (const quiz of safeBatch) {
      if (safeCount >= safeSkip && pageItems.length < requestedSafeCount) {
        pageItems.push(quiz);
      }
      safeCount += 1;

      if (noTotal && pageItems.length > limit) {
        hasMore = true;
        break;
      }
    }

    if (noTotal && hasMore) {
      break;
    }
    if (rawBatch.length < RAW_SCAN_BATCH_SIZE) {
      break;
    }
  }

  const items = pageItems.slice(0, limit);
  return {
    items,
    hasMore,
    total: noTotal
      ? safeSkip + items.length + (hasMore ? 1 : 0)
      : safeCount,
  };
}
