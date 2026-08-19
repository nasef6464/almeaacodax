import React from 'react';
import { Trash2 } from 'lucide-react';
import type {
    B2BPackage,
    CategoryPath,
    CategorySubject,
    Course,
    Group,
    PackageContentType,
    User,
} from '../../../types';
import { PACKAGE_CONTENT_OPTIONS } from './contracts';
import type { SchoolPackagePresentation } from './packageAccessViewModel';

interface SchoolPackageCardProps {
    pkg: B2BPackage;
    presentation?: SchoolPackagePresentation;
    selectedSchool: Group;
    publishedCourses: Course[];
    paths: CategoryPath[];
    subjects: CategorySubject[];
    teachers: User[];
    handleUpdateSchoolPackage: (pkgId: string, updates: Partial<B2BPackage>) => Promise<void>;
    handleDeleteSchoolPackage: (pkgId: string) => Promise<void>;
    assignCourseToGroup: (courseId: string, groupId: string) => void;
}

export const SchoolPackageCard: React.FC<SchoolPackageCardProps> = ({
    pkg,
    presentation,
    selectedSchool,
    publishedCourses,
    paths,
    subjects,
    teachers,
    handleUpdateSchoolPackage,
    handleDeleteSchoolPackage,
    assignCourseToGroup,
}) => {
    const packageCourses = presentation?.courses || [];
    const packagePaths = presentation?.paths || [];
    const packageSubjects = presentation?.subjects || [];
    const packageTeacher = presentation?.teacher;

    return (
        <div className="border border-gray-200 p-5 rounded-xl space-y-4">
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
};
