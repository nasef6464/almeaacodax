import React from 'react';
import { CheckCircle, Clipboard, Download, Edit2, Printer, Trash2 } from 'lucide-react';

type SaveVerificationState = 'idle' | 'saving' | 'verifying' | 'success' | 'error' | null;

interface SchoolWorkspaceControlsPanelProps {
    schoolName: string;
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

    return (
        <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-900">
                    &rarr; عودة لقائمة المدارس
                </button>
                <h1 className="min-w-[220px] flex-1 text-2xl font-bold text-gray-900">{schoolName}</h1>
                <button
                    type="button"
                    data-testid="school-save-verify-button"
                    onClick={onSaveAndVerify}
                    disabled={isSchoolWorkspaceBusy}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                        saveVerificationState === 'error'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : saveVerificationState === 'success'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                    title="حفظ ثم إعادة قراءة بيانات المدرسة من الخادم للتأكد"
                >
                    <CheckCircle size={16} />
                    {saveVerificationButtonLabel}
                </button>
                <button
                    type="button"
                    onClick={onRename}
                    disabled={isSchoolWorkspaceBusy}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    title="تعديل اسم المدرسة"
                >
                    <Edit2 size={16} />
                    تعديل الاسم
                </button>
                <button
                    type="button"
                    onClick={onDownloadHandover}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    title="تحميل ملف تسليم شامل للمدرسة"
                >
                    <Download size={16} />
                    ملف تسليم المدرسة
                </button>
                <button
                    type="button"
                    onClick={onCopyHandover}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                    title="نسخ رسالة جاهزة لإرسالها لإدارة المدرسة"
                >
                    <Clipboard size={16} />
                    نسخ رسالة التسليم
                </button>
                <button
                    type="button"
                    onClick={onPrintReport}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    title="طباعة تقرير جاهزية وتشغيل المدرسة"
                >
                    <Printer size={16} />
                    طباعة التقرير
                </button>
                <button
                    type="button"
                    data-testid="school-delete-button"
                    onClick={onRequestDelete}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 transition-colors"
                    title="حذف المدرسة وفصلها عن الطلاب والمشرفين"
                >
                    <Trash2 size={16} />
                    حذف المدرسة
                </button>
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
                            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-red-700"
                        >
                            حذف المدرسة نهائيًا
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
