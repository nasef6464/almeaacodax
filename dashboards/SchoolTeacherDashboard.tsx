import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  Bookmark,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileQuestion,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Presentation,
  School,
  Sparkles,
  Target,
  Trophy,
  Users,
  UsersRound,
  Zap,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { TeacherWorkspaceSwitcher } from '../components/teacher/TeacherWorkspaceSwitcher';
import { useTeacherWorkspaceOptional } from '../components/teacher/TeacherWorkspaceContext';
import { SmartClassroomReportsSection } from '../components/classroom/SmartClassroomReportsSection';
import { ClassSkillGapsRadar } from '../components/classroom/ClassSkillGapsRadar';
import { StudentAppreciationCertificateModal } from '../components/classroom/StudentAppreciationCertificateModal';
import { SmartClassroomSessionSchedulerModal } from '../components/classroom/SmartClassroomSessionSchedulerModal';
import { ClassroomPreparedTemplatesManager, ClassroomPreparedTemplate } from '../components/classroom/ClassroomPreparedTemplatesManager';
import { ClassroomQuestionFilterBar, ClassroomFilterState } from '../components/classroom/ClassroomQuestionFilterBar';
import { api } from '../services/api';
import { useStore } from '../store/useStore';

type SchoolTeacherTab =
  | 'overview'
  | 'smart-classroom'
  | 'prepared-questions'
  | 'reports'
  | 'skills-radar'
  | 'assessments'
  | 'certificates';

const SCHOOL_TEACHER_NAV_ITEMS: Array<{ id: SchoolTeacherTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard size={19} /> },
  { id: 'smart-classroom', label: 'إدارة الحصص والجدول', icon: <Presentation size={19} /> },
  { id: 'prepared-questions', label: 'بنك التحضير المسبق', icon: <Target size={19} /> },
  { id: 'reports', label: 'تقارير الحصص والمهارات', icon: <BarChart3 size={19} /> },
  { id: 'skills-radar', label: 'رادار فجوات الفصول', icon: <Award size={19} /> },
  { id: 'assessments', label: 'اختبارات المدرسة', icon: <BookOpenCheck size={19} /> },
  { id: 'certificates', label: 'شهادات التقدير والتحفيز', icon: <Trophy size={19} /> },
];

