import React, { useState, useMemo } from 'react';
import { ClipboardList, Plus, FileText, Activity, BarChart, Target, Calendar, Users, ArrowRight, Printer, AlertTriangle, Bell, RefreshCw, Send, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Quiz, QuizResult, SkillGap } from '../../types';
import { TestAnalyticsReport } from './TestAnalyticsReport';
import { QuizBuilder } from './QuizBuilder';
import { api } from '../../services/api';

export const SupervisorTestsManager: React.FC = () => {
  const { user, groups, quizzes, examResults, addQuiz, updateQuiz } = useStore();
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [reassignQuizId, setReassignQuizId] = useState<string | null>(null);
  const [reassignGroupIds, setReassignGroupIds] = useState<string[]>([]);
  const [notifiedQuizId, setNotifiedQuizId] = useState<string | null>(null);
  const [selectedQuizzesForComparison, setSelectedQuizzesForComparison] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  // 1. Calculate Scope
  const scopedGroupIds = useMemo(() => {
    const directGroupIds = new Set(user.groupIds || []);
    const directGroups = groups.filter(g => directGroupIds.has(g.id) || g.supervisorIds?.includes(user.id));
    const schoolIds = new Set<string>();
    if (user.schoolId) schoolIds.add(user.schoolId);
    directGroups.forEach(g => {
      if (g.type === 'SCHOOL') schoolIds.add(g.id);
      if (g.parentId) schoolIds.add(g.parentId);
    });

    const finalGroupIds = new Set<string>([...Array.from(directGroupIds), ...directGroups.map(g => g.id)]);
    groups.forEach(g => { if (g.parentId && schoolIds.has(g.parentId)) finalGroupIds.add(g.id); });
    if (user.schoolId) finalGroupIds.add(user.schoolId); // Also include school group itself
    return finalGroupIds;
  }, [user, groups]);

  const scopedStudentIds = useMemo(() => {
    const students = new Set<string>();
    groups.filter(g => scopedGroupIds.has(g.id)).forEach(g => {
      (g.studentIds || []).forEach(id => students.add(id));
    });
    return Array.from(students);
  }, [groups, scopedGroupIds]);

  // 2. Filter Quizzes assigned to this supervisor's scope
  const assignedQuizzes = useMemo(() => {
    return quizzes.filter(q => 
      (q.targetGroupIds && q.targetGroupIds.some(id => scopedGroupIds.has(id))) || 
      q.createdBy === user.id
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [quizzes, scopedGroupIds, user.id]);

  // 3. Stats & Extended Info
  const quizzesWithStats = useMemo(() => {
    return assignedQuizzes.map(quiz => {
      let targetGroupIds = quiz.targetGroupIds || [];
      if (targetGroupIds.length === 0) {
        targetGroupIds = Array.from(scopedGroupIds);
      }
      const actualTargetGroupIds = targetGroupIds.filter(id => scopedGroupIds.has(id));
      
      const targetStudents = new Set<string>();
      groups.filter(g => actualTargetGroupIds.includes(g.id)).forEach(g => {
        (g.studentIds || []).forEach(id => targetStudents.add(id));
      });
      
      const totalTargetStudents = targetStudents.size;
      const targetStudentIds = Array.from(targetStudents);
      
      const results = examResults.filter(r => r.quizId === quiz.id && scopedStudentIds.includes(r.userId || ''));
      const avgScore = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;
      const participationRate = totalTargetStudents > 0 ? Math.min(100, Math.round((results.length / totalTargetStudents) * 100)) : 0;

      return {
        ...quiz,
        stats: {
          results,
          avgScore,
          totalTargetStudents,
          targetStudentIds,
          participationRate
        }
      };
    });
  }, [assignedQuizzes, groups, examResults, scopedGroupIds, scopedStudentIds]);

  const summaryStats = useMemo(() => {
    const totalTests = quizzesWithStats.length;
    if (totalTests === 0) return { totalTests: 0, avgParticipation: 0, avgScore: 0, needingAttention: 0 };
    
    const totalParticipationSum = quizzesWithStats.reduce((sum, q) => sum + q.stats.participationRate, 0);
    const totalScoreSum = quizzesWithStats.reduce((sum, q) => sum + (q.stats.results.length > 0 ? q.stats.avgScore : 0), 0);
    const testsWithResults = quizzesWithStats.filter(q => q.stats.results.length > 0).length;
    const needingAttention = quizzesWithStats.filter(q => q.stats.results.length > 0 && q.stats.avgScore < 60).length;

    return {
      totalTests,
      avgParticipation: Math.round(totalParticipationSum / totalTests),
      avgScore: testsWithResults > 0 ? Math.round(totalScoreSum / testsWithResults) : 0,
      needingAttention
    };
  }, [quizzesWithStats]);

  const handleSaveReassign = (quizId: string) => {
    updateQuiz(quizId, { targetGroupIds: reassignGroupIds });
    setReassignQuizId(null);
    setReassignGroupIds([]);
  };

  const handleRemindStudents = async (quizWithStats: typeof quizzesWithStats[0]) => {
    const { stats } = quizWithStats;
    const participatedIds = new Set(stats.results.map(r => r.userId));
    const absentIds = stats.targetStudentIds.filter(id => !participatedIds.has(id));
    
    if (absentIds.length > 0) {
      try {
        await api.sendNotifications({
          title: 'تذكير بأداء الاختبار',
          body: `نذكرك بضرورة أداء الاختبار: ${quizWithStats.title}`,
          channels: ['in_app'],
          userIds: absentIds,
          variables: {
            link: `/dashboard?tab=quizzes` // Send them to the Quizzes tab where the directed test sits at the top
          }
        }, user.token || '');
        
        setNotifiedQuizId(quizWithStats.id);
        setTimeout(() => setNotifiedQuizId(null), 3000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isCreating) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <button 
          onClick={() => setIsCreating(false)} 
          className="mb-4 flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold"
        >
          <ArrowRight size={20} />
          العودة لقائمة الاختبارات الموجهة
        </button>
        <QuizBuilder 
          onClose={() => setIsCreating(false)}
          initialMode="central"
          initialType="quiz"
        />
      </div>
    );
  }

  if (selectedQuizId || isComparing) {
    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
    const comparisonQuizzes = quizzes.filter(q => selectedQuizzesForComparison.includes(q.id));
    
    if (!selectedQuiz && comparisonQuizzes.length === 0) return null;
    
    return (
      <div className="space-y-6">
        <button 
          onClick={() => {
            setSelectedQuizId(null);
            setIsComparing(false);
          }} 
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold print:hidden"
        >
          <ArrowRight size={20} />
          العودة للقائمة
        </button>
        {isComparing ? (
          <TestAnalyticsReport quizzes={comparisonQuizzes} studentIds={scopedStudentIds} />
        ) : (
          <TestAnalyticsReport quiz={selectedQuiz!} studentIds={scopedStudentIds} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardList className="text-indigo-600" />
            الاختبارات الموجهة والتحليل
          </h2>
          <p className="text-sm text-gray-500 mt-1">إدارة الاختبارات وتحليل أداء الطلاب وتحديد الفجوات المهارية</p>
        </div>
        <div className="flex gap-2">
          {selectedQuizzesForComparison.length > 1 && (
            <button 
              onClick={() => setIsComparing(true)}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-600 transition-all animate-fade-in"
            >
              <Activity size={18} />
              مقارنة ({selectedQuizzesForComparison.length}) اختبارات
            </button>
          )}
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <Plus size={18} />
            توجيه اختبار جديد
          </button>
        </div>
      </div>

      {quizzesWithStats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
            <span className="text-gray-500 text-xs font-bold mb-1">تحتاج انتباه</span>
            <span className="text-2xl font-black text-gray-900">{summaryStats.needingAttention}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzesWithStats.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center">
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4">
              <ClipboardList className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد اختبارات موجهة</h3>
            <p className="text-gray-500 max-w-md text-sm mb-6">
              لم تقم بتوجيه أي اختبارات للطلاب التابعين لك بعد. ابدأ بإنشاء أو توجيه اختبار جديد لقياس أدائهم.
            </p>
            <button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
            >
              <Plus size={18} />
              توجيه اختبار جديد
            </button>
          </div>
        ) : (
          quizzesWithStats.map(q => (
            <div key={q.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    checked={selectedQuizzesForComparison.includes(q.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedQuizzesForComparison([...selectedQuizzesForComparison, q.id]);
                      else setSelectedQuizzesForComparison(selectedQuizzesForComparison.filter(id => id !== q.id));
                    }}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className={`p-2.5 rounded-xl ${q.placement === 'mock' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {q.placement === 'mock' ? <Activity size={24} /> : <FileText size={24} />}
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${q.placement === 'mock' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {q.placement === 'mock' ? 'اختبار محاكي' : q.type === 'bank' ? 'بنك أسئلة' : 'اختبار عادي'}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-2">{q.title}</h3>
              
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={16} />
                  <span>تاريخ التوجيه: {new Date(q.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={16} className="shrink-0" />
                  <div className="flex-1 w-full">
                    <div className="flex justify-between mb-1.5 text-xs">
                      <span>المشاركة: {q.stats.results.length} من {q.stats.totalTargetStudents} طالب</span>
                      <span className="font-bold">{q.stats.participationRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${q.stats.participationRate}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Target size={16} />
                  <span>متوسط الدرجات: <strong className={q.stats.avgScore >= 60 ? 'text-emerald-600' : 'text-rose-600'}>{q.stats.avgScore}%</strong></span>
                </div>
              </div>

              {reassignQuizId === q.id && (
                <div className="mb-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 print:hidden text-sm">
                  <h4 className="font-bold text-gray-900 mb-3 flex justify-between items-center">
                    تعديل المجموعات المستهدفة
                    <button onClick={() => setReassignQuizId(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 shadow-sm">
                      <XCircle size={16} />
                    </button>
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-2 mb-3 px-1">
                    {groups.filter(g => scopedGroupIds.has(g.id)).map(g => (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-indigo-50 rounded">
                        <input 
                          type="checkbox"
                          checked={reassignGroupIds.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) setReassignGroupIds([...reassignGroupIds, g.id]);
                            else setReassignGroupIds(reassignGroupIds.filter(id => id !== g.id));
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-gray-700 text-xs font-bold">{g.name}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSaveReassign(q.id)}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 flex justify-center items-center gap-2 transition-all shadow-sm"
                  >
                    <CheckCircle size={14} />
                    تأكيد التكليف
                  </button>
                </div>
              )}

              <div className="flex gap-2 mb-4 print:hidden">
                <button 
                  onClick={() => {
                    setReassignQuizId(q.id);
                    setReassignGroupIds(q.targetGroupIds || []);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 hover:text-indigo-600 transition-all text-xs shadow-sm"
                >
                  <RefreshCw size={14} />
                  إعادة تكليف
                </button>
                
                {q.stats.participationRate < 100 && q.stats.totalTargetStudents > 0 && (
                  <button 
                    onClick={() => handleRemindStudents(q)}
                    disabled={notifiedQuizId === q.id}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold transition-all text-xs border shadow-sm ${notifiedQuizId === q.id ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
                  >
                    {notifiedQuizId === q.id ? (
                      <>
                        <CheckCircle size={14} />
                        تم التذكير
                      </>
                    ) : (
                      <>
                        <Bell size={14} />
                        تذكير الغائبين
                      </>
                    )}
                  </button>
                )}
              </div>

              <button 
                onClick={() => setSelectedQuizId(q.id)}
                className="w-full mt-auto py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/80 text-indigo-700 font-bold hover:bg-indigo-600 hover:text-white transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <BarChart size={18} />
                عرض التحليل الاحترافي
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
