import React from 'react';

export interface StudentMasteryGoal {
    id: string;
    userId: string;
    pathId: string;
    subjectId?: string;
    targetType: 'topic' | 'section' | 'path';
    targetId: string;
    title: string;
    targetMastery: number;
    horizon: 'short' | 'long';
    dueDate?: string;
    status: 'active' | 'achieved' | 'archived';
}

interface Props {
    goals: StudentMasteryGoal[];
    loading?: boolean;
    saving?: boolean;
    canCreateShort: boolean;
    canCreateLong: boolean;
    onCreateShort: () => void;
    onCreateLong: () => void;
    onSetStatus: (goalId: string, status: 'achieved' | 'archived') => void;
}

const formatDate = (value?: string) => {
    if (!value) return 'بدون موعد محدد';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const StudentMasteryGoalsPanel: React.FC<Props> = ({
    goals,
    loading = false,
    saving = false,
    canCreateShort,
    canCreateLong,
    onCreateShort,
    onCreateLong,
    onSetStatus,
}) => (
    <section className="rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5" data-testid="student-mastery-goals">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <div className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                    أهداف الإتقان
                </div>
                <h2 className="mt-2 text-lg font-black text-gray-900">هدف قريب وهدف للمسار</h2>
                <p className="mt-1 text-sm font-bold leading-7 text-gray-500">
                    الهدف لا يغير درجتك؛ هو علامة متابعة مبنية على نفس المسار والمادة.
                </p>
            </div>
            <div className="print-hide flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={onCreateShort}
                    disabled={!canCreateShort || saving}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    هدف قصير
                </button>
                <button
                    type="button"
                    onClick={onCreateLong}
                    disabled={!canCreateLong || saving}
                    className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    هدف طويل
                </button>
            </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
            {loading ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">جاري تحميل الأهداف...</div>
            ) : goals.length ? goals.map((goal) => (
                <article key={goal.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                                {goal.horizon === 'short' ? 'قصير' : 'طويل'}
                            </span>
                            <h3 className="mt-2 font-black leading-7 text-gray-900">{goal.title}</h3>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-2 text-center">
                            <div className="text-lg font-black text-indigo-700">{goal.targetMastery}%</div>
                            <div className="text-[10px] font-bold text-gray-400">الهدف</div>
                        </div>
                    </div>
                    <p className="mt-2 text-xs font-bold text-gray-500">{formatDate(goal.dueDate)}</p>
                    <div className="print-hide mt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={() => onSetStatus(goal.id, 'achieved')}
                            disabled={saving}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-emerald-700 disabled:opacity-50"
                        >
                            تحقق
                        </button>
                        <button
                            type="button"
                            onClick={() => onSetStatus(goal.id, 'archived')}
                            disabled={saving}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 disabled:opacity-50"
                        >
                            أرشفة
                        </button>
                    </div>
                </article>
            )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-bold leading-7 text-slate-500 md:col-span-2">
                    لا يوجد هدف إتقان نشط بعد. اختر هدفًا قصيرًا للمهارة الحالية أو هدفًا طويلًا للمسار.
                </div>
            )}
        </div>
    </section>
);
