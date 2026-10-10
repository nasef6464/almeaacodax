import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Copy, Loader2, Share2, Sparkles } from 'lucide-react';
import { displayText, buildSkillSessionLink, type ScopedAnalyticsOverview, type SmartRemediationPlan } from './reportDomain';
import type { ScopedInterventionPlanItem } from './scopedAnalyticsViewModel';
type Action = () => void | Promise<void>;

interface Props {
  scopedAnalytics: ScopedAnalyticsOverview;
  scopedFollowUpSummary: string | null;
  scopedLeadStudent: ScopedAnalyticsOverview['weakestStudents'][number] | null;
  scopedLeadSkill: ScopedAnalyticsOverview['weakestSkills'][number] | null;
  scopedLeadSubject: ScopedAnalyticsOverview['subjectSummaries'][number] | null;
  scopedInterventionPlan: ScopedInterventionPlanItem[];
  scopedSmartRemediation: SmartRemediationPlan | null;
  scopedSmartRemediationLoading: boolean;
  copiedScopedSummary: boolean;
  sharedScopedSummary: boolean;
  copyScopedSummary: Action;
  shareScopedSummary: Action;
  copyLeadStudentSummary: Action;
  buildScopedSmartRemediation: Action;
}

export const StaffRemediationPanel = ({
  scopedAnalytics,
  scopedFollowUpSummary,
  scopedLeadStudent,
  scopedLeadSkill,
  scopedLeadSubject,
  scopedInterventionPlan,
  scopedSmartRemediation,
  scopedSmartRemediationLoading,
  copiedScopedSummary,
  sharedScopedSummary,
  copyScopedSummary,
  shareScopedSummary,
  copyLeadStudentSummary,
  buildScopedSmartRemediation,
}: Props) => (
  <>
    <div className="rounded-3xl border border-gray-100 bg-slate-50/70 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
            <div>
                <div className="text-lg font-black text-gray-900">خطة تدخل مختصرة</div>
                <p className="text-sm leading-6 text-gray-500">تشخيص، تدخل، ثم قياس.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={copyScopedSummary}
                    className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 hover:bg-indigo-50"
                >
                    {copiedScopedSummary ? <CheckCircle size={13} /> : <Copy size={13} />}
                    {copiedScopedSummary ? 'تم' : 'نسخ'}
                </button>
                <button
                    onClick={shareScopedSummary}
                    className="print-hide inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                >
                    {sharedScopedSummary ? <CheckCircle size={13} /> : <Share2 size={13} />}
                    {sharedScopedSummary ? 'تم' : 'مشاركة'}
                </button>
                <button
                    onClick={buildScopedSmartRemediation}
                    disabled={scopedSmartRemediationLoading || !scopedAnalytics.weakestSkills.length}
                    className="print-hide inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {scopedSmartRemediationLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {scopedSmartRemediationLoading ? 'تجهيز' : 'اقتراح'}
                </button>
            </div>
        </div>
        {scopedFollowUpSummary ? (
            <div className="mb-3 rounded-2xl border border-white bg-white/70 p-3 text-xs font-bold leading-6 text-slate-600">
                {scopedFollowUpSummary}
            </div>
        ) : null}
        <div className="mb-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-rose-100 bg-white p-3">
                <div className="text-xs font-black text-rose-600">أولوية الطالب</div>
                <div className="mt-2 text-base font-black leading-6 text-gray-900">
                    {displayText(scopedLeadStudent?.name) || 'بانتظار ظهور طالب يحتاج متابعة'}
                </div>
                <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                    {scopedLeadStudent
                        ? `${scopedLeadStudent.averageScore}% - ${scopedLeadStudent.weakSkillCount} مهارات`
                        : 'تظهر بعد توفر بيانات كافية.'}
                </p>
                {scopedLeadStudent ? (
                    <div className="print-hide mt-2 flex flex-wrap gap-2">
                        <button
                            onClick={copyLeadStudentSummary}
                            className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100"
                        >
                            نسخ
                        </button>
                        <Link to="/dashboard?tab=reports" className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-200">
                            تقرير
                        </Link>
                    </div>
                ) : null}
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-3">
                <div className="text-xs font-black text-amber-600">أولوية المهارة</div>
                <div className="mt-2 text-base font-black leading-6 text-gray-900">
                    {displayText(scopedLeadSkill?.skill) || 'بانتظار بيانات المهارات'}
                </div>
                <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                    {scopedLeadSkill
                        ? `${scopedLeadSkill.affectedStudents} طلاب - ${scopedLeadSkill.mastery}%`
                        : 'تظهر بعد تراكم النتائج.'}
                </p>
                {scopedLeadSkill ? (
                    <div className="print-hide mt-2 flex flex-wrap gap-2">
                        <Link to="/quiz" className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">
                            اختبار
                        </Link>
                        <Link to={buildSkillSessionLink({ skill: scopedLeadSkill.skill, skillId: scopedLeadSkill.skillId, sectionName: scopedLeadSkill.section })} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-700 hover:bg-gray-200">
                            شرح
                        </Link>
                    </div>
                ) : null}
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-3">
                <div className="text-xs font-black text-indigo-600">أولوية المادة</div>
                <div className="mt-2 text-base font-black leading-6 text-gray-900">
                    {displayText(scopedLeadSubject?.subjectName) || 'بانتظار توزيع المواد'}
                </div>
                <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                    {scopedLeadSubject
                        ? `${scopedLeadSubject.weakStudents} طلاب - ${scopedLeadSubject.mastery}%`
                        : 'تظهر عند وجود فرق واضح.'}
                </p>
                {scopedLeadSubject ? (
                    <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold leading-6 text-indigo-700">
                        تدريب قصير ثم قياس.
                    </div>
                ) : null}
            </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
            {scopedInterventionPlan.map((item) => (
                <div key={item.title} className={`rounded-2xl border p-3 ${item.className}`}>
                    <div className="text-xs font-black opacity-70">{item.title}</div>
                    <div className="mt-2 text-sm font-black leading-6">{item.label}</div>
                    <p className="mt-1 text-xs font-bold leading-6">{item.body}</p>
                </div>
            ))}
        </div>
        {scopedSmartRemediation ? (
            <div className="mt-4 rounded-3xl border border-amber-100 bg-white/80 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            <Sparkles size={14} />
                            خطة ذكية قابلة للتنفيذ
                        </div>
                        <div className="text-base font-black text-gray-900">{displayText(scopedSmartRemediation.title) || 'خطة تدخل للنطاق الحالي'}</div>
                        <p className="mt-2 text-xs font-bold leading-6 text-gray-600">
                            {displayText(scopedSmartRemediation.summary) || 'ابدأ بالمهارة الأكثر ضعفًا، ثم أنشئ متابعة قصيرة وقابلة للقياس.'}
                        </p>
                    </div>
                    <Link to="/quiz" className="self-start rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">
                        اختبار متابعة
                    </Link>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    {(scopedSmartRemediation.steps || []).slice(0, 3).map((step, index) => (
                        <div key={`${step.day || index}-${step.skill || index}`} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                            <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 inline-flex">
                                {displayText(step.day) || `خطوة ${index + 1}`}
                            </div>
                            <div className="mt-2 font-black leading-6 text-gray-900">{displayText(step.skill) || 'مهارة تحتاج متابعة'}</div>
                            <p className="mt-1 text-xs font-bold leading-6 text-gray-600">{displayText(step.action) || 'وجّه نشاطًا علاجيًا قصيرًا.'}</p>
                            <div className="mt-2 text-xs font-bold leading-6 text-gray-500">
                                قياس: {displayText(step.check) || 'اختبار قصير.'}
                            </div>
                        </div>
                    ))}
                </div>
                {scopedSmartRemediation.parentNote ? (
                    <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold leading-6 text-emerald-800">
                        متابعة: {displayText(scopedSmartRemediation.parentNote)}
                    </div>
                ) : null}
            </div>
        ) : null}
    </div>
  </>
);
