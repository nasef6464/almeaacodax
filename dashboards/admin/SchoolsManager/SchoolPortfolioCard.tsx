import React from 'react';
import { Building2, MoreVertical } from 'lucide-react';
import type { SchoolPortfolioFilterMode, SchoolPortfolioRow, SchoolReadinessTab } from './readinessViewModel';
import { buildSchoolCardReadinessActions } from './schoolCardReadinessViewModel';

interface SchoolPortfolioCardProps {
    row: SchoolPortfolioRow;
    listMode: SchoolPortfolioFilterMode;
    actionsOpen: boolean;
    onToggleActions: () => void;
    onOpenTab: (tab: SchoolReadinessTab) => void;
    onOpenFromMenu: (tab: SchoolReadinessTab) => void;
    onReviewDelete: () => void;
}

export const SchoolPortfolioCard: React.FC<SchoolPortfolioCardProps> = ({
    row,
    listMode,
    actionsOpen,
    onToggleActions,
    onOpenTab,
    onOpenFromMenu,
    onReviewDelete,
}) => {
    const { school } = row;
    const cardReadinessActions = buildSchoolCardReadinessActions(row);
    const nextCardAction = cardReadinessActions.find((action) => !action.isReady);
    const isReady = row.readinessScore === row.readinessTotal;
    const isPartiallyReady = row.readinessScore >= 2;
    const showCleanupReview = row.isCommerciallyHiddenDraft && listMode === 'all';

    return (
        <div
            data-testid="school-card"
            data-cleanup-draft={row.isCommerciallyHiddenDraft ? 'true' : 'false'}
            className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 ${
                showCleanupReview
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-100 hover:border-indigo-100'
            }`}
        >
            <div className="relative flex justify-between items-start mb-4">
                <div className="w-13 h-13 bg-indigo-50/80 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <Building2 size={24} />
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                        isReady
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isPartiallyReady
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {isReady ? 'جاهزة للتشغيل 🟢' : 'قيد التجهيز 🟠'}
                    </span>
                    <button
                        type="button"
                        onClick={onToggleActions}
                        className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="إجراءات تشغيل المدرسة"
                    >
                        <MoreVertical size={18} />
                    </button>
                </div>
                {actionsOpen && (
                    <div className="absolute left-0 top-10 z-20 min-w-[180px] rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        <button
                            type="button"
                            onClick={() => onOpenFromMenu('overview')}
                            className="w-full rounded-xl px-3 py-2 text-right text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                            فتح التشغيل
                        </button>
                        <button
                            type="button"
                            onClick={() => onOpenFromMenu('relations')}
                            className="w-full rounded-xl px-3 py-2 text-right text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        >
                            المشرفون والتسليم
                        </button>
                    </div>
                )}
            </div>

            {showCleanupReview && (
                <div data-testid="school-card-cleanup-badge" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs font-black leading-5 text-amber-900 shadow-sm">
                    مسودة/تجربة معزولة عن الأولوية التجارية. راجعها قبل حذفها حتى لا تحذف عقدًا حقيقيًا بالخطأ.
                </div>
            )}

            <h3 className="text-lg font-black text-gray-900 mb-1">{school.name}</h3>
            <p data-testid="school-card-operating-copy" className="text-xs text-gray-500 mb-4 leading-5">مسار تشغيل المدرسة: فصول، طلاب، مشرفون، باقة/مسارات، أكواد، ثم تقرير تسليم.</p>

            <div data-testid="school-card-readiness" className={`mb-2.5 rounded-2xl px-3.5 py-2 text-xs font-bold flex items-center justify-between border ${
                isReady
                    ? 'bg-emerald-50/70 text-emerald-800 border-emerald-100'
                    : isPartiallyReady
                        ? 'bg-amber-50/70 text-amber-800 border-amber-100'
                        : 'bg-rose-50/70 text-rose-800 border-rose-100'
            }`}>
                <span>{isReady ? 'جاهزة للتشغيل' : 'تحتاج استكمال المسار'}</span>
                <span className="font-black">{row.readinessScore}/{row.readinessTotal}</span>
            </div>
            <div data-testid="school-card-readiness-progress" className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100 p-0.5">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        isReady
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : isPartiallyReady
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                : 'bg-gradient-to-r from-rose-500 to-red-500'
                    }`}
                    style={{ width: `${Math.round((row.readinessScore / row.readinessTotal) * 100)}%` }}
                />
            </div>

            <div data-testid="school-card-next-action-panel" className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black text-gray-400">الخطوة التالية</p>
                    <span className="rounded-full bg-white border border-gray-100 px-2.5 py-0.5 text-[11px] font-black text-gray-700 shadow-sm">
                        {nextCardAction ? nextCardAction.label : 'جاهزة'}
                    </span>
                </div>
                <p className="text-xs font-bold text-gray-800 leading-5">
                    {nextCardAction ? nextCardAction.hint : 'افتح تشغيل المدرسة لمراجعة التسليم أو التقرير.'}
                </p>
                <button
                    type="button"
                    data-testid="school-card-next-action"
                    onClick={() => onOpenTab(nextCardAction?.tab || 'overview')}
                    className="w-full rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-black text-white transition-all hover:bg-indigo-700 shadow-md shadow-indigo-100"
                >
                    {nextCardAction ? `ابدأ: ${nextCardAction.label}` : 'فتح مراجعة التسليم'}
                </button>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {cardReadinessActions.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            data-testid={`school-card-step-${action.id}`}
                            onClick={() => onOpenTab(action.tab)}
                            className={`rounded-xl px-2 py-1.5 text-[10px] font-black transition-all border ${
                                action.isReady
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                            }`}
                        >
                            {action.label} {action.isReady ? '✓' : '•'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 text-center">
                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">طلاب</p>
                    <p className="font-black text-gray-900 text-sm">{row.studentCount}</p>
                </div>
                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 text-center">
                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">باقات</p>
                    <p className="font-black text-gray-900 text-sm">{row.activePackageCount}</p>
                </div>
                <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 text-center">
                    <p className="text-[11px] text-gray-500 font-bold mb-0.5">أكواد</p>
                    <p className="font-black text-gray-900 text-sm">{row.activeCodeCount}</p>
                </div>
            </div>

            <button
                type="button"
                data-testid="school-card-open-management"
                onClick={() => onOpenTab('overview')}
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black hover:bg-black transition-all shadow-md text-xs"
            >
                فتح تشغيل المدرسة
            </button>
            {showCleanupReview && (
                <button
                    type="button"
                    data-testid="school-card-review-delete"
                    onClick={onReviewDelete}
                    className="mt-2 w-full rounded-xl border border-red-100 bg-white px-3 py-2.5 text-xs font-black text-red-600 transition-colors hover:bg-red-50"
                >
                    مراجعة الحذف
                </button>
            )}
        </div>
    );
};
