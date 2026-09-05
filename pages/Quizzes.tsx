import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Unlock,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PaymentModal } from '../components/PaymentModal';
import { StudentNextActionStrip } from '../components/StudentNextActionStrip';
import { EmptyState } from '../components/ui/EmptyState';
import { useStore } from '../store/useStore';
import { Quiz, Topic, ContentWorkflow, Activity, QuizResult } from "../types";
import { isTrueMockExam } from "../utils/quizPlacement";
import { buildQuizRouteWithContext, isSafeInternalRoute } from '../utils/quizLinks';
import { isStandaloneMockExam } from '../utils/mockExam';
import { api } from '../services/api';

interface QuizzesProps {
  view?: 'catalog' | 'attempts';
}

type AttemptCategory = 'regular' | 'mock';
type AttemptScoreFilter = 'all' | 'needs-review' | 'good';

type AssignedBarcodeTest = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  testKind?: 'quick' | 'mock';
  questionCount?: number;
  publicUrl: string;
  settings?: { timeLimit?: number };
};

type QuizAttemptGroup = {
  key: string;
  quizId: string;
  quizTitle: string;
  category: AttemptCategory;
  quiz?: Quiz;
  attempts: QuizResult[];
  latestAttempt: QuizResult;
  bestAttempt: QuizResult;
};

