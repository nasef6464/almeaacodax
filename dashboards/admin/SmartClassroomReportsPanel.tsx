import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  ChevronDown,
  Download,
  Printer,
  Radio,
  RefreshCw,
  Target,
  Users,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { SmartClassroomSupervisorSignals } from './SmartClassroomSupervisorSignals';

type PeriodFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

type Summary = { sessions: number; participants: number; expected: number; participationRate: number | null; responses: number; correct: number; accuracy: number | null };
type SessionSummary = { sessionId: string; classId: string; className: string; teacherId: string; subjectName: string; endedAt: string | null; joined: number; expected: number; responses: number; accuracy: number | null };

type ClassNode = {
  classId: string;
  className: string;
  summary: Summary;
  sessions: SessionSummary[];
};

type TeacherNode = {
  teacherId: string;
  teacherName: string;
  summary: Summary;
  classes: ClassNode[];
};

type SchoolNode = {
  schoolId: string;
  schoolName: string;
  summary: Summary;
  teachers: TeacherNode[];
};

type SupervisorAnalytics = {
  period: PeriodFilter;
  range?: { from: string | null; to: string | null };
  totals: Summary;
  weakSkills?: Array<{ skillId: string; accuracy: number | null; answered: number; sessions: number }>;
  studentSignals?: { leastParticipation: Array<{ studentId: string; name: string; joinedSessions: number; responses: number; possibleResponses: number; responseRate: number | null; accuracy: number | null; improvement: number | null; earlyAccuracy: number | null; recentAccuracy: number | null }>; mostImproved: Array<{ studentId: string; name: string; joinedSessions: number; responses: number; possibleResponses: number; responseRate: number | null; accuracy: number | null; improvement: number | null; earlyAccuracy: number | null; recentAccuracy: number | null }> };
  hierarchy: {
    summary: Summary;
    schools: SchoolNode[];
  };
};
const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `${value}%`;
const dateValue = (date: Date) => date.toISOString().slice(0, 10);
const KpiCard: React.FC<{ label: string; value: React.ReactNode; hint: string }> = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
    <p className="text-xs font-bold text-slate-500">{label}</p>
    <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
  </div>
);
const emptySummary: Summary = {
  sessions: 0,
  participants: 0,
  expected: 0,
  participationRate: null,
  responses: 0,
  correct: 0,
  accuracy: null,
};

