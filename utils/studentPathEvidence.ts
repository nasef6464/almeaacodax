import type { buildStudentPathScope } from './studentPathScope';
type Scope = ReturnType<typeof buildStudentPathScope>;
type EvidenceRef = { pathId?: string; category?: string; subjectId?: string; subject?: string; levelId?: string | null; quizId?: string; questionId?: string; quizSnapshot?: EvidenceRef; questionSnapshot?: EvidenceRef; skillsAnalysis?: EvidenceRef[] };
export const projectStudentPathEvidence = <T extends EvidenceRef>(rows: T[], scope: Scope, quizzes: Array<EvidenceRef & { id: string }> = [], questions: Array<EvidenceRef & { id: string }> = []): T[] => {
    if (!scope.isStudent || (!scope.restricted && !scope.activePathId && scope.stageByPath.size === 0)) return rows;
    const quizById = new Map(quizzes.map(quiz => [quiz.id, quiz]));
    const questionById = new Map(questions.map(question => [question.id, question]));
    const hasScope = (item?: EvidenceRef): item is EvidenceRef => Boolean(item && scope.resolveContentPathId(item));
    return rows.filter(row => {
        const ref = [row, row.quizSnapshot, row.questionSnapshot, quizById.get(row.quizId || ''), questionById.get(row.questionId || '')].find(hasScope);
        if (ref) return scope.matchesContent(ref);
        const skills = (row.skillsAnalysis || []).filter(hasScope);
        if (skills.length) return skills.some(scope.matchesContent);
        // Unclassified history stays stored and available in outcome history;
        // it cannot substantiate a selected path/grade report.
        return !scope.restricted && !scope.activePathId;
    });
};
