import React from 'react';
import { Download, FileSpreadsheet, Printer, ShieldCheck } from 'lucide-react';
import type { SchoolWorkspaceReadinessCheck, SchoolWorkspaceTab } from './workspaceViewModel';

interface SchoolHandoverReportSummaryProps {
    readinessScore: number;
    readinessTotal: number;
    readinessStatusLabel: string;
    readinessNextStep: string;
    readinessPercent: number;
    schoolClassCount: number;
    schoolStudentCount: number;
    schoolSupervisorCount: number;
    activePackageCount: number;
    activeCodeCount: number;
    handoverBlockingGaps: SchoolWorkspaceReadinessCheck[];
    onNavigateTab: (tab: SchoolWorkspaceTab) => void;
    downloadSchoolHandover: () => void;
    downloadSchoolGapReport: () => void;
    printSchoolReport: () => void;
}

export const SchoolHandoverReportSummary: React.FC<SchoolHandoverReportSummaryProps> = ({
    readinessScore,
    readinessTotal,
    readinessStatusLabel,
    readinessNextStep,
    readinessPercent,
    schoolClassCount,
    schoolStudentCount,
    schoolSupervisorCount,
    activePackageCount,
    activeCodeCount,
    handoverBlockingGaps,
    onNavigateTab,
    downloadSchoolHandover,
    downloadSchoolGapReport,
    printSchoolReport,
}) => (
    <div data-testid="school-handover-report-summary" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                    readinessScore === readinessTotal
                        ? 'bg-emerald-50 text-emerald-700'
                        : readinessScore >= 3
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                }`}>
                    <ShieldCheck size={14} />
                    {readinessStatusLabel}
                </div>
                <h3 className="mt-3 text-xl font-black text-gray-900">قرار تسليم المدرسة</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-gray-600">{readinessNextStep}</p>
                <div data-testid="school-handover-readiness-progress" className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                        className={`h-full rounded-full ${
                            readinessScore === readinessTotal
                                ? 'bg-emerald-500'
                                : readinessScore >= 3
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                        }`}
                        style={{ width: `${readinessPercent}%` }}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-black text-gray-500">
                    <span>جاهزية التشغيل</span>
                    <span>{readinessScore}/{readinessTotal}</span>
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                    type="button"
                    data-testid="school-report-download-handover"
                    onClick={downloadSchoolHandover}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800"
                >
                    <Download size={16} />
                    ملف التسليم
                </button>
                <button
                    type="button"
                    data-testid="school-report-download-gaps"
                    onClick={downloadSchoolGapReport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition-colors hover:bg-amber-100"
                >
                    <FileSpreadsheet size={16} />
                    فجوات الجاهزية
                </button>
                <button
                    type="button"
                    data-testid="school-report-print-readiness"
                    onClick={printSchoolReport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                    <Printer size={16} />
                    طباعة تقرير التسليم
                </button>
            </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
                ['نطاق المدرسة', `${schoolClassCount} فصل / ${schoolStudentCount} طالب`],
                ['المشرفون', `${schoolSupervisorCount} مشرف`],
                ['الوصول', `${activePackageCount} باقة / ${activeCodeCount} كود`],
            ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="text-xs font-black text-gray-500">{label}</div>
                    <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
                </div>
            ))}
        </div>

        <div data-testid="school-handover-blocking-gaps" className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 className="text-sm font-black text-gray-900">نواقص تمنع التسليم</h4>
                    <p className="mt-1 text-xs font-bold leading-6 text-gray-500">
                        هذه القائمة هي قرار اليوم: أكمل البنود الناقصة فقط، ثم اطبع تقرير التسليم.
                    </p>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-black ${
                    handoverBlockingGaps.length === 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                }`}>
                    {handoverBlockingGaps.length === 0 ? 'لا توجد نواقص تشغيلية' : `${handoverBlockingGaps.length} بند يحتاج استكمال`}
                </span>
            </div>
            {handoverBlockingGaps.length === 0 ? (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-emerald-700">
                    المدرسة جاهزة للتسليم. استخدم ملف التسليم أو الطباعة لمشاركة النسخة النهائية مع الإدارة.
                </div>
            ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {handoverBlockingGaps.map((gap) => (
                        <div key={gap.label} className="flex flex-col gap-3 rounded-xl border border-white bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-sm font-black text-gray-900">{gap.label}</div>
                                <div className="mt-1 text-xs font-bold leading-6 text-gray-500">{gap.hint}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onNavigateTab(gap.tab)}
                                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gray-900 px-3 py-2 text-xs font-black text-white hover:bg-gray-800"
                            >
                                استكمال
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);
