import React from 'react';
import { Building2, Download, ShieldCheck } from 'lucide-react';
import type {
    SchoolDecisionCard,
    SchoolOperatingStep,
    SchoolWorkspaceReadinessCheck,
    SchoolWorkspaceTab,
} from './workspaceViewModel';

interface SchoolCommandCenterPanelProps {
    readinessStatusLabel: string;
    readinessNextStep: string;
    readinessScore: number;
    readinessChecks: SchoolWorkspaceReadinessCheck[];
    readinessPercent: number;
    visibleReadinessGaps: SchoolWorkspaceReadinessCheck[];
    commercialDecisionCards: SchoolDecisionCard[];
    handoverBlockingGaps: SchoolWorkspaceReadinessCheck[];
    handoverDecisionTitle: string;
    handoverDecisionCopy: string;
    nextOperatingStep: SchoolOperatingStep;
    commercialOperatingSteps: SchoolOperatingStep[];
    currentOperatingStepIndex: number;
    expandedSchoolStep: SchoolWorkspaceTab | null;
    isSchoolWorkspaceBusy: boolean;
    onDownloadHandover: () => void;
    onSelectTab: (tab: SchoolWorkspaceTab) => void;
    onCommercialDecision: (card: SchoolDecisionCard) => void;
    onSelectJourneyStep: (tab: SchoolWorkspaceTab) => void;
    onAddClass: () => Promise<void> | void;
    onAddStudent: () => void;
    onAddSupervisor: () => void;
    onOpenPortal: () => void;
}

