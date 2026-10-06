import React from 'react';
import { Download, Upload } from 'lucide-react';
import type { RelationCredential, RelationImportRow, RelationImportSummary } from './contracts';

interface SchoolRelationsImportPanelProps {
    downloadRelationsTemplate: () => void;
    relationRows: RelationImportRow[];
    handleRelationFile: (file: File) => Promise<void>;
    relationError: string | null;
    createMissingRelationUsers: boolean;
    setCreateMissingRelationUsers: React.Dispatch<React.SetStateAction<boolean>>;
    isApplyingRelations: boolean;
    handleApplyRelationImport: () => Promise<void>;
    relationSummary: RelationImportSummary | null;
    relationCredentials: RelationCredential[];
    downloadRelationCredentials: () => void;
}

export const SchoolRelationsImportPanel: React.FC<SchoolRelationsImportPanelProps> = ({
    downloadRelationsTemplate,
    relationRows,
    handleRelationFile,
    relationError,
    createMissingRelationUsers,
    setCreateMissingRelationUsers,
    isApplyingRelations,
    handleApplyRelationImport,
    relationSummary,
    relationCredentials,
    downloadRelationCredentials,
}) => (
    <div data-testid="school-relations-import-panel" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-black text-gray-900">ربط جماعي للحسابات الموجودة</h3>
                    <p className="mt-1 text-sm leading-7 text-gray-500">
                        ارفع ملف Excel يربط الطالب بولي أمر ومشرف ومعلم وفصل. يمكن إنشاء الحسابات الناقصة تلقائيا ثم تحميل ملف تسليم آمن.
                    </p>
                </div>
                <button
                    onClick={downloadRelationsTemplate}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                >
                    <Download size={16} /> النموذج
                </button>
            </div>

            <div className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                relationRows.length ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}>
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                            void handleRelationFile(file);
                        }
                    }}
                />
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Upload size={28} />
                </div>
                <h4 className="font-black text-gray-900">رفع ملف الربط</h4>
                <p className="mt-2 text-sm text-gray-500">الأعمدة الأساسية: بريد الطالب، بريد ولي الأمر، بريد المشرف، بريد المعلم، اسم الفصل.</p>
            </div>

            {relationError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {relationError}
                </div>
            )}

            {relationRows.length > 0 && (
                <div className="mt-5 space-y-4">
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                        <input
                            type="checkbox"
                            checked={createMissingRelationUsers}
                            onChange={(event) => setCreateMissingRelationUsers(event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>
                            <strong>إنشاء الحسابات الناقصة من الملف</strong>
                            <br />
                            إذا كان بريد ولي الأمر أو المشرف غير موجود، ينشئ النظام حسابا مؤقتا ويربطه، ثم يظهر ملف تسليم بكلمات المرور.
                        </span>
                    </label>
                    <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="font-black text-blue-900">تم تجهيز {relationRows.length} صف للربط</p>
                            <p className="mt-1 text-sm text-blue-700">راجع أول صفوف ثم نفذ الربط للحسابات الموجودة.</p>
                        </div>
                        <button
                            onClick={() => void handleApplyRelationImport()}
                            disabled={isApplyingRelations}
                            className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isApplyingRelations ? 'جارٍ التنفيذ...' : 'تنفيذ الربط'}
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="p-3 font-bold">بريد الطالب</th>
                                    <th className="p-3 font-bold">ولي الأمر</th>
                                    <th className="p-3 font-bold">المشرف</th>
                                    <th className="p-3 font-bold">المعلم</th>
                                    <th className="p-3 font-bold">الفصل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {relationRows.slice(0, 6).map((row, index) => (
                                    <tr key={`${row.studentEmail}-${index}`}>
                                        <td className="p-3 text-gray-800">{row.studentEmail || '-'}</td>
                                        <td className="p-3 text-gray-500">{row.parentEmail || row.parentName || '-'}</td>
                                        <td className="p-3 text-gray-500">{row.supervisorEmail || row.supervisorName || '-'}</td>
                                        <td className="p-3 text-gray-500">{row.teacherEmail || row.teacherName || '-'}</td>
                                        <td className="p-3 text-gray-500">{row.className || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {relationSummary && (
                <div className="mt-5 space-y-4">
                    {relationCredentials.length > 0 && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="font-black text-emerald-900">تم إنشاء {relationCredentials.length} حساب جديد</p>
                                <p className="mt-1 text-sm text-emerald-700">حمّل ملف التسليم واحفظه في مكان آمن؛ لن تظهر كلمات المرور القديمة بعد تغييرها لاحقا.</p>
                            </div>
                            <button
                                onClick={downloadRelationCredentials}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                            >
                                <Download size={16} /> ملف تسليم الحسابات
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                            ['أولياء تم إنشاؤهم', relationSummary.createdParents, 'emerald'],
                            ['مشرفون تم إنشاؤهم', relationSummary.createdSupervisors, 'purple'],
                            ['أولياء تم ربطهم', relationSummary.linkedParents, 'emerald'],
                            ['مشرفون تم ربطهم', relationSummary.linkedSupervisors, 'purple'],
                            ['معلمون تم إنشاؤهم', relationSummary.createdTeachers, 'blue'],
                            ['معلمون تم ربطهم', relationSummary.linkedTeachers, 'blue'],
                        ].map(([label, value, tone]) => (
                            <div key={String(label)} className={`rounded-xl border p-3 ${
                                tone === 'emerald' ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                                    : tone === 'purple' ? 'border-purple-100 bg-purple-50 text-purple-800'
                                        : tone === 'blue' ? 'border-blue-100 bg-blue-50 text-blue-800'
                                            : 'border-amber-100 bg-amber-50 text-amber-800'
                            }`}>
                                <p className="text-xs font-black">{label}</p>
                                <p className="mt-1 text-2xl font-black">{value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                            ['طلاب نُقلوا لفصول', relationSummary.assignedClasses, 'blue'],
                            ['طلاب غير موجودين', relationSummary.missingStudents, 'amber'],
                            ['أولياء ناقصون', relationSummary.missingParents, 'amber'],
                            ['مشرفون ناقصون', relationSummary.missingSupervisors, 'amber'],
                            ['معلمون ناقصون', relationSummary.missingTeachers, 'amber'],
                        ].map(([label, value, tone]) => (
                            <div key={String(label)} className={`rounded-xl border p-3 ${
                                tone === 'blue' ? 'border-blue-100 bg-blue-50 text-blue-800'
                                    : 'border-amber-100 bg-amber-50 text-amber-800'
                            }`}>
                                <p className="text-xs font-black">{label}</p>
                                <p className="mt-1 text-2xl font-black">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
);
