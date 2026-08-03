import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clipboard, Download, FileQuestion, Loader2, Plus, Printer, QrCode, Search, Trophy } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../services/api';
import { Question } from '../../types';
import { UnifiedQuestionBuilder } from './builders/UnifiedQuestionBuilder';
import { EXAM_QUESTION_BANK_EMPTY_MESSAGE, useExamQuestionBank } from '../../utils/exams/questionBankSource';

type CreatedBarcodeTest = {
  test: {
    id: string;
    slug: string;
    title: string;
    testKind?: 'quick' | 'mock';
    status?: string;
  };
  publicUrl: string;
  qrPayload: string;
  summary?: {
    submissions: number;
    averageScore: number;
    lastSubmittedAt?: number;
  };
};

type BarcodeTestsListResponse = {
  items: Array<{
    id: string;
    slug: string;
    title: string;
    testKind: 'quick' | 'mock';
    status: string;
    questionCount: number;
    publicUrl: string;
    qrPayload: string;
    summary: {
      submissions: number;
      averageScore: number;
      lastSubmittedAt?: number;
    };
  }>;
};

type PublicBarcodeReport = {
  test?: {
    id: string;
    slug: string;
    title: string;
    testKind?: 'quick' | 'mock';
    passingScore?: number;
    questionCount?: number;
  };
  summary: {
    submissions: number;
    averageScore: number;
    passingScore?: number;
    passRate?: number;
    highestScore?: number;
    lowestScore?: number;
    averageTimeSeconds?: number;
    weakestSkills: Array<{ skillId: string; mastery: number; attempts: number }>;
    bySchool?: Array<{ name: string; submissions: number; averageScore: number; passRate: number }>;
    byClassroom?: Array<{ name: string; schoolName: string; submissions: number; averageScore: number; passRate: number }>;
    lowPerformers?: Array<{
      id: string;
      studentName: string;
      schoolName?: string;
      classroomName?: string;
      score: number;
      submittedAt: number;
    }>;
  };
  rows: Array<{
    id: string;
    studentName: string;
    schoolName?: string;
    classroomName?: string;
    score: number;
    totalQuestions?: number;
    correctAnswers?: number;
    wrongAnswers?: number;
    unanswered?: number;
    timeSpentSeconds?: number;
    skillsAnalysis?: Array<{ skillId: string; mastery: number; attempts?: number; status?: string }>;
    submittedAt: number;
  }>;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const csvCell = (value: unknown) => {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw.trim()) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const downloadCsv = (filename: string, rows: unknown[][]) => {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const formatDateTime = (timestamp?: number) =>
  timestamp
    ? new Date(timestamp).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
    : 'غير محدد';

const formatDuration = (seconds?: number) => {
  const value = Number(seconds || 0);
  if (!value) return 'غير محدد';
  const minutes = Math.floor(value / 60);
  const rest = value % 60;
  return `${minutes}د ${rest}ث`;
};

const openPrintReport = (report: PublicBarcodeReport, skillNameById: (skillId: string) => string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const rows = report.rows.slice(0, 80);
  const weakSkills = report.summary.weakestSkills || [];
  const schoolRows = report.summary.bySchool || [];
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>${escapeHtml(report.test?.title || 'تقرير اختبار الباركود')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 28px; color: #0f172a; }
          h1, h2 { margin: 0 0 10px; }
          .muted { color: #64748b; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
          .num { font-size: 24px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 9px; text-align: right; font-size: 12px; }
          th { background: #f8fafc; }
          .section { margin-top: 24px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(report.test?.title || 'تقرير اختبار الباركود')}</h1>
        <p class="muted">تقرير مختصر للإدارة - ${formatDateTime(Date.now())}</p>
        <div class="cards">
          <div class="card"><div class="muted">المحاولات</div><div class="num">${report.summary.submissions}</div></div>
          <div class="card"><div class="muted">المتوسط</div><div class="num">${report.summary.averageScore}%</div></div>
          <div class="card"><div class="muted">نسبة النجاح</div><div class="num">${report.summary.passRate || 0}%</div></div>
          <div class="card"><div class="muted">أقل درجة</div><div class="num">${report.summary.lowestScore || 0}%</div></div>
        </div>
        <div class="section">
          <h2>أضعف المهارات</h2>
          <table><thead><tr><th>المهارة</th><th>الإتقان</th><th>المحاولات</th></tr></thead><tbody>
            ${weakSkills.map((skill) => `<tr><td>${escapeHtml(skillNameById(skill.skillId))}</td><td>${skill.mastery}%</td><td>${skill.attempts}</td></tr>`).join('')}
          </tbody></table>
        </div>
        <div class="section">
          <h2>حسب المدرسة</h2>
          <table><thead><tr><th>المدرسة</th><th>المحاولات</th><th>المتوسط</th><th>نسبة النجاح</th></tr></thead><tbody>
            ${schoolRows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${row.submissions}</td><td>${row.averageScore}%</td><td>${row.passRate}%</td></tr>`).join('')}
          </tbody></table>
        </div>
        <div class="section">
          <h2>آخر المشاركات</h2>
          <table><thead><tr><th>الطالب</th><th>المدرسة</th><th>الفصل</th><th>الدرجة</th><th>التاريخ</th></tr></thead><tbody>
            ${rows.map((row) => `<tr><td>${escapeHtml(row.studentName)}</td><td>${escapeHtml(row.schoolName || '-')}</td><td>${escapeHtml(row.classroomName || '-')}</td><td>${row.score}%</td><td>${escapeHtml(formatDateTime(row.submittedAt))}</td></tr>`).join('')}
          </tbody></table>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const PublicBarcodeTestsManager: React.FC = () => {
  const { user, paths, subjects, sections, skills, groups, users, addQuestion } = useStore();
  const canCreateQuestions = user.role === 'admin' || user.role === 'teacher';
  const firstPathId = paths[0]?.id || '';
  const [pathId, setPathId] = useState(firstPathId);
  const activeSubjects = useMemo(() => subjects.filter((subject) => subject.pathId === pathId), [subjects, pathId]);
  const [subjectId, setSubjectId] = useState(activeSubjects[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [title, setTitle] = useState('اختبار سريع');
  const [description, setDescription] = useState('اختبار قصير للتعرف على مستواك.');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showResultToStudent, setShowResultToStudent] = useState(true);
  const [testKind, setTestKind] = useState<'quick' | 'mock'>('quick');
  const [audience, setAudience] = useState<'open' | 'targeted'>('open');
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>([]);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [timeLimit, setTimeLimit] = useState(20);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passingScore, setPassingScore] = useState(60);
  const [maxSubmissions, setMaxSubmissions] = useState('');
  const [startsAtLocal, setStartsAtLocal] = useState('');
  const [endsAtLocal, setEndsAtLocal] = useState('');
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [requireAnswerBeforeNext, setRequireAnswerBeforeNext] = useState(false);
  const [allowQuestionReview, setAllowQuestionReview] = useState(true);
  const [optionLayout, setOptionLayout] = useState<'auto' | 'horizontal' | 'two_columns'>('auto');
  const [createdTest, setCreatedTest] = useState<CreatedBarcodeTest | null>(null);
  const [savedTests, setSavedTests] = useState<BarcodeTestsListResponse['items']>([]);
  const [report, setReport] = useState<PublicBarcodeReport | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [lastReportRefreshAt, setLastReportRefreshAt] = useState<number | null>(null);

  const [liveMonitoring, setLiveMonitoring] = useState(false);
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'live-broadcast' | 'targeted-assignments' | 'reports-analytics'>('live-broadcast');
  const [pinCode, setPinCode] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [showProjectorModal, setShowProjectorModal] = useState(false);

  const normalizedSubjectId = subjectId || activeSubjects[0]?.id || '';
  const {
    questions: questionBankQuestions,
    isLoading: isQuestionBankLoading,
    error: questionBankError,
    refresh: refreshQuestionBank,
  } = useExamQuestionBank({
    pathId,
    subjectId: normalizedSubjectId,
    enabled: Boolean(pathId && normalizedSubjectId),
  });
  const activeSections = useMemo(
    () => sections.filter((section) => section.subjectId === normalizedSubjectId),
    [normalizedSubjectId, sections],
  );
  const targetGroups = useMemo(
    () => groups.filter((group) => {
      if (group.type === 'SCHOOL') return false;
      if (user.role === 'admin') return true;
      const userGroupIds = user.groupIds || [];
      return userGroupIds.includes(group.id) || group.supervisorIds?.includes(user.id) || group.ownerId === user.id;
    }),
    [groups, user.groupIds, user.id, user.role],
  );
  const targetStudents = useMemo(
    () => users.filter((item) => {
      if (item.role !== 'student') return false;
      if (user.role === 'admin') return true;
      return (user.schoolId && item.schoolId === user.schoolId)
        || (item.groupIds || []).some((groupId) => targetGroups.some((group) => group.id === groupId));
    }),
    [targetGroups, user.role, user.schoolId, users],
  );
  const eligibleQuestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return questionBankQuestions
      .filter((question) => {
        const approved = !question.approvalStatus || question.approvalStatus === 'approved';
        const matchesSection = !sectionId || question.sectionId === sectionId;
        const matchesType = questionTypeFilter === 'all' || question.type === questionTypeFilter;
        const matchesDifficulty = difficultyFilter === 'all' || question.difficulty === difficultyFilter;
        return approved && question.pathId === pathId && question.subject === normalizedSubjectId && matchesSection && matchesType && matchesDifficulty;
      })
      .filter((question) => !term || question.text.toLowerCase().includes(term))
      .slice(0, 80);
  }, [difficultyFilter, normalizedSubjectId, pathId, questionBankQuestions, questionTypeFilter, searchTerm, sectionId]);

  const selectedSkills = useMemo(() => {
    const selectedQuestions = questionBankQuestions.filter((question) => selectedQuestionIds.includes(question.id));
    return [...new Set(selectedQuestions.flatMap((question) => question.skillIds || []))];
  }, [questionBankQuestions, selectedQuestionIds]);

  const reportTopStudents = useMemo(() => {
    return [...(report?.rows || [])]
      .sort((a, b) => b.score - a.score || Number(a.timeSpentSeconds || 999999) - Number(b.timeSpentSeconds || 999999))
      .slice(0, 5);
  }, [report]);

  const fullPublicUrl = useMemo(() => {
    if (!createdTest) return '';
    const relative = createdTest.publicUrl || `/barcode-test/${createdTest.test.slug}`;
    return `${window.location.origin}${relative.startsWith('/') ? relative : `/${relative}`}`;
  }, [createdTest]);

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  const saveQuestionFromBuilder = async (questionPayload: Partial<Question>) => {
    setError('');
    setFeedback('');
    if (!canCreateQuestions) {
      setError('المشرف يستخدم الأسئلة المعتمدة فقط ولا يمكنه إنشاء أسئلة جديدة.');
      return;
    }

    try {
      const created = await addQuestion({
        ...questionPayload,
        id: `barcode_q_${Date.now()}`,
        pathId,
        subject: normalizedSubjectId,
        sectionId: questionPayload.sectionId || sectionId,
        skillIds: questionPayload.skillIds || [],
        ownerType: questionPayload.ownerType || (user.role === 'teacher' ? 'teacher' : 'platform'),
        ownerId: questionPayload.ownerId || user.id,
        createdBy: questionPayload.createdBy || user.id,
        approvalStatus: questionPayload.approvalStatus || (user.role === 'admin' ? 'approved' : 'pending_review'),
      } as Question);
      refreshQuestionBank();

      if (!created.approvalStatus || created.approvalStatus === 'approved') {
        setSelectedQuestionIds((current) => current.includes(created.id) ? current : [created.id, ...current]);
      }
      setShowQuestionBuilder(false);
      setFeedback(created.approvalStatus === 'approved'
        ? 'تم حفظ السؤال في مركز الأسئلة وإضافته للاختبار.'
        : 'تم حفظ السؤال في مركز الأسئلة، وسيظهر بعد الاعتماد.');
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر حفظ السؤال الآن.'));
    }
  };

  const handleLiveHostControl = async (action: 'toggle_live' | 'next_question' | 'prev_question' | 'toggle_leaderboard') => {
    if (!createdTest?.test.id) return;
    try {
      const res = await api.controlLiveBarcodeTest(createdTest.test.id, {
        action,
        isLiveActive: action === 'toggle_live' ? !isLiveActive : isLiveActive,
      });
      if (res.success) {
        if (action === 'toggle_live') {
          setIsLiveActive(!isLiveActive);
          setFeedback(!isLiveActive ? 'تم بدء البث المباشر التفاعلي للحصة الآن!' : 'تم إيقاف البث المباشر مؤقتاً.');
        } else if (action === 'next_question') {
          setFeedback('تم الانتقال للسؤال التالي على شاشة البروجيكتور والطلاب!');
        } else if (action === 'prev_question') {
          setFeedback('تم العودة للسؤال السابق.');
        }
      }
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر التحكم في البث المباشر الآن.'));
    }
  };

  const loadSavedTests = async () => {
    setLoadingTests(true);
    try {
      const response = (await api.listPublicBarcodeTests({ limit: 30 })) as BarcodeTestsListResponse;
      setSavedTests(response.items || []);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر تحميل اختبارات الباركود الحالية.'));
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    void loadSavedTests();
  }, []);

  const openSavedTest = (test: BarcodeTestsListResponse['items'][number]) => {
    setCreatedTest({
      test: {
        id: test.id,
        slug: test.slug,
        title: test.title,
        testKind: test.testKind,
        status: test.status,
      },
      publicUrl: test.publicUrl,
      qrPayload: test.qrPayload,
      summary: test.summary,
    });
    setReport(null);
    setLiveMonitoring(false);
    setFeedback('تم فتح الاختبار المختار.');
  };

  const createTest = async () => {
    setError('');
    setFeedback('');
    setCreatedTest(null);
    setReport(null);
    setLiveMonitoring(false);
    if (!pathId || !normalizedSubjectId) {
      setError('اختر المسار والمادة أولًا.');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      setError('اختر سؤالًا واحدًا على الأقل.');
      return;
    }
    if (audience === 'targeted' && targetGroupIds.length === 0 && targetUserIds.length === 0) {
      setError('اختر مجموعة أو طالبًا واحدًا على الأقل للاختبار الموجّه.');
      return;
    }
    setSaving(true);
    try {
      const response = (await api.createPublicBarcodeTest({
        title,
        description,
        pathId,
        subjectId: normalizedSubjectId,
        sectionId,
        skillIds: selectedSkills,
        questionIds: selectedQuestionIds,
        testKind,
        audience,
        targetGroupIds: audience === 'targeted' ? targetGroupIds : [],
        targetUserIds: audience === 'targeted' ? targetUserIds : [],
        status: 'active',
        showResultToStudent,
        collectSchool: true,
        collectClassroom: true,
        startsAt: startsAtLocal ? new Date(startsAtLocal).getTime() : null,
        endsAt: endsAtLocal ? new Date(endsAtLocal).getTime() : null,
        maxSubmissions: maxSubmissions ? Number(maxSubmissions) : null,
        settings: {
          showExplanations,
          showAnswers,
          showResultsReport: showResultToStudent,
          maxAttempts,
          passingScore,
          timeLimit,
          randomizeQuestions,
          randomizeOptions,
          showProgressBar,
          requireAnswerBeforeNext,
          allowQuestionReview,
          optionLayout,
        },
      })) as CreatedBarcodeTest;
      setCreatedTest(response);
      setFeedback('تم إنشاء رابط الاختبار والباركود.');
      await loadSavedTests();
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر إنشاء الاختبار الآن.'));
    } finally {
      setSaving(false);
    }
  };

  const loadReport = async () => {
    if (!createdTest) return;
    setLoadingReport(true);
    setError('');
    try {
      const response = (await api.getPublicBarcodeTestReport(createdTest.test.id)) as PublicBarcodeReport;
      setReport(response);
      setLastReportRefreshAt(Date.now());
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر قراءة التقرير الآن.'));
    } finally {
      setLoadingReport(false);
    }
  };

  const copyLink = async () => {
    if (!fullPublicUrl) return;
    try {
      await navigator.clipboard.writeText(fullPublicUrl);
      setFeedback('تم نسخ الرابط.');
    } catch {
      setFeedback(fullPublicUrl);
    }
  };

  const copyWhatsAppInvite = async () => {
    if (!fullPublicUrl || !createdTest) return;
    const message = `اختبار مباشر: ${createdTest.test.title}\nافتح الرابط، اكتب اسمك ومدرستك وفصلك، ثم ابدأ الاختبار:\n${fullPublicUrl}`;
    try {
      await navigator.clipboard.writeText(message);
      setFeedback('تم نسخ رسالة واتساب جاهزة للطلاب.');
    } catch {
      setFeedback(message);
    }
  };

  const skillNameById = (skillId: string) =>
    skills.find((skill) => skill.id === skillId)?.name || skillId || 'غير مصنف';

  const exportReportCsv = () => {
    if (!report) return;
    const rows: unknown[][] = [
      ['الطالب', 'المدرسة', 'الفصل', 'الدرجة', 'الصحيح', 'الخطأ', 'غير مجاب', 'الوقت', 'تاريخ الإرسال'],
      ...report.rows.map((row) => [
        row.studentName,
        row.schoolName || '',
        row.classroomName || '',
        row.score,
        row.correctAnswers ?? '',
        row.wrongAnswers ?? '',
        row.unanswered ?? '',
        formatDuration(row.timeSpentSeconds),
        formatDateTime(row.submittedAt),
      ]),
      [],
      ['تجميع حسب المدرسة'],
      ['المدرسة', 'المحاولات', 'المتوسط', 'نسبة النجاح'],
      ...(report.summary.bySchool || []).map((row) => [row.name, row.submissions, row.averageScore, row.passRate]),
      [],
      ['تجميع حسب الفصل'],
      ['المدرسة', 'الفصل', 'المحاولات', 'المتوسط', 'نسبة النجاح'],
      ...(report.summary.byClassroom || []).map((row) => [row.schoolName, row.name, row.submissions, row.averageScore, row.passRate]),
      [],
      ['أضعف المهارات'],
      ['المهارة', 'الإتقان', 'المحاولات'],
      ...(report.summary.weakestSkills || []).map((skill) => [skillNameById(skill.skillId), skill.mastery, skill.attempts]),
    ];
    downloadCsv(`barcode-test-report-${report.test?.id || createdTest?.test.id || 'latest'}.csv`, rows);
    setFeedback('تم تجهيز ملف النتائج.');
  };

  const printReport = () => {
    if (!report) return;
    openPrintReport(report, skillNameById);
  };

  useEffect(() => {
    if (!createdTest || !liveMonitoring) return undefined;
    void loadReport();
    const timer = window.setInterval(() => {
      void loadReport();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [createdTest?.test.id, liveMonitoring]);

  return (
    <div data-testid="barcode-workspace-shell" className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              اختبارات باركود
            </span>
            <h1 className="mt-3 text-2xl font-black text-slate-900">اختبار عام بدون تسجيل</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
              أنشئ اختبارًا قصيرًا من مركز الأسئلة، ثم انشر الرابط أو QR للطلاب.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <QrCode className="mx-auto mb-2 text-indigo-600" />
            <div className="text-xs font-black text-slate-500">يدخل الطالب مباشرة</div>
          </div>
        </div>
      </div>

      {(error || feedback) && (
        <div className={`rounded-2xl border p-4 text-sm font-black ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || feedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">اسم الاختبار</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">عرض النتيجة للطالب</span>
              <button
                type="button"
                onClick={() => setShowResultToStudent((value) => !value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm font-black ${showResultToStudent ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {showResultToStudent ? 'نعم، يظهر ملخص بسيط' : 'لا، الإدارة فقط ترى النتائج'}
              </button>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-black text-slate-600">وصف قصير</span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </label>
            <div data-testid="barcode-test-kind-selector" className="md:col-span-2 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setTestKind('quick');
                  setTimeLimit(20);
                  setMaxAttempts(1);
                  setRandomizeQuestions(true);
                  setRequireAnswerBeforeNext(false);
                  setOptionLayout('auto');
                }}
                data-testid="barcode-kind-quick"
                className={`rounded-2xl border p-4 text-right ${testKind === 'quick' ? 'border-indigo-300 bg-white text-indigo-800 shadow-sm' : 'border-transparent bg-transparent text-slate-600'}`}
              >
                <div className="text-sm font-black">اختبار سريع</div>
                <div className="mt-1 text-xs font-bold leading-6 text-slate-500">مناسب للنشر السريع والتسويق وقياس مستوى أولي.</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestKind('mock');
                  setTimeLimit(60);
                  setMaxAttempts(1);
                  setRandomizeQuestions(false);
                  setRequireAnswerBeforeNext(false);
                  setOptionLayout('horizontal');
                }}
                data-testid="barcode-kind-mock"
                className={`rounded-2xl border p-4 text-right ${testKind === 'mock' ? 'border-indigo-300 bg-white text-indigo-800 shadow-sm' : 'border-transparent bg-transparent text-slate-600'}`}
              >
                <div className="text-sm font-black">اختبار محاكي</div>
                <div className="mt-1 text-xs font-bold leading-6 text-slate-500">شكل أقرب للاختبار الحقيقي بزمن وترتيب ثابت.</div>
              </button>
            </div>
            <div data-testid="barcode-audience-selector" className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
              <div className="mb-2 text-xs font-black text-slate-700">طريقة الوصول للاختبار</div>
              <div className="grid gap-2 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setAudience('open');
                    setTargetGroupIds([]);
                    setTargetUserIds([]);
                  }}
                  className={`rounded-xl border p-3 text-right text-xs font-black ${audience === 'open' ? 'border-emerald-300 bg-white text-emerald-800' : 'border-transparent bg-transparent text-slate-600'}`}
                >
                  مفتوح بالرابط أو QR
                  <span className="mt-1 block text-[11px] font-bold text-slate-500">مناسب لاختبار مباشر في قاعة أو حملة عامة.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAudience('targeted')}
                  className={`rounded-xl border p-3 text-right text-xs font-black ${audience === 'targeted' ? 'border-amber-300 bg-white text-amber-800' : 'border-transparent bg-transparent text-slate-600'}`}
                >
                  موجّه لطلاب محددين
                  <span className="mt-1 block text-[11px] font-bold text-slate-500">يظهر تلقائيًا في مركز اختبارات الطلاب المستهدفين.</span>
                </button>
              </div>
              {audience === 'targeted' ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-slate-600">المجموعات أو الفصول</span>
                    <select
                      multiple
                      value={targetGroupIds}
                      onChange={(event) => setTargetGroupIds(Array.from(event.target.selectedOptions, (option) => option.value))}
                      className="h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                    >
                      {targetGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-slate-600">طلاب محددون</span>
                    <select
                      multiple
                      value={targetUserIds}
                      onChange={(event) => setTargetUserIds(Array.from(event.target.selectedOptions, (option) => option.value))}
                      className="h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                    >
                      {targetStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">المسار</span>
              <select
                data-testid="barcode-path-select"
                value={pathId}
                onChange={(event) => {
                  const nextPathId = event.target.value;
                  const nextSubject = subjects.find((subject) => subject.pathId === nextPathId);
                  setPathId(nextPathId);
                  setSubjectId(nextSubject?.id || '');
                  setSectionId('');
                  setSelectedQuestionIds([]);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {paths.map((path) => <option key={path.id} value={path.id}>{path.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">المادة</span>
              <select
                data-testid="barcode-subject-select"
                value={normalizedSubjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setSectionId('');
                  setSelectedQuestionIds([]);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">الموضوع / القسم</span>
              <select
                value={sectionId}
                onChange={(event) => {
                  setSectionId(event.target.value);
                  setSelectedQuestionIds([]);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                <option value="">كل الموضوعات</option>
                {activeSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">نوع السؤال</span>
                <select
                  value={questionTypeFilter}
                  onChange={(event) => {
                    setQuestionTypeFilter(event.target.value);
                    setSelectedQuestionIds([]);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="mcq">اختيار من متعدد</option>
                  <option value="true_false">صح وخطأ</option>
                  <option value="essay">مقالي</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">مستوى الصعوبة</span>
                <select
                  value={difficultyFilter}
                  onChange={(event) => {
                    setDifficultyFilter(event.target.value);
                    setSelectedQuestionIds([]);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="all">كل المستويات</option>
                  <option value="Easy">سهل</option>
                  <option value="Medium">متوسط</option>
                  <option value="Hard">صعب</option>
                </select>
              </label>
            </div>
          </div>

          <div data-testid="barcode-real-test-settings" className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">إعدادات الاختبار</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                مثل الاختبار الحقيقي
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">الوقت بالدقائق</span>
                <input type="number" min={0} max={300} value={timeLimit} onChange={(event) => setTimeLimit(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">عدد المحاولات</span>
                <input type="number" min={1} max={20} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">درجة النجاح</span>
                <input type="number" min={0} max={100} value={passingScore} onChange={(event) => setPassingScore(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">شكل الاختيارات</span>
                <select value={optionLayout} onChange={(event) => setOptionLayout(event.target.value as typeof optionLayout)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
                  <option value="auto">تلقائي</option>
                  <option value="two_columns">عمودان</option>
                  <option value="horizontal">أفقي واسع</option>
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[
                ['خلط الأسئلة', randomizeQuestions, setRandomizeQuestions],
                ['خلط الاختيارات', randomizeOptions, setRandomizeOptions],
                ['إظهار الإجابات', showAnswers, setShowAnswers],
                ['إظهار الشرح', showExplanations, setShowExplanations],
                ['شريط تقدم للطالب', showProgressBar, setShowProgressBar],
                ['يلزم إجابة كل سؤال', requireAnswerBeforeNext, setRequireAnswerBeforeNext],
                ['مراجعة الأسئلة', allowQuestionReview, setAllowQuestionReview],
              ].map(([label, value, setter]) => (
                <button
                  type="button"
                  key={String(label)}
                  onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)((current) => !current)}
                  className={`rounded-xl border px-3 py-2 text-right text-xs font-black ${(value as boolean) ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}
                >
                  {String(label)}
                </button>
              ))}
            </div>
            <div data-testid="barcode-required-identity-note" className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-800">
              الاسم والمدرسة والفصل إلزامية دائمًا في اختبارات الباركود، لأن الرابط قد يرسل واتساب أو يعرض كـ QR داخل الفصل بدون تسجيل دخول.
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">يفتح في</span>
                <input
                  type="datetime-local"
                  value={startsAtLocal}
                  onChange={(event) => setStartsAtLocal(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">يغلق في</span>
                <input
                  type="datetime-local"
                  value={endsAtLocal}
                  onChange={(event) => setEndsAtLocal(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-slate-600">حد المشاركات</span>
                <input
                  type="number"
                  min={1}
                  value={maxSubmissions}
                  onChange={(event) => setMaxSubmissions(event.target.value)}
                  placeholder="بدون حد"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              </label>
            </div>
          </div>

          <div data-testid="barcode-question-center-filter" className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900">أسئلة مركز الأسئلة</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  تظهر الأسئلة المعتمدة فقط حسب المسار والمادة والموضوع المختار.
                </p>
              </div>
              <button
                type="button"
                data-testid="barcode-add-question-from-builder"
                onClick={() => canCreateQuestions && setShowQuestionBuilder(true)}
                disabled={!canCreateQuestions}
                className={`${canCreateQuestions ? 'inline-flex' : 'hidden'} items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700`}
              >
                <Plus size={14} />
                إنشاء سؤال
              </button>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                {eligibleQuestions.length} سؤال متاح
              </span>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث داخل الأسئلة"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-[430px] space-y-2 overflow-auto pr-1">
              {isQuestionBankLoading && (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm font-black text-slate-500">جارٍ تحميل أسئلة بنك المنصة...</div>
              )}
              {questionBankError && !isQuestionBankLoading && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm font-black text-red-600">{questionBankError}</div>
              )}
              {!isQuestionBankLoading && !questionBankError && eligibleQuestions.map((question) => {
                const selected = selectedQuestionIds.includes(question.id);
                const skillNames = (question.skillIds || [])
                  .map((skillId) => skills.find((skill) => skill.id === skillId)?.name)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('، ');
                return (
                  <button
                    type="button"
                    key={question.id}
                    onClick={() => toggleQuestion(question.id)}
                    className={`w-full rounded-2xl border p-3 text-right transition ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-100'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {selected && <CheckCircle2 size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black leading-6 text-slate-800">{question.text}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{skillNames || 'بدون مهارة محددة'}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!isQuestionBankLoading && !questionBankError && eligibleQuestions.length === 0 && (
                <div data-testid="barcode-question-center-empty-state" className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <FileQuestion className="mx-auto mb-2 text-slate-300" />
                  <button
                    type="button"
                    onClick={() => canCreateQuestions && setShowQuestionBuilder(true)}
                    disabled={!canCreateQuestions}
                    className={`${canCreateQuestions ? 'inline-flex' : 'hidden'} mb-3 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700`}
                  >
                    <Plus size={14} />
                    إنشاء سؤال لهذا الاختبار
                  </button>
                  <p className="text-sm font-black text-slate-500">{EXAM_QUESTION_BANK_EMPTY_MESSAGE}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="contents">
          <div data-testid="barcode-tests-list" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">الاختبارات المنشورة</h2>
                <p className="mt-1 text-xs font-bold text-slate-400">آخر روابط QR ونتائجها</p>
              </div>
              <button
                type="button"
                onClick={() => void loadSavedTests()}
                disabled={loadingTests}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingTests ? '...' : 'تحديث'}
              </button>
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">
              {savedTests.map((test) => {
                const active = createdTest?.test.id === test.id;
                return (
                  <button
                    type="button"
                    key={test.id}
                    onClick={() => openSavedTest(test)}
                    className={`w-full rounded-2xl border p-3 text-right transition ${
                      active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-indigo-100 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-black text-slate-800">{test.title}</div>
                        <div className="mt-1 text-xs font-bold text-slate-400">
                          {test.testKind === 'mock' ? 'محاكي' : 'سريع'} · {test.questionCount} سؤال
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                        {test.summary.submissions}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-black text-slate-500">
                      <span>متوسط {test.summary.averageScore}%</span>
                      <span>{test.status === 'active' ? 'نشط' : test.status}</span>
                    </div>
                  </button>
                );
              })}
              {!loadingTests && savedTests.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs font-black text-slate-500">
                  لا توجد اختبارات محفوظة بعد.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-sm font-black text-slate-500">الأسئلة المختارة</div>
            <div className="mt-2 text-4xl font-black text-slate-900">{selectedQuestionIds.length}</div>
            <button
              type="button"
              data-testid="barcode-create-real-test"
              onClick={createTest}
              disabled={saving || selectedQuestionIds.length === 0}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              إنشاء الرابط والباركود
            </button>
          </div>

          {createdTest && (
            <div className="rounded-3xl border border-emerald-100 bg-white p-5 text-center shadow-sm">
              <QRCodeSVG value={fullPublicUrl} size={190} className="mx-auto rounded-2xl bg-white p-2" />
              <p className="mt-4 break-all rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{fullPublicUrl}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
                  <Clipboard size={14} />
                  نسخ
                </button>
                <a data-testid="barcode-open-full-preview" href={fullPublicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
                  فتح الاختبار
                </a>
              </div>
              <button
                type="button"
                data-testid="barcode-copy-whatsapp-invite"
                onClick={copyWhatsAppInvite}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
              >
                <Clipboard size={14} />
                نسخ رسالة واتساب للطلاب
              </button>
              <button
                type="button"
                onClick={loadReport}
                disabled={loadingReport}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              >
                {loadingReport && <Loader2 size={14} className="animate-spin" />}
                تحديث التقرير
              </button>
            </div>
          )}

          {report && (
            <div data-testid="barcode-test-full-report" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
              <span data-testid="barcode-live-results-board" className="sr-only">barcode live results board</span>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900">تقرير اختبار الباركود</h2>
                  <p className="mt-1 text-xs font-bold text-slate-400">ملخص تنفيذي بسيط للإدارة والمشرف.</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={exportReportCsv} className="inline-flex items-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-[11px] font-black text-emerald-700 hover:bg-emerald-100">
                    <Download size={13} />
                    Excel
                  </button>
                  <button type="button" onClick={printReport} className="inline-flex items-center gap-1 rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-2 text-[11px] font-black text-indigo-700 hover:bg-indigo-100">
                    <Printer size={13} />
                    PDF
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-indigo-900">متابعة مباشرة على الشاشة</div>
                    <div className="mt-1 text-xs font-bold text-indigo-700">
                      اعرض هذه اللوحة أثناء الاختبار، وستتحدث النتائج كل 5 ثوانٍ عند تفعيل المتابعة.
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-indigo-600">
                      آخر تحديث: {lastReportRefreshAt ? formatDateTime(lastReportRefreshAt) : 'لم يحدث بعد'}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="barcode-live-monitor-toggle"
                    onClick={() => setLiveMonitoring((value) => !value)}
                    className={`rounded-xl px-4 py-2 text-xs font-black ${
                      liveMonitoring ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {liveMonitoring ? 'إيقاف المتابعة' : 'بدء المتابعة المباشرة'}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-black text-slate-900">{report.summary.submissions}</div>
                  <div className="text-xs font-bold text-slate-500">محاولة</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-black text-slate-900">{report.summary.averageScore}%</div>
                  <div className="text-xs font-bold text-slate-500">متوسط</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                  <div className="text-2xl font-black text-emerald-700">{report.summary.passRate || 0}%</div>
                  <div className="text-xs font-bold text-emerald-700">نسبة النجاح</div>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3 text-center">
                  <div className="text-2xl font-black text-rose-700">{report.summary.lowestScore || 0}%</div>
                  <div className="text-xs font-bold text-rose-700">أقل درجة</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                <div className="text-xs font-black text-amber-800">أضعف المهارات</div>
                <div className="mt-2 space-y-2">
                  {(report.summary.weakestSkills || []).slice(0, 4).map((skill) => (
                    <div key={skill.skillId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700">
                      <span className="min-w-0 truncate">{skillNameById(skill.skillId)}</span>
                      <span className="shrink-0 text-amber-700">{skill.mastery}%</span>
                    </div>
                  ))}
                  {(report.summary.weakestSkills || []).length === 0 && (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">لا توجد مهارات كافية للتحليل بعد.</div>
                  )}
                </div>
              </div>

              <div data-testid="barcode-test-top-students" className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-emerald-800">
                  <Trophy size={14} />
                  أوائل الطلاب
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {reportTopStudents.map((row, index) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">{index + 1}</span>
                        <span className="min-w-0 truncate">{row.studentName}</span>
                      </div>
                      <span className="shrink-0 text-emerald-700">{row.score}%</span>
                    </div>
                  ))}
                  {reportTopStudents.length === 0 && (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-500">تظهر قائمة الأوائل بعد أول مشاركة.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-2 text-xs font-black text-slate-700">حسب المدرسة</div>
                  <div className="space-y-2">
                    {(report.summary.bySchool || []).slice(0, 4).map((row) => (
                      <div key={row.name} className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-700">
                          <span className="min-w-0 truncate">{row.name}</span>
                          <span className="shrink-0">{row.averageScore}%</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-400">{row.submissions} محاولة · نجاح {row.passRate}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-black text-slate-700">حسب الفصل</div>
                  <div className="space-y-2">
                    {(report.summary.byClassroom || []).slice(0, 4).map((row) => (
                      <div key={`${row.schoolName}-${row.name}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-700">
                          <span className="min-w-0 truncate">{row.name}</span>
                          <span className="shrink-0">{row.averageScore}%</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-400">{row.schoolName} · {row.submissions} محاولة</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3">
                <div className="text-xs font-black text-rose-800">طلاب يحتاجون متابعة</div>
                <div className="mt-2 space-y-2">
                  {(report.summary.lowPerformers || []).slice(0, 5).map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700">
                      <span className="min-w-0 truncate">{row.studentName}</span>
                      <span className="shrink-0 text-rose-700">{row.score}%</span>
                    </div>
                  ))}
                  {(report.summary.lowPerformers || []).length === 0 && (
                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-700">لا يوجد طلاب تحت درجة النجاح في هذا التقرير.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="mb-2 text-xs font-black text-slate-700">آخر المشاركات</div>
                <div className="space-y-2">
                  {report.rows.slice(0, 6).map((row) => (
                    <div key={row.id} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">{row.studentName}</span>
                        <span className="shrink-0">{row.score}%</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{row.schoolName || 'بدون مدرسة'} · {row.classroomName || 'بدون فصل'} · {formatDuration(row.timeSpentSeconds)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {false && report && (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-900">ملخص النتائج</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-black text-slate-900">{report.summary.submissions}</div>
                  <div className="text-xs font-bold text-slate-500">محاولة</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-black text-slate-900">{report.summary.averageScore}%</div>
                  <div className="text-xs font-bold text-slate-500">متوسط</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {report.rows.slice(0, 5).map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <span>{row.studentName}</span>
                    <span>{row.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      {showQuestionBuilder && canCreateQuestions && (
        <div data-testid="barcode-unified-question-builder">
          <UnifiedQuestionBuilder
            subjectId={normalizedSubjectId}
            sectionId={sectionId}
            initialQuestion={{
              pathId,
              subject: normalizedSubjectId,
              sectionId,
              type: 'mcq',
              difficulty: 'Medium',
              options: ['', '', '', ''],
              correctOptionIndex: 0,
              skillIds: [],
            }}
            onSave={(questionPayload) => void saveQuestionFromBuilder(questionPayload)}
            onCancel={() => setShowQuestionBuilder(false)}
          />
        </div>
      )}
    </div>
  );
};

export default PublicBarcodeTestsManager;
