import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  ArrowRight,
  Eye,
  BarChart3,
  History,
  CheckCircle2,
  ChevronLeft,
  PlayCircle,
  Star,
  Trash2,
  FileText,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { VideoModal } from '../components/VideoModal';
import { DetailedAnalysisModal } from '../components/DetailedAnalysisModal';
import { useStore } from '../store/useStore';
import { QuizQuestionReview, QuizResult } from '../types';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';

interface SkillRecommendation {
  lessonTitle?: string;
  lessonLink?: string;
  lessonVideoUrl?: string;
  quizTitle?: string;
  quizLink?: string;
  resourceTitle?: string;
  resourceUrl?: string;
  subjectName?: string;
  sectionName?: string;
  actionText?: string;
}

interface ResolvedAnalysisItem {
  subjectName?: string;
  sectionName?: string;
  skillName: string;
  mastery: number;
  status: 'weak' | 'average' | 'strong';
  lessonTitle?: string;
  lessonLink?: string;
  lessonVideoUrl?: string;
  quizTitle?: string;
  quizLink?: string;
  resourceTitle?: string;
  resourceUrl?: string;
  actionText?: string;
}

const displayText = (value?: string | null) => sanitizeArabicText(value) || '';

const getSkillRecommendation = (
  skill: QuizResult['skillsAnalysis'][number] | undefined,
  allSkills: ReturnType<typeof useStore.getState>['skills'],
  lessons: ReturnType<typeof useStore.getState>['lessons'],
  quizzes: ReturnType<typeof useStore.getState>['quizzes'],
  libraryItems: ReturnType<typeof useStore.getState>['libraryItems'],
  questions: ReturnType<typeof useStore.getState>['questions'],
): SkillRecommendation => {
  if (!skill) {
    return {};
  }

  const resolvedSkill = skill.skillId
    ? allSkills.find((item) => item.id === skill.skillId)
    : allSkills.find((item) => item.name === skill.skill);

  if (!resolvedSkill) {
    return {};
  }

  const recommendedLesson = lessons.find(
    (lesson) =>
      lesson.skillIds?.includes(resolvedSkill.id) &&
      lesson.showOnPlatform !== false &&
      (!lesson.approvalStatus || lesson.approvalStatus === 'approved'),
  );
  const recommendedQuiz = quizzes.find((quiz) =>
    quiz.showOnPlatform !== false &&
    quiz.isPublished !== false &&
    (!quiz.approvalStatus || quiz.approvalStatus === 'approved') &&
    (quiz.questionIds?.some((questionId) => questions.find((question) => question.id === questionId)?.skillIds?.includes(resolvedSkill.id)) ||
      quiz.skillIds?.includes(resolvedSkill.id)),
  );
  const recommendedResource = libraryItems.find(
    (item) => item.skillIds?.includes(resolvedSkill.id) && item.showOnPlatform !== false && (!item.approvalStatus || item.approvalStatus === 'approved'),
  );

  return {
    lessonTitle: displayText(recommendedLesson?.title),
    lessonLink:
      resolvedSkill.pathId && resolvedSkill.subjectId
        ? `/category/${resolvedSkill.pathId}?subject=${resolvedSkill.subjectId}&tab=skills`
        : undefined,
    lessonVideoUrl: recommendedLesson?.videoUrl,
    quizTitle: displayText(recommendedQuiz?.title),
    quizLink: recommendedQuiz?.id ? `/quiz/${recommendedQuiz.id}` : undefined,
    resourceTitle: displayText(recommendedResource?.title),
    resourceUrl: recommendedResource?.url,
    subjectName: resolvedSkill.subjectId ? displayText(useStore.getState().subjects.find((item) => item.id === resolvedSkill.subjectId)?.name) : undefined,
    sectionName: resolvedSkill.sectionId ? displayText(useStore.getState().sections.find((item) => item.id === resolvedSkill.sectionId)?.name) : undefined,
    actionText:
      recommendedLesson && recommendedQuiz
        ? 'ابدأ بمراجعة الشرح أولًا ثم نفّذ تدريبًا قصيرًا على نفس المهارة.'
        : recommendedLesson
          ? 'الأولوية الآن لمراجعة الشرح المرتبط بهذه المهارة.'
          : recommendedQuiz
            ? 'ابدأ بتدريب قصير على هذه المهارة ثم أعد القياس.'
            : recommendedResource
              ? 'راجع الملف الداعم ثم ارجع للتدريب مرة أخرى.'
              : 'هذه المهارة تحتاج متابعة أبسط خطوة بخطوة.',
  };
};

