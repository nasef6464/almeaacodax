import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileJson, Loader2, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { api } from '../../services/api';

type BackupPayload = {
    schemaVersion?: number;
    kind?: string;
    createdAt?: string;
    database?: string;
    summary?: Record<string, number>;
    collections?: Array<{ name: string; documents: unknown[] }>;
};

type RestoreResponse = {
    ok?: boolean;
    applied?: boolean;
    replaced?: boolean;
    summary?: Record<string, { backup: number; current: number; action: string }>;
    note?: string;
};

const collectionLabels: Record<string, string> = {
    paths: 'المسارات',
    levels: 'المراحل',
    subjects: 'المواد',
    sections: 'الأقسام',
    skills: 'المهارات',
    topics: 'الموضوعات',
    lessons: 'الدروس',
    questions: 'الأسئلة',
    quizzes: 'الاختبارات',
    courses: 'الدورات والباقات',
    libraryItems: 'المكتبة',
    groups: 'المدارس والمجموعات',
    b2bPackages: 'باقات المدارس',
    accessCodes: 'أكواد الوصول',
    studyPlans: 'خطط الدراسة',
    homepageSettings: 'إعدادات الرئيسية',
    paymentSettings: 'إعدادات الدفع',
};

const essentialCollections = ['paths', 'subjects', 'sections', 'skills', 'topics', 'lessons', 'questions', 'quizzes'];

const isValidLearningBackup = (payload: BackupPayload | null) =>
    payload?.kind === 'almeaa-learning-content-backup' &&
    payload?.schemaVersion === 1 &&
    Array.isArray(payload?.collections);

