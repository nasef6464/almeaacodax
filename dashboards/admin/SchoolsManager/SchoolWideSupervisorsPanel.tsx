import React from 'react';
import { UserPlus } from 'lucide-react';
import type { User } from '../../../types';
import type { SupervisorScopeRow } from './relationshipViewModel';

interface SchoolWideSupervisorsPanelProps {
    schoolLevelSupervisors: User[];
    classScopedSupervisors: User[];
    supervisorScopeRows: SupervisorScopeRow[];
    supervisors: User[];
    rosterActionPending: string | null;
    onOpenSupervisorEntry: () => void;
    onAssignSupervisor: (userId: string) => Promise<void>;
    onRemoveSupervisor: (user: User) => void;
}

export const SchoolWideSupervisorsPanel: React.FC<SchoolWideSupervisorsPanelProps> = ({
    schoolLevelSupervisors,
    classScopedSupervisors,
    supervisorScopeRows,
    supervisors,
    rosterActionPending,
    onOpenSupervisorEntry,
    onAssignSupervisor,
    onRemoveSupervisor,
}) => {
    const availableSupervisors = supervisors.filter(
        (currentUser) => !schoolLevelSupervisors.some((supervisor) => supervisor.id === currentUser.id),
    );

    return (
        <div data-testid="school-wide-supervisors-panel" className="border border-gray-100 rounded-xl p-5 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-lg font-bold text-gray-900">مدير/مشرف المدرسة كاملة</h3>
                <span className="text-sm text-gray-500">{schoolLevelSupervisors.length} يرى المدرسة كاملة</span>
            </div>
            <p className="text-xs font-bold leading-6 text-gray-500">
                هذا النطاق مناسب لمدير المدرسة أو المسؤول العام؛ سيظهر له كل الفصول والطلاب والتقارير داخل هذه المدرسة.
            </p>
            <div data-testid="school-supervisor-scope-decision" className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-emerald-900">مدير المدرسة كاملة</span>
                        <span data-testid="school-supervisor-schoolwide-count" className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">
                            {schoolLevelSupervisors.length}
                        </span>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-6 text-emerald-800">
                        يرى كل الفصول والطلاب وتقارير المدرسة. استخدمه لمدير المدرسة أو المشرف العام.
                    </p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-blue-900">مشرف فصول محددة</span>
                        <span data-testid="school-supervisor-class-count" className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
                            {classScopedSupervisors.length}
                        </span>
                    </div>
                    <p className="mt-2 text-xs font-bold leading-6 text-blue-800">
                        يرى الفصول التي تم ربطه بها فقط. استخدمه للمعلم أو مشرف الفصل.
                    </p>
                </div>
            </div>
            <div data-testid="school-supervisor-single-entry-note" className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-black text-purple-800">
                            <UserPlus size={16} />
                            إضافة المشرفين من مكان واحد
                        </div>
                        <p className="text-xs font-bold leading-6 text-purple-900">
                            حتى لا تتكرر نفس المهمة، يتم إنشاء مدير المدرسة أو مشرف الفصل من تبويب المشرفون والتسليم فقط. هذه البطاقة تعرض النطاق الحالي وتوجهك للمكان الصحيح.
                        </p>
                    </div>
                    <button
                        type="button"
                        data-testid="school-open-supervisor-entry"
                        onClick={onOpenSupervisorEntry}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-purple-800"
                    >
                        <UserPlus size={16} />
                        فتح إضافة المشرف
                    </button>
                </div>
            </div>
            <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                defaultValue=""
                onChange={(event) => {
                    const target = event.currentTarget;
                    const value = event.target.value;
                    if (!value) return;
                    void onAssignSupervisor(value).finally(() => {
                        target.value = '';
                    });
                }}
                disabled={Boolean(rosterActionPending)}
            >
                <option value="">إضافة مدير/مشرف للمدرسة كاملة</option>
                {availableSupervisors.map((currentUser) => (
                    <option key={currentUser.id} value={currentUser.id}>{currentUser.name}</option>
                ))}
            </select>
            {availableSupervisors.length === 0 && (
                <p className="text-xs font-bold leading-6 text-amber-700">
                    لا يوجد مشرفون متاحون، أنشئ مشرفًا جديدًا أو حرر مشرفًا مرتبطًا بنطاق آخر.
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                {schoolLevelSupervisors.length === 0 ? (
                    <span className="text-sm text-gray-400">لا يوجد مدير أو مشرف عام لهذه المدرسة بعد.</span>
                ) : schoolLevelSupervisors.map((currentUser) => (
                    <button
                        key={currentUser.id}
                        type="button"
                        data-testid="school-remove-school-supervisor"
                        onClick={() => onRemoveSupervisor(currentUser)}
                        disabled={Boolean(rosterActionPending)}
                        className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
                    >
                        {currentUser.name} ×
                    </button>
                ))}
            </div>
            <div data-testid="school-supervisor-scope-summary" className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-700">نطاقات المشرفين</span>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                        {classScopedSupervisors.length} للفصول فقط
                    </span>
                </div>
                <div className="space-y-2">
                    {supervisorScopeRows.length === 0 ? (
                        <p className="text-xs font-bold text-slate-500">اربط مشرفًا بالمدرسة أو فصلًا محددًا لتظهر الصلاحيات هنا.</p>
                    ) : supervisorScopeRows.map((row) => (
                        <div key={row.user.id} data-testid={row.isSchoolWide ? 'school-supervisor-scope-school' : 'school-supervisor-scope-class'} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                            <div>
                                <p className="text-xs font-black text-gray-900">{row.user.name}</p>
                                <p className="text-[11px] font-bold text-gray-500">{row.scopeDetails}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${
                                row.isSchoolWide ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                                {row.scopeLabel}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
