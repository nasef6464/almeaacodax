import { Activity, QuizResult, SkillProgress, User } from '../../types';

export interface LearningProgressSliceState {
    user: User;
    completedLessons: string[];
    examResults: QuizResult[];
    recentActivity: Activity[];
    favorites: string[];
    reviewLater: string[];
    enrolledPaths: string[];
    skillProgress: SkillProgress[];
}

export interface LearningProgressSliceActions {
    hydrateExamResults: (results: QuizResult[]) => void;
    hydrateSkillProgress: (items: SkillProgress[]) => void;
    markLessonComplete: (lessonId: string, courseId: string, lessonTitle: string) => void;
    saveExamResult: (result: QuizResult) => void;
    addActivity: (activity: Omit<Activity, 'id' | 'date'>) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

type StoreGet<TState> = () => TState;

interface LearningProgressApi {
    updateMyPreferences: (payload: {
        favorites?: string[];
        reviewLater?: string[];
        enrolledPaths?: string[];
        completedLessons?: string[];
    }) => Promise<unknown>;
}

interface LearningProgressDependencies {
    mergeQuizResultsForStore: (
        existingResults: QuizResult[],
        incomingResults: QuizResult[],
        currentUserId?: string,
    ) => QuizResult[];
    shouldSyncUserToApi: (user?: User | null) => boolean;
}

export const createLearningProgressSlice = <TState extends LearningProgressSliceState>(
    set: StoreSet<TState>,
    get: StoreGet<TState>,
    api: LearningProgressApi,
    { mergeQuizResultsForStore, shouldSyncUserToApi }: LearningProgressDependencies,
): LearningProgressSliceActions => ({
    hydrateExamResults: (results) => set((state) => ({
        examResults: mergeQuizResultsForStore(
            state.examResults,
            Array.isArray(results) ? results : [],
            state.user?.id,
        ),
    }) as Partial<TState>),

    hydrateSkillProgress: (items) => set(() => ({
        skillProgress: (Array.isArray(items) ? items : [])
            .map((item: any) => ({
                ...item,
                id: String(item?.id || item?._id || ''),
                userId: String(item?.userId || ''),
                skillId: String(item?.skillId || ''),
                skill: String(item?.skill || ''),
                mastery: Number(item?.mastery || 0),
                attempts: Number(item?.attempts || 0),
            }))
            .filter((item: SkillProgress) => item.userId && item.skillId),
    }) as Partial<TState>),

    markLessonComplete: (lessonId, courseId, lessonTitle) => {
        const state = get();
        if (state.completedLessons.includes(lessonId)) return;
        const nextCompletedLessons = [...state.completedLessons, lessonId];

        const newActivity: Activity = {
            id: Date.now().toString(),
            type: 'lesson_complete',
            title: `أكملت درس: ${lessonTitle}`,
            date: new Date().toISOString(),
            link: `/course/${courseId}`,
        };

        if (shouldSyncUserToApi(state.user)) {
            api.updateMyPreferences({
                favorites: state.favorites,
                reviewLater: state.reviewLater,
                enrolledPaths: state.enrolledPaths,
                completedLessons: nextCompletedLessons,
            }).catch(console.error);
        }

        set((state) => ({
            completedLessons: nextCompletedLessons,
            recentActivity: [newActivity, ...state.recentActivity].slice(0, 10),
        }) as Partial<TState>);
    },

    saveExamResult: (result) => {
        const state = get();
        const newActivity: Activity = {
            id: Date.now().toString(),
            type: 'quiz_complete',
            title: `أنهيت اختبار: ${result.quizTitle} بنتيجة ${result.score}%`,
            date: new Date().toISOString(),
            link: '/results',
        };

        set((state) => ({
            examResults: mergeQuizResultsForStore(state.examResults, [result], state.user?.id),
            recentActivity: [newActivity, ...state.recentActivity].slice(0, 10),
        }) as Partial<TState>);
    },

    addActivity: (activity) => {
        const newActivity = { ...activity, id: Date.now().toString(), date: new Date().toISOString() };

        set((state) => ({
            recentActivity: [
                newActivity,
                ...state.recentActivity,
            ].slice(0, 10),
        }) as Partial<TState>);
    },
});
