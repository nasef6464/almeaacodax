import { projectStudentPathEvidence } from './studentPathEvidence';
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useStudentExperience } from '../contexts/StudentExperienceContext';
// View projection only; canonical content, attempts and outcomes stay in the store.
export const useStudentScopedStore = () => {
    const state = useStore();
    const { scope } = useStudentExperience();
    return useMemo(() => !scope.restricted && !scope.activePathId && scope.stageByPath.size === 0 ? state : ({ ...state,
        paths: state.paths.filter(scope.pathVisible),
        levels: state.levels.filter(level => scope.matchesContent({ pathId: level.pathId, levelId: level.id })),
        subjects: state.subjects.filter(scope.matchesContent),
        courses: state.courses.filter(scope.matchesContent),
        quizzes: state.quizzes.filter(scope.matchesContent),
        questions: state.questions.filter(scope.matchesContent),
        examResults: projectStudentPathEvidence(state.examResults, scope, state.quizzes, state.questions),
        questionAttempts: projectStudentPathEvidence(state.questionAttempts, scope, state.quizzes, state.questions),
        lessons: state.lessons.filter(scope.matchesContent),
        topics: state.topics.filter(scope.matchesContent),
        libraryItems: state.libraryItems.filter(scope.matchesContent),
        skills: state.skills.filter(scope.matchesContent),
        studyPlans: (state.studyPlans || []).filter(scope.matchesContent),
    }), [state, scope]);
};
