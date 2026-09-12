import React from 'react';
import { Download, Printer, X } from 'lucide-react';

interface ClassroomSavedReport {
  sessionId: string;
  schoolId: string;
  classId: string;
  className?: string;
  subject?: string;
  day?: string;
  period?: string;
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
    skillId?: string;
    skillName?: string;
    subject?: string;
  }>;
}

interface SmartClassroomReportModalProps {
  report: ClassroomSavedReport;
  onClose: () => void;
}

const exportExcel = (report: ClassroomSavedReport) => {
  const questionsRows = (report.questions || [])
    .map(
      (q, idx) => `
      <tr>
        <td>سؤال ${idx + 1}</td>
        <td>${q.text}</td>
        <td>${q.skillName || q.skillId || 'عام'}</td>
        <td>${q.isChallenge ? 'سؤال تحدي ⚡' : 'عادي'}</td>
        <td>${q.answeredCount || 0}</td>
        <td>${q.correctCount || 0}</td>
      </tr>
    `,
    )
    .join('');

  const html = `
    <table border="1">
      <thead>
        <tr>
          <th colspan="6">تقرير الحصة الذكية - ${report.className || report.classId} (${report.day || ''} ${report.period ? `الحصة ${report.period}` : ''} - ${new Date(report.endedAt).toLocaleDateString('ar-SA')})</th>
        </tr>
        <tr>
          <th>رقم السؤال</th><th>نص السؤال</th><th>المهارة المستهدفة</th><th>النوع</th><th>عدد الإجابات</th><th>الإجابات الصحيحة</th>
        </tr>
      </thead>
      <tbody>${questionsRows}</tbody>
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

export const SmartClassroomReportModal: React.FC<SmartClassroomReportModalProps> = ({ report, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            تقرير الحصة الذكية - {report.className || report.classId}
          </h3>
          <p className="text-xs text-slate-500">
            {report.day ? `${report.day} · ` : ''}
            {report.period ? `الحصة ${report.period} · ` : ''}
            انتهت بتاريخ: {new Date(report.endedAt).toLocaleString('ar-SA')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
          <span className="text-xs text-slate-500">الطلاب المنضمون</span>
          <div className="text-xl font-black">{report.participantCount}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800">
          <span className="text-xs text-slate-500">إجمالي الإجابات</span>
          <div className="text-xl font-black">{report.responseCount}</div>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
          <span className="text-xs text-emerald-800 dark:text-emerald-300">نسبة الإتقان العامة</span>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
            {report.responseCount > 0
              ? `${Math.round((report.correctCount / report.responseCount) * 100)}%`
              : '—'}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">تحليل أسئلة ومهارات الحصة:</h4>
        <div className="mt-3 space-y-2">
          {(report.questions || []).map((question, idx) => {
            const questionAccuracy = question.answeredCount
              ? Math.round(((question.correctCount || 0) / question.answeredCount) * 100)
              : null;
            return (
              <div
                key={question.questionId || idx}
                className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <b>سؤال {idx + 1}:</b> {question.text}
                    {question.isChallenge && (
                      <span className="rounded-sm bg-amber-100 px-1 py-0.2 text-[10px] text-amber-800">⚡ تحدي سريع</span>
                    )}
                  </span>
                  <span className="text-emerald-700 font-black">{questionAccuracy !== null ? `${questionAccuracy}%` : '—'}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-4 text-slate-500 text-[11px]">
                  <span>المهارة: {question.skillName || question.skillId || 'تحليل وحل مشكلات'}</span>
                  <span>المجيبون: {question.answeredCount ?? '—'}</span>
                  <span>الصحيح: {question.correctCount ?? '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={() => exportExcel(report)}
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
);