export const SmartClassroomReportsPanel: React.FC = () => {
  const [analytics, setAnalytics] = useState<SupervisorAnalytics | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [schoolId, setSchoolId] = useState('all');
  const [teacherId, setTeacherId] = useState('all');
  const [classId, setClassId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (period === 'custom' && (!customFrom || !customTo)) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getSupervisorClassroomAnalytics({
        period,
        ...(period === 'custom' ? { from: customFrom, to: customTo } : {}),
      });
      setAnalytics(result.analytics as SupervisorAnalytics);
    } catch (err: any) {
      setAnalytics(null);
      setError(err?.message || 'تعذر تحميل تحليلات الحصص الذكية ضمن نطاق الإشراف.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  const schools = analytics?.hierarchy?.schools || [];
  const school = schoolId === 'all' ? null : schools.find((item) => item.schoolId === schoolId) || null;
  const teachers = school?.teachers || [];
  const teacher = teacherId === 'all' ? null : teachers.find((item) => item.teacherId === teacherId) || null;
  const classes = teacher?.classes || [];
  const classroom = classId === 'all' ? null : classes.find((item) => item.classId === classId) || null;

  useEffect(() => {
    if (schoolId !== 'all' && !schools.some((item) => item.schoolId === schoolId)) {
      setSchoolId('all');
      setTeacherId('all');
      setClassId('all');
    }
  }, [schoolId, schools]);

  useEffect(() => {
    if (teacherId !== 'all' && !teachers.some((item) => item.teacherId === teacherId)) {
      setTeacherId('all');
      setClassId('all');
    }
  }, [teacherId, teachers]);

  useEffect(() => {
    if (classId !== 'all' && !classes.some((item) => item.classId === classId)) setClassId('all');
  }, [classId, classes]);

  const summary = classroom?.summary || teacher?.summary || school?.summary || analytics?.totals || emptySummary;

  const sessions = useMemo(() => {
    if (classroom) return classroom.sessions;
    if (teacher) return teacher.classes.flatMap((item) => item.sessions);
    if (school) return school.teachers.flatMap((item) => item.classes.flatMap((entry) => entry.sessions));
    return schools.flatMap((item) => item.teachers.flatMap((entry) => entry.classes.flatMap((row) => row.sessions)));
  }, [classroom, teacher, school, schools]);

  const scopeLabel = [school?.schoolName, teacher?.teacherName, classroom?.className].filter(Boolean).join(' ← ') || 'كل نطاق الإشراف';

  const setPeriodSafe = (value: PeriodFilter) => {
    if (value === 'custom' && (!customFrom || !customTo)) {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      setCustomFrom(dateValue(from));
      setCustomTo(dateValue(to));
    }
    setPeriod(value);
  };

  const openReport = async (sessionId: string) => {
    setReportLoading(true);
    setError('');
    try {
      const result = await api.getSupervisorClassroomReport(sessionId);
      setSelectedReport(result.report);
    } catch (err: any) {
      setError(err?.message || 'تعذر فتح تقرير الحصة.');
    } finally {
      setReportLoading(false);
    }
  };

  const exportExcel = () => {
    if (!selectedReport) return;
    const rows = (selectedReport.questions || []).map((question: any) => (
      `<tr><td>${String(question.text || '').replace(/[<>]/g, '')}</td><td>${Number(question.answered || 0)}</td><td>${Number(question.correct || 0)}</td><td>${Number(question.wrong || 0)}</td></tr>`
    )).join('');
    const blob = new Blob([
      `<table><thead><tr><th>السؤال</th><th>أجاب</th><th>صحيح</th><th>خطأ</th></tr></thead><tbody>${rows}</tbody></table>`,
    ], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart-classroom-${selectedReport.sessionId}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const weakSkills = analytics?.weakSkills || [];
  return (
    <section className="rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white p-4 shadow-sm sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-indigo-950">
            <Radio size={20} />
            تحليلات الحصص الذكية
          </h2>
          <p className="mt-1 text-sm text-indigo-800">
            ملخص زمني تنفيذي ثم تنقّل مباشر: المدرسة ← المعلم ← الفصل ← الحصة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(event) => setPeriodSafe(event.target.value as PeriodFilter)}
            className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-950"
            aria-label="الفترة الزمنية"
          >
            <option value="today">اليوم</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يومًا</option>
            <option value="all">كامل السجل</option>
            <option value="custom">فترة مخصصة</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-black text-indigo-700 disabled:opacity-50"
          >
            <RefreshCw size={15} className={`ml-1 inline ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {period === 'custom' && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-white p-3">
          <label className="text-xs font-bold text-slate-600">من <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="mr-2 rounded-lg border border-slate-200 px-2 py-1.5" /></label>
          <label className="text-xs font-bold text-slate-600">إلى <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="mr-2 rounded-lg border border-slate-200 px-2 py-1.5" /></label>
        </div>
      )}

      {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      {loading && !analytics ? (
        <div className="mt-5 rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500">جارٍ تجهيز التحليلات…</div>
      ) : analytics ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
            <span>{scopeLabel}</span>
            <span>{period === 'month' ? 'آخر 30 يومًا' : period === 'week' ? 'آخر 7 أيام' : period === 'today' ? 'اليوم' : period === 'all' ? 'كامل السجل' : `${customFrom} — ${customTo}`}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="الحصص" value={summary.sessions} hint="جلسات محفوظة ضمن النطاق" />
            <KpiCard label="المشاركة" value={percent(summary.participationRate)} hint={`${summary.participants}/${summary.expected} مشاركات متوقعة`} />
            <KpiCard label="متوسط الدقة" value={percent(summary.accuracy)} hint="من الإجابات الفعلية المحفوظة" />
            <KpiCard label="الإجابات" value={summary.responses} hint="إجمالي الاستجابات في الفترة" />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <label className="text-xs font-black text-slate-600">المدرسة
              <div className="relative mt-1">
                <select value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setTeacherId('all'); setClassId('all'); }} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-8">
                  <option value="all">كل المدارس</option>
                  {schools.map((item) => <option key={item.schoolId} value={item.schoolId}>{item.schoolName}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute left-2 top-3 text-slate-400" />
              </div>
            </label>
            <label className="text-xs font-black text-slate-600">المعلم
              <div className="relative mt-1">
                <select value={teacherId} disabled={!school} onChange={(event) => { setTeacherId(event.target.value); setClassId('all'); }} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-8 disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="all">{school ? 'كل معلمي المدرسة' : 'اختر مدرسة أولًا'}</option>
                  {teachers.map((item) => <option key={item.teacherId} value={item.teacherId}>{item.teacherName}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute left-2 top-3 text-slate-400" />
              </div>
            </label>
            <label className="text-xs font-black text-slate-600">الفصل
              <div className="relative mt-1">
                <select value={classId} disabled={!teacher} onChange={(event) => setClassId(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-8 disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="all">{teacher ? 'كل فصول المعلم' : 'اختر معلمًا أولًا'}</option>
                  {classes.map((item) => <option key={item.classId} value={item.classId}>{item.className}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute left-2 top-3 text-slate-400" />
              </div>
            </label>
          </div>

          {weakSkills.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex items-center gap-2 text-amber-900">
                <Target size={17} />
                <h3 className="text-sm font-black">أضعف المهارات في الفترة</h3>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {weakSkills.slice(0, 6).map((skill) => (
                  <div key={skill.skillId} className="rounded-xl bg-white p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-800">{skill.skillId}</span>
                      <span className="font-black text-rose-600">{percent(skill.accuracy)}</span>
                    </div>
                    <p className="mt-1 text-slate-500">{skill.answered} إجابة · {skill.sessions} حصص</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SmartClassroomSupervisorSignals
            schools={schools}
            selectedSchoolId={schoolId}
            selectedTeacherId={teacherId}
            leastParticipation={analytics.studentSignals?.leastParticipation || []}
            mostImproved={analytics.studentSignals?.mostImproved || []}
          />

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-600" />
                <h3 className="font-black text-slate-950">الحصص في النطاق الحالي</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">{sessions.length} حصة</span>
            </div>
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">لا توجد حصص محفوظة مطابقة للفترة والنطاق.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <button key={session.sessionId} type="button" onClick={() => void openReport(session.sessionId)} className="flex w-full flex-col gap-2 p-4 text-right transition hover:bg-indigo-50/50 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-black text-slate-900">{session.className || 'فصل'}</div>
                      <div className="mt-1 text-xs text-slate-500">{session.subjectName || 'بدون مادة'} · {session.endedAt ? new Date(session.endedAt).toLocaleString('ar-SA') : '—'}</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                      <span className="inline-flex items-center gap-1"><Users size={14} /> {session.joined}/{session.expected}</span>
                      <span>{percent(session.accuracy)}</span>
                      <span>{session.responses} إجابة</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {schools.length > 0 && (
            <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex items-center gap-2"><Building2 size={18} className="text-indigo-600" /><h3 className="font-black">ملخص المدارس</h3></div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {schools.map((item) => (
                  <button key={item.schoolId} type="button" onClick={() => { setSchoolId(item.schoolId); setTeacherId('all'); setClassId('all'); }} className="rounded-xl border border-slate-100 p-3 text-right hover:border-indigo-200 hover:bg-indigo-50/40">
                    <div className="font-black text-slate-900">{item.schoolName}</div>
                    <p className="mt-1 text-xs text-slate-500">{item.summary.sessions} حصص · مشاركة {percent(item.summary.participationRate)} · دقة {percent(item.summary.accuracy)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">تقرير الحصة</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedReport.className || selectedReport.classId} · {selectedReport.subjectName || '—'}</p>
              </div>
              <button type="button" onClick={() => setSelectedReport(null)} className="rounded-xl border border-slate-200 p-2"><X size={18} /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard label="المتوقع" value={selectedReport.roster?.expected ?? 0} hint="طلاب الفصل" />
              <KpiCard label="المنضم" value={selectedReport.roster?.joined ?? 0} hint="حضروا الحصة" />
              <KpiCard label="الإجابات" value={selectedReport.totals?.responses ?? 0} hint="إجمالي الاستجابات" />
              <KpiCard label="الدقة" value={percent(selectedReport.totals?.responses ? Math.round(((selectedReport.totals?.correct || 0) / selectedReport.totals.responses) * 100) : null)} hint="الإجابات الصحيحة" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 print:hidden">
              <button type="button" onClick={exportExcel} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white"><Download size={15} className="ml-1 inline" />Excel</button>
              <button type="button" onClick={() => window.print()} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-black text-white"><Printer size={15} className="ml-1 inline" />PDF</button>
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full min-w-[620px] text-right text-sm">
                <thead className="bg-slate-50"><tr><th className="p-3">السؤال</th><th className="p-3">أجاب</th><th className="p-3">صحيح</th><th className="p-3">خطأ</th><th className="p-3">غير مجاب</th></tr></thead>
                <tbody>{(selectedReport.questions || []).map((question: any) => <tr key={question.questionId} className="border-t border-slate-100"><td className="p-3">{question.text}</td><td className="p-3">{question.answered}</td><td className="p-3">{question.correct}</td><td className="p-3">{question.wrong}</td><td className="p-3">{question.unanswered}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {reportLoading && <div className="fixed bottom-4 left-4 z-50 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">جارٍ فتح التقرير…</div>}
    </section>
  );
};