export const SchoolCommandCenterPanel: React.FC<SchoolCommandCenterPanelProps> = ({
    readinessStatusLabel,
    readinessNextStep,
    readinessScore,
    readinessChecks,
    readinessPercent,
    visibleReadinessGaps,
    commercialDecisionCards,
    handoverBlockingGaps,
    handoverDecisionTitle,
    handoverDecisionCopy,
    nextOperatingStep,
    commercialOperatingSteps,
    currentOperatingStepIndex,
    expandedSchoolStep,
    isSchoolWorkspaceBusy,
    onDownloadHandover,
    onSelectTab,
    onCommercialDecision,
    onSelectJourneyStep,
    onAddClass,
    onAddStudent,
    onAddSupervisor,
    onOpenPortal,
}) => (
    <div data-testid="school-command-center" className="hidden">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    <Building2 size={14} />
                    مركز تشغيل المدرسة
                </div>
                <h2 className="mt-3 text-lg font-black text-gray-900">{readinessStatusLabel}</h2>
                <p data-testid="school-next-action" className="mt-1 text-sm font-bold leading-7 text-gray-600">{readinessNextStep}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    readinessScore === readinessChecks.length
                        ? 'bg-emerald-100 text-emerald-700'
                        : readinessScore >= 3
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                }`}>
                    {readinessScore}/{readinessChecks.length} جاهز
                </span>
                <button
                    type="button"
                    onClick={onDownloadHandover}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-amber-600"
                >
                    <Download size={16} />
                    ملف التسليم
                </button>
            </div>
        </div>
        <div className="mb-4 grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                    <span>نسبة الجاهزية</span>
                    <span>{readinessPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                    <div
                        className={`h-2 rounded-full ${readinessScore === readinessChecks.length ? 'bg-emerald-500' : readinessScore >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${readinessPercent}%` }}
                    />
                </div>
                <p className="mt-3 text-xs font-bold leading-6 text-slate-600">
                    {readinessScore === readinessChecks.length ? 'جاهزة للتجربة والتسليم.' : `${readinessScore}/${readinessChecks.length} بنود جاهزة.`}
                </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-gray-900">أهم النواقص الآن</span>
                    <button
                        type="button"
                        onClick={() => onSelectTab('reports')}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100"
                    >
                        التفاصيل في التقرير
                    </button>
                </div>
                {visibleReadinessGaps.length === 0 ? (
                    <p className="text-sm font-bold text-emerald-700">لا توجد نواقص تشغيلية تمنع التجربة.</p>
                ) : (
                    <div className="grid gap-2 md:grid-cols-3">
                        {visibleReadinessGaps.map((gap) => (
                            <button
                                key={gap.label}
                                type="button"
                                onClick={() => onSelectTab(gap.tab)}
                                className="rounded-xl bg-white px-3 py-2 text-right text-xs font-bold leading-5 text-amber-900 transition-colors hover:bg-amber-100"
                            >
                                <span className="block font-black">{gap.label}</span>
                                {gap.hint}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
        <div data-testid="school-commercial-summary-strip" className="hidden">
            {commercialDecisionCards.map((card) => (
                <button
                    key={card.id}
                    type="button"
                    data-testid={`school-commercial-decision-${card.id}`}
                    onClick={() => onCommercialDecision(card)}
                    className={`rounded-2xl border p-4 text-right transition-colors ${
                        card.tone === 'emerald'
                            ? 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100'
                            : card.tone === 'amber'
                                ? 'border-amber-100 bg-amber-50 hover:bg-amber-100'
                                : card.tone === 'rose'
                                    ? 'border-rose-100 bg-rose-50 hover:bg-rose-100'
                                    : card.tone === 'blue'
                                        ? 'border-blue-100 bg-blue-50 hover:bg-blue-100'
                                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                >
                    <div className="text-xs font-black text-slate-500">{card.label}</div>
                    <div className="mt-2 text-base font-black text-gray-900">{card.value}</div>
                    <p className="mt-2 min-h-[44px] text-xs font-bold leading-6 text-gray-600">{card.hint}</p>
                </button>
            ))}
        </div>
        <div data-testid="school-handover-decision-board" className={`hidden ${
            handoverBlockingGaps.length === 0
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-amber-100 bg-amber-50'
        }`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                        handoverBlockingGaps.length === 0
                            ? 'bg-white text-emerald-700'
                            : 'bg-white text-amber-800'
                    }`}>
                        <ShieldCheck size={14} />
                        قرار التسليم
                    </div>
                    <h3 className="mt-3 text-lg font-black text-gray-900">{handoverDecisionTitle}</h3>
                    <p className="mt-1 text-sm font-bold leading-7 text-gray-700">{handoverDecisionCopy}</p>
                </div>
                <button
                    type="button"
                    data-testid="school-handover-decision-report"
                    onClick={() => onSelectTab('reports')}
                    className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-amber-600"
                >
                    فتح تقرير التسليم
                </button>
            </div>
            <div data-testid="school-handover-decision-items" className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {(handoverBlockingGaps.length > 0 ? handoverBlockingGaps : readinessChecks).map((item, index) => (
                    <button
                        key={`${item.label}-${index}`}
                        type="button"
                        data-testid={`school-handover-decision-item-${index}`}
                        onClick={() => onSelectTab(item.tab)}
                        className={`rounded-xl border bg-white px-3 py-2 text-right transition-colors hover:bg-gray-50 ${
                            item.isReady ? 'border-emerald-100' : 'border-amber-200'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-gray-900">{item.label}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                item.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                                {item.isReady ? 'جاهز' : 'ناقص'}
                            </span>
                        </div>
                        <p className="mt-1 text-xs font-bold leading-5 text-gray-600">{item.hint}</p>
                    </button>
                ))}
            </div>
        </div>
        <div data-testid="school-delivery-journey" className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="text-xs font-black text-slate-500">مسار تسليم المدرسة</div>
                    <h3 className="mt-1 text-base font-black text-gray-900">
                        الخطوة الحالية: {nextOperatingStep.title}
                    </h3>
                    <p className="mt-1 text-sm font-bold leading-6 text-gray-600">
                        {nextOperatingStep.description}
                    </p>
                </div>
                <button
                    type="button"
                    data-testid="school-next-step-button"
                    onClick={() => onSelectTab(nextOperatingStep.tab)}
                    className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-amber-600"
                >
                    {nextOperatingStep.buttonLabel}
                </button>
            </div>
            <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                    <span>{readinessPercent}% جاهزية تشغيل</span>
                    <span>{readinessScore}/{readinessChecks.length}</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                    <div
                        className={`h-2 rounded-full ${readinessScore === readinessChecks.length ? 'bg-emerald-500' : readinessScore >= 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${readinessPercent}%` }}
                    />
                </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-5">
                {commercialOperatingSteps.map((step, index) => (
                    <button
                        key={step.id}
                        type="button"
                        data-testid={`school-delivery-journey-step-${step.id}`}
                        onClick={() => onSelectJourneyStep(step.tab)}
                        className={`rounded-xl border px-3 py-3 text-right transition-colors ${
                            expandedSchoolStep === step.tab
                                ? 'border-slate-300 bg-slate-900 text-white shadow-sm'
                                : step.isReady
                                    ? 'border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50'
                                    : index === currentOperatingStepIndex
                                        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                        : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                        <span className="block text-[11px] font-black text-slate-400">مرحلة {index + 1}</span>
                        <span className={`mt-1 block text-sm font-black ${expandedSchoolStep === step.tab ? 'text-white' : 'text-gray-900'}`}>{step.title}</span>
                        <span className="mt-1 block text-xs font-bold leading-5">{step.metric}</span>
                        <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-black ${expandedSchoolStep === step.tab ? 'bg-white/15 text-white' : 'bg-white text-gray-700'}`}>
                            {step.buttonLabel}
                        </span>
                    </button>
                ))}
            </div>
        </div>
        <div data-testid="school-setup-progress" className="hidden">
            {commercialOperatingSteps.map((step, index) => (
                <div
                    key={step.id}
                    data-testid={`school-commercial-step-${step.id}`}
                    className={`rounded-2xl border p-4 ${
                        step.isReady
                            ? 'border-emerald-100 bg-emerald-50'
                            : 'border-amber-100 bg-amber-50'
                    }`}
                >
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-gray-900">
                            {index + 1}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            step.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {step.statusLabel}
                        </span>
                    </div>
                    <p className="text-sm font-black text-gray-900">{step.title}</p>
                    <p className="mt-1 text-xl font-black text-gray-900">{step.metric}</p>
                    <p className="mt-2 min-h-[44px] text-xs font-bold leading-6 text-gray-600">{step.description}</p>
                    <button
                        type="button"
                        onClick={() => onSelectTab(step.tab)}
                        className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-800 transition-colors hover:bg-gray-900 hover:text-white"
                    >
                        {step.buttonLabel}
                    </button>
                </div>
            ))}
        </div>
        <div data-testid="school-primary-actions" className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
            <button
                type="button"
                data-testid="school-primary-add-class"
                disabled={isSchoolWorkspaceBusy}
                onClick={() => void onAddClass()}
                className="rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white transition-colors hover:bg-slate-800"
            >
                إضافة فصل
            </button>
            <button
                type="button"
                data-testid="school-primary-add-student"
                onClick={onAddStudent}
                className="rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-black text-indigo-700 transition-colors hover:bg-indigo-100"
            >
                إضافة طالب
            </button>
            <button
                type="button"
                data-testid="school-primary-add-supervisor"
                onClick={onAddSupervisor}
                className="rounded-xl bg-purple-50 px-3 py-2.5 text-xs font-black text-purple-700 transition-colors hover:bg-purple-100"
            >
                إضافة مشرف
            </button>
            <button
                type="button"
                data-testid="school-primary-open-packages"
                onClick={() => onSelectTab('packages')}
                className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-100"
            >
                الباقة والمسارات
            </button>
            <button
                type="button"
                data-testid="school-primary-open-reports"
                onClick={() => onSelectTab('reports')}
                className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100"
            >
                تقرير التسليم
            </button>
            <button
                type="button"
                data-testid="school-primary-open-portal"
                onClick={onOpenPortal}
                className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700 transition-colors hover:bg-slate-100"
            >
                بوابة المتابعة
            </button>
        </div>
    </div>
);
