import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Eye,
  BarChart3,
  AlertCircle,
  BookOpen,
  History,
  CheckCircle2,
  ChevronLeft,
  Lightbulb,
  PlayCircle,
  Sparkles,
  Star,
  Target,
  Trash2,
  FileText,
  Download,
  Copy,
  Share2,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { VideoModal } from '../components/VideoModal';
import { DetailedAnalysisModal } from '../components/DetailedAnalysisModal';
import { useStore } from '../store/useStore';
import { QuizQuestionReview, QuizResult } from '../types';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';
import { printElementAsPdf } from '../utils/printPdf';
import { shareTextSummary } from '../utils/shareText';

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
  skillId?: string;
  subjectName?: string;
  sectionName?: string;
  skillName: string;
  mastery: number;
  status: 'weak' | 'average' | 'strong';
  attempts?: number;
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
const arabicOptionLabels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

const getSkillRecommendation = (
  skill: QuizResult['skillsAnalysis'][number] | undefined,
  allSkills: ReturnType<typeof useStore.getState>['skills'],
  topics: ReturnType<typeof useStore.getState>['topics'],
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
  const resolvedTopic = !resolvedSkill
    ? skill.skillId
      ? topics.find((item) => item.id === skill.skillId)
      : topics.find((item) => item.title === skill.skill)
    : undefined;

  if (!resolvedSkill && !resolvedTopic) {
    return {};
  }

  const recommendedLesson = lessons.find(
    (lesson) =>
      ((resolvedSkill && lesson.skillIds?.includes(resolvedSkill.id)) ||
        (resolvedTopic && resolvedTopic.lessonIds?.includes(lesson.id))) &&
      lesson.showOnPlatform !== false &&
      (!lesson.approvalStatus || lesson.approvalStatus === 'approved'),
  );
  const recommendedQuiz = quizzes.find((quiz) =>
    quiz.showOnPlatform !== false &&
    quiz.isPublished !== false &&
    (!quiz.approvalStatus || quiz.approvalStatus === 'approved') &&
    ((resolvedSkill &&
      (quiz.questionIds?.some((questionId) => questions.find((question) => question.id === questionId)?.skillIds?.includes(resolvedSkill.id)) ||
        quiz.skillIds?.includes(resolvedSkill.id))) ||
      (resolvedTopic && resolvedTopic.quizIds?.includes(quiz.id))),
  );
  const recommendedResource = libraryItems.find(
    (item) =>
      ((resolvedSkill && item.skillIds?.includes(resolvedSkill.id)) ||
        (resolvedTopic && item.subjectId === resolvedTopic.subjectId && (!resolvedTopic.sectionId || item.sectionId === resolvedTopic.sectionId))) &&
      item.showOnPlatform !== false &&
      (!item.approvalStatus || item.approvalStatus === 'approved'),
  );
  const recommendationPathId = resolvedSkill?.pathId || resolvedTopic?.pathId;
  const recommendationSubjectId = resolvedSkill?.subjectId || resolvedTopic?.subjectId;
  const recommendationSectionId = resolvedSkill?.sectionId || resolvedTopic?.sectionId;

  return {
    lessonTitle: displayText(recommendedLesson?.title),
    lessonLink:
      recommendationPathId && recommendationSubjectId
        ? `/category/${recommendationPathId}?subject=${recommendationSubjectId}&tab=skills${resolvedTopic?.id ? `&topic=${resolvedTopic.id}&content=lessons` : ''}`
        : undefined,
    lessonVideoUrl: recommendedLesson?.videoUrl,
    quizTitle: displayText(recommendedQuiz?.title),
    quizLink: recommendedQuiz?.id ? `/quiz/${recommendedQuiz.id}` : undefined,
    resourceTitle: displayText(recommendedResource?.title),
    resourceUrl: recommendedResource?.url,
    subjectName: recommendationSubjectId ? displayText(useStore.getState().subjects.find((item) => item.id === recommendationSubjectId)?.name) : undefined,
    sectionName: recommendationSectionId ? displayText(useStore.getState().sections.find((item) => item.id === recommendationSectionId)?.name) : undefined,
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

const getStatusFromMastery = (mastery: number): ResolvedAnalysisItem['status'] => {
  if (mastery >= 80) return 'strong';
  if (mastery >= 60) return 'average';
  return 'weak';
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

const getScoreVisualTone = (score: number) => {
  if (score >= 85) {
    return {
      text: 'text-emerald-600',
      ring: '#10b981',
      soft: 'from-emerald-50 to-white',
    };
  }

  if (score >= 60) {
    return {
      text: 'text-amber-600',
      ring: '#f59e0b',
      soft: 'from-amber-50 to-white',
    };
  }

  return {
    text: 'text-rose-600',
    ring: '#f43f5e',
    soft: 'from-rose-50 to-white',
  };
};

const getStudentFriendlyChecklist = (score: number) => {
  if (score >= 85) {
    return [
      { title: 'حافظ على مستواك', body: 'راجع الأخطاء الصغيرة فقط ولا تطيل المراجعة.' },
      { title: 'تدريب قصير', body: 'حل 5 أسئلة من نفس النوع لتثبيت المهارة.' },
      { title: 'اختبار سريع', body: 'أعد القياس لاحقًا حتى تتأكد أن المستوى ثابت.' },
    ];
  }

  if (score >= 60) {
    return [
      { title: 'راجع مهارة واحدة', body: 'ابدأ بالمهارة الأضعف الظاهرة أمامك.' },
      { title: 'شاهد شرحًا قصيرًا', body: 'لا تبدأ بأسئلة كثيرة قبل فهم الفكرة.' },
      { title: 'تدرب ثم قِس', body: 'حل تدريبًا بسيطًا ثم أعد اختبارًا قصيرًا.' },
    ];
  }

  return [
    { title: 'لا تقلق', body: 'سنبدأ بخطوة صغيرة جدًا حتى لا تتشتت.' },
    { title: 'شرح أولًا', body: 'راجع شرح المهارة الأضعف قبل إعادة الحل.' },
    { title: '5 أسئلة فقط', body: 'تدريب قصير يكفي كبداية، ثم نزيد بالتدريج.' },
  ];
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

const Results: React.FC = () => {
  const { examResults, skills, topics, lessons, quizzes, libraryItems, questions, subjects, sections } = useStore();
  const [viewMode, setViewMode] = React.useState<'summary' | 'review' | 'history' | 'analysis'>('summary');
  const [isAnalysisOpen, setIsAnalysisOpen] = React.useState(false);
  const [videoData, setVideoData] = React.useState<{ url: string; title: string } | null>(null);
  const [copiedSummary, setCopiedSummary] = React.useState(false);
  const [sharedSummary, setSharedSummary] = React.useState(false);
  const [resultDepth, setResultDepth] = React.useState<'simple' | 'full'>('simple');

  const latestResult = examResults[0];
  const questionReviewCount = latestResult?.questionReview?.length || 0;

  const analysisItems: ResolvedAnalysisItem[] = React.useMemo(() => {
    if (!latestResult) return [];

    const aggregated = new Map<
      string,
      ResolvedAnalysisItem & { totalMastery: number; lowestMastery: number }
    >();

    (latestResult.skillsAnalysis || []).forEach((item) => {
        const recommendation = getSkillRecommendation(item, skills, topics, lessons, quizzes, libraryItems, questions);
        const subjectName =
          recommendation.subjectName ||
          (item.subjectId ? displayText(subjects.find((subject) => subject.id === item.subjectId)?.name) : undefined);
        const sectionName =
          recommendation.sectionName ||
          displayText(item.section) ||
          (item.sectionId ? displayText(sections.find((section) => section.id === item.sectionId)?.name) : undefined);
        const skillName = displayText(item.skill) || 'مهارة غير مسماة';
        const skillKey = item.skillId || `${item.subjectId || subjectName || 'subject'}-${item.sectionId || sectionName || 'section'}-${skillName}`;
        const current = aggregated.get(skillKey);

        if (!current) {
          aggregated.set(skillKey, {
            skillId: item.skillId,
            subjectName,
            sectionName,
            skillName,
            mastery: item.mastery,
            status: item.status || getStatusFromMastery(item.mastery),
            attempts: 1,
            lessonTitle: recommendation.lessonTitle,
            lessonLink: recommendation.lessonLink,
            lessonVideoUrl: recommendation.lessonVideoUrl,
            quizTitle: recommendation.quizTitle,
            quizLink: recommendation.quizLink,
            resourceTitle: recommendation.resourceTitle,
            resourceUrl: recommendation.resourceUrl,
            actionText: recommendation.actionText,
            totalMastery: item.mastery,
            lowestMastery: item.mastery,
          });
          return;
        }

        current.attempts = (current.attempts || 0) + 1;
        current.totalMastery += item.mastery;
        current.lowestMastery = Math.min(current.lowestMastery, item.mastery);
        current.mastery = Math.round(current.totalMastery / current.attempts);
        current.status = getStatusFromMastery(current.mastery);

        if (item.mastery <= current.lowestMastery) {
          current.actionText = recommendation.actionText || current.actionText;
          current.lessonTitle = recommendation.lessonTitle || current.lessonTitle;
          current.lessonLink = recommendation.lessonLink || current.lessonLink;
          current.lessonVideoUrl = recommendation.lessonVideoUrl || current.lessonVideoUrl;
          current.quizTitle = recommendation.quizTitle || current.quizTitle;
          current.quizLink = recommendation.quizLink || current.quizLink;
          current.resourceTitle = recommendation.resourceTitle || current.resourceTitle;
          current.resourceUrl = recommendation.resourceUrl || current.resourceUrl;
        }
      });

    return Array.from(aggregated.values())
      .map(({ totalMastery, lowestMastery, ...item }) => item)
      .sort((a, b) => a.mastery - b.mastery);
  }, [latestResult, skills, topics, lessons, quizzes, libraryItems, questions, subjects, sections]);

  const weakestSkill = analysisItems[0];
  const summaryTone = getFriendlyResultMessage(latestResult?.score || 0);
  const scoreTone = getScoreVisualTone(latestResult?.score || 0);
  const strongSkillsCount = analysisItems.filter((item) => item.status === 'strong').length;
  const averageSkillsCount = analysisItems.filter((item) => item.status === 'average').length;
  const weakSkillsCount = analysisItems.filter((item) => item.status === 'weak').length;
  const topThreeFocusSkills = analysisItems.slice(0, 3);
  const isFullResult = resultDepth === 'full';
  const simplestNextStep = weakestSkill?.lessonTitle
    ? 'ابدأ بشرح قصير لهذه المهارة ثم انتقل للتدريب.'
    : weakestSkill?.quizTitle
      ? 'ابدأ بتدريب قصير الآن ثم أعد القياس بعده.'
      : 'ابدأ بخطوة صغيرة على المهارة الأضعف ثم أعد الاختبار لاحقًا.';
  const studentFriendlyChecklist = getStudentFriendlyChecklist(latestResult?.score || 0);
  const quickResultHighlights = React.useMemo(() => {
    const nextSkillLabel = displayText(weakestSkill?.skillName) || 'ابدأ بمراجعة الحلول';
    const nextActionLabel = isFullResult ? simplestNextStep : studentFriendlyChecklist[0]?.title || 'ابدأ بخطوة صغيرة';

    return [
      {
        label: 'الدرجة الحالية',
        value: `${latestResult?.score || 0}%`,
        tone: latestResult?.score && latestResult.score >= 80 ? 'success' : latestResult?.score && latestResult.score >= 60 ? 'warning' : 'danger',
      },
      {
        label: 'أولوية المراجعة',
        value: nextSkillLabel,
        tone: 'default' as const,
      },
      {
        label: 'الخطوة التالية',
        value: nextActionLabel,
        tone: 'default' as const,
      },
    ];
  }, [isFullResult, latestResult?.score, simplestNextStep, studentFriendlyChecklist, weakestSkill?.skillName]);
  const guardianFollowUpSummary = weakestSkill
    ? `نتيجة الاختبار ${latestResult?.score || 0}%. أضعف مهارة ظهرت هي "${weakestSkill.skillName}" بنسبة ${weakestSkill.mastery}%. الخطوة المناسبة الآن: ${weakestSkill.actionText}`
    : `نتيجة الاختبار ${latestResult?.score || 0}%. لا توجد مهارات تفصيلية كافية في هذه المحاولة، والأفضل مراجعة الحلول ثم إعادة اختبار قصير.`;
  const bookSessionLink = React.useMemo(() => {
    if (!weakestSkill) return '/book-session';

    const params = new URLSearchParams();
    if (weakestSkill.skillId) params.set('skillId', weakestSkill.skillId);
    params.set('skillName', weakestSkill.skillName);
    if (weakestSkill.subjectName) params.set('subjectName', weakestSkill.subjectName);
    if (weakestSkill.sectionName) params.set('sectionName', weakestSkill.sectionName);
    params.set('source', 'quiz-result');

    return `/book-session?${params.toString()}`;
  }, [weakestSkill]);
  const copyGuardianSummary = async () => {
    try {
      await navigator.clipboard.writeText(guardianFollowUpSummary);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      setCopiedSummary(false);
    }
  };
  const shareGuardianSummary = async () => {
    try {
      await shareTextSummary('ملخص نتيجة الاختبار', guardianFollowUpSummary);
      setSharedSummary(true);
      window.setTimeout(() => setSharedSummary(false), 1800);
    } catch {
      setSharedSummary(false);
    }
  };

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
    <div id="quiz-result-print-area" className="space-y-6 pb-20">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/dashboard" className="text-gray-500">
            <ArrowRight />
          </Link>
          <h1 className="text-xl font-bold">نتيجة الاختبار</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => printElementAsPdf('quiz-result-print-area', 'نتيجة الاختبار')}
            className="print-hide inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            <Download size={16} />
            تحميل PDF
          </button>
          <button
            onClick={() => setResultDepth((current) => (current === 'simple' ? 'full' : 'simple'))}
            className="print-hide inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {isFullResult ? <Sparkles size={16} /> : <FileText size={16} />}
            {isFullResult ? 'العودة للملخص البسيط' : 'عرض التقرير الكامل'}
          </button>
          <div className={`self-start px-4 py-1 rounded-full text-sm font-bold ${summaryTone.chipClassName}`}>
            {summaryTone.title}
          </div>
        </div>
      </header>

      <Card className="p-4 sm:p-5 border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              ملخص 10 ثوانٍ
            </div>
            <h2 className="mt-3 text-lg sm:text-xl font-black text-gray-900">هذا هو المختصر الذي يهم الطالب وولي الأمر</h2>
            <p className="mt-1 text-sm leading-7 text-gray-500">
              بدل التفاصيل الكثيرة، نعرض لك النتيجة الأساسية ثم نحدد المهارة الأضعف والخطوة التالية مباشرة.
            </p>
          </div>
          <div className="text-xs font-bold text-gray-400">مناسب للجوال والتابلت واللاب توب</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickResultHighlights.map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border px-4 py-4 shadow-sm ${
                item.tone === 'success'
                  ? 'border-emerald-100 bg-emerald-50/70'
                  : item.tone === 'warning'
                    ? 'border-amber-100 bg-amber-50/70'
                    : item.tone === 'danger'
                      ? 'border-rose-100 bg-rose-50/70'
                      : 'border-slate-100 bg-slate-50'
              }`}
            >
              <div className="text-xs font-black text-gray-500">{item.label}</div>
              <div className="mt-2 text-base sm:text-lg font-black leading-7 text-gray-900">{item.value}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className={`p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br ${scoreTone.soft}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2 opacity-60" />
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
                        <Cell key={`cell-${index}`} fill={index === 0 ? scoreTone.ring : donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${scoreTone.text}`}>{latestResult.score}%</span>
                  <span className="text-sm text-gray-500">النتيجة</span>
                </div>
              </div>

              <div className="space-y-3">
                {isFullResult ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <SimpleResultStat label="عدد الأسئلة" value={latestResult.totalQuestions.toString()} />
                      <SimpleResultStat label="الصحيح" value={latestResult.correctAnswers.toString()} tone="success" />
                      <SimpleResultStat label="الخطأ" value={latestResult.wrongAnswers.toString()} tone="danger" />
                      <SimpleResultStat label="وقت الحل" value={latestResult.timeSpent} />
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-black text-gray-800">خريطة المهارات في هذا الاختبار</div>
                          <div className="mt-1 text-xs text-gray-500">نقرأها من الأسئلة التي حللتها، وليست من الدرجة فقط.</div>
                        </div>
                        {latestResult.unanswered > 0 ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            {latestResult.unanswered} بدون إجابة
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-emerald-50 px-3 py-3 text-emerald-700">
                          <div className="text-xl font-black">{strongSkillsCount}</div>
                          <div className="text-[11px] font-bold">قوية</div>
                        </div>
                        <div className="rounded-xl bg-amber-50 px-3 py-3 text-amber-700">
                          <div className="text-xl font-black">{averageSkillsCount}</div>
                          <div className="text-[11px] font-bold">متوسطة</div>
                        </div>
                        <div className="rounded-xl bg-rose-50 px-3 py-3 text-rose-700">
                          <div className="text-xl font-black">{weakSkillsCount}</div>
                          <div className="text-[11px] font-bold">تحتاج دعم</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl border border-white bg-white/85 p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-gray-900">ملخص بسيط جدًا</div>
                        <div className="mt-1 text-xs font-bold text-gray-500">مناسب للطالب وولي الأمر على الجوال والتابلت.</div>
                      </div>
                      <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-black text-gray-700">
                        {latestResult.correctAnswers} من {latestResult.totalQuestions} صحيح
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {studentFriendlyChecklist.map((item, index) => (
                        <div key={item.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-indigo-700 shadow-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-black text-gray-900">{item.title}</div>
                            <div className="mt-1 text-xs font-bold leading-6 text-gray-500">{item.body}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold leading-7 text-indigo-800">
                      {weakestSkill ? `أول مهارة نركز عليها: ${weakestSkill.skillName}` : 'ابدأ بمراجعة الحلول ثم أعد اختبارًا قصيرًا.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={() => setViewMode('review')}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors"
              >
                <Eye size={18} />
                مراجعة الحلول
              </button>
              <button
                onClick={() => setIsAnalysisOpen(true)}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                <BarChart3 size={18} />
                أين أبدأ؟
              </button>
              <Link
                to="/plan"
                className="flex items-center justify-center gap-2 border border-purple-200 text-purple-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-purple-50 transition-colors"
              >
                <CheckCircle2 size={18} />
                خطة قصيرة
              </Link>
            </div>

            {isFullResult ? (
              <div className="print-hide mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <button onClick={() => setViewMode('history')} className="rounded-full bg-gray-50 px-3 py-1.5 text-gray-600 hover:bg-gray-100">
                  <History size={13} className="inline ml-1" />
                  المحاولات السابقة
                </button>
                <Link to="/quiz" className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100">
                  <RefreshCw size={13} className="inline ml-1" />
                  إعادة الاختبار
                </Link>
                <Link to="/quizzes" className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 hover:bg-amber-100">
                  <PlusCircle size={13} className="inline ml-1" />
                  اختبار إضافي
                </Link>
                <Link to="/reports" className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700 hover:bg-indigo-100">
                  <BarChart3 size={13} className="inline ml-1" />
                  تقريري العام
                </Link>
              </div>
            ) : null}

            {isFullResult ? (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-800">ملخص سريع لولي الأمر أو المعلم</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{guardianFollowUpSummary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={copyGuardianSummary}
                      className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-black text-indigo-700 hover:bg-indigo-50"
                    >
                      {copiedSummary ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                      {copiedSummary ? 'تم النسخ' : 'نسخ الملخص'}
                    </button>
                    <button
                      onClick={shareGuardianSummary}
                      className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-black text-emerald-700 hover:bg-emerald-50"
                    >
                      {sharedSummary ? <CheckCircle2 size={13} /> : <Share2 size={13} />}
                      {sharedSummary ? 'تمت المشاركة' : 'مشاركة'}
                    </button>
                    <span className="self-start rounded-full bg-white px-3 py-1 text-[11px] font-black text-indigo-700">
                      مناسب للمتابعة
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <details className="print-hide mt-5 rounded-2xl border border-slate-100 bg-white/80 p-4 text-sm text-slate-700">
                <summary className="cursor-pointer select-none font-black text-slate-800">
                  ملخص ولي الأمر عند الحاجة
                </summary>
                <p className="mt-3 leading-7 text-slate-600">{guardianFollowUpSummary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={copyGuardianSummary}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700 hover:bg-indigo-100"
                  >
                    {copiedSummary ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    {copiedSummary ? 'تم النسخ' : 'نسخ الملخص'}
                  </button>
                  <button
                    onClick={shareGuardianSummary}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 hover:bg-emerald-100"
                  >
                    {sharedSummary ? <CheckCircle2 size={13} /> : <Share2 size={13} />}
                    {sharedSummary ? 'تمت المشاركة' : 'مشاركة'}
                  </button>
                </div>
              </details>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-800">خطوتك التالية</h3>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            اختر خطوة واحدة الآن. المنصة رتبتها لك من الأسهل للأهم حتى لا تتشتت بعد الاختبار.
          </p>

          {!isFullResult ? (
            <div className="mt-5 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 shadow-sm">
                خطوة واحدة تكفي الآن
              </div>
              <h4 className="mt-4 text-lg font-black text-gray-900">
                {weakestSkill ? `ابدأ بـ: ${weakestSkill.skillName}` : 'راجع الحلول بهدوء'}
              </h4>
              <p className="mt-3 text-sm font-bold leading-7 text-gray-600">
                {weakestSkill
                  ? 'لا تحتاج قراءة تقرير طويل الآن. راجع شرح هذه المهارة، ثم حل تدريبًا قصيرًا، وبعدها أعد القياس.'
                  : 'افتح مراجعة الحلول أولًا، ثم اختر اختبارًا قصيرًا لاحقًا.'}
              </p>

              {weakestSkill ? (
                <div className="mt-4 grid gap-2 text-xs font-bold sm:grid-cols-3">
                  {weakestSkill.subjectName ? (
                    <span className="rounded-2xl bg-white px-3 py-2 text-gray-700 shadow-sm">{weakestSkill.subjectName}</span>
                  ) : null}
                  {weakestSkill.sectionName ? (
                    <span className="rounded-2xl bg-white px-3 py-2 text-indigo-700 shadow-sm">{weakestSkill.sectionName}</span>
                  ) : null}
                  <span className="rounded-2xl bg-white px-3 py-2 text-rose-700 shadow-sm">{weakestSkill.skillName}</span>
                </div>
              ) : null}

              <div className="print-hide mt-5 grid gap-2">
                <button
                  onClick={() => setViewMode('review')}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
                >
                  مراجعة الحلول
                </button>
                {weakestSkill?.lessonVideoUrl ? (
                  <button
                    onClick={() => setVideoData({ url: weakestSkill.lessonVideoUrl!, title: `شرح مهارة ${weakestSkill.skillName}` })}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-sm hover:bg-emerald-50"
                  >
                    شاهد شرحًا قصيرًا
                  </button>
                ) : weakestSkill?.lessonLink ? (
                  <Link to={weakestSkill.lessonLink} className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-indigo-700 shadow-sm hover:bg-indigo-50">
                    افتح درس المهارة
                  </Link>
                ) : null}
                <button
                  onClick={() => setResultDepth('full')}
                  className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-50"
                >
                  عرض التقرير الكامل عند الحاجة
                </button>
              </div>
            </div>
          ) : weakestSkill ? (
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
                {weakestSkill.attempts && weakestSkill.attempts > 1 ? (
                  <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black text-rose-700">
                    ظهرت في {weakestSkill.attempts} أسئلة داخل الاختبار
                  </div>
                ) : null}
                <p className="mt-2 text-sm leading-7 text-gray-600">{weakestSkill.actionText}</p>
                <div className="mt-4 h-2 rounded-full bg-white">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${weakestSkill.mastery}%` }} />
                </div>
                <div className="mt-2 text-sm font-bold text-rose-700">{weakestSkill.mastery}%</div>
              </div>

              {!isFullResult ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="mb-2 flex items-center gap-2 text-indigo-800">
                    <Sparkles size={16} />
                    <span className="text-sm font-black">اختصرنا لك النتيجة</span>
                  </div>
                  <p className="text-sm leading-7 text-indigo-700">
                    ركّز الآن على المهارة الأضعف فقط. لو احتجت كل المهارات والخطة العلاجية افتح التقرير الكامل.
                  </p>
                  <button
                    onClick={() => setResultDepth('full')}
                    className="print-hide mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    <FileText size={16} />
                    عرض التقرير الكامل
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-800">
                    <Lightbulb size={16} />
                    ما الذي أفعله الآن؟
                  </div>
                  <p className="mt-3 text-sm leading-7 text-emerald-900">{simplestNextStep}</p>
                  <div className="mt-3 grid gap-2 text-xs font-bold text-emerald-700 sm:grid-cols-3">
                    <span className="rounded-xl bg-white px-3 py-2">1. شرح</span>
                    <span className="rounded-xl bg-white px-3 py-2">2. تدريب</span>
                    <span className="rounded-xl bg-white px-3 py-2">3. إعادة قياس</span>
                  </div>
                </div>
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
                {weakestSkill.mastery < 75 ? (
                  <Link to={bookSessionLink} className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 transition-colors">
                    حجز حصة علاجية لهذه المهارة
                  </Link>
                ) : null}
                {isFullResult ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    <div className="mb-2 text-sm font-black text-slate-800">خطة علاجية قصيرة</div>
                    <div>1. افهم المهارة: {weakestSkill.lessonTitle ? `راجع ${weakestSkill.lessonTitle}` : `ابدأ بشرح بسيط عن ${weakestSkill.skillName}`}</div>
                    <div className="mt-1">2. تدرب عليها: {weakestSkill.quizTitle ? `حل ${weakestSkill.quizTitle}` : 'حل 5 إلى 10 أسئلة قصيرة.'}</div>
                    <div className="mt-1">3. أعد القياس: ارجع لاختبار قصير وتأكد أن النسبة ارتفعت.</div>
                  </div>
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

      {isFullResult ? (
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
                        {item.attempts && item.attempts > 1 ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {item.attempts} أسئلة
                          </span>
                        ) : null}
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
      ) : null}

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
  const { favorites, reviewLater, toggleFavorite, toggleReviewLater } = useStore();
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
  const isReviewLater = reviewLater.includes(q.questionId);

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
          <button
            onClick={() => toggleReviewLater(q.questionId)}
            className={`${isReviewLater ? 'bg-purple-600 hover:bg-purple-700' : 'bg-amber-500 hover:bg-amber-600'} text-white px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors`}
          >
            <Star size={16} className={isReviewLater ? 'fill-current' : ''} />
            {isReviewLater ? 'محدد للمراجعة' : 'مراجعة لاحقًا'}
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6 mb-8">
            {q.options.map((option, i) => {
              const label = arabicOptionLabels[i] || `${i + 1}`;
              const isCorrect = i === q.correctOptionIndex;
              const isUser = i === q.selectedOptionIndex;

              let borderClass = 'border-gray-200 text-gray-400';
              let bgClass = 'bg-white';
              let helperLabel = '';

              if (showExplanation) {
                if (isCorrect) {
                  borderClass = 'border-emerald-500 text-emerald-600';
                  bgClass = 'bg-emerald-50';
                  helperLabel = 'الإجابة الصحيحة';
                } else if (isUser && !isCorrect) {
                  borderClass = 'border-red-500 text-red-600';
                  bgClass = 'bg-red-50';
                  helperLabel = 'اختيارك';
                }
              } else if (isUser) {
                borderClass = 'border-indigo-500 text-indigo-600';
                bgClass = 'bg-indigo-50';
                helperLabel = 'اختيارك';
              }

              return (
                <div key={`${label}-${i}`} className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white/70 p-3">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl font-black transition-all ${borderClass} ${bgClass}`}>
                    {label}
                  </div>
                  <span className="text-sm font-bold text-gray-700 text-center leading-7">{displayText(option)}</span>
                  {helperLabel ? (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isCorrect ? 'bg-emerald-100 text-emerald-700' : isUser ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                      {helperLabel}
                    </span>
                  ) : null}
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
  const { skills, topics, lessons, quizzes, libraryItems, questions, subjects, sections } = useStore();
  const analysisItems = (result.skillsAnalysis || [])
    .map((item) => {
      const recommendation = getSkillRecommendation(item, skills, topics, lessons, quizzes, libraryItems, questions);
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
