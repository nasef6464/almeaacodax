import React from 'react';
import { Download, CheckCircle, FileSpreadsheet, Plus, ShieldAlert } from 'lucide-react';
import { ImportRow, ImportSummary, ImportResponse } from './contracts';

interface SchoolImportPanelProps {
    importRows: ImportRow[];
    importSummary: ImportSummary | null;
    isImporting: boolean;
    importCredentials: ImportResponse['credentials'];
    importError: string | null;
    importPreviewStats: {
        classNames: string[];
        rowsWithoutPassword: number;
        duplicateEmails: string[];
        existingEmails: string[];
    };
    handleImportFile: (file: File) => Promise<void>;
    handleStartImport: () => Promise<void>;
    downloadTemplate: () => void;
    downloadCredentials: () => void;
}

export const SchoolImportPanel: React.FC<SchoolImportPanelProps> = ({
    importRows,
    importSummary,
    isImporting,
    importCredentials,
    importError,
    importPreviewStats,
    handleImportFile,
    handleStartImport,
    downloadTemplate,
    downloadCredentials,
}) => {
    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">استيراد الطلاب دفعة واحدة</h2>
                <p className="text-gray-500">حمّل النموذج، ثم ارفع ملف Excel أو CSV وسيقوم النظام بإنشاء الحسابات وربطها بالمدرسة والفصول.</p>
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-5">
                {[
                    ['1', 'تحميل النموذج', true],
                    ['2', 'رفع الملف', importRows.length > 0 || Boolean(importSummary)],
                    ['3', 'معاينة', importRows.length > 0],
                    ['4', 'بدء الاستيراد', Boolean(importSummary)],
                    ['5', 'تحميل بيانات الدخول', importCredentials.length > 0],
                ].map(([number, label, isDone]) => (
                    <div
                        key={String(label)}
                        className={`rounded-xl border px-3 py-2 text-center ${
                            isDone
                                ? 'border-emerald-100 bg-white text-emerald-700'
                                : 'border-slate-100 bg-white text-slate-500'
                        }`}
                    >
                        <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                            {number}
                        </span>
                        <span className="block text-xs font-black">{label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-xl p-6 text-center hover:border-amber-500 transition-colors group cursor-pointer">
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Download size={32} />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">1. تحميل النموذج</h3>
                    <p className="text-sm text-gray-500 mb-4">نموذج Excel جاهز بالأعمدة الأساسية: الاسم، البريد، الفصل، وكلمة المرور الاختيارية.</p>
                    <button onClick={downloadTemplate} className="text-amber-600 font-bold text-sm">تحميل school-import-template.xlsx</button>
                </div>

                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative overflow-hidden ${importSummary ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.tsv,.txt"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                void handleImportFile(file);
                            }
                        }}
                    />

                    {isImporting ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                            <p className="font-bold text-blue-600">جارٍ استيراد الطلاب وربطهم بالمدرسة...</p>
                        </div>
                    ) : importSummary ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="font-bold text-emerald-900 mb-2">تم الاستيراد بنجاح</h3>
                            <p className="text-sm text-emerald-700 mb-4">تم استيراد {importSummary.imported} طالب عبر {importSummary.classesTouched} فصل.</p>
                            <button onClick={downloadCredentials} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700">
                                <Download size={16} /> تحميل بيانات الدخول
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet size={32} />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">2. رفع الملف هنا</h3>
                            <p className="text-sm text-gray-500 mb-4">اسحب الملف هنا أو انقر لاختيار الملف (Excel, CSV)</p>
                            <span className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold">اختيار ملف</span>
                        </>
                    )}
                </div>
            </div>

            {importError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                    <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold mb-1">خطأ في الاستيراد</h4>
                        <p className="text-sm">{importError}</p>
                    </div>
                </div>
            )}

            {importRows.length > 0 && !importSummary && (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                            <p className="text-sm text-gray-500 font-bold mb-1">إجمالي الطلاب</p>
                            <p className="text-2xl font-black text-blue-800">{importRows.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                            <p className="text-sm text-gray-500 font-bold mb-1">الفصول الجديدة</p>
                            <p className="text-2xl font-black text-purple-800">{importPreviewStats.classNames.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                            <p className="text-sm text-gray-500 font-bold mb-1">بدون كلمة مرور</p>
                            <p className="text-2xl font-black text-amber-800">{importPreviewStats.rowsWithoutPassword}</p>
                        </div>
                        <div className={`col-span-3 bg-white p-4 rounded-xl border text-center ${
                            importPreviewStats.duplicateEmails.length || importPreviewStats.existingEmails.length
                                ? 'border-rose-200 bg-rose-50'
                                : 'border-emerald-200 bg-emerald-50'
                        }`}>
                            <p className={`text-sm font-bold mb-1 ${
                                importPreviewStats.duplicateEmails.length || importPreviewStats.existingEmails.length
                                    ? 'text-rose-700'
                                    : 'text-emerald-700'
                            }`}>مشاكل في البريد الإلكتروني</p>
                            <p className={`text-2xl font-black ${
                                importPreviewStats.duplicateEmails.length || importPreviewStats.existingEmails.length
                                    ? 'text-rose-800'
                                    : 'text-emerald-800'
                            }`}>
                                {importPreviewStats.duplicateEmails.length + importPreviewStats.existingEmails.length}
                            </p>
                        </div>
                    </div>

                    {(importPreviewStats.duplicateEmails.length > 0 || importPreviewStats.existingEmails.length > 0) && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-700">
                            {importPreviewStats.duplicateEmails.length > 0 ? (
                                <p><strong>إيميلات مكررة داخل الملف:</strong> {importPreviewStats.duplicateEmails.slice(0, 6).join(', ')}</p>
                            ) : null}
                            {importPreviewStats.existingEmails.length > 0 ? (
                                <p><strong>إيميلات موجودة مسبقًا:</strong> {Array.from(new Set(importPreviewStats.existingEmails)).slice(0, 6).join(', ')}</p>
                            ) : null}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">معاينة البيانات</h3>
                            <p className="text-sm text-gray-500">تم تجهيز {importRows.length} صفًا صالحًا للاستيراد.</p>
                        </div>
                        <button
                            onClick={() => void handleStartImport()}
                            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                        >
                            بدء الاستيراد
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-right">
                            <thead className="bg-gray-100 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-medium">الاسم</th>
                                    <th className="p-4 font-medium">البريد الإلكتروني</th>
                                    <th className="p-4 font-medium">الفصل</th>
                                    <th className="p-4 font-medium">كلمة المرور</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {importRows.slice(0, 8).map((row, index) => (
                                    <tr key={`${row.email}-${index}`} className="bg-white">
                                        <td className="p-4 text-sm text-gray-800">{row.name}</td>
                                        <td className="p-4 text-sm text-gray-500">{row.email}</td>
                                        <td className="p-4 text-sm text-gray-500">{row.className || 'سيُترك بدون فصل'}</td>
                                        <td className="p-4 text-sm text-gray-500">{row.password || 'سيتم توليدها تلقائيًا'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
