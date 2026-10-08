import React, { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, ChevronLeft, Layers, RefreshCw, Sparkles, TrendingUp, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { resolveClassroomSkillName } from '../../utils/classroomSkillResolver';
import { ClassroomSkillRadar, ClassroomSkillRadarItem } from './ClassroomSkillRadar';

type InsightsPeriod = 'today' | 'week' | 'month' | 'all';

type ClassComparisonSummary = {
  sessions: number;
  participants: number;
  expected: number;
  participationRate: number | null;
  responses: number;
  correct: number;
  accuracy: number | null;
};

export type ClassComparisonItem = {
  classId: string;
  className: string;
  summary: ClassComparisonSummary;
};

type InsightsPayload = {
  generatedAt: string;
  source: 'finalized_report_snapshots';
  period: InsightsPeriod;
  classId: string | null;
  weakThreshold: number;
  totals: ClassComparisonSummary;
  skills: Array<{
    skillId: string;
    answered: number;
    correct: number;
    sessions: number;
    accuracy: number | null;
    weak: boolean;
  }>;
  classesComparison?: ClassComparisonItem[];
  trend: Array<{
    sessionId: string;
    classId: string;
    className: string;
    endedAt: string | null;
    responses: number;
    accuracy: number | null;
    joined: number;
    expected: number;
  }>;
};

interface ClassroomReportInsightsPanelProps {
  schoolId: string;
  assignments: Array<{ classId: string; className: string }>;
  enabled: boolean;
  onPrepareIntervention?: (skillId: string) => void;
}

const periodLabels: Record<InsightsPeriod, string> = {
  today: 'اليوم',
  week: 'آخر 7 أيام',
  month: 'آخر 30 يومًا',
  all: 'كل الحصص',
};

export const ClassroomReportInsightsPanel: React.FC<ClassroomReportInsightsPanelProps> = ({
  schoolId,
  assignments,
  enabled,
  onPrepareIntervention,
}) => {
  const { skills, nestedSkills, subjects } = useStore();
  const [period, setPeriod] = useState<InsightsPeriod>('week');
  const [classId, setClassId] = useState('all');
  const [viewMode, setViewMode] = useState<'overview' | 'comparison'>('overview');
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!enabled || !schoolId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ schoolId, period });
      if (classId !== 'all') params.set('classId', classId);
      const result = await api.get<{ insights: InsightsPayload }>(`/classroom/teacher/insights?${params.toString()}`);
      setData(result.insights);
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'تعذر تحميل تحليل الحصص الذكية.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, period, classId, enabled]);

  const radarItems = useMemo<ClassroomSkillRadarItem[]>(() => (
    (data?.skills || []).map((skill) => ({
      skillId: skill.skillId,
      skillName: resolveClassroomSkillName(skill.skillId, skills, nestedSkills, subjects),
      accuracy: skill.accuracy,
      evidenceCount: skill.answered,
      sessionsCount: skill.sessions,
    }))
  ), [data?.skills, skills, nestedSkills, subjects]);

  const comparisonList = useMemo<ClassComparisonItem[]>(() => {
    if (!data) return [];
    const fromApi = data.classesComparison || [];
    const apiMap = new Map(fromApi.map((item) => [item.classId, item]));

    return assignments.map((assignment) => {
      const existing = apiMap.get(assignment.classId);
      if (existing) {
        return {
          ...existing,
          className: assignment.className || existing.className,
        };
      }
      return {
        classId: assignment.classId,
        className: assignment.className,
        summary: {
          sessions: 0,
          participants: 0,
          expected: 0,
          participationRate: null,
          responses: 0,
          correct: 0,
          accuracy: null,
        },
      };
    }).sort((a, b) => (b.summary.accuracy ?? -1) - (a.summary.accuracy ?? -1) || b.summary.sessions - a.summary.sessions);
  }, [data, assignments]);

  const topClass = useMemo(() => {
    const activeWithAcc = comparisonList.filter((c) => c.summary.accuracy !== null && c.summary.sessions > 0);
    return activeWithAcc.length > 0 ? activeWithAcc[0] : null;
  }, [comparisonList]);

  if (!enabled) return null;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900" dir="rtl">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <BarChart3 size={20} className="text-indigo-600" /> تحليل الحصص التفاعلية
          </h3>
          <p className="mt-1 text-xs text-slate-500">تحليل خفيف مبني على التقارير النهائية المحفوظة، مع مواءمة المهارات ومقارنة الفصول.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {assignments.length > 1 && (
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                  viewMode === 'overview'
                    ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                التحليل والرادار
              </button>
              <button
                type="button"
                onClick={() => setViewMode('comparison')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black transition-all ${
                  viewMode === 'comparison'
                    ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Layers size={13} />
                مقارنة الفصول ({assignments.length})
              </button>
            </div>
          )}
          {viewMode === 'overview' && assignments.length > 1 && (
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="all">كل فصولي</option>
              {assignments.map((assignment) => <option key={assignment.classId} value={assignment.classId}>{assignment.className}</option>)}
            </select>
          )}
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as InsightsPeriod)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
          >
            {Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-slate-700"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}

      {data && viewMode === 'comparison' && (
        <div className="mt-5 space-y-4">
          {topClass && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Award size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                    الفصل الأعلى إتقاناً في {periodLabels[period]}: {topClass.className}
                  </h4>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    متوسط الدقة {topClass.summary.accuracy}% من أصل {topClass.summary.responses} إجابة عبر {topClass.summary.sessions} حصص.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setClassId(topClass.classId); setViewMode('overview'); }}
                className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-white shadow-xs hover:bg-amber-600"
              >
                تفاصيل الفصل <ChevronLeft size={13} />
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comparisonList.map((item, idx) => {
              const accuracy = item.summary.accuracy;
              const hasSessions = item.summary.sessions > 0;
              const isLead = topClass?.classId === item.classId && hasSessions;

              return (
                <div
                  key={item.classId}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isLead
                      ? 'border-amber-300 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-950/10'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                          isLead ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{item.className}</h4>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        accuracy !== null && accuracy >= 75
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : accuracy !== null && accuracy >= 60
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                            : accuracy !== null
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {accuracy !== null ? `${accuracy}% دقة` : 'لا حصص'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                        <span className="text-[10px] font-bold text-slate-500">الحصص</span>
                        <div className="mt-0.5 text-base font-black text-slate-900 dark:text-white">{item.summary.sessions}</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                        <span className="text-[10px] font-bold text-slate-500">المشاركة</span>
                        <div className="mt-0.5 text-base font-black text-slate-900 dark:text-white">
                          {item.summary.participationRate !== null ? `${item.summary.participationRate}%` : '—'}
                        </div>
                      </div>
                    </div>

                    {hasSessions && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>معدل الإتقان الأكاديمي</span>
                          <span>{accuracy ?? 0}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              (accuracy ?? 0) >= 70 ? 'bg-emerald-500' : (accuracy ?? 0) >= 55 ? 'bg-indigo-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(3, Math.min(100, accuracy ?? 0))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      {item.summary.correct}/{item.summary.responses} إجابة صحيحة
                    </span>
                    <button
                      type="button"
                      onClick={() => { setClassId(item.classId); setViewMode('overview'); }}
                      className="text-xs font-black text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 inline-flex items-center gap-0.5"
                    >
                      فتح التحليل والرادار ←
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data && viewMode === 'overview' && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <InsightKpi label="الحصص" value={data.totals.sessions} icon={<TrendingUp size={15} />} />
            <InsightKpi label="المشاركة" value={data.totals.participationRate === null ? '—' : `${data.totals.participationRate}%`} icon={<Users size={15} />} />
            <InsightKpi label="الإجابات" value={data.totals.responses} />
            <InsightKpi label="متوسط الإتقان" value={data.totals.accuracy === null ? '—' : `${data.totals.accuracy}%`} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <ClassroomSkillRadar
              items={radarItems}
              title={`رادار المهارات · ${periodLabels[period]}`}
              subtitle="المهارات مرتبة بالاسم المعتمد مع إبراز الأضعف أولاً للتدخل العلاجي."
              onSkillClick={onPrepareIntervention ? (skillId) => {
                if (!skillId.startsWith('subject:')) onPrepareIntervention(skillId);
              } : undefined}
            />

            <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">آخر الحصص في الفترة</h4>
              <div className="mt-3 space-y-2">
                {data.trend.slice(-6).reverse().map((session) => (
                  <div key={session.sessionId} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-black text-slate-900 dark:text-white">{session.className || session.classId || 'فصل دراسي'}</span>
                      <span className="text-xs font-black text-indigo-600">{session.accuracy === null ? '—' : `${session.accuracy}%`}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-bold text-slate-500">{session.responses} إجابة · حضور {session.joined}/{session.expected}</div>
                  </div>
                ))}
                {data.trend.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-bold text-slate-500">لا توجد حصص منتهية في الفترة المختارة.</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const InsightKpi: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">{icon}{label}</div>
    <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{value}</div>
  </div>
);
