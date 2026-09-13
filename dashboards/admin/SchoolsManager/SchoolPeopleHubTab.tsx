import React, { useMemo, useState } from 'react';
import { Download, Plus, Search, Upload, Users } from 'lucide-react';
import type { Group, User } from '../../../types';
import { SchoolDirectorDelegationPanel } from './SchoolDirectorDelegationPanel';

interface SchoolPeopleHubTabProps {
    school: Group;
    schoolClasses: Group[];
    schoolStudents: User[];
    supervisors: User[];
    teachers: User[];
    parents: User[];
    directorAccounts: User[];
    onOpenSingleStudent: () => void;
    onOpenPersonAction: (role: SchoolPersonAction) => void;
    onOpenImport: () => void;
    onDownloadRoster: () => void;
    onAssignStudentToClass: (studentId: string, classId: string) => Promise<void>;
    onRemoveStudentScope: (studentId: string, groupId: string) => Promise<void>;
    rosterActionPending: string | null;
}

type PeopleFilterRole = 'all' | 'directors' | 'supervisors' | 'teachers' | 'students' | 'parents';
export type SchoolPersonAction = 'director' | 'supervisor' | 'teacher' | 'student' | 'parent';

const personActionOptions: Array<{ id: SchoolPersonAction; label: string; detail: string }> = [
    { id: 'director', label: 'مدير مدرسة', detail: 'إنشاء أو ربط المدير وتحديد صلاحياته.' },
    { id: 'supervisor', label: 'مشرف', detail: 'ربط المشرفين بالمدرسة كاملة أو بفصل محدد.' },
    { id: 'teacher', label: 'معلم مدرسة', detail: 'ربطه ثم إسناده إلى المادة والفصل.' },
    { id: 'student', label: 'طالب', detail: 'إضافة طالب للفصل أو استيراد قائمة الطلاب.' },
    { id: 'parent', label: 'ولي أمر', detail: 'ربطه بالطالب أو بالطلاب عبر العلاقات الحالية.' },
];

