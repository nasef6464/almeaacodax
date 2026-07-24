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
import { Quiz, QuizResult } from '../types';
import { isStandaloneMockExam } from '../utils/mockExam';
import { buildQuizRouteWithContext, isSafeInternalRoute } from '../utils/quizLinks';
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
    if (user.role !== 'student' || isAttemptsView) return;
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
  }, [isAttemptsView, user.role]);

  const totalQuizzes = examResults.length;
  const passedQuizzes = examResults.filter((quiz) => quiz.score >= 50).length;
  const maxScore = Math.max(...examResults.map((quiz) => quiz.score), 0);

  const avgImprovement = useMemo(() => {
    if (examResults.length < 2) {
      return 0;
    }

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
        if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
          return false;
        }
      }

      const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
      if (hasExplicitTargets) {
        const userGroups = user.groupIds || [];
        const userTargeted = (quiz.targetUserIds || []).length === 0 || (quiz.targetUserIds || []).includes(user.id);
        const groupTargeted =
          (quiz.targetGroupIds || []).length === 0 ||
          (quiz.targetGroupIds || []).some((groupId) => userGroups.includes(groupId));

        if (!userTargeted || !groupTargeted) return false;
      }

      const access = quiz.access || { type: 'free' as const };
      if (access.type === 'free') return true;
      if (access.type === 'paid') {
        return hasScopedPackageAccess('tests', quiz.pathId, quiz.subjectId) || checkAccess(quiz.id, true);
      }
      if (access.type === 'private') {
        const userGroups = user.groupIds || [];
        return (access.allowedGroupIds || []).length === 0 || !!access.allowedGroupIds?.some((groupId) => userGroups.includes(groupId));
      }
      if (access.type === 'course_only') {
        return hasScopedPackageAccess('courses', quiz.pathId, quiz.subjectId);
      }

      return false;
    },
    [canSeeHiddenPaths, checkAccess, hasScopedPackageAccess, quizzes, user.groupIds, user.id, visiblePathIds],
  );

  const availablePreparedQuizzes = useMemo(
    () =>
      quizzes
        .filter((quiz) => !isStandaloneMockExam(quiz))
        .filter((quiz) => canAccessQuiz(quiz))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [canAccessQuiz, quizzes],
  );
  const getPathName = (pathId?: string) => paths.find((path) => path.id === pathId)?.name || 'بدون مسار';
  const matchesActivePath = (pathId?: string) => activePathFilter === 'all' || pathId === activePathFilter;
  const pathFilteredPreparedQuizzes = useMemo(
    () => availablePreparedQuizzes.filter((quiz) => matchesActivePath(quiz.pathId)),
    [activePathFilter, availablePreparedQuizzes],
  );

  const quizLookup = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes]);
  const visiblePathOptions = useMemo(
    () => paths.filter((path) => canSeeHiddenPaths || path.isActive !== false),
    [canSeeHiddenPaths, paths],
  );

  const attemptGroups = useMemo<QuizAttemptGroup[]>(() => {
    const grouped = new Map<string, QuizAttemptGroup>();

    examResults.forEach((result) => {
      const quiz = quizLookup.get(result.quizId);
      const category: AttemptCategory = result.source === 'mock-exam' || (quiz && isStandaloneMockExam(quiz)) ? 'mock' : 'regular';
      const key = result.quizId || result.quizTitle || result.date;
      const existing = grouped.get(key);

      if (existing) {
        existing.attempts.push(result);
      } else {
        grouped.set(key, {
          key,
          quizId: result.quizId,
          quizTitle: result.quizTitle || quiz?.title || 'اختبار بدون عنوان',
          category,
          quiz,
          attempts: [result],
          latestAttempt: result,
          bestAttempt: result,
        });
      }
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

  const attemptGroupsByCategory = useMemo(
    () => ({
      regular: attemptGroups.filter((group) => group.category === 'regular'),
      mock: attemptGroups.filter((group) => group.category === 'mock'),
    }),
    [attemptGroups],
  );

  const activeAttemptGroups = attemptGroupsByCategory[activeAttemptCategory];
  const activeAttemptSummary = useMemo(() => {
    const totalAttempts = activeAttemptGroups.reduce((sum, group) => sum + group.attempts.length, 0);
    const needsReview = activeAttemptGroups.filter((group) => group.latestAttempt.score < 75).length;
    const good = activeAttemptGroups.filter((group) => group.latestAttempt.score >= 75).length;
    const averageLatest = activeAttemptGroups.length
      ? Math.round(activeAttemptGroups.reduce((sum, group) => sum + group.latestAttempt.score, 0) / activeAttemptGroups.length)
      : 0;

    return {
      totalAttempts,
      needsReview,
      good,
      averageLatest,
    };
  }, [activeAttemptGroups]);

  const attemptTitleFilters = useMemo(() => {
    const titles = Array.from(new Set(activeAttemptGroups.map((group) => group.quizTitle).filter(Boolean)));
    return ['الكل', ...titles];
  }, [activeAttemptGroups]);

  const filteredAttemptGroups =
    activeFilter === 'all' || activeFilter === 'الكل'
      ? activeAttemptGroups
      : activeAttemptGroups.filter((group) => group.quizTitle.includes(activeFilter));

  const visibleAttemptGroups = filteredAttemptGroups.filter((group) =>
    matchesActivePath(group.quiz?.pathId || group.latestAttempt.skillsAnalysis?.[0]?.pathId) &&
    (
      activeAttemptScoreFilter === 'all' ||
      (activeAttemptScoreFilter === 'needs-review' && group.latestAttempt.score < 75) ||
      (activeAttemptScoreFilter === 'good' && group.latestAttempt.score >= 75)
    )
  );

  useEffect(() => {
    if (isAttemptsView) {
      setActiveFilter('all');
      setActiveAttemptScoreFilter('all');
      setOpenAttemptGroupKey(null);
    }
  }, [activeAttemptCategory, isAttemptsView]);

  const directedQuizzes = useMemo(
    () =>
      pathFilteredPreparedQuizzes.filter((quiz) => {
        const mode = quiz.mode || 'regular';
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return mode === 'central' || hasExplicitTargets;
      }),
    [pathFilteredPreparedQuizzes],
  );

  const saherQuizzes = useMemo(
    () =>
      pathFilteredPreparedQuizzes.filter((quiz) => {
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return (quiz.mode || 'regular') === 'saher' && !hasExplicitTargets;
      }),
    [pathFilteredPreparedQuizzes],
  );

  const centralQuizzes = useMemo(
    () => pathFilteredPreparedQuizzes.filter((quiz) => (quiz.mode || 'regular') === 'central'),
    [pathFilteredPreparedQuizzes],
  );

  const guidedSaherQuizzes = useMemo(
    () =>
      pathFilteredPreparedQuizzes.filter((quiz) => {
        const mode = quiz.mode || 'regular';
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return mode === 'saher' || mode === 'central' || hasExplicitTargets;
      }),
    [pathFilteredPreparedQuizzes],
  );

  const regularPreparedQuizzes = useMemo(
    () =>
      pathFilteredPreparedQuizzes.filter((quiz) => {
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return (quiz.mode || 'regular') === 'regular' && !hasExplicitTargets;
      }),
    [pathFilteredPreparedQuizzes],
  );

  const lockedPaidQuizzes = useMemo(
    () =>
      quizzes
        .filter((quiz) => {
          if (isStandaloneMockExam(quiz)) return false;
          if (!quiz.isPublished || (quiz.type ?? 'quiz') !== 'quiz') return false;
          if (quiz.showOnPlatform === false) return false;
          if (quiz.approvalStatus && quiz.approvalStatus !== 'approved' && !canSeeHiddenPaths) return false;
          if (!canSeeHiddenPaths && quiz.pathId && !visiblePathIds.has(quiz.pathId)) return false;
          if (quiz.access?.type !== 'paid') return false;
          return !canAccessQuiz(quiz);
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 4),
    [canAccessQuiz, canSeeHiddenPaths, quizzes, visiblePathIds],
  );

  const weakSkillRecommendations = useMemo(() => {
    const weakSkillsMap = new Map<
      string,
      {
        key: string;
        skillId?: string;
        pathId?: string;
        subjectId?: string;
        sectionId?: string;
        section?: string;
        skill: string;
        masterySum: number;
        attempts: number;
      }
    >();

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
        const relatedQuizzes = pathFilteredPreparedQuizzes
          .filter((quiz) => {
            const directSkillMatch = !!item.skillId && (quiz.skillIds || []).includes(item.skillId);
            const subjectMatch = !!item.subjectId && quiz.subjectId === item.subjectId;
            const sectionMatch = !item.sectionId || quiz.sectionId === item.sectionId;

            return directSkillMatch || (subjectMatch && sectionMatch);
          })
          .sort((a, b) => {
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
    const allSkills = examResults.flatMap((result) =>
      (result.skillsAnalysis || []).map((skill) => ({
        ...skill,
        quizTitle: result.quizTitle,
        quizId: result.quizId,
      })),
    );

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
            title: 'لديك اختبار موجه جاهز',
            description: 'ابدأ الاختبار الموجه أولًا لأنه من الإدارة أو المشرف، وبعده ستظهر النتيجة في اختباراتي.',
            primaryLabel: 'ابدأ الاختبار',
            primaryHref: buildQuizRouteWithContext(directedQuizzes[0].id, { returnTo: '/dashboard?tab=quizzes' }),
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
    () =>
      subjects
        .map((subject) => {
          const subjectQuizzes = pathFilteredPreparedQuizzes.filter((quiz) => quiz.subjectId === subject.id);
          const directedCount = directedQuizzes.filter((quiz) => quiz.subjectId === subject.id).length;
          const saherCount = saherQuizzes.filter((quiz) => quiz.subjectId === subject.id).length;
          return {
            subject,
            total: subjectQuizzes.length,
            directedCount,
            saherCount,
          };
        })
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 6),
    [pathFilteredPreparedQuizzes, directedQuizzes, saherQuizzes, subjects],
  );

  if (isAttemptsView && totalQuizzes === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-16">
        <header className="flex flex-col gap-2 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">اختباراتي</span>
            <Link to="/dashboard?tab=saher" className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50">
              مركز الاختبارات
            </Link>
          </div>
          <h1 className="text-xl font-black leading-tight text-gray-900">لا توجد محاولات بعد</h1>
          <p className="text-sm font-bold leading-7 text-gray-500">
            بعد أول اختبار ستظهر هنا محاولاتك ومراجعة الحلول والتقرير المختصر.
          </p>
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
        <div className="hidden">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FileText size={22} />
          </div>
          <h2 className="mt-4 text-lg font-black text-gray-900">ابدأ من اختبار واحد</h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-7 text-gray-500">
            اختَر اختبارًا جاهزًا أو أنشئ اختبار ساهر، وبعد الحل ارجع هنا للمراجعة.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link to="/dashboard?tab=saher" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 sm:text-sm">
              <Zap size={15} />
              مركز الاختبارات
            </Link>
            <Link to="/quiz" className="inline-flex items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 sm:text-sm">
              <Target size={15} />
              اختبار ساهر
            </Link>
            <Link to="/reports" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 sm:text-sm">
              <TrendingUp size={15} />
              تقريري
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isAttemptsView) {
    return (
      <div className="space-y-5 pb-20">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">أنت الآن في: اختباراتي</span>
            <Link to="/dashboard?tab=saher" className="rounded-full bg-white px-3 py-1.5 text-gray-700 border border-gray-200 hover:bg-gray-50">
              الانتقال إلى مركز الاختبارات
            </Link>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">اختباراتي</h1>
              <p className="mt-1 text-sm text-gray-500">كل اختبار يظهر مرة واحدة، والمحاولات داخله عند الحاجة.</p>
            </div>
            {weakestTrackedSkill ? (
              <Link
                to="/dashboard?tab=reports"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100"
              >
                <Target size={16} />
                أولوية المراجعة: {weakestTrackedSkill.skill}
              </Link>
            ) : null}
          </div>
        </header>

        <StudentNextActionStrip {...quizCenterNextAction} />

        <div className="hidden">
          <StatCard icon={<Sparkles size={24} />} value={`${maxScore}%`} label="أعلى درجة" color="purple" />
          <StatCard icon={<TrendingUp size={24} />} value={`${avgImprovement}%`} label="التحسن" color="amber" />
          <StatCard icon={<CheckCircle size={24} />} value={passedQuizzes} label="اختبارات ناجحة" color="blue" />
          <StatCard icon={<FileText size={24} />} value={totalQuizzes} label="محاولات مسجلة" color="emerald" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-secondary-500 text-white p-3 text-center font-bold text-base">اختباراتي</div>

          <div className="border-b border-gray-100 bg-gray-50/70 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={activeAttemptCategory}
                onChange={(e) => setActiveAttemptCategory(e.target.value as AttemptCategory)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 focus:border-indigo-400 focus:outline-none"
              >
                <option value="regular">اختبارات عادية ({attemptGroupsByCategory.regular.length})</option>
                <option value="mock">اختبارات محاكية ({attemptGroupsByCategory.mock.length})</option>
              </select>

              {attemptTitleFilters.length > 2 ? (
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 focus:border-indigo-400 focus:outline-none"
                >
                  {attemptTitleFilters.map((filter) => (
                    <option key={filter} value={filter === 'الكل' ? 'all' : filter}>{filter}</option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={activePathFilter}
                onChange={(event) => setActivePathFilter(event.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 focus:border-amber-400 focus:outline-none"
              >
                <option value="all">كل المسارات</option>
                {visiblePathOptions.map((path) => (
                  <option key={path.id} value={path.id}>{path.name}</option>
                ))}
              </select>

              <select
                value={activeAttemptScoreFilter}
                onChange={(e) => setActiveAttemptScoreFilter(e.target.value as AttemptScoreFilter)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 focus:border-emerald-400 focus:outline-none"
              >
                <option value="all">كل النتائج ({activeAttemptGroups.length})</option>
                <option value="needs-review">يحتاج مراجعة ({activeAttemptSummary.needsReview})</option>
                <option value="good">مطمئن ({activeAttemptSummary.good})</option>
              </select>
            </div>

            <div className="hidden">
              <MiniAttemptStat label="اختبارات" value={activeAttemptGroups.length} />
              <MiniAttemptStat label="محاولات" value={activeAttemptSummary.totalAttempts} />
              <MiniAttemptStat label="متوسط آخر حل" value={`${activeAttemptSummary.averageLatest}%`} />
              <MiniAttemptStat label="ظاهر الآن" value={visibleAttemptGroups.length} />
            </div>
          </div>

          {visibleAttemptGroups.length > 0 ? (
            <div className="space-y-3 p-4">
              {visibleAttemptGroups.map((group) => (
                <AttemptGroupCard
                  key={group.key}
                  group={group}
                  isOpen={openAttemptGroupKey === group.key}
                  onToggle={() => setOpenAttemptGroupKey((current) => (current === group.key ? null : group.key))}
                  getAttemptResultLink={getAttemptResultLink}
                  getAttemptRetryLink={getAttemptRetryLink}
                  getPathName={getPathName}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500">
              لا توجد محاولات هنا بعد.
              <div className="mt-5">
                <Link to="/dashboard?tab=saher" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600">
                  <Zap size={16} />
                  ابدأ اختبار ساهر
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowRight />
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black mb-2">
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">أنت الآن في: مركز الاختبارات</span>
            <Link to="/dashboard?tab=quizzes" className="rounded-full bg-white px-3 py-1.5 text-gray-700 border border-gray-200 hover:bg-gray-50">
              الانتقال إلى اختباراتي
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">مركز الاختبارات</h1>
          <p className="mt-1 text-sm text-gray-500">ابدأ اختبارًا جديدًا، أو افتح اختبارًا موجهًا، والنتائج تجدها في اختباراتي.</p>
        </div>
      </header>

      <StudentNextActionStrip {...quizCenterNextAction} />

      {!isAttemptsView && user.role === 'student' ? (
        <section data-testid="student-assigned-barcode-tests" className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-gray-900">اختبارات مباشرة موجهة لك</h2>
              <p className="mt-1 text-xs font-bold text-gray-500">تظهر هنا الاختبارات التي أرسلها المشرف أو المعلم لمجموعتك أو لحسابك.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">{assignedBarcodeTests.length}</span>
          </div>
          {assignedBarcodeTestsLoading ? (
            <div className="rounded-xl border border-dashed border-indigo-200 bg-white p-4 text-center text-xs font-black text-indigo-700">جارٍ تحميل الاختبارات الموجهة...</div>
          ) : assignedBarcodeTests.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {assignedBarcodeTests.map((test) => (
                <a
                  key={test.id}
                  href={test.publicUrl}
                  className="rounded-xl border border-white bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-gray-900">{test.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-gray-500">{test.description || 'اختبار مباشر من المشرف أو المعلم.'}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">{test.testKind === 'mock' ? 'محاكي' : 'مباشر'}</span>
                  </div>
                  <div className="mt-3 text-xs font-black text-indigo-700">{test.questionCount || 0} سؤال {test.settings?.timeLimit ? `• ${test.settings.timeLimit} دقيقة` : ''} ← ابدأ</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-indigo-200 bg-white p-4 text-center text-xs font-bold text-gray-500">لا توجد اختبارات مباشرة موجهة لك الآن.</div>
          )}
        </section>
      ) : null}

      <div className="hidden">
        <StatCard icon={<Zap size={24} />} value={saherQuizzes.length} label="ساهر جاهز" color="purple" />
        <StatCard icon={<Target size={24} />} value={directedQuizzes.length} label="اختبارات موجهة" color="amber" />
        <StatCard icon={<CheckCircle size={24} />} value={pathFilteredPreparedQuizzes.length} label="متاح الآن" color="blue" />
        <StatCard icon={<FileText size={24} />} value={lockedPaidQuizzes.length} label="يتطلب باقة" color="emerald" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-black text-gray-800">فلترة الاختبارات حسب المسار</label>
        <select
          value={activePathFilter}
          onChange={(event) => setActivePathFilter(event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 focus:border-amber-400 focus:outline-none"
        >
          <option value="all">كل المسارات</option>
          {visiblePathOptions.map((path) => (
            <option key={path.id} value={path.id}>{path.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-secondary-500 text-white p-3 text-center font-bold text-base">مركز الاختبارات</div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ActionCard
                icon={<Zap size={20} />}
                title="اختبار ساهر الذاتي"
                to="/quiz"
                buttonLabel="ابدأ الآن"
                tone="purple"
              />
              <ActionCard
                icon={<Target size={20} />}
                title="اختبارات موجهة لك"
                to={directedQuizzes[0] ? `/quiz/${directedQuizzes[0].id}` : '/quiz'}
                buttonLabel={directedQuizzes.length > 0 ? 'افتح الاختبارات' : 'لا يوجد حاليًا'}
                tone="amber"
                disabled={directedQuizzes.length === 0}
              />
              <ActionCard
                icon={<FileText size={20} />}
                title="اختباراتي السابقة"
                to="/dashboard?tab=quizzes"
                buttonLabel="افتح السجل"
                tone="purple"
              />
            </div>

            {subjectQuizReadiness.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <h3 className="mb-3 font-black text-gray-900">اختبارات حسب المادة</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {subjectQuizReadiness.map((item) => (
                    <div key={item.subject.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-gray-900">{item.subject.name}</div>
                          <div className="mt-1 text-xs font-bold text-gray-500">إجمالي الاختبارات المتاحة: {item.total}</div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700">{item.total}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                        <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">موجه: {item.directedCount}</div>
                        <div className="rounded-xl bg-purple-50 px-3 py-2 text-purple-700">ساهر: {item.saherCount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {weakSkillRecommendations.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">اختبارات مقترحة حسب المهارات الضعيفة</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      هذه الترشيحات مبنية على نتائجك السابقة حتى تعالج المهارات التي تحتاج دعمًا أسرع.
                    </p>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-11 h-11 rounded-xl bg-white text-amber-600">
                    <Target size={22} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {weakSkillRecommendations.map((item) => (
                    <div key={item.key} className="rounded-xl border border-white/80 bg-white/80 p-4 space-y-3">
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900">{item.skill}</div>
                        <div className="text-xs text-gray-500">
                          {item.subjectName}
                          {item.section ? ` - ${item.section}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">الإتقان الحالي</span>
                        <span className={`font-bold ${item.mastery < 50 ? 'text-red-500' : 'text-amber-600'}`}>{item.mastery}%</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">اختبارات مناسبة</span>
                        <span className="font-bold text-gray-900">{item.relatedCount}</span>
                      </div>

                      {(item.recommendedLesson || item.recommendedResource) ? (
                        <div className="text-xs text-gray-600 space-y-1">
                          {item.recommendedLesson ? <div>شرح مقترح: <span className="font-bold">{item.recommendedLesson.title}</span></div> : null}
                          {item.recommendedResource ? <div>ملف داعم: <span className="font-bold">{item.recommendedResource.title}</span></div> : null}
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Link
                          to={item.recommendedQuiz ? `/quiz/${item.recommendedQuiz.id}` : '/quiz'}
                          className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors text-center block w-full"
                        >
                          {item.recommendedQuiz ? 'ابدأ الاختبار المقترح' : 'أنشئ اختبار ساهر لهذه المهارة'}
                        </Link>
                        {item.recommendedLesson ? (
                          <Link
                            to={
                              item.subjectId && (item.recommendedLesson.pathId || item.pathId)
                                ? `/category/${item.recommendedLesson.pathId || item.pathId}?subject=${item.subjectId}&tab=skills`
                                : '/courses'
                            }
                            className="bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors text-center block w-full"
                          >
                            راجع الشرح أولًا
                          </Link>
                        ) : null}
                        {item.recommendedResource?.url ? (
                          <a
                            href={item.recommendedResource.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-100 transition-colors text-center block w-full"
                          >
                            افتح الملف الداعم
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <QuizSection
              title="اختبارات موجهة لك"
              emptyMessage="لا توجد اختبارات موجهة لحسابك حاليًا."
              items={directedQuizzes}
              subjects={subjects}
              paths={paths}
              badgeClassName="bg-amber-100 text-amber-700"
              badgeLabel="موجّه"
            />

            <QuizSection
              title="اختبارات ساهر الجاهزة"
              emptyMessage="لا توجد اختبارات ساهر جاهزة منشورة لك حاليًا."
              items={saherQuizzes}
              subjects={subjects}
              paths={paths}
              badgeClassName="bg-purple-100 text-purple-700"
              badgeLabel="ساهر"
            />

            <QuizSection
              title="اختبارات جاهزة أخرى"
              emptyMessage="لا توجد اختبارات جاهزة إضافية منشورة حاليًا."
              items={regularPreparedQuizzes}
              subjects={subjects}
              paths={paths}
              badgeClassName="bg-gray-100 text-gray-700"
              badgeLabel="جاهز"
            />

            <LockedQuizSection
              items={lockedPaidQuizzes}
              subjects={subjects}
              onOpenPayment={(quiz) => setLockedQuizForPayment(quiz)}
            />
          </div>
        </div>

        <div className="hidden">
          <div className="bg-gray-900 text-white p-4 text-center font-bold text-lg">ملخص سريع</div>
          <div className="p-6 space-y-4">
            <SummaryRow label="اختبارات جاهزة متاحة" value={pathFilteredPreparedQuizzes.length} />
            <SummaryRow label="اختبارات موجهة لك" value={directedQuizzes.length} />
            <SummaryRow label="اختبارات ساهر" value={saherQuizzes.length} />
            <SummaryRow label="اختبارات مركزية" value={centralQuizzes.length} />
            <SummaryRow label="اختبارات تحتاج باقة" value={lockedPaidQuizzes.length} />
            <SummaryRow label="سجل النتائج" value={totalQuizzes > 0 ? `${totalQuizzes} محاولة في اختباراتي` : 'افتح اختباراتي بعد أول حل'} />
          </div>
        </div>
      </div>

      <div className="hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">سجل المحاولات في مكان واحد</h3>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              هذه الصفحة لبدء اختبارات جديدة أو فتح اختبارات موجهة. أما نتائجك السابقة، مراجعة الإجابات، وتحليل المهارات فتجدها من تبويب اختباراتي.
            </p>
          </div>
          <Link
            to="/dashboard?tab=quizzes"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800"
          >
            <FileText size={16} />
            افتح اختباراتي
          </Link>
        </div>
      </div>

      <PaymentModal
        isOpen={!!lockedQuizForPayment}
        onClose={() => setLockedQuizForPayment(null)}
        item={
          lockedQuizForPayment
            ? (() => {
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
                  : {
                      id: lockedQuizForPayment.id,
                      title: lockedQuizForPayment.title,
                      price: lockedQuizForPayment.access.price || 99,
                      currency: 'ر.س',
                    };
              })()
            : null
        }
        type={lockedQuizForPayment && getMatchingPackage('tests', lockedQuizForPayment.pathId, lockedQuizForPayment.subjectId) ? 'package' : 'test'}
      />
    </div>
  );
};

const QuizSection = ({
  title,
  emptyMessage,
  items,
  subjects,
  paths,
  badgeClassName,
  badgeLabel,
}: {
  title: string;
  emptyMessage: string;
  items: Array<{
    id: string;
    title: string;
    pathId?: string;
    subjectId: string;
    questionIds: string[];
    createdAt: number;
    dueDate?: string;
    access?: { type?: string };
  }>;
  subjects: ReturnType<typeof useStore.getState>['subjects'];
  paths: ReturnType<typeof useStore.getState>['paths'];
  badgeClassName: string;
  badgeLabel: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-gray-800">{title}</h3>
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClassName}`}>{badgeLabel}</span>
    </div>

    {items.length > 0 ? (
      <div className="space-y-3">
        {items.map((quiz) => (
          <div
            key={quiz.id}
            className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-indigo-200 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-bold text-gray-900">{quiz.title}</div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">
                  {paths.find((path) => path.id === quiz.pathId)?.name || 'بدون مسار'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
                    quiz.access?.type === 'paid'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {quiz.access?.type === 'paid' ? <LockKeyhole size={12} /> : <Unlock size={12} />}
                  {quiz.access?.type === 'paid' ? 'مفتوح بالباقة' : 'مفتوح'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {subjects.find((subject) => subject.id === quiz.subjectId)?.name || 'بدون مادة'} - {quiz.questionIds.length} سؤال
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <Clock size={14} />
                <span>{quiz.dueDate ? `متاح حتى ${formatQuizDate(quiz.dueDate)}` : formatCreatedDate(quiz.createdAt)}</span>
              </div>
            </div>
            <Link
              to={`/quiz/${quiz.id}`}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors text-center"
            >
              دخول الاختبار
            </Link>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState
        eyebrow={badgeLabel}
        title="لا يوجد محتوى هنا الآن"
        description={emptyMessage}
        icon={<FileText size={20} />}
        primaryAction={{ label: 'اختبار ساهر', href: '/quiz', icon: <Target size={14} /> }}
        secondaryAction={{ label: 'تقريري', href: '/reports', icon: <TrendingUp size={14} /> }}
        tone="slate"
        className="rounded-2xl p-4 shadow-none"
      />
    )}
  </div>
);

const AttemptCategoryButton = ({
  active,
  label,
  description,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  count: number;
  onClick: () => void;
}) => {
  const isMock = label.includes('محاكية');
  const activeClass = isMock
    ? 'border-amber-300 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-100 ring-2 ring-amber-100'
    : 'border-indigo-300 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-100';
  const idleClass = isMock
    ? 'border-amber-100 bg-amber-50/60 text-amber-800 hover:border-amber-200 hover:bg-amber-100'
    : 'border-indigo-100 bg-indigo-50/70 text-indigo-800 hover:border-indigo-200 hover:bg-indigo-100';
  const countClass = isMock
    ? active ? 'bg-white/20 text-white ring-1 ring-white/40' : 'bg-white text-amber-800'
    : active ? 'bg-white/20 text-white ring-1 ring-white/40' : 'bg-white text-indigo-800';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border px-4 py-3 text-right transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active ? activeClass : idleClass
      }`}
    >
      {count > 0 && !active ? (
        <span className={`absolute left-3 top-3 h-2 w-2 rounded-full ${isMock ? 'bg-amber-500' : 'bg-indigo-500'} animate-pulse`} />
      ) : null}
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className={`mt-1 block text-[11px] font-bold ${active ? 'text-white/80' : 'text-gray-500'}`}>{description}</span>
      </span>
      <span className={`rounded-2xl px-3 py-1.5 text-base font-black ${countClass}`}>
        {count}
      </span>
    </button>
  );
};

const AttemptScoreFilterButton = ({
  active,
  label,
  value,
  tone = 'indigo',
  onClick,
}: {
  active: boolean;
  label: string;
  value: number;
  tone?: 'indigo' | 'rose' | 'emerald';
  onClick: () => void;
}) => {
  const toneClass = {
    indigo: active ? 'border-indigo-200 bg-indigo-600 text-white' : 'border-indigo-100 bg-white text-indigo-700 hover:bg-indigo-50',
    rose: active ? 'border-rose-200 bg-rose-600 text-white' : 'border-rose-100 bg-white text-rose-700 hover:bg-rose-50',
    emerald: active ? 'border-emerald-200 bg-emerald-600 text-white' : 'border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm font-black transition-all ${toneClass}`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs ${active ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-700'}`}>
        {value}
      </span>
    </button>
  );
};

const MiniAttemptStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-gray-100 bg-white px-3 py-2">
    <div className="text-[11px] font-bold text-gray-500">{label}</div>
    <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
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

const AttemptGroupCard: React.FC<AttemptGroupCardProps> = ({
  group,
  isOpen,
  onToggle,
  getAttemptResultLink,
  getAttemptRetryLink,
  getPathName,
}) => {
  const latest = group.latestAttempt;
  const best = group.bestAttempt;
  const weakestSkill = [...(latest.skillsAnalysis || [])].sort((a, b) => a.mastery - b.mastery)[0];
  const isPassed = best.score >= 50;
  const pathLabel = getPathName(group.quiz?.pathId || latest.skillsAnalysis?.[0]?.pathId);
  const categoryLabel = group.category === 'mock' ? 'محاكي' : 'عادي';

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-indigo-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black text-gray-600">{categoryLabel}</span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">{pathLabel}</span>
          </div>
          <h3 className="mt-1 text-base font-black leading-tight text-gray-900">{group.quizTitle}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-gray-500">
            <span>{group.attempts.length} محاولة</span>
            <span>• آخر حل {new Date(latest.date).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-[10px] font-bold text-gray-500">آخر درجة</div>
            <div className={`text-lg font-black ${latest.score >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{latest.score}%</div>
          </div>
          <div className="text-center border-r pr-3 border-gray-100">
            <div className="text-[10px] font-bold text-gray-500">أفضل درجة</div>
            <div className="text-lg font-black text-indigo-700">{best.score}%</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-2xl bg-gray-50 px-4 py-3">
          <div className="text-[11px] font-bold text-gray-500">أهم مهارة تحتاج متابعة من آخر محاولة</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-gray-900">{weakestSkill?.skill || 'لا يوجد تحليل مهارات لهذا الاختبار'}</span>
            {weakestSkill ? <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-amber-700">{weakestSkill.mastery}%</span> : null}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 sm:text-sm"
          >
            <FileText size={16} />
            {isOpen ? 'إخفاء المحاولات' : 'فتح المحاولات'}
          </button>
          <Link
            to={getAttemptResultLink(latest)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-black text-white hover:bg-gray-800 sm:text-sm"
          >
            <Eye size={16} />
            آخر نتيجة
          </Link>
          <Link
            to={getAttemptRetryLink(latest)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100 sm:text-sm"
          >
            <RotateCcw size={16} />
            إعادة
          </Link>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
          <div className="hidden grid-cols-12 bg-gray-50 px-3 py-2 text-[11px] font-black text-gray-500 sm:grid">
            <div className="col-span-4">المحاولة</div>
            <div className="col-span-2 text-center">الدرجة</div>
            <div className="col-span-2 text-center">الوقت</div>
            <div className="col-span-4 text-center">الإجراءات</div>
          </div>
          <div className="divide-y divide-gray-100">
            {group.attempts.map((attempt, index) => (
              <div key={`${attempt.quizId}-${attempt.date}-${index}`} className="grid grid-cols-1 items-center gap-3 px-3 py-3 text-sm sm:grid-cols-12 sm:gap-2">
                <div className="sm:col-span-4">
                  <div className="font-black text-gray-900">محاولة {group.attempts.length - index}</div>
                  <div className="mt-1 text-[11px] font-bold text-gray-500">{new Date(attempt.date).toLocaleString('ar-SA')}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <div className={`rounded-xl bg-gray-50 px-3 py-2 text-center font-black sm:col-span-2 sm:bg-transparent sm:p-0 ${attempt.score >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{attempt.score}%</div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-center text-xs font-bold text-gray-500 sm:col-span-2 sm:bg-transparent sm:p-0">{attempt.timeSpent}</div>
                </div>
                <div className="flex flex-wrap justify-stretch gap-2 sm:col-span-4 sm:justify-center">
                  <Link to={getAttemptResultLink(attempt)} className="flex-1 rounded-lg bg-indigo-50 px-3 py-2 text-center text-xs font-black text-indigo-700 hover:bg-indigo-100 sm:flex-none">
                    تفاصيل
                  </Link>
                  <Link to={getAttemptResultLink(attempt, 'review')} className="flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700 hover:bg-emerald-100 sm:flex-none">
                    مراجعة
                  </Link>
                  <Link to={getAttemptResultLink(attempt, 'analysis')} className="flex-1 rounded-lg bg-purple-50 px-3 py-2 text-center text-xs font-black text-purple-700 hover:bg-purple-100 sm:flex-none">
                    تحليل
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
};

const ActionCard = ({
  icon,
  title,
  to,
  buttonLabel,
  tone,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  to: string;
  buttonLabel: string;
  tone: 'purple' | 'amber';
  disabled?: boolean;
}) => {
  const toneClasses =
    tone === 'purple'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
      : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100';

  return (
    <Link to={disabled ? '#' : to} className={`flex items-center justify-between rounded-xl border p-4 transition-all shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : toneClasses}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">{icon}</div>
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/50">{buttonLabel}</div>
    </Link>
  );
};

const LockedQuizSection = ({
  items,
  subjects,
  onOpenPayment,
}: {
  items: Array<{
    id: string;
    title: string;
    subjectId: string;
    questionIds: string[];
    createdAt: number;
    access: { price?: number };
  }>;
  subjects: ReturnType<typeof useStore.getState>['subjects'];
  onOpenPayment: (quiz: any) => void;
}) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">اختبارات مقفولة تحتاج باقة</h3>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">مدفوع</span>
      </div>

      <div className="space-y-3">
        {items.map((quiz) => (
          <div
            key={quiz.id}
            className="border border-rose-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-rose-50/30"
          >
            <div className="space-y-1">
              <div className="font-bold text-gray-900">{quiz.title}</div>
              <div className="text-sm text-gray-500">
                {subjects.find((subject) => subject.id === quiz.subjectId)?.name || 'بدون مادة'} - {quiz.questionIds.length} سؤال
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <Clock size={14} />
                <span>{formatCreatedDate(quiz.createdAt)}</span>
              </div>
            </div>
            <button
              onClick={() => onOpenPayment(quiz)}
              className="bg-rose-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-rose-700 transition-colors text-center"
            >
              افتح الباقة المناسبة
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="font-bold text-gray-900">{value}</span>
  </div>
);

const StatCard = ({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: 'purple' | 'amber' | 'blue' | 'emerald';
}) => {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`}>
        {icon}
      </div>
      <div className="text-right sm:text-left">
        <div className="font-bold text-2xl text-gray-800 dir-ltr">{value}</div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
      </div>
    </div>
  );
};

export default Quizzes;
