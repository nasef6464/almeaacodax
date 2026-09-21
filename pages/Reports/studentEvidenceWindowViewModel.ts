import type { QuestionAttempt, QuizResult } from '../../types';
import { getReportItemTimestamp } from './reportDomain';

export const RECENT_STUDENT_QUIZ_RESULT_LIMIT = 5;

const resolveQuizResultPathId = (result: QuizResult) =>
    String(
        result.quizSnapshot?.pathId
        || result.skillsAnalysis?.find((skill) => skill.pathId)?.pathId
        || '',
    ).trim();

const resolveQuizResultSubjectId = (result: QuizResult) =>
    String(
        result.quizSnapshot?.subjectId
        || result.skillsAnalysis?.find((skill) => skill.subjectId)?.subjectId
        || '',
    ).trim();

const resolveQuestionAttemptPathId = (attempt: QuestionAttempt) =>
    String(attempt.pathId || '').trim();

const resolveQuestionAttemptSubjectId = (attempt: QuestionAttempt) =>
    String(attempt.subjectId || '').trim();

const sortRecentFirst = <T extends { date?: string; createdAt?: string | number }>(items: T[]) =>
    [...items].sort((a, b) => getReportItemTimestamp(b as any) - getReportItemTimestamp(a as any));

export const buildStudentEvidenceWindow = ({
    examResults,
    questionAttempts,
    selectedPathId,
    selectedSubjectId = 'all',
    recentResultLimit = RECENT_STUDENT_QUIZ_RESULT_LIMIT,
}: {
    examResults: QuizResult[];
    questionAttempts: QuestionAttempt[];
    selectedPathId: string;
    selectedSubjectId?: string;
    recentResultLimit?: number;
}) => {
    const pathScopedExamResults = selectedPathId === 'all'
        ? examResults
        : examResults.filter((result) => resolveQuizResultPathId(result) === selectedPathId);

    const pathScopedQuestionAttempts = selectedPathId === 'all'
        ? questionAttempts
        : questionAttempts.filter((attempt) => resolveQuestionAttemptPathId(attempt) === selectedPathId);

    const subjectScopedExamResults = selectedSubjectId === 'all'
        ? pathScopedExamResults
        : pathScopedExamResults.filter((result) => resolveQuizResultSubjectId(result) === selectedSubjectId);

    const subjectScopedQuestionAttempts = selectedSubjectId === 'all'
        ? pathScopedQuestionAttempts
        : pathScopedQuestionAttempts.filter((attempt) => resolveQuestionAttemptSubjectId(attempt) === selectedSubjectId);

    const boundedLimit = Math.max(1, Math.min(20, Math.floor(recentResultLimit || RECENT_STUDENT_QUIZ_RESULT_LIMIT)));
    const recentExamResults = sortRecentFirst(subjectScopedExamResults).slice(0, boundedLimit);

    return {
        pathScopedExamResults: subjectScopedExamResults,
        pathScopedQuestionAttempts: subjectScopedQuestionAttempts,
        recentExamResults,
        recentResultLimit: boundedLimit,
    };
};
