import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Calendar,
  Clock,
  ExternalLink,
  Layers,
  Presentation,
  School,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
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

const PERIODS = [
  { id: '1', label: 'الحصة 1 (الصباحية الأولى)' },
  { id: '2', label: 'الحصة 2' },
  { id: '3', label: 'الحصة 3' },
  { id: '4', label: 'الحصة 4' },
  { id: '5', label: 'الحصة 5' },
  { id: '6', label: 'الحصة 6' },
  { id: '7', label: 'الحصة 7' },
];

export const SmartClassroomSessionSchedulerModal: React.FC<SmartClassroomSessionSchedulerModalProps> = ({
  isOpen,
  onClose,
  workspace,
  initialSchoolId,
  initialClassId,
  onSuccess,
}) => {
  const navigate = useNavigate();

  // Selected School & Class
  const [schoolId, setSchoolId] = useState(initialSchoolId || workspace.schools[0]?.schoolId || '');
  const selectedSchool = useMemo(
    () => workspace.schools.find((s) => s.schoolId === schoolId) || workspace.schools[0],
    [schoolId, workspace],
  );

  const [classId, setClassId] = useState(
    initialClassId || selectedSchool?.assignments[0]?.classId || '',
  );

  // Scheduling details
  const todayDayIdx = new Date().getDay(); // 0 is Sunday
  const defaultDay = SCHOOL_DAYS[todayDayIdx] ? SCHOOL_DAYS[todayDayIdx].label : 'الأحد';
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedPeriod, setSelectedPeriod] = useState('2');

  // Mode: 'template' (حزمة مجهزة) or 'speed_challenge' (سؤال تحدي فردي سريع)
  const [sessionMode, setSessionMode] = useState<'template' | 'speed_challenge'>('template');

  // Templates & Questions state
  const [templates, setTemplates] = useState<ClassroomPreparedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedSingleQuestionId, setSelectedSingleQuestionId] = useState<string>('');
  const [challengeTimerSeconds, setChallengeTimerSeconds] = useState<number>(45);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync classId when school changes
  useEffect(() => {
    if (selectedSchool && !selectedSchool.assignments.some((a) => a.classId === classId)) {
      setClassId(selectedSchool.assignments[0]?.classId || '');
    }
  }, [selectedSchool, classId]);

  // Load templates from localStorage
  useEffect(() => {
    if (!isOpen || !schoolId) return;
    try {
      const storageKey = `smart_classroom_templates_${schoolId}_default`;
      const saved = localStorage.getItem(storageKey);
      const customTemplates: ClassroomPreparedTemplate[] = saved ? JSON.parse(saved) : [];
      const defaultTemplates: ClassroomPreparedTemplate[] = [
        {
          id: 'tpl_qudurat_speed_6',
          title: 'تحدي القدرات العامة وسرعة البديهة (6 أسئلة)',
          schoolId,
          questionIds: ['q-math-1', 'q-verbal-2', 'q-speed-3', 'q-math-4', 'q-verbal-5', 'q-challenge-6'],
          challengeIds: ['q-speed-3', 'q-challenge-6'],
          createdAt: new Date().toISOString().slice(0, 10),
          badge: 'نموذج قياسي جاهز ⭐',
        },
        {
          id: 'tpl_geometry_focus_5',
          title: 'حزمة إتقان الهندسة والمساحات (5 أسئلة)',
          schoolId,
          questionIds: ['q-math-1', 'q-math-4', 'q-challenge-6'],
          challengeIds: ['q-challenge-6'],
          createdAt: new Date().toISOString().slice(0, 10),
          badge: 'علاج الفجوات 🎯',
        },
      ];
      const combined = [...customTemplates, ...defaultTemplates];
      setTemplates(combined);
      if (combined.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(combined[0].id);
      }
    } catch {
      // ignore
    }
  }, [isOpen, schoolId, selectedTemplateId]);

  // Load available approved questions for single challenge mode
  useEffect(() => {
    if (!isOpen || !schoolId) return;
    api
      .getClassroomQuestions(schoolId)
      .then((res) => {
        setAvailableQuestions(res.questions || []);
        if (res.questions?.length > 0 && !selectedSingleQuestionId) {
          setSelectedSingleQuestionId(res.questions[0].questionId);
        }
      })
      .catch(() => {
        // safe fallback
      });
  }, [isOpen, schoolId, selectedSingleQuestionId]);

  if (!isOpen) return null;

  const currentAssignment = selectedSchool?.assignments.find((a) => a.classId === classId);

  const handleLaunch = async () => {
    if (!schoolId || !classId) {
      setErrorMessage('يرجى تحديد المدرسة والفصل الدراسي المسند.');
      return;
    }

    let questionIdsToLaunch: string[] = [];
    let challengeIdsToLaunch: string[] = [];

    if (sessionMode === 'template') {
      const pickedTemplate = templates.find((t) => t.id === selectedTemplateId);
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
      });

      // Store session scheduling metadata
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

      if (onSuccess) {
        onSuccess(result.sessionId, result.pin);
      }
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
              <Presentation size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">إطلاق وإعداد الحصة الذكية</h2>
              <p className="mt-0.5 text-xs text-indigo-200">
                حدد توقيت الحصة وفصلك المسند ونمط البث التفاعلي
              </p>
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

        {/* Modal Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* School & Class Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                المدرسة
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                <School size={18} className="text-indigo-600" />
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  {workspace.schools.map((s) => (
                    <option key={s.schoolId} value={s.schoolId}>
                      {s.schoolName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الفصل الدراسي المسند
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800">
                <Users size={18} className="text-emerald-600" />
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  {(selectedSchool?.assignments || []).map((a) => (
                    <option key={a.assignmentId} value={a.classId}>
                      {a.className} {a.subjectId ? `(${a.subjectId})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scheduling: Day & Period */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/40 dark:bg-indigo-950/20">
            <h3 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 mb-3">
              <Calendar size={15} /> توقيت وجدولة الحصة
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  اليوم
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                >
                  {SCHOOL_DAYS.map((d) => (
                    <option key={d.id} value={d.label}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  الحصة
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                >
                  {PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Session Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              نمط الإطلاق التفاعلي
            </label>
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
                  <Bookmark size={18} className="text-indigo-600" />
                  حزمة أسئلة محضرة مسبقاً 📚
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
                  <Zap size={18} className="text-amber-600" />
                  سؤال تحدي سريع فردي ⚡
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  بث فوري لسؤال واحد سريع بمؤقت محدد وتنافس حي ونقاط مضاعفة لشد انتباه الفصل.
                </p>
              </button>
            </div>
          </div>

          {/* Mode 1: Pick Prepared Template */}
          {sessionMode === 'template' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                اختر الحزمة المحضرة للحصة:
              </label>
              {templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                  لا توجد حزم مجهزة بعد. يمكنك اختيار الأسئلة من بنك الأسئلة أو حفظ قوالب جديدة.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {templates.map((tpl) => (
                    <label
                      key={tpl.id}
                      className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                        selectedTemplateId === tpl.id
                          ? 'border-indigo-600 bg-indigo-50/30 dark:border-indigo-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="template_select"
                          checked={selectedTemplateId === tpl.id}
                          onChange={() => setSelectedTemplateId(tpl.id)}
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{tpl.title}</p>
                          <p className="text-[11px] text-slate-500">
                            {tpl.questionIds.length} أسئلة {tpl.challengeIds.length > 0 ? `· (${tpl.challengeIds.length} تحدي ⚡)` : ''}
                          </p>
                        </div>
                      </div>
                      {tpl.badge && (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                          {tpl.badge}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Single Speed Challenge Setup */}
          {sessionMode === 'speed_challenge' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                  مدة المؤقت الزمني للتحدي السريع:
                </span>
                <div className="flex gap-2">
                  {[30, 45, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setChallengeTimerSeconds(sec)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                        challengeTimerSeconds === sec
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {sec} ثانية
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اختر سؤال التحدي:
                </label>
                <select
                  value={selectedSingleQuestionId}
                  onChange={(e) => setSelectedSingleQuestionId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 dark:border-slate-750 dark:bg-slate-800 dark:text-white"
                >
                  {availableQuestions.map((q) => (
                    <option key={q.questionId} value={q.questionId}>
                      {q.text} ({q.subject || 'عام'} - {q.difficulty || 'متوسط'})
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

        {/* Footer */}
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
