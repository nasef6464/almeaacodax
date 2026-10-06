import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { SchoolOperatingStep, SchoolWorkspaceTab } from './workspaceViewModel';

interface SchoolLaunchBoardPanelProps {
    schoolName: string;
    readinessStatusLabel: string;
    readinessNextStep: string;
    readinessScore: number;
    readinessTotal: number;
    readinessPercent: number;
    commercialOperatingSteps: SchoolOperatingStep[];
    expandedSchoolStep: SchoolWorkspaceTab | null;
    onBack: () => void;
    onCollapseSteps: () => void;
    onSelectStep: (tab: SchoolWorkspaceTab) => void;
}

export const SchoolLaunchBoardPanel: React.FC<SchoolLaunchBoardPanelProps> = ({
    schoolName,
    readinessStatusLabel,
    readinessNextStep,
    readinessScore,
    readinessTotal,
    readinessPercent,
    commercialOperatingSteps,
    expandedSchoolStep,
    onBack,
    onCollapseSteps,
    onSelectStep,
}) => (
    <section data-testid="school-ux-launch-board" className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-2 inline-flex items-center text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    &rarr; عودة لقائمة المدارس
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-gray-950">{schoolName}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-black border ${
                        readinessScore === readinessTotal
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : readinessScore >= 3
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {readinessStatusLabel} ({readinessPercent}%)
                    </span>
                </div>
                <p data-testid="school-ux-next-action" className="mt-1.5 text-xs font-bold leading-6 text-gray-600">{readinessNextStep}</p>
            </div>

            <div className="min-w-[240px] space-y-2">
                <div className="flex justify-between items-center text-xs font-black text-gray-500">
                    <span>نسبة الإنجاز</span>
                    <span>{readinessScore}/{readinessTotal} خطوات</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 p-0.5">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            readinessScore === readinessTotal ? 'bg-emerald-500' : readinessScore >= 3 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${readinessPercent}%` }}
                    />
                </div>
            </div>
        </div>

        <div>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">مسار إعداد ومتابعة المدرسة</h3>
                {expandedSchoolStep && (
                    <button
                        type="button"
                        onClick={onCollapseSteps}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    >
                        <ChevronDown size={14} />
                        <span>طي شريط الخطوات</span>
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {commercialOperatingSteps.map((step, index) => {
                    const isOpen = expandedSchoolStep === step.tab;
                    return (
                        <button
                            key={step.id}
                            type="button"
                            data-testid={`school-ux-step-${step.id}`}
                            onClick={() => onSelectStep(step.tab)}
                            className={`rounded-2xl border p-3.5 text-right transition-all flex flex-col justify-between h-full ${
                                isOpen
                                    ? 'border-indigo-600 bg-indigo-950 text-white shadow-md'
                                    : step.isReady
                                        ? 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950'
                                        : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 text-slate-900'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                                    isOpen ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-sm border border-slate-100'
                                }`}>
                                    {index + 1}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                    isOpen ? 'bg-white/20 text-white' : step.isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {step.statusLabel}
                                </span>
                            </div>
                            <div>
                                <span className={`block text-xs font-black ${isOpen ? 'text-white' : 'text-gray-950'}`}>{step.title}</span>
                                <span className={`mt-0.5 block text-[11px] font-bold ${isOpen ? 'text-white/70' : 'text-slate-500'}`}>{step.metric}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    </section>
);
