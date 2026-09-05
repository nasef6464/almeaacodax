import React, { useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, Award, BarChart, Bell,
  BookOpen, CheckCircle, ClipboardList, Dumbbell, Plus, RefreshCw,
  Target, Users, X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TestAnalyticsReport } from './TestAnalyticsReport';
import { UnifiedQuizBuilder } from './UnifiedQuizBuilder';
import { MockExamManager } from './MockExamManager';
import { QuizAssignWidget } from './QuizAssignWidget';
import { AssignedTestDetailPanel } from './AssignedTestDetailPanel';
import { api } from '../../services/api';
import { isTrueMockExam } from '../../utils/quizPlacement';
import {
  SupervisorTestTabFilter,
  uniqueSupervisorStudentIds,
  useSupervisorAssessmentScope,
} from './supervisorTests/useSupervisorAssessmentScope';

type ViewMode = 'list' | 'create' | 'create_normal' | 'create_mock' | 'analytics' | 'compare';

export const SupervisorTestsManager: React.FC = () => {
  const { updateQuiz } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [tabFilter, setTabFilter] = useState<SupervisorTestTabFilter>('all');
  const [assignQuizId, setAssignQuizId] = useState<string | null>(null);
  const [detailQuizId, setDetailQuizId] = useState<string | null>(null);
  const [notifiedQuizId, setNotifiedQuizId] = useState<string | null>(null);

  const {
    user, groups, quizzes, scopedGroupIds, scopedStudentIds, scopedStudents,
    quizzesWithStats, filteredQuizzes, summaryStats,
  } = useSupervisorAssessmentScope(tabFilter);

  const sendScopedAlert = async (studentIds: string[], title: string, body: string) => {
    const recipients = uniqueSupervisorStudentIds(studentIds).filter((id) => scopedStudentIds.includes(id));
    if (!recipients.length) return;
    await api.sendStudentAlert({ studentIds: recipients, title, body, channels: ['in_app'] });
  };

  const remindAbsent = async (quiz: (typeof quizzesWithStats)[number]) => {
    const participated = new Set(quiz.stats.results.map((result) => result.userId).filter(Boolean));
    const absentIds = quiz.stats.targetStudentIds.filter((id) => !participated.has(id));
    if (!absentIds.length) return;
    await sendScopedAlert(absentIds, 'تذكير بأداء الاختبار', `نذكرك بضرورة أداء الاختبار: ${quiz.title}`);
    setNotifiedQuizId(quiz.id);
    window.setTimeout(() => setNotifiedQuizId(null), 2500);
  };

  if (viewMode === 'create') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
            <div><h2 className="text-lg font-black">إنشاء تدخل قياسي</h2><p className="mt-1 text-xs text-white/75">اختبار عادي أو محاكي داخل نطاق المدرسة فقط</p></div>
            <button onClick={() => setViewMode('list')} className="rounded-lg p-2 hover:bg-white/20"><X size={18}/></button>
          </div>
          <div className="space-y-3 p-6">
            <button onClick={() => setViewMode('create_normal')} className="flex w-full items-center gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-right hover:bg-emerald-100">
              <Dumbbell className="text-emerald-600"/><div><p className="font-black">تدريب / اختبار</p><p className="text-xs text-gray-500">لفصل أو طالب أو مجموعة طلاب</p></div>
            </button>
            <button onClick={() => setViewMode('create_mock')} className="flex w-full items-center gap-4 rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 text-right hover:bg-violet-100">
              <Award className="text-violet-600"/><div><p className="font-black">محاكي قياس</p><p className="text-xs text-gray-500">متعدد الأقسام مع تحليل بعدي</p></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'create_normal') {
    return <UnifiedQuizBuilder role="supervisor" allowedGroupIds={Array.from(scopedGroupIds)} defaultKind="test" onClose={() => setViewMode('list')} />;
  }

  if (viewMode === 'create_mock') {
    return <MockExamManager role="supervisor" allowedGroupIds={Array.from(scopedGroupIds)} allowedSchoolGroupId={user.schoolId || undefined} onClose={() => setViewMode('list')} initialExamType="mock" />;
  }

  if (viewMode === 'analytics' && selectedQuizId) {
    const quiz = quizzes.find((item) => item.id === selectedQuizId);
    if (!quiz) return null;
    return <div className="space-y-5"><button onClick={() => setViewMode('list')} className="flex items-center gap-2 font-bold text-gray-500 hover:text-indigo-600"><ArrowRight size={18}/> العودة</button><TestAnalyticsReport quiz={quiz} studentIds={scopedStudentIds}/></div>;
  }

  if (viewMode === 'compare') {
    const comparison = quizzes.filter((quiz) => selectedQuizzes.includes(quiz.id));
    return <div className="space-y-5"><button onClick={() => setViewMode('list')} className="flex items-center gap-2 font-bold text-gray-500 hover:text-indigo-600"><ArrowRight size={18}/> العودة</button><TestAnalyticsReport quizzes={comparison} studentIds={scopedStudentIds}/></div>;
  }

  const detailQuiz = quizzesWithStats.find((quiz) => quiz.id === detailQuizId);
  const assignQuiz = quizzes.find((quiz) => quiz.id === assignQuizId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-gray-900"><ClipboardList className="text-indigo-600"/> الاختبارات والتدخلات</h2>
          <p className="mt-1 text-sm text-gray-500">ذراع التنفيذ: وجّه، تابع، ذكّر، أعد الاستهداف، ثم افتح التحليل.</p>
        </div>
        <div className="flex gap-2">
          {selectedQuizzes.length > 1 && <button onClick={() => setViewMode('compare')} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white"><Activity size={17}/> مقارنة ({selectedQuizzes.length})</button>}
          <button onClick={() => setViewMode('create')} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17}/> تدخل جديد</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [<ClipboardList size={20}/>, 'الاختبارات', summaryStats.totalTests, 'text-indigo-600'],
          [<Users size={20}/>, 'المشاركة', `${summaryStats.avgParticipation}%`, 'text-blue-600'],
          [<Target size={20}/>, 'متوسط النتائج', `${summaryStats.avgScore}%`, 'text-emerald-600'],
          [<AlertTriangle size={20}/>, 'تحتاج تدخلاً', summaryStats.needingAttention, 'text-rose-600'],
        ].map(([icon, label, value, tone]) => <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><div className={String(tone)}>{icon}</div><p className="mt-3 text-xs font-bold text-gray-500">{label}</p><p className="text-2xl font-black text-gray-900">{value}</p></div>)}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 pb-1">
        {(['all','drill','test','mock'] as SupervisorTestTabFilter[]).map((tab) => {
          const label = tab === 'all' ? 'الكل' : tab === 'drill' ? 'تدريبات' : tab === 'test' ? 'اختبارات' : 'محاكيات';
          return <button key={tab} onClick={() => setTabFilter(tab)} className={`shrink-0 rounded-t-xl px-4 py-2 text-sm font-black ${tabFilter === tab ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>{label}</button>;
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredQuizzes.map((quiz) => (
          <div key={quiz.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isTrueMockExam(quiz) ? 'bg-violet-100 text-violet-700' : quiz.quizKind === 'drill' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{isTrueMockExam(quiz) ? 'محاكي' : quiz.quizKind === 'drill' ? 'تدريب' : 'اختبار'}</span><h3 className="mt-3 font-black text-gray-900">{quiz.title}</h3></div>
              <input type="checkbox" checked={selectedQuizzes.includes(quiz.id)} onChange={(e) => setSelectedQuizzes((current) => e.target.checked ? [...current, quiz.id] : current.filter((id) => id !== quiz.id))} className="h-5 w-5 rounded"/>
            </div>
            <div className="mt-5 space-y-3 text-xs font-bold text-gray-500">
              <div className="flex justify-between"><span>المشاركة</span><span>{quiz.stats.results.length}/{quiz.stats.totalTargetStudents} · {quiz.stats.participationRate}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${quiz.stats.participationRate}%`}}/></div>
              <div className="flex justify-between"><span>متوسط آخر نتيجة</span><span className={quiz.stats.avgScore >= 60 ? 'text-emerald-600' : 'text-rose-600'}>{quiz.stats.avgScore}%</span></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setDetailQuizId(quiz.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"><BarChart size={14}/> متابعة الطلاب</button>
              <button onClick={() => setAssignQuizId(quiz.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700"><RefreshCw size={14}/> توجيه/إعادة توجيه</button>
              {quiz.stats.participationRate < 100 && quiz.stats.totalTargetStudents > 0 && <button onClick={() => void remindAbsent(quiz)} className={`col-span-2 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black ${notifiedQuizId === quiz.id ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{notifiedQuizId === quiz.id ? <><CheckCircle size={14}/> تم التذكير</> : <><Bell size={14}/> تذكير من لم يؤدوا</>}</button>}
            </div>
            <button onClick={() => { setSelectedQuizId(quiz.id); setViewMode('analytics'); }} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-black text-white"><BarChart size={16}/> التحليل الكامل</button>
          </div>
        ))}
        {!filteredQuizzes.length && <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-14 text-center text-sm font-bold text-gray-500">لا توجد عناصر في هذا القسم.</div>}
      </div>

      {assignQuiz && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between bg-indigo-600 px-5 py-4 text-white"><div><p className="text-xs opacity-75">توجيه تدخل</p><h3 className="font-black">{assignQuiz.title}</h3></div><button onClick={() => setAssignQuizId(null)}><X size={18}/></button></div><div className="max-h-[80vh] overflow-y-auto p-5"><QuizAssignWidget quizId={assignQuiz.id} quizTitle={assignQuiz.title} quizKind={assignQuiz.quizKind} scopedGroups={groups.filter((g) => scopedGroupIds.has(g.id)).map((g) => ({id:g.id,name:g.name,studentIds:g.studentIds}))} scopedStudents={scopedStudents.map((s) => ({id:s.id,name:s.name,groupId:s.groupId}))} existingConfig={{targetGroupIds:assignQuiz.targetGroupIds || [],targetUserIds:assignQuiz.targetUserIds || [],dueDate:assignQuiz.dueDate}} hideAccessType confirmLabel="حفظ التوجيه" onCancel={() => setAssignQuizId(null)} onAssign={async (config) => { const ids = uniqueSupervisorStudentIds([...config.targetUserIds,...groups.filter((g) => config.targetGroupIds.includes(g.id)).flatMap((g) => g.studentIds || [])]).filter((id) => scopedStudentIds.includes(id)); await updateQuiz(assignQuiz.id,{targetGroupIds:config.targetGroupIds,targetUserIds:config.targetUserIds,dueDate:config.dueDate,supervisorMessage:config.message || null}); await sendScopedAlert(ids,'اختبار موجّه من المشرف',config.message || `تم توجيه اختبار لك: ${assignQuiz.title}`); }}/></div></div></div>}

      {detailQuiz && <AssignedTestDetailPanel quizId={detailQuiz.id} quizTitle={detailQuiz.title} quizKind={detailQuiz.quizKind} totalQuestions={detailQuiz.questionIds?.length ?? 0} passingScore={detailQuiz.settings?.passingScore ?? 60} dueDate={detailQuiz.dueDate} targetStudents={detailQuiz.stats.targetStudentIds.map((id) => { const s = scopedStudents.find((student) => student.id === id); return {id,name:s?.name || id,groupName:s?.groupName}; })} results={detailQuiz.stats.results} onClose={() => setDetailQuizId(null)} onRemindAbsent={(ids) => sendScopedAlert(ids,'تذكير بأداء الاختبار',`نذكرك بضرورة أداء الاختبار: ${detailQuiz.title}`)} onAssignToStudent={async (studentId) => { await updateQuiz(detailQuiz.id,{targetUserIds:uniqueSupervisorStudentIds([...(detailQuiz.targetUserIds || []),studentId])}); await sendScopedAlert([studentId],'إعادة توجيه اختبار',`تم إعادة توجيه الاختبار لك للمتابعة: ${detailQuiz.title}`); }}/>} 
    </div>
  );
};

export default SupervisorTestsManager;
