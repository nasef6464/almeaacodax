import React from 'react';
import { ShieldCheck, Download, Plus, Trash2, Key } from 'lucide-react';
import { AccessCode, B2BPackage, Course, Group, PackageContentType, Path, Subject, User } from '../../types';
import { PACKAGE_CONTENT_OPTIONS } from '../SchoolsManager';

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
    paths: Path[];
    subjects: Subject[];
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
                            {activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0 ? 'الوصول جاهز للتسليم' : 'الوصول يحتاج استكمال'}
                        </div>
                        <h3 className="mt-3 text-xl font-black text-gray-900">قرار وصول المدرسة</h3>
                        <p data-testid="school-access-next-action" className="mt-2 text-sm font-bold leading-7 text-gray-600">
                            {activeSchoolPackages.length === 0
                                ? 'فعّل باقة مدرسية مرتبطة بالمسارات حتى يحصل الطلاب على الوصول بدون شراء فردي.'
                                : activeSchoolCodes.length === 0
                                    ? 'ولّد كود دخول صالحًا للطلاب أو أرسل رابط التسجيل حسب طريقة التسليم.'
                                    : totalSeats > 0 && usedSeats >= totalSeats
                                        ? 'المقاعد المتاحة مستهلكة بالكامل. زِد سعة الباقة قبل إضافة طلاب جدد.'
                                        : 'الباقة والمسارات والأكواد جاهزة. يمكنك إرسال ملف التسليم للمدرسة أو متابعة الاستهلاك.'}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {[
                            ['الباقات النشطة', activeSchoolPackages.length, activeSchoolPackages.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'],
                            ['الأكواد الصالحة', activeSchoolCodes.length, activeSchoolCodes.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'],
                            ['المقاعد', totalSeats > 0 ? `${usedSeats}/${totalSeats}` : '0/0', totalSeats > 0 && usedSeats < totalSeats ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'],
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
                    <div className="text-2xl font-black text-rose-800">{schoolPackages.filter((pkg) => pkg.status !== 'active').length}</div>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="text-xs font-black text-indigo-700 mb-2">إجمالي الأكواد</div>
                    <div className="text-2xl font-black text-indigo-800">{schoolCodes.length}</div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="text-xs font-black text-amber-700 mb-2">معدل الاستخدام</div>
                    <div className="text-2xl font-black text-amber-800">{totalSeats > 0 ? `${Math.min(100, Math.round((usedSeats / totalSeats) * 100))}%` : '0%'}</div>
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
                    {schoolPackages.map((pkg) => {
                        const packageCourses = publishedCourses.filter((course) => pkg.courseIds.includes(course.id));
                        const packagePaths = paths.filter((path) => (pkg.pathIds || []).includes(path.id));
                        const packageSubjects = subjects.filter((currentSubject) => (pkg.subjectIds || []).includes(currentSubject.id));
                        const packageTeacher = teachers.find((teacher) => teacher.id === pkg.assignedTeacherId);

                        return (
                        <div key={pkg.id} className="border border-gray-200 p-5 rounded-xl space-y-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <input
                                        defaultValue={pkg.name}
                                        onBlur={(event) => {
                                            const value = event.target.value.trim();
                                            if (value && value !== pkg.name) {
                                                void handleUpdateSchoolPackage(pkg.id, { name: value });
                                            }
                                        }}
                                        className="font-bold text-gray-900 text-lg bg-transparent border-b border-transparent hover:border-gray-200 focus:border-amber-400 focus:outline-none transition-colors w-full"
                                    />
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full mt-1 inline-block ${pkg.type === 'free_access' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {pkg.type === 'free_access' ? 'وصول مجاني للطلاب' : 'خصم خاص'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {packageTeacher && (
                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                                            {packageTeacher.name}
                                        </span>
                                    )}
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {pkg.status === 'active' ? 'نشطة' : 'منتهية'}
                                    </span>
                                    <button
                                        onClick={() => void handleUpdateSchoolPackage(pkg.id, {
                                            status: pkg.status === 'active' ? 'expired' : 'active',
                                        })}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                                            pkg.status === 'active'
                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                        title="إيقاف أو تنشيط الباقة بدون حذفها"
                                    >
                                        {pkg.status === 'active' ? 'إيقاف مؤقت' : 'تنشيط'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('الحذف النهائي مخصص للتنظيف فقط. الأفضل إيقاف الباقة إذا كانت مستخدمة. هل تريد الحذف نهائيًا؟')) {
                                                void handleDeleteSchoolPackage(pkg.id);
                                            }
                                        }}
                                        className="text-gray-300 hover:text-red-600 transition-colors"
                                        title="حذف نهائي"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">نوع الباقة</label>
                                    <select
                                        value={pkg.type}
                                        onChange={(event) => void handleUpdateSchoolPackage(pkg.id, {
                                            type: event.target.value as 'free_access' | 'discounted',
                                        })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option value="free_access">وصول مجاني</option>
                                        <option value="discounted">خصم خاص</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">حالة الباقة</label>
                                    <select
                                        value={pkg.status}
                                        onChange={(event) => void handleUpdateSchoolPackage(pkg.id, {
                                            status: event.target.value as 'active' | 'expired',
                                        })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option value="active">نشطة</option>
                                        <option value="expired">منتهية</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">المعلم/المدرب المرتبط</label>
                                    <select
                                        value={pkg.assignedTeacherId || ''}
                                        onChange={(event) => void handleUpdateSchoolPackage(pkg.id, {
                                            assignedTeacherId: event.target.value,
                                        })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option value="">بدون معلم محدد</option>
                                        {teachers.map((teacher) => (
                                            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">نسبة المعلم من دخل الباقة %</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        defaultValue={pkg.revenueSharePercentage ?? ''}
                                        onBlur={(event) => {
                                            const value = event.target.value === '' ? undefined : Number(event.target.value);
                                            if ((value === undefined && pkg.revenueSharePercentage !== undefined) || (Number.isFinite(value) && value! >= 0 && value! <= 100 && value !== pkg.revenueSharePercentage)) {
                                                void handleUpdateSchoolPackage(pkg.id, { revenueSharePercentage: value });
                                            }
                                        }}
                                        placeholder="مثال: 30"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">الحد الأقصى للطلاب</label>
                                    <input
                                        type="number"
                                        min={1}
                                        defaultValue={pkg.maxStudents}
                                        onBlur={(event) => {
                                            const value = Number(event.target.value);
                                            if (Number.isFinite(value) && value > 0 && value !== pkg.maxStudents) {
                                                void handleUpdateSchoolPackage(pkg.id, { maxStudents: value });
                                            }
                                        }}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                                {pkg.type === 'discounted' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">نسبة الخصم %</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            defaultValue={pkg.discountPercentage || 20}
                                            onBlur={(event) => {
                                                const value = Number(event.target.value);
                                                if (Number.isFinite(value) && value > 0 && value <= 100 && value !== pkg.discountPercentage) {
                                                    void handleUpdateSchoolPackage(pkg.id, { discountPercentage: value });
                                                }
                                            }}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-center">
                                        هذه الباقة تمنح الوصول الكامل للدورات المرتبطة دون خصم.
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 border-t border-gray-100 pt-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">نوع المحتوى المفتوح بهذه الباقة</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PACKAGE_CONTENT_OPTIONS.map((option) => {
                                            const selectedContentTypes = Array.isArray(pkg.contentTypes) && pkg.contentTypes.length ? pkg.contentTypes : ['all'];
                                            const isSelected = selectedContentTypes.includes(option.value);
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        let nextTypes: PackageContentType[] = selectedContentTypes as PackageContentType[];

                                                        if (option.value === 'all') {
                                                            nextTypes = ['all'];
                                                        } else if (isSelected) {
                                                            nextTypes = selectedContentTypes.filter((item) => item !== option.value && item !== 'all') as PackageContentType[];
                                                        } else {
                                                            nextTypes = [...selectedContentTypes.filter((item) => item !== 'all'), option.value] as PackageContentType[];
                                                        }

                                                        void handleUpdateSchoolPackage(pkg.id, {
                                                            contentTypes: nextTypes.length > 0 ? nextTypes : ['all'],
                                                        });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                                        isSelected
                                                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">تقييد الباقة على مسار</label>
                                        <select
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            defaultValue=""
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                if (!value) return;
                                                void handleUpdateSchoolPackage(pkg.id, {
                                                    pathIds: Array.from(new Set([...(pkg.pathIds || []), value])),
                                                });
                                                event.target.value = '';
                                            }}
                                        >
                                            <option value="">أضف مسارًا أو اتركها عامة</option>
                                            {paths
                                                .filter((path) => !(pkg.pathIds || []).includes(path.id))
                                                .map((path) => (
                                                    <option key={path.id} value={path.id}>{path.name}</option>
                                                ))}
                                        </select>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {packagePaths.length === 0 ? (
                                                <span className="text-xs text-gray-400">هذه الباقة تعمل على كل المسارات.</span>
                                            ) : packagePaths.map((path) => (
                                                <button
                                                    key={path.id}
                                                    onClick={() => void handleUpdateSchoolPackage(pkg.id, {
                                                        pathIds: (pkg.pathIds || []).filter((pathId) => pathId !== path.id),
                                                    })}
                                                    className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                                                >
                                                    {path.name} ×
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">تقييد الباقة على مادة</label>
                                        <select
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            defaultValue=""
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                if (!value) return;
                                                void handleUpdateSchoolPackage(pkg.id, {
                                                    subjectIds: Array.from(new Set([...(pkg.subjectIds || []), value])),
                                                });
                                                event.target.value = '';
                                            }}
                                        >
                                            <option value="">أضف مادة أو اتركها عامة</option>
                                            {subjects
                                                .filter((currentSubject) => {
                                                    const pathFilter = (pkg.pathIds || []).length === 0 || (pkg.pathIds || []).includes(currentSubject.pathId);
                                                    const notSelected = !(pkg.subjectIds || []).includes(currentSubject.id);
                                                    return pathFilter && notSelected;
                                                })
                                                .map((currentSubject) => (
                                                    <option key={currentSubject.id} value={currentSubject.id}>{currentSubject.name}</option>
                                                ))}
                                        </select>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {packageSubjects.length === 0 ? (
                                                <span className="text-xs text-gray-400">هذه الباقة تعمل على كل المواد ضمن النطاق المختار.</span>
                                            ) : packageSubjects.map((currentSubject) => (
                                                <button
                                                    key={currentSubject.id}
                                                    onClick={() => void handleUpdateSchoolPackage(pkg.id, {
                                                        subjectIds: (pkg.subjectIds || []).filter((subjectId) => subjectId !== currentSubject.id),
                                                    })}
                                                    className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                                                >
                                                    {currentSubject.name} ×
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p>عدد الدورات المشمولة: {pkg.courseIds.length}</p>
                                        <p>الحد الأقصى للطلاب: {pkg.maxStudents}</p>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {pkg.discountPercentage ? `خصم ${pkg.discountPercentage}%` : 'وصول مباشر'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-2">إضافة دورة إلى الباقة</label>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        defaultValue=""
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            if (!value) return;

                                            if (!selectedSchool.courseIds.includes(value)) {
                                                assignCourseToGroup(value, selectedSchool.id);
                                            }

                                            void handleUpdateSchoolPackage(pkg.id, {
                                                courseIds: Array.from(new Set([...pkg.courseIds, value])),
                                            });
                                            event.target.value = '';
                                        }}
                                    >
                                        <option value="">اختر دورة منشورة لإضافتها</option>
                                        {publishedCourses
                                            .filter((course) => !pkg.courseIds.includes(course.id))
                                            .map((course) => (
                                                <option key={course.id} value={course.id}>{course.title}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {packageCourses.length === 0 ? (
                                        <span className="text-sm text-gray-400">لا توجد دورات مرتبطة بهذه الباقة حتى الآن.</span>
                                    ) : packageCourses.map((course) => (
                                        <button
                                            key={course.id}
                                            onClick={() => void handleUpdateSchoolPackage(pkg.id, {
                                                courseIds: pkg.courseIds.filter((courseId) => courseId !== course.id),
                                            })}
                                            className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors"
                                        >
                                            {course.title} ×
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        );
                    })}
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
