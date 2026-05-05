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
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { VideoModal } from '../components/VideoModal';
import { DetailedAnalysisModal } from '../components/DetailedAnalysisModal';
import { useStore } from '../store/useStore';
import { QuizQuestionReview, QuizResult } from '../types';
import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';
import { printElementAsPdf } from '../utils/printPdf';
import { shareTextSummary } from '../utils/shareText';
import { matchesEntityId } from '../utils/entityIds';
import { flattenMockExamQuestionIds } from '../utils/mockExam';
import { hasInlineQuestionMedia, normalizeQuestionHtml } from '../utils/questionHtml';
import { getQuizOptionButtonHeightClass, getQuizOptionGridClass, getQuizQuestionMapButtonClass, resolveQuestionFromBank, toQuestionReviewFromBank } from '../utils/quizPresentation';

interface SkillRecommendation {
  lessonTitle?: string;
  lessonLink?: string;
  lessonVideoUrl?: string;
  lessonTopicTitle?: string;
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
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  subjectName?: string;
  sectionName?: string;
  skillName: string;
  mastery: number;
  status: 'weak' | 'average' | 'strong';
  attempts?: number;
  lessonTitle?: string;
  lessonLink?: string;
  lessonVideoUrl?: string;
  lessonTopicTitle?: string;
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
  topics: ReturnType<typeof useStore.getState>['topics'],
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
    (item) =>
      item.skillIds?.includes(resolvedSkill.id) &&
      item.showOnPlatform !== false &&
      (!item.approvalStatus || item.approvalStatus === 'approved'),
  );
  const recommendationPathId = resolvedSkill.pathId;
  const recommendationSubjectId = resolvedSkill.subjectId;
  const recommendationSectionId = resolvedSkill.sectionId;
  const recommendedTopic =
    recommendedLesson && recommendationPathId && recommendationSubjectId
      ? topics.find(
          (topic) =>
            topic.pathId === recommendationPathId &&
            topic.subjectId === recommendationSubjectId &&
            topic.showOnPlatform !== false &&
            (topic.lessonIds || []).some((lessonId) => matchesEntityId(recommendedLesson, lessonId)),
        )
      : undefined;
  const lessonLink =
    recommendationPathId && recommendationSubjectId
      ? (() => {
          const params = new URLSearchParams({
            subject: recommendationSubjectId,
            tab: 'skills',
          });

          if (recommendedTopic?.id && recommendedLesson?.id) {
            params.set('topic', recommendedTopic.id);
            params.set('content', 'lessons');
            params.set('lesson', recommendedLesson.id);
          }

          return `/category/${recommendationPathId}?${params.toString()}`;
        })()
      : undefined;

  return {
    lessonTitle: displayText(recommendedLesson?.title),
    lessonLink,
    lessonVideoUrl: recommendedLesson?.videoUrl,
    lessonTopicTitle: displayText(recommendedTopic?.title),
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
      message: 'نتيجة قوية. راجع الأخطاء فقط ثم أكمل.',
      chipClassName: 'bg-emerald-50 text-emerald-700',
    };
  }

  if (score >= 60) {
    return {
      title: 'أداء جيد',
      message: 'أداؤك جيد. ركز على أضعف مهارة ثم أعد التدريب.',
      chipClassName: 'bg-amber-50 text-amber-700',
    };
  }

  return {
    title: 'يحتاج مراجعة',
    message: 'ابدأ بأضعف مهارة، ثم حل تدريبًا قصيرًا.',
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
    { title: 'ابدأ من الأضعف', body: 'راجع مهارة واحدة فقط الآن.' },
    { title: 'شرح قصير', body: 'افهم الفكرة قبل إعادة الحل.' },
    { title: '5 أسئلة فقط', body: 'تدريب قصير يكفي كبداية.' },
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
  const { examResults, skills, lessons, quizzes, libraryItems, questions, topics, subjects, sections } = useStore();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'summary' | 'review' | 'history' | 'analysis'>('summary');
  const [isAnalysisOpen, setIsAnalysisOpen] = React.useState(false);
  const [videoData, setVideoData] = React.useState<{ url: string; title: string } | null>(null);
  const [copiedSummary, setCopiedSummary] = React.useState(false);
  const [sharedSummary, setSharedSummary] = React.useState(false);
  const [resultDepth, setResultDepth] = React.useState<'simple' | 'full'>('simple');

  const requestedAttempt = searchParams.get('attempt');
  const requestedView = searchParams.get('view');
  const latestResult = React.useMemo(() => {
    if (!requestedAttempt) return examResults[0];

    const decodedAttempt = decodeURIComponent(requestedAttempt);
    return (
      examResults.find((result) => String(result.date) === decodedAttempt) ||
      examResults.find((result) => String(result.quizId) === decodedAttempt) ||
      examResults[0]
    );
  }, [examResults, requestedAttempt]);

  React.useEffect(() => {
    if (requestedView === 'review' || requestedView === 'history' || requestedView === 'analysis') {
      setViewMode(requestedView);
      return;
    }

    setViewMode('summary');
  }, [requestedAttempt, requestedView]);
  const questionReviewCount = latestResult?.questionReview?.length || 0;
  const retryQuizLink =
    latestResult?.quizId && !latestResult.quizId.startsWith('self-quiz')
      ? `/quiz/${latestResult.quizId}`
      : '/quiz';
  const safeResultReturnTo = React.useMemo(() => {
    const target = latestResult?.returnTo || '';
    return target.startsWith('/') && !target.startsWith('//') ? target : '';
  }, [latestResult?.returnTo]);
  const resultReturnLabel = React.useMemo(() => {
    if (latestResult?.source === 'foundation') return 'العودة لموضوع التأسيس';
    if (latestResult?.source === 'course') return 'العودة للدورة';
    if (latestResult?.source === 'mock-exam') return 'العودة للاختبارات المحاكية';
    return 'العودة للمكان السابق';
  }, [latestResult?.source]);

  const analysisItems: ResolvedAnalysisItem[] = React.useMemo(() => {
    if (!latestResult) return [];

    const aggregated = new Map<
      string,
      ResolvedAnalysisItem & { totalMastery: number; lowestMastery: number }
    >();

    (latestResult.skillsAnalysis || []).forEach((item) => {
        const recommendation = getSkillRecommendation(item, skills, lessons, quizzes, libraryItems, questions, topics);
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
            pathId: item.pathId,
            subjectId: item.subjectId,
            sectionId: item.sectionId,
            subjectName,
            sectionName,
            skillName,
            mastery: item.mastery,
            status: item.status || getStatusFromMastery(item.mastery),
            attempts: 1,
            lessonTitle: recommendation.lessonTitle,
            lessonLink: recommendation.lessonLink,
            lessonVideoUrl: recommendation.lessonVideoUrl,
            lessonTopicTitle: recommendation.lessonTopicTitle,
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
          current.lessonTopicTitle = recommendation.lessonTopicTitle || current.lessonTopicTitle;
          current.quizTitle = recommendation.quizTitle || current.quizTitle;
          current.quizLink = recommendation.quizLink || current.quizLink;
          current.resourceTitle = recommendation.resourceTitle || current.resourceTitle;
          current.resourceUrl = recommendation.resourceUrl || current.resourceUrl;
        }
      });

    return Array.from(aggregated.values())
      .map(({ totalMastery, lowestMastery, ...item }) => item)
      .sort((a, b) => a.mastery - b.mastery);
  }, [latestResult, skills, lessons, quizzes, libraryItems, questions, topics, subjects, sections]);

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
  const additionalQuizLink = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set('mode', 'self');
    params.set('autostart', '1');
    params.set('questionCount', String(Math.max(5, Math.min(20, latestResult?.totalQuestions || 7))));
    params.set('timeLimit', '20');

    const skillIds = analysisItems
      .filter((item) => item.skillId && (item.status === 'weak' || item.mastery < 70))
      .slice(0, 3)
      .map((item) => item.skillId as string);
    const scopedSkills = skillIds
      .map((skillId) => skills.find((skill) => skill.id === skillId))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));
    const pathIds = Array.from(new Set(scopedSkills.map((skill) => skill.pathId).filter(Boolean)));
    const subjectIds = Array.from(new Set(scopedSkills.map((skill) => skill.subjectId).filter(Boolean)));
    const sectionIds = Array.from(new Set(scopedSkills.map((skill) => skill.sectionId).filter(Boolean)));

    if (pathIds.length === 1) params.set('pathId', pathIds[0]);
    else if (weakestSkill?.pathId) params.set('pathId', weakestSkill.pathId);
    if (subjectIds.length === 1) params.set('subjectId', subjectIds[0]);
    else if (weakestSkill?.subjectId) params.set('subjectId', weakestSkill.subjectId);
    if (sectionIds.length === 1) params.set('sectionId', sectionIds[0]);

    if (skillIds.length > 0) {
      params.set('skillIds', skillIds.join(','));
    }

    return `/quiz?${params.toString()}`;
  }, [analysisItems, latestResult?.totalQuestions, skills, weakestSkill]);
  const nextActionCards = React.useMemo(() => {
    if (!weakestSkill) {
      return [
        {
          id: 'review',
          title: 'راجع الحلول أولًا',
          body: 'افتح مراجعة الحلول لتعرف مواضع الخطأ قبل أي تدريب جديد.',
          label: 'مراجعة الحلول',
          tone: 'emerald',
        },
      ];
    }

    const cards: Array<{
      id: 'lesson' | 'video' | 'quiz' | 'resource' | 'session';
      title: string;
      body: string;
      label: string;
      tone: 'indigo' | 'emerald' | 'amber' | 'slate' | 'rose';
      to?: string;
      href?: string;
      videoUrl?: string;
    }> = [];

    if (weakestSkill.lessonLink) {
      cards.push({
        id: 'lesson',
        title: 'ابدأ بالشرح المرتبط',
        body: weakestSkill.lessonTopicTitle
          ? `يفتح لك موضوع ${weakestSkill.lessonTopicTitle} مباشرة.`
          : weakestSkill.lessonTitle
            ? `يفتح لك درس ${weakestSkill.lessonTitle}.`
            : 'يفتح لك مكان الدرس داخل المسار.',
        label: 'فتح الدرس',
        tone: 'indigo',
        to: weakestSkill.lessonLink,
      });
    } else if (weakestSkill.lessonVideoUrl) {
      cards.push({
        id: 'video',
        title: 'شاهد شرحًا سريعًا',
        body: weakestSkill.lessonTitle ? `ابدأ بفيديو ${weakestSkill.lessonTitle}.` : 'شاهد فيديو قصير قبل التدريب.',
        label: 'تشغيل الفيديو',
        tone: 'emerald',
        videoUrl: weakestSkill.lessonVideoUrl,
      });
    }

    if (weakestSkill.quizLink) {
      cards.push({
        id: 'quiz',
        title: 'حل تدريبًا قصيرًا',
        body: weakestSkill.quizTitle ? `التدريب المناسب الآن: ${weakestSkill.quizTitle}.` : 'تدريب سريع على نفس المهارة.',
        label: 'بدء التدريب',
        tone: 'amber',
        to: weakestSkill.quizLink,
      });
    }

    if (weakestSkill.resourceUrl) {
      cards.push({
        id: 'resource',
        title: 'راجع الملف الداعم',
        body: weakestSkill.resourceTitle || 'ملف مختصر يساعدك قبل إعادة المحاولة.',
        label: 'فتح الملف',
        tone: 'slate',
        href: weakestSkill.resourceUrl,
      });
    }

    if (weakestSkill.mastery < 75) {
      cards.push({
        id: 'session',
        title: 'اطلب متابعة عند الحاجة',
        body: 'لو المهارة ما زالت صعبة بعد الشرح والتدريب، احجز متابعة عليها.',
        label: 'حجز متابعة',
        tone: 'rose',
        to: bookSessionLink,
      });
    }

    return cards.slice(0, 4);
  }, [bookSessionLink, weakestSkill]);
  const postResultJourney = React.useMemo(() => {
    const lessonTitle = weakestSkill?.lessonTopicTitle || weakestSkill?.lessonTitle || weakestSkill?.skillName;
    const quizTitle = weakestSkill?.quizTitle || 'تدريب قصير على نفس المهارة';

    return [
      {
        id: 'review',
        title: 'راجع موضع الخطأ',
        body: questionReviewCount > 0 ? `${questionReviewCount} سؤال متاح للمراجعة.` : 'تفاصيل الحلول غير متاحة لهذه المحاولة.',
        label: 'مراجعة الحلول',
        Icon: Eye,
        tone: 'emerald',
        action: 'review' as const,
        disabled: questionReviewCount === 0,
      },
      {
        id: 'learn',
        title: 'افهم المهارة',
        body: weakestSkill ? `ابدأ بشرح ${lessonTitle}.` : 'افتح التقرير لتحديد المهارة التي تحتاج شرحًا.',
        label: weakestSkill?.lessonLink ? 'فتح الشرح' : weakestSkill?.lessonVideoUrl ? 'تشغيل الشرح' : 'فتح التقرير',
        Icon: PlayCircle,
        tone: 'indigo',
        to: weakestSkill?.lessonLink || (!weakestSkill?.lessonVideoUrl ? '/reports' : undefined),
        videoUrl: weakestSkill?.lessonVideoUrl,
      },
      {
        id: 'practice',
        title: 'تدرب ثم قِس',
        body: weakestSkill ? quizTitle : 'اختر تدريبًا قصيرًا ثم أعد القياس.',
        label: weakestSkill?.quizLink ? 'بدء التدريب' : 'اختيار تدريب',
        Icon: Target,
        tone: 'amber',
        to: weakestSkill?.quizLink || '/quizzes',
      },
      {
        id: 'track',
        title: 'تابع الخطة',
        body: 'ارجع للتقرير العام لترى هل تحسنت المهارة بعد المحاولة القادمة.',
        label: 'فتح التقرير',
        Icon: BarChart3,
        tone: 'slate',
        to: '/reports',
      },
    ];
  }, [questionReviewCount, weakestSkill]);
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
    <div id="quiz-result-print-area" className="mx-auto max-w-5xl space-y-6 pb-20">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/dashboard" className="text-gray-500">
            <ArrowRight />
          </Link>
          <h1 className="text-xl font-bold">نتيجة الاختبار</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {safeResultReturnTo ? (
            <Link
              to={safeResultReturnTo}
              className="print-hide inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              <ArrowRight size={16} />
              {resultReturnLabel}
            </Link>
          ) : null}
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

      <Card className={`p-4 sm:p-5 border border-slate-100 bg-white shadow-sm ${isFullResult ? '' : 'hidden'}`}>
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

      <Card className={`p-4 sm:p-5 border-indigo-100 bg-white ${isFullResult ? '' : 'hidden'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              <Target size={14} />
              ابدأ من هنا
            </div>
            <h2 className="mt-3 text-lg font-black text-gray-900">
              {weakestSkill ? `خطة بسيطة لمهارة: ${weakestSkill.skillName}` : 'خطة بسيطة بعد الاختبار'}
            </h2>
            <p className="mt-1 text-sm leading-7 text-gray-500">
              اختصرنا الطريق إلى خطوات عملية. افتح أول خطوة، ثم ارجع للتدريب والقياس.
            </p>
          </div>
          {weakestSkill ? (
            <span className="self-start rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
              مستوى المهارة {weakestSkill.mastery}%
            </span>
          ) : null}
        </div>

        <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-black text-gray-900">مسار ما بعد الاختبار</div>
              <p className="text-xs font-bold leading-6 text-gray-500">اتبعها بالترتيب حتى تتحول النتيجة إلى تحسين فعلي.</p>
            </div>
            <span className="self-start rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700">
              نتيجة ثم علاج ثم قياس
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {postResultJourney.map((step, index) => {
              const stepAction = (step as { action?: 'review' }).action;
              const stepVideoUrl = (step as { videoUrl?: string }).videoUrl;
              const toneClasses = {
                emerald: 'border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50',
                indigo: 'border-indigo-100 bg-white text-indigo-800 hover:bg-indigo-50',
                amber: 'border-amber-100 bg-white text-amber-800 hover:bg-amber-50',
                slate: 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100',
              }[step.tone];
              const content = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-xs font-black">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-800">{index + 1}</span>
                      <step.Icon size={15} />
                    </span>
                    <span className="text-[11px] font-black opacity-70">{step.label}</span>
                  </div>
                  <div className="mt-3 text-sm font-black text-gray-900">{step.title}</div>
                  <p className="mt-1 text-xs font-bold leading-6 opacity-75">{step.body}</p>
                </>
              );

              if (step.to) {
                return (
                  <Link key={step.id} to={step.to} className={`min-h-[128px] rounded-2xl border p-3 transition-colors ${toneClasses}`}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={step.disabled}
                  onClick={() => {
                    if (stepAction === 'review') {
                      setViewMode('review');
                      return;
                    }
                    if (stepVideoUrl) {
                      setVideoData({ url: stepVideoUrl, title: weakestSkill ? `شرح مهارة ${weakestSkill.skillName}` : 'شرح سريع' });
                    }
                  }}
                  className={`min-h-[128px] rounded-2xl border p-3 text-right transition-colors disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-400 ${toneClasses}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {nextActionCards.map((card) => {
            const toneClasses = {
              indigo: 'border-indigo-100 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
              emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
              amber: 'border-amber-100 bg-amber-50 text-amber-800 hover:bg-amber-100',
              slate: 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100',
              rose: 'border-rose-100 bg-rose-50 text-rose-800 hover:bg-rose-100',
            }[card.tone];
            const icon =
              card.id === 'lesson' || card.id === 'video' ? (
                <PlayCircle size={18} />
              ) : card.id === 'quiz' ? (
                <Target size={18} />
              ) : card.id === 'resource' ? (
                <BookOpen size={18} />
              ) : (
                <PlusCircle size={18} />
              );
            const content = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm">{icon}</span>
                  <span className="text-xs font-black opacity-75">{card.label}</span>
                </div>
                <div className="mt-4 text-sm font-black">{card.title}</div>
                <p className="mt-2 text-xs font-bold leading-6 opacity-75">{card.body}</p>
              </>
            );

            if ('to' in card && card.to) {
              return (
                <Link key={card.id} to={card.to} className={`rounded-2xl border p-4 transition-colors ${toneClasses}`}>
                  {content}
                </Link>
              );
            }

            if ('href' in card && card.href) {
              return (
                <a key={card.id} href={card.href} target="_blank" rel="noreferrer" className={`rounded-2xl border p-4 transition-colors ${toneClasses}`}>
                  {content}
                </a>
              );
            }

            return (
              <button
                key={card.id}
                onClick={() => {
                  if ('videoUrl' in card && card.videoUrl) {
                    setVideoData({ url: card.videoUrl, title: weakestSkill ? `شرح مهارة ${weakestSkill.skillName}` : 'شرح سريع' });
                    return;
                  }
                  setViewMode('review');
                }}
                className={`rounded-2xl border p-4 text-right transition-colors ${toneClasses}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className={`p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br ${scoreTone.soft}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2 opacity-60" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight break-words">{displayText(latestResult.quizTitle)}</h2>
                {isFullResult ? <p className="mt-2 text-sm leading-7 text-gray-500">{summaryTone.message}</p> : null}
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-center">
                <div className="text-xs font-bold text-gray-500">آخر محاولة</div>
                <div className="mt-1 text-sm font-bold text-gray-800">{new Date(latestResult.date).toLocaleDateString('ar-SA')}</div>
              </div>
            </div>

            {isFullResult ? (
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
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
                <div className="rounded-3xl border border-white bg-white/95 p-5 text-center shadow-sm">
                  <div className="relative mx-auto h-44 max-w-[190px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          innerRadius={56}
                          outerRadius={74}
                          paddingAngle={0}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`simple-cell-${index}`} fill={index === 0 ? scoreTone.ring : '#e5e7eb'} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-black ${scoreTone.text}`}>{latestResult.score}%</span>
                      <span className="mt-1 text-xs font-black text-gray-500">درجتك</span>
                    </div>
                  </div>
                  <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${summaryTone.chipClassName}`}>
                    {summaryTone.title}
                  </div>
                </div>

                <div className="rounded-3xl border border-white bg-white/95 p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">ملخص النتيجة</h3>
                      <p className="mt-1 text-sm font-bold leading-7 text-gray-500">
                        ركز على الخطوة التالية فقط، والتفاصيل موجودة عند الحاجة.
                      </p>
                    </div>
                    {latestResult.unanswered > 0 ? (
                      <span className="self-start rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                        {latestResult.unanswered} بدون إجابة
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SimpleResultStat label="الأسئلة" value={latestResult.totalQuestions.toString()} />
                    <SimpleResultStat label="الصحيح" value={latestResult.correctAnswers.toString()} tone="success" />
                    <SimpleResultStat label="الخطأ" value={latestResult.wrongAnswers.toString()} tone="danger" />
                    <SimpleResultStat label="الوقت" value={latestResult.timeSpent} />
                  </div>

                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-4">
                    <div className="text-xs font-black text-indigo-600">أول تركيز</div>
                    <div className="mt-1 text-base font-black text-slate-900">
                      {weakestSkill ? weakestSkill.skillName : 'مراجعة الحلول ثم اختبار قصير'}
                    </div>
                    <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                      {weakestSkill
                        ? 'افتح شرح المهارة، ثم حل تدريبًا قصيرًا، وبعدها أعد القياس.'
                        : 'ابدأ بمراجعة الحلول حتى تعرف أين تحتاج تدريبًا.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() => {
                  if (questionReviewCount > 0) {
                    setViewMode('review');
                  }
                }}
                disabled={questionReviewCount === 0}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
              >
                <Eye size={18} />
                {questionReviewCount > 0 ? 'مراجعة الحلول' : 'المراجعة غير متاحة'}
              </button>
              <Link
                to={retryQuizLink}
                className="flex items-center justify-center gap-2 border border-emerald-200 bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors"
              >
                <RefreshCw size={18} />
                إعادة الاختبار
              </Link>
              <Link
                to={additionalQuizLink}
                className="flex items-center justify-center gap-2 border border-amber-200 bg-white text-amber-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-amber-50 transition-colors"
              >
                <PlusCircle size={18} />
                اختبار إضافي
              </Link>
              <button
                onClick={() => setIsAnalysisOpen(true)}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                <BarChart3 size={18} />
                تقرير تفصيلي
              </button>
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
                <Link to={additionalQuizLink} className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 hover:bg-amber-100">
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
            ) : null}
          </div>
        </Card>

        <Card className={`p-4 sm:p-6 ${isFullResult ? '' : 'hidden'}`}>
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
                  onClick={() => questionReviewCount > 0 && setViewMode('review')}
                  disabled={questionReviewCount === 0}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {questionReviewCount > 0 ? 'مراجعة الحلول' : 'المراجعة غير متاحة'}
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
  const { favorites, reviewLater, toggleFavorite, toggleReviewLater, questions: questionBank, quizzes } = useStore();
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [showExplanation, setShowExplanation] = React.useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = React.useState<string | null>(null);

  const questions: QuizQuestionReview[] = React.useMemo(() => {
    const reviewById = new Map((result.questionReview || []).map((question) => [question.questionId, question]));
    const quiz = quizzes.find((item) => item.id === result.quizId);
    const quizQuestionIds = quiz ? flattenMockExamQuestionIds(quiz) : [];

    if (quizQuestionIds.length === 0 || (result.questionReview || []).length >= quizQuestionIds.length) {
      return result.questionReview || [];
    }

    return quizQuestionIds
      .map((questionId) => {
        const savedReview = reviewById.get(questionId);
        const sourceQuestion = resolveQuestionFromBank(questionBank, questionId);
        if (!sourceQuestion) return savedReview || null;
        return toQuestionReviewFromBank(sourceQuestion, savedReview);
      })
      .filter((question): question is QuizQuestionReview => Boolean(question));
  }, [questionBank, quizzes, result.questionReview, result.quizId, result.totalQuestions]);
  const q = questions[currentIdx];
  const questionHasInlineMedia = hasInlineQuestionMedia(q?.text);
  const handleInlineQuestionImageClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as Element | null;
    const image =
      target instanceof HTMLImageElement
        ? target
        : target?.closest('img') instanceof HTMLImageElement
          ? target.closest('img')
          : null;

    if (!image?.src) return;
    event.preventDefault();
    setZoomedImageUrl(image.src);
  };

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
  const reviewOptionLayout = 'horizontal' as const;

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-5 pb-20 animate-fade-in">
      <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowRight />
          </button>
          <div>
            <h1 className="text-xl font-bold">مراجعة الحلول</h1>
            <p className="mt-1 text-sm text-gray-500">نفس السؤال، نفس الاختيارات، مع إمكانية إظهار الحل عند الحاجة.</p>
          </div>
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

      <Card className="p-0 overflow-hidden border border-gray-100 shadow-sm">
        <div className="p-3 sm:p-8 bg-white">
          <div className="bg-gray-50 rounded-2xl p-4 sm:p-8 mb-5 sm:mb-8 flex flex-col items-center justify-center border border-gray-100 min-h-[180px] sm:min-h-[220px]">
            <div
              onClick={handleInlineQuestionImageClick}
              className="mb-5 sm:mb-6 px-2 text-center text-base sm:text-xl font-bold leading-loose text-gray-800 sm:px-4 [&_img]:cursor-zoom-in"
              dangerouslySetInnerHTML={{ __html: `(${currentIdx + 1}) ${normalizeQuestionHtml(q.text)}` }}
            />
            {q.imageUrl ? (
              <button
                type="button"
                onClick={() => setZoomedImageUrl(q.imageUrl || null)}
                className="block w-full cursor-zoom-in rounded-2xl border border-gray-200 bg-white p-2 sm:p-3 shadow-sm"
              >
                <img src={q.imageUrl} alt="صورة السؤال" className="mx-auto max-h-56 sm:max-h-64 w-full object-contain" referrerPolicy="no-referrer" />
              </button>
            ) : !questionHasInlineMedia ? null : null}
          </div>

          <div className={`grid ${getQuizOptionGridClass(q.options, reviewOptionLayout)} gap-2 sm:gap-3 mb-5 sm:mb-8`}>
            {q.options.map((option, i) => {
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
                <button
                  key={`${q.questionId}-${i}`}
                  type="button"
                  className={`group flex ${getQuizOptionButtonHeightClass(q.options, reviewOptionLayout)} items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-1.5 text-right transition-all ${borderClass} ${bgClass} hover:shadow-sm`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${borderClass} ${bgClass}`} />
                    <span
                      className="flex-1 text-center text-sm font-bold leading-6 text-gray-700 break-words"
                      dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(option) }}
                    />
                  </div>
                  {helperLabel ? (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : showExplanation && isUser
                            ? 'bg-rose-100 text-rose-700'
                            : isUser
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {helperLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-50 p-3 sm:p-4 border-t border-gray-100 flex flex-col gap-3 sm:gap-4">
          <div className="rounded-2xl bg-white p-2.5 sm:p-3">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10px] sm:text-[11px] font-black text-gray-600">
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-indigo-600 ring-2 ring-indigo-100" />السؤال الحالي</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />إجابة صحيحة</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-rose-500 ring-2 ring-rose-100" />إجابة خاطئة</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-100 ring-2 ring-amber-200" />لم يجب</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 sm:gap-2">
            {questions.map((question, index) => {
              const isCurrent = index === currentIdx;
              const wasAnswered = typeof question.selectedOptionIndex === 'number';
              const wasCorrect = question.isCorrect;
              const mapState = isCurrent
                ? 'current'
                : !wasAnswered
                  ? 'unanswered'
                  : wasCorrect
                    ? 'correct'
                    : 'wrong';

              return (
                <button
                  key={`${question.questionId}-${index}`}
                  type="button"
                  onClick={() => {
                    setCurrentIdx(index);
                    setShowExplanation(false);
                  }}
                  className={`h-8 sm:h-10 rounded-lg sm:rounded-xl border-2 text-xs sm:text-sm font-black transition ${getQuizQuestionMapButtonClass(mapState)}`}
                  title={!wasAnswered ? 'لم تتم الإجابة' : wasCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                >
                  {index + 1}
                </button>
              );
            })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {q.videoUrl ? (
              <button
                onClick={() => onShowVideo(q.videoUrl!, `شرح السؤال ${currentIdx + 1}`)}
                className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
              >
                <PlayCircle size={20} />
                شرح الفيديو
              </button>
            ) : null}
            <button
              onClick={() => setShowExplanation((value) => !value)}
              className={`px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                showExplanation
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              <Eye size={20} />
              {showExplanation ? 'إخفاء الحل' : 'إظهار الحل'}
            </button>
            <button
              onClick={() => {
                setCurrentIdx((prev) => Math.max(0, prev - 1));
                setShowExplanation(false);
              }}
              disabled={currentIdx === 0}
              className="bg-sky-50 text-sky-700 border border-sky-200 px-6 py-2.5 rounded-xl font-bold disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-100 disabled:text-gray-400 transition-all hover:bg-sky-100 flex items-center justify-center gap-2"
            >
              <ArrowRight size={18} />
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
              className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
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
                  اختيارك: {displayText(q.options[q.selectedOptionIndex]).replace(/<[^>]*>/g, ' ')}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700">لم تُجب عن هذا السؤال</span>
              )}
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                الإجابة الصحيحة: {displayText(q.options[q.correctOptionIndex]).replace(/<[^>]*>/g, ' ')}
              </span>
            </div>

            {q.explanation ? (
              <div>
                <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  توضيح الحل الصحيح:
                </h4>
                <div className="text-gray-700 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(q.explanation) }} />
              </div>
            ) : (
              <p className="text-gray-600 leading-relaxed">لا يوجد شرح نصي محفوظ لهذا السؤال، ويمكنك الاعتماد على الفيديو إذا كان متاحًا.</p>
            )}
          </Card>
        </div>
      ) : null}

      {zoomedImageUrl ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 sm:p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImageUrl(null)}
            className="absolute left-3 top-3 sm:left-4 sm:top-4 rounded-full bg-white px-4 py-2 text-sm font-black text-gray-800 shadow-lg"
          >
            إغلاق
          </button>
          <img
            src={zoomedImageUrl}
            alt="تكبير صورة السؤال"
            className="max-h-[82vh] sm:max-h-[90vh] max-w-[96vw] rounded-2xl bg-white object-contain"
            referrerPolicy="no-referrer"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
};

const DetailedAnalysis = ({ onBack, result }: { onBack: () => void; result: QuizResult }) => {
  const { skills, lessons, quizzes, libraryItems, questions, topics, subjects, sections } = useStore();
  const analysisItems = (result.skillsAnalysis || [])
    .map((item) => {
      const recommendation = getSkillRecommendation(item, skills, lessons, quizzes, libraryItems, questions, topics);
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
        {attempts.map((attempt, index) => {
          const weakSkill = [...(attempt.skillsAnalysis || [])].sort((a, b) => a.mastery - b.mastery)[0];
          const attemptLink = `/results?attempt=${encodeURIComponent(String(attempt.date || attempt.quizId))}`;

          return (
            <Card key={`${attempt.quizId}-${attempt.date}-${index}`} className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                      attempt.score >= 75 ? 'bg-emerald-100 text-emerald-700' : attempt.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {attempt.score}%
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black leading-7 text-gray-900">{displayText(attempt.quizTitle)}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                      <span>{new Date(attempt.date).toLocaleDateString('ar-SA')}</span>
                      <span>{attempt.timeSpent}</span>
                      <span>{attempt.totalQuestions} سؤال</span>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 md:min-w-[360px]">
                  <Link to={attemptLink} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-indigo-700">
                    تحليل المحاولة
                  </Link>
                  <Link to={`${attemptLink}&view=review`} className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-center text-sm font-black text-emerald-700 hover:bg-emerald-100">
                    مراجعة الحلول
                  </Link>
                  <Link to="/reports" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-black text-slate-700 hover:bg-slate-50">
                    التقرير العام
                  </Link>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs font-black text-slate-500">أضعف مهارة في هذه المحاولة</div>
                <div className="mt-1 text-sm font-black text-slate-900">
                  {weakSkill ? `${displayText(weakSkill.skill)} - ${weakSkill.mastery}%` : 'لا توجد مهارة ضعيفة واضحة'}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Results;
