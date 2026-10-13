import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { useStudentExperience } from '../contexts/StudentExperienceContext';
import type { SkillProgress } from '../types';
export const useStudentSkillProgress = (selectedPathId: string, selectedSubjectId: string) => {
    const user = useStore(state => state.user);
    const { scope } = useStudentExperience();
    const [read, setRead] = useState<{ key: string; rows: SkillProgress[] | null }>({ key: '', rows: null });
    const pathId = scope.activePathId || (selectedPathId !== 'all' ? selectedPathId : '');
    const subjectId = selectedSubjectId !== 'all' ? selectedSubjectId : '';
    const key = JSON.stringify([user.id, user.role, pathId, subjectId, scope.restricted, [...scope.stageByPath], scope.registeredPaths.map(path => path.id)]);
    useEffect(() => {
        if (!scope.isStudent) return;
        let active = true;
        void api.getSkillProgress({ ...(pathId ? { pathId } : {}), ...(subjectId ? { subjectId } : {}), noTotal: true })
            .then(rows => { if (active) setRead({ key, rows: Array.isArray(rows) ? rows as SkillProgress[] : null }); })
            .catch(() => { if (active) setRead({ key, rows: null }); });
        return () => { active = false; };
    }, [key]);
    return useMemo(() => read.key === key ? read.rows?.filter(row => scope.matchesContent(row) && (!pathId || row.pathId === pathId) && (!subjectId || row.subjectId === subjectId)) ?? null : null, [read, key, scope]);
};
