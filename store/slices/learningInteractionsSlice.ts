import { QuestionAttempt, User } from '../../types';

export interface LearningInteractionsSliceState {
    user: User;
    questionAttempts: QuestionAttempt[];
    favorites: string[];
    reviewLater: string[];
}

export interface LearningInteractionsSliceActions {
    hydrateQuestionAttempts: (attempts: QuestionAttempt[]) => void;
    recordQuestionAttempt: (attempt: QuestionAttempt) => void;
    toggleFavorite: (questionId: string) => void;
    toggleReviewLater: (questionId: string) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

type StoreGet<TState> = () => TState;

interface LearningInteractionsApi {
    createQuestionAttempt: (payload: Omit<QuestionAttempt, 'isCorrect'>) => Promise<unknown>;
    updateMyPreferences: (payload: {
        favorites?: string[];
        reviewLater?: string[];
        enrolledPaths?: string[];
        completedLessons?: string[];
    }) => Promise<unknown>;
}

interface LearningInteractionsDependencies {
    shouldSyncUserToApi: (user?: User | null) => boolean;
}

export const createLearningInteractionsSlice = <TState extends LearningInteractionsSliceState>(
    set: StoreSet<TState>,
    get: StoreGet<TState>,
    api: LearningInteractionsApi,
    { shouldSyncUserToApi }: LearningInteractionsDependencies,
): LearningInteractionsSliceActions => ({
    hydrateQuestionAttempts: (attempts) => set(() => ({
        questionAttempts: (Array.isArray(attempts) ? attempts : [])
            .map((attempt: any) => ({
                questionId: String(attempt?.questionId || ''),
                selectedOptionIndex: Number(attempt?.selectedOptionIndex ?? -1),
                isCorrect: Boolean(attempt?.isCorrect),
                timeSpentSeconds: Number(attempt?.timeSpentSeconds ?? 0),
                date: String(attempt?.date || attempt?.createdAt || new Date().toISOString()),
            }))
            .filter((attempt) => attempt.questionId),
    }) as Partial<TState>),

    recordQuestionAttempt: (attempt) => {
        const state = get();
        if (shouldSyncUserToApi(state.user)) {
            const { isCorrect: _localOnly, ...serverAttempt } = attempt;
            api.createQuestionAttempt(serverAttempt).catch(console.error);
        }
        set((state) => ({
            questionAttempts: [...state.questionAttempts, attempt].slice(-500),
        }) as Partial<TState>);
    },

    toggleFavorite: (questionId) => set((state) => ({
        favorites: (() => {
            const nextFavorites = state.favorites.includes(questionId)
                ? state.favorites.filter((id) => id !== questionId)
                : [...state.favorites, questionId];

            if (shouldSyncUserToApi(state.user)) {
                api.updateMyPreferences({
                    favorites: nextFavorites,
                    reviewLater: state.reviewLater,
                }).catch(console.error);
            }

            return nextFavorites;
        })(),
    }) as Partial<TState>),

    toggleReviewLater: (questionId) => set((state) => ({
        reviewLater: (() => {
            const nextReviewLater = state.reviewLater.includes(questionId)
                ? state.reviewLater.filter((id) => id !== questionId)
                : [...state.reviewLater, questionId];

            if (shouldSyncUserToApi(state.user)) {
                api.updateMyPreferences({
                    favorites: state.favorites,
                    reviewLater: nextReviewLater,
                }).catch(console.error);
            }

            return nextReviewLater;
        })(),
    }) as Partial<TState>),
});
