import React from 'react';
import { Key, Trash2 } from 'lucide-react';
import type { AccessCode, B2BPackage } from '../../../types';
import { buildSchoolAccessCodeRows } from './accessCodeViewModel';

interface SchoolAccessCodesPanelProps {
    schoolPackages: B2BPackage[];
    activeSchoolPackages: B2BPackage[];
    schoolCodes: AccessCode[];
    activeSchoolCodes: AccessCode[];
    usedSeats: number;
    selectedPackageIdForCode: string;
    setSelectedPackageIdForCode: React.Dispatch<React.SetStateAction<string>>;
    handleCreateSchoolAccessCode: () => Promise<void>;
    accessCodeActionPending: string | null;
    newCodeMaxUses: string;
    setNewCodeMaxUses: React.Dispatch<React.SetStateAction<string>>;
    newCodeDurationDays: string;
    setNewCodeDurationDays: React.Dispatch<React.SetStateAction<string>>;
    tableSchoolCodes: AccessCode[];
    handleCopyCode: (code: string, id: string) => Promise<void>;
    copiedCodeId: string | null;
    handleDeleteSchoolAccessCode: (id: string) => Promise<void>;
    isLoadingPagedAccessCodes: boolean;
    pagedAccessCodesError: string | null;
    pagedAccessCodesPagination: { total: number; limit: number } | null;
}

export const SchoolAccessCodesPanel: React.FC<SchoolAccessCodesPanelProps> = ({
    schoolPackages,
    activeSchoolPackages,
    schoolCodes,
    activeSchoolCodes,
    usedSeats,
    selectedPackageIdForCode,
    setSelectedPackageIdForCode,
    handleCreateSchoolAccessCode,
    accessCodeActionPending,
    newCodeMaxUses,
    setNewCodeMaxUses,
    newCodeDurationDays,
    setNewCodeDurationDays,
    tableSchoolCodes,
    handleCopyCode,
    copiedCodeId,
    handleDeleteSchoolAccessCode,
    isLoadingPagedAccessCodes,
    pagedAccessCodesError,
    pagedAccessCodesPagination,
}) => {
    const accessCodeRows = buildSchoolAccessCodeRows(tableSchoolCodes, schoolPackages);

    return (
        <div data-testid="school-access-codes-panel">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">أكواد التفعيل</h3>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPackageIdForCode}
                        onChange={(event) => setSelectedPackageIdForCode(event.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[220px]"
                    >
                        <option value="">اختر باقة نشطة</option>
                        {activeSchoolPackages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                        ))}
                    </select>
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{schoolCodes.length} كود</span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{activeSchoolCodes.length} كود صالح</span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{usedSeats} استخدام</span>
                    </div>
                    <button
                        onClick={() => void handleCreateSchoolAccessCode()}
                        disabled={activeSchoolPackages.length === 0 || Boolean(accessCodeActionPending)}
                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Key size={16} /> توليد كود جديد
                    </button>
                </div>
            </div>
            {accessCodeActionPending && (
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                    جار حفظ تعديل أكواد التفعيل على الخادم...
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-xs font-bold text-gray-600 mb-2">عدد المقاعد لكل كود</label>
                    <input
                        type="number"
                        min={1}
                        value={newCodeMaxUses}
                        onChange={(event) => setNewCodeMaxUses(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <label className="block text-xs font-bold text-gray-600 mb-2">مدة صلاحية الكود بالأيام</label>
                    <input
                        type="number"
                        min={1}
                        value={newCodeDurationDays}
                        onChange={(event) => setNewCodeDurationDays(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 text-gray-600 text-sm">
                        <tr>
                            <th className="p-4 font-medium">الكود</th>
                            <th className="p-4 font-medium">الباقة المرتبطة</th>
                            <th className="p-4 font-medium">الاستخدام</th>
                            <th className="p-4 font-medium">تاريخ الانتهاء</th>
                            <th className="p-4 font-medium">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {accessCodeRows.map((code) => (
                            <tr key={code.id} className="bg-white">
                                <td className="p-4 font-mono font-bold text-amber-600">{code.code}</td>
                                <td className="p-4 text-sm text-gray-800">{code.packageName}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${code.usagePercent}%` }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500">{code.currentUses}/{code.maxUses}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-500">{new Date(code.expiresAt).toLocaleDateString('ar-SA')}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => void handleCopyCode(code.code, code.id)}
                                            className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
                                        >
                                            {copiedCodeId === code.id ? 'تم النسخ' : 'نسخ'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('هل تريد حذف كود التفعيل هذا؟')) {
                                                    void handleDeleteSchoolAccessCode(code.id);
                                                }
                                            }}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(isLoadingPagedAccessCodes || pagedAccessCodesError || pagedAccessCodesPagination) && (
                    <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-200 bg-white">
                        {isLoadingPagedAccessCodes ? 'جاري تحميل الأكواد...' : ''}
                        {!isLoadingPagedAccessCodes && pagedAccessCodesError ? pagedAccessCodesError : ''}
                        {!isLoadingPagedAccessCodes && !pagedAccessCodesError && pagedAccessCodesPagination
                            ? `إجمالي الأكواد: ${pagedAccessCodesPagination.total} (الحد الأقصى للصفحة الحالية: ${pagedAccessCodesPagination.limit})`
                            : ''}
                    </div>
                )}
            </div>
        </div>
    );
};
