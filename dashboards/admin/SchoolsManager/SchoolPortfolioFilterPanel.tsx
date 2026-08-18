import React from 'react';
import { Search } from 'lucide-react';

export type SchoolListMode = 'active' | 'needs_setup' | 'ready' | 'all';

interface SchoolPortfolioFilterPanelProps {
    schoolSearch: string;
    schoolListMode: SchoolListMode;
    filteredSchoolsCount: number;
    schoolsCount: number;
    hiddenDraftSchoolsCount: number;
    visibleDraftSchoolsCount: number;
    onSearchChange: (value: string) => void;
    onModeChange: (mode: SchoolListMode) => void;
}

export const SchoolPortfolioFilterPanel: React.FC<SchoolPortfolioFilterPanelProps> = ({
    schoolSearch,
    schoolListMode,
    filteredSchoolsCount,
    schoolsCount,
    hiddenDraftSchoolsCount,
    visibleDraftSchoolsCount,
    onSearchChange,
    onModeChange,
}) => (
    <div data-testid="school-portfolio-filter-panel" className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <Search size={18} className="text-gray-400" />
                <input
                    value={schoolSearch}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="ابحث باسم المدرسة أو الجهة..."
                    className="w-full bg-transparent text-sm text-gray-700 outline-none"
                />
            </div>
            <div data-testid="school-list-mode-filter" className="flex flex-wrap gap-2">
                {[
                    { id: 'active', label: 'الأولوية التجارية' },
                    { id: 'needs_setup', label: 'تحتاج تجهيز' },
                    { id: 'ready', label: 'جاهزة' },
                    { id: 'all', label: 'عرض الكل/التنظيف' },
                ].map((mode) => (
                    <button
                        key={mode.id}
                        type="button"
                        data-testid={`school-list-mode-${mode.id}`}
                        onClick={() => onModeChange(mode.id as SchoolListMode)}
                        className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
                            schoolListMode === mode.id
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>
        </div>
        <div data-testid="school-list-hygiene-summary" className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold leading-6 text-slate-700">
            القائمة تعرض {filteredSchoolsCount} من {schoolsCount} مدرسة.
            {hiddenDraftSchoolsCount > 0
                ? ` تم عزل ${hiddenDraftSchoolsCount} مدرسة مسودة أو تجريبية عن الأولوية التجارية.`
                : ' لا توجد مدارس تجريبية معزولة حاليًا.'}
            {schoolListMode === 'all' ? ' أنت الآن في وضع المراجعة والتنظيف.' : ' استخدم عرض الكل/التنظيف عند مراجعة التجارب القديمة.'}
        </div>
        {schoolListMode === 'active' && hiddenDraftSchoolsCount > 0 && !schoolSearch.trim() && (
            <div data-testid="school-hidden-drafts-note" className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>تم إخفاء {hiddenDraftSchoolsCount} مدرسة مسودة أو تجريبية لتقليل الزحمة. افتح وضع التنظيف لمراجعتها أو حذف التجارب فقط.</span>
                    <button
                        type="button"
                        data-testid="school-open-cleanup-mode"
                        onClick={() => onModeChange('all')}
                        className="inline-flex w-fit items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-amber-700"
                    >
                        فتح وضع التنظيف
                    </button>
                </div>
            </div>
        )}
        {schoolListMode === 'all' && (
            <div data-testid="school-cleanup-review-panel" className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold leading-6 text-amber-900">
                وضع التنظيف يعرض العقود والتجارب معًا للمراجعة. التجارب المعزولة تظهر بعلامة واضحة وزر "مراجعة الحذف"، ولا يتم حذف أي مدرسة إلا من لوحة التأكيد.
                {visibleDraftSchoolsCount > 0
                    ? ` يظهر الآن ${visibleDraftSchoolsCount} مدرسة مسودة أو تجريبية داخل القائمة.`
                    : ' لا تظهر مدارس تجريبية في نتيجة البحث الحالية.'}
            </div>
        )}
    </div>
);
