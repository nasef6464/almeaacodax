import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ListChecks,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { Quiz, QuizResult } from '../types';
import { isStandaloneMockExam, getMockExamSections, getMockExamQuestionCount, getMockExamTimeLimit } from '../utils/mockExam';

/* ─── helpers ─── */
const formatDate = (v?: number | string) => {
  if (!v) return '—';
  const ts = typeof v === 'number' ? v : new Date(v).getTime();
  if (Number.isNaN(ts)) return '—';
  return new Date(ts).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const scoreBadge = (score: number) => {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
};

const scoreLabel = (score: number) => {
  if (score >= 80) return 'ممتاز';
  if (score >= 60) return 'جيد';
  return 'يحتاج مراجعة';
};

type MockAttemptResult = QuizResult & {
  id?: string;
  createdAt?: number;
  submittedAt?: number | string;
  date?: number | string;
};

const getTimestamp = (r: MockAttemptResult) => {
  const raw = r.createdAt ?? r.submittedAt ?? r.date;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const p = new Date(raw).getTime();
    return Number.isNaN(p) ? 0 : p;
  }
  return 0;
};

/* ─── sub-components ─── */
const StatBadge: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({
  label, value, icon, color,
}) => (
  <div className={`flex flex-col items-center gap-1 rounded-2xl border px-4 py-3 ${color}`}>
    <div className="text-lg">{icon}</div>
    <div className="text-lg font-black leading-tight">{value}</div>
    <div className="text-[10px] font-bold opacity-70">{label}</div>
  </div>
);

