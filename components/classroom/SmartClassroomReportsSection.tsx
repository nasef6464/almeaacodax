import React, { useEffect, useState } from 'react';
import { Award, BookOpenCheck, CheckCircle2, ChevronLeft, Download, FileSpreadsheet, Presentation, Printer, Users, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ClassroomSavedReport {
  sessionId: string;
  schoolId: string;
  classId: string;
  className?: string;
  participantCount: number;
  responseCount: number;
  correctCount: number;
  endedAt: string;
  questions?: Array<{
    questionId: string;
    text: string;
    options: string[];
    answeredCount?: number;
    correctCount?: number;
    isChallenge?: boolean;
  }>;
}

interface SmartClassroomReportsSectionProps {
  schoolId: string;
  assignments: Array<{ assignmentId: string; classId: string; className: string; subjectId?: string }>;
  smartClassroomEnabled: boolean;
}

export const SmartClassroomReportsSection: React.FC<SmartClassroomReportsSectionProps> = ({
  schoolId,
  assignments,
  smartClassroomEnabled,
}) => {
  const [reports, setReports] = useState<ClassroomSavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ClassroomSavedReport | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`smart_classroom_reports_${schoolId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setReports(parsed);
      }
    } catch {
      // safe fallback
    }
  }, [schoolId]);

  const totalSessions = reports.length;
  const totalParticipants = reports.reduce((acc, r) => acc + (r.participantCount || 0), 0);
  const totalResponses = reports.reduce((acc, r) => acc + (r.responseCount || 0), 0);
  const totalCorrect = reports.reduce((acc, r) => acc + (r.correctCount || 0), 0);
  const overallAccuracy = totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : null;

  const exportExcel = (report: ClassroomSavedReport) => {
    const questionsRows = (report.questions || []).map((q, idx) => `
      <tr>
        <td>سؤال ${idx + 1}</td>
        <td>${q.text}</td>
        <td>${q.isChallenge ? 'سؤال تحدي ⚡' : 'عادي'}</td>
        <td>${q.answeredCount || 0}</td>
        <td>${q.correctCount || 0}</td>
      </tr>
    `).join('');

    const html = `
      <table border="1">
        <thead>
          <tr>
            <th colspan="5">تقرير الحصة الذكية - ${report.className || report.classId} (${new Date(report.endedAt).toLocaleDateString('ar-SA')})</th>
          </tr>
          <tr>
            <th>رقم السؤال</th><th>نص السؤال</th><th>النوع</th><th>عدد الإجابات</th><th>الإجابات الصحيحة</th>
          </tr>
        </thead>
        <tbody>${questionsRows}</tbody>
      </table>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom-report-${report.sessionId}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
            <Presentation className="text-indigo-600" size={22} />
            سجل وتقارير الحصص الذكية
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            أرشيف الحصص التفاعلية، وتحليلات دقة إجابات الفصول والتحديات المباشرة
          </p>
        </div>

        {smartClassroomEnabled && assignments.length > 0 && (
          <Link
            to={`/classroom/teacher?schoolId=${encodeURIComponent(schoolId)}&classId=${encodeURIComponent(assignments[0]?.classId || '')}`}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
          >
            <Zap size={16} /> بدء حصة ذكية جديدة
          </Link>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-indigo-50/50 p-4 text-center dark:bg-indigo-950/20">
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">إجمالي الحصص</span>
          <div className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-100">{totalSessions}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50/50 p-4 text-center dark:bg-emerald-950/20">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">الطلاب المشاركون</span>
          <div className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-100">{totalParticipants}</div>
        </div>
        <div className="rounded-2xl bg-amber-50/50 p-4 text-center dark:bg-amber-950/20">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">الإجابات المنجزة</span>
          <div className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-100">{totalResponses}</div>
        </div>
        <div className="rounded-2xl bg-purple-50/50 p-4 text-center dark:bg-purple-950/20">
          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">متوسط دقة الفصول</span>
          <div className="mt-1 text-2xl font-black text-purple-900 dark:text-purple-100">
            {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="mt-6">
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
            <Presentation size={32} className="mx-auto text-slate-400 opacity-60" />
            <p className="mt-3 font-bold">لا توجد تقارير حصص ذكية مسجلة بعد.</p>
            <p className="mt-1 text-xs text-slate-400">عند الانتهاء من أي حصة تفاعلية سيتم أرشفة نتائج الطلاب وتحليلات المهارات هنا تلقائياً.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const accuracy = report.responseCount > 0 ? Math.round((report.correctCount / report.responseCount) * 100) : null;
              return (
                <div
                  key={report.sessionId}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs transition-all hover:border-indigo-200 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">
                        {report.className || `فصل ${report.classId.slice(-4)}`}
                      </span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {report.participantCount} طالب مشارك
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      تاريخ الحصة: {new Date(report.endedAt).toLocaleDateString('ar-SA')} · {new Date(report.endedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <span className="text-xs text-slate-500">نسبة الدقة</span>
                      <div className="font-black text-emerald-600">{accuracy !== null ? `${accuracy}%` : '—'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100"
                    >
                      عرض التقرير
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  تقرير الحصة الذكية - {selectedReport.className || selectedReport.classId}
                </h3>
                <p className="text-xs text-slate-500">
                  انتهت بتاريخ: {new Date(selectedReport.endedAt).toLocaleString('ar-SA')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                <span className="text-xs text-slate-500">الطلاب المنضمون</span>
                <div className="text-xl font-black">{selectedReport.participantCount}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
                <span className="text-xs text-slate-500">إجمالي الإجابات</span>
                <div className="text-xl font-black">{selectedReport.responseCount}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
                <span className="text-xs text-emerald-800 dark:text-emerald-300">نسبة الإتقان العامة</span>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {selectedReport.responseCount > 0 ? `${Math.round((selectedReport.correctCount / selectedReport.responseCount) * 100)}%` : '—'}
                </div>
              </div>
            </div>

            {/* Questions Breakdown */}
            <div className="mt-5">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">تحليل الأسئلة المطروحة بالحصة:</h4>
              <div className="mt-3 space-y-2">
                {(selectedReport.questions || []).map((q, idx) => {
                  const qAccuracy = q.answeredCount ? Math.round(((q.correctCount || 0) / q.answeredCount) * 100) : null;
                  return (
                    <div key={q.questionId || idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <b>سؤال {idx + 1}:</b> {q.text}
                          {q.isChallenge && <span className="rounded-sm bg-amber-100 px-1 py-0.2 text-[10px] text-amber-800">⚡ تحدي</span>}
                        </span>
                        <span className="text-emerald-700 font-black">{qAccuracy !== null ? `${qAccuracy}%` : '—'}</span>
                      </div>
                      <div className="mt-1.5 flex gap-4 text-slate-500 text-[11px]">
                        <span>المجيبون: {q.answeredCount ?? '—'}</span>
                        <span>الصحيح: {q.correctCount ?? '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => exportExcel(selectedReport)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700"
              >
                <Download size={14} /> تصدير Excel
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-black text-white hover:bg-slate-900"
              >
                <Printer size={14} /> طباعة التقرير
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
