import React from 'react';
import {
    CheckCircle,
    Clipboard,
    Download,
    Edit2,
    Printer,
    ShieldCheck,
    Trash2,
} from 'lucide-react';

type SaveVerificationState = 'idle' | 'saving' | 'verifying' | 'success' | 'error' | null;

interface SchoolWorkspaceControlsPanelProps {
    schoolName: string;
    activeTabLabel?: string;
    saveVerificationState: SaveVerificationState;
    saveVerificationButtonLabel: string;
    isSchoolWorkspaceBusy: boolean;
    isDeleteConfirmOpen: boolean;
    classCount: number;
    studentCount: number;
    supervisorCount: number;
    packageCount: number;
    codeCount: number;
    readinessScore: number;
    readinessTotal: number;
    isDeletePending: boolean;
    onBack: () => void;
    onSaveAndVerify: () => void;
    onRename: () => void;
    onDownloadHandover: () => void;
    onCopyHandover: () => void;
    onPrintReport: () => void;
    onRequestDelete: () => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
}

export const SchoolWorkspaceControlsPanel: React.FC<SchoolWorkspaceControlsPanelProps> = ({
    schoolName,
    activeTabLabel,
    saveVerificationState,
    saveVerificationButtonLabel,
    isSchoolWorkspaceBusy,
    isDeleteConfirmOpen,
    classCount,
    studentCount,
    supervisorCount,
    packageCount,
    codeCount,
    readinessScore,
    readinessTotal,
    isDeletePending,
    onBack,
    onSaveAndVerify,
    onRename,
    onDownloadHandover,
    onCopyHandover,
    onPrintReport,
    onRequestDelete,
    onCancelDelete,
    onConfirmDelete,
}) => {
    const deleteImpactRows: Array<[string, string | number]> = [
        ['فصول', classCount],
        ['طلاب', studentCount],
        ['مشرفون', supervisorCount],
        ['باقات', packageCount],
        ['أكواد', codeCount],
        ['جاهزية', `${readinessScore}/${readinessTotal}`],
    ];
    const currentTabLabel = activeTabLabel || 'نظرة عامة والجاهزية';
    const readinessLabel = readinessTotal > 0 ? `${readinessScore}/${readinessTotal}` : '—';

    return (
        <>
            <section
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs"
                data-testid="school-workspace-controls-panel"
            >
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <nav className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500" aria-label="مسار مساحة المدرسة">
                            <span>لوحة الإدارة</span>
                            <span className="text-slate-300">/</span>
                            <button
                                type="button"
                                onClick={onBack}
                                className="cursor-pointer transition-colors hover:text-indigo-700"
                            >
                                تشغيل المدارس
                            </button>
                            <span className="text-slate-300">/</span>
                            <span className="font-black text-slate-700">{schoolName}</span>
                        </nav>
                        <button
                            type="button"
                            data-testid="school-back-to-portfolio-button"
                            onClick={onBack}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                            <span>&rarr;</span>
                            <span>كل المدارس</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-5 p-5 md:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-center gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-xl text-white shadow-xs">
                                🏫
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="truncate text-xl font-black tracking-tight text-slate-900 md:text-2xl">
                                        {schoolName}
                                    </h1>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">
                                        <ShieldCheck size={12} />
                                        جاهزية {readinessLabel}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                    {currentTabLabel}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                data-testid="school-save-verify-button"
                                onClick={onSaveAndVerify}
                                disabled={isSchoolWorkspaceBusy}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                                    saveVerificationState === 'error'
                                        ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                        : saveVerificationState === 'success'
                                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                            : 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                                title="حفظ ثم إعادة قراءة بيانات المدرسة من الخادم للتأكد"
                            >
                                <CheckCircle size={15} />
                                {saveVerificationButtonLabel}
                            </button>
                            <button
                                type="button"
                                data-testid="school-edit-name-button"
                                onClick={onRename}
                                disabled={isSchoolWorkspaceBusy}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                title="تعديل اسم المدرسة"
                            >
                                <Edit2 size={14} />
                                تعديل الاسم
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="ml-1 text-[11px] font-black text-slate-400">التقارير والتسليم</span>
                            <button
                                type="button"
                                data-testid="school-handover-workbook-button"
                                onClick={onDownloadHandover}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
                                title="تحميل ملف تسليم شامل للمدرسة"
                            >
                                <Download size={14} />
                                ملف التسليم
                            </button>
                            <button
                                type="button"
                                data-testid="school-copy-handover-button"
                                onClick={onCopyHandover}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-800 transition-colors hover:bg-sky-100"
                                title="نسخ رسالة جاهزة لإرسالها لإدارة المدرسة"
                            >
                                <Clipboard size={14} />
                                نسخ رسالة التسليم
                            </button>
                            <button
                                type="button"
                                data-testid="school-print-report-button"
                                onClick={onPrintReport}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                title="طباعة تقرير جاهزية وتشغيل المدرسة"
                            >
                                <Printer size={14} />
                                طباعة التقرير
                            </button>
                        </div>

                        <button
                            type="button"
                            data-testid="school-delete-button"
                            onClick={onRequestDelete}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-black text-red-700 transition-colors hover:bg-red-50"
                            title="فتح مراجعة أثر حذف المدرسة"
                        >
                            <Trash2 size={14} />
                            منطقة الحذف
                        </button>
                    </div>
                </div>
            </section>

            {isDeleteConfirmOpen && (
                <div data-testid="school-delete-confirm-panel" className="rounded-2xl border border-red-200 bg-red-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-red-700">
                                <Trash2 size={14} />
                                تأكيد حذف مدرسة
                            </div>
                            <h3 className="mt-3 text-lg font-black text-gray-900">راجع الأثر قبل حذف {schoolName}</h3>
                            <p className="mt-1 text-sm font-bold leading-6 text-red-800">
                                الحذف يزيل المدرسة من هذه القائمة ويفصل نطاقها التشغيلي. استخدمه للتنظيف فقط عندما تكون متأكدًا أن المدرسة ليست عقدًا نشطًا.
                            </p>
                        </div>
                        <div className="grid min-w-[280px] grid-cols-2 gap-2 text-center">
                            {deleteImpactRows.map(([label, value]) => (
                                <div key={label} className="rounded-xl bg-white px-3 py-2">
                                    <div className="text-lg font-black text-gray-900">{value}</div>
                                    <div className="text-[11px] font-black text-gray-500">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            data-testid="school-delete-cancel"
                            onClick={onCancelDelete}
                            className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition-colors hover:bg-gray-100"
                        >
                            إلغاء والعودة للإدارة
                        </button>
                        <button
                            type="button"
                            data-testid="school-delete-confirm"
                            onClick={onConfirmDelete}
                            disabled={isDeletePending}
                            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            حذف المدرسة نهائيًا
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
