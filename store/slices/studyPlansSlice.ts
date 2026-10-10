import { StudyPlan } from '../../types';

export interface StudyPlansSliceState {
    studyPlans: StudyPlan[];
    user?: { id: string };
}

export interface StudyPlansSliceActions {
    createStudyPlan: (plan: StudyPlan) => Promise<boolean>;
    updateStudyPlan: (planId: string, data: Partial<StudyPlan>) => Promise<boolean>;
    deleteStudyPlan: (planId: string) => Promise<boolean>;
    archiveStudyPlan: (planId: string) => Promise<boolean>;
}

type StoreSet<TState> = (partial: Partial<TState> | TState | ((state: TState) => Partial<TState> | TState)) => void;

interface StudyPlansApi {
    createStudyPlan: (payload: StudyPlan) => Promise<unknown>;
    updateStudyPlan: (id: string, payload: Partial<StudyPlan>) => Promise<unknown>;
    deleteStudyPlan: (id: string) => Promise<unknown>;
}

export const createStudyPlansSlice = <TState extends StudyPlansSliceState>(
    set: StoreSet<TState>, api: StudyPlansApi, get: () => TState,
): StudyPlansSliceActions => {
    const save = async (planId: string, payload: StudyPlan | Partial<StudyPlan>, create: boolean) => {
        const actorId = get().user?.id;
        if (!actorId) return false;
        try {
            const saved = await (create ? api.createStudyPlan(payload as StudyPlan) : api.updateStudyPlan(planId, payload)) as StudyPlan;
            if (get().user?.id !== actorId || saved?.id !== planId || saved.userId !== actorId) return false;
            set(state => ({ studyPlans: [saved, ...state.studyPlans.filter(plan => plan.id !== saved.id)] }) as Partial<TState>);
            return true;
        } catch (error) { console.error(error); return false; }
    };
    return {
        createStudyPlan: plan => save(plan.id, plan, true),
        updateStudyPlan: (id, data) => save(id, { ...data, updatedAt: Date.now() }, false),
        archiveStudyPlan: id => save(id, { status: 'archived', updatedAt: Date.now() }, false),
        deleteStudyPlan: async id => {
            const actorId = get().user?.id;
            try {
                await api.deleteStudyPlan(id);
                if (get().user?.id !== actorId) return false;
                set(state => ({ studyPlans: state.studyPlans.filter(plan => plan.id !== id) }) as Partial<TState>);
                return true;
            } catch (error) { console.error(error); return false; }
        },
    };
};
