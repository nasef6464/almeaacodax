import React from 'react';
import { ShieldCheck, Download, Plus, Trash2, Key } from 'lucide-react';
import { AccessCode, B2BPackage, CategoryPath, CategorySubject, Course, Group, User } from '../../../types';
import { buildSchoolPackageAccessViewModel } from './packageAccessViewModel';
import { SchoolPackageCard } from './SchoolPackageCard';

interface SchoolPackagesPanelProps {
    selectedSchool: Group;
    schoolPackages: B2BPackage[];
    activeSchoolPackages: B2BPackage[];
    schoolCodes: AccessCode[];
    activeSchoolCodes: AccessCode[];
    totalSeats: number;
    usedSeats: number;
    packageActionPending: string | null;
    handleCreateSchoolPackage: (pkg: Partial<B2BPackage>) => Promise<void>;
    handleUpdateSchoolPackage: (pkgId: string, updates: Partial<B2BPackage>) => Promise<void>;
    handleDeleteSchoolPackage: (pkgId: string) => Promise<void>;
    handleExpireAllSchoolPackages: () => Promise<void>;
    downloadPackagesReport: () => void;
    publishedCourses: Course[];
    paths: CategoryPath[];
    subjects: CategorySubject[];
    teachers: User[];
    assignCourseToGroup: (courseId: string, groupId: string) => void;
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

export const SchoolPackagesPanel: React.FC<SchoolPackagesPanelProps> = ({
    selectedSchool,
    schoolPackages,
    activeSchoolPackages,
    schoolCodes,
    activeSchoolCodes,
    totalSeats,
    usedSeats,
    packageActionPending,
    handleCreateSchoolPackage,
    handleUpdateSchoolPackage,
    handleDeleteSchoolPackage,
    handleExpireAllSchoolPackages,
    downloadPackagesReport,
    publishedCourses,
    paths,
    subjects,
    teachers,
    assignCourseToGroup,
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
    const packageAccessSummary = buildSchoolPackageAccessViewModel({
        schoolPackages,
        activeSchoolPackages,
        schoolCodes,
        activeSchoolCodes,
        totalSeats,
        usedSeats,
        publishedCourses,
        paths,
        subjects,
        teachers,
    });
    const { packageAccessRowsById } = packageAccessSummary;

    return (
        <div data-testid="school-packages-panel" className="space-y-8">
            <div data-testid="school-access-decision-summary" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                            activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                        }`}>
                            <ShieldCheck size={14} />
                            {packageAccessSummary.accessStatusLabel}
                        </div>
                        <h3 className="mt-3 text-xl font-black text-gray-900">قرار وصول المدرسة</h3>
                        <p data-testid="school-access-next-action" className="mt-2 text-sm font-bold leading-7 text-gray-600">
                            {packageAccessSummary.accessNextAction}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            ['الباقات النشطة', packageAccessSummary.activePackageCount, packageAccessSummary.activePackageCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'],
                            ['الأكواد الصالحة', packageAccessSummary.activeCodeCount, packageAccessSummary.activeCodeCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'],
                            ['المقاعد', packageAccessSummary.seatsLabel, packageAccessSummary.hasSeatCapacity && !packageAccessSummary.seatCapacityExhausted ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'],
                        ].map(([label, value, tone]) => (
                            <div key={label} className={`rounded-2xl px-4 py-3 text-center ${tone}`}>
                                <div className="text-xs font-black opacity-80">{label}</div>
                                <div className="mt-1 text-2xl font-black">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="text-xs font-black text-emerald-700 mb-2">باقات نشطة</div>
                    <div className="text-2xl font-black text-emerald-800">{activeSchoolPackages.length}</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <div className="text-xs font-black text-rose-700 mb-2">باقات موقوفة/منتهية</div>
                    <div className="text-2xl font-black text-rose-800">{packageAccessSummary.inactivePackageCount}</div>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="text-xs font-black text-indigo-700 mb-2">إجمالي الأكواد</div>
                    <div className="text-2xl font-black text-indigo-800">{packageAccessSummary.totalCodeCount}</div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="text-xs font-black text-amber-700 mb-2">معدل الاستخدام</div>
                    <div className="text-2xl font-black text-amber-800">{`${packageAccessSummary.seatUsagePercent}%`}</div>
                </div>
            </div>
            <div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">الباقات المخصصة</h3>
                        <p className="mt-1 text-sm text-gray-500">إيقاف الباقة يحفظ إعداداتها وأكوادها للمراجعة بدون حذف نهائي.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={downloadPackagesReport}
                            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Download size={16} /> تقرير الباقات
                        </button>
                        <button
                            onClick={() => void handleExpireAllSchoolPackages()}
                            disabled={activeSchoolPackages.length === 0 || Boolean(packageActionPending)}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            إيقاف الكل
                        </button>
                        <button
                            onClick={() => {
                                void handleCreateSchoolPackage({
                                    id: `pkg_${Date.now()}`,
                                    schoolId: selectedSchool.id,
                                    name: 'باقة جديدة',
                                    assignedTeacherId: '',
                                    revenueSharePercentage: undefined,
                                    courseIds: [],
                                    contentTypes: ['all'],
                                    pathIds: [],
                                    subjectIds: [],
                                    type: 'free_access',
                                    maxStudents: 100,
                                    status: 'active',
                                    createdAt: Date.now(),
                                });
                            }}
                            disabled={Boolean(packageActionPending)}
                            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} /> تخصيص باقة
                        </button>
                    </div>
                </div>
                {packageActionPending && (
                    <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                        جار حفظ تعديل الباقات على الخادم...
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schoolPackages.map((pkg) => (
                        <SchoolPackageCard
                            key={pkg.id}
                            pkg={pkg}
                            presentation={packageAccessRowsById.get(pkg.id)}
                            selectedSchool={selectedSchool}
                            publishedCourses={publishedCourses}
                            paths={paths}
                            subjects={subjects}
                            teachers={teachers}
                            handleUpdateSchoolPackage={handleUpdateSchoolPackage}
                            handleDeleteSchoolPackage={handleDeleteSchoolPackage}
                            assignCourseToGroup={assignCourseToGroup}
                        />
                    ))}
                </div>
            </div>

            <div>
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
                            {tableSchoolCodes.map((code) => (
                                <tr key={code.id} className="bg-white">
                                    <td className="p-4 font-mono font-bold text-amber-600">{code.code}</td>
                                    <td className="p-4 text-sm text-gray-800">{schoolPackages.find((pkg) => pkg.id === code.packageId)?.name || 'باقة غير معروفة'}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, (code.currentUses / Math.max(code.maxUses, 1)) * 100)}%` }}></div>
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
        </div>
    );
};
