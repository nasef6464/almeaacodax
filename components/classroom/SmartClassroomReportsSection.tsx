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

/**
 * Compatibility input type for canonical and legacy server-side report snapshots.
 * The reports screen never reads localStorage; every server payload is normalized
 * into CanonicalClassroomReport before it is displayed or analyzed.
 */
export interface ClassroomSavedReport {
  sessionId: string;
  schoolId: string;
  classId: string;
  className?: string;
  subjectName?: string;
  subject?: string;
  day?: string;
  period?: number | string | null;
  teacherId?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string | null;
  participantCount?: number;
  responseCount?: number;
  correctCount?: number;
  roster?: {
    expected: number;
    joined: number;
    absentFromSession: number;
  };
  totals?: {
    responses: number;
    correct: number;
  };
  questions?: Array<{
    index?: number;
    questionId: string;
    text: string;
    options?: string[];
    skillIds?: string[];
    skillId?: string;
    skillName?: string;
    pathId?: string;
    sectionId?: string;
    subject?: string;
    answered?: number;
    answeredCount?: number;
    correct?: number;
    correctCount?: number;
    wrong?: number;
    unanswered?: number;
    isChallenge?: boolean;
  }>;
}

type CanonicalQuestionReport = {
  index: number;
  questionId: string;
  text: string;
  skillIds: string[];
  pathId?: string;
  sectionId?: string;
  subject?: string;
  answered: number;
  correct: number;
  wrong: number;
  unanswered: number;
};

type CanonicalClassroomReport = {
  sessionId: string;
  schoolId: string;
  classId: string;
  className: string;
  subjectName: string;
  day: string;
  period: number | null;
  teacherId?: string;
  status: string;
  startedAt?: string;
  endedAt: string | null;
  roster: { expected: number; joined: number; absentFromSession: number };
  totals: { responses: number; correct: number };
  questions: CanonicalQuestionReport[];
};

