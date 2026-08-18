import React from 'react';
import { UserPlus } from 'lucide-react';
import type { Group } from '../../../types';
import type { QuickSupervisorDraft } from './contracts';

interface SchoolQuickSupervisorCardProps {
    quickSupervisor: QuickSupervisorDraft;
    setQuickSupervisor: React.Dispatch<React.SetStateAction<QuickSupervisorDraft>>;
    schoolClasses: Group[];
    handleCreateQuickSupervisor: () => Promise<void>;
    rosterActionPending: string | null;
}

export const SchoolQuickSupervisorCard: React.FC<SchoolQuickSupervisorCardProps> = ({
    quickSupervisor,
    setQuickSupervisor,
    schoolClasses,
    handleCreateQuickSupervisor,
    rosterActionPending,
}) => (
    <div data-testid="school-relations-quick-supervisor-card" className="rounded-2xl border border-purple-100 bg-purple-50/70 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-purple-700">
                    <UserPlus size={14} />
                    إضافة مشرف من نفس التبويب
                </div>
                <h3 className="mt-3 text-lg font-black text-gray-900">مدير مدرسة أو مشرف فصل</h3>
                <p className="mt-1 text-sm font-bold leading-7 text-purple-900">
                    استخدم هذا النموذج للحساب الواحد: اختر المدرسة كاملة لمدير المدرسة، أو اختر فصلًا لمشرف الفصل.
                </p>
            </div>
            <div className="rounded-2xl border border-white bg-white px-4 py-3 text-xs font-bold leading-6 text-gray-600">
                لا تحتاج للرجوع إلى النظرة العامة لإضافة مشرف.
            </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
            <input
                data-testid="school-relations-supervisor-name"
                value={quickSupervisor.name}
                onChange={(event) => setQuickSupervisor((current) => ({ ...current, name: event.target.value }))}
                placeholder="اسم المشرف"
                className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
                data-testid="school-relations-supervisor-email"
                value={quickSupervisor.email}
                onChange={(event) => setQuickSupervisor((current) => ({ ...current, email: event.target.value }))}
                placeholder="بريد المشرف"
                className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
                data-testid="school-relations-supervisor-password"
                value={quickSupervisor.password}
                onChange={(event) => setQuickSupervisor((current) => ({ ...current, password: event.target.value }))}
                placeholder="كلمة مرور اختيارية"
                className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />
            <select
                data-testid="school-relations-supervisor-scope"
                value={quickSupervisor.targetGroupId}
                onChange={(event) => setQuickSupervisor((current) => ({ ...current, targetGroupId: event.target.value }))}
                className="rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            >
                <option value="">المدرسة كاملة</option>
                {schoolClasses.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>فصل: {classroom.name}</option>
                ))}
            </select>
        </div>
        <button
            type="button"
            data-testid="school-relations-supervisor-submit"
            onClick={() => void handleCreateQuickSupervisor()}
            disabled={Boolean(rosterActionPending)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-purple-800"
        >
            <UserPlus size={16} />
            إنشاء/ربط المشرف
        </button>
    </div>
);
