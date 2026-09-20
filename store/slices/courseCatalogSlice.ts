import { Course } from '../../types';

export interface CourseCatalogSliceState {
    courses: Course[];
}

export interface CourseCatalogSliceActions {
    addCourse: (course: Course) => Promise<Course | null>;
    updateCourse: (courseId: string, data: Partial<Course>) => Promise<Course | null>;
    deleteCourse: (courseId: string) => Promise<void>;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface CourseCatalogApi {
    createCourse: (payload: Course) => Promise<unknown>;
    updateCourse: (id: string, payload: Partial<Course>) => Promise<unknown>;
    deleteCourse: (id: string) => Promise<unknown>;
}

interface CourseCatalogDependencies {
    normalizeCourseForStore: (course: Partial<Course>) => Course;
    resolveEntityId: (entity: unknown, fallback?: string) => string;
}

export const createCourseCatalogSlice = <TState extends CourseCatalogSliceState>(
    set: StoreSet<TState>,
    api: CourseCatalogApi,
    { normalizeCourseForStore, resolveEntityId }: CourseCatalogDependencies,
): CourseCatalogSliceActions => ({
    addCourse: async (course) => {
        const normalizedCourse = normalizeCourseForStore(course);
        try {
            const created = await api.createCourse(normalizedCourse) as any;
            const persistedCourse = normalizeCourseForStore({
                ...normalizedCourse,
                ...created,
                id: resolveEntityId(created, normalizedCourse.id),
            });
            set((state) => ({
                courses: [
                    persistedCourse,
                    ...state.courses.filter((item) => resolveEntityId(item) !== persistedCourse.id),
                ],
            }) as Partial<TState>);
            return persistedCourse;
        } catch (error) {
            console.error('Failed to persist course:', error);
            throw error;
        }
    },

    updateCourse: async (courseId, data) => {
        try {
            const updated = await api.updateCourse(courseId, data) as any;
            const persistedCourse = normalizeCourseForStore({
                ...data,
                ...updated,
                id: resolveEntityId(updated, courseId),
            });
            set((state) => ({
                courses: state.courses.map((course) =>
                    resolveEntityId(course) === String(courseId)
                        ? { ...course, ...persistedCourse }
                        : course,
                ),
            }) as Partial<TState>);
            return persistedCourse;
        } catch (error) {
            console.error('Failed to persist course update:', error);
            throw error;
        }
    },

    deleteCourse: async (courseId) => {
        try {
            await api.deleteCourse(courseId);
            set((state) => ({
                courses: state.courses.filter((course) =>
                    resolveEntityId(course) !== String(courseId),
                ),
            }) as Partial<TState>);
        } catch (error) {
            console.error('Failed to delete course:', error);
            throw error;
        }
    },
});
