import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Calendar, Presentation, School, Users, X, Zap } from 'lucide-react';
import { api } from '../../services/api';
import type { TeacherWorkspaceData } from '../teacher/TeacherWorkspaceContext';
import { PERIODS, SCHOOL_DAYS, useSmartClassroomLaunchContent } from './useSmartClassroomLaunchContent';

interface SmartClassroomSessionSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: TeacherWorkspaceData;
  initialSchoolId?: string;
  initialClassId?: string;
  onSuccess?: (sessionId: string, pin: string) => void;
}

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
  const selectedSchool = useMemo(
    () => workspace.schools.find((school) => school.schoolId === schoolId) || workspace.schools[0],
    [schoolId, workspace],
  );
  const [classId, setClassId] = useState(initialClassId || selectedSchool?.assignments[0]?.classId || '');
  const todayDayIdx = new Date().getDay();
  const defaultDay = SCHOOL_DAYS[todayDayIdx] ? SCHOOL_DAYS[todayDayIdx].label : 'الأحد';
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedPeriod, setSelectedPeriod] = useState('2');
  const [sessionMode, setSessionMode] = useState<'template' | 'speed_challenge'>('template');
  const [challengeTimerSeconds, setChallengeTimerSeconds] = useState<number>(45);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    availableQuestions,
    selectedSingleQuestionId,
    setSelectedSingleQuestionId,
  } = useSmartClassroomLaunchContent(isOpen, schoolId);

  useEffect(() => {
    if (selectedSchool && !selectedSchool.assignments.some((assignment) => assignment.classId === classId)) {
      setClassId(selectedSchool.assignments[0]?.classId || '');
    }
  }, [selectedSchool, classId]);

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
      const pickedTemplate = templates.find((template) => template.id === selectedTemplateId);
      if (!pickedTemplate || !pickedTemplate.questionIds.length) {
        setErrorMessage('يرجى اختيار حزمة أسئلة صالحة للبدء بها.');
        return;
      }
      questionIdsToLaunch = pickedTemplate.questionIds;
      challengeIdsToLaunch = pickedTemplate.challengeIds;
    } else {
      if (!selectedSingleQuestionId) {
        setErrorMessage('يرجى اختيار سؤال التحدي السريع المطلوب بثه.');
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
      });

      const metadata = {
        sessionId: result.sessionId,
        schoolId,
        classId,
        className: currentAssignment?.className || 'فصل مسند',
        subject: currentAssignment?.subjectId || 'عام',
        day: selectedDay,
        period: selectedPeriod,
        mode: sessionMode,
        challengeTimerSeconds: sessionMode === 'speed_challenge' ? challengeTimerSeconds : undefined,
        launchedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(`classroom_pin_${result.sessionId}`, result.pin);
      sessionStorage.setItem(`classroom_challenges_${result.sessionId}`, JSON.stringify(challengeIdsToLaunch));
      sessionStorage.setItem(`classroom_meta_${result.sessionId}`, JSON.stringify(metadata));

      onSuccess?.(result.sessionId, result.pin);
      onClose();
      navigate(`/classroom/${result.sessionId}/teacher`);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'تعذر بدء الحصة الذكية الآن.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs" dir="rtl">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
              <Presentation size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">إطلاق وإعداد الحصة الذكية</h2>
              <p className="mt-0.5 text-xs text-indigo-200">حدد توقيت الحصة وفصلك المسند ونمط البث التفاعلي</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-indigo-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">المدرسة</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                <School size={18} className="text-indigo-600" />
                <select
                  value={schoolId}
                  onChange={(event) => setSchoolId(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  {workspace.schools.map((school) => (
                    <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">الفصل الدراسي المسند</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                <Users size={18} className="text-emerald-600" />
                <select
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  {(selectedSchool?.assignments || []).map((assignment) => (
                    <option key={assignment.assignmentId} value={assignment.classId}>
                      {assignment.className} {assignment.subjectId ? `(${assignment.subjectId})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/40 dark:bg-indigo-950/20">
            <h3 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 mb-3">
              <Calendar size={15} /> توقيت وجدولة الحصة
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">اليوم</label>
                <select
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                >
                  {SCHOOL_DAYS.map((day) => <option key={day.id} value={day.label}>{day.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">الحصة</label>
                <select
                  value={selectedPeriod}
                  onChange={(event) => setSelectedPeriod(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                >
                  {PERIODS.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">نمط الإطلاق التفاعلي</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSessionMode('template')}
                className={`flex flex-col items-start rounded-2xl border p-4 text-right transition-all ${
                  sessionMode === 'template'
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                  <Bookmark size={18} className="text-indigo-600" /> حزمة أسئلة محضرة مسبقاً 📚
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  إطلاق متتابع لعدة أسئلة مجهزة مع إمكانية بث أي سؤال كتحدٍ لحظي أثناء الحصة.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSessionMode('speed_challenge')}
                className={`flex flex-col items-start rounded-2xl border p-4 text-right transition-all ${
                  sessionMode === 'speed_challenge'
                    ? 'border-amber-500 bg-amber-50/60 shadow-sm dark:border-amber-500 dark:bg-amber-950/40'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-300">
                  <Zap size={18} className="text-amber-600" /> سؤال تحدي سريع فردي ⚡
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  بث فوري لسؤال واحد سريع بمؤقت محدد وتنافس حي ونقاط مضاعفة لشد انتباه الفصل.
                </p>
              </button>
            </div>
          </div>

          {sessionMode === 'template' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">اختر الحزمة المحضرة للحصة:</label>
              {templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                  لا توجد حزم مجهزة بعد. يمكنك اختيار الأسئلة من بنك الأسئلة أو حفظ قوالب جديدة.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {templates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                        selectedTemplateId === template.id
                          ? 'border-indigo-600 bg-indigo-50/30 dark:border-indigo-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="template_select"
                          checked={selectedTemplateId === template.id}
                          onChange={() => setSelectedTemplateId(template.id)}
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{template.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {template.questionIds.length} أسئلة {template.challengeIds.length > 0 ? `· (${template.challengeIds.length} تحدي ⚡)` : ''}
                          </p>
                        </div>
                      </div>
                      {template.badge && (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                          {template.badge}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {sessionMode === 'speed_challenge' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 dark:text-amber-200">مدة المؤقت الزمني للتحدي السريع:</span>
                <div className="flex gap-2">
                  {[30, 45, 60, 90].map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => setChallengeTimerSeconds(seconds)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                        challengeTimerSeconds === seconds
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {seconds} ثانية
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">اختر سؤال التحدي:</label>
                <select
                  value={selectedSingleQuestionId}
                  onChange={(event) => setSelectedSingleQuestionId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 dark:border-slate-750 dark:bg-slate-800 dark:text-white"
                >
                  {availableQuestions.map((question) => (
                    <option key={question.questionId} value={question.questionId}>
                      {question.text} ({question.subject || 'عام'} - {question.difficulty || 'متوسط'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={isSubmitting || !selectedSchool?.smartClassroomEnabled}
            onClick={handleLaunch}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-lg hover:from-indigo-700 hover:to-indigo-800 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Presentation size={16} />
            {isSubmitting ? 'جارٍ بدء الحصة...' : 'إطلاق وبدء الحصة التفاعلية 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
};
