import { StudyPlan } from '../../types';

export interface StudyPlansSliceState {
    studyPlans: StudyPlan[];
}

export interface StudyPlansSliceActions {
    createStudyPlan: (plan: StudyPlan) => void;
    updateStudyPlan: (planId: string, data: Partial<StudyPlan>) => void;
    deleteStudyPlan: (planId: string) => void;
    archiveStudyPlan: (planId: string) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface StudyPlansApi {
    createStudyPlan: (payload: StudyPlan) => Promise<unknown>;
    updateStudyPlan: (id: string, payload: Partial<StudyPlan>) => Promise<unknown>;
    deleteStudyPlan: (id: string) => Promise<unknown>;
}

export const createStudyPlansSlice = <TState extends StudyPlansSliceState>(
    set: StoreSet<TState>,
    api: StudyPlansApi,
): StudyPlansSliceActions => ({
    createStudyPlan: (plan) => {
        api.createStudyPlan(plan).catch(console.error);
        set((state) => ({
            studyPlans: [
                plan,
                ...state.studyPlans.filter(existingPlan => existingPlan.id !== plan.id),
            ],
        } as Partial<TState>));
    },
    updateStudyPlan: (planId, data) => {
        const updatedAt = Date.now();
        api.updateStudyPlan(planId, { ...data, updatedAt }).catch(console.error);
        set((state) => ({
            studyPlans: state.studyPlans.map(plan =>
                plan.id === planId
                    ? { ...plan, ...data, updatedAt }
                    : plan,
            ),
        } as Partial<TState>));
    },
    deleteStudyPlan: (planId) => {
        api.deleteStudyPlan(planId).catch(console.error);
        set((state) => ({
            studyPlans: state.studyPlans.filter(plan => plan.id !== planId),
        } as Partial<TState>));
    },
    archiveStudyPlan: (planId) => {
        const updatedAt = Date.now();
        api.updateStudyPlan(planId, { status: 'archived', updatedAt }).catch(console.error);
        set((state) => ({
            studyPlans: state.studyPlans.map(plan =>
                plan.id === planId
                    ? { ...plan, status: 'archived', updatedAt }
                    : plan,
            ),
        } as Partial<TState>));
    },
});
