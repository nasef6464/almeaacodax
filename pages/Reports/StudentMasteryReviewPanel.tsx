import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, RefreshCw, Trophy } from 'lucide-react';
import { api } from '../../services/api';

type Challenge = {
  skillId: string;
  skill: string;
  pathId: string;
  subjectId: string;
  sectionId: string;
  mastery: number;
  evidenceCount: number;
  lastAttemptAt?: string;
  dueReviewCount: number;
};

type ReviewStats = {
  dueToday: number;
  dueThisWeek: number;
  totalCards: number;
  masteryReviewDue: number;
};

export const StudentMasteryReviewPanel: React.FC<{
  pathId?: string;
  subjectId?: string;
}> = ({ pathId, subjectId }) => {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!pathId) {
      setStats(null);
      setChallenges([]);
      return () => { cancelled = true; };
    }

    setLoading(true);
    const scope = { pathId, ...(subjectId ? { subjectId } : {}) };
    Promise.all([
      api.getReviewStats(scope),
      api.getMasteryChallenges({ ...scope, limit: 5 }),
    ])
      .then(([statsResponse, challengeResponse]) => {
        if (cancelled) return;
        setStats(statsResponse);
        setChallenges(Array.isArray(challengeResponse.challenges) ? challengeResponse.challenges : []);
      })
      .catch(() => {
        if (cancelled) return;
        setStats(null);
        setChallenges([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathId, subjectId]);

  const reviewLink = useMemo(() => {
    const params = new URLSearchParams();
    if (pathId) params.set('pathId', pathId);
    if (subjectId) params.set('subjectId', subjectId);
    const query = params.toString();
    return `/review${query ? `?${query}` : ''}`;
  }, [pathId, subjectId]);

  if (!pathId) return null;
  if (!loading && !stats && challenges.length === 0) return null;

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5" data-testid="student-mastery-review-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            <Trophy size={14} />
            تحدي الإتقان والمراجعة المتباعدة
          </div>
          <h2 className="mt-3 text-lg font-black text-slate-900">ثبّت ما أتقنته قبل أن يضعف</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            المراجعة هنا داخل المسار والمادة المحددين فقط، ولا تخلط أدلة مسارات أخرى.
          </p>
        </div>
        <Link
          to={reviewLink}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700"
        >
          <RefreshCw size={15} />
          ابدأ المراجعة
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="مستحق اليوم" value={loading ? '…' : stats?.dueToday ?? 0} icon={<Clock3 size={14} />} />
        <Stat label="هذا الأسبوع" value={loading ? '…' : stats?.dueThisWeek ?? 0} icon={<RefreshCw size={14} />} />
        <Stat label="تثبيت إتقان" value={loading ? '…' : stats?.masteryReviewDue ?? 0} icon={<Trophy size={14} />} />
        <Stat label="بطاقات المراجعة" value={loading ? '…' : stats?.totalCards ?? 0} icon={<CheckCircle2 size={14} />} />
      </div>

      {challenges.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {challenges.slice(0, 4).map((challenge) => (
            <div key={`${challenge.pathId}::${challenge.subjectId}::${challenge.skillId}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-sm font-black text-slate-800">{challenge.skill || 'مهارة متقنة'}</div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                <span>إتقان {Math.round(challenge.mastery)}%</span>
                <span>أدلة {challenge.evidenceCount}</span>
                <span>مستحق {challenge.dueReviewCount}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">{icon}{label}</div>
    <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
  </div>
);