const getMasteryClasses = (mastery: number) => {
  if (mastery >= 80) {
    return { badge: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500', label: 'ممتاز' };
  }

  if (mastery >= 60) {
    return { badge: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500', label: 'يحتاج بعض المراجعة' };
  }

  return { badge: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500', label: 'يحتاج تركيزًا أكبر' };
};

const getSkillPriorityLabel = (mastery: number) => {
  if (mastery >= 80) {
    return { label: 'مطمئنة', className: 'bg-emerald-50 text-emerald-700' };
  }

  if (mastery >= 60) {
    return { label: 'راجعها اليوم', className: 'bg-amber-50 text-amber-700' };
  }

  return { label: 'ابدأ هنا', className: 'bg-rose-50 text-rose-700' };
};

const getFriendlyResultMessage = (score: number) => {
  if (score >= 85) {
    return {
      title: 'ممتاز جدًا',
      message: 'أحسنت. مستواك قوي جدًا، والآن نركز فقط على تثبيت المهارات حتى تستمر بنفس القوة.',
      chipClassName: 'bg-emerald-50 text-emerald-700',
    };
  }

  if (score >= 60) {
    return {
      title: 'أداء جيد',
      message: 'أنت على الطريق الصحيح. يوجد بعض المهارات التي تحتاج مراجعة بسيطة حتى ترتفع نتيجتك أكثر.',
      chipClassName: 'bg-amber-50 text-amber-700',
    };
  }

  return {
    title: 'نحتاج خطة أبسط وأذكى',
    message: 'لا تقلق. سنبدأ بالمهارات الأسهل أولًا، ثم نراجع الشرح، وبعدها نرجع للتدريب خطوة بخطوة.',
    chipClassName: 'bg-rose-50 text-rose-700',
  };
};

const SimpleResultStat = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) => {
  const toneClasses = {
    default: 'bg-gray-50 text-gray-800',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  };

  return (
    <div className={`rounded-2xl p-4 ${toneClasses[tone]}`}>
      <div className="text-xs font-bold opacity-80">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
};

const NextStepChip = ({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) => {
  const toneClasses = {
    default: 'bg-gray-50 text-gray-700 border-gray-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${toneClasses[tone]}`}>{label}</span>;
};

const Results: React.FC = () => {
  const { examResults, skills, lessons, quizzes, libraryItems, questions, subjects, sections } = useStore();
  const [viewMode, setViewMode] = React.useState<'summary' | 'review' | 'history' | 'analysis'>('summary');
  const [isAnalysisOpen, setIsAnalysisOpen] = React.useState(false);
  const [videoData, setVideoData] = React.useState<{ url: string; title: string } | null>(null);

  const latestResult = examResults[0];
  const questionReviewCount = latestResult?.questionReview?.length || 0;

  const analysisItems: ResolvedAnalysisItem[] = React.useMemo(() => {
    if (!latestResult) return [];

    return (latestResult.skillsAnalysis || [])
      .map((item) => {
        const recommendation = getSkillRecommendation(item, skills, lessons, quizzes, libraryItems, questions);

        return {
          subjectName:
            recommendation.subjectName ||
            (item.subjectId ? displayText(subjects.find((subject) => subject.id === item.subjectId)?.name) : undefined),
          sectionName:
            recommendation.sectionName ||
            displayText(item.section) ||
            (item.sectionId ? displayText(sections.find((section) => section.id === item.sectionId)?.name) : undefined),
          skillName: displayText(item.skill),
          mastery: item.mastery,
          status: item.status,
          lessonTitle: recommendation.lessonTitle,
          lessonLink: recommendation.lessonLink,
          lessonVideoUrl: recommendation.lessonVideoUrl,
          quizTitle: recommendation.quizTitle,
          quizLink: recommendation.quizLink,
          resourceTitle: recommendation.resourceTitle,
          resourceUrl: recommendation.resourceUrl,
          actionText: recommendation.actionText,
        };
      })
      .sort((a, b) => a.mastery - b.mastery);
  }, [latestResult, skills, lessons, quizzes, libraryItems, questions, subjects, sections]);

  const weakestSkill = analysisItems[0];
  const summaryTone = getFriendlyResultMessage(latestResult?.score || 0);
  const strongSkillsCount = analysisItems.filter((item) => item.status === 'strong').length;
  const averageSkillsCount = analysisItems.filter((item) => item.status === 'average').length;
  const weakSkillsCount = analysisItems.filter((item) => item.status === 'weak').length;
  const topThreeFocusSkills = analysisItems.slice(0, 3);
  const starterChecklist = [
    weakestSkill?.lessonTitle ? { id: 'lesson', label: 'ابدأ بشرح المهارة الأضعف', tone: 'danger' as const } : null,
    weakestSkill?.quizTitle ? { id: 'quiz', label: 'بعدها حل تدريبًا قصيرًا', tone: 'warning' as const } : null,
    weakestSkill?.resourceTitle ? { id: 'resource', label: 'مرّ على الملف الداعم', tone: 'success' as const } : null,
  ].filter(Boolean) as { id: string; label: string; tone: 'danger' | 'warning' | 'success' }[];

  const donutData = [
    { name: 'Success', value: latestResult?.score || 0 },
    { name: 'Fail', value: 100 - (latestResult?.score || 0) },
  ];
  const donutColors = ['#10b981', '#dc2626'];

  if (!latestResult) {
    return (
      <div className="space-y-6 pb-20">
        <header className="flex items-center gap-3 sm:gap-4 mb-6">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
            <ArrowRight />
          </Link>
          <h1 className="text-xl font-bold">نتيجة الاختبار</h1>
        </header>

        <Card className="p-10 text-center border-dashed border-2 border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 leading-tight">لا توجد نتيجة محفوظة بعد</h2>
          <p className="text-gray-500 mb-6">ابدأ أول اختبار، وبعدها ستظهر هنا النتيجة والتحليل وسجل المحاولات.</p>
          <Link
            to="/quiz"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            <PlayCircle size={18} />
            ابدأ اختبارًا الآن
          </Link>
        </Card>
      </div>
    );
  }

  if (viewMode === 'review') {
    return (
      <>
        <ReviewSolutions
          result={latestResult}
          onBack={() => setViewMode('summary')}
          onShowVideo={(url, title) => setVideoData({ url, title })}
        />
        {videoData ? <VideoModal videoUrl={videoData.url} title={videoData.title} onClose={() => setVideoData(null)} /> : null}
      </>
    );
  }

  if (viewMode === 'history') {
    return <PreviousAttempts onBack={() => setViewMode('summary')} attempts={examResults} />;
  }

  if (viewMode === 'analysis') {
    return <DetailedAnalysis onBack={() => setViewMode('summary')} result={latestResult} />;
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/dashboard" className="text-gray-500">
            <ArrowRight />
          </Link>
          <h1 className="text-xl font-bold">نتيجة الاختبار</h1>
        </div>
        <div className={`self-start px-4 py-1 rounded-full text-sm font-bold ${summaryTone.chipClassName}`}>
          {summaryTone.title}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight break-words">{displayText(latestResult.quizTitle)}</h2>
                <p className="mt-2 text-sm leading-7 text-gray-500">{summaryTone.message}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-center">
                <div className="text-xs font-bold text-gray-500">آخر محاولة</div>
                <div className="mt-1 text-sm font-bold text-gray-800">{new Date(latestResult.date).toLocaleDateString('ar-SA')}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-[220px_1fr]">
              <div className="h-52 sm:h-56 relative flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-emerald-600">{latestResult.score}%</span>
                  <span className="text-sm text-gray-500">النتيجة</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SimpleResultStat label="عدد الأسئلة" value={latestResult.totalQuestions.toString()} />
                <SimpleResultStat label="الصحيح" value={latestResult.correctAnswers.toString()} tone="success" />
                <SimpleResultStat label="الخطأ" value={latestResult.wrongAnswers.toString()} tone="danger" />
                <SimpleResultStat label="بدون إجابة" value={latestResult.unanswered.toString()} tone="warning" />
                <SimpleResultStat label="مهارات قوية" value={strongSkillsCount.toString()} tone="success" />
                <SimpleResultStat label="مهارات متوسطة" value={averageSkillsCount.toString()} tone="warning" />
                <SimpleResultStat label="مهارات ضعيفة" value={weakSkillsCount.toString()} tone="danger" />
                <SimpleResultStat label="وقت الحل" value={latestResult.timeSpent} />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                onClick={() => setViewMode('review')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
              >
                <Eye size={18} />
                مراجعة الحلول
              </button>
              <button
                onClick={() => setIsAnalysisOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                <BarChart3 size={18} />
                تحليل المهارات
              </button>
              <button
                onClick={() => setViewMode('history')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-indigo-200 text-indigo-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors"
              >
                <History size={18} />
                محاولاتك السابقة
              </button>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-800">خطوتك التالية</h3>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            نبدأ دائمًا بالمهارة الأضعف أولًا، ثم نراجع الشرح أو الفيديو، وبعدها نحل تدريبًا قصيرًا.
          </p>

          {weakestSkill ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                  {weakestSkill.subjectName ? (
                    <div className="rounded-xl bg-white px-3 py-2 text-gray-700">
                      <span className="block text-gray-400 mb-1">المادة</span>
                      {weakestSkill.subjectName}
                    </div>
                  ) : null}
                  {weakestSkill.sectionName ? (
                    <div className="rounded-xl bg-white px-3 py-2 text-indigo-700">
                      <span className="block text-indigo-300 mb-1">المهارة الرئيسية</span>
                      {weakestSkill.sectionName}
                    </div>
                  ) : null}
                  <div className="rounded-xl bg-white px-3 py-2 text-rose-700">
                    <span className="block text-rose-300 mb-1">المهارة الفرعية</span>
                    {weakestSkill.skillName}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-7 text-gray-600">{weakestSkill.actionText}</p>
                <div className="mt-4 h-2 rounded-full bg-white">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${weakestSkill.mastery}%` }} />
                </div>
                <div className="mt-2 text-sm font-bold text-rose-700">{weakestSkill.mastery}%</div>
              </div>

              {starterChecklist.length > 0 ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-indigo-800">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-black">ابدأ بهذه الخطوات البسيطة</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {starterChecklist.map((item) => (
                      <NextStepChip key={item.id} label={item.label} tone={item.tone} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
                {weakestSkill.lessonLink ? (
                  <Link to={weakestSkill.lessonLink} className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">
                    راجع الشرح المرتبط
                  </Link>
                ) : null}
                {weakestSkill.lessonVideoUrl ? (
                  <button
                    onClick={() => setVideoData({ url: weakestSkill.lessonVideoUrl!, title: `شرح مهارة ${weakestSkill.skillName}` })}
                    className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors text-right"
                  >
                    شاهد فيديو الشرح
                  </button>
                ) : null}
                {weakestSkill.quizLink ? (
                  <Link to={weakestSkill.quizLink} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                    ابدأ تدريبًا على نفس المهارة
                  </Link>
                ) : null}
                {weakestSkill.resourceUrl ? (
                  <a href={weakestSkill.resourceUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                    افتح الملف الداعم
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm leading-7 text-gray-600">
              لا توجد مهارات تفصيلية محفوظة لهذه المحاولة بعد.
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">تفصيل بسيط للمهارات</h3>
            <p className="text-sm leading-7 text-gray-500">المادة ثم المهارة الرئيسة ثم المهارة الفرعية، مع خطوة سهلة وواضحة بعدها.</p>
          </div>
          <div className="text-sm font-bold text-gray-500">عدد أسئلة المراجعة المتاحة: {questionReviewCount}</div>
        </div>

        <div className="mt-5 grid gap-4">
          {topThreeFocusSkills.length > 0 ? (
            topThreeFocusSkills.map((item, index) => {
              const masteryMeta = getMasteryClasses(item.mastery);
              const priorityMeta = getSkillPriorityLabel(item.mastery);
              return (
                <div key={`${item.skillName}-${index}`} className="rounded-2xl border border-gray-100 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityMeta.className}`}>
                          {priorityMeta.label}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${masteryMeta.badge}`}>
                          {masteryMeta.label} - {item.mastery}%
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold">
                        {item.subjectName ? (
                          <div className="rounded-xl bg-gray-50 px-3 py-2 text-gray-700">
                            <span className="block text-gray-400 mb-1">المادة</span>
                            {item.subjectName}
                          </div>
                        ) : null}
                        {item.sectionName ? (
                          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-indigo-700">
                            <span className="block text-indigo-300 mb-1">المهارة الرئيسية</span>
                            {item.sectionName}
                          </div>
                        ) : null}
                        <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                          <span className="block text-amber-300 mb-1">المهارة الفرعية</span>
                          {item.skillName}
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                        <div className="text-[11px] font-bold text-slate-500 mb-1">الخطوة التالية الآن</div>
                        <p className="text-sm leading-7 text-gray-600">{item.actionText}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                        {item.lessonTitle ? <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">شرح مرتبط</span> : null}
                        {item.lessonVideoUrl ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">فيديو شرح</span> : null}
                        {item.quizTitle ? <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">تدريب قصير</span> : null}
                        {item.resourceTitle ? <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">ملف داعم</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${masteryMeta.bar}`} style={{ width: `${item.mastery}%` }} />
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {item.lessonLink ? (
                      <Link to={item.lessonLink} className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">
                        راجع الشرح
                      </Link>
                    ) : null}
                    {item.lessonVideoUrl ? (
                      <button
                        onClick={() => setVideoData({ url: item.lessonVideoUrl!, title: `شرح مهارة ${item.skillName}` })}
                        className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors text-right"
                      >
                        شاهد الفيديو
                      </button>
                    ) : null}
                    {item.quizLink ? (
                      <Link to={item.quizLink} className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                        تدريب مناسب
                      </Link>
                    ) : null}
                    {item.resourceUrl ? (
                      <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                        ملف داعم
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              لا توجد تفاصيل مهارية محفوظة لهذه المحاولة بعد.
            </div>
          )}
        </div>

        {analysisItems.length > topThreeFocusSkills.length ? (
          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-7 text-gray-600">
                توجد مهارات إضافية في التقرير التفصيلي. أبقينا هنا أهم 3 مهارات فقط حتى يكون العرض أبسط للطالب وولي الأمر.
              </p>
              <button
                onClick={() => setIsAnalysisOpen(true)}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-indigo-100 bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                <BarChart3 size={16} />
                عرض الكل
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <DetailedAnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        skills={analysisItems.map((item) => ({
          name: item.skillName,
          percentage: item.mastery,
          color: getMasteryClasses(item.mastery).bar,
          subjectName: item.subjectName,
          sectionName: item.sectionName,
          recommendation: item.actionText,
        }))}
      />

      {videoData ? <VideoModal videoUrl={videoData.url} title={videoData.title} onClose={() => setVideoData(null)} /> : null}
    </div>
  );
};

const ReviewSolutions = ({
  result,
  onBack,
  onShowVideo,
}: {
  result: QuizResult;
  onBack: () => void;
  onShowVideo: (url: string, title: string) => void;
}) => {
  const { favorites, toggleFavorite } = useStore();
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [showExplanation, setShowExplanation] = React.useState(false);

  const questions: QuizQuestionReview[] = result.questionReview || [];
  const q = questions[currentIdx];

  if (!q) {
    return (
      <div className="space-y-6 pb-20">
        <header className="flex items-center gap-3 sm:gap-4 mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowRight />
          </button>
          <h1 className="text-xl font-bold">مراجعة الحلول</h1>
        </header>

        <Card className="p-10 text-center border-dashed border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">تفاصيل المراجعة غير متاحة لهذه المحاولة</h2>
          <p className="text-gray-500 mb-6">المحاولات الجديدة ستحفظ معها تفاصيل الإجابات والفيديو والشرح تلقائيًا.</p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            <ArrowRight size={18} />
            العودة للنتيجة
          </button>
        </Card>
      </div>
    );
  }

  const isFavorite = favorites.includes(q.questionId);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowRight />
          </button>
          <h1 className="text-xl font-bold">مراجعة الحلول</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-amber-500 text-white px-4 py-1.5 rounded-xl text-sm font-bold">
            السؤال {currentIdx + 1} من {questions.length}
          </span>
          <button
            onClick={() => toggleFavorite(q.questionId)}
            className={`${isFavorite ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors`}
          >
            {isFavorite ? <Trash2 size={16} /> : <Star size={16} />}
            {isFavorite ? 'مسح من المفضلة' : 'إضافة للمفضلة'}
          </button>
        </div>
      </header>

      <Card className="p-0 overflow-hidden border-2 border-gray-100 shadow-xl">
        <div className="p-4 sm:p-8 bg-white">
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-8 mb-8 flex flex-col items-center justify-center border border-gray-100 min-h-[250px]">
            {q.imageUrl ? (
              <img src={q.imageUrl} alt="Question" className="max-h-64 object-contain mb-6" referrerPolicy="no-referrer" />
            ) : (
              <div className="text-center mb-6">
                <FileText size={48} className="text-gray-200 mx-auto mb-2" />
                <span className="text-sm text-gray-400 font-bold">[لا توجد صورة مرفقة لهذا السؤال]</span>
              </div>
            )}
            <div className="text-lg sm:text-xl font-bold text-gray-800 text-center leading-relaxed px-2 sm:px-4 break-words" dangerouslySetInnerHTML={{ __html: displayText(q.text) }} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {['A', 'B', 'C', 'D'].slice(0, q.options.length).map((label, i) => {
              const isCorrect = i === q.correctOptionIndex;
              const isUser = i === q.selectedOptionIndex;

              let borderClass = 'border-gray-200 text-gray-400';
              let bgClass = 'bg-white';

              if (showExplanation) {
                if (isCorrect) {
                  borderClass = 'border-emerald-500 text-emerald-600';
                  bgClass = 'bg-emerald-50';
                } else if (isUser && !isCorrect) {
                  borderClass = 'border-red-500 text-red-600';
                  bgClass = 'bg-red-50';
                }
              }

              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl font-black transition-all ${borderClass} ${bgClass}`}>
                    {label}
                  </div>
                  <span className="text-xs font-bold text-gray-500 text-center">{displayText(q.options[i])}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {q.videoUrl ? (
              <button
                onClick={() => onShowVideo(q.videoUrl!, `شرح السؤال ${currentIdx + 1}`)}
                className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
              >
                <PlayCircle size={20} />
                شرح الفيديو
              </button>
            ) : null}
            <button
              onClick={() => setShowExplanation((value) => !value)}
              className="bg-white border-2 border-indigo-100 text-indigo-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all"
            >
              <Eye size={20} />
              {showExplanation ? 'إخفاء الحل' : 'إظهار الحل'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={() => {
                setCurrentIdx((prev) => Math.max(0, prev - 1));
                setShowExplanation(false);
              }}
              disabled={currentIdx === 0}
              className="bg-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all"
            >
              السابق
            </button>
            <button
              onClick={() => {
                if (currentIdx < questions.length - 1) {
                  setCurrentIdx((prev) => prev + 1);
                  setShowExplanation(false);
                } else {
                  onBack();
                }
              }}
              className="bg-slate-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
            >
              {currentIdx === questions.length - 1 ? 'إنهاء المراجعة' : 'التالي'}
              <ChevronRightIcon size={20} className="transform rotate-180" />
            </button>
          </div>
        </div>
      </Card>

      {showExplanation ? (
        <div className="animate-slide-up">
          <Card className="p-6 border-2 border-emerald-100 bg-emerald-50/30 space-y-4">
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <span className={`px-3 py-1 rounded-full ${q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {q.isCorrect ? 'إجابتك صحيحة' : 'إجابتك تحتاج مراجعة'}
              </span>
              {typeof q.selectedOptionIndex === 'number' ? (
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  اختيارك: {displayText(q.options[q.selectedOptionIndex])}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700">لم تُجب عن هذا السؤال</span>
              )}
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                الإجابة الصحيحة: {displayText(q.options[q.correctOptionIndex])}
              </span>
            </div>

            {q.explanation ? (
              <div>
                <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  توضيح الحل الصحيح:
                </h4>
                <div className="text-gray-700 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: displayText(q.explanation) }} />
              </div>
            ) : (
              <p className="text-gray-600 leading-relaxed">لا يوجد شرح نصي محفوظ لهذا السؤال، ويمكنك الاعتماد على الفيديو إذا كان متاحًا.</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
};

const DetailedAnalysis = ({ onBack, result }: { onBack: () => void; result: QuizResult }) => {
  const { skills, lessons, quizzes, libraryItems, questions, subjects, sections } = useStore();
  const analysisItems = (result.skillsAnalysis || [])
    .map((item) => {
      const recommendation = getSkillRecommendation(item, skills, lessons, quizzes, libraryItems, questions);
      return {
        ...item,
        subjectName:
          recommendation.subjectName ||
          (item.subjectId ? displayText(subjects.find((subject) => subject.id === item.subjectId)?.name) : undefined),
        sectionName:
          recommendation.sectionName ||
          displayText(item.section) ||
          (item.sectionId ? displayText(sections.find((section) => section.id === item.sectionId)?.name) : undefined),
        ...recommendation,
      };
    })
    .sort((a, b) => a.mastery - b.mastery);

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <button onClick={onBack} className="text-gray-500">
          <ArrowRight />
        </button>
        <h1 className="text-xl font-bold">التحليل المفصل للمهارات</h1>
      </header>

      <div className="grid gap-4">
        {analysisItems.map((s, idx) => (
          <Card key={idx} className="p-5">
            <div className="flex justify-between items-center gap-3 mb-3">
              <div>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                  {s.subjectName ? <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{s.subjectName}</span> : null}
                  {s.sectionName ? <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-600">{s.sectionName}</span> : null}
                </div>
                <h3 className="mt-3 font-bold text-gray-800">{displayText(s.skill)}</h3>
              </div>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full ${
                  s.status === 'weak'
                    ? 'bg-red-100 text-red-600'
                    : s.status === 'average'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {s.mastery}%
              </span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  s.status === 'weak' ? 'bg-red-500' : s.status === 'average' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${s.mastery}%` }}
              />
            </div>
            {s.actionText ? <p className="mt-4 text-sm leading-7 text-gray-600">{s.actionText}</p> : null}
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {s.lessonTitle ? (
                <Link to={s.lessonLink || '/reports'} className="border border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl px-4 py-3 text-sm font-bold hover:bg-indigo-100 transition-colors">
                  راجع الدرس: {displayText(s.lessonTitle)}
                </Link>
              ) : null}
              {s.quizTitle ? (
                <Link to={s.quizLink || '/quizzes'} className="border border-emerald-100 bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm font-bold hover:bg-emerald-100 transition-colors">
                  اختبر نفسك: {displayText(s.quizTitle)}
                </Link>
              ) : null}
              {s.resourceTitle && s.resourceUrl ? (
                <a href={s.resourceUrl} target="_blank" rel="noreferrer" className="border border-amber-100 bg-amber-50 text-amber-700 rounded-xl px-4 py-3 text-sm font-bold hover:bg-amber-100 transition-colors">
                  الملف الداعم: {displayText(s.resourceTitle)}
                </a>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-indigo-900 text-white">
        <h3 className="font-bold text-lg mb-4">توصية ذكية</h3>
        <p className="text-indigo-100 leading-relaxed">
          اعتمد في خطتك القادمة على مراجعة المهارات الأضعف أولًا، ثم أعد التدريب بعد إنهاء الشرح المرتبط بها. البساطة هنا أفضل من كثرة المهام.
        </p>
        <Link to="/reports" className="inline-flex mt-6 bg-white text-indigo-900 px-6 py-2 rounded-xl font-bold hover:bg-indigo-50 transition-colors">
          اذهب للتقرير الكامل
        </Link>
      </Card>
    </div>
  );
};

const PreviousAttempts = ({ onBack, attempts }: { onBack: () => void; attempts: QuizResult[] }) => {
  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-3 sm:gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500">
          <ArrowRight />
        </button>
        <h1 className="text-xl font-bold">محاولاتك السابقة</h1>
      </header>

      <div className="space-y-4">
        {attempts.map((attempt, index) => (
          <Card key={`${attempt.quizId}-${attempt.date}-${index}`} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  attempt.score >= 50 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {attempt.score}%
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{displayText(attempt.quizTitle)}</h3>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{new Date(attempt.date).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{attempt.timeSpent}</span>
                </div>
              </div>
            </div>
            <ChevronLeft className="text-gray-400" />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Results;
