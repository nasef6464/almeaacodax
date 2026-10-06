import type { Group, User } from '../../types';
import {
    displayText,
    type ScopedAnalyticsOverview,
    type ScopedQuizResult,
} from './reportDomain';

type ScopedStudent = ScopedAnalyticsOverview['weakestStudents'][number];

export interface ScopedGroupPerformanceRow {
    groupName: string;
    averageScore: number;
    attempts: number;
    weakAttempts: number;
    weakStudentCount: number;
    studentCount: number;
}

export interface ScopedTeacherPerformanceRow {
    id: string;
    name: string;
    groupCount: number;
    attempts: number;
    averageScore: number;
    weakStudentCount: number;
}

export const buildScopedAvailableGroups = (
    scopedAnalytics: ScopedAnalyticsOverview | null,
): string[] => {
    const names = new Set<string>();
    (scopedAnalytics?.weakestStudents || []).forEach((student) => {
        (student.groupNames || []).forEach((name) => {
            const normalized = displayText(name);
            if (normalized) names.add(normalized);
        });
    });
    return Array.from(names);
};

export const filterScopedStudentsByGroup = (
    scopedAnalytics: ScopedAnalyticsOverview | null,
    groupFilter: string,
): ScopedStudent[] => {
    if (!scopedAnalytics?.weakestStudents?.length) return [];
    if (groupFilter === 'all') return scopedAnalytics.weakestStudents;
    return scopedAnalytics.weakestStudents.filter((student) =>
        (student.groupNames || []).some((name) => displayText(name) === groupFilter),
    );
};

export const buildScopedLatestResults = (
    scopedResults: ScopedQuizResult[],
    groupFilter: string,
    filteredStudents: ScopedStudent[],
): ScopedQuizResult[] => {
    if (!scopedResults.length) return [];
    const filtered = groupFilter === 'all'
        ? scopedResults
        : scopedResults.filter((result) =>
            filteredStudents.some((student) => student.id === result.userId),
        );
    return filtered.slice(0, 6);
};

export const buildScopedGroupPerformanceRows = ({
    scopedAnalytics,
    scopedResults,
    groups,
}: {
    scopedAnalytics: ScopedAnalyticsOverview | null;
    scopedResults: ScopedQuizResult[];
    groups: Group[];
}): ScopedGroupPerformanceRow[] => {
    if (!scopedAnalytics) return [];

    const groupNameById = new Map(groups.map((group) => [group.id, displayText(group.name) || group.id]));
    const studentGroups = new Map<string, string[]>();
    const rows = new Map<string, {
        groupName: string;
        scoreTotal: number;
        attempts: number;
        weakAttempts: number;
        weakStudentIds: Set<string>;
        studentIds: Set<string>;
    }>();

    const ensureRow = (groupName: string) => {
        const safeGroupName = displayText(groupName) || 'مجموعة غير محددة';
        const current = rows.get(safeGroupName);
        if (current) return current;

        const created = {
            groupName: safeGroupName,
            scoreTotal: 0,
            attempts: 0,
            weakAttempts: 0,
            weakStudentIds: new Set<string>(),
            studentIds: new Set<string>(),
        };
        rows.set(safeGroupName, created);
        return created;
    };

    scopedAnalytics.weakestStudents.forEach((student) => {
        const names = (student.groupNames || []).map(displayText).filter(Boolean);
        const ids = (student.groupIds || []).map((groupId) => groupNameById.get(groupId) || groupId).filter(Boolean);
        const resolvedNames = names.length ? names : ids;
        if (!resolvedNames.length) return;

        studentGroups.set(student.id, resolvedNames);
        resolvedNames.forEach((groupName) => {
            const row = ensureRow(groupName);
            row.studentIds.add(student.id);
            row.weakStudentIds.add(student.id);
        });
    });

    scopedResults.forEach((result) => {
        const directGroups = (result.studentGroupIds || [])
            .map((groupId) => groupNameById.get(groupId) || groupId)
            .filter(Boolean);
        const resolvedGroups = directGroups.length
            ? directGroups
            : (result.userId ? studentGroups.get(result.userId) || [] : []);
        const score = Number(result.score || 0);
        const studentId = String(result.userId || result.studentEmail || result.studentName || '');

        resolvedGroups.forEach((groupName) => {
            const row = ensureRow(groupName);
            row.scoreTotal += score;
            row.attempts += 1;
            if (score < 75) row.weakAttempts += 1;
            if (studentId) row.studentIds.add(studentId);
        });
    });

    return Array.from(rows.values())
        .map((row) => ({
            groupName: row.groupName,
            averageScore: row.attempts ? Math.round(row.scoreTotal / row.attempts) : 0,
            attempts: row.attempts,
            weakAttempts: row.weakAttempts,
            weakStudentCount: row.weakStudentIds.size,
            studentCount: row.studentIds.size,
        }))
        .sort((a, b) => {
            const weaknessScoreA = a.weakStudentCount * 10 + a.weakAttempts - a.averageScore;
            const weaknessScoreB = b.weakStudentCount * 10 + b.weakAttempts - b.averageScore;
            return weaknessScoreB - weaknessScoreA;
        })
        .slice(0, 8);
};

export const getStrongestScopedGroup = (
    groupRows: ScopedGroupPerformanceRow[],
): ScopedGroupPerformanceRow | null =>
    [...groupRows]
        .filter((group) => group.attempts > 0)
        .sort((a, b) => b.averageScore - a.averageScore || a.weakStudentCount - b.weakStudentCount)[0] || null;

export const buildScopedTeacherPerformanceRows = ({
    scopedAnalytics,
    scopedResults,
    groups,
    users,
}: {
    scopedAnalytics: ScopedAnalyticsOverview | null;
    scopedResults: ScopedQuizResult[];
    groups: Group[];
    users: User[];
}): ScopedTeacherPerformanceRow[] => {
    if (!scopedAnalytics) return [];

    const scopedGroupIds = new Set<string>([
        ...scopedAnalytics.weakestStudents.flatMap((student) => student.groupIds || []),
        ...scopedResults.flatMap((result) => result.studentGroupIds || []),
    ]);
    const scopedGroups = groups.filter((group) => scopedGroupIds.has(group.id));

    return users
        .filter((candidate) => candidate.role === 'teacher')
        .map((teacher) => {
            const teacherGroupIds = new Set(
                scopedGroups
                    .filter((group) => group.supervisorIds.includes(teacher.id) || (teacher.groupIds || []).includes(group.id))
                    .map((group) => group.id),
            );
            const teacherResults = scopedResults.filter((result) =>
                (result.studentGroupIds || []).some((groupId) => teacherGroupIds.has(groupId)),
            );
            if (teacherGroupIds.size === 0 || teacherResults.length === 0) return null;

            const weakStudentIds = new Set(
                teacherResults
                    .filter((result) => Number(result.score || 0) < 70)
                    .map((result) => result.userId)
                    .filter(Boolean),
            );
            return {
                id: teacher.id,
                name: displayText(teacher.name) || displayText(teacher.email) || 'معلم',
                groupCount: teacherGroupIds.size,
                attempts: teacherResults.length,
                averageScore: Math.round(
                    teacherResults.reduce((total, result) => total + Number(result.score || 0), 0) / teacherResults.length,
                ),
                weakStudentCount: weakStudentIds.size,
            };
        })
        .filter((teacher): teacher is ScopedTeacherPerformanceRow => Boolean(teacher))
        .sort((a, b) => a.averageScore - b.averageScore || b.weakStudentCount - a.weakStudentCount)
        .slice(0, 8);
};
