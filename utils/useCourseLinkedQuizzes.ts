import { useEffect, useState } from 'react';
import type { Course, Quiz } from '../types';
import { adapter } from '../services/adapter';

// Direct course routes use a minimal bootstrap. Read only linked quiz metadata.
export const useCourseLinkedQuizzes = (course: Course, actorId: string, enabled: boolean): Quiz[] => {
    const ids = [...new Set([
        ...(course.assessments || []).filter(item => item.showOnPlatform !== false).map(item => item.quizId),
        ...(course.modules || []).flatMap(module => module.lessons || []).map(lesson => String(lesson.quizId || '').trim() || String(lesson.id || '').trim().match(/^course_quiz_(.+)_\d+$/)?.[1]),
    ].filter((id): id is string => Boolean(id)))].sort();
    const key = JSON.stringify([course.id, actorId, enabled, ids]);
    const [loaded, setLoaded] = useState<{ key: string; quizzes: Quiz[] }>({ key: '', quizzes: [] });
    useEffect(() => {
        const [, , active, linkedIds] = JSON.parse(key) as [string, string, boolean, string[]];
        if (!active || !linkedIds.length) return;
        let cancelled = false;
        void Promise.all(linkedIds.map(id => adapter.getQuiz(id, { includeQuestions: false })))
            .then(items => {
                if (!cancelled) setLoaded({ key, quizzes: items.filter((quiz): quiz is Quiz => quiz !== null) });
            });
        return () => { cancelled = true; };
    }, [key]);
    return loaded.key === key ? loaded.quizzes : [];
};
