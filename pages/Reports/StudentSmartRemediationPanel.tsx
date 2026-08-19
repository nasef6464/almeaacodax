import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { displayText } from './reportDomain';
import type { SmartRemediationPlan } from './reportTypes';

interface StudentSmartRemediationPanelProps {
    visible: boolean;
    plan: SmartRemediationPlan | null;
}

export const StudentSmartRemediationPanel: React.FC<StudentSmartRemediationPanelProps> = ({ visible, plan }) => {
    if (!visible || !plan) return null;

    return (
        <Card className="p-4 sm:p-6 border-0 shadow-sm bg-gradient-to-br from-amber-50 via-white to-emerald-50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                        <Sparkles size={14} />
                        خطة علاجية مولدة من أدائك
                    </div>
                    <h2 className="text-xl font-black text-gray-900">{displayText(plan.title) || 'خطة علاجية قصيرة'}</h2>
                    <p className="mt-2 max-w-4xl text-sm leading-7 text-gray-600">
                        {displayText(plan.summary) || 'ابدأ بأضعف مهارة، راجع شرحًا بسيطًا، ثم حل تدريبًا قصيرًا وأعد القياس.'}
                    </p>
                </div>
                <Link to="/plan" className="self-start rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                    تحويلها لخطة مذاكرة
                </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
                {(plan.steps || []).slice(0, 3).map((step, index) => (
                    <div key={`${step.day || index}-${step.skill || index}`} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                                {displayText(step.day) || `اليوم ${index + 1}`}
                            </span>
                            <CheckCircle size={18} className="text-emerald-500" />
                        </div>
                        <div className="mt-3 text-base font-black leading-7 text-gray-900">{displayText(step.skill) || 'مهارة تحتاج متابعة'}</div>
                        <p className="mt-2 text-sm leading-7 text-gray-600">{displayText(step.action) || 'راجع شرحًا قصيرًا ثم حل تدريبًا بسيطًا.'}</p>
                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                            التحقق: {displayText(step.check) || 'أعد القياس بسؤال أو اختبار قصير.'}
                        </div>
                    </div>
                ))}
            </div>

            {plan.parentNote ? (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-7 text-emerald-800">
                    ملاحظة لولي الأمر: {displayText(plan.parentNote)}
                </div>
            ) : null}
        </Card>
    );
};
