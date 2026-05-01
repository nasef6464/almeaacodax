import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
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
import { QuizDetailsModal } from '../components/QuizDetailsModal';
import { useStore } from '../store/useStore';
import { QuizResult } from '../types';

interface QuizzesProps {
  view?: 'catalog' | 'attempts';
}

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

const toQuizHistoryItem = (result: QuizResult) => ({
  id: result.quizId || result.date,
  title: result.quizTitle,
  questionCount: result.totalQuestions,
  courseName: result.quizTitle,
  passMark: 50,
  difficulty: 'Medium' as const,
  firstAttempt: {
    score: result.score,
    time: result.timeSpent,
    date: result.date,
  },
  bestAttempt: {
    score: result.score,
    time: result.timeSpent,
    date: result.date,
  },
  improvement: 0,
  status: result.score >= 50 ? 'passed' as const : 'failed' as const,
  skillsAnalysis: result.skillsAnalysis || [],
});

const Quizzes: React.FC<QuizzesProps> = ({ view = 'catalog' }) => {
  const { examResults, quizzes, subjects, paths, lessons, libraryItems, user, checkAccess, hasScopedPackageAccess, getMatchingPackage } = useStore();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lockedQuizForPayment, setLockedQuizForPayment] = useState<(typeof quizzes)[number] | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<(typeof examResults)[number] | null>(null);
  const isAttemptsView = view === 'attempts';

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

      if (quiz.access.type === 'free') return true;
      if (quiz.access.type === 'paid') {
        return hasScopedPackageAccess('tests', quiz.pathId, quiz.subjectId) || checkAccess(quiz.id, true);
      }
      if (quiz.access.type === 'private') {
        const userGroups = user.groupIds || [];
        return (quiz.access.allowedGroupIds || []).length === 0 || !!quiz.access.allowedGroupIds?.some((groupId) => userGroups.includes(groupId));
      }
      if (quiz.access.type === 'course_only') {
        return hasScopedPackageAccess('courses', quiz.pathId, quiz.subjectId);
      }

      return false;
    },
    [canSeeHiddenPaths, checkAccess, hasScopedPackageAccess, quizzes, user.groupIds, user.id, visiblePathIds],
  );

  const availablePreparedQuizzes = useMemo(
    () =>
      quizzes
        .filter((quiz) => canAccessQuiz(quiz))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [canAccessQuiz, quizzes],
  );

  const directedQuizzes = useMemo(
    () =>
      availablePreparedQuizzes.filter((quiz) => {
        const mode = quiz.mode || 'regular';
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return mode === 'central' || hasExplicitTargets;
      }),
    [availablePreparedQuizzes],
  );

  const saherQuizzes = useMemo(
    () =>
      availablePreparedQuizzes.filter((quiz) => {
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return (quiz.mode || 'regular') === 'saher' && !hasExplicitTargets;
      }),
    [availablePreparedQuizzes],
  );

  const centralQuizzes = useMemo(
    () => availablePreparedQuizzes.filter((quiz) => (quiz.mode || 'regular') === 'central'),
    [availablePreparedQuizzes],
  );

  const guidedSaherQuizzes = useMemo(
    () =>
      availablePreparedQuizzes.filter((quiz) => {
        const mode = quiz.mode || 'regular';
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return mode === 'saher' || mode === 'central' || hasExplicitTargets;
      }),
    [availablePreparedQuizzes],
  );

  const regularPreparedQuizzes = useMemo(
    () =>
      availablePreparedQuizzes.filter((quiz) => {
        const hasExplicitTargets = (quiz.targetUserIds || []).length > 0 || (quiz.targetGroupIds || []).length > 0;
        return (quiz.mode || 'regular') === 'regular' && !hasExplicitTargets;
      }),
    [availablePreparedQuizzes],
  );

  const lockedPaidQuizzes = useMemo(
    () =>
      quizzes
        .filter((quiz) => {
          if (!quiz.isPublished || (quiz.type ?? 'quiz') !== 'quiz') return false;
          if (quiz.showOnPlatform === false) return false;
          if (quiz.approvalStatus && quiz.approvalStatus !== 'approved' && !canSeeHiddenPaths) return false;
          if (!canSeeHiddenPaths && quiz.pathId && !visiblePathIds.has(quiz.pathId)) return false;
          if (quiz.access.type !== 'paid') return false;
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
        const relatedQuizzes = availablePreparedQuizzes
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
  }, [availablePreparedQuizzes, examResults, subjects, lessons, libraryItems]);

  const courseFilters = useMemo(() => {
    const titles = Array.from(new Set(examResults.map((result) => result.quizTitle).filter(Boolean)));
    return ['الكل', ...titles];
  }, [examResults]);

  const filteredQuizzes =
    activeFilter === 'all' || activeFilter === 'الكل'
      ? examResults
      : examResults.filter((quiz) => quiz.quizTitle.includes(activeFilter));

  const latestAttempt = useMemo(() => {
    return [...examResults].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [examResults]);

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

  const subjectQuizReadiness = useMemo(
    () =>
      subjects
        .map((subject) => {
          const subjectQuizzes = availablePreparedQuizzes.filter((quiz) => quiz.subjectId === subject.id);
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
    [availablePreparedQuizzes, directedQuizzes, saherQuizzes, subjects],
  );

  if (isAttemptsView) {
    return (
      <div className="space-y-8 pb-20">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">أنت الآن في: اختباراتي</span>
            <Link to="/dashboard?tab=saher" className="rounded-full bg-white px-3 py-1.5 text-gray-700 border border-gray-200 hover:bg-gray-50">
              الانتقال إلى مركز الاختبارات
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">اختباراتي</h1>
          <p className="text-sm text-gray-500">
            هنا فقط ترى المحاولات التي أنهيتها بالفعل: الدرجة، أضعف مهارة، تفاصيل النتيجة، وروابط التحليل وإعادة المحاولة.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Sparkles size={24} />} value={`${maxScore}%`} label="أعلى درجة" color="purple" />
          <StatCard icon={<TrendingUp size={24} />} value={`${avgImprovement}%`} label="التحسن" color="amber" />
          <StatCard icon={<CheckCircle size={24} />} value={passedQuizzes} label="اختبارات ناجحة" color="blue" />
          <StatCard icon={<FileText size={24} />} value={totalQuizzes} label="محاولات مسجلة" color="emerald" />
        </div>

        {latestAttempt || weakestTrackedSkill ? (
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-l from-indigo-50 via-white to-emerald-50 p-5 shadow-sm">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 shadow-sm">
                  <Sparkles size={14} />
                  ملخص ذكي بعد آخر اختبار
                </div>
                <h2 className="mt-3 text-lg font-black text-gray-900">
                  {weakestTrackedSkill ? `ركز الآن على: ${weakestTrackedSkill.skill}` : 'ابدأ أول اختبار لتحصل على تحليل مهاراتك'}
                </h2>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  {weakestTrackedSkill
                    ? `النظام يتابع أداءك من كل اختبار، وآخر نقطة تحتاج دعمًا ظهرت في ${weakestTrackedSkill.quizTitle}. افتح التقرير أو أعد اختبارًا قصيرًا لنفس المهارة.`
                    : 'بعد أول محاولة سيظهر هنا أضعف مهارة، الدرجة، وخطوة المراجعة التالية بشكل مبسط.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/dashboard?tab=reports"
                  className="rounded-2xl bg-white p-4 text-center shadow-sm border border-white hover:border-emerald-200"
                >
                  <BarChart3 className="mx-auto text-emerald-600" size={22} />
                  <div className="mt-2 text-sm font-black text-gray-900">تقريري</div>
                  <div className="mt-1 text-xs text-gray-500">تحليل مهارات</div>
                </Link>
                <Link
                  to={weakestTrackedSkill?.quizId ? `/quiz/${weakestTrackedSkill.quizId}` : '/quiz'}
                  className="rounded-2xl bg-gray-900 p-4 text-center text-white shadow-sm hover:bg-gray-800"
                >
                  <RotateCcw className="mx-auto" size={22} />
                  <div className="mt-2 text-sm font-black">تدريب سريع</div>
                  <div className="mt-1 text-xs text-gray-300">اختبار علاج</div>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 justify-center">
          {courseFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter === 'الكل' ? 'all' : filter)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                (activeFilter === 'all' && filter === 'الكل') || activeFilter === filter
                  ? 'bg-secondary-500 text-white shadow-md'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-secondary-500 text-white p-4 text-center font-bold text-lg">سجل محاولاتي</div>

          {filteredQuizzes.length > 0 ? (
            <>
            <div className="md:hidden divide-y divide-gray-100">
              {filteredQuizzes.map((quiz, index) => (
                <AttemptSummaryCard
                  key={`${quiz.quizId}-${quiz.date}-${index}-mobile`}
                  quiz={quiz}
                  onDetails={setSelectedAttempt}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-50 text-gray-500 text-xs font-bold">
                  <tr>
                    <th className="p-4 text-right">اسم الاختبار وعدد الأسئلة</th>
                    <th className="p-4 text-center">الدرجة</th>
                    <th className="p-4 text-center">أضعف مهارة</th>
                    <th className="p-4 text-center">الوقت والتاريخ</th>
                    <th className="p-4 text-center">الحالة</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredQuizzes.map((quiz, index) => {
                    const weakestSkill = [...(quiz.skillsAnalysis || [])].sort((a, b) => a.mastery - b.mastery)[0];

                    return (
                      <tr key={`${quiz.quizId}-${quiz.date}-${index}`} className="hover:bg-gray-50 transition-colors group">
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <div className="font-bold text-gray-800">{quiz.quizTitle}</div>
                            <span className="text-xs text-gray-500">{quiz.totalQuestions} سؤال</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`text-sm font-bold ${quiz.score < 50 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {quiz.score}%
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {weakestSkill ? (
                            <div className="text-xs">
                              <div className="font-bold text-gray-800">{weakestSkill.skill}</div>
                              <div className={weakestSkill.mastery < 50 ? 'text-red-500' : 'text-amber-600'}>{weakestSkill.mastery}%</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">لا يوجد تحليل</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="text-[10px] text-gray-400" dir="ltr">
                            {new Date(quiz.date).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-gray-400" dir="ltr">
                            {new Date(quiz.date).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              quiz.score >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {quiz.score >= 50 ? 'ناجح' : 'يحتاج إعادة'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap justify-center gap-2">
                            <button
                              onClick={() => setSelectedAttempt(quiz)}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                            >
                              <Eye size={14} />
                              تفاصيل
                            </button>
                            <Link
                              to="/dashboard?tab=reports"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              <BarChart3 size={14} />
                              التحليل
                            </Link>
                            <Link
                              to={quiz.quizId ? `/quiz/${quiz.quizId}` : '/quiz'}
                              className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
                            >
                              <RotateCcw size={14} />
                              إعادة
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <div className="p-10 text-center text-gray-500">
              لا توجد محاولات بعد. ابدأ اختبارًا من صفحة ساهر أو من الاختبارات الموجهة، وبعد الإنهاء سيظهر السجل هنا.
              <div className="mt-5">
                <Link to="/dashboard?tab=saher" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600">
                  <Zap size={16} />
                  ابدأ اختبار ساهر
                </Link>
              </div>
            </div>
          )}
        </div>

        {selectedAttempt ? <QuizDetailsModal quiz={toQuizHistoryItem(selectedAttempt)} onClose={() => setSelectedAttempt(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <Link to="/" className="text-gray-500 hover:text-gray-700">
          <ArrowRight />
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black mb-2">
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">أنت الآن في: مركز الاختبارات</span>
            <Link to="/my-quizzes" className="rounded-full bg-white px-3 py-1.5 text-gray-700 border border-gray-200 hover:bg-gray-50">
              الانتقال إلى اختباراتي
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">مركز الاختبارات</h1>
          <p className="mt-1 text-sm text-gray-500">هنا تبدأ اختبارًا جديدًا أو تفتح اختبارًا موجهًا أو جاهزًا. أما المحاولات التي أنهيتها فتجدها مجمعة داخل صفحة اختباراتي.</p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Zap size={24} />} value={saherQuizzes.length} label="ساهر جاهز" color="purple" />
        <StatCard icon={<Target size={24} />} value={directedQuizzes.length} label="اختبارات موجهة" color="amber" />
        <StatCard icon={<CheckCircle size={24} />} value={availablePreparedQuizzes.length} label="متاح الآن" color="blue" />
        <StatCard icon={<FileText size={24} />} value={lockedPaidQuizzes.length} label="يتطلب باقة" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-secondary-500 text-white p-4 text-center font-bold text-lg">مركز الاختبارات</div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <div className="text-sm font-black text-gray-900">ماذا أفعل من هنا؟</div>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  استخدم هذه الصفحة عندما تريد بدء اختبار جديد، أو دخول اختبار موجه لك من الإدارة أو المدرسة أو المشرف.
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="text-sm font-black text-gray-900">ومتى أذهب إلى اختباراتي؟</div>
                <p className="mt-2 text-sm leading-7 text-gray-600">
                  بعد إنهاء الاختبار ستجد الدرجة والتقرير والتحليل ومراجعة المحاولة كلها داخل صفحة اختباراتي.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ActionCard
                icon={<Zap size={24} />}
                title="اختبار ساهر الذاتي"
                description="أنشئ اختبارك بنفسك: المسار، المادة، عدد الأسئلة، الصعوبة، والوقت."
                to="/quiz"
                buttonLabel="ابدأ الآن"
                tone="purple"
              />
              <ActionCard
                icon={<Target size={24} />}
                title="اختبارات موجهة لك"
                description="اختبارات مخصصة لك من الإدارة أو المدرسة أو المشرف، وتظهر فقط عندما تكون مستهدفًا بها."
                to={directedQuizzes[0] ? `/quiz/${directedQuizzes[0].id}` : '/quiz'}
                buttonLabel={directedQuizzes.length > 0 ? 'افتح الاختبارات الموجهة' : 'لا يوجد حاليًا'}
                tone="amber"
                disabled={directedQuizzes.length === 0}
              />
              <ActionCard
                icon={<FileText size={24} />}
                title="اختباراتي السابقة"
                description="هنا فقط تراجع المحاولات التي حللتها بالفعل، وتشاهد التفاصيل وتحليل المهارات لكل اختبار."
                to="/my-quizzes"
                buttonLabel="افتح سجل اختباراتي"
                tone="purple"
              />
            </div>

            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-5">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-black text-gray-900">دليل سريع لاختيار نوع الاختبار</h3>
                  <p className="mt-1 text-sm leading-7 text-gray-600">
                    ساهر الذاتي للطالب، والموجه لما ترسله الإدارة أو المدرسة أو المشرف، والنتائج كلها ترجع إلى اختباراتي بعد الحل.
                  </p>
                </div>
                <Link
                  to="/quiz"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-black text-white hover:bg-purple-700"
                >
                  <Zap size={16} />
                  أنشئ اختبار ساهر
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <QuizRouteHint title="ساهر ذاتي" value="اختيار حر" description="الطالب يختار المسار والمادة وعدد الأسئلة والصعوبة." tone="purple" />
                <QuizRouteHint title="موجه لك" value={directedQuizzes.length} description="اختبار من الإدارة أو المدرسة أو المشرف لحسابك أو مجموعتك." tone="amber" />
                <QuizRouteHint title="ساهر جاهز" value={saherQuizzes.length} description="اختبارات منشورة مسبقًا ويمكن البدء بها مباشرة." tone="blue" />
                <QuizRouteHint title="يحتاج باقة" value={lockedPaidQuizzes.length} description="اختبارات تظهر للشراء أو الفتح حسب باقة المسار." tone="emerald" />
              </div>
            </div>

            {subjectQuizReadiness.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="mb-4">
                  <h3 className="font-black text-gray-900">جاهزية الاختبارات حسب المادة</h3>
                  <p className="mt-1 text-sm text-gray-500">نظرة سريعة تساعد الطالب يعرف أين يبدأ، وتساعد الإدارة تلاحظ المواد التي تحتاج اختبارات أكثر.</p>
                </div>
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
              badgeClassName="bg-amber-100 text-amber-700"
              badgeLabel="موجّه"
            />

            <QuizSection
              title="اختبارات ساهر الجاهزة"
              emptyMessage="لا توجد اختبارات ساهر جاهزة منشورة لك حاليًا."
              items={saherQuizzes}
              subjects={subjects}
              badgeClassName="bg-purple-100 text-purple-700"
              badgeLabel="ساهر"
            />

            <QuizSection
              title="اختبارات جاهزة أخرى"
              emptyMessage="لا توجد اختبارات جاهزة إضافية منشورة حاليًا."
              items={regularPreparedQuizzes}
              subjects={subjects}
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gray-900 text-white p-4 text-center font-bold text-lg">ملخص سريع</div>
          <div className="p-6 space-y-4">
            <SummaryRow label="اختبارات جاهزة متاحة" value={availablePreparedQuizzes.length} />
            <SummaryRow label="اختبارات موجهة لك" value={directedQuizzes.length} />
            <SummaryRow label="اختبارات ساهر" value={saherQuizzes.length} />
            <SummaryRow label="اختبارات مركزية" value={centralQuizzes.length} />
            <SummaryRow label="اختبارات تحتاج باقة" value={lockedPaidQuizzes.length} />
            <SummaryRow label="سجل النتائج" value={totalQuizzes > 0 ? `${totalQuizzes} محاولة في اختباراتي` : 'افتح اختباراتي بعد أول حل'} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">سجل المحاولات في مكان واحد</h3>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              هذه الصفحة لبدء اختبارات جديدة أو فتح اختبارات موجهة. أما نتائجك السابقة، مراجعة الإجابات، وتحليل المهارات فتجدها من تبويب اختباراتي.
            </p>
          </div>
          <Link
            to="/my-quizzes"
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
  badgeClassName,
  badgeLabel,
}: {
  title: string;
  emptyMessage: string;
  items: Array<{
    id: string;
    title: string;
    subjectId: string;
    questionIds: string[];
    createdAt: number;
    dueDate?: string;
    access?: { type?: string };
  }>;
  subjects: ReturnType<typeof useStore.getState>['subjects'];
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
      <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    )}
  </div>
);

const AttemptSummaryCard = ({
  quiz,
  onDetails,
}: {
  quiz: QuizResult;
  onDetails: (quiz: QuizResult) => void;
}) => {
  const weakestSkill = [...(quiz.skillsAnalysis || [])].sort((a, b) => a.mastery - b.mastery)[0];
  const isPassed = quiz.score >= 50;

  return (
    <article className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-gray-900 leading-7">{quiz.quizTitle}</h3>
          <p className="mt-1 text-xs text-gray-500">{quiz.totalQuestions} سؤال - {new Date(quiz.date).toLocaleDateString('ar-SA')}</p>
        </div>
        <div className={`shrink-0 rounded-2xl px-4 py-3 text-center ${isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          <div className="text-xl font-black">{quiz.score}%</div>
          <div className="text-[10px] font-bold">{isPassed ? 'ممتاز' : 'نحتاج تدريب'}</div>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-3">
        <div className="text-[11px] font-bold text-gray-500 mb-1">أهم مهارة تحتاج متابعة</div>
        {weakestSkill ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-gray-900">{weakestSkill.skill}</span>
            <span className={`text-sm font-black ${weakestSkill.mastery < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{weakestSkill.mastery}%</span>
          </div>
        ) : (
          <div className="text-sm text-gray-400">لا يوجد تحليل مهارات لهذا الاختبار.</div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onDetails(quiz)}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
        >
          <Eye size={14} />
          تفاصيل
        </button>
        <Link
          to="/dashboard?tab=reports"
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
        >
          <BarChart3 size={14} />
          تقريري
        </Link>
        <Link
          to={quiz.quizId ? `/quiz/${quiz.quizId}` : '/quiz'}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-gray-800"
        >
          <RotateCcw size={14} />
          إعادة
        </Link>
      </div>
    </article>
  );
};

const ActionCard = ({
  icon,
  title,
  description,
  to,
  buttonLabel,
  tone,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  buttonLabel: string;
  tone: 'purple' | 'amber';
  disabled?: boolean;
}) => {
  const toneClasses =
    tone === 'purple'
      ? 'bg-purple-50 text-purple-700 border-purple-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';

  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <div className="w-12 h-12 rounded-xl bg-white/70 flex items-center justify-center mb-4">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm leading-6 mb-5">{description}</p>
      {disabled ? (
        <div className="bg-white/70 text-gray-500 py-2 rounded-lg font-bold text-center text-sm">لا يوجد الآن</div>
      ) : (
        <Link to={to} className="bg-white text-gray-900 py-2 rounded-lg font-bold text-center block text-sm hover:bg-gray-50">
          {buttonLabel}
        </Link>
      )}
    </div>
  );
};

const QuizRouteHint = ({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  tone: 'purple' | 'amber' | 'blue' | 'emerald';
}) => {
  const toneClasses = {
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  }[tone];

  return (
    <div className="rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="font-black text-gray-900">{title}</div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${toneClasses}`}>{value}</span>
      </div>
      <p className="mt-3 text-xs font-bold leading-6 text-gray-500">{description}</p>
    </div>
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
