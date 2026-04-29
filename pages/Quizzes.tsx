import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
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

  if (isAttemptsView) {
    return (
      <div className="space-y-8 pb-20">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">اختباراتي</h1>
          <p className="text-sm text-gray-500">
            هنا سجل الاختبارات التي قمت بحلها فقط، مع تفاصيل الدرجة وتحليل المهارات وإمكانية مراجعة التقرير.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Sparkles size={24} />} value={`${maxScore}%`} label="أعلى درجة" color="purple" />
          <StatCard icon={<TrendingUp size={24} />} value={`${avgImprovement}%`} label="التحسن" color="amber" />
          <StatCard icon={<CheckCircle size={24} />} value={passedQuizzes} label="اختبارات ناجحة" color="blue" />
          <StatCard icon={<FileText size={24} />} value={totalQuizzes} label="محاولات مسجلة" color="emerald" />
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          {courseFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter === 'Ø§Ù„ÙƒÙ„' ? 'all' : filter)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                (activeFilter === 'all' && filter === 'Ø§Ù„ÙƒÙ„') || activeFilter === filter
                  ? 'bg-secondary-500 text-white shadow-md'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              {filter === 'Ø§Ù„ÙƒÙ„' ? 'الكل' : filter}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-secondary-500 text-white p-4 text-center font-bold text-lg">سجل محاولاتي</div>

          {filteredQuizzes.length > 0 ? (
            <div className="overflow-x-auto">
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
                              to="/reports"
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
          ) : (
            <div className="p-10 text-center text-gray-500">
              لا توجد محاولات بعد. ابدأ اختبارًا من صفحة ساهر أو من الاختبارات الموجهة، وبعد الإنهاء سيظهر السجل هنا.
              <div className="mt-5">
                <Link to="/quiz" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white hover:bg-amber-600">
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">اختباراتي</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Sparkles size={24} />} value={`${maxScore}%`} label="أعلى درجة" color="purple" />
        <StatCard icon={<TrendingUp size={24} />} value={`${avgImprovement}%`} label="التحسن" color="amber" />
        <StatCard icon={<CheckCircle size={24} />} value={passedQuizzes} label="اختبارات ناجحة" color="blue" />
        <StatCard icon={<FileText size={24} />} value={totalQuizzes} label="محاولات مسجلة" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-secondary-500 text-white p-4 text-center font-bold text-lg">مركز الاختبارات</div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

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
            <SummaryRow label="أفضل نتيجة" value={`${maxScore}%`} />
            <SummaryRow label="آخر محاولة" value={examResults[0] ? formatQuizDate(examResults[0].date) : 'لا يوجد'} />
          </div>
        </div>
      </div>

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
        <div className="bg-secondary-500 text-white p-4 text-center font-bold text-lg">سجل المحاولات</div>

        {filteredQuizzes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-gray-50 text-gray-500 text-xs font-bold">
                <tr>
                  <th className="p-4 text-right">اسم الاختبار وعدد الأسئلة</th>
                  <th className="p-4 text-center">الدرجة</th>
                  <th className="p-4 text-center">الوقت والتاريخ</th>
                  <th className="p-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuizzes.map((quiz, index) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">
            لا توجد نتائج مطابقة للفلاتر الحالية. بعد إكمال أول اختبار ستظهر المحاولات هنا.
          </div>
        )}
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
        {items.slice(0, 4).map((quiz) => (
          <div
            key={quiz.id}
            className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-indigo-200 transition-colors"
          >
            <div className="space-y-1">
              <div className="font-bold text-gray-900">{quiz.title}</div>
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
