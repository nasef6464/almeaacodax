import React from 'react';
import { Search } from 'lucide-react';
import type { Group, User } from '../../../types';
import type { SchoolRosterClassFilter } from './rosterViewModel';

interface SchoolStudentRosterPanelProps {
    studentSearch: string;
    setStudentSearch: (value: string) => void;
    selectedClassFilter: SchoolRosterClassFilter;
    setSelectedClassFilter: (value: SchoolRosterClassFilter) => void;
    schoolClasses: Group[];
    visibleSchoolStudents: User[];
    pagedVisibleSchoolStudents: User[];
    schoolStudentTotalPages: number;
    safeSchoolStudentPage: number;
    schoolStudentStartIndex: number;
    schoolStudentEndIndex: number;
    setSchoolStudentPage: React.Dispatch<React.SetStateAction<number>>;
    rosterActionPending: string | null;
    selectedSchoolName: string;
    selectedSchoolId: string;
    handleAssignStudentToClass: (studentId: string, groupId: string) => Promise<void>;
    handleRemoveStudentScope: (studentId: string, scopeId: string) => Promise<void>;
}

export const SchoolStudentRosterPanel: React.FC<SchoolStudentRosterPanelProps> = ({
    studentSearch,
    setStudentSearch,
    selectedClassFilter,
    setSelectedClassFilter,
    schoolClasses,
    visibleSchoolStudents,
    pagedVisibleSchoolStudents,
    schoolStudentTotalPages,
    safeSchoolStudentPage,
    schoolStudentStartIndex,
    schoolStudentEndIndex,
    setSchoolStudentPage,
    rosterActionPending,
    selectedSchoolName,
    selectedSchoolId,
    handleAssignStudentToClass,
    handleRemoveStudentScope,
}) => (
    <div data-testid="school-roster-panel" className="min-w-0 max-w-full border border-gray-100 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <h3 className="text-lg font-bold text-gray-900">طلاب المدرسة</h3>
                <p className="text-sm text-gray-500 mt-1">استعراض سريع للطلاب مع نقلهم بين الفصول بدون مغادرة الصفحة.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[540px]">
                <div className="relative">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="ابحث بالاسم أو البريد..."
                        className="w-full rounded-xl border border-gray-200 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
                <select
                    value={selectedClassFilter}
                    onChange={(event) => setSelectedClassFilter(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <option value="all">كل الفصول</option>
                    <option value="unassigned">طلاب بدون فصل</option>
                    {schoolClasses.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {visibleSchoolStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                لا يوجد طلاب مطابقون للبحث الحالي داخل هذه المدرسة.
            </div>
        ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-600">
                        <tr>
                            <th className="p-4">الطالب</th>
                            <th className="p-4">البريد</th>
                            <th className="p-4">الفصل الحالي</th>
                            <th className="p-4">النقل إلى فصل</th>
                            <th className="p-4">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white text-sm">
                        {pagedVisibleSchoolStudents.map((student) => {
                            const currentClass = schoolClasses.find((classroom) => (student.groupIds || []).includes(classroom.id));
                            return (
                                <tr key={student.id}>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{student.name}</div>
                                        <div className="text-xs text-gray-400 mt-1">{student.isActive === false ? 'الحساب موقوف' : 'الحساب نشط'}</div>
                                    </td>
                                    <td className="p-4 text-gray-600">{student.email || '-'}</td>
                                    <td className="p-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${currentClass ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {currentClass?.name || 'بدون فصل'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={currentClass?.id || ''}
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                if (!value || value === currentClass?.id) return;
                                                void handleAssignStudentToClass(student.id, value);
                                            }}
                                            disabled={Boolean(rosterActionPending)}
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="">اختر فصلاً</option>
                                            {schoolClasses.map((classroom) => (
                                                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-2">
                                            {currentClass && (
                                                <button
                                                    type="button"
                                                    data-testid="school-student-remove-class"
                                                    onClick={() => {
                                                        if (window.confirm(`هل تريد إخراج ${student.name} من فصل ${currentClass.name}؟ سيبقى الطالب داخل المدرسة.`)) {
                                                            void handleRemoveStudentScope(student.id, currentClass.id);
                                                        }
                                                    }}
                                                    disabled={Boolean(rosterActionPending)}
                                                    className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 transition-colors hover:bg-amber-100"
                                                >
                                                    إخراج من الفصل
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                data-testid="school-student-remove-school"
                                                onClick={() => {
                                                    if (window.confirm(`هل تريد إزالة ${student.name} من ${selectedSchoolName}؟ سيتم إخراجه من المدرسة وفصولها.`)) {
                                                        void handleRemoveStudentScope(student.id, selectedSchoolId);
                                                    }
                                                }}
                                                disabled={Boolean(rosterActionPending)}
                                                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition-colors hover:bg-red-100"
                                            >
                                                إزالة من المدرسة
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {schoolStudentTotalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            عرض {schoolStudentStartIndex + 1}-{schoolStudentEndIndex} من {visibleSchoolStudents.length} طالب
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={safeSchoolStudentPage <= 1}
                                onClick={() => setSchoolStudentPage((page) => Math.max(1, page - 1))}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                السابق
                            </button>
                            <span className="rounded-xl bg-white px-3 py-2 text-gray-500">
                                صفحة {safeSchoolStudentPage} / {schoolStudentTotalPages}
                            </span>
                            <button
                                type="button"
                                disabled={safeSchoolStudentPage >= schoolStudentTotalPages}
                                onClick={() => setSchoolStudentPage((page) => Math.min(schoolStudentTotalPages, page + 1))}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
);
