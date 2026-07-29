import React, { useState, useMemo } from 'react';
import { ClipboardList, Plus, FileText, Activity, BarChart, Target, Calendar, Users, ArrowRight, Printer, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Quiz, QuizResult, SkillGap } from '../../types';
import { TestAnalyticsReport } from './TestAnalyticsReport';
import { QuizBuilder } from './QuizBuilder';

export const SupervisorTestsManager: React.FC = () => {
  const { user, groups, quizzes, examResults, addQuiz } = useStore();
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  if (selectedQuizId) {
    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
    if (!selectedQuiz) return null;
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedQuizId(null)} 
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-bold print:hidden"
        >
          <ArrowRight size={20} />
          العودة للقائمة
        </button>
        <TestAnalyticsReport quiz={selectedQuiz} studentIds={scopedStudentIds} />
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
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
        >
          <Plus size={18} />
          توجيه اختبار جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignedQuizzes.length === 0 ? (
          <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-bold text-gray-900">لا توجد اختبارات موجهة</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2 text-sm">
              لم تقم بتوجيه أي اختبارات للطلاب التابعين لك بعد. ابدأ بإنشاء أو توجيه اختبار جديد لقياس أدائهم.
            </p>
          </div>
        ) : (
          assignedQuizzes.map(quiz => {
            const results = examResults.filter(r => r.quizId === quiz.id && scopedStudentIds.includes(r.userId || ''));
            const avgScore = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;

            return (
              <div key={quiz.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl ${quiz.placement === 'mock' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {quiz.placement === 'mock' ? <Activity size={24} /> : <FileText size={24} />}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${quiz.placement === 'mock' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {quiz.placement === 'mock' ? 'اختبار محاكي' : quiz.type === 'bank' ? 'بنك أسئلة' : 'اختبار عادي'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={16} />
                    <span>تاريخ التوجيه: {new Date(quiz.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users size={16} />
                    <span>عدد المشاركات: {results.length} طالب</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Target size={16} />
                    <span>متوسط الدرجات: <strong className={avgScore >= 60 ? 'text-emerald-600' : 'text-rose-600'}>{avgScore}%</strong></span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedQuizId(quiz.id)}
                  className="w-full py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-indigo-700 font-bold hover:bg-indigo-600 hover:text-white transition-all text-sm flex items-center justify-center gap-2"
                >
                  <BarChart size={18} />
                  عرض التحليل الاحترافي
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
