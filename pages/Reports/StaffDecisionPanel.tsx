import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle, Copy, Download, FileText, Loader2, Sparkles, Target } from 'lucide-react';
import { Role } from '../../types';
import { displayText, roleScopeTitle, type ScopedAnalyticsOverview } from './reportDomain';
import type { ScopedGroupPerformanceRow } from './scopedComparisonViewModel';
import type { InstitutionalReportHub } from './institutionalReportViewModel';
import type { buildScopedStudentFocusCards } from './scopedStudentFocusViewModel';
type Action = () => void | Promise<void>;

interface Props {
  user: { role: Role };
  scopedAnalytics: ScopedAnalyticsOverview;
  scopedLeadSkill: ScopedAnalyticsOverview['weakestSkills'][number] | null;
  scopedLeadStudent: ScopedAnalyticsOverview['weakestStudents'][number] | null;
  weakestScopedGroup: ScopedGroupPerformanceRow | null;
  strongestScopedGroup: ScopedGroupPerformanceRow | null;
  institutionalReportHub: InstitutionalReportHub | null;
  scopedStudentFocusCards: ReturnType<typeof buildScopedStudentFocusCards>;
  scopedInterventionPlanCreated: boolean;
  scopedInterventionPlanError: string;
  scopedSmartRemediationLoading: boolean;
  copiedInstitutionalAlert: boolean;
  canSendInterventionAlert: boolean;
  interventionAlertSending: boolean;
  interventionAlertSent: boolean;
  interventionAlertError: string;
  buildScopedSmartRemediation: Action;
  downloadPerformanceWorkbook: Action;
  downloadScopedStudentsWorkbook: Action;
  copyInstitutionalAlert: Action;
  sendInterventionAlert: Action;
}

