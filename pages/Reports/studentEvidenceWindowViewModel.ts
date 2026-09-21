import type { QuestionAttempt, QuizResult } from '../../types';
import { getReportItemTimestamp } from './reportDomain';

export const RECENT_STUDENT_QUIZ_RESULT_LIMIT = 5;

const resolveQuizResultPathId = (result: QuizResult) =>
    String(
        result.quizSnapshot?.pathId
        || result.skillsAnalysis?.find((skill) => skill.pathId)?.pathId
        || '',
    ).trim();

const resolveQuestionAttemptPathId = (attempt: QuestionAttempt) =>
    String(attempt.pathId || '').trim();

const sortRecentFirst = <T extends { date?: string; createdAt?: string | number }>(items: T[]) =>
    [...items].sort((a, b) => getReportItemTimestamp(b as any) - getReportItemTimestamp(a as any));

export const buildStudentEvidenceWindow = ({
    examResults,
    questionAttempts,
    selectedPathId,
    recentResultLimit = RECENT_STUDENT_QUIZ_RESULT_LIMIT,
}: {
    examResults: QuizResult[];
    questionAttempts: QuestionAttempt[];
    selectedPathId: string;
    recentResultLimit?: number;
}) => {
    const pathScopedExamResults = selectedPathId === 'all'
        ? examResults
        : examResults.filter((result) => resolveQuizResultPathId(result) === selectedPathId);

    const pathScopedQuestionAttempts = selectedPathId === 'all'
        ? questionAttempts
        : questionAttempts.filter((attempt) => resolveQuestionAttemptPathId(attempt) === selectedPathId);

    const boundedLimit = Math.max(1, Math.min(20, Math.floor(recentResultLimit || RECENT_STUDENT_QUIZ_RESULT_LIMIT)));
    const recentExamResults = sortRecentFirst(pathScopedExamResults).slice(0, boundedLimit);

    return {
        pathScopedExamResults,
        pathScopedQuestionAttempts,
        recentExamResults,
        recentResultLimit: boundedLimit,
    };
};