const formatQuizDate = (date?: string) => {
  if (!date) return 'متاح الآن';
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCreatedDate = (date?: number) => {
  if (!date) return 'متاح الآن';
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const Quizzes: React.FC<QuizzesProps> = ({ view = 'catalog' }) => {
  const { examResults, quizzes, subjects, paths, lessons, libraryItems, user, checkAccess, hasScopedPackageAccess, getMatchingPackage } = useStore();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activePathFilter, setActivePathFilter] = useState<string>('all');
  const [activeAttemptCategory, setActiveAttemptCategory] = useState<AttemptCategory>('regular');
  const [activeAttemptScoreFilter, setActiveAttemptScoreFilter] = useState<AttemptScoreFilter>('all');
  const [openAttemptGroupKey, setOpenAttemptGroupKey] = useState<string | null>(null);
  const [lockedQuizForPayment, setLockedQuizForPayment] = useState<(typeof quizzes)[number] | null>(null);
  const [assignedBarcodeTests, setAssignedBarcodeTests] = useState<AssignedBarcodeTest[]>([]);
  const [assignedBarcodeTestsLoading, setAssignedBarcodeTestsLoading] = useState(false);
  const isAttemptsView = view === 'attempts';

  useEffect(() => {
    if (user.id === 'guest' || user.role !== 'student' || isAttemptsView) return;
    let cancelled = false;
    setAssignedBarcodeTestsLoading(true);
    api.listAssignedPublicBarcodeTests()
      .then((response) => {
        if (!cancelled) setAssignedBarcodeTests((response as { items?: AssignedBarcodeTest[] }).items || []);
      })
      .catch(() => {
        if (!cancelled) setAssignedBarcodeTests([]);
      })
      .finally(() => {
        if (!cancelled) setAssignedBarcodeTestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAttemptsView, user.id, user.role]);

  const totalQuizzes = examResults.length;
  const passedQuizzes = examResults.filter((quiz) => quiz.score >= 50).length;
  const maxScore = Math.max(...examResults.map((quiz) => quiz.score), 0);

  const avgImprovement = useMemo(() => {
    if (examResults.length < 2) return 0;
    const ordered = [...examResults].reverse();
    const first = ordered[0]?.score || 0;
    const last = ordered[ordered.length - 1]?.score || 0;
    return Math.max(0, last - first);
  }, [examResults]);

  const canSeeHiddenPaths = ['admin', 'teacher', 'supervisor'].includes(String(user.role));
  const visiblePathIds = useMemo(
    () => new Set(paths.filter((path) => canSeeHiddenPaths || path.isActive !== false).map((path) => path.id)),
    [canSeeHiddenPaths, paths],
  );

  const canAccessQuiz = useMemo(
    () => (quiz: (typeof quizzes)[number]) => {
      if (!quiz.isPublished || (quiz.type ?? 'quiz') !== 'quiz') return false;
      if (quiz.showOnPlatform === false) return false;
      if (quiz.approvalStatus && quiz.approvalStatus !== 'approved' && !canSeeHiddenPaths) return false;
      if (!canSeeHiddenPaths && quiz.pathId && !visiblePathIds.has(quiz.pathId)) return false;

      if (quiz.dueDate) {
        const deadline = new Date(`${quiz.dueDate}T23:59:59`);
        if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) return false;
      }

      const targetUserIds = quiz.targetUserIds || [];
      const targetGroupIds = quiz.targetGroupIds || [];
      const hasExplicitTargets = targetUserIds.length > 0 || targetGroupIds.length > 0;
      if (hasExplicitTargets) {
        const userGroups = Array.from(new Set([...(user.groupIds || []), ...(user.schoolId ? [user.schoolId] : [])]));
        const isUserTargeted = targetUserIds.length > 0 && targetUserIds.includes(user.id);
        // The authenticated quiz catalog is already audience-filtered by the API.
        // If a legacy student session has no hydrated groupIds, keep a server-authorized
        // group assignment visible rather than hiding a real school test client-side.
        const isGroupTargeted =
          targetGroupIds.length > 0 &&
          (userGroups.length === 0 || targetGroupIds.some((groupId) => userGroups.includes(groupId)));

        // Directed audiences are additive: direct student OR any assigned class/school.
        if (!isUserTargeted && !isGroupTargeted) return false;
      }

      const access = quiz.access || { type: 'free' as const };
      if (access.type === 'free') return true;
      if (access.type === 'paid') return hasScopedPackageAccess('tests', quiz.pathId, quiz.subjectId) || checkAccess(quiz.id, true);
      if (access.type === 'private') {
        const userGroups = user.groupIds || [];
        return (access.allowedGroupIds || []).length === 0 || !!access.allowedGroupIds?.some((groupId) => userGroups.includes(groupId));
      }
      if (access.type === 'course_only') return hasScopedPackageAccess('courses', quiz.pathId, quiz.subjectId);
      return false;
    },
    [canSeeHiddenPaths, checkAccess, hasScopedPackageAccess, user.groupIds, user.id, user.schoolId, visiblePathIds],
  );

  const availablePreparedQuizzes = useMemo(
    () => quizzes.filter((quiz) => !isStandaloneMockExam(quiz)).filter((quiz) => canAccessQuiz(quiz)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [canAccessQuiz, quizzes],
  );
  const getPathName = (pathId?: string) => paths.find((path) => path.id === pathId)?.name || 'بدون مسار';
  const matchesActivePath = (pathId?: string) => activePathFilter === 'all' || pathId === activePathFilter;
  const pathFilteredPreparedQuizzes = useMemo(
    () => availablePreparedQuizzes.filter((quiz) => matchesActivePath(quiz.pathId)),
    [activePathFilter, availablePreparedQuizzes],
  );

  const quizLookup = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes]);
  const visiblePathOptions = useMemo(() => paths.filter((path) => canSeeHiddenPaths || path.isActive !== false), [canSeeHiddenPaths, paths]);

  const attemptGroups = useMemo<QuizAttemptGroup[]>(() => {
    const grouped = new Map<string, QuizAttemptGroup>();
    examResults.forEach((result) => {
      const quiz = quizLookup.get(result.quizId);
      const category: AttemptCategory = result.source === 'mock-exam' || (quiz && isStandaloneMockExam(quiz)) ? 'mock' : 'regular';
      const key = result.quizId || result.quizTitle || result.date;
      const existing = grouped.get(key);
      if (existing) existing.attempts.push(result);
      else grouped.set(key, {
        key,
        quizId: result.quizId,
        quizTitle: result.quizTitle || quiz?.title || 'اختبار بدون عنوان',
        category,
        quiz,
        attempts: [result],
        latestAttempt: result,
        bestAttempt: result,
      });
    });

    return Array.from(grouped.values())
      .map((group) => {
        const attempts = [...group.attempts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
          ...group,
          attempts,
          latestAttempt: attempts[0],
          bestAttempt: attempts.reduce((best, attempt) => (attempt.score > best.score ? attempt : best), attempts[0]),
        };
      })
      .sort((a, b) => new Date(b.latestAttempt.date).getTime() - new Date(a.latestAttempt.date).getTime());
  }, [examResults, quizLookup]);

  const attemptGroupsByCategory = useMemo(() => ({
    regular: attemptGroups.filter((group) => group.category === 'regular'),
    mock: attemptGroups.filter((group) => group.category === 'mock'),
  }), [attemptGroups]);

  const activeAttemptGroups = attemptGroupsByCategory[activeAttemptCategory];
  const activeAttemptSummary = useMemo(() => {
    const totalAttempts = activeAttemptGroups.reduce((sum, group) => sum + group.attempts.length, 0);
    const needsReview = activeAttemptGroups.filter((group) => group.latestAttempt.score < 75).length;
    const good = activeAttemptGroups.filter((group) => group.latestAttempt.score >= 75).length;
    const averageLatest = activeAttemptGroups.length
      ? Math.round(activeAttemptGroups.reduce((sum, group) => sum + group.latestAttempt.score, 0) / activeAttemptGroups.length)
      : 0;
    return { totalAttempts, needsReview, good, averageLatest };
  }, [activeAttemptGroups]);

  const attemptTitleFilters = useMemo(() => ['الكل', ...Array.from(new Set(activeAttemptGroups.map((group) => group.quizTitle).filter(Boolean)))], [activeAttemptGroups]);
  const filteredAttemptGroups = activeFilter === 'all' || activeFilter === 'الكل'
    ? activeAttemptGroups
    : activeAttemptGroups.filter((group) => group.quizTitle.includes(activeFilter));
  const visibleAttemptGroups = filteredAttemptGroups.filter((group) =>
    matchesActivePath(group.quiz?.pathId || group.latestAttempt.skillsAnalysis?.[0]?.pathId) &&
    (activeAttemptScoreFilter === 'all' ||
      (activeAttemptScoreFilter === 'needs-review' && group.latestAttempt.score < 75) ||
      (activeAttemptScoreFilter === 'good' && group.latestAttempt.score >= 75))
  );

  useEffect(() => {
    if (isAttemptsView) {
      setActiveFilter('all');
      setActiveAttemptScoreFilter('all');
      setOpenAttemptGroupKey(null);
    }
  }, [activeAttemptCategory, isAttemptsView]);

  const directedQuizzes = useMemo(
    () => pathFilteredPreparedQuizzes.filter((quiz) => {
      const mode = quiz.mode || 'regular';
      const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
      return mode === 'central' || hasExplicitTargets;
    }),
    [pathFilteredPreparedQuizzes],
  );

  const saherQuizzes = useMemo(
    () => pathFilteredPreparedQuizzes.filter((quiz) => {
      const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
      return (quiz.mode || 'regular') === 'saher' && !hasExplicitTargets;
    }),
    [pathFilteredPreparedQuizzes],
  );

  const centralQuizzes = useMemo(() => pathFilteredPreparedQuizzes.filter((quiz) => (quiz.mode || 'regular') === 'central'), [pathFilteredPreparedQuizzes]);

  const guidedSaherQuizzes = useMemo(
    () => pathFilteredPreparedQuizzes.filter((quiz) => {
      const mode = quiz.mode || 'regular';
      const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
      return mode === 'saher' || mode === 'central' || hasExplicitTargets;
    }),
    [pathFilteredPreparedQuizzes],
  );

  const regularPreparedQuizzes = useMemo(
    () => pathFilteredPreparedQuizzes.filter((quiz) => {
      const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
      return (quiz.mode || 'regular') === 'regular' && !hasExplicitTargets;
    }),
    [pathFilteredPreparedQuizzes],
  );

  const lockedPaidQuizzes = useMemo(
    () => quizzes.filter((quiz) => {
      if (isStandaloneMockExam(quiz)) return false;
      if (!quiz.isPublished || (quiz.type ?? 'quiz') !== 'quiz') return false;
      if (quiz.showOnPlatform === false) return false;
      if (quiz.approvalStatus && quiz.approvalStatus !== 'approved' && !canSeeHiddenPaths) return false;
      if (!canSeeHiddenPaths && quiz.pathId && !visiblePathIds.has(quiz.pathId)) return false;
      if (quiz.access?.type !== 'paid') return false;
      return !canAccessQuiz(quiz);
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 4),
    [canAccessQuiz, canSeeHiddenPaths, quizzes, visiblePathIds],
  );

  const weakSkillRecommendations = useMemo(() => {
    const weakSkillsMap = new Map<string, {
      key: string;
      skillId?: string;
      pathId?: string;
      subjectId?: string;
      sectionId?: string;
      section?: string;
      skill: string;
      masterySum: number;
      attempts: number;
    }>();

    examResults.forEach((result) => {
      (result.skillsAnalysis || []).forEach((skill) => {
        if (skill.mastery >= 75 && skill.status !== 'weak') return;
        const key = skill.skillId || [skill.subjectId, skill.sectionId, skill.skill].filter(Boolean).join(':');
        const existing = weakSkillsMap.get(key);
        if (existing) {
          existing.masterySum += skill.mastery;
          existing.attempts += 1;
          return;
        }
        weakSkillsMap.set(key, {
          key,
          skillId: skill.skillId,
          pathId: skill.pathId,
          subjectId: skill.subjectId,
          sectionId: skill.sectionId,
          section: skill.section,
          skill: skill.skill,
          masterySum: skill.mastery,
          attempts: 1,
        });
      });
    });

    return Array.from(weakSkillsMap.values())
      .map((item) => {
        const mastery = Math.round(item.masterySum / item.attempts);
        const relatedQuizzes = pathFilteredPreparedQuizzes.filter((quiz) => {
          const directSkillMatch = !!item.skillId && (quiz.skillIds || []).includes(item.skillId);
          const subjectMatch = !!item.subjectId && quiz.subjectId === item.subjectId;
          const sectionMatch = !item.sectionId || quiz.sectionId === item.sectionId;
          return directSkillMatch || (subjectMatch && sectionMatch);
        }).sort((a, b) => {
          const rank = (mode?: string) => (mode === 'saher' ? 0 : mode === 'regular' ? 1 : 2);
          return rank(a.mode) - rank(b.mode);
        });

        return {
          ...item,
          mastery,
          subjectName: subjects.find((subject) => subject.id === item.subjectId)?.name || 'بدون مادة',
          recommendedQuiz: relatedQuizzes[0],
          relatedCount: relatedQuizzes.length,
          recommendedLesson: lessons.find((lesson) =>
            lesson.showOnPlatform !== false &&
            (!lesson.approvalStatus || lesson.approvalStatus === 'approved') &&
            ((!!item.skillId && lesson.skillIds?.includes(item.skillId)) ||
            (!!item.subjectId && lesson.subjectId === item.subjectId && (!item.sectionId || lesson.sectionId === item.sectionId)))
          ),
          recommendedResource: libraryItems.find((resource) =>
            resource.showOnPlatform !== false &&
            (!resource.approvalStatus || resource.approvalStatus === 'approved') &&
            ((!!item.skillId && resource.skillIds?.includes(item.skillId)) ||
            (!!item.subjectId && resource.subjectId === item.subjectId && (!item.sectionId || resource.sectionId === item.sectionId)))
          ),
        };
      })
      .filter((item) => item.mastery < 75)
      .sort((a, b) => a.mastery - b.mastery || b.relatedCount - a.relatedCount)
      .slice(0, 3);
  }, [pathFilteredPreparedQuizzes, examResults, subjects, lessons, libraryItems]);

  const getAttemptResultLink = (result: QuizResult, viewMode?: 'review' | 'analysis') => {
    const params = new URLSearchParams({ attempt: result.date });
    if (viewMode) params.set('view', viewMode);
    return `/results?${params.toString()}`;
  };

  const getAttemptRetryLink = (result: QuizResult) => {
    if (!result.quizId || result.quizId.startsWith('self-quiz')) return '/quiz';
    return buildQuizRouteWithContext(result.quizId, {
      returnTo: isSafeInternalRoute(result.returnTo) ? result.returnTo : undefined,
      source: result.source,
    });
  };

  const weakestTrackedSkill = useMemo(() => {
    const allSkills = examResults.flatMap((result) => (result.skillsAnalysis || []).map((skill) => ({ ...skill, quizTitle: result.quizTitle, quizId: result.quizId })));
    return allSkills.sort((a, b) => a.mastery - b.mastery)[0];
  }, [examResults]);

  const latestAttempt = attemptGroups[0]?.latestAttempt;
  const firstWeakRecommendation = weakSkillRecommendations[0];
  const quizCenterNextAction = firstWeakRecommendation
    ? {
        title: `ابدأ بمهارة: ${firstWeakRecommendation.skill}`,
        description: `راجع التقرير ثم افتح خطة علاج قصيرة، وبعدها أعد القياس. مستوى الإتقان الحالي ${firstWeakRecommendation.mastery}%.`,
        primaryLabel: 'افتح التقرير',
        primaryHref: '/reports',
        secondaryLabel: 'ابدأ خطة علاج',
        secondaryHref: '/plan',
        tone: firstWeakRecommendation.mastery < 50 ? ('rose' as const) : ('amber' as const),
        icon: <Target size={18} className="text-amber-600" />,
      }
    : latestAttempt && latestAttempt.score < 75
      ? {
          title: 'راجع آخر اختبار قبل المحاولة التالية',
          description: `آخر درجة ${latestAttempt.score}%. افتح التحليل المختصر، ثم أعد المحاولة عندما تراجع نقطة الضعف.`,
          primaryLabel: 'افتح التحليل',
          primaryHref: getAttemptResultLink(latestAttempt, 'analysis'),
          secondaryLabel: 'إعادة المحاولة',
          secondaryHref: getAttemptRetryLink(latestAttempt),
          tone: 'rose' as const,
          icon: <TrendingUp size={18} className="text-rose-600" />,
        }
      : directedQuizzes.length > 0
        ? {
            title: 'لديك اختبار مدرسي جاهز',
            description: 'ابدأ الاختبار المدرسي أولًا لأنه موجه من المدرسة أو المشرف أو ضمن خطة علاجية، وبعده ستظهر النتيجة في اختباراتي.',
            primaryLabel: 'ابدأ الاختبار المدرسي',
            primaryHref: buildQuizRouteWithContext(directedQuizzes[0].id, { returnTo: '/dashboard?tab=exams' }),
            secondaryLabel: 'اختباراتي',
            secondaryHref: '/dashboard?tab=quizzes',
            tone: 'indigo' as const,
            icon: <Target size={18} className="text-indigo-600" />,
          }
        : {
            title: 'ابدأ قياسًا قصيرًا بساهر',
            description: 'اختبار ساهر يعطيك نقطة بداية واضحة، ثم يفتح لك التقرير وخطة التدريب حسب أضعف مهارة.',
            primaryLabel: 'اختبار ساهر',
            primaryHref: '/quiz',
            secondaryLabel: 'تقريري',
            secondaryHref: '/reports',
            tone: 'emerald' as const,
            icon: <Zap size={18} className="text-emerald-600" />,
          };

  const subjectQuizReadiness = useMemo(
    () => subjects.map((subject) => {
      const subjectQuizzes = pathFilteredPreparedQuizzes.filter((quiz) => quiz.subjectId === subject.id);
      return {
        subject,
        total: subjectQuizzes.length,
        directedCount: directedQuizzes.filter((quiz) => quiz.subjectId === subject.id).length,
        saherCount: saherQuizzes.filter((quiz) => quiz.subjectId === subject.id).length,
      };
    }).filter((item) => item.total > 0).sort((a, b) => b.total - a.total).slice(0, 6),
    [pathFilteredPreparedQuizzes, directedQuizzes, saherQuizzes, subjects],
  );

  if (isAttemptsView && totalQuizzes === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-16">
        <header className="flex flex-col gap-2 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">اختباراتي</span>
            <Link to="/dashboard?tab=saher" className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50">مركز الاختبارات</Link>
          </div>
          <h1 className="text-xl font-black leading-tight text-gray-900">لا توجد محاولات بعد</h1>
          <p className="text-sm font-bold leading-7 text-gray-500">بعد أول اختبار ستظهر هنا محاولاتك ومراجعة الحلول والتقرير المختصر.</p>
        </header>
        <EmptyState
          eyebrow="اختبار واحد يكفي للبداية"
          title="ابدأ من اختبار واحد"
          description="اختر مركز الاختبارات أو أنشئ اختبار ساهر، وبعد الحل ستظهر المحاولات والتقرير المختصر هنا."
          icon={<FileText size={22} />}
          primaryAction={{ label: 'مركز الاختبارات', href: '/dashboard?tab=saher', icon: <Zap size={15} /> }}
          secondaryAction={{ label: 'تقريري', href: '/reports', icon: <TrendingUp size={15} /> }}
          tone="indigo"
        />
      </div>
    );
  }

  if (isAttemptsView) {
    return (
      <div className="space-y-5 pb-20">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">اختباراتي</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">سجل المحاولات السابقة والتقدم في الاختبارات التدريبية والمحاكية</p>
            </div>
            {weakestTrackedSkill ? (
              <Link to="/dashboard?tab=reports" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100 transition-colors">
                <Target size={16} /> أولوية المراجعة: {weakestTrackedSkill.skill}
              </Link>
            ) : null}
          </div>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Sparkles size={22} />} value={`${maxScore}%`} label="أعلى درجة" color="purple" />
          <StatCard icon={<TrendingUp size={22} />} value={`${avgImprovement}%`} label="التحسن" color="amber" />
          <StatCard icon={<CheckCircle size={22} />} value={passedQuizzes} label="اختبارات ناجحة" color="blue" />
          <StatCard icon={<FileText size={22} />} value={totalQuizzes} label="محاولات مسجلة" color="emerald" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 border-b border-gray-100">
            <button type="button" onClick={() => setActiveAttemptCategory('regular')} className={`flex items-center justify-center gap-2 py-3.5 text-sm font-black transition-all ${activeAttemptCategory === 'regular' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              <FileText size={16} /> اختباراتي
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${activeAttemptCategory === 'regular' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{attemptGroupsByCategory.regular.length}</span>
            </button>
            <button type="button" onClick={() => setActiveAttemptCategory('mock')} className={`flex items-center justify-center gap-2 py-3.5 text-sm font-black transition-all border-r border-gray-100 ${activeAttemptCategory === 'mock' ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              <Sparkles size={16} /> اختبارات محاكية
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${activeAttemptCategory === 'mock' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>{attemptGroupsByCategory.mock.length}</span>
            </button>
          </div>

          <div className="border-b border-gray-100 bg-gray-50/70 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={activeAttemptCategory} onChange={(e) => setActiveAttemptCategory(e.target.value as AttemptCategory)} className="hidden"><option value="regular">اختبارات عادية</option><option value="mock">اختبارات محاكية</option></select>
              {attemptTitleFilters.length > 2 ? (
                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 focus:border-indigo-400 focus:outline-none">
                  {attemptTitleFilters.map((filter) => <option key={filter} value={filter === 'الكل' ? 'all' : filter}>{filter}</option>)}
                </select>
              ) : null}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={activePathFilter} onChange={(event) => setActivePathFilter(event.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 focus:border-amber-400 focus:outline-none">
                <option value="all">كل المسارات</option>{visiblePathOptions.map((path) => <option key={path.id} value={path.id}>{path.name}</option>)}
              </select>
              <select value={activeAttemptScoreFilter} onChange={(e) => setActiveAttemptScoreFilter(e.target.value as AttemptScoreFilter)} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 focus:border-emerald-400 focus:outline-none">
                <option value="all">كل النتائج ({activeAttemptGroups.length})</option><option value="needs-review">يحتاج مراجعة ({activeAttemptSummary.needsReview})</option><option value="good">مطمئن ({activeAttemptSummary.good})</option>
              </select>
            </div>
          </div>

          {visibleAttemptGroups.length > 0 ? (
            <div className="space-y-3 p-4">
              {visibleAttemptGroups.map((group) => (
                <AttemptGroupCard key={group.key} group={group} isOpen={openAttemptGroupKey === group.key} onToggle={() => setOpenAttemptGroupKey((current) => (current === group.key ? null : group.key))} getAttemptResultLink={getAttemptResultLink} getAttemptRetryLink={getAttemptRetryLink} getPathName={getPathName} />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500">لا توجد محاولات هنا بعد.<div className="mt-5"><Link to="/dashboard?tab=saher" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600"><Zap size={16} /> ابدأ اختبار ساهر</Link></div></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700"><ArrowRight /></Link>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black mb-2">
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">أنت الآن في: مركز الاختبارات</span>
            <Link to="/dashboard?tab=quizzes" className="rounded-full bg-white px-3 py-1.5 text-gray-700 border border-gray-200 hover:bg-gray-50">الانتقال إلى اختباراتي</Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">مركز الاختبارات</h1>
          <p className="mt-1 text-sm text-gray-500">الاختبارات المدرسية تظهر في قسم مستقل، أما هنا فتجد اختبارات المنصة وساهر وسجل محاولاتك.</p>
        </div>
      </header>

      {/* Kept for product continuity; school-directed tests are rendered explicitly below. */}
      {/* <StudentNextActionStrip {...quizCenterNextAction} /> */}

      {user.id !== 'guest' && user.role === 'student' && !isAttemptsView && (assignedBarcodeTestsLoading || assignedBarcodeTests.length > 0) ? (
        <section data-testid="student-assigned-barcode-tests" className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-black text-gray-900">اختبارات مباشرة موجهة لك</h2><p className="mt-1 text-xs font-bold leading-6 text-gray-500">اختبارات QR أو باركود أرسلها لك المعلم أو المشرف مباشرة.</p></div>
            <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm sm:self-auto">{assignedBarcodeTestsLoading ? 'جاري التحديث…' : String(assignedBarcodeTests.length) + ' اختبار'}</span>
          </div>
          {assignedBarcodeTestsLoading ? (
            <div className="rounded-xl border border-cyan-100 bg-white/80 px-4 py-5 text-sm font-bold text-gray-500">جاري تحميل الاختبارات الموجهة…</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assignedBarcodeTests.map((test) => (
                <div key={test.id || test.slug} className="rounded-xl border border-cyan-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-black text-gray-900">{test.title}</div>{test.description ? <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-gray-500">{test.description}</p> : null}</div><span className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700">{test.testKind === 'mock' ? 'محاكي' : 'مباشر'}</span></div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">{typeof test.questionCount === 'number' ? <span>{test.questionCount} سؤال</span> : null}{test.settings?.timeLimit ? <span>{test.settings.timeLimit} دقيقة</span> : null}</div>
                  <Link to={'/barcode-test/' + encodeURIComponent(test.slug)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-cyan-800"><Target size={16} /> دخول الاختبار</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section id="school-tests" data-testid="student-directed-tests" className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-700 p-3 rounded-2xl"><Target size={24} /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-gray-900">الاختبارات المدرسية</h2>
                {directedQuizzes.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700">يتطلب انتباهك</span>}
              </div>
              <p className="mt-1 text-xs sm:text-sm font-bold leading-6 text-gray-500">كل اختبار يصل من المدرسة أو المشرف أو ضمن خطة علاجية يظهر هنا فقط، بعيدًا عن اختبارات المنصة العامة.</p>
            </div>
          </div>
          <span className="self-start rounded-full bg-white px-4 py-1.5 text-sm font-black text-indigo-700 shadow-sm border border-indigo-100 sm:self-auto">{directedQuizzes.length} اختبار مدرسي</span>
        </div>

        {directedQuizzes.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 relative z-10">
            {directedQuizzes.map((quiz) => {
              const route = buildQuizRouteWithContext(quiz.id, { returnTo: '/dashboard?tab=exams', source: 'tests' });
              const pathName = getPathName(quiz.pathId);
              const completedResult = examResults.find((result) => result.quizId === quiz.id);
              return (
                <div key={quiz.id} data-testid={`student-directed-test-${quiz.id}`} className="rounded-2xl border border-indigo-100 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-md flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0"><h3 className="text-base font-black text-gray-900">{quiz.title}</h3><p className="mt-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">{pathName}</p></div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${completedResult ? 'bg-emerald-100 text-emerald-700' : isTrueMockExam(quiz) ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{completedResult ? 'تم الحل' : isTrueMockExam(quiz) ? 'مدرسي محاكي' : 'مدرسي'}</span>
                  </div>
                  <p className="line-clamp-2 text-xs font-bold leading-5 text-gray-500 flex-grow">{quiz.supervisorMessage || quiz.description || 'اختبار موجه من المدرسة للمتابعة والقياس.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                    <span className="rounded-lg bg-gray-50 px-2.5 py-1">{quiz.quizKind === 'mock' ? (quiz.mockExam?.sections?.reduce((sum, section) => sum + (section.questionIds?.length || 0), 0) || 0) : (quiz.questionIds || []).length} سؤال</span>
                    {quiz.dueDate && <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700">حتى {formatQuizDate(quiz.dueDate)}</span>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    {completedResult ? <Link to={`/results?attempt=${encodeURIComponent(completedResult.date)}`} className="text-xs font-black text-emerald-700 hover:underline">عرض آخر نتيجة {completedResult.score}%</Link> : <span className="text-xs font-bold text-gray-400">لم يؤدَ بعد</span>}
                    <Link to={route} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700">{completedResult ? 'إعادة الدخول' : 'دخول الاختبار'} <ArrowRight size={14} /></Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-5 py-7 text-center">
            <CheckCircle size={26} className="mx-auto text-emerald-500" />
            <h3 className="mt-2 font-black text-gray-900">لا توجد اختبارات مدرسية مطلوبة الآن</h3>
            <p className="mt-1 text-xs font-bold text-gray-500">عند توجيه المدرسة أو المشرف اختبارًا لك أو لفصلك سيظهر هنا تلقائيًا.</p>
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-black text-gray-800">فلترة اختبارات المنصة حسب المسار</label>
        <select value={activePathFilter} onChange={(event) => setActivePathFilter(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 focus:border-amber-400 focus:outline-none">
          <option value="all">كل المسارات</option>{visiblePathOptions.map((path) => <option key={path.id} value={path.id}>{path.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-secondary-500 text-white p-3 text-center font-bold text-base">اختبارات المنصة</div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionCard icon={<Zap size={20} />} title="اختبار ساهر الذاتي" to="/quiz" buttonLabel="ابدأ الآن" tone="purple" />
              <ActionCard icon={<FileText size={20} />} title="سجل اختباراتي" to="/dashboard?tab=quizzes" buttonLabel="افتح السجل" tone="emerald" />
            </div>

            {false && subjectQuizReadiness.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="mb-3 font-black text-gray-900">اختبارات حسب المادة</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {subjectQuizReadiness.map((item) => (
                    <div key={item.subject.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3"><div><div className="font-black text-gray-900">{item.subject.name}</div><div className="mt-1 text-xs font-bold text-gray-500">إجمالي الاختبارات المتاحة: {item.total}</div></div><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700">{item.total}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {false && weakSkillRecommendations.length > 0 && <div />}

            <QuizSection title="اختبارات ساهر الجاهزة" emptyMessage="لا توجد اختبارات ساهر جاهزة منشورة لك حاليًا." items={saherQuizzes} subjects={subjects} paths={paths} badgeClassName="bg-purple-100 text-purple-700" badgeLabel="ساهر" />
            <QuizSection title="اختبارات المنصة الجاهزة" emptyMessage="لا توجد اختبارات منصة إضافية منشورة حاليًا." items={regularPreparedQuizzes} subjects={subjects} paths={paths} badgeClassName="bg-gray-100 text-gray-700" badgeLabel="منصة" />
            <LockedQuizSection items={lockedPaidQuizzes} subjects={subjects} onOpenPayment={(quiz) => setLockedQuizForPayment(quiz)} />
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={!!lockedQuizForPayment}
        onClose={() => setLockedQuizForPayment(null)}
        item={lockedQuizForPayment ? (() => {
          const matchedPackage = getMatchingPackage('tests', lockedQuizForPayment.pathId, lockedQuizForPayment.subjectId);
          return matchedPackage
            ? {
                id: matchedPackage.id,
                packageId: matchedPackage.id,
                purchaseType: 'package',
                title: matchedPackage.name,
                description: `هذه الباقة تفتح الاختبارات المرتبطة بـ ${subjects.find((subject) => subject.id === lockedQuizForPayment.subjectId)?.name || 'هذه المادة'}.`,
                contentTypes: matchedPackage.contentTypes,
                pathIds: matchedPackage.pathIds,
                subjectIds: matchedPackage.subjectIds,
                includedCourseIds: matchedPackage.courseIds,
                courseIds: matchedPackage.courseIds,
                price: lockedQuizForPayment.access.price || 99,
                currency: 'ر.س',
              }
            : { id: lockedQuizForPayment.id, title: lockedQuizForPayment.title, price: lockedQuizForPayment.access.price || 99, currency: 'ر.س' };
        })() : null}
        type={lockedQuizForPayment && getMatchingPackage('tests', lockedQuizForPayment.pathId, lockedQuizForPayment.subjectId) ? 'package' : 'test'}
      />
    </div>
  );
};

const QuizSection = ({ title, emptyMessage, items, subjects, paths, badgeClassName, badgeLabel }: {
  title: string;
  emptyMessage: string;
  items: Array<{ id: string; title: string; pathId?: string; subjectId: string; questionIds: string[]; createdAt: number; dueDate?: string; access?: { type?: string } }>;
  subjects: ReturnType<typeof useStore.getState>['subjects'];
  paths: ReturnType<typeof useStore.getState>['paths'];
  badgeClassName: string;
  badgeLabel: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="font-bold text-gray-800">{title}</h3><span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClassName}`}>{badgeLabel}</span></div>
    {items.length > 0 ? (
      <div className="space-y-3">
        {items.map((quiz) => (
          <div key={quiz.id} className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-indigo-200 transition-colors">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2"><div className="font-bold text-gray-900">{quiz.title}</div><span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">{paths.find((path) => path.id === quiz.pathId)?.name || 'بدون مسار'}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${quiz.access?.type === 'paid' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{quiz.access?.type === 'paid' ? <LockKeyhole size={12} /> : <Unlock size={12} />}{quiz.access?.type === 'paid' ? 'مفتوح بالباقة' : 'مفتوح'}</span></div>
              <div className="text-sm text-gray-500">{subjects.find((subject) => subject.id === quiz.subjectId)?.name || 'بدون مادة'} - {quiz.questionIds.length} سؤال</div>
              <div className="text-xs text-gray-400 flex items-center gap-2"><Clock size={14} /><span>{quiz.dueDate ? `متاح حتى ${formatQuizDate(quiz.dueDate)}` : formatCreatedDate(quiz.createdAt)}</span></div>
            </div>
            <Link to={`/quiz/${quiz.id}`} className="bg-gray-900 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors text-center">دخول الاختبار</Link>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState eyebrow={badgeLabel} title="لا يوجد محتوى هنا الآن" description={emptyMessage} icon={<FileText size={20} />} primaryAction={{ label: 'اختبار ساهر', href: '/quiz', icon: <Target size={14} /> }} secondaryAction={{ label: 'تقريري', href: '/reports', icon: <TrendingUp size={14} /> }} tone="slate" className="rounded-2xl p-4 shadow-none" />
    )}
  </div>
);

type AttemptGroupCardProps = {
  group: QuizAttemptGroup;
  isOpen: boolean;
  onToggle: () => void;
  getAttemptResultLink: (result: QuizResult, viewMode?: 'review' | 'analysis') => string;
  getAttemptRetryLink: (result: QuizResult) => string;
  getPathName: (pathId?: string) => string;
};

const AttemptGroupCard: React.FC<AttemptGroupCardProps> = ({ group, isOpen, onToggle, getAttemptResultLink, getAttemptRetryLink, getPathName }) => {
  const latest = group.latestAttempt;
  const best = group.bestAttempt;
  const weakestSkill = [...(latest.skillsAnalysis || [])].sort((a, b) => a.mastery - b.mastery)[0];
  const pathLabel = getPathName(group.quiz?.pathId || latest.skillsAnalysis?.[0]?.pathId);
  const categoryLabel = group.category === 'mock' ? 'محاكي' : 'عادي';

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-indigo-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black text-gray-600">{categoryLabel}</span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">{pathLabel}</span></div><h3 className="mt-1 text-base font-black leading-tight text-gray-900">{group.quizTitle}</h3><div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-500"><span>{group.attempts.length} محاولة</span><span>• آخر حل {new Date(latest.date).toLocaleDateString('ar-SA')}</span></div></div>
        <div className="flex items-center gap-3"><div className="text-center"><div className="text-[10px] font-bold text-gray-500">آخر درجة</div><div className={`text-lg font-black ${latest.score >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{latest.score}%</div></div><div className="text-center border-r pr-3 border-gray-100"><div className="text-[10px] font-bold text-gray-500">أفضل درجة</div><div className="text-lg font-black text-indigo-700">{best.score}%</div></div></div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-2xl bg-gray-50 px-4 py-3"><div className="text-[11px] font-bold text-gray-500">أهم مهارة تحتاج متابعة من آخر محاولة</div><div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-sm font-black text-gray-900">{weakestSkill?.skill || 'لا يوجد تحليل مهارات لهذا الاختبار'}</span>{weakestSkill ? <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-amber-700">{weakestSkill.mastery}%</span> : null}</div></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><button type="button" onClick={onToggle} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 sm:text-sm"><FileText size={16} />{isOpen ? 'إخفاء المحاولات' : 'فتح المحاولات'}</button><Link to={getAttemptResultLink(latest)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-black text-white hover:bg-gray-800 sm:text-sm"><Eye size={16} /> آخر نتيجة</Link><Link to={getAttemptRetryLink(latest)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 sm:text-sm"><RotateCcw size={16} /> إعادة</Link></div>
      </div>
      {isOpen ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100"><div className="divide-y divide-gray-100">{group.attempts.map((attempt, index) => <div key={`${attempt.quizId}-${attempt.date}-${index}`} className="grid grid-cols-1 items-center gap-3 px-3 py-3 text-sm sm:grid-cols-12 sm:gap-2"><div className="sm:col-span-4"><div className="font-black text-gray-900">محاولة {group.attempts.length - index}</div><div className="mt-1 text-[11px] font-bold text-gray-500">{new Date(attempt.date).toLocaleString('ar-SA')}</div></div><div className={`text-center font-black sm:col-span-2 ${attempt.score >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{attempt.score}%</div><div className="text-center text-xs font-bold text-gray-500 sm:col-span-2">{attempt.timeSpent}</div><div className="flex flex-wrap gap-2 sm:col-span-4 sm:justify-center"><Link to={getAttemptResultLink(attempt)} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">تفاصيل</Link><Link to={getAttemptResultLink(attempt, 'review')} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">مراجعة</Link><Link to={getAttemptResultLink(attempt, 'analysis')} className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-black text-purple-700">تحليل</Link></div></div>)}</div></div>
      ) : null}
    </article>
  );
};

const ActionCard = ({ icon, title, to, buttonLabel, tone, disabled = false }: {
  icon: React.ReactNode;
  title: string;
  to: string;
  buttonLabel: string;
  tone: 'purple' | 'amber' | 'blue' | 'emerald' | 'rose' | 'slate';
  disabled?: boolean;
}) => {
  const toneClasses = {
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100',
  }[tone];
  return <Link to={disabled ? '#' : to} className={`flex items-center justify-between rounded-xl border p-4 transition-all shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : toneClasses}`}><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">{icon}</div><h3 className="text-sm font-black">{title}</h3></div><div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/50">{buttonLabel}</div></Link>;
};

const LockedQuizSection = ({ items, subjects, onOpenPayment }: {
  items: Array<{ id: string; title: string; subjectId: string; questionIds: string[]; createdAt: number; access: { price?: number } }>;
  subjects: ReturnType<typeof useStore.getState>['subjects'];
  onOpenPayment: (quiz: any) => void;
}) => {
  if (items.length === 0) return null;
  return <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold text-gray-800">اختبارات منصة تحتاج باقة</h3><span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">مدفوع</span></div><div className="space-y-3">{items.map((quiz) => <div key={quiz.id} className="border border-rose-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-rose-50/30"><div className="space-y-1"><div className="font-bold text-gray-900">{quiz.title}</div><div className="text-sm text-gray-500">{subjects.find((subject) => subject.id === quiz.subjectId)?.name || 'بدون مادة'} - {quiz.questionIds.length} سؤال</div><div className="text-xs text-gray-400 flex items-center gap-2"><Clock size={14} /><span>{formatCreatedDate(quiz.createdAt)}</span></div></div><button onClick={() => onOpenPayment(quiz)} className="bg-rose-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-rose-700">افتح الباقة المناسبة</button></div>)}</div></div>;
};

const StatCard = ({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: 'purple' | 'amber' | 'blue' | 'emerald' }) => {
  const colorClasses = { purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600', blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600' };
  return <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>{icon}</div><div className="text-right"><div className="font-bold text-2xl text-gray-800">{value}</div><div className="text-xs text-gray-500 font-medium">{label}</div></div></div>;
};

export default Quizzes;
