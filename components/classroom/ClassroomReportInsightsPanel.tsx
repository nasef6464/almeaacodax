import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { api } from '../../services/api';
import { ClassroomSkillRadar, ClassroomSkillRadarItem } from './ClassroomSkillRadar';

type InsightsPeriod = 'today' | 'week' | 'month' | 'all';

type InsightsPayload = {
  generatedAt: string;
  source: 'finalized_report_snapshots';
  period: InsightsPeriod;
  classId: string | null;
  weakThreshold: number;
  totals: {
    sessions: number;
    participants: number;
    expected: number;
    participationRate: number | null;
    responses: number;
    correct: number;
    accuracy: number | null;
  };
  skills: Array<{
    skillId: string;
    answered: number;
    correct: number;
    sessions: number;
    accuracy: number | null;
    weak: boolean;
  }>;
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
  const [period, setPeriod] = useState<InsightsPeriod>('week');
  const [classId, setClassId] = useState('all');
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
      skillName: skill.skillId.startsWith('subject:') ? skill.skillId.slice('subject:'.length) : skill.skillId,
      accuracy: skill.accuracy,
      evidenceCount: skill.answered,
      sessionsCount: skill.sessions,
    }))
  ), [data?.skills]);

  if (!enabled) return null;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900" dir="rtl">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <BarChart3 size={20} className="text-indigo-600" /> تحليل الحصص التفاعلية
          </h3>
          <p className="mt-1 text-xs text-slate-500">تحليل خفيف مبني على التقارير النهائية المحفوظة، بدون إعادة قراءة كل استجابات الطلاب الخام.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {assignments.length > 1 && (
            <select value={classId} onChange={(event) => setClassId(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
              <option value="all">كل فصولي</option>
              {assignments.map((assignment) => <option key={assignment.classId} value={assignment.classId}>{assignment.className}</option>)}
            </select>
          )}
          <select value={period} onChange={(event) => setPeriod(event.target.value as InsightsPeriod)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            {Object.entries(periodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-slate-700">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> تحديث
          </button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}

      {data && (
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
              subtitle="المهارات الأضعف تظهر أولاً، ويمكن فتح تدخل علاجي مباشرة للمهارات الحقيقية."
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
