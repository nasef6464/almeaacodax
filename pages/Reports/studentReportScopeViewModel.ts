import { Role, type CategoryPath } from '../../types';
import { displayText, getReportSkillKey, type StudentAggregatedSkill } from './reportDomain';

export interface StudentReportScopeInput {
    aggregatedSkills: StudentAggregatedSkill[];
    paths: CategoryPath[];
    enrolledPaths?: string[];
    selectedStudentPathId: string;
    selectedSkillKey: string;
    role: Role;
}

export interface StudentReportScope {
    weakestSkill: StudentAggregatedSkill | null;
    studentEnrolledPathIds: string[];
    studentEnrolledPathLabels: string[];
    studentReportPathOptions: CategoryPath[];
    studentPathScopedSkills: StudentAggregatedSkill[];
    reportBaseSkills: StudentAggregatedSkill[];
    reliableAggregatedSkills: StudentAggregatedSkill[];
    reliableWeakSkills: StudentAggregatedSkill[];
    reliableAverageSkills: StudentAggregatedSkill[];
    earlyWeakSignals: StudentAggregatedSkill[];
    focusedReportSkills: StudentAggregatedSkill[];
    primaryReportSkill: StudentAggregatedSkill | null;
    selectedReportSkill: StudentAggregatedSkill | null;
    studentTrackLabel: string;
    hasStudentTrackScope: boolean;
}

export const buildStudentReportScope = ({
    aggregatedSkills,
    paths,
    enrolledPaths,
    selectedStudentPathId,
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
    const reportBaseSkills = studentPathScopedSkills.length > 0 ? studentPathScopedSkills : aggregatedSkills;
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
        studentPathScopedSkills,
        reportBaseSkills,
        reliableAggregatedSkills,
        reliableWeakSkills,
        reliableAverageSkills,
        earlyWeakSignals,
        focusedReportSkills,
        primaryReportSkill,
        selectedReportSkill,
        studentTrackLabel: studentEnrolledPathLabels.length > 0 ? studentEnrolledPathLabels.join('، ') : '',
        hasStudentTrackScope: studentEnrolledPathIds.length > 0,
    };
};
