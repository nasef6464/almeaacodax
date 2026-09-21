import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Presentation,
  RefreshCw,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  buildClassroomSkillDiagnostics,
  formatClassroomDuration,
  isClassroomReportWithinPeriod,
  normalizeClassroomReport,
  type CanonicalClassroomReport,
  type ClassroomReportTimeFilter,
  type ClassroomSavedReport,
} from './classroomReportViewModel';

interface SmartClassroomReportsSectionProps {
  schoolId: string;
  assignments: Array<{ assignmentId: string; classId: string; className: string; subjectId?: string }>;
  smartClassroomEnabled: boolean;
  onPrepareIntervention?: (skillId: string) => void;
}


export const SmartClassroomReportsSection: React.FC<SmartClassroomReportsSectionProps> = ({
  schoolId,
  assignments,
  smartClassroomEnabled,
  onPrepareIntervention,
}) => {
  const [reports, setReports] = useState<CanonicalClassroomReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CanonicalClassroomReport | null>(null);
  const [timeFilter, setTimeFilter] = useState<ClassroomReportTimeFilter>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [selectedPathFilter, setSelectedPathFilter] = useState('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReports = async () => {
    if (!schoolId || !smartClassroomEnabled) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getClassroomTeacherHistory(schoolId);
      const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
      const finalizedReports = sessions
        .map((session) => normalizeClassroomReport(session as ClassroomSavedReport))
        .filter((report) => report.status === 'ended' || report.status === 'archived' || Boolean(report.endedAt));
      setReports(finalizedReports);
    } catch (err: any) {
      setReports([]);
      setError(err?.message || 'تعذر تحميل تقارير الحصص من الخادم.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, smartClassroomEnabled]);

  const classAndTimeReports = useMemo(
    () => reports.filter((report) => {
      if (selectedClassFilter !== 'all' && report.classId !== selectedClassFilter) return false;
      return isClassroomReportWithinPeriod(report.endedAt, timeFilter);
    }),
    [reports, selectedClassFilter, timeFilter],
  );

  const pathOptions = useMemo(
    () => Array.from(new Set(
      classAndTimeReports.flatMap((report) => report.questions.map((question) => String(question.pathId || '')).filter(Boolean)),
    )).sort(),
    [classAndTimeReports],
  );

  const subjectOptions = useMemo(
    () => Array.from(new Set(
      classAndTimeReports.flatMap((report) => report.questions
        .filter((question) => selectedPathFilter === 'all' || String(question.pathId || '') === selectedPathFilter)
        .map((question) => String(question.subject || report.subjectName || ''))
        .filter(Boolean)),
    )).sort((left, right) => left.localeCompare(right, 'ar')),
    [classAndTimeReports, selectedPathFilter],
  );

  useEffect(() => {
    if (selectedSubjectFilter === 'all') return;
    if (!subjectOptions.includes(selectedSubjectFilter)) setSelectedSubjectFilter('all');
  }, [selectedSubjectFilter, subjectOptions]);

  const filteredReports = useMemo(
    () => classAndTimeReports.map((report) => ({
      ...report,
      questions: report.questions.filter((question) =>
        (selectedPathFilter === 'all' || String(question.pathId || '') === selectedPathFilter) &&
        (selectedSubjectFilter === 'all' || String(question.subject || report.subjectName || '') === selectedSubjectFilter),
      ),
    })).filter((report) => report.questions.length > 0),
    [classAndTimeReports, selectedPathFilter, selectedSubjectFilter],
  );

  const totalSessions = filteredReports.length;
  const totalParticipants = filteredReports.reduce((sum, report) => sum + report.roster.joined, 0);
  const totalResponses = filteredReports.reduce((sum, report) => sum + report.totals.responses, 0);
  const totalCorrect = filteredReports.reduce((sum, report) => sum + report.totals.correct, 0);
  const overallAccuracy = totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : null;

  const skillDiagnostics = useMemo(() => buildClassroomSkillDiagnostics(filteredReports), [filteredReports]);

  const weakSkills = skillDiagnostics.filter((skill) => skill.isWeak);

  const exportExcel = (report: CanonicalClassroomReport) => {
    const batchRows = report.batches.map((batch) => `
      <tr>
        <td>${batch.label}</td>
        <td>${batch.totals.questions}</td>
        <td>${batch.totals.answered}</td>
        <td>${batch.totals.correct}</td>
        <td>${batch.totals.wrong}</td>
        <td>${batch.totals.accuracy === null ? '—' : `${batch.totals.accuracy}%`}</td>
      </tr>
    `).join('');
    const rows = report.questions.map((question, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${question.text}</td>
        <td>${question.skillIds.join('، ') || question.subject || '—'}</td>
        <td>${question.answered}</td>
        <td>${question.correct}</td>
        <td>${question.wrong}</td>
      </tr>
    `).join('');
    const html = `
      <table border="1">
        <thead>
          <tr><th colspan="6">تقرير الحصة الذكية - ${report.className || report.classId}</th></tr>
          <tr><th>الدفعة</th><th>الأسئلة</th><th>الإجابات</th><th>الصحيح</th><th>الخطأ</th><th>الدقة</th></tr>
        </thead>
        <tbody>${batchRows}</tbody>
      </table>
      <br />
      <table border="1">
        <thead><tr><th>#</th><th>السؤال</th><th>المهارات</th><th>الإجابات</th><th>الصحيح</th><th>الخطأ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `classroom-report-${report.sessionId}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!smartClassroomEnabled) return null;

  return (
    <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900" dir="rtl">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white"><Presentation className="text-indigo-600" size={22} /> سجل وتقارير الحصص الذكية وتشخيص المهارات</h2>
          <p className="mt-1 text-xs text-slate-500">كل الأرقام أدناه تأتي من سجل الخادم وقاعدة البيانات فقط.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {assignments.length > 1 && (
            <select value={selectedClassFilter} onChange={(event) => {
              setSelectedClassFilter(event.target.value);
              setSelectedPathFilter('all');
              setSelectedSubjectFilter('all');
            }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
              <option value="all">جميع الفصول</option>
              {assignments.map((assignment) => <option key={assignment.classId} value={assignment.classId}>{assignment.className}</option>)}
            </select>
          )}
          <select value={selectedPathFilter} onChange={(event) => {
            setSelectedPathFilter(event.target.value);
            setSelectedSubjectFilter('all');
          }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            <option value="all">كل المسارات</option>
            {pathOptions.map((pathId) => <option key={pathId} value={pathId}>{pathId}</option>)}
          </select>
          <select value={selectedSubjectFilter} onChange={(event) => setSelectedSubjectFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            <option value="all">كل المواد</option>
            {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
                    <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as ClassroomReportTimeFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            <option value="all">كامل الفترة</option><option value="month">آخر شهر</option><option value="week">آخر أسبوع</option><option value="today">اليوم</option>
          </select>
          <button type="button" onClick={() => void loadReports()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-slate-700"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> تحديث</button>
        </div>
      </div>

      {error && <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="الحصص" value={totalSessions} />
        <Kpi label="المشاركون" value={totalParticipants} />
        <Kpi label="الإجابات" value={totalResponses} />
        <Kpi label="متوسط الإتقان" value={overallAccuracy === null ? '—' : `${overallAccuracy}%`} />
      </div>

      {skillDiagnostics.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Target size={18} className="text-rose-600" /><h3 className="text-sm font-black text-slate-900 dark:text-white">تشخيص المهارات من الإجابات الفعلية</h3></div>
            <span className="text-xs font-bold text-slate-500">{weakSkills.length} مهارة تحت 65%</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {skillDiagnostics.slice(0, 9).map((skill) => (
              <div key={skill.skillId} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2"><span className="text-xs font-black text-slate-900 dark:text-white">{skill.skillName}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${skill.isWeak ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{skill.accuracy}%</span></div>
                <p className="mt-2 text-[11px] text-slate-500">{skill.correct}/{skill.totalAnswered} صحيحة · {skill.sessions.size} حصة</p>
                {skill.isWeak && onPrepareIntervention && !skill.skillId.startsWith('subject:') && <button type="button" onClick={() => onPrepareIntervention(skill.skillId)} className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-rose-600"><Zap size={12} /> إعداد تدخل علاجي</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
        {loading && reports.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">جارٍ تحميل السجل من الخادم…</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8 text-center text-sm font-bold text-slate-500">لا توجد حصص مطابقة للفلاتر الحالية.</div>
        ) : filteredReports.map((report) => {
          const accuracy = report.totals.responses ? Math.round((report.totals.correct / report.totals.responses) * 100) : null;
          return (
            <button key={report.sessionId} type="button" onClick={() => setSelectedReport(report)} className="flex w-full items-center justify-between gap-4 border-b border-slate-100 p-4 text-right last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
              <div><div className="text-sm font-black text-slate-900 dark:text-white">{report.className || report.classId}</div><div className="mt-1 text-xs text-slate-500">{report.subjectName || '—'} · {report.day || '—'}{report.period ? ` · الحصة ${report.period}` : ''}{report.batches.length ? ` · ${report.batches.length} دفعات` : ''}</div></div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300"><span className="inline-flex items-center gap-1"><Users size={14} /> {report.roster.joined}/{report.roster.expected}</span><span className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> {accuracy === null ? '—' : `${accuracy}%`}</span></div>
            </button>
          );
        })}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedReport.className || selectedReport.classId}</h3><p className="mt-1 text-xs text-slate-500">{selectedReport.subjectName || '—'} · {selectedReport.questions.length} سؤال</p></div>
              <div className="flex items-center gap-2"><button type="button" onClick={() => exportExcel(selectedReport)} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"><Download size={14} /> Excel</button><button type="button" onClick={() => setSelectedReport(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Kpi label="الحضور" value={`${selectedReport.roster.joined}/${selectedReport.roster.expected}`} /><Kpi label="الإجابات" value={selectedReport.totals.responses} /><Kpi label="الصحيح" value={selectedReport.totals.correct} /><Kpi label="مدة الحصة" value={selectedReport.durationMinutes === null ? '—' : `${selectedReport.durationMinutes} د`} /></div>
            {selectedReport.batches.length > 0 && (
              <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950/40 dark:bg-indigo-950/20">
                <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200">تسلسل ونتائج دفعات الأسئلة</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedReport.batches.map((batch) => (
                    <div key={batch.batchId} className="rounded-xl border border-indigo-100 bg-white p-3 dark:border-indigo-900/50 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-black text-slate-900 dark:text-white">{batch.label}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${batch.totals.accuracy !== null && batch.totals.accuracy < 65 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{batch.totals.accuracy === null ? '—' : `${batch.totals.accuracy}%`}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">{batch.totals.questions} سؤال · {batch.totals.answered} إجابة · {batch.totals.correct} صحيحة</div>
                      <div className="mt-1 text-[11px] text-slate-500">المدة: {formatClassroomDuration(batch.durationSeconds)}{batch.startedAt ? ` · بدأت ${new Date(batch.startedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
                      {batch.skillIds.length > 0 && <div className="mt-2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">المهارات: {batch.skillIds.join('، ')}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 space-y-3">
              {selectedReport.questions.map((question) => <div key={question.questionId} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"><p className="text-sm font-black text-slate-900 dark:text-white">{question.index + 1}. {question.text}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500"><span>{question.answered} إجابة</span><span>{question.correct} صحيحة</span><span>{question.wrong} خاطئة</span>{question.skillIds.length > 0 && <span>المهارات: {question.skillIds.join('، ')}</span>}</div></div>)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const Kpi: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800/60"><div className="text-[11px] font-bold text-slate-500">{label}</div><div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{value}</div></div>
);
