import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Award, BarChart3, CheckCircle2,
  ChevronRight, Download, Printer, Trophy, Users,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface StudentRow {
  id: string;
  name: string;
  className: string;
  average: number;
  attempts: number;
  status: string;
  weakSkills: string[];
  resultsList: Array<{ score: number; quizTitle: string; date: string }>;
}

interface GroupSnapshot {
  id: string;
  name: string;
  studentCount: number;
  average: number;
  weakStudents: number;
}

interface ClassReportPanelProps {
  students: StudentRow[];
  groupSnapshots: GroupSnapshot[];
  overallAverage: number;
  onSelectStudent: (id: string) => void;
  onExportCSV: () => void;
  onPrint: () => void;
}

// ── Grade Band ─────────────────────────────────────────────────────────────────
type Band = { label: string; min: number; max: number; color: string; bg: string; border: string };
const BANDS: Band[] = [
  { label: 'ممتاز', min: 90, max: 100, color: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  { label: 'جيد جداً', min: 75, max: 89, color: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-300' },
  { label: 'جيد', min: 60, max: 74, color: 'text-amber-800', bg: 'bg-amber-100', border: 'border-amber-300' },
  { label: 'مقبول', min: 50, max: 59, color: 'text-orange-800', bg: 'bg-orange-100', border: 'border-orange-300' },
  { label: 'يحتاج دعم', min: 0, max: 49, color: 'text-rose-800', bg: 'bg-rose-100', border: 'border-rose-300' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export const ClassReportPanel: React.FC<ClassReportPanelProps> = ({
  students, groupSnapshots, overallAverage, onSelectStudent, onExportCSV, onPrint,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const filteredStudents = useMemo(() =>
    selectedClass === 'all' ? students : students.filter((s) => s.className === selectedClass),
    [students, selectedClass],
  );

  const stats = useMemo(() => {
    const withAttempts = filteredStudents.filter((s) => s.attempts > 0);
    const avg = withAttempts.length
      ? Math.round(withAttempts.reduce((t, s) => t + s.average, 0) / withAttempts.length) : 0;
    const highest = withAttempts.reduce((best, s) => s.average > best ? s.average : best, 0);
    const lowest = withAttempts.reduce((low, s) => s.average < low ? s.average : low, 100);

    const bandCounts = BANDS.map((band) => ({
      ...band,
      students: filteredStudents.filter((s) => s.average >= band.min && s.average <= band.max),
    }));

    // المهارات الأضعف للمجموعة
    const skillMap = new Map<string, number>();
    filteredStudents.forEach((s) => s.weakSkills.forEach((sk) => {
      skillMap.set(sk, (skillMap.get(sk) || 0) + 1);
    }));
    const weakestSkills = Array.from(skillMap.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));

    return { avg, highest, lowest, bandCounts, weakestSkills, total: filteredStudents.length, withAttempts: withAttempts.length };
  }, [filteredStudents]);

  const classNames = Array.from(new Set(students.map((s) => s.className))).filter(Boolean);
  const urgentStudents = filteredStudents.filter((s) => s.status === 'danger' || (s.attempts > 0 && s.average < 50));
  const topStudents = [...filteredStudents].filter((s) => s.attempts > 0).sort((a, b) => b.average - a.average).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ── رأس التقرير ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-500" /> تقرير أداء الفصل
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">توزيع مستويات الطلاب + المهارات الضعيفة + قائمة التدخل</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">كل الفصول</option>
            {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={onExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
            <Download size={13} /> تصدير
          </button>
          <button onClick={onPrint}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
            <Printer size={13} /> طباعة
          </button>
        </div>
      </div>

      {/* ── إحصائيات سريعة ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'إجمالي الطلاب', value: stats.total, sub: `${stats.withAttempts} أدوا اختبارات`, color: 'border-blue-100 bg-blue-50 text-blue-800' },
          { label: 'متوسط الفصل', value: `${stats.avg}%`, sub: stats.avg >= 75 ? 'جيد ✅' : stats.avg >= 60 ? 'متوسط ⚠️' : 'ضعيف 🔴', color: 'border-indigo-100 bg-indigo-50 text-indigo-800' },
          { label: 'أعلى درجة', value: `${stats.highest}%`, sub: 'في الفصل', color: 'border-emerald-100 bg-emerald-50 text-emerald-800' },
          { label: 'يحتاجون دعماً', value: urgentStudents.length, sub: 'دون 50%', color: 'border-rose-100 bg-rose-50 text-rose-800' },
        ].map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${item.color}`}>
            <div className="text-2xl font-black">{item.value}</div>
            <div className="text-xs font-black opacity-80 mt-1">{item.label}</div>
            <div className="text-[11px] opacity-60 mt-0.5">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* ── توزيع الدرجات ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-black text-gray-800 mb-4">توزيع مستويات الطلاب</h4>
        <div className="space-y-3">
          {stats.bandCounts.map((band) => {
            const pct = stats.total > 0 ? Math.round((band.students.length / stats.total) * 100) : 0;
            return (
              <div key={band.label} className="flex items-center gap-3">
                <div className={`w-20 shrink-0 rounded-lg border px-2 py-1 text-center text-xs font-black ${band.bg} ${band.color} ${band.border}`}>
                  {band.label}
                </div>
                <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${band.bg.replace('bg-', 'bg-').replace('-100', '-400')}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <div className="w-24 shrink-0 text-xs font-black text-gray-700 text-left">
                  {band.students.length} طالب ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── المهارات الأضعف ── */}
        {stats.weakestSkills.length > 0 && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <h4 className="text-sm font-black text-rose-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={15} /> المهارات الأضعف في الفصل
            </h4>
            <div className="space-y-2">
              {stats.weakestSkills.map(({ skill, count }) => (
                <div key={skill} className="flex items-center justify-between rounded-xl bg-white border border-rose-100 px-3 py-2">
                  <span className="text-xs font-bold text-gray-800">{skill}</span>
                  <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                    {count} طالب
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── أفضل الطلاب ── */}
        {topStudents.length > 0 && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h4 className="text-sm font-black text-emerald-800 mb-3 flex items-center gap-2">
              <Trophy size={15} /> أفضل الطلاب أداءً
            </h4>
            <div className="space-y-2">
              {topStudents.map((s, i) => (
                <button key={s.id} onClick={() => onSelectStudent(s.id)}
                  className="flex w-full items-center justify-between rounded-xl bg-white border border-emerald-100 px-3 py-2 hover:bg-emerald-50 transition-colors text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-600 w-5">{i + 1}.</span>
                    <span className="text-xs font-bold text-gray-900 truncate max-w-[110px]">{s.name}</span>
                  </div>
                  <span className="text-[11px] font-black text-emerald-700">{s.average}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── قائمة التدخل العاجل ── */}
      {urgentStudents.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
          <h4 className="text-sm font-black text-rose-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} /> قائمة التدخل العاجل ({urgentStudents.length} طالب)
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-right">
                  <th className="pb-2 font-black text-gray-600">الطالب</th>
                  <th className="pb-2 font-black text-gray-600 text-center">الفصل</th>
                  <th className="pb-2 font-black text-gray-600 text-center">المتوسط</th>
                  <th className="pb-2 font-black text-gray-600 text-center">اختبارات</th>
                  <th className="pb-2 font-black text-gray-600 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {urgentStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-rose-50/30">
                    <td className="py-2 font-bold text-gray-900 truncate max-w-[120px]">{s.name}</td>
                    <td className="py-2 text-center text-gray-500">{s.className}</td>
                    <td className="py-2 text-center">
                      <span className="font-black text-rose-700">{s.average}%</span>
                    </td>
                    <td className="py-2 text-center text-gray-500">{s.attempts}</td>
                    <td className="py-2 text-center">
                      <button onClick={() => onSelectStudent(s.id)}
                        className="rounded-lg bg-rose-600 px-3 py-1 text-[11px] font-black text-white hover:bg-rose-700 transition-colors">
                        بطاقة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── مقارنة الفصول ── */}
      {groupSnapshots.length > 1 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <Users size={15} className="text-indigo-500" /> مقارنة الفصول
          </h4>
          <div className="space-y-3">
            {[...groupSnapshots].sort((a, b) => b.average - a.average).map((g, i) => {
              const isTop = i === 0;
              return (
                <div key={g.id} className={`flex items-center gap-3 rounded-xl p-3 ${isTop ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                  <span className={`text-xs font-black w-5 ${isTop ? 'text-emerald-700' : 'text-gray-400'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{g.name}</p>
                    <p className="text-[11px] text-gray-500">{g.studentCount} طالب • {g.weakStudents} يحتاجون دعماً</p>
                  </div>
                  <div className="w-24 text-right">
                    <span className={`text-sm font-black ${g.average >= 75 ? 'text-emerald-700' : g.average >= 55 ? 'text-amber-700' : 'text-rose-700'}`}>
                      {g.average}%
                    </span>
                  </div>
                  {isTop && <Trophy size={14} className="text-amber-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