const AttemptRow: React.FC<{ result: MockAttemptResult; index: number }> = ({ result, index }) => {
  const [open, setOpen] = useState(false);
  const ts = getTimestamp(result);
  const hasSkills = (result.skillsAnalysis || []).length > 0;

  return (
    <div className={`rounded-2xl border transition-all ${open ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
            {index + 1}
          </span>
          <div>
            <div className="text-sm font-black text-gray-800">محاولة {formatDate(ts)}</div>
            <div className="text-[11px] font-bold text-gray-400">
              {(result.skillsAnalysis || []).length} مهارة مقاسة
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-sm font-black ${scoreBadge(result.score)}`}>
            {result.score}%
          </span>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-indigo-100 px-4 pb-4 pt-3 space-y-3">
          {/* Skills breakdown */}
          {hasSkills && (
            <div>
              <p className="mb-2 text-xs font-black text-gray-500">تحليل المهارات</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {(result.skillsAnalysis || []).slice(0, 8).map((skill, si) => (
                  <div key={si} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                    <span className="text-xs font-bold text-gray-700 truncate">{skill.skill || skill.section || '—'}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${scoreBadge(skill.mastery)}`}>
                      {skill.mastery}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              to={`/results?attempt=${typeof result.date === 'string' ? result.date : String(result.date || '')}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700"
            >
              <BarChart2 size={14} />
              عرض التقرير الكامل
            </Link>
            {result.quizId && (
              <Link
                to={`/quiz/${result.quizId}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={14} />
                إعادة المحاولة
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
/* ─── Shared Exam Card ─── */
const MockExamCard: React.FC<{
  exam: Quiz;
  paths: Array<{ id: string; name: string; [key: string]: unknown }>;
  resultsByExam: Map<string, MockAttemptResult[]>;
  selectedExamId: string | null;
  setSelectedExamId: (id: string | null) => void;
  isDirected?: boolean;
}> = ({ exam, paths, resultsByExam, selectedExamId, setSelectedExamId, isDirected }) => {
  const path = paths.find((p) => p.id === exam.pathId);
  const sectionsCount = getMockExamSections(exam).length;
  const questionsCount = getMockExamQuestionCount(exam);
  const timeLimit = getMockExamTimeLimit(exam);
  const examAttempts = resultsByExam.get(exam.id) || [];
  const bestScore = examAttempts.length > 0 ? Math.max(...examAttempts.map((r) => r.score)) : null;
  const isFree = exam.access?.type !== 'paid';
  const isSelected = selectedExamId === exam.id;

  return (
    <div
      className={`relative cursor-pointer rounded-3xl border-2 p-5 transition-all duration-200 ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50 shadow-lg'
          : isDirected
          ? 'border-blue-100 bg-blue-50/30 hover:border-blue-300 hover:shadow-md'
          : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md'
      }`}
      onClick={() => setSelectedExamId(isSelected ? null : exam.id)}
    >
      {/* Top badges */}
      <div className="absolute left-4 top-4 flex gap-1.5 flex-wrap">
        {isDirected && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 border border-blue-200">
            موجّه
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isFree ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {isFree ? 'مجاني' : 'مدفوع'}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${isDirected ? 'bg-blue-500' : 'bg-indigo-500'}`}>
          <Award size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-gray-900 leading-tight">{exam.title}</h3>
          {path && <p className={`mt-0.5 text-xs font-bold ${isDirected ? 'text-blue-600' : 'text-indigo-600'}`}>{path.name}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
        <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1">
          <ListChecks size={12} /> {questionsCount} سؤال
        </span>
        <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1">
          <BookOpen size={12} /> {sectionsCount} قسم
        </span>
        {timeLimit > 0 && (
          <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1">
            <Clock size={12} /> {timeLimit} دقيقة
          </span>
        )}
        {bestScore !== null && (
          <span className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${scoreBadge(bestScore)}`}>
            <Trophy size={12} /> أعلى: {bestScore}%
          </span>
        )}
      </div>

      {examAttempts.length > 0 && (
        <div className="mt-2 text-[11px] font-bold text-gray-400">{examAttempts.length} محاولة سابقة</div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          to={`/quiz/${exam.id}`}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black text-white ${isDirected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          <Zap size={13} />
          {examAttempts.length === 0 ? 'ابدأ الاختبار' : 'محاولة جديدة'}
        </Link>
        {examAttempts.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelectedExamId(isSelected ? null : exam.id); }}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-black transition ${
              isSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart2 size={13} />
            نتائجي
            {isSelected ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const MockExamStudentHub: React.FC = () => {
  const { user, quizzes, paths, examResults, groups } = useStore();

  const [myResults, setMyResults] = useState<MockAttemptResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // ── Student's group membership ────────────────────────────────────────────
  const myGroupIds = useMemo(() => {
    const ids = new Set<string>(user.groupIds || []);
    // Also include school group if any
    if (user.schoolId) ids.add(user.schoolId);
    // Add any group that lists this student
    groups.forEach((g) => {
      if ((g.studentIds || []).includes(user.id)) ids.add(g.id);
    });
    return ids;
  }, [user, groups]);

  // Fetch student mock exam results
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError('');

    api.getMyQuizResultsPage({ limit: 200 })
      .then((resp) => {
        if (!active) return;
        const all = Array.isArray(resp?.data) ? resp.data as MockAttemptResult[] : [];
        const mockResults = all.filter((r) => {
          const quiz = quizzes.find((q) => q.id === r.quizId);
          return r.source === 'mock-exam' || (quiz && isStandaloneMockExam(quiz));
        });
        setMyResults(mockResults.sort((a, b) => getTimestamp(b) - getTimestamp(a)));
      })
      .catch(() => {
        if (!active) return;
        const fallback = examResults.filter((r) => {
          const quiz = quizzes.find((q) => q.id === r.quizId);
          return r.source === 'mock-exam' || (quiz && isStandaloneMockExam(quiz));
        }) as MockAttemptResult[];
        setMyResults(fallback);
        if (fallback.length === 0) setLoadError('تعذّر تحميل نتائج المحاكيات. تحقق من الاتصال.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [examResults, quizzes]);

  // ── Split: Directed (school/class targeted) vs Platform (showOnPlatform) ──
  const { directedMockExams, platformMockExams } = useMemo(() => {
    const published = quizzes.filter(
      (q) =>
        isStandaloneMockExam(q) &&
        q.isPublished !== false &&
        (!q.approvalStatus || q.approvalStatus === 'approved'),
    );

    const directed = published
      .filter(
        (q) =>
          Array.isArray(q.targetGroupIds) &&
          q.targetGroupIds.length > 0 &&
          q.targetGroupIds.some((gid) => myGroupIds.has(gid)),
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const platform = published
      .filter((q) => q.showOnPlatform !== false && !(Array.isArray(q.targetGroupIds) && q.targetGroupIds.length > 0))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return { directedMockExams: directed, platformMockExams: platform };
  }, [quizzes, myGroupIds]);

  // Keep combined list for backward compat with selectedExam logic
  const availableMockExams = useMemo(
    () => [...directedMockExams, ...platformMockExams],
    [directedMockExams, platformMockExams],
  );

  // Grouped results by exam
  const resultsByExam = useMemo(() => {
    const map = new Map<string, MockAttemptResult[]>();
    myResults.forEach((r) => {
      const key = r.quizId || 'unknown';
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    });
    return map;
  }, [myResults]);

  // Summary stats
  const stats = useMemo(() => {
    const total = myResults.length;
    const best = total > 0 ? Math.max(...myResults.map((r) => r.score)) : 0;
    const avg = total > 0 ? Math.round(myResults.reduce((s, r) => s + r.score, 0) / total) : 0;
    const passed = myResults.filter((r) => r.score >= 60).length;
    return { total, best, avg, passed };
  }, [myResults]);

  const selectedExam = selectedExamId ? availableMockExams.find((q) => q.id === selectedExamId) : null;
  const selectedResults = selectedExamId ? (resultsByExam.get(selectedExamId) || []) : [];

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black">اختباراتي المحاكية</h1>
            <p className="mt-0.5 text-sm text-white/80">رحلتك الكاملة في الاختبارات المحاكية لقياس وتحصيلي</p>
          </div>
        </div>

        {/* Quick Stats */}
        {stats.total > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <div className="text-2xl font-black">{stats.total}</div>
              <div className="text-[11px] font-bold text-white/70">محاولة</div>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <div className="text-2xl font-black">{stats.best}%</div>
              <div className="text-[11px] font-bold text-white/70">أعلى درجة</div>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <div className="text-2xl font-black">{stats.avg}%</div>
              <div className="text-[11px] font-bold text-white/70">المتوسط</div>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 text-center">
              <div className="text-2xl font-black">{stats.passed}</div>
              <div className="text-[11px] font-bold text-white/70">ناجح (60+)</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Directed Exams (from supervisor/admin) ── */}
      {directedMockExams.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-black text-gray-900">
            <Users size={18} className="text-blue-600" />
            اختبارات موجهة لك
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-700">
              {directedMockExams.length}
            </span>
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-100">
              من مشرفك أو مدرستك
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {directedMockExams.map((exam) => (
              <MockExamCard
                key={exam.id}
                exam={exam}
                paths={paths as Array<{ id: string; name: string; [key: string]: unknown }>}
                resultsByExam={resultsByExam}
                selectedExamId={selectedExamId}
                setSelectedExamId={setSelectedExamId}
                isDirected
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Platform Mock Exams (showOnPlatform) ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-black text-gray-900">
          <Award size={18} className="text-indigo-600" />
          الاختبارات المحاكية على المسار
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-black text-indigo-700">
            {platformMockExams.length}
          </span>
        </h2>

        {platformMockExams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <Trophy size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-bold text-gray-500">لا توجد اختبارات محاكية منشورة بعد</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {platformMockExams.map((exam) => (
              <MockExamCard
                key={exam.id}
                exam={exam}
                paths={paths as Array<{ id: string; name: string; [key: string]: unknown }>}
                resultsByExam={resultsByExam}
                selectedExamId={selectedExamId}
                setSelectedExamId={setSelectedExamId}
                isDirected={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* Expanded exam results */}
      {selectedExam && selectedResults.length > 0 && (
        <section className="rounded-3xl border-2 border-indigo-200 bg-indigo-50/50 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-indigo-800">
            <TrendingUp size={16} />
            تاريخ محاولاتي — {selectedExam.title}
            <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-black text-indigo-700">
              {selectedResults.length} محاولة
            </span>
          </h3>

          {/* Best & Latest quick stats */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBadge
              label="أعلى درجة"
              value={`${Math.max(...selectedResults.map(r => r.score))}%`}
              icon={<Trophy size={16} className="text-amber-600" />}
              color="bg-amber-50 border-amber-200 text-amber-800"
            />
            <StatBadge
              label="آخر درجة"
              value={`${selectedResults[0]?.score}%`}
              icon={<Target size={16} className="text-indigo-600" />}
              color="bg-indigo-50 border-indigo-200 text-indigo-800"
            />
            <StatBadge
              label="عدد المحاولات"
              value={selectedResults.length}
              icon={<RefreshCw size={16} className="text-emerald-600" />}
              color="bg-emerald-50 border-emerald-200 text-emerald-800"
            />
            <StatBadge
              label="الحالة"
              value={scoreLabel(selectedResults[0]?.score || 0)}
              icon={selectedResults[0]?.score >= 60 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-rose-600" />}
              color={selectedResults[0]?.score >= 60 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}
            />
          </div>

          {/* Attempts list */}
          <div className="space-y-2">
            {selectedResults.map((result, i) => (
              <AttemptRow key={result.id || result.date || i} result={result} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* All History (when no exam selected) */}
      {!selectedExamId && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-black text-gray-900">
            <Clock size={18} className="text-violet-600" />
            كل محاولاتي المحاكية
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-black text-violet-700">
              {myResults.length}
            </span>
          </h2>

          {isLoading && (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-indigo-400" />
              <p className="text-sm font-bold text-gray-500">جارٍ تحميل سجل المحاولات...</p>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-center text-sm font-bold text-rose-600">
              {loadError}
            </div>
          )}

          {!isLoading && myResults.length === 0 && !loadError && (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <Award size={40} className="mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-black text-gray-700">لا توجد محاولات محاكية بعد</h3>
              <p className="mt-1 text-sm font-bold text-gray-400">
                اختر أحد الاختبارات أعلاه وابدأ رحلتك الأولى
              </p>
            </div>
          )}

          {!isLoading && myResults.length > 0 && (
            <div className="space-y-2">
              {myResults.map((result, i) => (
                <AttemptRow key={result.id || result.date || i} result={result} index={i} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default MockExamStudentHub;
