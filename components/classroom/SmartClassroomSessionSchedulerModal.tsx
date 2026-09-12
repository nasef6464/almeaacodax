import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Calendar, Presentation, School, Users, X, Zap } from 'lucide-react';
import { api } from '../../services/api';
import type { TeacherWorkspaceData } from '../teacher/TeacherWorkspaceContext';
import type { ClassroomPreparedTemplate } from './ClassroomPreparedTemplatesManager';

interface SmartClassroomSessionSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: TeacherWorkspaceData;
  initialSchoolId?: string;
  initialClassId?: string;
  onSuccess?: (sessionId: string, pin: string) => void;
}

const SCHOOL_DAYS = [
  { id: 'sun', label: 'الأحد' },
  { id: 'mon', label: 'الإثنين' },
  { id: 'tue', label: 'الثلاثاء' },
  { id: 'wed', label: 'الأربعاء' },
  { id: 'thu', label: 'الخميس' },
];
const PERIODS = Array.from({ length: 7 }, (_, index) => ({ id: String(index + 1), label: `الحصة ${index + 1}` }));

export const SmartClassroomSessionSchedulerModal: React.FC<SmartClassroomSessionSchedulerModalProps> = ({
  isOpen,
  onClose,
  workspace,
  initialSchoolId,
  initialClassId,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState(initialSchoolId || workspace.schools[0]?.schoolId || '');
  const selectedSchool = useMemo(() => workspace.schools.find((school) => school.schoolId === schoolId) || workspace.schools[0], [schoolId, workspace]);
  const [classId, setClassId] = useState(initialClassId || selectedSchool?.assignments[0]?.classId || '');
  const todayDayIdx = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(SCHOOL_DAYS[todayDayIdx]?.label || 'الأحد');
  const [selectedPeriod, setSelectedPeriod] = useState('2');
  const [sessionMode, setSessionMode] = useState<'template' | 'speed_challenge'>('template');
  const [templates, setTemplates] = useState<ClassroomPreparedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedSingleQuestionId, setSelectedSingleQuestionId] = useState('');
  const [challengeTimerSeconds, setChallengeTimerSeconds] = useState(45);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (selectedSchool && !selectedSchool.assignments.some((assignment) => assignment.classId === classId)) {
      setClassId(selectedSchool.assignments[0]?.classId || '');
    }
  }, [selectedSchool, classId]);

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    let active = true;
    setLoadingTemplates(true);
    api.get<{ templates: ClassroomPreparedTemplate[] }>(`/classroom/templates?schoolId=${encodeURIComponent(schoolId)}`)
      .then((result) => {
        if (!active) return;
        const next = Array.isArray(result.templates) ? result.templates : [];
        setTemplates(next);
        setSelectedTemplateId((current) => next.some((template) => template.id === current) ? current : (next[0]?.id || ''));
      })
      .catch((error: any) => {
        if (!active) return;
        setTemplates([]);
        setSelectedTemplateId('');
        setErrorMessage(error?.message || 'تعذر تحميل الحزم المحفوظة.');
      })
      .finally(() => { if (active) setLoadingTemplates(false); });
    return () => { active = false; };
  }, [isOpen, schoolId]);

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    let active = true;
    api.getClassroomQuestions(schoolId)
      .then((result) => {
        if (!active) return;
        const questions = result.questions || [];
        setAvailableQuestions(questions);
        setSelectedSingleQuestionId((current) => questions.some((question: any) => question.questionId === current) ? current : (questions[0]?.questionId || ''));
      })
      .catch(() => { if (active) setAvailableQuestions([]); });
    return () => { active = false; };
  }, [isOpen, schoolId]);

  if (!isOpen) return null;
  const currentAssignment = selectedSchool?.assignments.find((assignment) => assignment.classId === classId);

  const handleLaunch = async () => {
    if (!schoolId || !classId) {
      setErrorMessage('يرجى تحديد المدرسة والفصل الدراسي المسند.');
      return;
    }

    let questionIdsToLaunch: string[] = [];
    let challengeIdsToLaunch: string[] = [];
    if (sessionMode === 'template') {
      const template = templates.find((entry) => entry.id === selectedTemplateId);
      if (!template?.questionIds.length) {
        setErrorMessage('اختر حزمة محفوظة وصالحة أولاً.');
        return;
      }
      questionIdsToLaunch = template.questionIds;
      challengeIdsToLaunch = template.challengeIds;
    } else {
      if (!selectedSingleQuestionId) {
        setErrorMessage('اختر سؤال التحدي المطلوب.');
        return;
      }
      questionIdsToLaunch = [selectedSingleQuestionId];
      challengeIdsToLaunch = [selectedSingleQuestionId];
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const result = await api.createClassroomSession({
        schoolId,
        classId,
        questionIds: questionIdsToLaunch,
        day: selectedDay,
        period: selectedPeriod ? Number(selectedPeriod) : null,
        className: currentAssignment?.className || 'فصل مسند',
        subjectName: currentAssignment?.subjectId || 'عام',
        publishedMode: sessionMode === 'template' ? 'batch' : 'single',
        autoStart: true,
      });
      sessionStorage.setItem(`classroom_pin_${result.sessionId}`, result.pin);
      sessionStorage.setItem(`classroom_challenges_${result.sessionId}`, JSON.stringify(challengeIdsToLaunch));
      if (sessionMode === 'speed_challenge') {
        sessionStorage.setItem(`classroom_challenge_timer_${result.sessionId}`, String(challengeTimerSeconds));
      }
      onSuccess?.(result.sessionId, result.pin);
      onClose();
      navigate(`/classroom/${result.sessionId}/teacher`);
    } catch (error: any) {
      setErrorMessage(error?.message || 'تعذر بدء الحصة الذكية الآن.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs" dir="rtl">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300"><Presentation size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-white">إعداد وإطلاق الحصة الذكية</h2>
              <p className="mt-0.5 text-xs text-indigo-200">هذه الشاشة تبدأ الحصة الآن؛ اليوم والحصة بيانات وصفية وليست جدولة مستقبلية.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-indigo-200 hover:bg-white/10 hover:text-white"><X size={20} /></button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">المدرسة</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                <School size={18} className="text-indigo-600" />
                <select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none dark:text-white">
                  {workspace.schools.map((school) => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">الفصل الدراسي المسند</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                <Users size={18} className="text-emerald-600" />
                <select value={classId} onChange={(event) => setClassId(event.target.value)} className="w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none dark:text-white">
                  {(selectedSchool?.assignments || []).map((assignment) => <option key={assignment.assignmentId} value={assignment.classId}>{assignment.className}{assignment.subjectId ? ` (${assignment.subjectId})` : ''}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/40 dark:bg-indigo-950/20">
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-black text-indigo-950 dark:text-indigo-200"><Calendar size={15} /> بيانات الحصة</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {SCHOOL_DAYS.map((day) => <option key={day.id} value={day.label}>{day.label}</option>)}
              </select>
              <select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {PERIODS.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setSessionMode('template')} className={`rounded-2xl border p-4 text-right ${sessionMode === 'template' ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center gap-2 text-sm font-black"><Bookmark size={18} className="text-indigo-600" /> حزمة محفوظة</div>
              <p className="mt-1 text-xs text-slate-500">تنشر الحزمة المحفوظة من قاعدة البيانات مباشرة.</p>
            </button>
            <button type="button" onClick={() => setSessionMode('speed_challenge')} className={`rounded-2xl border p-4 text-right ${sessionMode === 'speed_challenge' ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-300"><Zap size={18} /> سؤال تحدي سريع</div>
              <p className="mt-1 text-xs text-slate-500">ينشر سؤالًا واحدًا مع مؤقت واجهة للطالب.</p>
            </button>
          </div>

          {sessionMode === 'template' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">اختر الحزمة:</label>
              {loadingTemplates ? (
                <div className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-500">جارٍ تحميل الحزم…</div>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-500">لا توجد حزم محفوظة لهذه المدرسة. احفظ حزمة أولاً من لوحة إعداد الأسئلة.</div>
              ) : templates.map((template) => (
                <label key={template.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${selectedTemplateId === template.id ? 'border-indigo-600 bg-indigo-50/30 dark:border-indigo-500' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="template_select" checked={selectedTemplateId === template.id} onChange={() => setSelectedTemplateId(template.id)} />
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{template.title}</p>
                      <p className="text-[11px] text-slate-500">{template.questionIds.length} أسئلة{template.challengeIds.length ? ` · ${template.challengeIds.length} تحدي` : ''}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-950 dark:text-amber-200">مؤقت الواجهة:</span>
                <div className="flex gap-2">{[30, 45, 60, 90].map((seconds) => <button key={seconds} type="button" onClick={() => setChallengeTimerSeconds(seconds)} className={`rounded-lg px-2.5 py-1 text-xs font-black ${challengeTimerSeconds === seconds ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{seconds}ث</button>)}</div>
              </div>
              <select value={selectedSingleQuestionId} onChange={(event) => setSelectedSingleQuestionId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {availableQuestions.map((question) => <option key={question.questionId} value={question.questionId}>{question.text} ({question.subject || 'عام'} - {question.difficulty || 'متوسط'})</option>)}
              </select>
            </div>
          )}

          {errorMessage && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30">{errorMessage}</div>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">إلغاء</button>
          <button type="button" disabled={isSubmitting || !selectedSchool?.smartClassroomEnabled || (sessionMode === 'template' && !selectedTemplateId)} onClick={() => void handleLaunch()} className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-indigo-700 disabled:opacity-50">
            <Presentation size={16} /> {isSubmitting ? 'جارٍ بدء الحصة…' : 'بدء الحصة الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};
