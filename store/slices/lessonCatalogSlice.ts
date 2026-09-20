import { Lesson, Topic } from '../../types';

export interface LessonCatalogSliceState {
    lessons: Lesson[];
    topics: Topic[];
}

export interface LessonCatalogSliceActions {
    addLesson: (lesson: Lesson) => void;
    updateLesson: (lessonId: string, data: Partial<Lesson>) => void;
    deleteLesson: (lessonId: string) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface LessonCatalogApi {
    createLesson: (payload: Lesson) => Promise<unknown>;
    updateLesson: (id: string, payload: Partial<Lesson>) => Promise<unknown>;
    deleteLesson: (id: string) => Promise<unknown>;
    updateTopic: (id: string, payload: Partial<Topic>) => Promise<unknown>;
}

export const createLessonCatalogSlice = <TState extends LessonCatalogSliceState>(
    set: StoreSet<TState>,
    api: LessonCatalogApi,
): LessonCatalogSliceActions => ({
    addLesson: (lesson) => {
        const normalizedLesson: Lesson = {
            ...lesson,
            showOnPlatform: typeof lesson.showOnPlatform === 'boolean' ? lesson.showOnPlatform : false,
        };
        api.createLesson(normalizedLesson).catch(console.error);
        set((state) => ({
            lessons: [normalizedLesson, ...state.lessons],
        }) as Partial<TState>);
    },

    updateLesson: (lessonId, data) => {
        api.updateLesson(lessonId, data).catch(console.error);
        set((state) => ({
            lessons: state.lessons.map((lesson) =>
                lesson.id === lessonId ? { ...lesson, ...data } : lesson,
            ),
        }) as Partial<TState>);
    },

    deleteLesson: (lessonId) => {
        api.deleteLesson(lessonId).catch(console.error);
        set((state) => ({
            lessons: state.lessons.filter((lesson) => lesson.id !== lessonId),
            topics: state.topics.map((topic) => {
                if (!topic.lessonIds?.includes(lessonId)) return topic;
                const nextLessonIds = topic.lessonIds.filter((id) => id !== lessonId);
                api.updateTopic(topic.id, { lessonIds: nextLessonIds }).catch(console.error);
                return { ...topic, lessonIds: nextLessonIds };
            }),
        }) as Partial<TState>);
    },
});
