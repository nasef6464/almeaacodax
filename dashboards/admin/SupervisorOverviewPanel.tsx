import React from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, BarChart3,
  Building2, CheckCircle2, ChevronRight,
  GraduationCap, Target, TrendingUp, Users, Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface GroupSnapshot {
  id: string;
  name: string;
  studentCount: number;
  average: number;
  attempts: number;
  weakStudents: number;
}

interface WeakSkill {
  skill: string;
  mastery: number;
  affectedStudents: number;
}

interface StudentSummary {
  id: string;
  name: string;
  className: string;
  average: number;
  status: string;
  weakSkills: string[];
  attempts: number;
}


interface SupervisorOverviewPanelProps {
  primarySchoolName: string;
  scopeTypeName: string;
  studentCount: number;
  groupCount: number;
  averageScore: number;
  weakStudentsCount: number;
  improvedStudentsCount: number;
  declinedCount: number;
  inactiveCount: number;
  resultCount: number;
  pendingFollowUpCount: number;
  weakestSkills: WeakSkill[];
  groupSnapshots: GroupSnapshot[];
  topStudents: StudentSummary[];
  urgentStudents: StudentSummary[];
  bestClass: GroupSnapshot | null;
  weakestClass: GroupSnapshot | null;
  onGoToStudents: () => void;
  onGoToTests: () => void;
  onGoToSkills: () => void;
  onSelectStudent: (id: string) => void;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
const KPI: React.FC<{
  label: string; value: number | string; icon: React.ReactNode;
  tone: 'emerald' | 'blue' | 'amber' | 'rose' | 'violet';
  sub?: string; onClick?: () => void;
}> = ({ label, value, icon, tone, sub, onClick }) => {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    blue:    'border-blue-100 bg-blue-50 text-blue-800',
    amber:   'border-amber-100 bg-amber-50 text-amber-800',
    rose:    'border-rose-100 bg-rose-50 text-rose-800',
    violet:  'border-violet-100 bg-violet-50 text-violet-800',
  };
  return (
    <button
      type="button" onClick={onClick}
      className={`flex flex-col gap-1.5 rounded-2xl border p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-md ${colors[tone]} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black">{value}</span>
        <span className="opacity-60">{icon}</span>
      </div>
      <div className="text-xs font-black opacity-80">{label}</div>
      {sub && <div className="text-[11px] opacity-60">{sub}</div>}
    </button>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const SupervisorOverviewPanel: React.FC<SupervisorOverviewPanelProps> = ({
  primarySchoolName, scopeTypeName, studentCount, groupCount, averageScore,
  weakStudentsCount, improvedStudentsCount, declinedCount, inactiveCount,
  resultCount, pendingFollowUpCount, weakestSkills, groupSnapshots,
  topStudents, urgentStudents, bestClass, weakestClass,
  onGoToStudents, onGoToTests, onGoToSkills, onSelectStudent,
}) => {
  return (
    <div className="space-y-6">

      {/* ── رأس المنصة ── */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white/70">{scopeTypeName}</p>
            <h2 className="text-xl font-black mt-0.5">{primarySchoolName}</h2>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-black">
            {averageScore}% متوسط عام
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { v: studentCount, l: 'طالب' },
            { v: groupCount,   l: 'فصل' },
            { v: resultCount,  l: 'اختبار مؤدى' },
          ].map((item) => (
            <div key={item.l} className="rounded-xl bg-white/10 py-2">
              <div className="text-2xl font-black">{item.v}</div>
              <div className="text-[11px] text-white/70 font-bold">{item.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="يحتاجون متابعة" value={weakStudentsCount} tone="rose"
          icon={<AlertTriangle size={20} />} sub={`${pendingFollowUpCount} بدون تقييم`}
          onClick={onGoToStudents} />
        <KPI label="تحسّن مستواهم" value={improvedStudentsCount} tone="emerald"
          icon={<TrendingUp size={20} />} sub="مقارنة بآخر اختبار" />
        <KPI label="لم يبدأوا بعد" value={inactiveCount} tone="amber"
          icon={<Users size={20} />} sub="0 اختبارات" onClick={onGoToStudents} />
        <KPI label="تراجع أداؤهم" value={declinedCount} tone="violet"
          icon={<ArrowDown size={20} />} sub="مقارنة بآخر اختبار" />
      </div>

      {/* ── تنبيه عاجل ── */}
      {urgentStudents.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-rose-800 flex items-center gap-2">
              <AlertTriangle size={16} /> يحتاجون تدخلاً عاجلاً ({urgentStudents.length})
            </p>
            <button onClick={onGoToStudents}
              className="text-xs font-black text-rose-700 flex items-center gap-1 hover:underline">
              عرض الكل <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {urgentStudents.slice(0, 3).map((s) => (
              <button key={s.id} onClick={() => onSelectStudent(s.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-white border border-rose-100 px-4 py-2.5 text-right hover:bg-rose-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.className} • {s.attempts === 0 ? 'لم يبدأ' : `${s.average}% متوسط`}</p>
                </div>
                <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">
                  {s.attempts === 0 ? 'غير نشط' : 'خطر'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── أداء الفصول ── */}
      {groupSnapshots.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500" /> أداء الفصول
            </h3>
            {bestClass && (
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                أفضل فصل: {bestClass.name} ({bestClass.average}%)
              </span>
            )}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {groupSnapshots.map((g) => {
              const bar = Math.min(g.average, 100);
              const barColor = g.average >= 75 ? 'bg-emerald-500' : g.average >= 55 ? 'bg-amber-400' : 'bg-rose-500';
              return (
                <div key={g.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900 text-sm">{g.name}</p>
                    <span className="text-xs font-black text-gray-600">{g.average}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${bar}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 font-bold">
                    <span>{g.studentCount} طالب</span>
                    {g.weakStudents > 0 && (
                      <span className="text-rose-600">{g.weakStudents} يحتاج متابعة</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── المهارات الأضعف ── */}
      {weakestSkills.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
              <Target size={16} className="text-rose-500" /> المهارات الأضعف في الفصول
            </h3>
            <button onClick={onGoToSkills} className="text-xs font-black text-indigo-600 flex items-center gap-1 hover:underline">
              خريطة كاملة <ChevronRight size={13} />
            </button>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3">
            {weakestSkills.slice(0, 5).map((sk) => {
              const bar = Math.min(sk.mastery, 100);
              const barColor = sk.mastery >= 75 ? 'bg-emerald-500' : sk.mastery >= 55 ? 'bg-amber-400' : 'bg-rose-500';
              return (
                <div key={sk.skill} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">{sk.skill}</span>
                    <span className="text-gray-500 font-bold">{sk.mastery}% • {sk.affectedStudents} طالب</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${bar}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── إجراءات سريعة ── */}
      <div>
        <h3 className="mb-3 text-sm font-black text-gray-800 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" /> إجراءات سريعة
        </h3>
        <div className="grid gap-2 md:grid-cols-3">
          <button onClick={onGoToStudents}
            className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-right hover:bg-rose-100 transition-colors">
            <Users size={20} className="text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-900">متابعة الطلاب</p>
              <p className="text-xs text-rose-700">{weakStudentsCount} يحتاج اهتماماً</p>
            </div>
          </button>
          <button onClick={onGoToTests}
            className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-right hover:bg-indigo-100 transition-colors">
            <BarChart3 size={20} className="text-indigo-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-indigo-900">إنشاء اختبار</p>
              <p className="text-xs text-indigo-700">عادي أو محاكي قياس</p>
            </div>
          </button>
          <button onClick={onGoToSkills}
            className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-right hover:bg-violet-100 transition-colors">
            <Target size={20} className="text-violet-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-violet-900">خريطة المهارات</p>
              <p className="text-xs text-violet-700">أقوى وأضعف المهارات</p>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
};
