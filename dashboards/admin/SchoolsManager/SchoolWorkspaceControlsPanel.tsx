import React from 'react';
import { CheckCircle, Clipboard, Download, Edit2, Printer, Trash2 } from 'lucide-react';

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
    schoolName, activeTabLabel, saveVerificationState, saveVerificationButtonLabel,
    isSchoolWorkspaceBusy, isDeleteConfirmOpen, classCount, studentCount, supervisorCount,
    packageCount, codeCount, readinessScore, readinessTotal, isDeletePending,
    onBack, onSaveAndVerify, onRename, onDownloadHandover, onCopyHandover, onPrintReport,
    onRequestDelete, onCancelDelete, onConfirmDelete,
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

    return (
        <>
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs" data-testid="school-workspace-controls-panel">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold flex-wrap">
                        <span>لوحة الإدارة</span>
                        <span className="text-slate-300">/</span>
                        <button type="button" onClick={onBack} className="hover:text-indigo-600 transition-colors cursor-pointer">تشغيل المدارس</button>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-700">{schoolName}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-indigo-600 font-black">{currentTabLabel}</span>
                    </div>
                    <button type="button" data-testid="school-back-to-portfolio-button" onClick={onBack} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs">
                        <span>&rarr;</span>
                        <span>عودة لقائمة المدارس</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-xs">🏫</div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{schoolName}</h1>
                                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">مرخص ونشط</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 font-medium flex items-center gap-2">
                                <span>القسم المفتوح:</span>
                                <span className="font-bold text-indigo-700">{currentTabLabel}</span>
                            </p>
                        </div>
                    </div>
                    <button type="button" data-testid="school-delete-button" onClick={onRequestDelete} className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200/80 px-3.5 py-2 text-xs font-black text-red-700 transition-colors shadow-2xs cursor-pointer" title="حذف المدرسة وفصلها عن الطلاب والمشرفين">
                        <Trash2 size={14} />
                        <span>حذف المدرسة</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" data-testid="school-save-verify-button" onClick={onSaveAndVerify} disabled={isSchoolWorkspaceBusy} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all shadow-2xs ${saveVerificationState === 'error' ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' : saveVerificationState === 'success' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-amber-500 hover:bg-amber-600 text-white'} disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer`} title="حفظ ثم إعادة قراءة بيانات المدرسة من الخادم للتأكد">
                            <CheckCircle size={15} />
                            {saveVerificationButtonLabel}
                        </button>
                        <button type="button" data-testid="school-edit-name-button" onClick={onRename} disabled={isSchoolWorkspaceBusy} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer" title="تعديل اسم المدرسة">
                            <Edit2 size={14} />
                            <span>تعديل الاسم</span>
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" data-testid="school-handover-workbook-button" onClick={onDownloadHandover} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-3.5 py-2 text-xs font-bold text-emerald-800 transition-colors cursor-pointer shadow-2xs" title="تحميل ملف تسليم شامل للمدرسة">
                            <Download size={14} />
                            <span>ملف تسليم المدرسة</span>
                        </button>
                        <button type="button" data-testid="school-copy-handover-button" onClick={onCopyHandover} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200/80 px-3.5 py-2 text-xs font-bold text-sky-800 transition-colors cursor-pointer shadow-2xs" title="نسخ رسالة جاهزة لإرسالها لإدارة المدرسة">
                            <Clipboard size={14} />
                            <span>نسخ رسالة التسليم</span>
                        </button>
                        <button type="button" data-testid="school-print-report-button" onClick={onPrintReport} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-3.5 py-2 text-xs font-bold text-indigo-800 transition-colors cursor-pointer shadow-2xs" title="طباعة تقرير جاهزية وتشغيل المدرسة">
                            <Printer size={14} />
                            <span>طباعة التقرير</span>
                        </button>
                    </div>
                </div>
            </div>

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
                        <button type="button" data-testid="school-delete-cancel" onClick={onCancelDelete} className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition-colors hover:bg-gray-100">
                            إلغاء والعودة للإدارة
                        </button>
                        <button type="button" data-testid="school-delete-confirm" onClick={onConfirmDelete} disabled={isDeletePending} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-red-700">
                            حذف المدرسة نهائيًا
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