const downloadJson = (payload: unknown, fileName: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

export const BackupManager: React.FC = () => {
    const [isCreating, setIsCreating] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupPayload, setBackupPayload] = useState<BackupPayload | null>(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [restorePreview, setRestorePreview] = useState<RestoreResponse | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [replaceMode, setReplaceMode] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const backupSummaryRows = useMemo(() => {
        const summary = backupPayload?.summary || Object.fromEntries((backupPayload?.collections || []).map((item) => [item.name, item.documents.length]));
        return Object.entries(summary).map(([name, count]) => ({
            name,
            label: collectionLabels[name] || name,
            count,
        }));
    }, [backupPayload]);

    const missingEssentialCollections = useMemo(() => {
        const existing = new Set((backupPayload?.collections || []).map((item) => item.name));
        return essentialCollections.filter((name) => !existing.has(name));
    }, [backupPayload]);

    const backupTotals = useMemo(() => backupSummaryRows.reduce((sum, row) => sum + Number(row.count || 0), 0), [backupSummaryRows]);
    const requiredConfirmText = replaceMode ? 'استبدال' : 'استرجاع';

    const createBackup = async () => {
        setIsCreating(true);
        setErrorMessage('');
        setStatusMessage('');

        try {
            const payload = await api.createLearningBackup() as BackupPayload;
            if (!isValidLearningBackup(payload)) {
                throw new Error('ملف النسخة غير صالح.');
            }

            setBackupPayload(payload);
            setSelectedFileName('');
            setRestorePreview(null);
            setConfirmText('');
            const safeDate = (payload.createdAt || new Date().toISOString()).replace(/[:.]/g, '-');
            downloadJson(payload, `almeaa-learning-content-${safeDate}.json`);
            setStatusMessage('تم إنشاء نسخة احتياطية من محتوى التعلم وتحميلها.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'تعذر إنشاء النسخة الاحتياطية الآن.');
        } finally {
            setIsCreating(false);
        }
    };

    const readBackupFile = async (file: File) => {
        setErrorMessage('');
        setStatusMessage('');
        setRestorePreview(null);

        try {
            const raw = await file.text();
            const parsed = JSON.parse(raw) as BackupPayload;
            if (!isValidLearningBackup(parsed)) {
                throw new Error('هذا الملف ليس نسخة تعليمية صالحة للمنصة.');
            }

            setBackupPayload(parsed);
            setSelectedFileName(file.name);
            setConfirmText('');
            setStatusMessage('تم قراءة الملف. ابدأ بالفحص قبل أي استرجاع.');
        } catch (error) {
            setBackupPayload(null);
            setSelectedFileName('');
            setErrorMessage(error instanceof Error ? error.message : 'تعذر قراءة ملف النسخة.');
        }
    };

    const runRestore = async (apply: boolean) => {
        if (!backupPayload) {
            setErrorMessage('اختر ملف نسخة احتياطية أولًا.');
            return;
        }

        setIsRestoring(true);
        setErrorMessage('');
        setStatusMessage('');

        try {
            const response = await api.restoreLearningBackup({
                backup: backupPayload,
                apply,
                replace: apply ? replaceMode : false,
                confirmText: apply ? confirmText : undefined,
            }) as RestoreResponse;

            setRestorePreview(response);
            setStatusMessage(apply ? 'تم تطبيق الاسترجاع بنجاح.' : 'تم فحص الملف بدون أي تعديل على قاعدة البيانات.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'تعذر تنفيذ العملية الآن.');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-700 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-100">
                            <ShieldCheck size={18} />
                            حماية محتوى المنصة
                        </div>
                        <h2 className="text-2xl font-black">النسخ الاحتياطي والاسترجاع</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-50">
                            احفظ نسخة من المسارات والمواد والمهارات والدروس والأسئلة والاختبارات. هذا لا يشمل كلمات مرور المستخدمين أو بيانات الدفع.
                        </p>
                    </div>
                    <button
                        onClick={createBackup}
                        disabled={isCreating}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                    >
                        {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        إنشاء وتحميل نسخة
                    </button>
                </div>
            </div>

            {statusMessage ? (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                    <CheckCircle2 size={18} />
                    {statusMessage}
                </div>
            ) : null}

            {errorMessage ? (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    <AlertTriangle size={18} />
                    {errorMessage}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">محتوى النسخة الحالية</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {backupPayload ? `مصدر النسخة: ${selectedFileName || 'نسخة تم إنشاؤها الآن'}` : 'أنشئ نسخة أو ارفع ملف نسخة سابق.'}
                            </p>
                        </div>
                        <FileJson className="text-emerald-600" />
                    </div>

                    {backupPayload ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div className="rounded-2xl bg-emerald-50 p-4">
                                    <div className="text-xs font-bold text-emerald-700">إجمالي العناصر</div>
                                    <div className="mt-2 text-2xl font-black text-emerald-900">{backupTotals}</div>
                                </div>
                                <div className="rounded-2xl bg-blue-50 p-4">
                                    <div className="text-xs font-bold text-blue-700">تاريخ النسخة</div>
                                    <div className="mt-2 text-sm font-black text-blue-900">{backupPayload.createdAt ? new Date(backupPayload.createdAt).toLocaleString('ar-SA') : 'غير محدد'}</div>
                                </div>
                                <div className={`rounded-2xl p-4 ${missingEssentialCollections.length ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                    <div className={`text-xs font-bold ${missingEssentialCollections.length ? 'text-amber-700' : 'text-emerald-700'}`}>حالة الملف</div>
                                    <div className={`mt-2 text-sm font-black ${missingEssentialCollections.length ? 'text-amber-900' : 'text-emerald-900'}`}>
                                        {missingEssentialCollections.length ? `ينقص ${missingEssentialCollections.length} مجموعات` : 'جاهز للفحص'}
                                    </div>
                                </div>
                            </div>

                            {missingEssentialCollections.length ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
                                    هذه النسخة قديمة أو ناقصة. المجموعات الناقصة: {missingEssentialCollections.map((name) => collectionLabels[name] || name).join('، ')}.
                                </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                {backupSummaryRows.map((row) => (
                                    <div key={row.name} className="rounded-2xl bg-gray-50 p-4">
                                        <div className="text-xs font-bold text-gray-500">{row.label}</div>
                                        <div className="mt-2 text-2xl font-black text-gray-900">{row.count}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm leading-7 text-gray-500">
                            لا توجد نسخة محددة بعد.
                        </div>
                    )}
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900">رفع نسخة للاسترجاع</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-500">ابدأ دائمًا بفحص الملف. الاسترجاع الحقيقي لا يتم إلا عند الضغط على تطبيق.</p>

                    <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center hover:border-emerald-300 hover:bg-emerald-50/50">
                        <Upload size={24} className="mb-2 text-emerald-600" />
                        <span className="text-sm font-black text-gray-800">اختيار ملف JSON</span>
                        <span className="mt-1 text-xs text-gray-500">{selectedFileName || 'نسخة محتوى تعلم من المنصة'}</span>
                        <input
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void readBackupFile(file);
                                event.target.value = '';
                            }}
                        />
                    </label>

                    <div className="mt-5 space-y-3">
                        <button
                            onClick={() => runRestore(false)}
                            disabled={!backupPayload || isRestoring}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                        >
                            {isRestoring ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                            فحص قبل الاسترجاع
                        </button>

                        <label className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                            <input
                                type="checkbox"
                                checked={replaceMode}
                                onChange={(event) => {
                                    setReplaceMode(event.target.checked);
                                    setConfirmText('');
                                }}
                                className="mt-1"
                            />
                            <span>
                                استبدال كامل لمجموعات التعلم قبل الاسترجاع. استخدمه فقط عند الرجوع لنسخة قديمة بعد مشكلة كبيرة.
                            </span>
                        </label>

                        <div className="rounded-2xl border border-gray-200 bg-white p-3">
                            <label className="text-xs font-black text-gray-600">
                                للتطبيق الحقيقي اكتب: <span className="text-slate-900">{requiredConfirmText}</span>
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(event) => setConfirmText(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder={requiredConfirmText}
                            />
                        </div>

                        <button
                            onClick={() => runRestore(true)}
                            disabled={!backupPayload || isRestoring || confirmText !== requiredConfirmText}
                            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            تطبيق الاسترجاع
                        </button>
                    </div>
                </section>
            </div>

            {restorePreview?.summary ? (
                <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-lg font-black text-gray-900">نتيجة الفحص أو الاسترجاع</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-right text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-gray-500">
                                    <th className="p-3">العنصر</th>
                                    <th className="p-3">داخل النسخة</th>
                                    <th className="p-3">الحالي في القاعدة</th>
                                    <th className="p-3">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(restorePreview.summary).map(([name, row]) => (
                                    <tr key={name} className="border-b border-gray-50">
                                        <td className="p-3 font-bold text-gray-900">{collectionLabels[name] || name}</td>
                                        <td className="p-3">{row.backup}</td>
                                        <td className="p-3">{row.current}</td>
                                        <td className="p-3">{row.action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}
        </div>
    );
};
