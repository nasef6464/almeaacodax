import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileQuestion, Loader2, RotateCcw, School, UserRound } from 'lucide-react';
import { api } from '../services/api';

type PublicBarcodeQuestion = {
  id: string;
  text: string;
  options: string[];
  optionOrder?: number[];
  imageUrl?: string;
  skillIds?: string[];
  difficulty?: string;
};

type PublicBarcodeTestResponse = {
  test: {
    id: string;
    slug: string;
    title: string;
    description?: string;
    testKind?: 'quick' | 'mock';
    collectSchool?: boolean;
    collectClassroom?: boolean;
    settings?: {
      showResultsReport?: boolean;
      maxAttempts?: number;
      passingScore?: number;
      timeLimit?: number;
      randomizeQuestions?: boolean;
      randomizeOptions?: boolean;
      showProgressBar?: boolean;
      requireAnswerBeforeNext?: boolean;
      allowQuestionReview?: boolean;
      optionLayout?: 'auto' | 'horizontal' | 'two_columns';
    };
    questionCount: number;
  };
  questions: PublicBarcodeQuestion[];
};

type PublicBarcodeSubmitResponse = {
  submissionId: string;
  result: null | {
    score: number;
    passed?: boolean;
    passingScore?: number;
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    unanswered: number;
    weakestSkill?: { skillId: string; mastery: number; status: string } | null;
    strongestSkill?: { skillId: string; mastery: number; status: string } | null;
    nextAction?: string;
  };
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const getSessionFingerprint = () => {
  try {
    const key = 'almeaa:barcode-test-session';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const value = `pb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(key, value);
    return value;
  } catch {
    return `pb_${Date.now()}`;
  }
};

const BarcodeTest: React.FC = () => {
  const { slug = '' } = useParams();
  const [data, setData] = useState<PublicBarcodeTestResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [studentName, setStudentName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PublicBarcodeSubmitResponse['result']>(null);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .getPublicBarcodeTest(slug)
      .then((response) => {
        if (!cancelled) {
          setData(response as PublicBarcodeTestResponse);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'هذا الاختبار غير متاح الآن.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => value >= 0).length,
    [answers],
  );
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const timeLimitMinutes = Number(data?.test.settings?.timeLimit || 0);
  const remainingSeconds = timeLimitMinutes > 0 ? Math.max(timeLimitMinutes * 60 - elapsedSeconds, 0) : null;
  const progressPercent = data?.questions.length ? Math.round((answeredCount / data.questions.length) * 100) : 0;
  const optionGridClass =
    data?.test.settings?.optionLayout === 'two_columns'
      ? 'sm:grid-cols-2'
      : data?.test.settings?.optionLayout === 'horizontal'
        ? 'lg:grid-cols-4'
        : '';
  const formatSeconds = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data) return;
    if (!studentName.trim()) {
      setError('اكتب اسمك أولًا.');
      return;
    }
    if (data.test.collectSchool && !schoolName.trim()) {
      setError('اكتب اسم المدرسة.');
      return;
    }
    if (data.test.collectClassroom && !classroomName.trim()) {
      setError('اكتب الفصل.');
      return;
    }
    if (data.test.settings?.requireAnswerBeforeNext && answeredCount < data.questions.length) {
      setError('أجب عن كل الأسئلة قبل الإرسال.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = (await api.submitPublicBarcodeTest(slug, {
        studentName,
        schoolName,
        classroomName,
        contact,
        sessionFingerprint: getSessionFingerprint(),
        timeSpentSeconds: elapsedSeconds,
        answers: data.questions.map((question) => ({
          questionId: question.id,
          selectedOptionIndex: answers[question.id] >= 0 ? question.optionOrder?.[answers[question.id]] ?? answers[question.id] : -1,
        })),
      })) as PublicBarcodeSubmitResponse;
      setResult(response.result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر إرسال الاختبار الآن.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-black text-slate-700">جاري تجهيز الاختبار...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
          <p className="font-black text-rose-700">{error || 'هذا الاختبار غير متاح الآن.'}</p>
          <Link to="/" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-black text-rose-700">
            العودة للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                تم الإرسال
              </span>
              <h1 className="mt-3 text-2xl font-black text-slate-900">نتيجتك {result.score}%</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                صحيح {result.correctAnswers} من {result.totalQuestions}
                {typeof result.passed === 'boolean' ? ` · ${result.passed ? 'ناجح' : `أقل من ${result.passingScore || 60}%`}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xl font-black text-slate-900">{result.wrongAnswers}</div>
                <div className="text-xs font-bold text-slate-500">خطأ</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xl font-black text-slate-900">{result.unanswered}</div>
                <div className="text-xs font-bold text-slate-500">متروك</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xl font-black text-slate-900">{result.weakestSkill?.mastery ?? 0}%</div>
                <div className="text-xs font-bold text-slate-500">أضعف مهارة</div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-black text-indigo-900">خطوتك الآن</p>
            <p className="mt-1 text-sm font-bold leading-7 text-indigo-700">
              {result.nextAction || 'ادخل المنصة لتكمل تدريبًا قصيرًا على أضعف نقطة.'}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/?auth=signup" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
              <CheckCircle2 size={16} />
              ابدأ خطة تدريب
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw size={16} />
              إعادة المحاولة
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <form onSubmit={submit} className="space-y-5">
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
              <FileQuestion size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-600">{data.test.testKind === 'mock' ? 'اختبار محاكي' : 'اختبار سريع'}</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">{data.test.title}</h1>
              {data.test.description && <p className="mt-2 text-sm leading-7 text-slate-500">{data.test.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{data.questions.length} سؤال</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{timeLimitMinutes ? `${timeLimitMinutes} دقيقة` : 'بدون مؤقت'}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{data.test.settings?.maxAttempts || 1} محاولة</span>
              </div>
            </div>
          </div>
        </section>

        {data.test.settings?.showProgressBar !== false && (
          <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-600">
              <span>التقدم {progressPercent}%</span>
              <span>{remainingSeconds === null ? `الوقت ${formatSeconds(elapsedSeconds)}` : `المتبقي ${formatSeconds(remainingSeconds)}`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-black text-slate-600"><UserRound size={14} /> الاسم</span>
              <input value={studentName} onChange={(e) => setStudentName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </label>
            {data.test.collectSchool && (
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-black text-slate-600"><School size={14} /> المدرسة</span>
                <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </label>
            )}
            {data.test.collectClassroom && (
              <label className="block">
                <span className="mb-1 text-xs font-black text-slate-600">الفصل</span>
                <input value={classroomName} onChange={(e) => setClassroomName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
              </label>
            )}
            <label className="block md:col-span-3">
              <span className="mb-1 text-xs font-black text-slate-600">رقم جوال أو بريد للتواصل اختياري</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </label>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
            {error}
          </div>
        )}

        <section className="space-y-4">
          {data.questions.map((question, index) => (
            <div key={question.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">
                  {index + 1}
                </span>
                <h2 className="text-base font-black leading-8 text-slate-900">{question.text}</h2>
              </div>
              {question.imageUrl && <img src={question.imageUrl} alt="" className="mb-4 max-h-64 rounded-2xl border border-slate-100 object-contain" />}
              <div className={`grid gap-2 ${optionGridClass}`}>
                {question.options.map((option, optionIndex) => {
                  const active = answers[question.id] === optionIndex;
                  return (
                    <button
                      type="button"
                      key={`${question.id}-${optionIndex}`}
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                      className={`rounded-2xl border px-4 py-3 text-right text-sm font-bold transition ${
                        active
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black text-slate-700">
              أجبت عن {answeredCount} من {data.questions.length}
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              إرسال الاختبار
            </button>
          </div>
        </div>
      </form>
    </main>
  );
};

export default BarcodeTest;
