import { Question, Quiz } from '../../types';

export interface QuestionCatalogSliceState {
    questions: Question[];
    quizzes: Quiz[];
}

export interface QuestionCatalogSliceActions {
    addQuestion: (question: Question) => Promise<Question>;
    updateQuestion: (questionId: string, data: Partial<Question>) => Promise<Question>;
    deleteQuestion: (questionId: string) => Promise<void>;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface QuestionCatalogApi {
    createQuestion: (payload: Question) => Promise<unknown>;
    updateQuestion: (id: string, payload: Partial<Question>) => Promise<unknown>;
    deleteQuestion: (id: string) => Promise<unknown>;
}

export const createQuestionCatalogSlice = <TState extends QuestionCatalogSliceState>(
    set: StoreSet<TState>,
    api: QuestionCatalogApi,
): QuestionCatalogSliceActions => ({
    addQuestion: async (question) => {
        const created = await api.createQuestion(question) as any;
        const normalizedQuestion = {
            ...question,
            id: String(created?.id || created?._id || question.id),
            ...created,
        } as Question;

        set((state) => ({
            questions: [
                normalizedQuestion,
                ...state.questions.filter((item) => item.id !== normalizedQuestion.id),
            ],
        }) as Partial<TState>);

        return normalizedQuestion;
    },

    updateQuestion: async (questionId, data) => {
        const updated = await api.updateQuestion(questionId, data) as any;
        const persistedQuestion = {
            ...data,
            ...updated,
            id: String(updated?.id || updated?._id || questionId),
        } as Question;

        set((state) => ({
            questions: state.questions.map((question) =>
                question.id === questionId ? { ...question, ...persistedQuestion } : question,
            ),
        }) as Partial<TState>);

        return persistedQuestion;
    },

    deleteQuestion: async (questionId) => {
        await api.deleteQuestion(questionId);
        set((state) => ({
            questions: state.questions.filter((question) => question.id !== questionId),
            quizzes: state.quizzes.map((quiz) => {
                const hasInRoot = quiz.questionIds?.includes(questionId);
                const hasInSections = quiz.mockExam?.sections?.some((section) =>
                    section.questionIds?.includes(questionId),
                );
                if (!hasInRoot && !hasInSections) return quiz;

                return {
                    ...quiz,
                    questionIds: quiz.questionIds?.filter((id) => id !== questionId),
                    mockExam: quiz.mockExam
                        ? {
                            ...quiz.mockExam,
                            sections: quiz.mockExam.sections?.map((section) => ({
                                ...section,
                                questionIds: section.questionIds?.filter((id) => id !== questionId) ?? [],
                            })),
                        }
                        : quiz.mockExam,
                };
            }),
        }) as Partial<TState>);
    },
});
