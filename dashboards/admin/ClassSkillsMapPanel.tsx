import { buildClassSkillMatrix, type MatrixSkill } from '../../utils/classSkillMatrix';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Filter, Target } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type SkillEntry = MatrixSkill;

interface StudentRow {
  id: string;
  name: string;
  className: string;
  classId?: string;
  schoolName?: string;
  average: number;
  status: string;
  resultsList: Array<{ skillsAnalysis?: SkillEntry[] }>;
}

interface GroupSnapshot {
  id: string;
  name: string;
  studentCount: number;
  average: number;
}

interface ClassSkillsMapPanelProps {
  students: StudentRow[];
  groupSnapshots: GroupSnapshot[];
  onSelectStudent: (id: string) => void;
  pathId?: string;
  subjectId?: string;
  scopeLabels?: Record<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCellColor(mastery: number): string {
  if (mastery >= 80) return 'bg-emerald-500 text-white';
  if (mastery >= 65) return 'bg-emerald-200 text-emerald-900';
  if (mastery >= 50) return 'bg-amber-300 text-amber-900';
  if (mastery >= 35) return 'bg-orange-400 text-white';
  return 'bg-rose-500 text-white';
}

function getCellLabel(mastery: number): string {
  if (mastery >= 80) return 'ممتاز';
  if (mastery >= 65) return 'جيد';
  if (mastery >= 50) return 'متوسط';
  if (mastery >= 35) return 'ضعيف';
  return 'حرج';
}

const PAGE_SIZE = 10;

// ── Main Component ─────────────────────────────────────────────────────────────
export const ClassSkillsMapPanel: React.FC<ClassSkillsMapPanelProps> = ({
  students, groupSnapshots, onSelectStudent, pathId, subjectId, scopeLabels = {},
}) => {
  const [classFilter, setClassFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [skillPage, setSkillPage] = useState(0);
  useEffect(() => { setPage(0); setSkillPage(0); }, [classFilter, pathId, subjectId]);

  // فلترة الطلاب حسب الفصل
  const filteredStudents = useMemo(() => {
    if (classFilter === 'all') return students;
    return students.filter((s) => (s.classId || s.className) === classFilter);
  }, [students, classFilter]);

  // بناء مصفوفة المهارات من كل نتائج الطلاب
  const { skillColumns: allSkillColumns, studentSkillMap } = useMemo(() => buildClassSkillMatrix(filteredStudents, { pathId, subjectId }), [filteredStudents, pathId, subjectId]);
  const lastSkillPage = Math.max(0, Math.ceil(allSkillColumns.length / 12) - 1);
  const visibleSkillPage = Math.min(skillPage, lastSkillPage);
  const skillColumns = allSkillColumns.slice(visibleSkillPage * 12, (visibleSkillPage + 1) * 12);

  // تقسيم الطلاب إلى صفحات
  const visiblePage = Math.min(page, Math.max(0, Math.ceil(filteredStudents.length / PAGE_SIZE) - 1));
  const paged = filteredStudents.slice(visiblePage * PAGE_SIZE, (visiblePage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const classOptions = [...new Map(students.filter(s => s.className).map(s => [s.classId || s.className, { value: s.classId || s.className, label: [s.schoolName, s.className].filter(Boolean).join(' — ') }])).values()];

  if (allSkillColumns.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-10 text-center">
        <Target size={36} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-bold">لا توجد بيانات مهارات كافية بعد.</p>
        <p className="text-xs text-gray-400 mt-1">ستظهر المصفوفة بعد أداء الطلاب لاختبارات ضمن المسار والمادة المختارين.</p>{classFilter !== "all" && <button className="mt-3 text-sm font-bold text-violet-700" onClick={() => setClassFilter("all")}>العودة لكل الفصول</button>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── رأس + فلتر ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <Target size={18} className="text-violet-500" />
            مصفوفة المهارات — طالب × مهارة
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            الألوان: <span className="text-emerald-600 font-bold">أخضر ممتاز</span> •{' '}
            <span className="text-amber-600 font-bold">أصفر متوسط</span> •{' '}
            <span className="text-rose-600 font-bold">أحمر ضعيف</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setPage(0); }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <option value="all">كل الفصول ({students.length} طالب)</option>
            {classOptions.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── التحذير من المهارات الحرجة ── */}
      {allSkillColumns.filter((s) => s.avg < 50).length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800">
          <AlertTriangle size={14} />
          {allSkillColumns.filter((s) => s.avg < 50).length} مهارة دون 50% — تحتاج إعادة شرح للفصل
        </div>
      )}

      {allSkillColumns.length > 12 && <div role="group" aria-label="صفحات مهارات الفصل" className="flex flex-wrap items-center gap-3 text-xs font-bold"><button disabled={visibleSkillPage === 0} onClick={() => setSkillPage(visibleSkillPage - 1)}>المهارات السابقة</button><span>المهارات {visibleSkillPage * 12 + 1}–{Math.min((visibleSkillPage + 1) * 12, allSkillColumns.length)} من {allSkillColumns.length}</span><button disabled={visibleSkillPage === lastSkillPage} onClick={() => setSkillPage(visibleSkillPage + 1)}>المهارات التالية</button></div>}
      {/* ── الجدول ── */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="sticky right-0 z-10 bg-gray-50 px-4 py-3 text-right font-black text-gray-700 min-w-[130px]">
                الطالب
              </th>
              <th className="px-3 py-3 text-center font-black text-gray-700 whitespace-nowrap">
                المتوسط العام
              </th>
              {skillColumns.map((sk) => (
                <th key={sk.key} className="px-2 py-3 text-center font-bold text-gray-600 max-w-[80px]">
                  <div className="truncate max-w-[72px] mx-auto" title={sk.skill}>{sk.skill}</div>
                  <div className="text-[10px] text-slate-500">{scopeLabels[sk.subjectId || ''] || 'مادة غير مصنفة'}{scopeLabels[`path:${sk.pathId}`] ? ` • ${scopeLabels[`path:${sk.pathId}`]}` : ''}</div>
                  <div className={`mt-1 text-[10px] font-black rounded px-1 ${getCellColor(sk.avg)}`}>{sk.avg}%</div>
                  <span className="text-[10px] text-slate-500">{sk.measuredStudents} طالب • {sk.count} قياس</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((student) => {
              const sMap = studentSkillMap.get(student.id);
              const avgColor = student.average >= 75 ? 'text-emerald-700' : student.average >= 55 ? 'text-amber-700' : 'text-rose-700';
              return (
                <tr key={student.id} className="hover:bg-violet-50/30 transition-colors cursor-pointer"
                  onClick={() => onSelectStudent(student.id)}>
                  <td className="sticky right-0 z-10 bg-white px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-black text-violet-700">
                        {student.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 truncate max-w-[90px]" title={student.name}>{student.name}</p>
                        <p className="text-[10px] text-gray-400">{student.className}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-black text-sm ${avgColor}`}>{student.resultsList.length ? `${student.average}%` : "لم يُقَس"}</span>
                  </td>
                  {skillColumns.map((sk) => {
                    const entry = sMap?.get(sk.key);
                    const mastery = entry ? Math.round(entry.total / entry.count) : null;
                    return (
                      <td key={sk.key} className="px-2 py-2.5 text-center">
                        {mastery !== null ? (
                          <span className={`inline-block rounded-lg px-2 py-1 text-[11px] font-black ${getCellColor(mastery)}`}>
                            {mastery}%
                          </span>
                        ) : (
                          <span className="text-gray-200 font-bold">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── ترقيم الصفحات ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-bold text-gray-500">
          <button onClick={() => setPage(Math.max(0, visiblePage - 1))} disabled={visiblePage === 0}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight size={14} /> السابق
          </button>
          <span>صفحة {visiblePage + 1} من {totalPages} • {filteredStudents.length} طالب</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, visiblePage + 1))} disabled={visiblePage === totalPages - 1}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
            التالي <ChevronLeft size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
