import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Loader2, School, Users } from 'lucide-react';
import { api } from '../../services/api';

type Row = {
  classId?: string;
  userId?: string;
  studentName?: string;
  pathId: string;
  subjectId: string;
  sectionId?: string;
  skillId: string;
  skill: string;
  mastery: number;
  recentMastery: number;
  trend?: string;
  trendBreakdown?: { improving: number; stable: number; declining: number };
  confidence: number;
  evidenceCount: number;
  studentCount?: number;
  coverage?: number;
  supportStudents?: number;
  supportRate?: number;
  needsSupport?: boolean;
};

type Scope = {
  totalStudents: number;
  sampledStudents: number;
  isTruncated: boolean;
};

export const SchoolSkillAggregatePanel: React.FC<{
  pathId?: string;
  subjectId?: string;
  classId?: string;
  groups?: Array<{ id: string; name: string }>;
}> = ({ pathId, subjectId, classId, groups = [] }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [scope, setScope] = useState<Scope | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Row | null>(null);
  const [classRows, setClassRows] = useState<Row[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentRows, setStudentRows] = useState<Row[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [String(group.id), String(group.name || group.id)])),
    [groups],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedSkill(null);
    setClassRows([]);
    setSelectedClassId('');
    setStudentRows([]);

    api.getSchoolSkillAggregates({
      groupBy: 'skill',
      ...(pathId ? { pathId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(classId ? { classId } : {}),
      limit: 20,
    })
      .then((payload) => {
        if (cancelled) return;
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setScope(payload.scope);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setScope(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [classId, pathId, subjectId]);

  const openSkill = async (row: Row) => {
    setSelectedSkill(row);
    setSelectedClassId('');
    setStudentRows([]);
    setDrillLoading(true);
    try {
      const payload = await api.getSchoolSkillAggregates({
        groupBy: 'class',
        pathId: row.pathId,
        subjectId: row.subjectId,
        skillId: row.skillId,
        ...(classId ? { classId } : {}),
        limit: 50,
      });
      setClassRows(Array.isArray(payload.rows) ? payload.rows : []);
    } catch {
      setClassRows([]);
    } finally {
      setDrillLoading(false);
    }
  };

  const openClass = async (row: Row) => {
    if (!selectedSkill) return;
    const nextClassId = String(row.classId || '');
    setSelectedClassId(nextClassId);
    setDrillLoading(true);
    try {
      const payload = await api.getSchoolSkillAggregates({
        groupBy: 'student',
        pathId: selectedSkill.pathId,
        subjectId: selectedSkill.subjectId,
        skillId: selectedSkill.skillId,
        ...(nextClassId ? { classId: nextClassId } : {}),
        limit: 100,
      });
      setStudentRows(Array.isArray(payload.rows) ? payload.rows : []);
    } catch {
      setStudentRows([]);
    } finally {
      setDrillLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" data-testid="school-skill-aggregate-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
            <School size={14} />
            تحليل مهارات المدرسة
          </div>
          <h2 className="mt-2 text-lg font-black text-slate-900">من المهارة إلى الفصول والطلاب</h2>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            تجميع خفيف ومسبق من أدلة الاختبارات المدرسية، مع إبقاء المسار والمادة داخل كل رقم.
          </p>
        </div>
        {scope ? (
          <div className="text-xs font-black text-slate-500">
            نطاق الطلاب: {scope.sampledStudents}{scope.isTruncated ? <> من {scope.totalStudents}</> : null}
          </div>
        ) : null}
      </div>

      {scope?.isTruncated ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
          النطاق أكبر من عينة القراءة الحالية؛ استخدم المسار/المادة/الفصل للحصول على Drill-down أدق قبل الاعتماد على نسب التغطية.
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-500">
          <Loader2 size={17} className="animate-spin" /> جارٍ تحميل التجميعات…
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-500">
          لا توجد أدلة مدرسية مجمعة في النطاق المحدد حتى الآن.
        </div>
      ) : (
        <div className="mt-5 grid gap-2 lg:grid-cols-2">
          {rows.map((row) => (
            <button
              type="button"
              key={[row.pathId, row.subjectId, row.skillId].join('::')}
              onClick={() => void openSkill(row)}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-right transition hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-slate-800">{row.skill}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    إتقان {row.mastery}% · حديث {row.recentMastery}% · ثقة {row.confidence}%
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    دعم {row.supportRate ?? 0}% · تغطية {row.coverage ?? 0}% · أدلة {row.evidenceCount}
                  </div>
                </div>
                <ChevronLeft size={16} className="mt-1 shrink-0 text-indigo-500" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedSkill ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="font-black text-slate-800">الفصول — {selectedSkill.skill}</div>
          {drillLoading && classRows.length === 0 ? (
            <div className="mt-3 text-xs font-bold text-slate-500">جارٍ تحميل الفصول…</div>
          ) : classRows.length === 0 ? (
            <div className="mt-3 text-xs font-bold text-slate-500">لا توجد بيانات فصلية لهذه المهارة.</div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {classRows.map((row) => (
                <button
                  type="button"
                  key={[row.classId || 'none', row.skillId].join('::')}
                  onClick={() => void openClass(row)}
                  className={'rounded-xl border px-3 py-2 text-xs font-black ' + (
                    selectedClassId === String(row.classId || '')
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-700'
                  )}
                >
                  {groupNameById.get(String(row.classId || '')) || row.classId || 'بدون فصل'}
                  {' · '}{row.mastery}%
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {selectedSkill && selectedClassId ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Users size={15} /> الطلاب في الفصل المحدد
          </div>
          {drillLoading && studentRows.length === 0 ? (
            <div className="mt-3 text-xs font-bold text-slate-500">جارٍ تحميل الطلاب…</div>
          ) : studentRows.length === 0 ? (
            <div className="mt-3 text-xs font-bold text-slate-500">لا توجد بيانات طلاب في هذا النطاق.</div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {studentRows.map((row) => (
                <div key={[row.userId || '', row.skillId].join('::')} className="rounded-lg border border-slate-100 bg-white p-2.5">
                  <div className="text-xs font-black text-slate-800">{row.studentName || 'طالب'}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    {row.mastery}% · حديث {row.recentMastery}% · {row.trend || 'stable'} · ثقة {row.confidence}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
};