export const StaffDecisionPanel = ({
  user,
  scopedAnalytics,
  scopedLeadSkill,
  scopedLeadStudent,
  weakestScopedGroup,
  strongestScopedGroup,
  institutionalReportHub,
  scopedStudentFocusCards,
  scopedInterventionPlanCreated,
  scopedInterventionPlanError,
  scopedSmartRemediationLoading,
  copiedInstitutionalAlert,
  canSendInterventionAlert,
  interventionAlertSending,
  interventionAlertSent,
  interventionAlertError,
  buildScopedSmartRemediation,
  downloadPerformanceWorkbook,
  downloadScopedStudentsWorkbook,
  copyInstitutionalAlert,
  sendInterventionAlert,
}: Props) => (
  <>
    {user.role === Role.SUPERVISOR || user.role === Role.ADMIN || user.role === Role.TEACHER || user.role === Role.SCHOOL_ADMIN ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        مركز قرار المشرف
                    </div>
                    <h3 className="mt-2 text-lg font-black text-gray-900">ابدأ من فصل، طالب، مهارة</h3>
                    <p className="mt-1 text-xs font-bold leading-6 text-gray-500">
                        ملخص تنفيذي من نفس نتائج الاختبارات، ثم تدخل علاجي وقياس متابعة.
                    </p>
                </div>
                <div className="print-hide flex flex-wrap gap-2">
                    <button
                        type="button"
                        data-testid="staff-intervention-create"
                        onClick={buildScopedSmartRemediation}
                        disabled={scopedSmartRemediationLoading || !scopedAnalytics.weakestSkills.length}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {scopedSmartRemediationLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        أنشئ تدخل علاجي
                    </button>
                    <button
                        type="button"
                        data-testid="staff-management-export"
                        onClick={downloadPerformanceWorkbook}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-100"
                    >
                        <Download size={14} />
                        تصدير الإدارة
                    </button>
                </div>
            </div>
            {scopedInterventionPlanCreated || scopedInterventionPlanError ? (
                <div
                    role="status"
                    className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-bold leading-6 ${
                        scopedInterventionPlanCreated
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                            : 'border-rose-100 bg-rose-50 text-rose-700'
                    }`}
                >
                    {scopedInterventionPlanCreated
                        ? 'تم إنشاء خطة علاج داخل حساب الطالب المحدد، ويمكنه فتحها من صفحة خطتي.'
                        : displayText(scopedInterventionPlanError)}
                </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-xs font-black text-emerald-700">أفضل فصل</div>
                    <div className="mt-2 text-base font-black leading-6 text-gray-900">
                        {displayText(strongestScopedGroup?.groupName) || 'بانتظار نتائج الفصول'}
                    </div>
                    <div className="mt-1 text-xs font-bold text-emerald-700">
                        {strongestScopedGroup ? `${strongestScopedGroup.averageScore}% - ${strongestScopedGroup.attempts} محاولة` : 'لا توجد محاولات كافية'}
                    </div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                    <div className="text-xs font-black text-rose-700">أضعف فصل</div>
                    <div className="mt-2 text-base font-black leading-6 text-gray-900">
                        {displayText(weakestScopedGroup?.groupName) || 'بانتظار نتائج الفصول'}
                    </div>
                    <div className="mt-1 text-xs font-bold text-rose-700">
                        {weakestScopedGroup ? `${weakestScopedGroup.weakStudentCount} طلاب متعثرون - ${weakestScopedGroup.averageScore}%` : 'لا توجد إشارة واضحة'}
                    </div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                    <div className="text-xs font-black text-amber-700">طالب متعثر</div>
                    <div className="mt-2 text-base font-black leading-6 text-gray-900">
                        {displayText(scopedLeadStudent?.name) || 'لا يوجد طالب محدد'}
                    </div>
                    <div className="mt-1 text-xs font-bold text-amber-700">
                        {scopedLeadStudent ? `${scopedLeadStudent.averageScore}% - ${scopedLeadStudent.weakSkillCount} مهارات` : 'المؤشرات مطمئنة حاليًا'}
                    </div>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                    <div className="text-xs font-black text-indigo-700">مهارة مشتركة ضعيفة</div>
                    <div className="mt-2 text-base font-black leading-6 text-gray-900">
                        {displayText(scopedLeadSkill?.skill) || 'بانتظار بيانات المهارات'}
                    </div>
                    <div className="mt-1 text-xs font-bold text-indigo-700">
                        {scopedLeadSkill ? `${scopedLeadSkill.affectedStudents} طلاب - ${scopedLeadSkill.mastery}%` : 'اربط الاختبارات بالمهارات أولًا'}
                    </div>
                </div>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                القرار المقترح: {scopedLeadSkill
                    ? `تدخل قصير على ${displayText(scopedLeadSkill.skill)} ثم اختبار متابعة.`
                    : scopedLeadStudent
                        ? `ابدأ بمتابعة ${displayText(scopedLeadStudent.name)} ثم قياس قصير.`
                        : 'وجّه اختبارًا تشخيصيًا قصيرًا حتى تظهر الأولويات.'}
            </div>
        </div>
    ) : null}

    {institutionalReportHub ? (
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">
                        مركز متابعة مؤسسي
                    </div>
                    <h3 className="mt-2 text-lg font-black leading-7 text-gray-900">
                        {institutionalReportHub.roleLabel}: خطوة تشغيل واضحة
                    </h3>
                    <p className="mt-1 text-sm font-bold leading-7 text-gray-600">
                        {institutionalReportHub.nextAction}
                    </p>
                </div>
                <div className="print-hide grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
                    <Link
                        to={institutionalReportHub.followUpLink}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700"
                    >
                        <Target size={14} />
                        توجيه اختبار
                    </Link>
                    <button
                        type="button"
                        onClick={copyInstitutionalAlert}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm hover:bg-emerald-50"
                    >
                        {copiedInstitutionalAlert ? <CheckCircle size={14} /> : <Copy size={14} />}
                        {copiedInstitutionalAlert ? 'تم النسخ' : 'نسخ تنبيه'}
                    </button>
                    <button
                        type="button"
                        data-testid="staff-intervention-alert-send"
                        onClick={() => void sendInterventionAlert()}
                        disabled={!canSendInterventionAlert || interventionAlertSending}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-700 shadow-sm hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {interventionAlertSending ? <Loader2 size={14} className="animate-spin" /> : interventionAlertSent ? <CheckCircle size={14} /> : <Bell size={14} />}
                        {interventionAlertSending ? 'إرسال' : interventionAlertSent ? 'تم الإرسال' : 'إرسال تنبيه'}
                    </button>
                    <Link
                        to={institutionalReportHub.studentsLink}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <FileText size={14} />
                        إدارة النطاق
                    </Link>
                    <button
                        type="button"
                        data-testid="staff-students-export"
                        onClick={downloadScopedStudentsWorkbook}
                        disabled={!scopedStudentFocusCards.length}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-700 shadow-sm hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download size={14} />
                        تصدير الطلاب
                    </button>
                </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                    النطاق: {roleScopeTitle[user.role] || 'النطاق الحالي'}
                </div>
                <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold leading-6 text-slate-600">
                    الهدف: {institutionalReportHub.targetLine}
                </div>
                {interventionAlertError ? (
                    <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold leading-6 text-rose-700">
                        {displayText(interventionAlertError)}
                    </div>
                ) : null}
                <Link
                    to={institutionalReportHub.alertLink}
                    className="print-hide rounded-2xl bg-white/80 px-3 py-2 text-xs font-black leading-6 text-indigo-700 hover:bg-white"
                >
                    فتح مركز التنبيهات
                </Link>
            </div>
        </div>
    ) : null}
  </>
);
