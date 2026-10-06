import React from 'react';
import {
    Building2,
    ChevronLeft,
    GraduationCap,
    Package,
    Plus,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { Group, User, B2BPackage } from '../../../types';

interface SchoolDashboardPanelProps {
    school: Group;
    schoolClasses: Group[];
    schoolStudents: User[];
    supervisors: User[];
    activePackages: B2BPackage[];
    isSchoolWorkspaceBusy: boolean;
    onGoToClasses: () => void;
    onGoToStudents: () => void;
    onGoToPackages: () => void;
    onGoToImport: () => void;
    onAddClass: () => void;
}

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    tone: 'blue' | 'emerald' | 'amber' | 'violet';
    onClick?: () => void;
}> = ({ icon, label, value, tone, onClick }) => {
    const colors: Record<string, string> = {
        blue:   'border-blue-100 bg-blue-50 text-blue-700',
        emerald:'border-emerald-100 bg-emerald-50 text-emerald-700',
        amber:  'border-amber-100 bg-amber-50 text-amber-700',
        violet: 'border-violet-100 bg-violet-50 text-violet-700',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col gap-2 rounded-2xl border p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-sm ${colors[tone]} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
            <div className="flex items-center justify-between">
                <span className="text-2xl font-black">{value}</span>
                <span className="opacity-60">{icon}</span>
            </div>
            <div className="text-xs font-bold opacity-80">{label}</div>
            {onClick && (
                <div className="flex items-center gap-1 text-[11px] font-bold opacity-60">
                    عرض التفاصيل <ChevronLeft size={12} />
                </div>
            )}
        </button>
    );
};

const ClassCard: React.FC<{
    classroom: Group;
    students: User[];
    classSupervisors: User[];
    onGo: () => void;
}> = ({ classroom, students, classSupervisors, onGo }) => (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-indigo-100 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 size={18} />
            </div>
            <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{classroom.name}</p>
                <p className="text-xs text-gray-500">
                    {students.length} طالب
                    {classSupervisors.length > 0 ? (
                        <> &middot; <span className="text-emerald-600">{classSupervisors.length} مشرف</span></>
                    ) : (
                        <> &middot; <span className="text-amber-600">بدون مشرف</span></>
                    )}
                </p>
            </div>
        </div>
        <button
            onClick={onGo}
            className="shrink-0 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
        >
            إدارة
        </button>
    </div>
);

export const SchoolDashboardPanel: React.FC<SchoolDashboardPanelProps> = ({
    school,
    schoolClasses,
    schoolStudents,
    supervisors,
    activePackages,
    isSchoolWorkspaceBusy,
    onGoToClasses,
    onGoToStudents,
    onGoToPackages,
    onGoToImport,
    onAddClass,
}) => {
    const schoolLevelSupervisorIds = new Set(school.supervisorIds || []);
    const classSupervisorIds = new Set(schoolClasses.flatMap((c) => c.supervisorIds || []));
    const allSupervisorIds = new Set([...schoolLevelSupervisorIds, ...classSupervisorIds]);
    const totalSupervisors = supervisors.filter((u) => allSupervisorIds.has(u.id)).length;
    const classesWithoutSupervisor = schoolClasses.filter((c) => !c.supervisorIds || c.supervisorIds.length === 0);
    const classesWithoutStudents = schoolClasses.filter((c) => !c.studentIds || c.studentIds.length === 0);

    return (
        <div data-testid="school-dashboard-panel" className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard icon={<Building2 size={22} />} label="الفصول" value={schoolClasses.length} tone="blue" onClick={onGoToClasses} />
                <StatCard icon={<GraduationCap size={22} />} label="الطلاب" value={schoolStudents.length} tone="emerald" onClick={onGoToStudents} />
                <StatCard icon={<ShieldCheck size={22} />} label="المشرفون" value={totalSupervisors} tone="violet" onClick={onGoToClasses} />
                <StatCard icon={<Package size={22} />} label="الباقات النشطة" value={activePackages.length} tone="amber" onClick={onGoToPackages} />
            </div>

            {(classesWithoutSupervisor.length > 0 || classesWithoutStudents.length > 0 || activePackages.length === 0) && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-2">
                    <p className="text-sm font-black text-amber-900">تحتاج انتباهاً</p>
                    {classesWithoutSupervisor.length > 0 && (
                        <button onClick={onGoToClasses} className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-right text-sm text-amber-800 hover:bg-amber-100 transition-colors">
                            <span>{classesWithoutSupervisor.length} فصل بدون مشرف معيّن</span>
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    {classesWithoutStudents.length > 0 && (
                        <button onClick={onGoToStudents} className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-right text-sm text-amber-800 hover:bg-amber-100 transition-colors">
                            <span>{classesWithoutStudents.length} فصل بدون طلاب</span>
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    {activePackages.length === 0 && (
                        <button onClick={onGoToPackages} className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-right text-sm text-amber-800 hover:bg-amber-100 transition-colors">
                            <span>لا توجد باقة نشطة — الطلاب لن يصلوا للمحتوى</span>
                            <ChevronLeft size={16} />
                        </button>
                    )}
                </div>
            )}

            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-800">الفصول الدراسية</h3>
                    <button onClick={onAddClass} disabled={isSchoolWorkspaceBusy} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                        <Plus size={14} /> إضافة فصل
                    </button>
                </div>
                {schoolClasses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
                        <Building2 size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-bold text-gray-500">لا توجد فصول حتى الآن</p>
                        <button onClick={onAddClass} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors">إضافة أول فصل</button>
                    </div>
                ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                        {schoolClasses.map((classroom) => {
                            const classStudents = schoolStudents.filter((s) => classroom.studentIds.includes(s.id) || (s.groupIds || []).includes(classroom.id));
                            const classSupervisors = supervisors.filter((u) => classroom.supervisorIds.includes(u.id));
                            return <ClassCard key={classroom.id} classroom={classroom} students={classStudents} classSupervisors={classSupervisors} onGo={onGoToClasses} />;
                        })}
                    </div>
                )}
            </div>

            <div>
                <h3 className="mb-3 text-sm font-black text-gray-800">إجراءات سريعة</h3>
                <div className="grid gap-2 md:grid-cols-3">
                    <button onClick={onGoToImport} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right hover:bg-emerald-100 transition-colors">
                        <Users size={20} className="text-emerald-600 shrink-0" />
                        <div><p className="text-sm font-bold text-emerald-900">استيراد طلاب</p><p className="text-xs text-emerald-700">من Excel أو CSV</p></div>
                    </button>
                    <button onClick={onGoToPackages} className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-right hover:bg-amber-100 transition-colors">
                        <Package size={20} className="text-amber-600 shrink-0" />
                        <div><p className="text-sm font-bold text-amber-900">إدارة الباقات</p><p className="text-xs text-amber-700">فتح الوصول وأكواد التفعيل</p></div>
                    </button>
                    <button onClick={onGoToClasses} className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-right hover:bg-violet-100 transition-colors">
                        <ShieldCheck size={20} className="text-violet-600 shrink-0" />
                        <div><p className="text-sm font-bold text-violet-900">إسناد المشرفين</p><p className="text-xs text-violet-700">ربط مشرف بكل فصل</p></div>
                    </button>
                </div>
            </div>
        </div>
    );
};
