import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Course, PackageContentType, Question, Quiz, QuizResult } from '../types';
import { Clock, AlertCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, FileQuestion, Target, Star, Moon, Sun, PauseCircle, Save, Bookmark, Video, BookOpen, LayoutGrid, ZoomIn } from 'lucide-react';
import { api } from '../services/api';
import { flattenMockExamQuestionIds, getMockExamSections, getMockExamTimeLimit } from '../utils/mockExam';
import { normalizeQuestionHtml } from '../utils/questionHtml';
import { getQuizDifficultyBadgeClass, getQuizDifficultyLabel, getQuizOptionButtonHeightClass, getQuizOptionGridClass, getQuizQuestionMapButtonClass, resolveQuestionFromBank } from '../utils/quizPresentation';
import { isDevSessionUser } from '../utils/devSession';
import { resolveQuizLearningAccessType } from '../utils/quizLearningPlacement';
import { resolveAssessmentSettings } from '../utils/assessmentSettings';
import { getDefaultQuizSettings } from '../utils/quizSettings';
import { assessmentQuestionSource } from '../utils/exams/assessmentQuestionSource';
import { buildSkillRecommendation } from './Reports/recommendationViewModel';
import {
  readQuizProgressDraft,
  removeQuizProgressDraft,
  type SavedQuizPageProgress,
  writeQuizProgressDraft,
} from '../utils/quizProgressDraft';
import { QuestionImageZoomModal } from '../components/QuestionImageZoomModal';

interface QuestionThreadItem {
  id: string;
  author: string;
  role: 'student' | 'teacher';
  message: string;
}

const QUIZ_THEME_STORAGE_KEY = 'almeaa-quiz-night-mode';
const shuffleQuestions = (items: Question[]) => [...items].sort(() => Math.random() - 0.5);
const resolveQuizSettings = (quiz?: Quiz | null) =>
  resolveAssessmentSettings(
    quiz?.settings,
    getDefaultQuizSettings({
      type: quiz?.type || 'quiz',
      mode: quiz?.mode || 'regular',
      mockExam: quiz?.mockExam?.enabled === true,
    }),
  );
const resolveQuizPackageContentType = (quiz: Quiz, source?: string): PackageContentType => {
  if (source === 'mock-exam' || quiz.mockExam?.enabled === true) return 'mockExams';
  if (source === 'training' || source === 'foundation') return 'banks';
  if (source === 'course') return 'courses';
  if (quiz.type === 'bank' || quiz.placement === 'training' || quiz.showInTraining) return 'banks';
  if ((quiz.learningPlacements || []).some((placement) => placement.slot === 'training')) return 'banks';
  return 'tests';
};
const resolveQuizLearningSlot = (source?: string): 'training' | 'tests' | 'foundation' | 'course' | undefined => {
  if (source === 'training') return 'training';
  if (source === 'tests') return 'tests';
  if (source === 'foundation') return 'foundation';
  if (source === 'course') return 'course';
  return undefined;
};
const INITIAL_QA_THREAD: QuestionThreadItem[] = [
  {
    id: 'seed-student',
    author: 'محمد أحمد',
    role: 'student',
    message: 'في السؤال الثالث، لماذا لم نستخدم قانون المساحة بدلًا من المحيط؟',
  },
  {
    id: 'seed-teacher',
    author: 'المعلم (أحمد)',
    role: 'teacher',
    message: 'لأن المطلوب في السؤال هو إيجاد طول السياج الخارجي، والسياج يمثل المحيط وليس المساحة الداخلية.',
  },
];

const getQuestionContextScore = (question: Question, quiz: Quiz) => {
  let score = 0;
  if (quiz.pathId && question.pathId === quiz.pathId) score += 4;
  if (quiz.subjectId && question.subject === quiz.subjectId) score += 4;
  if (quiz.sectionId && question.sectionId === quiz.sectionId) score += 2;
  if (quiz.skillIds?.length && question.skillIds?.some((skillId) => quiz.skillIds?.includes(skillId))) score += 2;
  return score;
};

const supplementMissingQuizQuestions = (
  quiz: Quiz,
  questionBank: Question[],
  loadedQuestions: Question[],
  targetCount: number,
) => {
  if (loadedQuestions.length >= targetCount) return loadedQuestions;

  const usedIds = new Set(loadedQuestions.map((question) => question.id));
  const contextualFallbackQuestions = questionBank
    .filter((question) => !usedIds.has(question.id) && getQuestionContextScore(question, quiz) > 0)
    .sort((a, b) => getQuestionContextScore(b, quiz) - getQuestionContextScore(a, quiz));
  const remainingCount = Math.max(targetCount - loadedQuestions.length, 0);
  const contextualSlice = contextualFallbackQuestions.slice(0, remainingCount);
  const contextualIds = new Set(contextualSlice.map((question) => question.id));
  const genericFallbackQuestions = questionBank
    .filter((question) => !usedIds.has(question.id) && !contextualIds.has(question.id))
    .slice(0, Math.max(remainingCount - contextualSlice.length, 0));

  return [...loadedQuestions, ...contextualSlice, ...genericFallbackQuestions];
};