export const SchoolTeacherDashboard: React.FC = () => {
  const workspace = useTeacherWorkspaceOptional();
  const { user } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = (searchParams.get('tab') as SchoolTeacherTab) || 'overview';
  const [activeTab, setActiveTab] = useState<SchoolTeacherTab>(
    SCHOOL_TEACHER_NAV_ITEMS.some((i) => i.id === requestedTab) ? requestedTab : 'overview',
  );

  const [selectedSchoolId, setSelectedSchoolId] = useState(workspace?.schools[0]?.schoolId || '');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [targetClassForLaunch, setTargetClassForLaunch] = useState<string>('');

  // Prepared Questions State
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [challengeQuestionIds, setChallengeQuestionIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ClassroomFilterState>({ track: '', subject: '', difficulty: '', search: '' });
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Sync tab with URL
  const handleTabChange = useCallback(
    (tab: SchoolTeacherTab) => {
      setActiveTab(tab);
      setSearchParams({ tab });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as SchoolTeacherTab;
    if (tabFromUrl && tabFromUrl !== activeTab && SCHOOL_TEACHER_NAV_ITEMS.some((i) => i.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const selectedSchool = useMemo(
    () => workspace?.schools.find((s) => s.schoolId === selectedSchoolId) || workspace?.schools[0],
    [selectedSchoolId, workspace],
  );

  // Load question bank when on prepared-questions tab
  useEffect(() => {
    if (activeTab !== 'prepared-questions' || !selectedSchool) return;
    if (questions.length > 0) return;
    setQuestionsLoading(true);
    api
      .getClassroomQuestions(selectedSchool.schoolId)
      .then((res) => {
        setQuestions(res.questions || []);
      })
      .catch(() => {
        // safe fallback
      })
      .finally(() => {
        setQuestionsLoading(false);
      });
  }, [activeTab, selectedSchool, questions.length]);

  if (!workspace || !selectedSchool) return null;

  const filteredQuestions = questions.filter((q) => {
    if (filters.track && q.examType !== filters.track && q.pathId !== filters.track) return false;
    if (filters.subject && q.subject !== filters.subject) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    if (filters.search && !q.text?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 10 ? [...prev, id] : prev,
    );
  };

  const toggleChallengeFlag = (id: string) => {
    setChallengeQuestionIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleApplyTemplate = (template: ClassroomPreparedTemplate) => {
    setSelectedQuestionIds(template.questionIds);
    setChallengeQuestionIds(template.challengeIds);
  };

  // Open scheduler for a specific class
  const openLaunchForClass = (classId: string) => {
    setTargetClassForLaunch(classId);
    setShowSchedulerModal(true);
  };

  // Sidebar renderer
  const renderSidebar = () => (
    <div className="py-6 space-y-1" dir="rtl">
      <div className="mb-6 px-6">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
          <School size={14} /> مساحة مدرسة مستقلة (B2B)
        </div>
        <h2 className="text-lg font-black text-gray-900">لوحة معلم المدرسة</h2>
        <p className="text-xs text-gray-500 mt-0.5">{selectedSchool.schoolName}</p>

        {workspace.schools.length > 1 && (
          <div className="mt-3">
            <select
              value={selectedSchool.schoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800"
            >
              {workspace.schools.map((s) => (
                <option key={s.schoolId} value={s.schoolId}>
                  {s.schoolName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-3">
          <TeacherWorkspaceSwitcher />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-0.5 px-3">
        {SCHOOL_TEACHER_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-right transition-colors text-xs font-bold ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-black border-r-4 border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800'
              }`}
            >
              <div className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick Launch Action in Sidebar */}
      <div className="mt-8 px-4">
        <button
          type="button"
          onClick={() => {
            setTargetClassForLaunch('');
            setShowSchedulerModal(true);
          }}
          disabled={!selectedSchool.smartClassroomEnabled}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 p-3 text-xs font-black text-white shadow-md hover:from-indigo-700 hover:to-indigo-800 active:scale-95 disabled:opacity-40 transition-all"
        >
          <Presentation size={15} /> بدء حصة ذكية فورية 🚀
        </button>
      </div>
    </div>
  );

  // Tab 1: Overview (نظرة عامة)
  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Top Welcome Card */}
      <div className="rounded-3xl bg-gradient-to-l from-indigo-800 via-indigo-900 to-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-md bg-indigo-500/30 px-2.5 py-1 text-xs font-black text-indigo-200">
              مساحة تعليمية مدرسية معتمدة
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">
              مرحباً بك، {user?.name || 'أستاذ المادة'} 👋
            </h1>
            <p className="mt-1.5 max-w-xl text-xs sm:text-sm text-indigo-100 leading-6">
              من هنا تدير فصولك المسندة في {selectedSchool.schoolName}، وتبدأ الحصص التفاعلية، وتتابع الفجوات الصفية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTargetClassForLaunch('');
                setShowSchedulerModal(true);
              }}
              disabled={!selectedSchool.smartClassroomEnabled}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-md active:scale-95 disabled:opacity-40 transition-all"
            >
              <Presentation size={16} /> بدء حصة ذكية
            </button>
            <button
              type="button"
              onClick={() => setShowCertificateModal(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 px-4 py-3 text-xs font-black text-white shadow-md active:scale-95 transition-all"
            >
              <Trophy size={16} /> إصدار شهادة تقدير
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الفصول المسندة</span>
            <UsersRound size={20} className="text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">{selectedSchool.assignments.length}</div>
          <p className="mt-1 text-[11px] text-slate-400">فصولك الفعالة بالمدرسة</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الحصص الذكية</span>
            <Presentation size={20} className="text-indigo-600" />
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">
            {selectedSchool.smartClassroomEnabled ? 'مفعلة 🟢' : 'غير مفعلة'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">جاهزة للبث التفاعلي</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">اختبارات المدرسة</span>
            <BookOpenCheck size={20} className="text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">{selectedSchool.assessments.length}</div>
          <p className="mt-1 text-[11px] text-slate-400">اختبارات موجهة لفصولك</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المدرسة الحالية</span>
            <School size={20} className="text-purple-600" />
          </div>
          <div className="mt-3 text-sm font-black text-slate-900 truncate">{selectedSchool.schoolName}</div>
          <p className="mt-1 text-[11px] text-slate-400">كود الإسناد الرسمي</p>
        </div>
      </div>

      {/* Assigned Classes Grid */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-slate-900">فصولي المسندة وجدول الحصص</h2>
          <span className="text-xs text-slate-400">اضغط على أي فصل لبدء الحصة الذكية مباشرة</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {selectedSchool.assignments.map((assignment) => (
            <div
              key={assignment.assignmentId}
              className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-base">{assignment.className}</span>
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
                    {assignment.subjectId || 'تكليف عام'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  المادة: {assignment.subjectId || 'تكليف دراسي عام'} · نظام التقييم الذكي
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openLaunchForClass(assignment.classId)}
                  disabled={!selectedSchool.smartClassroomEnabled}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Presentation size={14} /> بدء حصة ذكية لهذا الفصل
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('reports')}
                  className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  تقارير الفصل →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Tab 2: Smart Classroom Hub (إدارة الحصص والجدول)
  const renderSmartClassroom = () => (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-50/80 via-white to-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                <Presentation size={18} />
              </span>
              <h2 className="text-xl font-black text-slate-900">مركز إدارة وإطلاق الحصص الذكية</h2>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 leading-5">
              يتيح لك النظام نمطين متكاملين: بث <b>سؤال تحدي فردي سريع ⚡</b> أو <b>حزمة أسئلة متكاملة 📚</b> مع إمكانية التبديل بينهما في أي لحظة أثناء الحصة.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setTargetClassForLaunch('');
              setShowSchedulerModal(true);
            }}
            disabled={!selectedSchool.smartClassroomEnabled}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition-all"
          >
            <Zap size={16} /> إطلاق حصة الآن (تحديد اليوم والحصة) 🚀
          </button>
        </div>
      </div>

      {/* Guide to the two modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2 font-black text-sm text-amber-950 mb-2">
            <Zap size={18} className="text-amber-600" />
            النمط الأول: سؤال تحدي سريع فردي ⚡
          </div>
          <p className="text-xs text-amber-900/80 leading-5">
            بث فوري لسؤال واحد سريع بمهلة 30 أو 45 أو 60 ثانية مع نقاط مضاعفة ورادار استجابات لحظي لكشف الفهم السريع وكسر رتابة الحصة.
          </p>
          <button
            type="button"
            onClick={() => {
              setTargetClassForLaunch('');
              setShowSchedulerModal(true);
            }}
            className="mt-3 inline-flex items-center gap-1 text-xs font-black text-amber-700 hover:text-amber-900"
          >
            إطلاق تحدي سريع الآن ←
          </button>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
          <div className="flex items-center gap-2 font-black text-sm text-indigo-950 mb-2">
            <Bookmark size={18} className="text-indigo-600" />
            النمط الثاني: حزمة أسئلة صفية متتابعة 📚
          </div>
          <p className="text-xs text-indigo-900/80 leading-5">
            إطلاق جلسة تدريب صفي متتابعة من 2 إلى 10 أسئلة مجهزة مسبقاً، مع رابط السبورة التفاعلية للبروجكتور وكشف الأسئلة سؤالاً بعد سؤال.
          </p>
          <button
            type="button"
            onClick={() => handleTabChange('prepared-questions')}
            className="mt-3 inline-flex items-center gap-1 text-xs font-black text-indigo-700 hover:text-indigo-900"
          >
            تحضير وتجهيز الحزم مسبقاً ←
          </button>
        </div>
      </div>

      {/* Active Classes List for Direct Launch */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 mb-4">اختر الفصل الدراسي لبدء الحصة التفاعلية</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selectedSchool.assignments.map((assignment) => (
            <div
              key={assignment.assignmentId}
              className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <p className="font-black text-slate-900 text-sm">{assignment.className}</p>
                <p className="text-xs text-slate-500 mt-1">المادة: {assignment.subjectId || 'عام'}</p>
              </div>
              <button
                type="button"
                onClick={() => openLaunchForClass(assignment.classId)}
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700"
              >
                <Presentation size={13} /> إطلاق الحصة
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Tab 3: Prepared Questions & Question Bank (بنك التحضير المسبق)
  const renderPreparedQuestions = () => (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <Target className="text-indigo-600" size={22} />
              بنك التحضير المسبق وحزم التحدي الصفية
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              حضّر حزم الحصص والأسئلة وعيّن أسئلة التحدي مسبقاً قبل دخول الحصة لضمان الجاهزية اللحظية.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setTargetClassForLaunch('');
              setShowSchedulerModal(true);
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Presentation size={15} /> إطلاق حزمة محضرة للفصل 🚀
          </button>
        </div>

        {/* Prepared Templates Manager Component */}
        <div className="mt-6">
          <ClassroomPreparedTemplatesManager
            schoolId={selectedSchool.schoolId}
            teacherId={user?.id}
            selectedIds={selectedQuestionIds}
            challengeIds={challengeQuestionIds}
            onApplyTemplate={handleApplyTemplate}
          />
        </div>

        {/* Filter Bar & Question Bank */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-black text-slate-900 mb-3">
            استعراض بنك أسئلة المدرسة المعتمد ({filteredQuestions.length} سؤال متاح)
          </h3>

          <ClassroomQuestionFilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters({ track: '', subject: '', difficulty: '', search: '' })}
            totalCount={questions.length}
            filteredCount={filteredQuestions.length}
          />

          {questionsLoading ? (
            <div className="mt-6 text-center py-10 text-xs text-slate-400">جارٍ تحميل بنك الأسئلة المعتمد...</div>
          ) : (
            <div className="mt-4 space-y-2.5 max-h-[500px] overflow-y-auto">
              {filteredQuestions.map((question) => {
                const isChecked = selectedQuestionIds.includes(question.questionId);
                const isChallenge = challengeQuestionIds.includes(question.questionId);
                return (
                  <div
                    key={question.questionId}
                    className={`flex items-start justify-between rounded-xl border p-3.5 transition-all ${
                      isChecked ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleQuestionSelection(question.questionId)}
                        className="mt-1"
                      />
                      <span>
                        <b className="text-slate-900 text-xs sm:text-sm">{question.text}</b>
                        <small className="mt-1 block text-slate-500 text-[11px]">
                          {question.subject || question.type} · {question.difficulty || 'متوسط'} ·{' '}
                          {question.options?.length || 4} خيارات · المهارة: {question.skillIds?.[0] || 'عام'}
                        </small>
                      </span>
                    </label>
                    {isChecked && (
                      <button
                        type="button"
                        onClick={() => toggleChallengeFlag(question.questionId)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                          isChallenge ? 'bg-amber-500 text-white' : 'border border-slate-300 bg-white text-slate-600'
                        }`}
                      >
                        <Zap size={12} /> {isChallenge ? 'سؤال تحدي ⚡' : 'تعيين كتحدي'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Tab 4: Reports with Time Filter & Skill Diagnostics
  const renderReports = () => (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <SmartClassroomReportsSection
        schoolId={selectedSchool.schoolId}
        assignments={selectedSchool.assignments}
        smartClassroomEnabled={selectedSchool.smartClassroomEnabled}
        onPrepareIntervention={(skillId) => {
          setFilters((prev) => ({ ...prev, search: skillId }));
          handleTabChange('prepared-questions');
        }}
      />
    </div>
  );

  // Tab 5: Skills Radar (رادار فجوات الفصول)
  const renderSkillsRadar = () => (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <ClassSkillGapsRadar schoolId={selectedSchool.schoolId} assignments={selectedSchool.assignments} />
    </div>
  );

  // Tab 6: School Assessments (اختبارات المدرسة)
  const renderAssessments = () => (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
        <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
          <BookOpenCheck className="text-amber-600" size={22} />
          اختبارات وتكليفات المدرسة الموجهة لفصولي
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          قائمة الاختبارات المدرسية الموجهة للطلاب في فصولك المسندة مع تواريخ الاستحقاق ومتابعة الإنجاز.
        </p>

        <div className="mt-6 space-y-3">
          {selectedSchool.assessments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500">
              لا توجد اختبارات مدرسية موجهة لفصولك حالياً.
            </div>
          ) : (
            selectedSchool.assessments.map((assessment) => (
              <div
                key={assessment.assessmentId}
                className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-black text-slate-900 text-sm">{assessment.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    المادة: {assessment.subjectId || 'عام'} · {assessment.classIds.length} فصول موجهة · نوع الاختبار:{' '}
                    {assessment.quizKind || 'اختبار مدرسي'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <CalendarClock size={15} />
                  {assessment.dueDate ? `تاريخ التسليم: ${assessment.dueDate}` : 'بدون موعد نهائي'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Tab 7: Appreciation Certificates (شهادات التقدير)
  const renderCertificates = () => (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
              <Trophy className="text-amber-500" size={22} />
              شهادات التقدير والتحفيز الصفي
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              إصدار شهادات شكر وتقدير رسمية للطلاب المتميزين في الحصص الذكية وسرعة التحديات.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCertificateModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:bg-amber-600 active:scale-95 transition-all"
          >
            <Trophy size={16} /> فتح مولد الشهادات الرسمي 🏆
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/30 p-6 text-center">
          <Trophy size={36} className="mx-auto text-amber-500 mb-2" />
          <h3 className="text-sm font-black text-amber-950">تحفيز أبطال الحصص الذكية</h3>
          <p className="mt-1 text-xs text-amber-800 max-w-md mx-auto leading-5">
            يمكنك تخصيص اسم الطالب، الفصل الدراسي، نوع الإنجاز (الفائز بتحدي السرعة، الأكثر تفاعلاً، التميز الأكاديمي)، مع توقيع المعلم وإمكانية التحميل والطباعة بجودة عالية.
          </p>
          <button
            type="button"
            onClick={() => setShowCertificateModal(true)}
            className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-amber-600"
          >
            إنشاء شهادة جديدة الآن
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'smart-classroom':
        return renderSmartClassroom();
      case 'prepared-questions':
        return renderPreparedQuestions();
      case 'reports':
        return renderReports();
      case 'skills-radar':
        return renderSkillsRadar();
      case 'assessments':
        return renderAssessments();
      case 'certificates':
        return renderCertificates();
      default:
        return renderOverview();
    }
  };

  return (
    <>
      <DashboardLayout sidebar={renderSidebar()}>
        {renderContent()}
      </DashboardLayout>

      {/* Scheduler Modal */}
      <SmartClassroomSessionSchedulerModal
        isOpen={showSchedulerModal}
        onClose={() => setShowSchedulerModal(false)}
        workspace={workspace}
        initialSchoolId={selectedSchool.schoolId}
        initialClassId={targetClassForLaunch}
      />

      {/* Student Appreciation Certificate Modal */}
      <StudentAppreciationCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        defaultSchoolName={selectedSchool.schoolName}
        defaultClassName={selectedSchool.assignments[0]?.className || 'الصف الثالث الثانوي (أ)'}
      />
    </>
  );
};

export default SchoolTeacherDashboard;
