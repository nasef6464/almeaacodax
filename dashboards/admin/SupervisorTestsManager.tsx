import React, { useState, useMemo } from 'react';
import {
  ClipboardList, Plus, FileText, Activity, BarChart, Target, Calendar,
  Users, ArrowRight, AlertTriangle, Bell, RefreshCw, CheckCircle, XCircle,
  Award, BookOpen, Dumbbell, X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Quiz } from '../../types';
import { TestAnalyticsReport } from './TestAnalyticsReport';
import { UnifiedQuizBuilder } from './UnifiedQuizBuilder';
import { MockExamManager } from './MockExamManager';
import { api } from '../../services/api';
import { isTrueMockExam } from '../../utils/quizPlacement';
import { QuizAssignWidget } from './QuizAssignWidget';
import { AssignedTestDetailPanel } from './AssignedTestDetailPanel';

type ViewMode = 'list' | 'create' | 'create_normal' | 'create_mock' | 'analytics' | 'compare';
type TabFilter = 'all' | 'drill' | 'test' | 'mock';

const uniqueStrings = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));

export const SupervisorTestsManager: React.FC = () => {
  const { user, users, groups, quizzes, examResults, updateQuiz } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [reassignQuizId, setReassignQuizId] = useState<string | null>(null);
  const [reassignGroupIds, setReassignGroupIds] = useState<string[]>([]);
  const [notifiedQuizId, setNotifiedQuizId] = useState<string | null>(null);
  const [selectedQuizzesForComparison, setSelectedQuizzesForComparison] = useState<string[]>([]);
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [assignWidgetQuizId, setAssignWidgetQuizId] = useState<string | null>(null);
  const [detailPanelQuizId, setDetailPanelQuizId] = useState<string | null>(null);

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

    const finalGroupIds = new Set<string>([
      ...Array.from(directGroupIds),
      ...directGroups.map((group) => group.id),
    ]);
    groups.forEach((group) => {
      if (group.parentId && schoolIds.has(group.parentId)) finalGroupIds.add(group.id);
    });
    if (user.schoolId) finalGroupIds.add(user.schoolId);
    return finalGroupIds;
  }, [user, groups]);

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

  const builderProps = useMemo(() => ({
    role: 'supervisor' as const,
    allowedGroupIds: Array.from(scopedGroupIds),
    allowedSchoolGroupId: user.schoolId || undefined,
  }), [scopedGroupIds, user.schoolId]);

  const assignedQuizzes = useMemo(
    () => quizzes
      .filter((quiz) =>
        (quiz.targetGroupIds || []).some((id) => scopedGroupIds.has(id)) ||
        (quiz.targetUserIds || []).some((id) => scopedStudentIds.includes(id)) ||
        quiz.createdBy === user.id,
      )
      .sort((a, b) => b.createdAt - a.createdAt),
    [quizzes, scopedGroupIds, scopedStudentIds, user.id],
  );

  const quizzesWithStats = useMemo(
    () => assignedQuizzes.map((quiz) => {
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
      const avgScore = results.length > 0
        ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
        : 0;
      const participationRate = targetStudentIds.length > 0
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
    }),
    [assignedQuizzes, examResults, groups, scopedGroupIds, scopedStudentIds],
  );

  const summaryStats = useMemo(() => {
    const totalTests = quizzesWithStats.length;
    if (totalTests === 0) return { totalTests: 0, avgParticipation: 0, avgScore: 0, needingAttention: 0 };

    const totalParticipationSum = quizzesWithStats.reduce((sum, quiz) => sum + quiz.stats.participationRate, 0);
    const testsWithResults = quizzesWithStats.filter((quiz) => quiz.stats.results.length > 0);
    const totalScoreSum = testsWithResults.reduce((sum, quiz) => sum + quiz.stats.avgScore, 0);
    const needingAttention = quizzesWithStats.filter(
      (quiz) => quiz.stats.results.length > 0 && quiz.stats.avgScore < 60,
    ).length;

    return {
      totalTests,
      avgParticipation: Math.round(totalParticipationSum / totalTests),
      avgScore: testsWithResults.length > 0 ? Math.round(totalScoreSum / testsWithResults.length) : 0,
      needingAttention,
    };
  }, [quizzesWithStats]);

  const filteredQuizzes = useMemo(() => {
    if (tabFilter === 'all') return quizzesWithStats;
    if (tabFilter === 'mock') return quizzesWithStats.filter((quiz) => isTrueMockExam(quiz));
    if (tabFilter === 'drill') return quizzesWithStats.filter((quiz) => quiz.quizKind === 'drill');
    return quizzesWithStats.filter((quiz) => quiz.quizKind === 'test' || (!quiz.quizKind && !isTrueMockExam(quiz)));
  }, [quizzesWithStats, tabFilter]);

  const handleSaveReassign = async (quizId: string) => {
    try {
      await updateQuiz(quizId, { targetGroupIds: reassignGroupIds });
      setReassignQuizId(null);
      setReassignGroupIds([]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر حفظ التكليف، حاول مجدداً');
    }
  };

  const sendScopedStudentAlert = async (studentIds: string[], title: string, body: string) => {
    const recipients = uniqueStrings(studentIds).filter((id) => scopedStudentIds.includes(id));
    if (recipients.length === 0) return;
    await api.sendStudentAlert({
      studentIds: recipients,
      title,
      body,
      channels: ['in_app'],
    });
  };

  const handleRemindStudents = async (quizWithStats: (typeof quizzesWithStats)[0]) => {
    const participatedIds = new Set(quizWithStats.stats.results.map((result) => result.userId).filter(Boolean));
    const absentIds = quizWithStats.stats.targetStudentIds.filter((id) => !participatedIds.has(id));
    if (absentIds.length === 0) return;

    try {
      await sendScopedStudentAlert(
        absentIds,
        'تذكير بأداء الاختبار',
        `نذكرك بضرورة أداء الاختبار: ${quizWithStats.title}`,
      );
      setNotifiedQuizId(quizWithStats.id);
      setTimeout(() => setNotifiedQuizId(null), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  const allowedPathIds = useMemo(() => {
    const pathSet = new Set<string>();
    groups
      .filter((group) => scopedGroupIds.has(group.id))
      .forEach(() => undefined);
    return pathSet.size > 0 ? Array.from(pathSet) : undefined;
  }, [groups, scopedGroupIds]);

  if (viewMode === 'create') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">اختر نوع الاختبار</h2>
              <p className="text-white/80 text-sm mt-0.5">سيُوجَّه فقط داخل نطاق مدرستك وفصولك</p>
            </div>
            <button onClick={() => setViewMode('list')} className="p-2 rounded-full hover:bg-white/20 transition-all">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-3">
            <button
              onClick={() => setViewMode('create_normal')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 transition-all text-right"
            >
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><Dumbbell size={24} /></div>
              <div>
                <p className="font-black text-gray-900">تدريب / اختبار عادي</p>
                <p className="text-xs text-gray-500 mt-0.5">اختبار مادة أو مهارة مع توجيه لفصل أو طلاب محددين</p>
              </div>
            </button>
            <button
              onClick={() => setViewMode('create_mock')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 hover:border-violet-400 transition-all text-right"
            >
              <div className="p-3 bg-violet-100 rounded-xl text-violet-600"><Award size={24} /></div>
              <div>
                <p className="font-black text-gray-900">محاكي قياس</p>
                <p className="text-xs text-gray-500 mt-0.5">محاكي متعدد الأقسام مع متابعة المشاركة والنتائج بعد التوجيه</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'create_normal') {
    return (
      <UnifiedQuizBuilder
        role="supervisor"
        allowedGroupIds={builderProps.allowedGroupIds}
        defaultKind="test"
        onClose={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'create_mock') {
    return (
      <MockExamManager
        role="supervisor"
        allowedGroupIds={builderProps.allowedGroupIds}
        allowedPathIds={allowedPathIds}
        allowedSchoolGroupId={user.schoolId || undefined}
        onClose={() => setViewMode('list')}
        initialExamType="mock"
      />
    );
  }

  if (viewMode === 'analytics' && selectedQuizId) {
    const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId);
    if (!selectedQuiz) { setViewMode('list'); return null; }
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setViewMode('list'); setSelectedQuizId(null); }}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold print:hidden"
        >
          <ArrowRight size={20} />
          العودة للقائمة
        </button>
        <TestAnalyticsReport quiz={selectedQuiz} studentIds={scopedStudentIds} />
      </div>
    );
  }

  if (viewMode === 'compare') {
    const comparisonQuizzes = quizzes.filter((quiz) => selectedQuizzesForComparison.includes(quiz.id));
    if (comparisonQuizzes.length === 0) { setViewMode('list'); return null; }
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setViewMode('list'); setSelectedQuizId(null); }}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold print:hidden"
        >
          <ArrowRight size={20} />
          العودة للقائمة
        </button>
        <TestAnalyticsReport quizzes={comparisonQuizzes} studentIds={scopedStudentIds} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-indigo-600" />
            مركز الاختبارات والتدخلات
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            أنشئ ووجّه الاختبارات، تابع المشاركة والنتائج، ثم أعد الاستهداف أو ذكّر الطلاب من نفس الرحلة.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedQuizzesForComparison.length > 1 && (
            <button
              onClick={() => setViewMode('compare')}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-600 transition-all"
            >
              <Activity size={18} />
              مقارنة ({selectedQuizzesForComparison.length})
            </button>
          )}
          <button
            onClick={() => setViewMode('create')}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            اختبار جديد
          </button>
        </div>
      </div>

      {quizzesWithStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
            <ClipboardList className="text-indigo-500 mb-2" size={24} />
            <span className="text-gray-500 text-xs font-bold mb-1">إجمالي الاختبارات</span>
            <span className="text-2xl font-black text-gray-900">{summaryStats.totalTests}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
            <Users className="text-blue-500 mb-2" size={24} />
            <span className="text-gray-500 text-xs font-bold mb-1">متوسط المشاركة</span>
            <span className="text-2xl font-black text-gray-900">{summaryStats.avgParticipation}%</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
            <Target className="text-emerald-500 mb-2" size={24} />
            <span className="text-gray-500 text-xs font-bold mb-1">متوسط الدرجات</span>
            <span className="text-2xl font-black text-gray-900">{summaryStats.avgScore}%</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center">
            <AlertTriangle className="text-rose-500 mb-2" size={24} />
            <span className="text-gray-500 text-xs font-bold mb-1">تحتاج تدخلاً</span>
            <span className="text-2xl font-black text-gray-900">{summaryStats.needingAttention}</span>
          </div>
        </div>
      )}

      {quizzesWithStats.length > 0 && (
        <div className="flex gap-2 border-b border-gray-100 pb-1 overflow-x-auto">
          {(['all', 'drill', 'test', 'mock'] as TabFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setTabFilter(tab)}
              className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-sm font-black transition-all shrink-0 ${
                tabFilter === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              {tab === 'all' && <><ClipboardList size={14} /> الكل ({quizzesWithStats.length})</>}
              {tab === 'drill' && <><Dumbbell size={14} /> تدريبات ({quizzesWithStats.filter((quiz) => quiz.quizKind === 'drill').length})</>}
              {tab === 'test' && <><BookOpen size={14} /> اختبارات ({quizzesWithStats.filter((quiz) => quiz.quizKind === 'test' || (!quiz.quizKind && !isTrueMockExam(quiz))).length})</>}
              {tab === 'mock' && <><Award size={14} /> محاكيات ({quizzesWithStats.filter((quiz) => isTrueMockExam(quiz)).length})</>}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center">
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4">
              <ClipboardList className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد اختبارات في هذا القسم</h3>
            <p className="text-gray-500 max-w-md text-sm mb-6">ابدأ باختبار جديد ثم وجّهه لفصل أو لطالب واحد أو أكثر داخل نطاقك.</p>
            <button
              onClick={() => setViewMode('create')}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
            >
              <Plus size={18} />
              اختبار جديد
            </button>
          </div>
        ) : (
          filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedQuizzesForComparison.includes(quiz.id)}
                    onChange={(event) => {
                      if (event.target.checked) setSelectedQuizzesForComparison([...selectedQuizzesForComparison, quiz.id]);
                      else setSelectedQuizzesForComparison(selectedQuizzesForComparison.filter((id) => id !== quiz.id));
                    }}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className={`p-2.5 rounded-xl ${
                    isTrueMockExam(quiz) ? 'bg-violet-100 text-violet-600' : quiz.quizKind === 'drill' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {isTrueMockExam(quiz) ? <Award size={22} /> : quiz.quizKind === 'drill' ? <Dumbbell size={22} /> : <FileText size={22} />}
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  isTrueMockExam(quiz) ? 'bg-violet-50 text-violet-700 border-violet-200' : quiz.quizKind === 'drill' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {isTrueMockExam(quiz) ? 'محاكي' : quiz.quizKind === 'drill' ? 'تدريب' : 'اختبار'}
                </span>
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-4 line-clamp-2">{quiz.title}</h3>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={16} />
                  <span>{new Date(quiz.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={16} className="shrink-0" />
                  <div className="flex-1 w-full">
                    <div className="flex justify-between mb-1.5 text-xs">
                      <span>المشاركة: {quiz.stats.results.length} من {quiz.stats.totalTargetStudents} طالب</span>
                      <span className="font-bold">{quiz.stats.participationRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${quiz.stats.participationRate}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Target size={16} />
                  <span>متوسط آخر نتيجة: <strong className={quiz.stats.avgScore >= 60 ? 'text-emerald-600' : 'text-rose-600'}>{quiz.stats.avgScore}%</strong></span>
                </div>
              </div>

              {reassignQuizId === quiz.id && (
                <div className="mb-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 text-sm">
                  <h4 className="font-bold text-gray-900 mb-3 flex justify-between items-center">
                    تعديل المجموعات المستهدفة
                    <button onClick={() => setReassignQuizId(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                      <XCircle size={16} />
                    </button>
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-2 mb-3 px-1">
                    {groups.filter((group) => scopedGroupIds.has(group.id)).map((group) => (
                      <label key={group.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-indigo-50 rounded">
                        <input
                          type="checkbox"
                          checked={reassignGroupIds.includes(group.id)}
                          onChange={(event) => {
                            if (event.target.checked) setReassignGroupIds([...reassignGroupIds, group.id]);
                            else setReassignGroupIds(reassignGroupIds.filter((id) => id !== group.id));
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                        />
                        <span className="text-gray-700 text-xs font-bold">{group.name}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => handleSaveReassign(quiz.id)} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 flex justify-center items-center gap-2 transition-all shadow-sm">
                    <CheckCircle size={14} />
                    تأكيد التكليف
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setDetailPanelQuizId(quiz.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 font-bold hover:bg-violet-100 transition-all text-xs shadow-sm"
                >
                  <BarChart size={14} />
                  متابعة الطلاب
                </button>
                <button
                  onClick={() => setAssignWidgetQuizId(quiz.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-all text-xs shadow-sm"
                >
                  <RefreshCw size={14} />
                  توجيه / إعادة تكليف
                </button>
                {quiz.stats.participationRate < 100 && quiz.stats.totalTargetStudents > 0 && (
                  <button
                    onClick={() => handleRemindStudents(quiz)}
                    disabled={notifiedQuizId === quiz.id}
                    className={`col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition-all text-xs border shadow-sm ${
                      notifiedQuizId === quiz.id ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {notifiedQuizId === quiz.id ? <><CheckCircle size={14} /> تم التذكير</> : <><Bell size={14} /> تذكير الطلاب الذين لم يؤدوا الاختبار</>}
                  </button>
                )}
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => { setSelectedQuizId(quiz.id); setViewMode('analytics'); }}
                  className="flex-1 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/80 text-indigo-700 font-bold hover:bg-indigo-600 hover:text-white transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  <BarChart size={18} />
                  التحليل الاحترافي
                </button>
                {isTrueMockExam(quiz) && (
                  <button
                    onClick={() => { setSelectedQuizId(quiz.id); setViewMode('analytics'); }}
                    title="تقرير أداء الطلاب لكل قسم"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 font-bold hover:bg-violet-600 hover:text-white transition-all text-xs shadow-sm"
                  >
                    <Activity size={16} />
                    الأقسام
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {assignWidgetQuizId && (() => {
        const quiz = quizzes.find((candidate) => candidate.id === assignWidgetQuizId);
        if (!quiz) return null;
        const scopedGroupsList = groups
          .filter((group) => scopedGroupIds.has(group.id))
          .map((group) => ({ id: group.id, name: group.name, studentIds: group.studentIds }));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold opacity-80">توجيه اختبار</p>
                  <h3 className="text-base font-black">{quiz.title}</h3>
                </div>
                <button type="button" onClick={() => setAssignWidgetQuizId(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={18}/>
                </button>
              </div>
              <div className="p-5 max-h-[80vh] overflow-y-auto">
                <QuizAssignWidget
                  quizId={quiz.id}
                  quizTitle={quiz.title}
                  quizKind={quiz.quizKind}
                  scopedGroups={scopedGroupsList}
                  scopedStudents={scopedStudents.map((student) => ({ id: student.id, name: student.name, groupId: student.groupId }))}
                  existingConfig={{
                    targetGroupIds: quiz.targetGroupIds || [],
                    targetUserIds: quiz.targetUserIds || [],
                    dueDate: quiz.dueDate,
                  }}
                  hideAccessType={true}
                  confirmLabel="حفظ التوجيه"
                  onCancel={() => setAssignWidgetQuizId(null)}
                  onAssign={async (config) => {
                    const targetStudentIds = uniqueStrings([
                      ...config.targetUserIds,
                      ...groups
                        .filter((group) => config.targetGroupIds.includes(group.id))
                        .flatMap((group) => group.studentIds || []),
                    ]).filter((id) => scopedStudentIds.includes(id));

                    await updateQuiz(quiz.id, {
                      targetGroupIds: config.targetGroupIds,
                      targetUserIds: config.targetUserIds,
                      dueDate: config.dueDate,
                      supervisorMessage: config.message || null,
                    });

                    if (targetStudentIds.length > 0) {
                      await sendScopedStudentAlert(
                        targetStudentIds,
                        'اختبار موجّه من المشرف',
                        config.message || `تم توجيه اختبار لك: ${quiz.title}`,
                      );
                    }
                  }}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {detailPanelQuizId && (() => {
        const quizWithStats = quizzesWithStats.find((quiz) => quiz.id === detailPanelQuizId);
        if (!quizWithStats) return null;
        const targetStudentList = quizWithStats.stats.targetStudentIds.map((id) => {
          const scopedStudent = scopedStudents.find((student) => student.id === id);
          return { id, name: scopedStudent?.name || id, groupName: scopedStudent?.groupName };
        });
        return (
          <AssignedTestDetailPanel
            quizId={quizWithStats.id}
            quizTitle={quizWithStats.title}
            quizKind={quizWithStats.quizKind}
            totalQuestions={quizWithStats.questionIds?.length ?? 0}
            passingScore={quizWithStats.settings?.passingScore ?? 60}
            dueDate={quizWithStats.dueDate}
            targetStudents={targetStudentList}
            results={quizWithStats.stats.results}
            onClose={() => setDetailPanelQuizId(null)}
            onRemindAbsent={async (absentIds) => {
              await sendScopedStudentAlert(
                absentIds,
                'تذكير بأداء الاختبار',
                `نذكرك بضرورة أداء الاختبار: ${quizWithStats.title}`,
              );
            }}
            onAssignToStudent={async (studentId) => {
              const nextTargetUserIds = uniqueStrings([...(quizWithStats.targetUserIds || []), studentId]);
              await updateQuiz(quizWithStats.id, { targetUserIds: nextTargetUserIds });
              await sendScopedStudentAlert(
                [studentId],
                'إعادة توجيه اختبار',
                `تم إعادة توجيه الاختبار لك للمتابعة: ${quizWithStats.title}`,
              );
            }}
          />
        );
      })()}
    </div>
  );
};

export default SupervisorTestsManager;
