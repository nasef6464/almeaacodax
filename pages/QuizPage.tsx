import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Question, Quiz, QuizResult } from '../types';
import { Clock, AlertCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, FileQuestion, Target, Star, Moon, Sun } from 'lucide-react';
import { api } from '../services/api';
import { flattenMockExamQuestionIds, getMockExamTimeLimit } from '../utils/mockExam';
import { normalizeQuestionHtml } from '../utils/questionHtml';

interface QuestionThreadItem {
  id: string;
  author: string;
  role: 'student' | 'teacher';
  message: string;
}

const QUIZ_THEME_STORAGE_KEY = 'almeaa-quiz-night-mode';
const shuffleQuestions = (items: Question[]) => [...items].sort(() => Math.random() - 0.5);
const resolveQuestionFromBank = (questionBank: Question[], questionId: string) => {
  const normalizedId = String(questionId || '');
  const exact = questionBank.find((question) => question.id === normalizedId);
  if (exact) return exact;

  const withoutCopySuffix = normalizedId.replace(/_copy(?:_\d+)?$/i, '');
  if (withoutCopySuffix && withoutCopySuffix !== normalizedId) {
    return questionBank.find((question) => question.id === withoutCopySuffix);
  }

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
    skills,
    subjects,
    sections,
    toggleFavorite,
    toggleReviewLater,
    favorites,
    reviewLater,
  } = useStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessMessage, setAccessMessage] = useState('هذا الاختبار غير متاح لك حاليًا.');
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [qaDraft, setQaDraft] = useState('');
  const [qaThread, setQaThread] = useState<QuestionThreadItem[]>(INITIAL_QA_THREAD);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(QUIZ_THEME_STORAGE_KEY) === 'true';
  });
  const returnToParam = searchParams.get('returnTo') || '';
  const sourceParam = searchParams.get('source') || '';
  const safeReturnTo = useMemo(() => {
    if (!returnToParam) return '';
    if (returnToParam.startsWith('/') && !returnToParam.startsWith('//')) return returnToParam;
    return '';
  }, [returnToParam]);
  const resultSource = useMemo(() => {
    if (sourceParam) return sourceParam;
    if (quiz?.mockExam?.enabled) return 'mock-exam';
    if (quiz?.mode === 'saher') return 'self';
    return undefined;
  }, [quiz?.mockExam?.enabled, quiz?.mode, sourceParam]);
  const shouldReturnToSourceAfterFinish =
    Boolean(safeReturnTo) &&
    (searchParams.get('returnOnFinish') === '1' ||
      quiz?.settings?.returnToSourceOnFinish === true ||
      quiz?.settings?.showResultsReport === false);
  const returnLabel = useMemo(() => {
    if (sourceParam === 'foundation') return 'العودة لموضوع التأسيس';
    if (sourceParam === 'training') return 'العودة للتدريب';
    if (sourceParam === 'tests') return 'العودة للاختبارات';
    if (sourceParam === 'course') return 'العودة للدورة';
    if (sourceParam === 'mock-exam') return 'العودة للاختبارات المحاكية';
    return safeReturnTo ? 'العودة للمكان السابق' : 'الرجوع';
  }, [safeReturnTo, sourceParam]);
  const buildReturnToSourcePath = () => {
    if (!safeReturnTo) return '';
    const [path, query = ''] = safeReturnTo.split('?');
    const nextParams = new URLSearchParams(query);

    if (sourceParam === 'foundation') {
      nextParams.set('trainingDone', '1');
      nextParams.set('content', 'quizzes');
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
      setHasAccess(false);
      return;
    }

    setQuiz(foundQuiz);
    setSelectedOptions({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
    setShowFinishDialog(false);
    setQaDraft('');
    setQaThread(INITIAL_QA_THREAD);
    setAccessMessage('هذا الاختبار غير متاح لك حاليًا.');
    const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user.role);

    if (
      !isStaffViewer &&
      (!foundQuiz.isPublished || foundQuiz.showOnPlatform === false || (!!foundQuiz.approvalStatus && foundQuiz.approvalStatus !== 'approved'))
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

    const hasExplicitTargets = (foundQuiz.targetUserIds || []).length > 0 || (foundQuiz.targetGroupIds || []).length > 0;
    if (!isStaffViewer && ((foundQuiz.mode || 'regular') === 'central' || hasExplicitTargets)) {
      const userGroups = user.groupIds || [];
      const isUserTargeted =
        (foundQuiz.targetUserIds || []).length === 0 || (foundQuiz.targetUserIds || []).includes(user.id);
      const isGroupTargeted =
        (foundQuiz.targetGroupIds || []).length === 0 ||
        (foundQuiz.targetGroupIds || []).some((id) => userGroups.includes(id));

      if (!isUserTargeted || !isGroupTargeted) {
        setHasAccess(false);
        setAccessMessage('هذا اختبار مركزي موجّه لطلاب محددين فقط.');
        return;
      }
    }

    const access = foundQuiz.access || { type: 'free' as const };
    if (isStaffViewer) {
      setHasAccess(true);
    } else if (access.type === 'free') {
      setHasAccess(true);
    } else if (access.type === 'paid') {
      setHasAccess(checkAccess(foundQuiz.id, true) || hasScopedPackageAccess('tests', foundQuiz.pathId, foundQuiz.subjectId));
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
    const loadedQuestions = sourceQuestionIds
      .map((id) => resolveQuestionFromBank(questions, id))
      .filter((question): question is Question => Boolean(question));

    setQuizQuestions(
      foundQuiz.settings?.randomizeQuestions === false
        ? loadedQuestions
        : shuffleQuestions(loadedQuestions)
    );

    const effectiveTimeLimit = foundQuiz.mockExam?.enabled ? getMockExamTimeLimit(foundQuiz) : (foundQuiz.settings?.timeLimit || 0);
    if (effectiveTimeLimit && effectiveTimeLimit > 0) {
      setTimeLeft(effectiveTimeLimit * 60);
    } else {
      setTimeLeft(null);
    }
  }, [quizId, quizzes, questions, user, checkAccess, hasScopedPackageAccess]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isFinished && !isSubmittingResult) {
      const timerId = window.setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => window.clearTimeout(timerId);
    }

    if (timeLeft === 0 && !isFinished && !isSubmittingResult) {
      handleFinish();
    }
  }, [timeLeft, isFinished, isSubmittingResult]);

  const currentQuestion = quizQuestions[currentQuestionIndex];

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

  const finalScore = Math.round((correctAnswersCount / Math.max(quizQuestions.length, 1)) * 100);
  const passingScore = quiz?.settings?.passingScore ?? 50;
  const quizTimeLimit = quiz ? (quiz.mockExam?.enabled ? getMockExamTimeLimit(quiz) : (quiz.settings?.timeLimit || 0)) : 0;
  const isPassed = isFinished && quiz ? finalScore >= passingScore : false;
  const optionLayout = quiz?.settings?.optionLayout || 'auto';
  const getOptionGridClass = (question?: Question) => {
    if (optionLayout === 'two_columns') return 'grid-cols-1 sm:grid-cols-2';
    if (optionLayout === 'horizontal') return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
    return (question?.options?.length || 0) <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4';
  };
  const optionGridClass = getOptionGridClass(currentQuestion);
  const shouldShowQuestionReview = quiz?.settings?.allowQuestionReview !== false;
  const shouldShowProgressBar = quiz?.settings?.showProgressBar !== false;
  const answeredQuestionCount = quizQuestions.filter((question) => selectedOptions[question.id] !== undefined).length;
  const reviewQuestionCount = quizQuestions.filter((question) => reviewLater.includes(question.id)).length;
  const isNextBlocked =
    quiz?.settings?.requireAnswerBeforeNext === true &&
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

  const buildSelfQuizLink = (focusWeakSkills = false) => {
    const params = new URLSearchParams();
    params.set('mode', 'self');
    params.set('autostart', '1');
    params.set('questionCount', String(Math.max(quizQuestions.length, 10)));
    params.set('timeLimit', String(quiz?.settings?.timeLimit || 30));
    params.set('difficulty', focusWeakSkills ? 'Medium' : (quizQuestions[0]?.difficulty || 'Medium'));

    if (quiz?.pathId) params.set('pathId', quiz.pathId);
    if (quiz?.subjectId) params.set('subjectId', quiz.subjectId);
    if (focusWeakSkills && firstWeakSkill?.sectionId) params.set('sectionId', firstWeakSkill.sectionId);
    else if (quiz?.sectionId) params.set('sectionId', quiz.sectionId);

    return `/quiz?${params.toString()}`;
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (isFinished || !currentQuestion) return;
    setSelectedOptions((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
    recordQuestionAttempt({
      questionId: currentQuestion.id.toString(),
      selectedOptionIndex: optionIndex,
      isCorrect: optionIndex === currentQuestion.correctOptionIndex,
      timeSpentSeconds: 0,
      date: new Date().toISOString(),
    });
  };

  const handleToggleCurrentReviewLater = () => {
    if (!currentQuestion) return;
    toggleReviewLater(currentQuestion.id);
  };

  const getQuestionNumberClass = (question: Question, index: number) => {
    const isCurrent = index === currentQuestionIndex;
    const isAnswered = selectedOptions[question.id] !== undefined;
    const isMarkedForReview = reviewLater.includes(question.id);

    if (isCurrent) {
      return isNightMode
        ? 'border-amber-300 bg-amber-500 text-white shadow-md shadow-amber-950/30 ring-2 ring-amber-300/40'
        : 'border-amber-600 bg-amber-500 text-white shadow-md shadow-amber-100 ring-2 ring-amber-200';
    }

    if (isMarkedForReview) {
      return isNightMode
        ? 'border-purple-300 bg-purple-600 text-white shadow-sm shadow-purple-950/30'
        : 'border-purple-600 bg-purple-500 text-white shadow-sm shadow-purple-100';
    }

    if (isAnswered) {
      return isNightMode
        ? 'border-emerald-300 bg-emerald-600 text-white shadow-sm shadow-emerald-950/30'
        : 'border-emerald-600 bg-emerald-500 text-white shadow-sm shadow-emerald-100';
    }

    return isNightMode
      ? 'border-slate-600 bg-slate-950 text-slate-200 hover:border-amber-400 hover:bg-slate-900'
      : 'border-slate-300 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50';
  };

  const handleNext = () => {
    if (isNextBlocked) return;
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }
    setShowFinishDialog(true);
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
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
    };

    let resultAttemptDate = result.date;

    try {
      const serverResult = await api.submitQuiz(quiz.id, {
        answers: selectedOptions,
        timeSpentSeconds: Math.max(0, timeSpentSeconds),
      });
      const savedServerResult: QuizResult = {
        ...result,
        ...(serverResult as QuizResult),
        source: result.source,
        returnTo: result.returnTo,
      };
      if ((savedServerResult.questionReview?.length || 0) < result.questionReview.length) {
        savedServerResult.questionReview = result.questionReview;
        savedServerResult.totalQuestions = result.totalQuestions;
        savedServerResult.correctAnswers = result.correctAnswers;
        savedServerResult.wrongAnswers = result.wrongAnswers;
        savedServerResult.unanswered = result.unanswered;
      }
      resultAttemptDate = savedServerResult.date || result.date;
      hydrateExamResults([savedServerResult, ...examResults]);
    } catch (error) {
      console.error('Unable to submit quiz on server, saving local result instead:', error);
      saveExamResult(result);
    } finally {
      setIsSubmittingResult(false);
    }

    if (shouldReturnToSourceAfterFinish) {
      navigate(buildReturnToSourcePath() || safeReturnTo, { replace: true });
      return;
    }

    navigate(`/results?attempt=${encodeURIComponent(resultAttemptDate)}`);
  };

  const handleRestartQuiz = () => {
    if (!quiz) return;

    setSelectedOptions({});
    setCurrentQuestionIndex(0);
    setIsFinished(false);
    setQaDraft('');
    setQaThread(INITIAL_QA_THREAD);
    const effectiveTimeLimit = quiz.mockExam?.enabled ? getMockExamTimeLimit(quiz) : (quiz.settings?.timeLimit || 0);
    setTimeLeft(effectiveTimeLimit && effectiveTimeLimit > 0 ? effectiveTimeLimit * 60 : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (hasAccess === null) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
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
      <div className="max-w-4xl mx-auto px-4">
        <div className={`${isNightMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} rounded-2xl shadow-sm border p-4 sm:p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="min-w-0">
            <button
              type="button"
              onClick={handleReturnToPreviousPlace}
              className={`${isNightMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'} mb-3 inline-flex items-center gap-2 rounded-xl border ${isNightMode ? 'border-slate-700' : 'border-gray-200'} px-3 py-2 text-xs font-black`}
            >
              <ArrowRight size={16} />
              {returnLabel}
            </button>
            <h1 className={`text-xl sm:text-2xl font-bold break-words ${isNightMode ? 'text-white' : 'text-gray-800'}`}>{quiz.title}</h1>
            {quiz.description && <p className={`${isNightMode ? 'text-slate-400' : 'text-gray-500'} mt-1 text-sm`}>{quiz.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
              <span className={`${isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'} rounded-full px-3 py-1`}>
                تم حل {answeredQuestionCount} من {quizQuestions.length}
              </span>
              {shouldShowQuestionReview ? (
                <span className={`${isNightMode ? 'bg-amber-950 text-amber-200' : 'bg-amber-50 text-amber-700'} rounded-full px-3 py-1`}>
                  للمراجعة {reviewQuestionCount}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNightMode((value) => !value)}
              className={`${isNightMode ? 'bg-slate-800 text-amber-200 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'} inline-flex items-center gap-2 rounded-xl border ${isNightMode ? 'border-slate-700' : 'border-gray-200'} px-4 py-2 text-sm font-black shadow-sm`}
            >
              {isNightMode ? <Sun size={18} /> : <Moon size={18} />}
              {isNightMode ? 'النظام العادي' : 'النظام الليلي'}
            </button>
            {timeLeft !== null && !isFinished && (
              <div className={`${isNightMode ? 'bg-amber-950 text-amber-200' : 'bg-amber-50 text-amber-600'} self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold`}>
                <Clock size={20} />
                <span>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
              </div>
            )}
          </div>
        </div>

        {!isFinished ? (
          <div className={`${isNightMode ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'} rounded-2xl shadow-sm border overflow-hidden`}>
            {shouldShowProgressBar ? (
              <div className={`${isNightMode ? 'bg-slate-800' : 'bg-gray-100'} h-2 w-full`}>
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            ) : null}

            <div className="p-4 sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-6">
                <span className={`text-sm font-bold ${isNightMode ? 'text-slate-300' : 'text-gray-500'}`}>السؤال {currentQuestionIndex + 1} من {quizQuestions.length}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {shouldShowQuestionReview ? (
                    <button
                      onClick={handleToggleCurrentReviewLater}
                      className={`${reviewLater.includes(currentQuestion.id) ? (isNightMode ? 'bg-purple-950 text-purple-200 ring-1 ring-purple-800' : 'bg-purple-100 text-purple-700 ring-1 ring-purple-200') : (isNightMode ? 'bg-amber-950 text-amber-200 ring-1 ring-amber-900' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100')} inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition hover:opacity-90`}
                    >
                      <Star size={14} className={reviewLater.includes(currentQuestion.id) ? 'fill-current' : ''} />
                      {reviewLater.includes(currentQuestion.id) ? 'تم وضعه للمراجعة' : 'ضع السؤال للمراجعة'}
                    </button>
                  ) : null}
                  <span className={`${isNightMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'} text-xs px-2 py-1 rounded font-bold`}>{currentQuestion?.difficulty}</span>
                </div>
              </div>

              <div className={`text-base sm:text-lg mb-6 break-words ${isNightMode ? 'text-slate-100' : 'text-gray-800'}`} dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(currentQuestion?.text) }} />
              {currentQuestion?.imageUrl && (
                <button
                  type="button"
                  onClick={() => setZoomedImageUrl(currentQuestion.imageUrl || null)}
                  className={`${isNightMode ? 'border-slate-700 bg-slate-950' : 'border-gray-200 bg-white'} mb-8 block w-full cursor-zoom-in rounded-2xl border p-3 shadow-sm`}
                >
                  <img
                    src={currentQuestion.imageUrl}
                    alt="صورة السؤال"
                    className="mx-auto max-h-[340px] w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </button>
              )}

              <div className={`grid ${optionGridClass} gap-x-4 sm:gap-x-6 gap-y-4`}>
                {currentQuestion?.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    className={`min-h-[50px] w-full px-3 py-2 rounded-xl border-2 transition-all flex items-center justify-between text-right gap-3 shadow-sm ${
                      selectedOptions[currentQuestion.id] === index
                        ? (isNightMode ? 'border-indigo-400 bg-indigo-950' : 'border-indigo-600 bg-indigo-50')
                        : (isNightMode ? 'border-slate-700 bg-slate-950 hover:border-indigo-700 hover:bg-slate-800' : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50')
                    }`}
                  >
                    <span className={`flex-1 text-sm font-bold leading-relaxed text-center break-words ${isNightMode ? 'text-slate-100' : 'text-gray-700'}`}>
                      <span dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(option) }} />
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-lg font-black ${
                        selectedOptions[currentQuestion.id] === index ? 'border-indigo-600 text-indigo-600 bg-white' : (isNightMode ? 'border-slate-600 text-slate-400' : 'border-gray-300 text-gray-500')
                      }`}>
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          selectedOptions[currentQuestion.id] === index ? 'bg-indigo-600' : 'bg-transparent'
                        }`} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className={`${isNightMode ? 'border-slate-800 bg-slate-950/70' : 'border-gray-100 bg-gray-50'} mt-6 rounded-2xl border p-3`}>
                <div className={`mb-3 flex flex-wrap items-center justify-center gap-3 text-[11px] font-black ${isNightMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-amber-500 ring-2 ring-amber-100" />
                    السؤال الحالي
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                    تمت الإجابة
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-3 w-3 rounded-full border-2 ${isNightMode ? 'border-slate-500 bg-slate-950' : 'border-slate-300 bg-white'}`} />
                    لم يجب
                  </span>
                  {shouldShowQuestionReview ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="h-3 w-3 rounded-full bg-purple-500 ring-2 ring-purple-100" />
                      للمراجعة
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {quizQuestions.map((question, index) => {
                    const isAnswered = selectedOptions[question.id] !== undefined;
                    const isMarkedForReview = reviewLater.includes(question.id);
                    const title = index === currentQuestionIndex
                      ? `السؤال ${index + 1} الحالي`
                      : isAnswered
                        ? `السؤال ${index + 1} تمت الإجابة`
                        : isMarkedForReview
                          ? `السؤال ${index + 1} للمراجعة`
                          : `السؤال ${index + 1} لم يجب`;

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`h-8 w-8 rounded-md border-2 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-amber-300 ${getQuestionNumberClass(question, index)}`}
                        aria-label={title}
                        title={title}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`${isNightMode ? 'border-slate-800 bg-slate-950' : 'border-gray-100 bg-gray-50'} p-4 border-t flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center`}>
              <button
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className={`${isNightMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-200'} w-full sm:w-auto px-6 py-2 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                <ArrowRight size={18} />
                السابق
              </button>

              {currentQuestionIndex === quizQuestions.length - 1 ? (
                <button
                  onClick={() => setShowFinishDialog(true)}
                  disabled={isSubmittingResult}
                  className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingResult ? 'جاري حفظ النتيجة...' : 'إنهاء الاختبار'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={Boolean(isNextBlocked)}
                  title={isNextBlocked ? 'اختر إجابة قبل الانتقال للسؤال التالي' : undefined}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  التالي
                  <ArrowLeft size={18} />
                </button>
              )}
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

              <div className="flex flex-col sm:flex-row justify-center gap-4">
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

            {quiz.settings.showAnswers && (
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
                              <div className="text-gray-800 font-medium" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(question.text) }} />
                              <button
                                onClick={() => toggleFavorite(question.id)}
                                className="text-gray-400 hover:text-amber-500 transition-colors p-2"
                                title="إضافة للمفضلة"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={favorites.includes(question.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
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
                            <div className={`grid ${getOptionGridClass(question)} gap-2`}>
                              {question.options.map((option, optionIndex) => {
                                let bgClass = 'bg-gray-50 border-gray-200';
                                let helperLabel = '';
                                if (quiz.settings.showAnswers) {
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
                                  <div key={optionIndex} className={`min-h-[58px] p-2 rounded-xl border flex items-center justify-between gap-3 ${bgClass}`}>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      optionIndex === question.correctOptionIndex ? 'border-emerald-500 bg-emerald-500' :
                                      optionIndex === userAnswer ? 'border-red-500 bg-red-500' : 'border-gray-300'
                                    }`}>
                                      {(optionIndex === question.correctOptionIndex || optionIndex === userAnswer) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <div className="min-w-0 flex-1 text-center">
                                      <span className="block break-words text-sm font-bold leading-7" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(option) }} />
                                      {helperLabel ? <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-black">{helperLabel}</span> : null}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {quiz.settings.showExplanations && question.explanation && (
                              <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-900 mb-2 text-sm">شرح الإجابة:</h4>
                                <div className="text-indigo-800 text-sm" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(question.explanation) }} />
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
                onClick={() => setShowFinishDialog(false)}
                className="rounded-xl bg-rose-500 px-5 py-3 font-black text-white transition-colors hover:bg-rose-600"
              >
                لا
              </button>
              <button
                type="button"
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

      {zoomedImageUrl ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImageUrl(null)}
            className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-black text-gray-800 shadow-lg"
          >
            إغلاق
          </button>
          <img
            src={zoomedImageUrl}
            alt="تكبير صورة السؤال"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl bg-white object-contain"
            referrerPolicy="no-referrer"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
};
