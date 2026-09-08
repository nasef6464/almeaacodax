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
import { AttemptGroupCard, QuizAttemptGroup } from './Quizzes';
import { buildQuizRouteWithContext } from '../utils/quizLinks';

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

const getTimestamp = (r?: MockAttemptResult | null) => {
  if (!r) return 0;
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

/* ─── Mini sparkline for exam cards ─── */
const MiniSparkline: React.FC<{ scores: number[] }> = ({ scores }) => {
  if (scores.length < 2) return null;
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const range = max - min || 1;
  const w = 72; const h = 24; const pad = 3;
  const iw = w - pad * 2; const ih = h - pad * 2;
  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * iw;
    const y = pad + ih - ((s - min) / range) * ih;
    return `${x},${y}`;
  }).join(' ');
  const last = scores[scores.length - 1];
  const lx = pad + iw;
  const ly = pad + ih - ((last - min) / range) * ih;
  const clr = last >= 75 ? '#10b981' : last >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0">
      <polyline points={pts} fill="none" stroke={clr} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      <circle cx={lx} cy={ly} r="2.5" fill={clr} />
    </svg>
  );
};

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
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 transition-colors"
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
  const path = (paths || []).find((p) => p.id === exam.pathId);
  const sectionsCount = getMockExamSections(exam).length;
  const questionsCount = getMockExamQuestionCount(exam);
  const timeLimit = getMockExamTimeLimit(exam);
  const examAttempts = resultsByExam?.get?.(exam.id) || [];
  const bestScore = examAttempts.length > 0 ? Math.max(...examAttempts.map((r) => r.score || 0)) : null;
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

      {/* Score trend (sparkline) when multiple attempts exist */}
      {examAttempts.length > 1 && (() => {
        const chronoScores = [...examAttempts]
          .sort((a, b) => getTimestamp(a) - getTimestamp(b))
          .map(r => r.score);
        const first = chronoScores[0];
        const latest = chronoScores[chronoScores.length - 1];
        const delta = latest - first;
        return (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
            <MiniSparkline scores={chronoScores} />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-gray-400">تطور الأداء ({examAttempts.length} محاولة)</div>
              <div className={`mt-0.5 text-xs font-black ${
                delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-500' : 'text-gray-500'
              }`}>
                {delta > 0 ? `▲ +${delta}%` : delta < 0 ? `▼ ${delta}%` : '— لا تغيير'}
              </div>
            </div>
            {bestScore !== null && (
              <div className="shrink-0 text-center">
                <div className="text-[10px] font-bold text-gray-400">الأعلى</div>
                <div className={`text-sm font-black ${bestScore >= 75 ? 'text-emerald-600' : bestScore >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{bestScore}%</div>
              </div>
            )}
          </div>
        );
      })()}

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
              isSelected ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm' : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
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
    const ids = new Set<string>(user?.groupIds || []);
    if (user?.schoolId) ids.add(user.schoolId);
    if (Array.isArray(groups)) {
      groups.forEach((g) => {
        if (user?.id && Array.isArray(g?.studentIds) && g.studentIds.includes(user.id)) {
          ids.add(g.id);
        }
      });
    }
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
        const all = Array.isArray(resp?.data) ? (resp.data as MockAttemptResult[]) : [];
        const mockResults = all.filter((r) => {
          const quiz = (quizzes || []).find((q) => q.id === r.quizId);
          return r.source === 'mock-exam' || (quiz && isStandaloneMockExam(quiz));
        });
        setMyResults(mockResults.sort((a, b) => getTimestamp(b) - getTimestamp(a)));
      })
      .catch(() => {
        if (!active) return;
        const fallback = (examResults || []).filter((r) => {
          const quiz = (quizzes || []).find((q) => q.id === r.quizId);
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
    const published = (quizzes || []).filter(
      (q) =>
        Boolean(q) &&
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
    (myResults || []).forEach((r) => {
      if (!r) return;
      const key = r.quizId || 'unknown';
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    });
    return map;
  }, [myResults]);

  // Summary stats
  const stats = useMemo(() => {
    const validResults = (myResults || []).filter(Boolean);
    const total = validResults.length;
    const best = total > 0 ? Math.max(...validResults.map((r) => r.score || 0)) : 0;
    const avg = total > 0 ? Math.round(validResults.reduce((s, r) => s + (r.score || 0), 0) / total) : 0;
    const passed = validResults.filter((r) => (r.score || 0) >= 60).length;
    return { total, best, avg, passed };
  }, [myResults]);

  const [activeHubTab, setActiveHubTab] = useState<'available' | 'history'>('available');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'directed' | 'platform'>('all');
  const [historyScoreFilter, setHistoryScoreFilter] = useState<'all' | 'good' | 'review'>('all');
  const [openAttemptGroupKey, setOpenAttemptGroupKey] = useState<string | null>(null);

  const getPathName = (pathId?: string) => (paths || []).find((path) => path.id === pathId)?.name || 'القدرات العامة';

  const getAttemptResultLink = (result: QuizResult, viewMode?: 'review' | 'analysis') => {
    const params = new URLSearchParams();
    if (result.date) params.set('attempt', typeof result.date === 'string' ? result.date : String(result.date));
    if (viewMode) params.set('view', viewMode);
    return `/results?${params.toString()}`;
  };

  const getAttemptRetryLink = (result: QuizResult) => {
    if (!result.quizId) return '/dashboard?tab=mock-exams';
    return buildQuizRouteWithContext(result.quizId, { returnTo: '/dashboard?tab=mock-exams', source: 'tests' });
  };

  // Group student mock results by quiz to produce the exact card format
  const mockAttemptGroups = useMemo<QuizAttemptGroup[]>(() => {
    const grouped = new Map<string, QuizAttemptGroup>();

    (myResults || []).forEach((result) => {
      if (!result) return;
      const quiz = (quizzes || []).find((q) => q.id === result.quizId);
      const key = result.quizId || result.quizTitle || String(result.date || Math.random());
      const existing = grouped.get(key);
      if (existing) {
        existing.attempts.push(result);
      } else {
        grouped.set(key, {
          key,
          quizId: result.quizId || '',
          quizTitle: result.quizTitle || quiz?.title || 'اختبار محاكي',
          category: 'mock',
          quiz,
          attempts: [result],
          latestAttempt: result,
          bestAttempt: result,
        });
      }
    });

    return Array.from(grouped.values())
      .map((group) => {
        const sorted = [...(group.attempts || [])].sort((a, b) => getTimestamp(b) - getTimestamp(a));
        const latest = sorted[0] || ({} as QuizResult);
        const best = sorted.reduce((b, a) => ((a?.score ?? 0) > (b?.score ?? 0) ? a : b), latest);
        return {
          ...group,
          attempts: sorted,
          latestAttempt: latest,
          bestAttempt: best,
        };
      })
      .sort((a, b) => getTimestamp(b.latestAttempt) - getTimestamp(a.latestAttempt));
  }, [myResults, quizzes]);

  const filteredMockAttemptGroups = useMemo(() => {
    if (historyScoreFilter === 'good') return mockAttemptGroups.filter((g) => (g.latestAttempt?.score ?? 0) >= 60);
    if (historyScoreFilter === 'review') return mockAttemptGroups.filter((g) => (g.latestAttempt?.score ?? 0) < 60);
    return mockAttemptGroups;
  }, [historyScoreFilter, mockAttemptGroups]);

  // Filtered available exams
  const displayedExams = useMemo(() => {
    if (catalogFilter === 'directed') return directedMockExams;
    if (catalogFilter === 'platform') return platformMockExams;
    return availableMockExams;
  }, [catalogFilter, directedMockExams, platformMockExams, availableMockExams]);

  const selectedExam = selectedExamId ? availableMockExams.find((q) => q.id === selectedExamId) : null;
  const selectedResults = selectedExamId ? (resultsByExam.get(selectedExamId) || []) : [];

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
              <Sparkles size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black sm:text-2xl">مركز الاختبارات المحاكية</h1>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black text-white">قياس وتحصيلي</span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-white/80">نماذج قياس المعيارية وتاريخ تدريبك ومحاولاتك السابقة</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl bg-white/10 px-3.5 py-2 text-center backdrop-blur-sm">
              <div className="text-lg font-black">{availableMockExams.length}</div>
              <div className="text-[10px] font-bold text-white/75">نماذج متاحة</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-3.5 py-2 text-center backdrop-blur-sm">
              <div className="text-lg font-black">{myResults.length}</div>
              <div className="text-[10px] font-bold text-white/75">محاولاتي السابقة</div>
            </div>
            {stats.best > 0 && (
              <div className="rounded-2xl bg-white/10 px-3.5 py-2 text-center backdrop-blur-sm">
                <div className="text-lg font-black">{stats.best}%</div>
                <div className="text-[10px] font-bold text-white/75">أعلى نتيجة</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Section Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs w-fit">
        <button
          type="button"
          onClick={() => setActiveHubTab('available')}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition-all ${
            activeHubTab === 'available'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs'
          }`}
        >
          <Award size={18} />
          <span>النماذج المحاكية المتاحة</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
            activeHubTab === 'available' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {availableMockExams.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveHubTab('history')}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black transition-all ${
            activeHubTab === 'history'
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs'
          }`}
        >
          <TrendingUp size={18} />
          <span>محاولاتي السابقة في المحاكي</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-black ${
            activeHubTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {myResults.length}
          </span>
        </button>
      </div>

      {/* ── Tab 1: Available Mock Exams ── */}
      {activeHubTab === 'available' && (
        <div className="space-y-5">
          {/* Catalog Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCatalogFilter('all')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                  catalogFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                كل النماذج ({availableMockExams.length})
              </button>

              {directedMockExams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCatalogFilter('directed')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    catalogFilter === 'directed'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80'
                  }`}
                >
                  موجهة لي ({directedMockExams.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setCatalogFilter('platform')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                  catalogFilter === 'platform'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                نماذج المسارات ({platformMockExams.length})
              </button>
            </div>

            <span className="text-xs font-bold text-gray-400">
              معايير قياس والتحصيلي المعتمدة
            </span>
          </div>

          {/* Exam Cards Grid */}
          {displayedExams.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <Trophy size={40} className="mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-black text-gray-700">لا توجد نماذج محاكية منشورة في هذا القسم حالياً</h3>
              <p className="mt-1 text-xs font-bold text-gray-400">سيتم إضافة وتفعيل نماذج جديدة قريباً من الإدارة.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedExams.map((exam) => {
                const isDirected = Array.isArray(exam.targetGroupIds) && exam.targetGroupIds.length > 0;
                return (
                  <MockExamCard
                    key={exam.id}
                    exam={exam}
                    paths={paths as Array<{ id: string; name: string; [key: string]: unknown }>}
                    resultsByExam={resultsByExam}
                    selectedExamId={selectedExamId}
                    setSelectedExamId={setSelectedExamId}
                    isDirected={isDirected}
                  />
                );
              })}
            </div>
          )}

          {/* Expanded Selected Exam History (if clicked) */}
          {selectedExam && selectedResults.length > 0 && (
            <section className="rounded-3xl border-2 border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-black text-indigo-900">
                  <TrendingUp size={16} />
                  سجل محاولاتك في: {selectedExam.title}
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-black text-indigo-700">
                    {selectedResults.length} محاولة
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedExamId(null)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  إغلاق
                </button>
              </div>

              {/* Quick stats for this exam */}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatBadge
                  label="أعلى درجة"
                  value={`${Math.max(...selectedResults.map((r) => r.score))}%`}
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

              <div className="space-y-2">
                {selectedResults.map((result, i) => (
                  <AttemptRow key={result.id || result.date || i} result={result} index={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Tab 2: Previous Mock Attempts (History) ── */}
      {activeHubTab === 'history' && (
        <div className="space-y-5">
          {/* Stats Overview */}
          {stats.total > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl font-black text-gray-900">{stats.total}</div>
                <div className="mt-1 text-xs font-bold text-gray-500">إجمالي المحاولات</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl font-black text-emerald-600">{stats.best}%</div>
                <div className="mt-1 text-xs font-bold text-gray-500">أعلى درجة محققة</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl font-black text-indigo-600">{stats.avg}%</div>
                <div className="mt-1 text-xs font-bold text-gray-500">متوسط الدرجات</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl font-black text-blue-600">{stats.passed}</div>
                <div className="mt-1 text-xs font-bold text-gray-500">اختبارات ناجحة (60+)</div>
              </div>
            </div>
          )}

          {/* History Filters */}
          {myResults.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryScoreFilter('all')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    historyScoreFilter === 'all'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  كل النتائج ({myResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScoreFilter('good')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    historyScoreFilter === 'good'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
                  }`}
                >
                  ناجح ومطمئن ({stats.passed})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScoreFilter('review')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    historyScoreFilter === 'review'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
                  }`}
                >
                  يحتاج تدريب ({myResults.length - stats.passed})
                </button>
              </div>

              <span className="text-xs font-bold text-gray-400">
                مرتبة من الأحدث إلى الأقدم
              </span>
            </div>
          )}

          {/* Loading & Error States */}
          {isLoading && (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-gray-500">جارٍ تحميل سجل محاولاتك المحاكية...</p>
            </div>
          )}

          {loadError && !isLoading && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-center text-sm font-bold text-rose-600">
              {loadError}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && myResults.length === 0 && !loadError && (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <Award size={48} className="mx-auto mb-3 text-indigo-300" />
              <h3 className="text-lg font-black text-gray-800">لم تؤدِ أي اختبار محاكي حتى الآن</h3>
              <p className="mx-auto mt-2 max-w-md text-sm font-bold text-gray-500">
                الاختبارات المحاكية تحاكي اختبارات قياس الحقيقية بزمن وأقسام ونظام درجات معياري. اختر أحد النماذج المتاحة لتبدأ قياس مستواك.
              </p>
              <button
                type="button"
                onClick={() => setActiveHubTab('available')}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-md hover:bg-indigo-700"
              >
                <Zap size={16} /> تصفح النماذج المتاحة وابدأ الآن
              </button>
            </div>
          )}

          {/* Attempts List with EXACT Same Card from Image */}
          {!isLoading && filteredMockAttemptGroups.length > 0 && (
            <div className="space-y-3">
              {filteredMockAttemptGroups.map((group) => (
                <AttemptGroupCard
                  key={group.key}
                  group={group}
                  isOpen={openAttemptGroupKey === group.key}
                  onToggle={() => setOpenAttemptGroupKey((curr) => (curr === group.key ? null : group.key))}
                  getAttemptResultLink={getAttemptResultLink}
                  getAttemptRetryLink={getAttemptRetryLink}
                  getPathName={getPathName}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MockExamStudentHub;