export const SchoolPeopleHubTab: React.FC<SchoolPeopleHubTabProps> = ({
    school,
    schoolClasses,
    schoolStudents,
    supervisors,
    teachers,
    parents,
    directorAccounts,
    onOpenSingleStudent,
    onOpenPersonAction,
    onOpenImport,
    onDownloadRoster,
    onAssignStudentToClass,
    onRemoveStudentScope,
    rosterActionPending,
}) => {
    const [selectedRole, setSelectedRole] = useState<PeopleFilterRole>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [activeDirectorIds, setActiveDirectorIds] = useState<string[]>([]);
    const [isPersonActionMenuOpen, setIsPersonActionMenuOpen] = useState(false);
    const pageSize = 15;

    // Build unified list of people in this school
    const allSchoolPeople = useMemo(() => {
        const peopleList: Array<{
            user: User;
            schoolRole: 'director' | 'supervisor' | 'teacher' | 'student' | 'parent';
            roleLabel: string;
            roleTone: 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
            className?: string;
            classId?: string;
        }> = [];

        // 1. School Directors are a separate account type, never inferred from Supervisor scope.
        directorAccounts.filter((user) => activeDirectorIds.includes(user.id)).forEach((user) => {
            peopleList.push({
                user,
                schoolRole: 'director',
                roleLabel: 'مدير مدرسة',
                roleTone: 'purple',
            });
        });

        // 2. School Supervisors (school-wide or class-scoped)
        supervisors.forEach((user) => {
            const isSchoolWide = (school.supervisorIds || []).includes(user.id);
            peopleList.push({
                user,
                schoolRole: 'supervisor',
                roleLabel: isSchoolWide ? 'مشرف عام' : 'مشرف فصول',
                roleTone: 'blue',
            });
        });

        // 3. School Teachers
        teachers.forEach((user) => {
            peopleList.push({
                user,
                schoolRole: 'teacher',
                roleLabel: 'معلم مادة',
                roleTone: 'amber',
            });
        });

        // 4. School Students
        schoolStudents.forEach((user) => {
            const studentClass = schoolClasses.find((cls) => (cls.studentIds || []).includes(user.id));
            peopleList.push({
                user,
                schoolRole: 'student',
                roleLabel: 'طالب',
                roleTone: 'emerald',
                className: studentClass ? studentClass.name : 'غير محدد',
                classId: studentClass ? studentClass.id : undefined,
            });
        });

        // 5. Parents
        parents.forEach((user) => {
            peopleList.push({
                user,
                schoolRole: 'parent',
                roleLabel: 'ولي أمر',
                roleTone: 'slate',
            });
        });

        return peopleList;
    }, [school, schoolClasses, schoolStudents, supervisors, teachers, parents, directorAccounts, activeDirectorIds]);

    // Filter people
    const filteredPeople = useMemo(() => {
        return allSchoolPeople.filter((item) => {
            // Role filter
            if (selectedRole === 'directors' && item.schoolRole !== 'director') return false;
            if (selectedRole === 'supervisors' && item.schoolRole !== 'supervisor' && item.schoolRole !== 'director') return false;
            if (selectedRole === 'teachers' && item.schoolRole !== 'teacher') return false;
            if (selectedRole === 'students' && item.schoolRole !== 'student') return false;
            if (selectedRole === 'parents' && item.schoolRole !== 'parent') return false;

            // A class is a student relationship. Do not hide staff, directors, or
            // parents just because they have no class assignment.
            if (selectedClassId !== 'all' && item.schoolRole === 'student') {
                if (selectedClassId === 'unassigned' && item.classId) return false;
                if (selectedClassId !== 'unassigned' && item.classId !== selectedClassId) return false;
            }

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesName = item.user.name.toLowerCase().includes(query);
                const matchesEmail = item.user.email.toLowerCase().includes(query);
                const matchesClass = (item.className || '').toLowerCase().includes(query);
                if (!matchesName && !matchesEmail && !matchesClass) return false;
            }

            return true;
        });
    }, [allSchoolPeople, selectedRole, selectedClassId, searchQuery]);

    const totalPages = Math.ceil(filteredPeople.length / pageSize) || 1;
    const pagedPeople = filteredPeople.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="space-y-6" data-testid="school-people-hub-tab">
            <SchoolDirectorDelegationPanel schoolId={school.id} directorAccounts={directorAccounts} onActiveDirectorIdsChange={setActiveDirectorIds} />
            {/* Header & Quick Action Strip */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Users className="text-indigo-600" size={20} />
                        المجتمع المدرسي الموحد
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        إدارة المدراء، المشرفين، المعلمين، الطلاب، وأولياء الأمور من شاشة واحدة متكاملة
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                        <button
                            type="button"
                            data-testid="school-people-add-or-link"
                            onClick={() => setIsPersonActionMenuOpen((current) => !current)}
                            aria-expanded={isPersonActionMenuOpen}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
                        >
                            <Plus size={15} /> إضافة أو ربط مستخدم
                        </button>
                        {isPersonActionMenuOpen && (
                            <div data-testid="school-people-role-actions" className="absolute left-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                <p className="px-3 py-2 text-[11px] font-black text-slate-500">اختر نوع الحساب ثم أكمل في النموذج المخصص له</p>
                                {personActionOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        data-testid={`school-people-role-${option.id}`}
                                        onClick={() => {
                                            setIsPersonActionMenuOpen(false);
                                            onOpenPersonAction(option.id);
                                        }}
                                        className="block w-full rounded-xl px-3 py-2.5 text-right transition-colors hover:bg-slate-50"
                                    >
                                        <span className="block text-xs font-black text-slate-900">{option.label}</span>
                                        <span className="mt-0.5 block text-[11px] font-medium leading-5 text-slate-500">{option.detail}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onOpenSingleStudent}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
                    >
                        <Plus size={15} /> إضافة طالب فردي
                    </button>
                    <button
                        type="button"
                        onClick={onOpenImport}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <Upload size={15} /> استيراد Excel
                    </button>
                    <button
                        type="button"
                        onClick={onDownloadRoster}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <Download size={15} /> تصدير
                    </button>
                </div>
            </div>

            {/* Role Counts Pills / Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
                {[
                    { id: 'all', label: 'الكل', count: allSchoolPeople.length },
                    { id: 'directors', label: 'مديرو المدارس', count: allSchoolPeople.filter((p) => p.schoolRole === 'director').length },
                    { id: 'supervisors', label: 'المشرفون', count: allSchoolPeople.filter((p) => p.schoolRole === 'supervisor').length },
                    { id: 'teachers', label: 'المعلمون', count: teachers.length },
                    { id: 'students', label: 'الطلاب', count: schoolStudents.length },
                    { id: 'parents', label: 'أولياء الأمور', count: parents.length },
                ].map((pill) => (
                    <button
                        key={pill.id}
                        type="button"
                        onClick={() => {
                            setSelectedRole(pill.id as PeopleFilterRole);
                            setPage(1);
                        }}
                        className={`px-3.5 py-2 rounded-xl border shrink-0 transition-all flex items-center gap-1.5 ${
                            selectedRole === pill.id
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white text-gray-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span>{pill.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            selectedRole === pill.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-gray-600'
                        }`}>
                            {pill.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                    <Search size={16} className="absolute right-3.5 top-3 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        placeholder="ابحث بالاسم أو البريد الإلكتروني أو الفصل..."
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                    />
                </div>

                <div>
                    <select
                        value={selectedClassId}
                        onChange={(e) => {
                            setSelectedClassId(e.target.value);
                            setPage(1);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
                    >
                        <option value="all">كافة الفصول الدراسية</option>
                        <option value="unassigned">طلاب بدون فصل محدد</option>
                        {schoolClasses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* People Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-gray-500 font-bold">
                            <tr>
                                <th className="px-4 py-3.5">المستخدم</th>
                                <th className="px-4 py-3.5">الدور المدرسي</th>
                                <th className="px-4 py-3.5">الفصل / النطاق</th>
                                <th className="px-4 py-3.5 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {pagedPeople.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-400">
                                        لا يوجد مستخدمون مطابقون لمعايير البحث
                                    </td>
                                </tr>
                            ) : (
                                pagedPeople.map((item) => {
                                    const { user, schoolRole, roleLabel, roleTone, className, classId } = item;
                                    const isPending = rosterActionPending === user.id;

                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0">
                                                        {user.name ? user.name.charAt(0) : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-gray-900">{user.name}</div>
                                                        <div className="text-[11px] text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                                    roleTone === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    roleTone === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    roleTone === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                                    roleTone === 'emerald' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                    'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                    {roleLabel}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                {schoolRole === 'student' ? (
                                                    <select
                                                        value={classId || ''}
                                                        disabled={isPending}
                                                        onChange={(e) => onAssignStudentToClass(user.id, e.target.value)}
                                                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-gray-800 bg-white outline-none focus:border-indigo-500 max-w-[170px]"
                                                    >
                                                        <option value="">-- اختر فصلاً --</option>
                                                        {schoolClasses.map((cls) => (
                                                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-gray-600 font-bold text-xs">
                                                        {schoolRole === 'director' ? 'كامل المدرسة' : schoolRole === 'supervisor' ? 'فصول معينة' : 'عام'}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {schoolRole === 'student' ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {classId && (
                                                            <button
                                                                type="button"
                                                                disabled={isPending}
                                                                onClick={() => onRemoveStudentScope(user.id, classId)}
                                                                className="px-2 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                                                                title="إخراج من الفصل"
                                                            >
                                                                إخراج من الفصل
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            disabled={isPending}
                                                            onClick={() => onRemoveStudentScope(user.id, school.id)}
                                                            className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                                            title="إزالة من المدرسة"
                                                        >
                                                            إزالة من المدرسة
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">مربوط بالمدرسة</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-gray-600">
                        <span>
                            عرض {(page - 1) * pageSize + 1} إلى {Math.min(page * pageSize, filteredPeople.length)} من {filteredPeople.length} مستخدم
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-gray-700 disabled:opacity-40"
                            >
                                السابق
                            </button>
                            <span className="px-2">{page} / {totalPages}</span>
                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-gray-700 disabled:opacity-40"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
