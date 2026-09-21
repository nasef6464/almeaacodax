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
    hasStudentSubjectScope: boolean;
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

    const subjectPathIds = selectedStudentPathId === 'all'
        ? new Set(studentPathScopedSkills.map((skill) => skill.pathId).filter(Boolean))
        : new Set([selectedStudentPathId]);
    const scopedSubjectIds = new Set(
        studentPathScopedSkills.map((skill) => skill.subjectId).filter((value): value is string => Boolean(value)),
    );
    const studentReportSubjectOptions = subjects.filter((subject) => {
        if (subjectPathIds.size > 0 && !subjectPathIds.has(subject.pathId)) return false;
        if (scopedSubjectIds.size > 0 && !scopedSubjectIds.has(subject.id)) return false;
        return role !== Role.STUDENT || studentEnrolledPathIds.includes(subject.pathId);
    });

    const studentSubjectScopedSkills = selectedStudentSubjectId === 'all'
        ? studentPathScopedSkills
        : studentPathScopedSkills.filter((skill) => skill.subjectId === selectedStudentSubjectId);

    const reportBaseSkills = studentSubjectScopedSkills;
    const weakestSkill = reportBaseSkills[0] || aggregatedSkills[0] || null;
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
    const selectedReportSkill = reportBaseSkills.find(
        (skill) => getReportSkillKey(skill) === selectedSkillKey,
    ) || primaryReportSkill;

    const selectedPathLabel = selectedStudentPathId === 'all'
        ? studentEnrolledPathLabels.join('، ')
        : displayText(paths.find((path) => path.id === selectedStudentPathId)?.name);
    const selectedSubjectLabel = selectedStudentSubjectId === 'all'
        ? ''
        : displayText(subjects.find((subject) => subject.id === selectedStudentSubjectId)?.name);

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
        studentTrackLabel: selectedPathLabel,
        studentSubjectLabel: selectedSubjectLabel,
        hasStudentTrackScope: studentEnrolledPathIds.length > 0,
        hasStudentSubjectScope: selectedStudentSubjectId !== 'all',
    };
};
