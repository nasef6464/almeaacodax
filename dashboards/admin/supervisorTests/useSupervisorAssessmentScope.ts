import { useMemo } from 'react';
import { useStore } from '../../../store/useStore';
import { isTrueMockExam } from '../../../utils/quizPlacement';

export type SupervisorTestTabFilter = 'all' | 'drill' | 'test' | 'mock';

export const uniqueSupervisorStudentIds = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));

export const useSupervisorAssessmentScope = (tabFilter: SupervisorTestTabFilter) => {
  const { user, users, groups, quizzes, examResults } = useStore();

  const scopedGroupIds = useMemo(() => {
    const directGroupIds = new Set(user.groupIds || []);
    const directGroups = groups.filter(
      (group) => directGroupIds.has(group.id) || group.supervisorIds?.includes(user.id),
    );
    const schoolIds = new Set<string>();
    if (user.schoolId) schoolIds.add(user.schoolId);
    directGroups.forEach((group) => {
      if (group.type === 'SCHOOL') schoolIds.add(group.id);
      if (group.parentId) schoolIds.add(group.parentId);
    });

    const resolved = new Set<string>([
      ...Array.from(directGroupIds),
      ...directGroups.map((group) => group.id),
    ]);
    groups.forEach((group) => {
      if (group.parentId && schoolIds.has(group.parentId)) resolved.add(group.id);
    });
    if (user.schoolId) resolved.add(user.schoolId);
    return resolved;
  }, [groups, user.groupIds, user.id, user.schoolId]);

  const scopedStudentIds = useMemo(() => {
    const students = new Set<string>();
    groups
      .filter((group) => scopedGroupIds.has(group.id))
      .forEach((group) => (group.studentIds || []).forEach((id) => students.add(String(id))));

    users
      .filter((candidate) => candidate.role === 'student')
      .forEach((candidate) => {
        const candidateGroups = candidate.groupIds || [];
        if (
          (user.schoolId && candidate.schoolId === user.schoolId) ||
          candidateGroups.some((groupId) => scopedGroupIds.has(groupId))
        ) {
          students.add(candidate.id);
        }
      });
    return Array.from(students);
  }, [groups, scopedGroupIds, user.schoolId, users]);

  const scopedStudents = useMemo(
    () => scopedStudentIds.map((studentId) => {
      const student = users.find((candidate) => candidate.id === studentId);
      const classGroup = groups.find(
        (group) => group.type === 'CLASS' && scopedGroupIds.has(group.id) &&
          ((group.studentIds || []).includes(studentId) || student?.groupIds?.includes(group.id)),
      );
      return {
        id: studentId,
        name: student?.name || studentId,
        groupId: classGroup?.id,
        groupName: classGroup?.name,
      };
    }),
    [groups, scopedGroupIds, scopedStudentIds, users],
  );

  const quizzesWithStats = useMemo(() => quizzes
    .filter((quiz) =>
      (quiz.targetGroupIds || []).some((id) => scopedGroupIds.has(id)) ||
      (quiz.targetUserIds || []).some((id) => scopedStudentIds.includes(id)) ||
      quiz.createdBy === user.id,
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((quiz) => {
      const explicitGroupIds = (quiz.targetGroupIds || []).filter((id) => scopedGroupIds.has(id));
      const explicitUserIds = (quiz.targetUserIds || []).filter((id) => scopedStudentIds.includes(id));
      const hasExplicitTargets = explicitGroupIds.length > 0 || explicitUserIds.length > 0;
      const targetGroupIds = hasExplicitTargets ? explicitGroupIds : Array.from(scopedGroupIds);
      const targetStudents = new Set<string>(explicitUserIds);

      groups
        .filter((group) => targetGroupIds.includes(group.id))
        .forEach((group) => (group.studentIds || []).forEach((id) => {
          if (scopedStudentIds.includes(String(id))) targetStudents.add(String(id));
        }));
      if (!hasExplicitTargets) scopedStudentIds.forEach((id) => targetStudents.add(id));

      const targetStudentIds = Array.from(targetStudents);
      const targetStudentSet = new Set(targetStudentIds);
      const matchingResults = examResults.filter(
        (result) => result.quizId === quiz.id && !!result.userId && targetStudentSet.has(result.userId),
      );
      const latestResultByStudent = new Map<string, (typeof matchingResults)[number]>();
      matchingResults.forEach((result) => {
        if (!result.userId) return;
        const previous = latestResultByStudent.get(result.userId);
        if (!previous || new Date(result.date).getTime() > new Date(previous.date).getTime()) {
          latestResultByStudent.set(result.userId, result);
        }
      });
      const results = Array.from(latestResultByStudent.values());
      const avgScore = results.length
        ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
        : 0;
      const participationRate = targetStudentIds.length
        ? Math.round((results.length / targetStudentIds.length) * 100)
        : 0;

      return {
        ...quiz,
        stats: {
          results,
          allAttempts: matchingResults,
          avgScore,
          totalTargetStudents: targetStudentIds.length,
          targetStudentIds,
          participationRate,
        },
      };
    }), [examResults, groups, quizzes, scopedGroupIds, scopedStudentIds, user.id]);

  const summaryStats = useMemo(() => {
    const totalTests = quizzesWithStats.length;
    if (!totalTests) return { totalTests: 0, avgParticipation: 0, avgScore: 0, needingAttention: 0 };
    const testsWithResults = quizzesWithStats.filter((quiz) => quiz.stats.results.length > 0);
    return {
      totalTests,
      avgParticipation: Math.round(quizzesWithStats.reduce((sum, quiz) => sum + quiz.stats.participationRate, 0) / totalTests),
      avgScore: testsWithResults.length
        ? Math.round(testsWithResults.reduce((sum, quiz) => sum + quiz.stats.avgScore, 0) / testsWithResults.length)
        : 0,
      needingAttention: quizzesWithStats.filter((quiz) => quiz.stats.results.length > 0 && quiz.stats.avgScore < 60).length,
    };
  }, [quizzesWithStats]);

  const filteredQuizzes = useMemo(() => {
    if (tabFilter === 'all') return quizzesWithStats;
    if (tabFilter === 'mock') return quizzesWithStats.filter((quiz) => isTrueMockExam(quiz));
    if (tabFilter === 'drill') return quizzesWithStats.filter((quiz) => quiz.quizKind === 'drill');
    return quizzesWithStats.filter((quiz) => quiz.quizKind === 'test' || (!quiz.quizKind && !isTrueMockExam(quiz)));
  }, [quizzesWithStats, tabFilter]);

  return { user, users, groups, quizzes, scopedGroupIds, scopedStudentIds, scopedStudents, quizzesWithStats, filteredQuizzes, summaryStats };
};