interface SmartClassroomReportsSectionProps {
  schoolId: string;
  assignments: Array<{ assignmentId: string; classId: string; className: string; subjectId?: string }>;
  smartClassroomEnabled: boolean;
  onPrepareIntervention?: (skillId: string) => void;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month';
type SkillDiagnostic = {
  skillId: string;
  skillName: string;
  totalAnswered: number;
  correct: number;
  sessions: Set<string>;
  accuracy: number | null;
  isWeak: boolean;
};

const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeReport = (raw: ClassroomSavedReport): CanonicalClassroomReport => {
  const joined = raw.roster?.joined ?? raw.participantCount ?? 0;
  const expected = raw.roster?.expected ?? joined;
  const responses = raw.totals?.responses ?? raw.responseCount ?? 0;
  const correct = raw.totals?.correct ?? raw.correctCount ?? 0;
  const questions = (raw.questions || []).map((question, index): CanonicalQuestionReport => {
    const answered = question.answered ?? question.answeredCount ?? 0;
    const questionCorrect = question.correct ?? question.correctCount ?? 0;
    const skillIds = question.skillIds?.filter(Boolean) || (question.skillId ? [question.skillId] : []);
    return {
      index: question.index ?? index,
      questionId: question.questionId,
      text: question.text,
      skillIds,
      pathId: question.pathId,
      sectionId: question.sectionId,
      subject: question.subject,
      answered,
      correct: questionCorrect,
      wrong: question.wrong ?? Math.max(0, answered - questionCorrect),
      unanswered: question.unanswered ?? Math.max(0, joined - answered),
    };
  });
  const periodNumber = raw.period === null || raw.period === undefined || raw.period === '' ? null : toNumber(raw.period, 0) || null;
  return {
    sessionId: raw.sessionId,
    schoolId: raw.schoolId,
    classId: raw.classId,
    className: raw.className || '',
    subjectName: raw.subjectName || raw.subject || '',
    day: raw.day || '',
    period: periodNumber,
    teacherId: raw.teacherId,
    status: raw.status || 'ended',
    startedAt: raw.startedAt,
    endedAt: raw.endedAt || null,
    roster: {
      expected,
      joined,
      absentFromSession: raw.roster?.absentFromSession ?? Math.max(0, expected - joined),
    },
    totals: { responses, correct },
    questions,
  };
};

const isWithinPeriod = (endedAt: string | null | undefined, filter: TimeFilter) => {
  if (filter === 'all') return true;
  if (!endedAt) return false;
  const ended = new Date(endedAt);
  if (Number.isNaN(ended.getTime())) return false;
  if (filter === 'today') return ended.toDateString() === new Date().toDateString();
  const age = Date.now() - ended.getTime();
  if (filter === 'week') return age <= 7 * 24 * 60 * 60 * 1000;
  return age <= 30 * 24 * 60 * 60 * 1000;
};

export const SmartClassroomReportsSection: React.FC<SmartClassroomReportsSectionProps> = ({
  schoolId,
  assignments,
  smartClassroomEnabled,
  onPrepareIntervention,
}) => {
  const [reports, setReports] = useState<CanonicalClassroomReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CanonicalClassroomReport | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
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
        .map((session) => normalizeReport(session as ClassroomSavedReport))
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

  const filteredReports = useMemo(
    () => reports.filter((report) => {
      if (selectedClassFilter !== 'all' && report.classId !== selectedClassFilter) return false;
      return isWithinPeriod(report.endedAt, timeFilter);
    }),
    [reports, selectedClassFilter, timeFilter],
  );

  const totalSessions = filteredReports.length;
  const totalParticipants = filteredReports.reduce((sum, report) => sum + report.roster.joined, 0);
  const totalResponses = filteredReports.reduce((sum, report) => sum + report.totals.responses, 0);
  const totalCorrect = filteredReports.reduce((sum, report) => sum + report.totals.correct, 0);
  const overallAccuracy = totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : null;

  const skillDiagnostics = useMemo(() => {
    const map = new Map<string, Omit<SkillDiagnostic, 'accuracy' | 'isWeak'>>();
    for (const report of filteredReports) {
      for (const question of report.questions) {
        const skillIds = Array.from(new Set(question.skillIds.filter(Boolean)));
        const keys = skillIds.length > 0 ? skillIds : (question.subject ? [`subject:${question.subject}`] : []);
        for (const key of keys) {
          const current = map.get(key) || {
            skillId: key,
            skillName: key.startsWith('subject:') ? key.slice('subject:'.length) : key,
            totalAnswered: 0,
            correct: 0,
            sessions: new Set<string>(),
          };
          current.totalAnswered += question.answered;
          current.correct += question.correct;
          current.sessions.add(report.sessionId);
          map.set(key, current);
        }
      }
    }
    return Array.from(map.values())
      .map((entry): SkillDiagnostic => {
        const accuracy = entry.totalAnswered > 0 ? Math.round((entry.correct / entry.totalAnswered) * 100) : null;
        return { ...entry, accuracy, isWeak: accuracy !== null && accuracy < 65 };
      })
      .filter((entry) => entry.accuracy !== null)
      .sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101));
  }, [filteredReports]);

  const weakSkills = skillDiagnostics.filter((skill) => skill.isWeak);

  const exportExcel = (report: CanonicalClassroomReport) => {
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
          <tr><th>#</th><th>السؤال</th><th>المهارات</th><th>الإجابات</th><th>الصحيح</th><th>الخطأ</th></tr>
        </thead>
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
            <select value={selectedClassFilter} onChange={(event) => setSelectedClassFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
              <option value="all">جميع الفصول</option>
              {assignments.map((assignment) => <option key={assignment.classId} value={assignment.classId}>{assignment.className}</option>)}
            </select>
          )}
          <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
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
              <div><div className="text-sm font-black text-slate-900 dark:text-white">{report.className || report.classId}</div><div className="mt-1 text-xs text-slate-500">{report.subjectName || '—'} · {report.day || '—'}{report.period ? ` · الحصة ${report.period}` : ''}</div></div>
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
            <div className="mt-5 grid grid-cols-3 gap-3"><Kpi label="الحضور" value={`${selectedReport.roster.joined}/${selectedReport.roster.expected}`} /><Kpi label="الإجابات" value={selectedReport.totals.responses} /><Kpi label="الصحيح" value={selectedReport.totals.correct} /></div>
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
