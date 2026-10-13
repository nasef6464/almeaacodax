import type { User, PathStageSelection } from '../../types';
import { captureAuthActor, isCurrentAuthActor } from '../../utils/authSessionLifetime';
type PathState = { user: User; enrolledPaths: string[]; pathStageSelections?: PathStageSelection[] };
type SetState<T> = (patch: Partial<T>) => void;
export const createPathEnrollmentActions = <T extends PathState>(set: SetState<T>, get: () => T, api: { updateMyPreferences: (payload: { enrolledPaths?: string[]; pathStageSelections?: PathStageSelection[] }) => Promise<unknown> }, shouldSync: (user: User) => boolean) => {
    let queue: Promise<void> = Promise.resolve();
    const change = (pathId: string, levelId?: string, remove = false): Promise<void> => {
        const actor = captureAuthActor(get().user);
        const operation = queue.catch(() => undefined).then(async () => {
            if (!isCurrentAuthActor(actor, get().user)) throw Error('تغيّر الحساب؛ أعد المحاولة من جلستك الحالية.');
            const current = get();
            const oldRows = current.pathStageSelections || [];
            if (!remove && current.enrolledPaths.includes(pathId) && (!levelId || oldRows.some(row => row.pathId === pathId && row.levelId === levelId))) return;
            const enrolledPaths = remove ? current.enrolledPaths.filter(id => id !== pathId) : [...new Set([...current.enrolledPaths, pathId])];
            const pathStageSelections = remove || levelId
                ? [...oldRows.filter(row => row.pathId !== pathId), ...(!remove && levelId ? [{ pathId, levelId }] : [])]
                : oldRows;
            let saved = { enrolledPaths, pathStageSelections };
            if (shouldSync(current.user)) {
                const response = await api.updateMyPreferences(saved) as { user?: { id?: string; _id?: string; enrolledPaths?: string[]; pathStageSelections?: PathStageSelection[] } };
                if (!isCurrentAuthActor(actor, get().user)) throw Error('تغيّر الحساب؛ أعد المحاولة من جلستك الحالية.');
                if (!response.user || String(response.user.id || response.user._id) !== actor.actorId || !Array.isArray(response.user.enrolledPaths)) throw Error('تعذر تأكيد حفظ تسجيل المسار؛ حاول مرة أخرى.');
                if (levelId && !response.user.pathStageSelections?.some(row => row.pathId === pathId && row.levelId === levelId)) throw Error('تعذر تأكيد حفظ المرحلة؛ حاول مرة أخرى.');
                saved = { enrolledPaths: response.user.enrolledPaths, pathStageSelections: response.user.pathStageSelections || [] };
            }
            set({ ...saved, user: { ...get().user, pathStageSelections: saved.pathStageSelections } } as Partial<T>);
        });
        queue = operation;
        return operation;
    };
    return { enrollPath: (pathId: string, levelId?: string) => change(pathId, levelId), unenrollPath: (pathId: string) => change(pathId, undefined, true) };
};
