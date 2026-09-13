import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Award, BarChart3, BookOpenCheck, LayoutDashboard, Presentation, School, Target, Trophy } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { TeacherWorkspaceSwitcher } from '../components/teacher/TeacherWorkspaceSwitcher';
import { useTeacherWorkspaceOptional } from '../components/teacher/TeacherWorkspaceContext';
import { StudentAppreciationCertificateModal } from '../components/classroom/StudentAppreciationCertificateModal';
import { SmartClassroomSessionSchedulerModal } from '../components/classroom/SmartClassroomSessionSchedulerModal';
import { ClassroomPreparedTemplate } from '../components/classroom/ClassroomPreparedTemplatesManager';
import { ClassroomFilterState } from '../components/classroom/ClassroomQuestionFilterBar';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { SchoolTeacherOverview, SchoolTeacherSmartClassroom } from './school-teacher/SchoolTeacherPrimaryTabs';
import {
  SchoolTeacherAssessments,
  SchoolTeacherCertificates,
  SchoolTeacherPreparedQuestions,
  SchoolTeacherReports,
  SchoolTeacherSkillsRadar,
} from './school-teacher/SchoolTeacherSecondaryTabs';

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
  const navigate = useNavigate();
  const workspace = useTeacherWorkspaceOptional();
  const { user } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = (searchParams.get('tab') as SchoolTeacherTab) || 'overview';
  const [activeTab, setActiveTab] = useState<SchoolTeacherTab>(
    SCHOOL_TEACHER_NAV_ITEMS.some((item) => item.id === requestedTab) ? requestedTab : 'overview',
  );
  const [selectedSchoolId, setSelectedSchoolId] = useState(workspace?.schools[0]?.schoolId || '');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [targetClassForLaunch, setTargetClassForLaunch] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [challengeQuestionIds, setChallengeQuestionIds] = useState<string[]>([]);
  const [activeTeacherSession, setActiveTeacherSession] = useState<{
    sessionId: string;
    schoolId: string;
    classId: string;
    className: string;
    status: string;
    totalQuestions: number;
  } | null>(null);
  const [filters, setFilters] = useState<ClassroomFilterState>({
    pathId: '',
    subjectId: '',
    sectionId: '',
    skillId: '',
    difficulty: '',
    search: '',
  });
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const selectedSchool = useMemo(
    () => workspace?.schools.find((school) => school.schoolId === selectedSchoolId) || workspace?.schools[0],
    [selectedSchoolId, workspace],
  );

  const refreshActiveSession = useCallback(async () => {
    if (!selectedSchool?.schoolId) return;
    try {
      const res = await api.getTeacherActiveClassroomSession(selectedSchool.schoolId);
      if (res.hasActiveSession && res.session) setActiveTeacherSession(res.session);
      else setActiveTeacherSession(null);
    } catch {
      setActiveTeacherSession(null);
    }
  }, [selectedSchool?.schoolId]);

  useEffect(() => {
    void refreshActiveSession();
    const interval = setInterval(() => void refreshActiveSession(), 7000);
    return () => clearInterval(interval);
  }, [refreshActiveSession]);

  const handleEndActiveSession = async () => {
    if (!activeTeacherSession) return;
    try {
      await api.endClassroomSession(activeTeacherSession.sessionId);
      setActiveTeacherSession(null);
      await refreshActiveSession();
    } catch (err: any) {
      console.error('Failed to end active session:', err);
    }
  };

  const handleTabChange = useCallback((tab: SchoolTeacherTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  }, [setSearchParams]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as SchoolTeacherTab;
    if (tabFromUrl && tabFromUrl !== activeTab && SCHOOL_TEACHER_NAV_ITEMS.some((item) => item.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (activeTab !== 'prepared-questions' || !selectedSchool?.schoolId) return;
    let active = true;
    setQuestionsLoading(true);
    setQuestions([]);
    api.getClassroomQuestions(selectedSchool.schoolId)
      .then((res) => {
        if (!active) return;
        setQuestions(Array.isArray(res.questions) ? res.questions : []);
      })
      .catch(() => {
        if (active) setQuestions([]);
      })
      .finally(() => {
        if (active) setQuestionsLoading(false);
      });
    return () => { active = false; };
  }, [activeTab, selectedSchool?.schoolId]);

  const poolQuestions = questions;

  const filteredQuestions = useMemo(() => poolQuestions.filter((question: any) => {
    const activePathId = filters.pathId || filters.track;
    if (activePathId && question.pathId !== activePathId && question.examType !== activePathId) return false;
    const activeSubjectId = filters.subjectId || filters.subject;
    if (activeSubjectId && question.subject !== activeSubjectId) return false;
    if (filters.sectionId && question.sectionId !== filters.sectionId) return false;
    if (filters.skillId && !question.skillIds?.includes(filters.skillId)) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (filters.search && !question.text?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }), [poolQuestions, filters]);

  if (!workspace || !selectedSchool) return null;

  const openScheduler = (classId = '') => {
    setTargetClassForLaunch(classId);
    setShowSchedulerModal(true);
  };
  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 10 ? [...prev, id] : prev);
  };
  const toggleChallengeFlag = (id: string) => {
    setChallengeQuestionIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };
  const handleApplyTemplate = (template: ClassroomPreparedTemplate) => {
    setSelectedQuestionIds(template.questionIds);
    setChallengeQuestionIds(template.challengeIds);
  };
  const handleSchoolChange = (nextSchoolId: string) => {
    setSelectedSchoolId(nextSchoolId);
    setQuestions([]);
    setSelectedQuestionIds([]);
    setChallengeQuestionIds([]);
    setTargetClassForLaunch('');
    setFilters({ pathId: '', subjectId: '', sectionId: '', skillId: '', difficulty: '', search: '' });
  };

  const sidebar = (
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
              onChange={(event) => handleSchoolChange(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-800"
            >
              {workspace.schools.map((school) => (
                <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-3"><TeacherWorkspaceSwitcher /></div>
      </div>
      <nav className="space-y-0.5 px-3">
        {SCHOOL_TEACHER_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-right transition-colors text-xs font-bold ${isActive ? 'bg-indigo-50 text-indigo-700 font-black border-r-4 border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800'}`}
            >
              <div className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}>{item.icon}</div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-8 px-4">
        <button
          type="button"
          onClick={() => openScheduler()}
          disabled={!selectedSchool.smartClassroomEnabled}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 p-3 text-xs font-black text-white shadow-md hover:from-indigo-700 hover:to-indigo-800 active:scale-95 disabled:opacity-40 transition-all"
        >
          <Presentation size={15} /> بدء حصة ذكية فورية 🚀
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    let tabNode: React.ReactNode = null;
    switch (activeTab) {
      case 'overview':
        tabNode = <SchoolTeacherOverview selectedSchool={selectedSchool} userName={user?.name} onOpenScheduler={() => openScheduler()} onOpenCertificate={() => setShowCertificateModal(true)} onOpenClass={openScheduler} onTabChange={handleTabChange} />;
        break;
      case 'smart-classroom':
        tabNode = <SchoolTeacherSmartClassroom selectedSchool={selectedSchool} onOpenScheduler={() => openScheduler()} onOpenClass={openScheduler} onTabChange={handleTabChange} />;
        break;
      case 'prepared-questions':
        tabNode = <SchoolTeacherPreparedQuestions selectedSchool={selectedSchool} userId={user?.id} selectedQuestionIds={selectedQuestionIds} challengeQuestionIds={challengeQuestionIds} filters={filters} setFilters={setFilters} poolQuestions={poolQuestions} filteredQuestions={filteredQuestions} questionsLoading={questionsLoading} onOpenScheduler={() => openScheduler()} onToggleQuestion={toggleQuestionSelection} onToggleChallenge={toggleChallengeFlag} onApplyTemplate={handleApplyTemplate} />;
        break;
      case 'reports':
        tabNode = <SchoolTeacherReports selectedSchool={selectedSchool} onPrepareIntervention={(skillId) => { setFilters((prev) => ({ ...prev, search: skillId })); handleTabChange('prepared-questions'); }} />;
        break;
      case 'skills-radar':
        tabNode = <SchoolTeacherSkillsRadar selectedSchool={selectedSchool} />;
        break;
      case 'assessments':
        tabNode = <SchoolTeacherAssessments selectedSchool={selectedSchool} />;
        break;
      case 'certificates':
        tabNode = <SchoolTeacherCertificates onOpenCertificate={() => setShowCertificateModal(true)} />;
        break;
      default:
        tabNode = null;
    }

    return (
      <div className="space-y-6">
        {activeTeacherSession && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-indigo-500 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-5 text-white shadow-xl animate-fade-in" dir="rtl">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300">
                <Presentation size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-black text-emerald-300">
                    ● حصة ذكية جارية الآن
                  </span>
                  <span className="text-xs font-bold text-indigo-200">
                    {activeTeacherSession.className} ({activeTeacherSession.totalQuestions} أسئلة)
                  </span>
                </div>
                <h3 className="mt-1 text-sm sm:text-base font-black text-white">
                  لديك حصة تفاعلية نشطة تبث للطلاب حالياً
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`/classroom/${activeTeacherSession.sessionId}/teacher`)}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-emerald-400 active:scale-95 transition-all"
              >
                العودة لشاشة الحصة 🚀
              </button>
              <button
                type="button"
                onClick={() => void handleEndActiveSession()}
                className="flex items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/20 px-3.5 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 transition-all"
              >
                إنهاء الحصة 🛑
              </button>
            </div>
          </div>
        )}
        {tabNode}
      </div>
    );
  };

  return (
    <>
      <DashboardLayout sidebar={sidebar}>{renderContent()}</DashboardLayout>
      <SmartClassroomSessionSchedulerModal
        isOpen={showSchedulerModal}
        onClose={() => setShowSchedulerModal(false)}
        workspace={workspace}
        initialSchoolId={selectedSchool.schoolId}
        initialClassId={targetClassForLaunch}
        selectedQuestionIds={selectedQuestionIds}
        challengeQuestionIds={challengeQuestionIds}
        activeSession={activeTeacherSession}
        onSessionEnded={() => void refreshActiveSession()}
        onSuccess={() => void refreshActiveSession()}
      />
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
