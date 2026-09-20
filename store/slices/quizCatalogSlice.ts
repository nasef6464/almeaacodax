import { Quiz, Topic } from '../../types';

export interface QuizCatalogSliceState {
    quizzes: Quiz[];
    topics: Topic[];
}

export interface QuizCatalogSliceActions {
    addQuiz: (quiz: Quiz) => Promise<Quiz>;
    updateQuiz: (quizId: string, data: Partial<Quiz>) => Promise<Quiz>;
    deleteQuiz: (quizId: string) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

type StoreGet<TState> = () => TState;

interface QuizCatalogApi {
    createQuiz: (payload: Quiz) => Promise<unknown>;
    updateQuiz: (id: string, payload: Partial<Quiz>) => Promise<unknown>;
    deleteQuiz: (id: string) => Promise<unknown>;
    updateTopic: (id: string, payload: Partial<Topic>) => Promise<unknown>;
}

interface QuizCatalogDependencies {
    normalizeQuizPlacement: <T extends Partial<Quiz>>(quiz: T) => T;
}

export const createQuizCatalogSlice = <TState extends QuizCatalogSliceState>(
    set: StoreSet<TState>,
    get: StoreGet<TState>,
    api: QuizCatalogApi,
    { normalizeQuizPlacement }: QuizCatalogDependencies,
): QuizCatalogSliceActions => ({
    addQuiz: async (quiz) => {
        const normalizedQuiz = normalizeQuizPlacement({
            ...quiz,
            showOnPlatform: typeof quiz.showOnPlatform === 'boolean' ? quiz.showOnPlatform : false,
        }) as Quiz;
        const saved = await api.createQuiz(normalizedQuiz) as any;
        const finalQuiz: Quiz = {
            ...normalizedQuiz,
            ...saved,
            id: String(saved?.id || saved?._id || normalizedQuiz.id),
        };

        set((state) => ({
            quizzes: [finalQuiz, ...state.quizzes.filter((item) => item.id !== finalQuiz.id)],
        }) as Partial<TState>);

        return finalQuiz;
    },

    updateQuiz: async (quizId, data) => {
        const shouldNormalizePlacement =
            'type' in data ||
            'placement' in data ||
            'showInTraining' in data ||
            'showInMock' in data ||
            'quizKind' in data ||
            'mockExam' in data ||
            'learningPlacements' in data;

        const updatePayload = shouldNormalizePlacement
            ? normalizeQuizPlacement(data)
            : data;

        const saved = await api.updateQuiz(quizId, updatePayload) as any;
        const currentQuiz = get().quizzes.find((quiz) => quiz.id === quizId) ?? {};
        const finalQuiz: Quiz = {
            ...(currentQuiz as Quiz),
            ...updatePayload,
            ...saved,
            id: String(saved?.id || saved?._id || quizId),
        };
        const normalized = shouldNormalizePlacement
            ? normalizeQuizPlacement(finalQuiz)
            : finalQuiz;

        set((state) => ({
            quizzes: state.quizzes.map((quiz) =>
                quiz.id === quizId ? normalized as Quiz : quiz,
            ),
        }) as Partial<TState>);

        return normalized as Quiz;
    },

    deleteQuiz: (quizId) => {
        api.deleteQuiz(quizId).catch(console.error);
        set((state) => ({
            quizzes: state.quizzes.filter((quiz) => quiz.id !== quizId),
            topics: state.topics.map((topic) => {
                if (!topic.quizIds?.includes(quizId)) return topic;
                const nextQuizIds = topic.quizIds.filter((id) => id !== quizId);
                api.updateTopic(topic.id, { quizIds: nextQuizIds }).catch(console.error);
                return { ...topic, quizIds: nextQuizIds };
            }),
        }) as Partial<TState>);
    },
});
