import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const mapStoreQuestion = (q: any) => ({
  questionId: q.id,
  text: q.text,
  imageUrl: q.imageUrl || '',
  options: q.options || [],
  type: q.type || 'mcq',
  skillIds: q.skillIds || [],
  pathId: q.pathId || '',
  subject: q.subject || '',
  sectionId: q.sectionId || '',
  difficulty: q.difficulty || 'Medium',
  examType: q.examType || 'general',
  explanation: q.explanation || '',
});

export const SchoolTeacherDashboard: React.FC = () => {
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
  const [filters, setFilters] = useState<ClassroomFilterState>({
    pathId: '',
    subjectId: '',
    sectionId: '',
    skillId: '',
    difficulty: '',
    search: '',
  });
  const [questionsLoading, setQuestionsLoading] = useState(false);

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

  const selectedSchool = useMemo(
    () => workspace?.schools.find((school) => school.schoolId === selectedSchoolId) || workspace?.schools[0],
    [selectedSchoolId, workspace],
  );
  const storeQuestions = useStore((state) => state.questions) || [];

  useEffect(() => {
    if (activeTab !== 'prepared-questions' || !selectedSchool || questions.length > 0) return;
    setQuestionsLoading(true);
    api
      .getClassroomQuestions(selectedSchool.schoolId)
      .then((res) => {
        if (res.questions?.length) setQuestions(res.questions);
        else if (storeQuestions.length > 0) setQuestions(storeQuestions.map(mapStoreQuestion));
      })
      .catch(() => {
        if (storeQuestions.length > 0) setQuestions(storeQuestions.map(mapStoreQuestion));
      })
      .finally(() => setQuestionsLoading(false));
  }, [activeTab, selectedSchool, questions.length, storeQuestions]);

  const poolQuestions = useMemo(() => {
    if (questions.length > 0) return questions;
    return storeQuestions.length > 0 ? storeQuestions.map(mapStoreQuestion) : [];
  }, [questions, storeQuestions]);

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
              onChange={(event) => setSelectedSchoolId(event.target.value)}
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
    switch (activeTab) {
      case 'overview':
        return <SchoolTeacherOverview selectedSchool={selectedSchool} userName={user?.name} onOpenScheduler={() => openScheduler()} onOpenCertificate={() => setShowCertificateModal(true)} onOpenClass={openScheduler} onTabChange={handleTabChange} />;
      case 'smart-classroom':
        return <SchoolTeacherSmartClassroom selectedSchool={selectedSchool} onOpenScheduler={() => openScheduler()} onOpenClass={openScheduler} onTabChange={handleTabChange} />;
      case 'prepared-questions':
        return <SchoolTeacherPreparedQuestions selectedSchool={selectedSchool} userId={user?.id} selectedQuestionIds={selectedQuestionIds} challengeQuestionIds={challengeQuestionIds} filters={filters} setFilters={setFilters} poolQuestions={poolQuestions} filteredQuestions={filteredQuestions} questionsLoading={questionsLoading} onOpenScheduler={() => openScheduler()} onToggleQuestion={toggleQuestionSelection} onToggleChallenge={toggleChallengeFlag} onApplyTemplate={handleApplyTemplate} />;
      case 'reports':
        return <SchoolTeacherReports selectedSchool={selectedSchool} onPrepareIntervention={(skillId) => { setFilters((prev) => ({ ...prev, search: skillId })); handleTabChange('prepared-questions'); }} />;
      case 'skills-radar':
        return <SchoolTeacherSkillsRadar selectedSchool={selectedSchool} />;
      case 'assessments':
        return <SchoolTeacherAssessments selectedSchool={selectedSchool} />;
      case 'certificates':
        return <SchoolTeacherCertificates onOpenCertificate={() => setShowCertificateModal(true)} />;
      default:
        return null;
    }
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
