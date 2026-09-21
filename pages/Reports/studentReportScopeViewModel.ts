import { Role, type CategoryPath, type CategorySubject } from '../../types';
import { displayText, getReportSkillKey, type StudentAggregatedSkill } from './reportDomain';

export interface StudentReportScopeInput {
    aggregatedSkills: StudentAggregatedSkill[];
    paths: CategoryPath[];
    subjects: CategorySubject[];
    enrolledPaths?: string[];
    selectedStudentPathId: string;
    selectedStudentSubjectId: string;
    selectedSkillKey: string;
    role: Role;
}

export interface StudentReportScope {
    weakestSkill: StudentAggregatedSkill | null;
    studentEnrolledPathIds: string[];
    studentEnrolledPathLabels: string[];
    studentReportPathOptions: CategoryPath[];
    studentReportSubjectOptions: CategorySubject[];
    studentPathScopedSkills: StudentAggregatedSkill[];
    studentSubjectScopedSkills: StudentAggregatedSkill[];
    reportBaseSkills: StudentAggregatedSkill[];
    reliableAggregatedSkills: StudentAggregatedSkill[];
    reliableWeakSkills: StudentAggregatedSkill[];
    reliableAverageSkills: StudentAggregatedSkill[];
    earlyWeakSignals: StudentAggregatedSkill[];
    focusedReportSkills: StudentAggregatedSkill[];
    primaryReportSkill: StudentAggregatedSkill | null;
    selectedReportSkill: StudentAggregatedSkill | null;
    studentTrackLabel: string;
    studentSubjectLabel: string;
    hasStudentTrackScope: boolean;
}

export const buildStudentReportScope = ({
    aggregatedSkills,
    paths,
    subjects,
    enrolledPaths,
    selectedStudentPathId,
    selectedStudentSubjectId,
    selectedSkillKey,
    role,
}: StudentReportScopeInput): StudentReportScope => {
    const weakestSkill = aggregatedSkills[0] || null;
    const studentEnrolledPathIds = Array.from(new Set(enrolledPaths || [])).filter(Boolean);
    const studentEnrolledPathLabels = studentEnrolledPathIds.map(
        (pathId, index) => displayText(paths.find((path) => path.id === pathId)?.name) || `مسار مسجل ${index + 1}`,
    );
    const studentReportPathOptions = paths.filter(
        (path) => studentEnrolledPathIds.includes(path.id) || role !== Role.STUDENT,
    );
    const effectiveStudentPathIds = selectedStudentPathId === 'all'
        ? studentEnrolledPathIds
        : [selectedStudentPathId].filter(Boolean);
    const studentPathScopedSkills = effectiveStudentPathIds.length > 0
        ? aggregatedSkills.filter((skill) => skill.pathId && effectiveStudentPathIds.includes(skill.pathId))
        : aggregatedSkills;
    const effectivePathIdsForSubjects = selectedStudentPathId === 'all'
        ? (studentEnrolledPathIds.length > 0 ? studentEnrolledPathIds : paths.map((path) => path.id))
        : [selectedStudentPathId];
    const studentReportSubjectOptions = subjects.filter((subject) => effectivePathIdsForSubjects.includes(subject.pathId));
    const studentSubjectScopedSkills = selectedStudentSubjectId === 'all'
        ? studentPathScopedSkills
        : studentPathScopedSkills.filter((skill) => skill.subjectId === selectedStudentSubjectId);
    const reportBaseSkills = selectedStudentSubjectId === 'all'
        ? (studentPathScopedSkills.length > 0 ? studentPathScopedSkills : aggregatedSkills)
        : studentSubjectScopedSkills;
    const reliableAggregatedSkills = reportBaseSkills.filter((skill) => skill.isReliable);
    const reliableWeakSkills = reliableAggregatedSkills.filter((skill) => skill.mastery < 50);
    const reliableAverageSkills = reliableAggregatedSkills.filter((skill) => skill.mastery >= 50 && skill.mastery < 75);
    const earlyWeakSignals = reportBaseSkills.filter((skill) => skill.mastery < 50 && !skill.isReliable);
    const focusedReportSkills = (
        reliableWeakSkills.length > 0
            ? [...reliableWeakSkills, ...reliableAverageSkills]
            : reliableAggregatedSkills.length > 0
                ? reliableAggregatedSkills
                : reportBaseSkills
    ).slice(0, 6);
    const primaryReportSkill = focusedReportSkills[0] || weakestSkill;
    const selectedReportSkill = aggregatedSkills.find(
        (skill) => getReportSkillKey(skill) === selectedSkillKey,
    ) || primaryReportSkill;

    return {
        weakestSkill,
        studentEnrolledPathIds,
        studentEnrolledPathLabels,
        studentReportPathOptions,
        studentReportSubjectOptions,
        studentPathScopedSkills,
        studentSubjectScopedSkills,
        reportBaseSkills,
        reliableAggregatedSkills,
        reliableWeakSkills,
        reliableAverageSkills,
        earlyWeakSignals,
        focusedReportSkills,
        primaryReportSkill,
        selectedReportSkill,
        studentTrackLabel: selectedStudentPathId !== 'all'
            ? displayText(paths.find((path) => path.id === selectedStudentPathId)?.name)
            : studentEnrolledPathLabels.length > 0 ? studentEnrolledPathLabels.join('، ') : '',
        studentSubjectLabel: selectedStudentSubjectId !== 'all'
            ? displayText(subjects.find((subject) => subject.id === selectedStudentSubjectId)?.name)
            : '',
        hasStudentTrackScope: studentEnrolledPathIds.length > 0,
    };
};