const extractPassage = (question?: Question | null): { passageText: string | null; questionText: string } => {
  if (!question) return { passageText: null, questionText: '' };

  if (question.passage && question.passage.trim().length > 0) {
    return { passageText: question.passage.trim(), questionText: question.text || '' };
  }

  const raw = question.text || '';

  // 1. Check for <blockquote>...</blockquote>
  const blockquoteMatch = raw.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
  if (blockquoteMatch) {
    const passage = blockquoteMatch[1].trim();
    const remaining = raw.replace(blockquoteMatch[0], '').trim();
    return { passageText: passage, questionText: remaining || raw };
  }

  // 2. Check for <div class="passage">...</div> or similar
  const passageDivMatch = raw.match(/<div[^>]*class=["'][^"']*(?:passage|reading-text|reading-passage)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (passageDivMatch) {
    const passage = passageDivMatch[1].trim();
    const remaining = raw.replace(passageDivMatch[0], '').trim();
    return { passageText: passage, questionText: remaining || raw };
  }

  // 3. Check for [قطعة: ...] or [النص: ...]
  const bracketMatch = raw.match(/\[(?:قطعة|النص|القطعة)\s*:\s*([\s\S]*?)\]/i);
  if (bracketMatch) {
    const passage = bracketMatch[1].trim();
    const remaining = raw.replace(bracketMatch[0], '').trim();
    return { passageText: passage, questionText: remaining || raw };
  }

  // 4. Check for "القطعة:" or "النص القرائي:" prefix preceding "السؤال:"
  const textPrefixMatch = raw.match(/^(?:القطعة|النص|النص القرائي|قطعة استيعاب المقروء)\s*:\s*([\s\S]*?)(?:(?:<br\s*\/?>|\n)+\s*(?:السؤال\s*:|المطلوب\s*:)\s*([\s\S]*)|$)/i);
  if (textPrefixMatch && textPrefixMatch[1]?.trim()) {
    return {
      passageText: textPrefixMatch[1].trim(),
      questionText: textPrefixMatch[2]?.trim() || raw,
    };
  }

  return { passageText: null, questionText: raw };
};

export const QuizPage: React.FC = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    quizzes,
    questions,
    user,
    checkAccess,
    hasScopedPackageAccess,
    saveExamResult,
    hydrateExamResults,
    examResults,
    recordQuestionAttempt,
    courses,
    enrolledCourses,
    skills,
    subjects,
    sections,
    lessons,
    topics,
    libraryItems,
  } = useStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [submittedSectionResults, setSubmittedSectionResults] = useState<NonNullable<QuizResult['sectionResults']>>([]);
  const [submittedSkillsAnalysis, setSubmittedSkillsAnalysis] = useState<NonNullable<QuizResult['skillsAnalysis']>>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessMessage, setAccessMessage] = useState('هذا الاختبار غير متاح لك حاليًا.');
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [qaDraft, setQaDraft] = useState('');
  const [qaThread, setQaThread] = useState<QuestionThreadItem[]>(INITIAL_QA_THREAD);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [quizStatusMessage, setQuizStatusMessage] = useState<string | null>(null);
  const [quizStatusTone, setQuizStatusTone] = useState<'success' | 'info'>('info');
  const [quizScopedQuestions, setQuizScopedQuestions] = useState<Question[]>([]);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const [showFormulaSheet, setShowFormulaSheet] = useState(false);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [isResolvingScopedQuestions, setIsResolvingScopedQuestions] = useState(false);
  const [questionHydrationStartedAt, setQuestionHydrationStartedAt] = useState<number | null>(null);
  // Per-section timer (قياس-style): tracks seconds left in the CURRENT section
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});
  // Sections that have been locked (time expired or manually advanced)
  const [lockedSectionIds, setLockedSectionIds] = useState<Set<string>>(new Set());
  const [showSectionConfirmModal, setShowSectionConfirmModal] = useState(false);
  const [passageFontSize, setPassageFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const activeQuizLoadKeyRef = useRef('');
  const autoSubmitTriggeredRef = useRef(false);
  const [isNightMode, setIsNightMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(QUIZ_THEME_STORAGE_KEY) === 'true';
  });
  const [isOfflineMode, setIsOfflineMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !navigator.onLine || window.localStorage.getItem('almeaa-quiz-offline') === 'true';
  });
  const returnToParam = searchParams.get('returnTo') || '';
  const sourceParam = searchParams.get('source') || '';
  const courseIdParam = searchParams.get('courseId') || '';
  const courseLessonIdParam = searchParams.get('courseLessonId') || '';
  const safeReturnTo = useMemo(() => {
    if (!returnToParam) return '';
    if (returnToParam.startsWith('/') && !returnToParam.startsWith('//')) return returnToParam;
    return '';
  }, [returnToParam]);
  const resultSource = useMemo(() => {
    if (sourceParam) return sourceParam;
    if (quiz?.quizKind === 'mock' || quiz?.mockExam?.enabled) return 'mock-exam';
    if (quiz?.quizKind === 'test') return 'tests';
    if (quiz?.quizKind === 'drill') return 'training';
    if (quiz?.mode === 'saher') return 'self';
    return undefined;
  }, [quiz?.mockExam?.enabled, quiz?.quizKind, quiz?.mode, sourceParam]);
  const shouldReturnToSourceAfterFinish =
    Boolean(safeReturnTo) &&
    (searchParams.get('returnOnFinish') === '1' ||
      resolveQuizSettings(quiz).returnToSourceOnFinish === true ||
      resolveQuizSettings(quiz).showResultsReport === false);
  const returnLabel = useMemo(() => {
    if (sourceParam === 'foundation') return 'العودة لموضوع التأسيس';
    if (sourceParam === 'training') return 'العودة للتدريب';
    if (sourceParam === 'tests') return 'العودة للاختبارات';
    if (sourceParam === 'course') return 'العودة للدورة';
    if (sourceParam === 'mock-exam') return 'العودة للاختبارات المحاكية';
    return safeReturnTo ? 'العودة للمكان السابق' : 'الرجوع';
  }, [safeReturnTo, sourceParam]);
  const referencedQuestionCount = useMemo(() => (quiz ? flattenMockExamQuestionIds(quiz).length : 0), [quiz]);
  const shouldDelayEmptyState = referencedQuestionCount > 0 && quizQuestions.length === 0 && !isFinished;
  const waitingForQuestionHydration =
    shouldDelayEmptyState && questionHydrationStartedAt !== null && Date.now() - questionHydrationStartedAt < 3000;
  const sourceCourseId = useMemo(() => {
    if (courseIdParam) return courseIdParam;
    const match = safeReturnTo.match(/^\/course\/([^/?#]+)/);
    return match?.[1] || '';
  }, [courseIdParam, safeReturnTo]);
  const sourceCourse = useMemo(
    () => (sourceCourseId ? courses.find((item) => String(item.id || '') === sourceCourseId) || null : null),
    [courses, sourceCourseId],
  );
  const courseHasAccess = useMemo(() => {
    if (!sourceCourse) return false;
    if (Number(sourceCourse.price || 0) <= 0) return true;
    if (enrolledCourses.includes(sourceCourse.id)) return true;
    if ((user.subscription?.purchasedCourses || []).includes(sourceCourse.id)) return true;
    return hasScopedPackageAccess('courses', sourceCourse.pathId || sourceCourse.category, sourceCourse.subjectId || sourceCourse.subject);
  }, [enrolledCourses, hasScopedPackageAccess, sourceCourse, user.subscription?.purchasedCourses]);

  const findCourseQuizContext = (course: Course | null, targetQuizId: string) => {
    if (!course || !targetQuizId) return null;
    const courseLesson = (course.modules || [])
      .flatMap((module) => module.lessons || [])
      .find((lesson) => {
        if (courseLessonIdParam && String(lesson.id || '') === courseLessonIdParam) return true;
        const directQuizId = String(lesson.quizId || '').trim();
        if (directQuizId === targetQuizId) return true;
        const prefixedMatch = String(lesson.id || '').match(/^course_quiz_(.+)_\d+$/);
        return prefixedMatch?.[1] === targetQuizId;
      });
    if (courseLesson) {
      return {
        source: 'lesson' as const,
        isPreview: courseLesson.accessControl === 'public',
        isPaid: courseLesson.accessControl !== 'public',
      };
    }

    const assessment = (course.assessments || []).find(
      (item) => item.showOnPlatform !== false && String(item.quizId || '') === targetQuizId,
    );
    if (assessment) {
      return {
        source: 'assessment' as const,
        isPreview: assessment.access === 'free_preview',
        isPaid: assessment.access !== 'free_preview',
      };
    }

    return null;
  };

  const buildReturnToSourcePath = () => {
    if (!safeReturnTo) return '';
    const [path, query = ''] = safeReturnTo.split('?');
    const nextParams = new URLSearchParams(query);

    if (sourceParam === 'foundation' || sourceParam === 'training') {
      nextParams.set('trainingDone', '1');
      if (sourceParam === 'foundation') {
        nextParams.set('content', 'quizzes');
      }
    }

    if (sourceParam === 'tests') {
      nextParams.set('testDone', '1');
    }

    const nextQuery = nextParams.toString();
    return `${path}${nextQuery ? `?${nextQuery}` : ''}`;
  };
  const handleReturnToPreviousPlace = () => {
    if (safeReturnTo) {
      navigate(safeReturnTo);
      return;
    }
    navigate(-1);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUIZ_THEME_STORAGE_KEY, String(isNightMode));
  }, [isNightMode]);

  useEffect(() => {
    const foundQuiz = quizzes.find((item) => item.id === quizId);
    if (!foundQuiz) {
      setQuizScopedQuestions([]);
      setIsResolvingScopedQuestions(false);
      return;
    }

    const sourceQuestionIds = flattenMockExamQuestionIds(foundQuiz);
    if (sourceQuestionIds.length === 0) {
      setQuizScopedQuestions([]);
      setIsResolvingScopedQuestions(false);
      return;
    }

    const localBank = [...questions, ...quizScopedQuestions];
    const missingIds = sourceQuestionIds.filter((id) => !resolveQuestionFromBank(localBank, id));
    if (missingIds.length === 0) {
      setIsResolvingScopedQuestions(false);
      return;
    }

    let cancelled = false;
    setIsResolvingScopedQuestions(true);
    const run = async () => {
      try {
        const hydration = await assessmentQuestionSource.hydrateByIds(missingIds);
        const fetched = hydration.questions;
        if (cancelled || !Array.isArray(fetched) || fetched.length === 0) return;
        setQuizScopedQuestions((prev) => {
          const merged = [...prev, ...fetched];
          const byId = new Map<string, Question>();
          merged.forEach((item) => {
            if (item?.id) byId.set(String(item.id), item);
          });
          return Array.from(byId.values());
        });
      } catch (error) {
        console.warn('Unable to fetch quiz-scoped questions by ids:', error);
      } finally {
        if (!cancelled) {
          setIsResolvingScopedQuestions(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [quizId, quizzes, questions, quizScopedQuestions]);

  useEffect(() => {
    if (isResolvingScopedQuestions) {
      return;
    }

    const foundQuiz = quizzes.find((item) => item.id === quizId);
    if (!foundQuiz) {
      activeQuizLoadKeyRef.current = '';
      setHasAccess(false);
      return;
    }

    setQuiz(foundQuiz);
    setQuestionHydrationStartedAt(Date.now());
    setAccessMessage('هذا الاختبار غير متاح لك حاليًا.');
    setQuizStatusMessage(null);
    const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user.role);

    const targetUserIds = foundQuiz.targetUserIds || [];
    const targetGroupIds = foundQuiz.targetGroupIds || [];
    const hasExplicitTargets = targetUserIds.length > 0 || targetGroupIds.length > 0;
    const isServerVerifiedDirectedAudience = foundQuiz.viewerAudienceVerified === true;

    if (
      !isStaffViewer &&
      (!foundQuiz.isPublished ||
        (foundQuiz.showOnPlatform === false && !isServerVerifiedDirectedAudience) ||
        (!!foundQuiz.approvalStatus && foundQuiz.approvalStatus !== 'approved'))
    ) {
      setHasAccess(false);
      setAccessMessage('هذا الاختبار غير منشور للطلاب حاليًا.');
      return;
    }

    const isExpired = !!foundQuiz.dueDate && Date.now() > new Date(`${foundQuiz.dueDate}T23:59:59`).getTime();
    if (isExpired) {
      setHasAccess(false);
      setAccessMessage('انتهت صلاحية هذا الاختبار.');
      return;
    }

    if (!isStaffViewer && ((foundQuiz.mode || 'regular') === 'central' || hasExplicitTargets)) {
      const userGroups = Array.from(new Set([...(user.groupIds || []), ...(user.schoolId ? [user.schoolId] : [])]));
      const isUserTargeted = targetUserIds.length > 0 && targetUserIds.includes(user.id);
      const isGroupTargeted = targetGroupIds.length > 0 && targetGroupIds.some((id) => userGroups.includes(id));

      // Direct student targeting and school/class targeting are additive, matching the API contract.
      if (hasExplicitTargets && !isUserTargeted && !isGroupTargeted && !isServerVerifiedDirectedAudience) {
        setHasAccess(false);
        setAccessMessage('هذا اختبار مدرسي موجّه لطلاب محددين فقط.');
        return;
      }
    }

    const courseQuizContext = sourceParam === 'course' ? findCourseQuizContext(sourceCourse, foundQuiz.id) : null;
    const sourceSlot = resolveQuizLearningSlot(sourceParam);
    const accessType = courseQuizContext?.isPreview
      ? 'free'
      : courseQuizContext?.isPaid
        ? 'paid'
        : resolveQuizLearningAccessType(
            foundQuiz,
            sourceSlot ? { pathId: foundQuiz.pathId, subjectId: foundQuiz.subjectId, slot: sourceSlot } : undefined,
          );
    const access = { ...(foundQuiz.access || { type: 'free' as const }), type: accessType };
    if (isStaffViewer) {
      setHasAccess(true);
    } else if (access.type === 'free') {
      setHasAccess(true);
    } else if (access.type === 'paid') {
      setHasAccess(
        (sourceParam === 'course' && courseHasAccess) ||
          checkAccess(foundQuiz.id, true) ||
          hasScopedPackageAccess(resolveQuizPackageContentType(foundQuiz, sourceParam), foundQuiz.pathId, foundQuiz.subjectId),
      );
    } else if (access.type === 'private') {
      const userGroups = user.groupIds || [];
      const allowed = (access.allowedGroupIds || []).length === 0 || access.allowedGroupIds?.some((id) => userGroups.includes(id));
      setHasAccess(Boolean(allowed));
    } else if (access.type === 'course_only') {
      setHasAccess(hasScopedPackageAccess('courses', foundQuiz.pathId, foundQuiz.subjectId));
    } else {
      setHasAccess(false);
    }

    const sourceQuestionIds = flattenMockExamQuestionIds(foundQuiz);
    const questionBank = [...questions, ...quizScopedQuestions];
    const resolvedQuestions = sourceQuestionIds
      .map((id) => resolveQuestionFromBank(questionBank, id))
      .filter((question): question is Question => Boolean(question));
    const loadedQuestions = supplementMissingQuizQuestions(
      foundQuiz,
      questionBank,
      resolvedQuestions,
      sourceQuestionIds.length,
    );
    const quizLoadKey = [
      foundQuiz.id,
      user.id,
      user.role,
      sourceQuestionIds.join(','),
      loadedQuestions.map((question) => question.id).join(','),
    ].join('|');

    if (activeQuizLoadKeyRef.current === quizLoadKey) {
      return;
    }

    activeQuizLoadKeyRef.current = quizLoadKey;
    setSelectedOptions({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
    setShowFinishDialog(false);
    setQaDraft('');
    setQaThread(INITIAL_QA_THREAD);
    setSectionTimeLeft(null);
    setQuestionTimeSpent({});
    setLockedSectionIds(new Set());
    autoSubmitTriggeredRef.current = false;

    const effectiveTimeLimit = foundQuiz.mockExam?.enabled ? getMockExamTimeLimit(foundQuiz) : (resolveQuizSettings(foundQuiz).timeLimit || 0);
    const defaultTimeLeft = effectiveTimeLimit && effectiveTimeLimit > 0 ? effectiveTimeLimit * 60 : null;
    const savedProgress = readQuizProgressDraft(foundQuiz.id);

    const savedQuestionOrder =
      savedProgress?.quizId === foundQuiz.id &&
      savedProgress.questionIds.length === loadedQuestions.length
        ? savedProgress.questionIds
            .map((id) => resolveQuestionFromBank(loadedQuestions, id))
            .filter((question): question is Question => Boolean(question))
        : [];

    const canRestoreProgress = savedQuestionOrder.length === loadedQuestions.length && loadedQuestions.length > 0;
    const nextQuestions = canRestoreProgress
      ? savedQuestionOrder
      : resolveQuizSettings(foundQuiz).randomizeQuestions === false
        ? loadedQuestions
        : shuffleQuestions(loadedQuestions);

    setQuizQuestions(nextQuestions);
    if (nextQuestions.length > 0) {
      setQuestionHydrationStartedAt(null);
      api.startLiveExam({
        quizId: foundQuiz.id,
        quizTitle: foundQuiz.title || 'اختبار',
        totalQuestions: nextQuestions.length,
      }).catch((err: any) => console.warn('Failed to start live exam session:', err));
      api.getLiveExamSession(foundQuiz.id).then((serverProgress: any) => {
        const serverAnswers = serverProgress?.answers;
        if (!serverAnswers || typeof serverAnswers !== 'object') return;
        const allowed = new Set(nextQuestions.map((question) => question.id));
        const restoredAnswers: Record<string, number> = Object.fromEntries(
          Object.entries(serverAnswers)
            .filter(([questionId, value]) => allowed.has(questionId) && Number.isInteger(Number(value)) && Number(value) >= 0)
            .map(([questionId, value]) => [questionId, Number(value)]),
        );
        setSelectedOptions((current) => ({ ...current, ...restoredAnswers }));
        setDraftRestored(true);
      }).catch((err: any) => console.warn('Failed to restore server progress:', err));
    }
    setDraftRestored(canRestoreProgress);

    if (canRestoreProgress && savedProgress) {
      const allowedQuestionIds = new Set(nextQuestions.map((question) => question.id));
      const safeSelectedOptions = Object.fromEntries(
        Object.entries(savedProgress.selectedOptions || {}).filter(([questionId, optionIndex]) => {
          const question = nextQuestions.find((item) => item.id === questionId);
          return Boolean(question && allowedQuestionIds.has(questionId) && Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < question.options.length);
        }),
      );
      setSelectedOptions(safeSelectedOptions);
      setCurrentQuestionIndex(Math.min(Math.max(savedProgress.currentQuestionIndex || 0, 0), Math.max(nextQuestions.length - 1, 0)));
      const restoredTimeLeft =
        defaultTimeLeft !== null
          ? (typeof savedProgress.timeLeft === 'number' && savedProgress.timeLeft > 0
              ? savedProgress.timeLeft
              : defaultTimeLeft)
          : null;
      setTimeLeft(restoredTimeLeft);
    } else {
      setSelectedOptions({});
      setCurrentQuestionIndex(0);
      setTimeLeft(defaultTimeLeft);
    }
  }, [quizId, quizzes, questions, quizScopedQuestions, user, checkAccess, hasScopedPackageAccess, isResolvingScopedQuestions, sourceParam, sourceCourse, courseHasAccess]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!quiz || isFinished || isSubmittingResult || quizQuestions.length === 0) return;

    const draft: SavedQuizPageProgress = {
      quizId: quiz.id,
      questionIds: quizQuestions.map((question) => question.id),
      selectedOptions,
      currentQuestionIndex,
      timeLeft: typeof timeLeft === 'number' && timeLeft > 0 ? timeLeft : null,
      savedAt: new Date().toISOString(),
    };

    writeQuizProgressDraft(draft);
  }, [quiz, quizQuestions, selectedOptions, currentQuestionIndex, timeLeft, isFinished, isSubmittingResult]);

  useEffect(() => {
    if (quizQuestions.length > 0) {
      setQuestionHydrationStartedAt(null);
    }
  }, [quizQuestions.length]);

  // \u2500\u2500 Mock exam section memos \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const mockExamSections = useMemo(
    () => (quiz?.mockExam?.enabled ? getMockExamSections(quiz) : []),
    [quiz],
  );
  const mockExamSectionSummaries = useMemo(
    () =>
      mockExamSections
        .map((mockSection, sectionIndex) => {
          const questionIndexById = new Map(quizQuestions.map((question, index) => [String(question.id), index]));
          const questionIndexes = (mockSection.questionIds || [])
            .map((questionId) => {
              const exactIndex = questionIndexById.get(String(questionId));
              if (exactIndex !== undefined) return exactIndex;
              const resolvedQuestion = resolveQuestionFromBank(quizQuestions, questionId);
              return resolvedQuestion
                ? quizQuestions.findIndex((question) => question.id === resolvedQuestion.id)
                : -1;
            })
            .filter((index): index is number => index >= 0);
          const uniqueIndexes = Array.from(new Set(questionIndexes));
          const answered = uniqueIndexes.filter((index) => {
            const questionId = quizQuestions[index]?.id;
            return questionId ? selectedOptions[questionId] !== undefined : false;
          }).length;
          const subjectName = mockSection.subjectId
            ? subjects.find((subject) => subject.id === mockSection.subjectId)?.name
            : '';
          return {
            id: mockSection.id,
            title: mockSection.title || subjectName || `\u0627\u0644\u0642\u0633\u0645 ${sectionIndex + 1}`,
            questionIndexes: uniqueIndexes,
            firstQuestionIndex: uniqueIndexes[0] ?? -1,
            total: uniqueIndexes.length,
            answered,
            timeLimit: mockSection.timeLimit,
          };
        })
        .filter((section) => section.total > 0),
    [mockExamSections, quizQuestions, selectedOptions, subjects],
  );
  const currentMockExamSection = useMemo(
    () =>
      mockExamSectionSummaries.find((section) => section.questionIndexes.includes(currentQuestionIndex)) || null,
    [currentQuestionIndex, mockExamSectionSummaries],
  );
  const isStrictQiyasMode = useMemo(() => {
    if (!quiz?.mockExam?.enabled) return false;
    if (quiz.mockExam.presentationMode === 'flexible') return false;
    if (quiz.mockExam.isStrictSectionLock === false) return false;
    return quiz.mockExam.presentationMode === 'qiyas_strict' || quiz.mockExam.isStrictSectionLock === true;
  }, [quiz]);

  // \u2500\u2500 Global exam timer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished && !isSubmittingResult) {
      const timerId = window.setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
      return () => window.clearTimeout(timerId);
    }
    if (timeLeft === 0 && !isFinished && !isSubmittingResult && !autoSubmitTriggeredRef.current) {
      autoSubmitTriggeredRef.current = true;
      handleFinish();
    }
  }, [timeLeft, isFinished, isSubmittingResult]);

  // ── Per-section timer initialiser (runs when active section changes) ─────
  useEffect(() => {
    if (!currentMockExamSection) { setSectionTimeLeft(null); return; }
    const sectionTimeLimitMinutes = currentMockExamSection.timeLimit;
    if (!sectionTimeLimitMinutes || sectionTimeLimitMinutes <= 0) { setSectionTimeLeft(null); return; }
    // Only reset if we moved to a NEW section that hasn't been locked yet
    if (lockedSectionIds.has(currentMockExamSection.id)) { setSectionTimeLeft(0); return; }
    setSectionTimeLeft(sectionTimeLimitMinutes * 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMockExamSection?.id]);

  // ── Per-section countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (sectionTimeLeft === null || sectionTimeLeft <= 0 || isFinished || isSubmittingResult) return;
    const timerId = window.setTimeout(() => setSectionTimeLeft((t) => (t !== null && t > 0 ? t - 1 : t)), 1000);
    return () => window.clearTimeout(timerId);
  }, [sectionTimeLeft, isFinished, isSubmittingResult]);

  // ── Per-question time tracking ────────────────────────────────────────────
  useEffect(() => {
    if (isFinished || isSubmittingResult || quizQuestions.length === 0) return;
    const currentQ = quizQuestions[currentQuestionIndex];
    if (!currentQ) return;
    const timerId = window.setTimeout(() => {
      setQuestionTimeSpent((prev) => ({
        ...prev,
        [currentQ.id]: (prev[currentQ.id] || 0) + 1,
      }));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [currentQuestionIndex, isFinished, isSubmittingResult, quizQuestions]);

  // ── Section time-up: lock section and advance ─────────────────────────────
  useEffect(() => {
    if (sectionTimeLeft !== 0 || !currentMockExamSection || isFinished || isSubmittingResult) return;
    const expiredId = currentMockExamSection.id;
    setLockedSectionIds((prev) => new Set([...prev, expiredId]));
    // Advance to the first question of the next unlocked section
    const currentIdx = mockExamSectionSummaries.findIndex((s) => s.id === expiredId);
    const nextSection = mockExamSectionSummaries.slice(currentIdx + 1).find((s) => !lockedSectionIds.has(s.id));
    if (nextSection && nextSection.firstQuestionIndex >= 0) {
      setCurrentQuestionIndex(nextSection.firstQuestionIndex);
    } else if (!autoSubmitTriggeredRef.current) {
      // All sections exhausted → finish the exam
      autoSubmitTriggeredRef.current = true;
      handleFinish();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionTimeLeft]);

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const { passageText, questionText } = useMemo(
    () => extractPassage(currentQuestion),
    [currentQuestion],
  );

  const correctAnswersCount = useMemo(
    () =>
      Object.keys(selectedOptions).reduce((acc, questionId) => {
        const resolvedQuestion = quizQuestions.find((question) => question.id === questionId);
        return acc + (selectedOptions[questionId] === resolvedQuestion?.correctOptionIndex ? 1 : 0);
      }, 0),
    [quizQuestions, selectedOptions]
  );

  const wrongAnswersCount = useMemo(
    () =>
      Object.keys(selectedOptions).reduce((acc, questionId) => {
        const resolvedQuestion = quizQuestions.find((question) => question.id === questionId);
        return acc + (selectedOptions[questionId] !== resolvedQuestion?.correctOptionIndex ? 1 : 0);
      }, 0),
    [quizQuestions, selectedOptions]
  );

  const quizSettings = useMemo(() => resolveQuizSettings(quiz), [quiz]);
  const finalScore = Math.round((correctAnswersCount / Math.max(quizQuestions.length, 1)) * 100);
  const passingScore = quizSettings.passingScore;
  const quizTimeLimit = quiz ? (quiz.mockExam?.enabled ? getMockExamTimeLimit(quiz) : (quizSettings.timeLimit || 0)) : 0;
  const isPassed = isFinished && quiz ? finalScore >= passingScore : false;
  const activeOptionLayout = quizSettings.optionLayout ?? 'horizontal';
  const optionGridClass = getQuizOptionGridClass(currentQuestion?.options || [], activeOptionLayout);
  const optionButtonHeightClass = getQuizOptionButtonHeightClass(currentQuestion?.options || [], activeOptionLayout);

  // ── G2: خلط خيارات الإجابة (randomizeOptions) ────────────────────────────
  // يُبنى مرة واحدة عند تحميل الأسئلة فقط (يعتمد على quizQuestions كـkey).
  // questionShuffleMap: Map<questionId, number[]>
  //   القيمة: مصفوفة originalIndices مرتّبة حسب ترتيب العرض.
  //   مثال: [2, 0, 1] يعني: عرض option[2] أولاً، ثم option[0]، ثم option[1].
  // إذا كان randomizeOptions = false أو undefined → null (نعرض الخيارات بترتيبها الأصلي).
  const questionShuffleMap = useMemo<Map<string, number[]> | null>(() => {
    const shouldRandomize = quizSettings.randomizeOptions === true;
    if (!shouldRandomize || quizQuestions.length === 0) return null;

    const map = new Map<string, number[]>();
    for (const question of quizQuestions) {
      const count = question.options?.length ?? 0;
      if (count <= 1) {
        // سؤال بخيار واحد أو بدون خيارات: لا خلط
        map.set(question.id, Array.from({ length: count }, (_, i) => i));
        continue;
      }
      // Fisher-Yates shuffle بـseed بسيط من questionId حتى يكون ثابتاً بين re-renders
      const indices = Array.from({ length: count }, (_, i) => i);
      // نحرص على أن الـseed يختلف بين الأسئلة فيستخدم question.id بدل Math.random
      let seedVal = question.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      for (let i = indices.length - 1; i > 0; i--) {
        seedVal = (seedVal * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(seedVal) % (i + 1);
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      map.set(question.id, indices);
    }
    return map;
  // يُعاد الحساب فقط عند تغيير الأسئلة أو تغيير إعداد randomizeOptions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizQuestions, quizSettings.randomizeOptions]);

  // الخيارات المعروضة للسؤال الحالي (مخلوطة أو أصلية)
  const currentDisplayOptions = useMemo<{ text: string; originalIndex: number }[]>(() => {
    if (!currentQuestion) return [];
    const indices = questionShuffleMap?.get(currentQuestion.id);
    if (!indices) {
      return (currentQuestion.options || []).map((text, i) => ({ text, originalIndex: i }));
    }
    return indices.map((originalIndex) => ({
      text: currentQuestion.options[originalIndex] ?? '',
      originalIndex,
    }));
  }, [currentQuestion, questionShuffleMap]);
  const shouldShowQuestionReview = quizSettings.allowQuestionReview !== false;
  const shouldShowProgressBar = quizSettings.showProgressBar !== false;
  const answeredQuestionCount = quizQuestions.filter((question) => selectedOptions[question.id] !== undefined).length;
  const activeProgressPercentage = Math.round(((currentQuestionIndex + 1) / Math.max(quizQuestions.length, 1)) * 100);
  const reviewQuestionCount = quizQuestions.filter((question) => flaggedQuestionIds.includes(question.id)).length;
  const isNextBlocked =
    quizSettings.requireAnswerBeforeNext === true &&
    currentQuestion &&
    selectedOptions[currentQuestion.id] === undefined;

  const weakSkillIds = useMemo(
    () =>
      Array.from(
        new Set(
          quizQuestions
            .filter((question) => selectedOptions[question.id] !== undefined && selectedOptions[question.id] !== question.correctOptionIndex)
            .flatMap((question) => question.skillIds || [])
        )
      ),
    [quizQuestions, selectedOptions]
  );

  const firstWeakSkill = useMemo(
    () => weakSkillIds.map((skillId) => skills.find((skill) => skill.id === skillId)).find(Boolean),
    [skills, weakSkillIds]
  );
  const weakSkillScope = useMemo(() => {
    const resolvedSkills = weakSkillIds
      .map((skillId) => skills.find((skill) => skill.id === skillId))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill));
    const sectionIds = Array.from(new Set(resolvedSkills.map((skill) => skill.sectionId).filter(Boolean)));

    return {
      skillIds: resolvedSkills.map((skill) => skill.id),
      sharedSectionId: sectionIds.length === 1 ? sectionIds[0] : '',
    };
  }, [skills, weakSkillIds]);

  const buildSelfQuizLink = (focusWeakSkills = false) => {
    const params = new URLSearchParams();
    params.set('mode', 'self');
    params.set('autostart', '1');
    params.set('questionCount', String(Math.max(quizQuestions.length, 10)));
    params.set('timeLimit', String(quizSettings.timeLimit || 30));
    params.set('difficulty', focusWeakSkills ? 'Medium' : (quizQuestions[0]?.difficulty || 'Medium'));

    if (quiz?.pathId) params.set('pathId', quiz.pathId);
    if (quiz?.subjectId) params.set('subjectId', quiz.subjectId);
    if (focusWeakSkills && weakSkillScope.skillIds.length > 0) {
      params.set('skillIds', weakSkillScope.skillIds.join(','));
    }
    if (focusWeakSkills && weakSkillScope.sharedSectionId) params.set('sectionId', weakSkillScope.sharedSectionId);
    else if (focusWeakSkills && firstWeakSkill?.sectionId) params.set('sectionId', firstWeakSkill.sectionId);
    else if (quiz?.sectionId) params.set('sectionId', quiz.sectionId);

    return `/quiz?${params.toString()}`;
  };

  const handleOptionSelect = (displayIndex: number) => {
    if (isFinished || !currentQuestion) return;
    // عند تفعيل randomizeOptions، الـdisplayIndex يشير لموقع الخيار في الشاشة.
    // نحوّله إلى originalIndex (الترتيب الأصلي في question.options)
    // حتى تظل المقارنة مع correctOptionIndex صحيحة دون أي تغيير في منطق التصحيح.
    const originalIndex = currentDisplayOptions[displayIndex]?.originalIndex ?? displayIndex;
    setSelectedOptions((prev) => {
      const next = { ...prev, [currentQuestion.id]: originalIndex };
      api.updateLiveExamProgress({
        quizId: quiz?.id || '',
        answeredQuestions: Object.keys(next).length,
        totalQuestions: quizQuestions.length,
        answers: next,
      }).catch((err: any) => console.warn('Failed to update live exam progress:', err));
      return next;
    });
    recordQuestionAttempt({
      questionId: currentQuestion.id.toString(),
      selectedOptionIndex: originalIndex,
      isCorrect: originalIndex === currentQuestion.correctOptionIndex,
      timeSpentSeconds: 0,
      date: new Date().toISOString(),
    });
  };

  const toggleQuestionSavedForReview = async (questionId: string) => {
    const wasSaved = flaggedQuestionIds.includes(questionId);
    if (!user?.id || user.id === 'guest') {
      setQuizStatusMessage('سجّل الدخول لحفظ السؤال للمراجعة على حسابك.');
      setQuizStatusTone('info');
      return;
    }
    setFlaggedQuestionIds((prev) => wasSaved ? prev.filter((id) => id !== questionId) : [...new Set([...prev, questionId])]);
    try {
      if (wasSaved) await api.removeQuestionFromReview(questionId);
      else await api.saveQuestionForReview(questionId);
      setQuizStatusMessage(wasSaved ? 'تمت إزالة السؤال من المراجعة.' : 'تم حفظ السؤال للمراجعة لاحقًا.');
      setQuizStatusTone('success');
    } catch {
      setFlaggedQuestionIds((prev) => wasSaved ? [...new Set([...prev, questionId])] : prev.filter((id) => id !== questionId));
      setQuizStatusMessage('تعذر تحديث قائمة المراجعة الآن.');
      setQuizStatusTone('info');
    }
  };

  const handleToggleCurrentReviewLater = () => {
    if (!currentQuestion) return;
    void toggleQuestionSavedForReview(currentQuestion.id);
  };

  const getQuestionNumberClass = (question: Question, index: number) => {
    const isCurrent = index === currentQuestionIndex;
    const isAnswered = selectedOptions[question.id] !== undefined;
    const isMarkedForReview = flaggedQuestionIds.includes(question.id);

    if (isCurrent) {
      return getQuizQuestionMapButtonClass('current', isNightMode);
    }

    if (isMarkedForReview) {
      return getQuizQuestionMapButtonClass('review', isNightMode);
    }

    if (isAnswered) {
      return getQuizQuestionMapButtonClass('answered', isNightMode);
    }

    return getQuizQuestionMapButtonClass('unanswered', isNightMode);
  };

  const handleConfirmSectionAdvance = () => {
    if (!currentMockExamSection) {
      setShowSectionConfirmModal(false);
      return;
    }
    const currentId = currentMockExamSection.id;
    setLockedSectionIds((prev) => new Set([...prev, currentId]));
    setShowSectionConfirmModal(false);

    const currentIdx = mockExamSectionSummaries.findIndex((s) => s.id === currentId);
    const nextSection = mockExamSectionSummaries.slice(currentIdx + 1).find((s) => !lockedSectionIds.has(s.id) && s.id !== currentId);
    if (nextSection && nextSection.firstQuestionIndex >= 0) {
      setCurrentQuestionIndex(nextSection.firstQuestionIndex);
    } else {
      setShowFinishDialog(true);
    }
  };

  const handleNext = () => {
    if (isNextBlocked) return;

    if (isStrictQiyasMode && currentMockExamSection) {
      const isLastQuestionOfSection =
        currentQuestionIndex === currentMockExamSection.questionIndexes[currentMockExamSection.questionIndexes.length - 1];
      if (isLastQuestionOfSection) {
        const currentSecIdx = mockExamSectionSummaries.findIndex((s) => s.id === currentMockExamSection.id);
        const hasNextSection = mockExamSectionSummaries.slice(currentSecIdx + 1).some((s) => !lockedSectionIds.has(s.id));
        if (hasNextSection) {
          setShowSectionConfirmModal(true);
          return;
        } else {
          setShowFinishDialog(true);
          return;
        }
      }
    }

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < quizQuestions.length) {
      // Block crossing into a locked section
      const targetSection = mockExamSectionSummaries.find((s) => s.questionIndexes.includes(nextIndex));
      if (targetSection && lockedSectionIds.has(targetSection.id)) {
        // Skip the locked section — advance to next valid section
        const afterLocked = mockExamSectionSummaries
          .filter((s) => !lockedSectionIds.has(s.id) && s.firstQuestionIndex > currentQuestionIndex)
          .sort((a, b) => a.firstQuestionIndex - b.firstQuestionIndex)[0];
        if (afterLocked) { setCurrentQuestionIndex(afterLocked.firstQuestionIndex); return; }
        setShowFinishDialog(true);
        return;
      }
      setCurrentQuestionIndex(nextIndex);
      return;
    }
    setShowFinishDialog(true);
  };

  const handlePrev = () => {
    if (currentQuestionIndex <= 0) return;
    const prevIndex = currentQuestionIndex - 1;
    // Block going back into a locked section
    const targetSection = mockExamSectionSummaries.find((s) => s.questionIndexes.includes(prevIndex));
    if (targetSection && lockedSectionIds.has(targetSection.id)) return;
    // In strict Qiyas mode, prevent navigating backward out of current section
    if (isStrictQiyasMode && currentMockExamSection && targetSection?.id !== currentMockExamSection.id) return;
    setCurrentQuestionIndex(prevIndex);
  };

  const saveCurrentProgressDraft = () => {
    if (typeof window === 'undefined' || !quiz || quizQuestions.length === 0) return false;

    const draft: SavedQuizPageProgress = {
      quizId: quiz.id,
      questionIds: quizQuestions.map((question) => question.id),
      selectedOptions,
      currentQuestionIndex,
      timeLeft: typeof timeLeft === 'number' && timeLeft > 0 ? timeLeft : null,
      savedAt: new Date().toISOString(),
    };

    return writeQuizProgressDraft(draft);
  };

  const showQuizStatus = (message: string, tone: 'success' | 'info' = 'success') => {
    setQuizStatusMessage(message);
    setQuizStatusTone(tone);
    window.setTimeout(() => setQuizStatusMessage(null), 2200);
  };

  const handlePauseQuiz = () => {
    const saved = saveCurrentProgressDraft();
    if (!saved) return;

    setDraftRestored(true);
    showQuizStatus('تم حفظ التقدم، ويمكنك الاستكمال لاحقًا.', 'success');
    navigate(safeReturnTo || '/dashboard?tab=quizzes');
  };

  const handleSaveQuizProgress = () => {
    const saved = saveCurrentProgressDraft();
    if (!saved) return;

    setDraftRestored(true);
    showQuizStatus('تم حفظ التقدم.', 'success');
  };

  const handleSubmitQuestion = () => {
    const message = qaDraft.trim();
    if (!message) return;

    const authorName = user?.name?.trim() || 'أنت';
    const teacherName = quiz?.title ? `فريق ${quiz.title}` : 'فريق التعليم';

    setQaThread((current) => [
      ...current,
      { id: `student-${Date.now()}`, author: authorName, role: 'student', message },
      {
        id: `teacher-${Date.now() + 1}`,
        author: teacherName,
        role: 'teacher',
        message: 'تم استلام سؤالك وسيبقى ظاهرًا هنا ضمن متابعة هذا الاختبار.',
      },
    ]);
    setQaDraft('');
  };

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

  const handleFinish = async () => {
    if (isSubmittingResult) return;

    if (!quiz) return;
    setIsSubmittingResult(true);

    const skillStats: Record<string, { total: number; correct: number }> = {};
    quizQuestions.forEach((question) => {
      const isCorrect = selectedOptions[question.id] === question.correctOptionIndex;
      (question.skillIds || []).forEach((skillId) => {
        if (!skillStats[skillId]) {
          skillStats[skillId] = { total: 0, correct: 0 };
        }
        skillStats[skillId].total += 1;
        if (isCorrect) {
          skillStats[skillId].correct += 1;
        }
      });
    });

    // ── تحليل لكل قسم (للمحاكيات فقط) ────────────────────────────────────
    const sectionResults = quiz.mockExam?.enabled && quiz.mockExam.sections?.length
      ? quiz.mockExam.sections.map((section) => {
          const sectionQuestionIds = new Set(section.questionIds || []);
          const sectionQs = quizQuestions.filter((q) => sectionQuestionIds.has(q.id));
          const total = sectionQs.length;
          const correct = sectionQs.filter((q) => selectedOptions[q.id] === q.correctOptionIndex).length;
          const wrong = sectionQs.filter(
            (q) => q.id in selectedOptions && selectedOptions[q.id] !== q.correctOptionIndex
          ).length;
          const unanswered = total - correct - wrong;
          const score = total > 0 ? Math.round((correct / total) * 100) : 0;
          return {
            sectionId: section.id,
            sectionName: section.title || '',
            total,
            correct,
            wrong,
            unanswered,
            score,
          };
        })
      : undefined;

    const skillsAnalysis = Object.entries(skillStats).map(([skillId, stats]) => {
      const resolvedSkill = skills.find((skill) => skill.id === skillId);
      const mastery = Math.round((stats.correct / stats.total) * 100);
      const status: 'weak' | 'average' | 'strong' = mastery < 50 ? 'weak' : mastery >= 80 ? 'strong' : 'average';
      const sectionLabel = resolvedSkill?.sectionId
        ? sections.find((section) => section.id === resolvedSkill.sectionId)?.name
        : resolvedSkill?.subjectId
          ? subjects.find((subject) => subject.id === resolvedSkill.subjectId)?.name
          : undefined;

      return {
        skillId,
        pathId: resolvedSkill?.pathId,
        subjectId: resolvedSkill?.subjectId,
        sectionId: resolvedSkill?.sectionId,
        skill: resolvedSkill?.name || 'مهارة غير معروفة',
        mastery,
        status,
        recommendation:
          status === 'weak'
            ? 'بحاجة إلى مراجعة الدروس والتدريب على نفس المهارة'
            : status === 'average'
              ? 'يمكن التحسين بالتدريب الموجّه على نفس المهارة'
              : 'أداء ممتاز في هذه المهارة',
        section: sectionLabel,
      };
    });

    setSubmittedSectionResults(sectionResults || []);
    setSubmittedSkillsAnalysis(skillsAnalysis);

    const questionReview = quizQuestions.map((question) => {
      const selectedOptionIndex = selectedOptions[question.id];

      return {
        questionId: question.id,
        text: question.text,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
        selectedOptionIndex,
        explanation: question.explanation,
        videoUrl: question.videoUrl,
        imageUrl: question.imageUrl,
        isCorrect: selectedOptionIndex === question.correctOptionIndex,
        timeSpentSeconds: questionTimeSpent[question.id] || 0,
      };
    });

    const timeSpentSeconds = quizTimeLimit ? quizTimeLimit * 60 - (timeLeft || 0) : 0;
    const result: QuizResult = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      source: resultSource,
      returnTo: safeReturnTo || undefined,
      score: finalScore,
      totalQuestions: quizQuestions.length,
      correctAnswers: correctAnswersCount,
      wrongAnswers: quizQuestions.length - correctAnswersCount - (quizQuestions.length - Object.keys(selectedOptions).length),
      unanswered: quizQuestions.length - Object.keys(selectedOptions).length,
      timeSpent: quizTimeLimit ? `${Math.floor(timeSpentSeconds / 60)} دقيقة` : 'غير محدد',
      date: new Date().toISOString(),
      skillsAnalysis,
      questionReview,
      // تحليل لكل قسم (للمحاكيات فقط)
      ...(sectionResults ? { sectionResults } : {}),
    };

    let resultAttemptDate = result.date;
    let submissionSucceeded = false;

    try {
      if (isDevSessionUser(user)) {
        saveExamResult(result);
        submissionSucceeded = true;
      } else {
        const serverResult = await api.submitQuiz(quiz.id, {
          answers: selectedOptions,
          timeSpentSeconds: Math.max(0, timeSpentSeconds),
          source: result.source,
          // تحليل الأقسام للمحاكيات — يتجاهله السيرفر إن لم يدعمه
          ...(sectionResults ? { sectionResults } : {}),
        });
        const savedServerResult: QuizResult = {
          ...result,
          ...(serverResult as QuizResult),
          source: result.source,
          returnTo: result.returnTo,
        };
        resultAttemptDate = savedServerResult.date || result.date;
        hydrateExamResults([savedServerResult, ...examResults]);
        submissionSucceeded = true;
      }
    } catch (error: any) {
      console.error('Unable to submit quiz on server; keeping local progress for a retry:', error);
      const serverMessage = error?.message || 'تعذر إرسال النتيجة. تم الاحتفاظ بتقدمك لإعادة المحاولة.';
      showQuizStatus(serverMessage, 'info');
    } finally {
      setIsSubmittingResult(false);
    }

    if (!submissionSucceeded) {
      return;
    }

    // Close the server-backed session only after the result is accepted. If
    // submission fails, the active session remains resumable and retry-safe.
    api.endLiveExam({ quizId: quiz.id }).catch((err: any) => console.warn('Failed to end live exam:', err));

    if (typeof window !== 'undefined') {
      removeQuizProgressDraft(quiz.id);
      setDraftRestored(false);
    }

    if (shouldReturnToSourceAfterFinish) {
      navigate(buildReturnToSourcePath() || safeReturnTo, { replace: true });
      return;
    }

    navigate(`/results?attempt=${encodeURIComponent(resultAttemptDate)}`);
  };

  const handleRestartQuiz = () => {
    if (!quiz) return;

    if (typeof window !== 'undefined') {
      removeQuizProgressDraft(quiz.id);
    }
    autoSubmitTriggeredRef.current = false;
    setSelectedOptions({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
    setDraftRestored(false);
    setQaDraft('');
    setQaThread(INITIAL_QA_THREAD);
    setQuestionTimeSpent({});
    setLockedSectionIds(new Set());
    const firstMockSection = getMockExamSections(quiz)[0];
    const firstSectionTimeLimit = Number(firstMockSection?.timeLimit || 0);
    setSectionTimeLeft(firstSectionTimeLimit > 0 ? firstSectionTimeLimit * 60 : null);
    const effectiveTimeLimit = quiz.mockExam?.enabled ? getMockExamTimeLimit(quiz) : (quizSettings.timeLimit || 0);
    setTimeLeft(effectiveTimeLimit && effectiveTimeLimit > 0 ? effectiveTimeLimit * 60 : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  if (isResolvingScopedQuestions) {
    return <div className="min-h-screen flex items-center justify-center">جاري تجهيز الأسئلة...</div>;
  }

  if (waitingForQuestionHydration) {
    return <div className="min-h-screen flex items-center justify-center">جاري تجهيز الأسئلة...</div>;
  }

  if (!hasAccess || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">عذرًا، لا يمكنك الوصول</h2>
          <p className="text-gray-500 mb-6">{accessMessage}</p>
          <button onClick={handleReturnToPreviousPlace} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors w-full">
            {safeReturnTo ? 'العودة للمكان السابق' : 'العودة للرئيسية'}
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion && !isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">لا توجد أسئلة متاحة</h2>
          <p className="text-gray-500 mb-6">هذا الاختبار لا يحتوي على أسئلة صالحة حاليًا.</p>
          <button onClick={handleReturnToPreviousPlace} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors w-full">
            {safeReturnTo ? 'العودة للمكان السابق' : 'العودة للرئيسية'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-4 transition-colors sm:py-8 ${isNightMode ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`} dir="rtl">
      <div className={`${isFinished ? 'max-w-4xl' : 'max-w-7xl'} mx-auto px-3 sm:px-6 transition-all duration-300`}>
        {/* Header: Identity, Timer & Utilities */}
        <div className={`${isNightMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} rounded-3xl shadow-sm border p-4 sm:p-5 mb-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleReturnToPreviousPlace}
                className={`${isNightMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'} inline-flex items-center gap-1.5 rounded-xl border ${isNightMode ? 'border-slate-700' : 'border-gray-200'} px-3 py-1.5 text-xs font-black transition-colors shrink-0`}
              >
                <ArrowRight size={14} />
                {returnLabel}
              </button>
              <h1
                data-testid="quiz-title"
                className={`text-base sm:text-lg font-black truncate ${isNightMode ? 'text-white' : 'text-gray-900'}`}
              >
                {quiz.title}
              </h1>
            </div>

            {/* Mobile-only Timer Indicator (visible on mobile screens when Question Board is below) */}
            <div className="flex items-center gap-2 self-start sm:self-auto lg:hidden">
              {sectionTimeLeft !== null && !isFinished && currentMockExamSection && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs border ${
                  sectionTimeLeft <= 60
                    ? 'bg-red-100 border-red-200 text-red-700 animate-pulse'
                    : isNightMode ? 'bg-violet-950/80 border-violet-900 text-violet-200' : 'bg-violet-50 border-violet-200 text-violet-700'
                }`}>
                  <span className="opacity-75">{currentMockExamSection.title}:</span>
                  <span className="font-mono font-black">{Math.floor(sectionTimeLeft / 60)}:{String(sectionTimeLeft % 60).padStart(2, '0')}</span>
                </div>
              )}
              {timeLeft !== null && !isFinished && (
                <div className={`${isNightMode ? 'bg-amber-950/80 border-amber-900 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-700'} flex items-center gap-1.5 px-3 py-1 rounded-xl border font-bold text-xs shadow-xs`}>
                  <Clock size={14} className="text-amber-500" />
                  <span className="font-mono text-sm font-black tracking-wider">
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Utility Toolbar */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setShowFormulaSheet(true)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-black transition-colors ${
                  isNightMode ? 'border-amber-900/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
                title="عرض قوانين الهندسية والرياضيات الخاصة بقياس"
              >
                <BookOpen size={14} />
                <span>قوانين قياس</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const newValue = !isOfflineMode;
                  setIsOfflineMode(newValue);
                  window.localStorage.setItem('almeaa-quiz-offline', String(newValue));
                  setQuizStatusMessage(newValue ? 'تم تفعيل وضع عدم الاتصال (حفظ مؤقت محلي)' : 'تم العودة لوضع الاتصال (مزامنة سحابية)');
                  setTimeout(() => setQuizStatusMessage(null), 3000);
                }}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-black transition-colors ${
                  isOfflineMode
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : isNightMode
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="حفظ أوفلاين"
              >
                <Save size={14} />
                <span>{isOfflineMode ? 'أوفلاين' : 'أوفلاين'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNightMode((value) => !value)}
                className={`inline-flex items-center justify-center h-8 w-8 rounded-xl border transition-colors ${
                  isNightMode ? 'border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'
                }`}
                title={isNightMode ? 'النظام العادي' : 'النظام الليلي'}
              >
                {isNightMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>

          {/* Progress Strip */}
          <div className="mt-3.5 pt-3 border-t border-gray-100/80 flex flex-wrap items-center justify-between gap-2 text-xs font-black">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="quiz-answered-count"
                className={`${isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'} rounded-full px-3 py-0.5`}
              >
                تم حل {answeredQuestionCount} من {quizQuestions.length}
              </span>
              {shouldShowQuestionReview && reviewQuestionCount > 0 ? (
                <span className={`${isNightMode ? 'bg-purple-950 text-purple-200' : 'bg-purple-50 text-purple-700 border border-purple-100'} rounded-full px-3 py-0.5`}>
                  للمراجعة {reviewQuestionCount}
                </span>
              ) : null}
              {draftRestored ? (
                <span className={`${isNightMode ? 'bg-indigo-950 text-indigo-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'} rounded-full px-2.5 py-0.5 text-[10px]`}>
                  تقدم محفوظ
                </span>
              ) : null}
            </div>

            {shouldShowProgressBar ? (
              <div className="flex items-center gap-2 min-w-[120px] sm:min-w-[160px]">
                <span className={`text-[11px] font-bold ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {activeProgressPercentage}%
                </span>
                <div className={`${isNightMode ? 'bg-slate-800' : 'bg-gray-100'} h-2 flex-1 overflow-hidden rounded-full`}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${activeProgressPercentage}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {quizStatusMessage ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm font-black ${
              quizStatusTone === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-indigo-100 bg-indigo-50 text-indigo-700'
            }`}
          >
            {quizStatusMessage}
          </div>
        ) : null}

        {!isFinished ? (
          <div className="space-y-4">
            <div
              data-testid="quiz-current-step-hint"
              className={`${isNightMode ? 'border-indigo-900 bg-indigo-950 text-indigo-100' : 'border-indigo-100 bg-indigo-50 text-indigo-800'} rounded-2xl border px-4 py-2.5 text-xs sm:text-sm font-black leading-6`}
            >
              أجب عن السؤال الحالي، ثم اضغط التالي. عند آخر سؤال اضغط إنهاء الاختبار.
            </div>

            {mockExamSectionSummaries.length > 1 ? (
              <div className={`${isNightMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} rounded-2xl border p-3 shadow-sm`}>
                <div className="mb-2 text-xs font-black text-gray-500">أقسام الاختبار المحاكي</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {mockExamSectionSummaries.map((section, sectionIndex) => {
                    const isActive = currentMockExamSection?.id === section.id;
                    const isLocked = lockedSectionIds.has(section.id);
                    return (
                      <button
                        key={section.id}
                        type="button"
                        data-testid={`quiz-mock-section-${sectionIndex}`}
                        disabled={isLocked || (isStrictQiyasMode && !isActive)}
                        title={
                          isLocked
                            ? 'انتهى وقت هذا القسم ولا يمكن العودة إليه'
                            : isStrictQiyasMode && !isActive
                              ? 'في محاكي قياس الصارم، يتم الانتقال بين الأقسام بالترتيب'
                              : undefined
                        }
                        onClick={() => {
                          if (isLocked || (isStrictQiyasMode && !isActive) || section.firstQuestionIndex < 0) return;
                          setCurrentQuestionIndex(section.firstQuestionIndex);
                        }}
                        className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-black transition-colors ${
                          isLocked
                            ? isNightMode
                              ? 'border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                              : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                            : isActive
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                              : isNightMode
                                ? 'border-slate-700 bg-slate-950 text-slate-200 hover:border-indigo-500'
                                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-indigo-200 hover:bg-white'
                        }`}
                      >
                        {isLocked && <span className="ml-1">🔒</span>}
                        <span>{section.title}</span>
                        <span className={`mr-2 rounded-full px-2 py-0.5 ${
                          isLocked
                            ? isNightMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-400'
                            : isActive ? 'bg-white/15 text-white' : isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-gray-500'
                        }`}>
                          {section.answered}/{section.total}
                        </span>
                        {section.timeLimit && !isLocked && (
                          <span className={`mr-1 text-[10px] opacity-60`}>
                            {section.timeLimit}د
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Main Quiz Runner Layout: Question Card (Main) & Question Board (Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Main Distraction-Free Question Card Column */}
              <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                <div className={`${isNightMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} rounded-3xl shadow-sm border overflow-hidden`}>
                  {/* Question Card Header */}
                  <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    isNightMode ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50/60'
                  }`}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        data-testid="quiz-question-counter"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black ${
                          isNightMode ? 'bg-slate-800 text-indigo-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}
                      >
                        {currentMockExamSection
                          ? `${currentMockExamSection.title} • السؤال ${
                              isStrictQiyasMode
                                ? `${currentMockExamSection.questionIndexes.indexOf(currentQuestionIndex) + 1} من ${currentMockExamSection.total}`
                                : `${currentQuestionIndex + 1} من ${quizQuestions.length}`
                            }`
                          : `السؤال ${currentQuestionIndex + 1} من ${quizQuestions.length}`}
                      </span>
                      {currentQuestion?.difficulty && (
                        <span className={`${isNightMode ? 'bg-slate-800 text-slate-300' : getQuizDifficultyBadgeClass(currentQuestion?.difficulty)} text-xs px-2.5 py-1 rounded-xl font-bold`}>
                          {getQuizDifficultyLabel(currentQuestion?.difficulty)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {shouldShowQuestionReview ? (
                        <button
                          type="button"
                          onClick={handleToggleCurrentReviewLater}
                          className={`${
                            flaggedQuestionIds.includes(currentQuestion.id)
                              ? (isNightMode ? 'bg-purple-950 text-purple-200 ring-1 ring-purple-800' : 'bg-purple-50 text-purple-700 ring-1 ring-purple-200')
                              : (isNightMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50')
                          } inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition shadow-xs`}
                          title="تمييز السؤال للمراجعة لاحقاً"
                        >
                          <Star size={14} className={flaggedQuestionIds.includes(currentQuestion.id) ? 'fill-current text-purple-500' : 'text-gray-400'} />
                          <span>{flaggedQuestionIds.includes(currentQuestion.id) ? 'تمت إضافته للمراجعة' : 'مراجعة لاحقاً'}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="p-4 sm:p-7 space-y-6">
                    {/* Dedicated Reading Passage Pane (استيعاب المقروء) */}
                    {passageText && (
                      <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs ${
                        isNightMode
                          ? 'border-amber-900/50 bg-amber-950/20 text-amber-100'
                          : 'border-amber-200/80 bg-amber-50/40 text-amber-950'
                      }`}>
                        <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
                          isNightMode ? 'border-amber-900/40' : 'border-amber-200/60'
                        }`}>
                          <div className="flex items-center gap-2 font-black text-sm text-amber-800 dark:text-amber-300">
                            <BookOpen size={18} className="text-amber-600 dark:text-amber-400" />
                            <span>النص القرائي (استيعاب المقروء)</span>
                          </div>
                          <div className={`flex items-center gap-1 rounded-lg p-1 border text-xs ${
                            isNightMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/90 border-amber-200'
                          }`}>
                            <button
                              type="button"
                              onClick={() => setPassageFontSize((prev) => (prev === 'lg' ? 'base' : 'sm'))}
                              className={`px-2 py-0.5 rounded font-black transition-colors ${
                                passageFontSize === 'sm' ? 'bg-amber-600 text-white' : 'hover:bg-amber-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                              }`}
                              title="تصغير خط القطعة"
                            >
                              A-
                            </button>
                            <button
                              type="button"
                              onClick={() => setPassageFontSize('base')}
                              className={`px-2 py-0.5 rounded font-black transition-colors ${
                                passageFontSize === 'base' ? 'bg-amber-600 text-white' : 'hover:bg-amber-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                              }`}
                              title="الحجم الافتراضي"
                            >
                              A
                            </button>
                            <button
                              type="button"
                              onClick={() => setPassageFontSize((prev) => (prev === 'sm' ? 'base' : 'lg'))}
                              className={`px-2 py-0.5 rounded font-black transition-colors ${
                                passageFontSize === 'lg' ? 'bg-amber-600 text-white' : 'hover:bg-amber-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                              }`}
                              title="تكبير خط القطعة"
                            >
                              A+
                            </button>
                          </div>
                        </div>
                        <div
                          className={`max-h-[340px] overflow-y-auto pr-2 font-normal leading-loose break-words select-text ${
                            passageFontSize === 'sm'
                              ? 'text-sm'
                              : passageFontSize === 'lg'
                                ? 'text-lg font-medium'
                                : 'text-base'
                          } ${isNightMode ? 'text-slate-200' : 'text-gray-800'}`}
                          dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(passageText) }}
                        />
                      </div>
                    )}

                    <div
                      data-testid="quiz-current-question"
                      data-question-id={currentQuestion?.id || ''}
                      onClick={handleInlineQuestionImageClick}
                      className={`question-html text-base sm:text-lg lg:text-xl font-medium leading-relaxed break-words [&_img]:cursor-zoom-in [&_img]:rounded-xl [&_img]:max-h-[300px] [&_img]:mx-auto [&_img]:my-2 ${
                        isNightMode ? 'text-slate-100' : 'text-gray-900'
                      }`}
                      dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(questionText) }}
                    />

                    {/* Question Diagram / Image with Zoom */}
                    {currentQuestion?.imageUrl && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setZoomedImageUrl(currentQuestion.imageUrl || null)}
                          className={`group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border p-3 transition-all hover:border-indigo-300 hover:shadow-md ${
                            isNightMode ? 'border-slate-700 bg-slate-950' : 'border-gray-200 bg-slate-50/50'
                          }`}
                          title="اضغط لتكبير الصورة وفحص الرسم البياني أو الهندسي"
                        >
                          <img
                            src={currentQuestion.imageUrl}
                            alt="صورة السؤال"
                            className="mx-auto max-h-[280px] sm:max-h-[360px] w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setZoomedImageUrl(currentQuestion.imageUrl || null)}
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                              isNightMode
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                            }`}
                          >
                            <ZoomIn size={13} />
                            <span>اضغط على الصورة للتكبير</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Answer Options Grid (without duplicate letter badge) */}
                    <div className={`grid ${optionGridClass} gap-3 pt-2`}>
                      {currentDisplayOptions.map((displayOption, displayIndex) => {
                        const isSelected = selectedOptions[currentQuestion.id] === displayOption.originalIndex;
                        const optionLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
                        const fallbackLetter = optionLetters[displayIndex] || String(displayIndex + 1);
                        const hasText = Boolean(displayOption.text && displayOption.text.trim().length > 0);

                        return (
                          <button
                            key={displayOption.originalIndex}
                            data-testid={`quiz-answer-option-${displayIndex}`}
                            onClick={() => handleOptionSelect(displayIndex)}
                            className={`${optionButtonHeightClass} group w-full px-4 py-3 rounded-2xl border-2 transition-all flex items-center justify-between text-right gap-3 shadow-xs hover:shadow-sm ${
                              isSelected
                                ? (isNightMode ? 'border-indigo-500 bg-indigo-950/90 shadow-indigo-950/40 ring-1 ring-indigo-500/50' : 'border-indigo-600 bg-indigo-50/85 shadow-indigo-100 ring-2 ring-indigo-100')
                                : (isNightMode ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-800/60' : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50/90 bg-white')
                            }`}
                          >
                            <span className={`flex-1 text-xs sm:text-sm md:text-base font-bold leading-relaxed break-words text-center ${
                              isSelected
                                ? (isNightMode ? 'text-white' : 'text-indigo-950')
                                : (isNightMode ? 'text-slate-200 group-hover:text-slate-100' : 'text-gray-800 group-hover:text-indigo-950')
                            }`}>
                              {hasText ? (
                                <span className="question-html" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(displayOption.text) }} />
                              ) : (
                                <span className="question-html font-black">{fallbackLetter}</span>
                              )}
                            </span>

                            <div className="flex items-center shrink-0">
                              <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                                  : isNightMode
                                    ? 'border-slate-600 bg-slate-900 group-hover:border-slate-500'
                                    : 'border-slate-300 bg-white group-hover:border-indigo-300'
                              }`}>
                                {isSelected ? (
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Bar at Bottom of Question Card */}
                  <div className={`${isNightMode ? 'border-slate-800 bg-slate-950' : 'border-gray-100 bg-gray-50/70'} flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:p-5`}>
                    <button
                      type="button"
                      data-testid="quiz-prev-button"
                      onClick={handlePrev}
                      disabled={currentQuestionIndex === 0 || (isStrictQiyasMode && currentQuestionIndex === currentMockExamSection?.firstQuestionIndex)}
                      title={isStrictQiyasMode && currentQuestionIndex === currentMockExamSection?.firstQuestionIndex ? 'لا يمكن العودة للقسم السابق في محاكي قياس الصارم' : undefined}
                      className={`${
                        isNightMode ? 'text-slate-300 hover:bg-slate-800 border-slate-700' : 'text-gray-700 hover:bg-gray-100 border-gray-200 bg-white'
                      } inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-black shadow-xs transition disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <ArrowRight size={16} />
                      السابق
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        data-testid="quiz-save-progress-button"
                        onClick={handleSaveQuizProgress}
                        disabled={isSubmittingResult}
                        className={`${
                          isNightMode ? 'border-emerald-800 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        } inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60`}
                        title="حفظ تقدم الإجابات يدوياً"
                      >
                        <Save size={15} />
                        <span>حفظ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!currentQuestion) return;
                          setFlaggedQuestionIds((prev) =>
                            prev.includes(currentQuestion.id)
                              ? prev.filter((id) => id !== currentQuestion.id)
                              : [...prev, currentQuestion.id]
                          );
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-black transition shadow-xs ${
                          currentQuestion && flaggedQuestionIds.includes(currentQuestion.id)
                            ? 'border-amber-400 bg-amber-500 text-white shadow-amber-200'
                            : isNightMode
                              ? 'border-amber-800/80 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60'
                              : 'border-amber-200 bg-amber-50/80 text-amber-800 hover:bg-amber-100'
                        }`}
                        title="حفظ السؤال للمراجعة قبل التسليم"
                      >
                        <Bookmark size={15} />
                        <span>{currentQuestion && flaggedQuestionIds.includes(currentQuestion.id) ? 'تعليم للمراجعة 🚩' : 'حفظ للمراجعة'}</span>
                      </button>
                    </div>

                    {currentQuestionIndex === quizQuestions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setShowFinishDialog(true)}
                        disabled={isSubmittingResult}
                        className="inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xs transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={16} />
                        {isSubmittingResult ? 'جارٍ الحفظ...' : 'إنهاء'}
                      </button>
                    ) : (isStrictQiyasMode && currentMockExamSection && currentQuestionIndex === currentMockExamSection.questionIndexes[currentMockExamSection.questionIndexes.length - 1]) ? (
                      <button
                        type="button"
                        data-testid="quiz-next-button"
                        onClick={handleNext}
                        disabled={Boolean(isNextBlocked)}
                        title="إنهاء القسم والانتقال للقسم التالي"
                        className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xs transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>إنهاء القسم والانتقال</span>
                        <ArrowLeft size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid="quiz-next-button"
                        onClick={handleNext}
                        disabled={Boolean(isNextBlocked)}
                        title={isNextBlocked ? 'اختر إجابة قبل الانتقال للسؤال التالي' : undefined}
                        className="inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        التالي
                        <ArrowLeft size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Dedicated Question Board Sidebar (لوحة الأسئلة) */}
              <div className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">
                {/* 1. Timer Card */}
                <div className={`${isNightMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} rounded-3xl p-4 sm:p-5 shadow-sm border`}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-amber-500" />
                      <span className={`text-xs font-black ${isNightMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        العد التنازلي المتبقي
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid="quiz-pause-button"
                      onClick={handlePauseQuiz}
                      disabled={isSubmittingResult}
                      className={`${
                        isNightMode ? 'border-amber-800/70 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      } inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60`}
                      title="إيقاف مؤقت للاختبار"
                    >
                      <PauseCircle size={14} />
                      <span>إيقاف مؤقت</span>
                    </button>
                  </div>

                  {/* Big Digital Countdown */}
                  {isStrictQiyasMode && sectionTimeLeft !== null && !isFinished && currentMockExamSection ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black text-violet-700 dark:text-violet-300 px-1">
                        <span className="truncate">وقت {currentMockExamSection.title}</span>
                        <span className="text-[10px] bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded-full font-bold shrink-0">مؤقت القسم</span>
                      </div>
                      <div className={`flex items-center justify-center rounded-2xl py-3 px-4 text-center font-mono ${
                        sectionTimeLeft <= 60
                          ? 'bg-red-500/10 border-2 border-red-500 text-red-600 animate-pulse'
                          : isNightMode ? 'bg-slate-950 border border-violet-800 text-violet-300' : 'bg-violet-50/80 border-2 border-violet-200 text-violet-800'
                      }`}>
                        <span className="text-2xl sm:text-3xl font-black tracking-widest">
                          {Math.floor(sectionTimeLeft / 60)}:{String(sectionTimeLeft % 60).padStart(2, '0')}
                        </span>
                      </div>
                      {timeLeft !== null && (
                        <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          isNightMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}>
                          <span>الوقت الإجمالي للاختبار:</span>
                          <span className="font-mono font-black">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                        </div>
                      )}
                    </div>
                  ) : timeLeft !== null && !isFinished ? (
                    <div className={`flex items-center justify-center rounded-2xl py-3 px-4 text-center font-mono ${
                      timeLeft <= 180
                        ? 'bg-red-500/10 border-2 border-red-500 text-red-600 animate-pulse'
                        : isNightMode ? 'bg-slate-950 border border-slate-800 text-amber-300' : 'bg-amber-50/70 border border-amber-200 text-amber-800'
                    }`}>
                      <span className="text-2xl sm:text-3xl font-black tracking-widest">
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-xs font-bold text-gray-400">
                      بدون وقت محدد
                    </div>
                  )}
                </div>

                {/* 2. Question Board Card (لوحة الأسئلة) */}
                <div className={`${isNightMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} rounded-3xl p-4 sm:p-5 shadow-sm border space-y-4`}>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={18} className="text-indigo-600" />
                      <h3 className={`font-black text-sm sm:text-base ${isNightMode ? 'text-white' : 'text-gray-900'}`}>
                        لوحة الأسئلة
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                      {isStrictQiyasMode && currentMockExamSection ? `${currentMockExamSection.total} سؤال بالقسم` : `${quizQuestions.length} سؤال`}
                    </span>
                  </div>

                  {/* Status Legend with Live Counters */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black">
                    <div className={`p-2 rounded-xl border ${isNightMode ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300' : 'border-emerald-100 bg-emerald-50/80 text-emerald-700'}`}>
                      <div className="text-base font-black">
                        {isStrictQiyasMode && currentMockExamSection ? currentMockExamSection.answered : answeredQuestionCount}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-90">تمت الإجابة</div>
                    </div>
                    <div className={`p-2 rounded-xl border ${isNightMode ? 'border-slate-800 bg-slate-950/60 text-slate-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                      <div className="text-base font-black">
                        {isStrictQiyasMode && currentMockExamSection
                          ? currentMockExamSection.total - currentMockExamSection.answered
                          : quizQuestions.length - answeredQuestionCount}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-90">لم يجب</div>
                    </div>
                    <div className={`p-2 rounded-xl border ${isNightMode ? 'border-purple-900/60 bg-purple-950/40 text-purple-300' : 'border-purple-100 bg-purple-50/80 text-purple-700'}`}>
                      <div className="text-base font-black">
                        {isStrictQiyasMode && currentMockExamSection
                          ? currentMockExamSection.questionIndexes.filter((idx) => {
                              const q = quizQuestions[idx];
                              return q ? (flaggedQuestionIds.includes(q.id)) : false;
                            }).length
                          : reviewQuestionCount}
                      </div>
                      <div className="text-[10px] mt-0.5 opacity-90">للمراجعة</div>
                    </div>
                  </div>

                  {/* Question Grid Buttons with Scroll */}
                  <div className="max-h-[300px] overflow-y-auto pr-1 pl-0.5 py-1">
                    <div className="grid grid-cols-5 gap-2">
                      {(isStrictQiyasMode && currentMockExamSection ? currentMockExamSection.questionIndexes : quizQuestions.map((_, i) => i)).map((index, pos) => {
                        const question = quizQuestions[index];
                        if (!question) return null;
                        const isAnswered = selectedOptions[question.id] !== undefined;
                        const isMarkedForReview = flaggedQuestionIds.includes(question.id);
                        const isCurrent = index === currentQuestionIndex;
                        const displayNum = isStrictQiyasMode ? pos + 1 : index + 1;
                        const title = isCurrent
                          ? `السؤال ${displayNum} الحالي`
                          : isAnswered
                            ? `السؤال ${displayNum} تمت الإجابة`
                            : isMarkedForReview
                              ? `السؤال ${displayNum} للمراجعة`
                              : `السؤال ${displayNum} لم يجب`;

                        return (
                          <button
                            key={question.id}
                            type="button"
                            data-testid={`quiz-question-map-${index + 1}`}
                            onClick={() => setCurrentQuestionIndex(index)}
                            className={`h-9 rounded-xl border-2 text-xs font-black transition-all flex items-center justify-center shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-300 ${getQuestionNumberClass(question, index)}`}
                            aria-label={title}
                            title={title}
                          >
                            {displayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prominent Finish Button in Sidebar */}
                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      data-testid="quiz-finish-button"
                      onClick={() => setShowFinishDialog(true)}
                      disabled={isSubmittingResult}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 px-4 text-sm font-black text-white shadow-md transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 size={18} />
                      <span>{isSubmittingResult ? 'جارٍ تسليم الاختبار...' : 'إنهاء وتسليم الاختبار'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {isPassed ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {isPassed ? 'مبروك! لقد اجتزت الاختبار' : 'للأسف، لم تجتز الاختبار'}
              </h2>
              <p className="text-gray-500 mb-8">
                درجة النجاح المطلوبة هي {passingScore}%
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">النتيجة</div>
                  <div className={`text-2xl font-bold ${isPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                    {finalScore}%
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-sm text-emerald-600 mb-1">إجابات صحيحة</div>
                  <div className="text-2xl font-bold text-emerald-700">{correctAnswersCount}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="text-sm text-red-600 mb-1">إجابات خاطئة</div>
                  <div className="text-2xl font-bold text-red-700">{wrongAnswersCount}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">الوقت المستغرق</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {quizTimeLimit ? Math.floor((quizTimeLimit * 60 - (timeLeft || 0)) / 60) : 0} د
                  </div>
                </div>
              </div>

              {/* ── Section Breakdown (محاكيات فقط) ───────────────────────────── */}
              {(quiz.mockExam?.enabled && submittedSectionResults.length > 0) && (
                <div className="mt-6 text-right space-y-3">
                  <h3 className="text-base font-black text-gray-800 flex items-center gap-2 justify-center">
                    <span className="text-indigo-500">📊</span> تحليل الأقسام التفصيلي
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {submittedSectionResults.map((sec) => {
                      const pct = sec.score;
                      const color = pct >= 80 ? 'emerald' : pct >= 60 ? 'amber' : 'rose';
                      const colorMap = { emerald: { bar:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-100', label:'أداء ممتاز' }, amber: { bar:'bg-amber-400', badge:'bg-amber-50 text-amber-700 border-amber-100', label:'يحتاج مراجعة' }, rose: { bar:'bg-rose-500', badge:'bg-rose-50 text-rose-700 border-rose-100', label:'مراجعة عاجلة' } } as const;
                      const m = colorMap[color];
                      return (
                        <div key={sec.sectionId} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 text-right">
                          <div className="flex justify-between items-center mb-2">
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${m.badge}`}>{m.label}</span>
                            <span className="font-black text-sm text-gray-900">{sec.sectionName}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                            <div className={`h-full ${m.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex justify-between text-[11px] text-gray-500 font-bold">
                            <span className="text-rose-500">{sec.wrong} خطأ</span>
                            <span className="font-black text-gray-800">{pct}%</span>
                            <span className="text-emerald-600">{sec.correct}/{sec.total} صح</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Top Weak Skills ───────────────────────────────────────────── */}
              {(() => {
                const weak = [...submittedSkillsAnalysis].filter(s => s.status === 'weak' || s.status === 'average').sort((a,b) => a.mastery - b.mastery).slice(0, 4);
                if (!weak.length) return null;
                return (
                  <div className="mt-5 text-right space-y-2">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2 justify-center">
                      <span>🎯</span> المهارات التي تحتاج تحسين
                    </h3>
                    <div className="grid grid-cols-1 gap-2 text-right">
                      {weak.map((s, i) => {
                        const recommendation = buildSkillRecommendation(s, {
                          allSkills: skills,
                          lessons,
                          quizzes,
                          libraryItems,
                          questions,
                          topics,
                          subjects,
                          sections,
                        });
                        const lessonLink = recommendation.lessonLink || recommendation.foundationTopicLink;
                        const trainingLink = recommendation.quizLink;
                        return (
                          <div key={`${s.skillId || s.skill}-${i}`} className={`rounded-xl border p-3 ${s.status === 'weak' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-gray-800">{s.skill}</span>
                              <span className={`text-sm font-black ${s.status === 'weak' ? 'text-rose-700' : 'text-amber-700'}`}>{s.mastery}%</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {lessonLink ? <button type="button" onClick={() => navigate(lessonLink)} className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50">شرح</button> : null}
                              {trainingLink ? <button type="button" onClick={() => navigate(trainingLink)} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-50">تدريب</button> : null}
                              <button type="button" onClick={() => navigate(buildSelfQuizLink(true))} className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-50">إعادة قياس</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                <button onClick={() => navigate('/')} className="w-full sm:w-auto px-6 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                  العودة للرئيسية
                </button>
                <button onClick={handleRestartQuiz} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                  إعادة الاختبار
                </button>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={() => navigate(buildSelfQuizLink(false))} className="w-full sm:w-auto bg-amber-50 text-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2">
                  <FileQuestion size={20} />
                  طلب اختبار مشابه
                </button>
                <button onClick={() => navigate(buildSelfQuizLink(true))} className="w-full sm:w-auto bg-emerald-50 text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                  <Target size={20} />
                  اختبار للمهارات الضعيفة
                </button>
              </div>
            </div>

            {quizSettings.showAnswers && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">مراجعة الإجابات</h3>
                <div className="space-y-8">
                  {quizQuestions.map((question, index) => {
                    const userAnswer = selectedOptions[question.id];
                    const isCorrect = userAnswer === question.correctOptionIndex;

                    return (
                      <div key={question.id} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold ${
                            userAnswer === undefined ? 'bg-gray-300' : isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-4">
                              <div
                                onClick={handleInlineQuestionImageClick}
                                className="question-html text-gray-800 font-medium [&_img]:cursor-zoom-in"
                                dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(question.text) }}
                              />
                              <button
                                onClick={() => void toggleQuestionSavedForReview(question.id)}
                                className="text-gray-400 hover:text-amber-500 transition-colors p-2"
                                title="مراجعة لاحقًا"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={flaggedQuestionIds.includes(question.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                              </button>
                            </div>
                            {question.imageUrl && (
                              <button
                                type="button"
                                onClick={() => setZoomedImageUrl(question.imageUrl || null)}
                                className="mb-4 block w-full cursor-zoom-in rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
                              >
                                <img
                                  src={question.imageUrl}
                                  alt="صورة السؤال"
                                  className="mx-auto max-h-64 w-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </button>
                            )}
                            <div className={`grid ${getQuizOptionGridClass(question.options, activeOptionLayout)} gap-2`}>
                              {question.options.map((option, optionIndex) => {
                                let bgClass = 'bg-gray-50 border-gray-200';
                                let helperLabel = '';
                                if (quizSettings.showAnswers) {
                                  if (optionIndex === question.correctOptionIndex) {
                                    bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
                                    helperLabel = 'الإجابة الصحيحة';
                                  } else if (optionIndex === userAnswer && !isCorrect) {
                                    bgClass = 'bg-red-50 border-red-200 text-red-700';
                                    helperLabel = 'اختيارك';
                                  }
                                } else if (optionIndex === userAnswer) {
                                  bgClass = 'bg-indigo-50 border-indigo-200 text-indigo-700';
                                  helperLabel = 'اختيارك';
                                }

                                return (
                                  <div key={optionIndex} className={`${getQuizOptionButtonHeightClass(question.options, activeOptionLayout)} p-2 rounded-xl border flex items-center justify-between gap-2 ${bgClass}`}>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      optionIndex === question.correctOptionIndex ? 'border-emerald-500 bg-emerald-500' :
                                      optionIndex === userAnswer ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                    }`}>
                                      {(optionIndex === question.correctOptionIndex || optionIndex === userAnswer) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div className="min-w-0 flex-1 text-center">
                                      <span className="question-html block break-words text-sm font-bold leading-6" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(option) }} />
                                      {helperLabel ? <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-black">{helperLabel}</span> : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {(quizSettings.showExplanations || question.videoUrl) && (
                              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
                                {question.explanation && (
                                  <div>
                                    <h4 className="font-bold text-indigo-900 mb-1 text-sm">شرح الإجابة:</h4>
                                    <div className="question-html text-indigo-800 text-sm leading-6" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(question.explanation) }} />
                                  </div>
                                )}
                                {question.videoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setVideoModalUrl(question.videoUrl || null)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                  >
                                    <Video size={16} />
                                    <span>مشاهدة فيديو الشرح التفصيلي للحل</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">سؤال وجواب حول الاختبار</h3>
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {user?.name?.charAt(0) || 'أ'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={qaDraft}
                        onChange={(event) => setQaDraft(event.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                        placeholder="هل لديك سؤال حول هذا الاختبار؟ اطرحه هنا..."
                      />
                      <div className="flex justify-end mt-2">
                        <button onClick={handleSubmitQuestion} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                          إرسال السؤال
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {qaThread.map((threadItem) => (
                    <div key={threadItem.id} className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                        threadItem.role === 'teacher' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {threadItem.author.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className={`p-4 rounded-xl border rounded-tr-none ${
                          threadItem.role === 'teacher' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'
                        }`}>
                          <p className={`text-sm font-bold mb-1 ${threadItem.role === 'teacher' ? 'text-emerald-800' : 'text-gray-800'}`}>
                            {threadItem.author}
                          </p>
                          <p className={threadItem.role === 'teacher' ? 'text-sm text-emerald-700' : 'text-gray-600'}>
                            {threadItem.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Advance Confirmation Modal for Strict Qiyas Mode */}
      {showSectionConfirmModal && currentMockExamSection && !isFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-lg rounded-3xl border-2 border-violet-950 bg-white p-6 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <AlertCircle size={30} />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              إنهاء {currentMockExamSection.title} والانتقال؟
            </h3>
            <div className="text-sm text-slate-600 leading-relaxed space-y-2">
              <p className="font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                ⚠️ تنبيه قياس المعياري: بمجرد تأكيد الانتقال للقسم التالي، سيتم إغلاق هذا القسم نهائياً ولن تتمكن من العودة إليه أو تعديل إجاباته.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-black">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-500">تمت الإجابة</div>
                  <div className="text-sm text-emerald-600 font-black mt-0.5">
                    {currentMockExamSection.answered} من {currentMockExamSection.total}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-gray-500">بدون إجابة</div>
                  <div className="text-sm text-rose-600 font-black mt-0.5">
                    {currentMockExamSection.total - currentMockExamSection.answered}
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="quiz-section-confirm-cancel"
                onClick={() => setShowSectionConfirmModal(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-black text-gray-700 hover:bg-gray-50 transition-colors"
              >
                العودة لمراجعة القسم
              </button>
              <button
                type="button"
                data-testid="quiz-section-confirm-next"
                onClick={handleConfirmSectionAdvance}
                className="rounded-xl bg-violet-600 px-4 py-3 font-black text-white hover:bg-violet-700 transition-colors shadow-sm"
              >
                نعم، إنهاء القسم والانتقال
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinishDialog && !isFinished ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-xl rounded-3xl border-2 border-cyan-950 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertCircle size={30} />
            </div>
            <h3 className="text-xl font-black text-slate-900">هل تريد إنهاء الاختبار الآن؟</h3>
            <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-7 text-slate-600">
              {quizQuestions.length - answeredQuestionCount > 0
                ? `يوجد ${quizQuestions.length - answeredQuestionCount} سؤال لم تتم الإجابة عنه بعد. إذا اخترت نعم سيتم حفظ نتيجتك فورًا ولن تتمكن من تعديل إجاباتك.`
                : 'تمت الإجابة عن كل الأسئلة. إذا اخترت نعم سيتم حفظ نتيجتك فورًا وعرض التقرير.'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="quiz-finish-cancel"
                onClick={() => setShowFinishDialog(false)}
                className="rounded-xl bg-rose-500 px-5 py-3 font-black text-white transition-colors hover:bg-rose-600"
              >
                لا
              </button>
              <button
                type="button"
                data-testid="quiz-finish-confirm"
                onClick={() => {
                  setShowFinishDialog(false);
                  handleFinish();
                }}
                disabled={isSubmittingResult}
                className="rounded-xl bg-cyan-950 px-5 py-3 font-black text-white transition-colors hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingResult ? 'جاري الحفظ...' : 'نعم'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Interactive Question Image Magnifier Modal */}
      <QuestionImageZoomModal
        imageUrl={zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
        altText="صورة السؤال أو الرسم الهندسي"
      />

      {/* Qiyas Formula Sheet Modal */}
      {showFormulaSheet && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border border-amber-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-black text-amber-900 flex items-center gap-2">
                <BookOpen className="text-amber-600" size={24} />
                قوانين قياس الهندسية والرياضية المهمة
              </h3>
              <button onClick={() => setShowFormulaSheet(false)} className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4 text-sm text-gray-800 leading-7">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                <h4 className="font-black text-amber-900 mb-1">📐 أشكال ومساحات هندسية</h4>
                <ul className="list-disc list-inside space-y-1 text-amber-950">
                  <li><strong>مساحة المثلث:</strong> (القاعدة × الارتفاع) ÷ 2</li>
                  <li><strong>مساحة الدائرة:</strong> ط × نق² (حيث ط ≈ 3.14 أو 22/7)</li>
                  <li><strong>محيط الدائرة:</strong> 2 × ط × نق</li>
                  <li><strong>مساحة المستطيل:</strong> الطول × العرض</li>
                  <li><strong>مجموع زوايا المثلث:</strong> 180 درجة | <strong>مجموع زوايا الشكل الرباعي:</strong> 360 درجة</li>
                </ul>
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200">
                <h4 className="font-black text-indigo-900 mb-1">📊 القوانين الجبرية والنسبة</h4>
                <ul className="list-disc list-inside space-y-1 text-indigo-950">
                  <li><strong>المتوسط الحسابي:</strong> مجموع القيم ÷ عددها</li>
                  <li><strong>النسبة المئوية:</strong> (الجزء ÷ الكل) × 100%</li>
                  <li><strong>السرعة:</strong> المسافة ÷ الزمن</li>
                  <li><strong>الربح الصافي:</strong> البيع - التكلفة</li>
                </ul>
              </div>
            </div>
            <div className="pt-2 text-left">
              <button onClick={() => setShowFormulaSheet(false)} className="px-5 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700">
                فهمت، العودة للاختبار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Video Explanation Modal */}
      {videoModalUrl && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-3xl w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                <Video className="text-indigo-600" size={22} />
                فيديو الشرح التفصيلي للحل
              </h3>
              <button onClick={() => setVideoModalUrl(null)} className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200">
                <XCircle size={20} />
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
              {videoModalUrl.includes('youtube.com') || videoModalUrl.includes('youtu.be') ? (
                <iframe
                  src={videoModalUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  title="شرح السؤال"
                />
              ) : (
                <video src={videoModalUrl} controls className="w-full h-full" autoPlay />
              )}
            </div>
            <div className="text-left">
              <button onClick={() => setVideoModalUrl(null)} className="px-5 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                إغلاق الشرح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

