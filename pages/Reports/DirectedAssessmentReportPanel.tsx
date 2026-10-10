import React from 'react';
import { Download } from 'lucide-react';
import { Role } from '../../types';
import { displayText, type ScopedQuizResult } from './reportDomain';
import type { buildDirectedFollowUpOptions, DirectedQuizSkillAnalysisRow, DirectedQuizStudentAnalysisRow, DirectedQuizSummary } from './directedQuizAnalyticsViewModel';
type Action = () => void | Promise<void>;

interface Props {
  user: { role: Role };
  directedFollowUpOptions: ReturnType<typeof buildDirectedFollowUpOptions>;
  selectedFollowUpQuizId: string;
  setSelectedFollowUpQuizId: (value: string) => void;
  directedQuizAnalysisResults: ScopedQuizResult[];
  directedQuizSkillAnalysis: DirectedQuizSkillAnalysisRow[];
  directedQuizStudentAnalysis: DirectedQuizStudentAnalysisRow[];
  directedQuizSummary: DirectedQuizSummary;
  downloadDirectedQuizAnalysisWorkbook: Action;
}

export const DirectedAssessmentReportPanel = ({
  user,
  directedFollowUpOptions,
  selectedFollowUpQuizId,
  setSelectedFollowUpQuizId,
  directedQuizAnalysisResults,
  directedQuizSkillAnalysis,
  directedQuizStudentAnalysis,
  directedQuizSummary,
  downloadDirectedQuizAnalysisWorkbook,
}: Props) => (
  <>
    {user.role === Role.SUPERVISOR || user.role === Role.ADMIN || user.role === Role.TEACHER || user.role === Role.SCHOOL_ADMIN ? (
        <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        تحليل اختبار موجه
                    </div>
                    <h3 className="mt-2 text-lg font-black text-gray-900">نتائج الطلاب والمهارات لنفس الاختبار</h3>
                    <p className="mt-1 max-w-2xl text-xs font-bold leading-6 text-gray-500">
                        مناسب عندما يوجه المشرف أو المدير اختبارًا لمجموعة طلاب ويريد تقريرًا سريعًا: متوسط الأداء، أضعف المهارات، والطلاب الذين يحتاجون متابعة.
                    </p>
                </div>
                <div className="print-hide flex flex-wrap items-center gap-2">
                    <select
                        value={selectedFollowUpQuizId}
                        onChange={(event) => setSelectedFollowUpQuizId(event.target.value)}
                        className="max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 focus:border-emerald-400 focus:outline-none"
                    >
                        <option value="all">كل الاختبارات الموجهة</option>
                        {directedFollowUpOptions.map((quiz) => (
                            <option key={quiz.id} value={quiz.id}>{displayText(quiz.title)}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        data-testid="directed-quiz-analysis-export"
                        onClick={downloadDirectedQuizAnalysisWorkbook}
                        disabled={!directedQuizAnalysisResults.length}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download size={14} />
                        تصدير تحليل الاختبار
                    </button>
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-bold text-slate-500">الاختبار</div>
                    <div className="mt-2 text-sm font-black leading-6 text-slate-900">{directedQuizSummary.title}</div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3">
                    <div className="text-xs font-bold text-emerald-700">محاولات</div>
                    <div className="mt-2 text-2xl font-black text-emerald-700">{directedQuizSummary.attempts}</div>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3">
                    <div className="text-xs font-bold text-indigo-700">متوسط الأداء</div>
                    <div className="mt-2 text-2xl font-black text-indigo-700">{directedQuizSummary.averageScore}%</div>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3">
                    <div className="text-xs font-bold text-rose-700">يحتاجون متابعة</div>
                    <div className="mt-2 text-2xl font-black text-rose-700">{directedQuizSummary.needsFollowUp}</div>
                </div>
            </div>

            {directedQuizAnalysisResults.length > 0 ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-3 text-sm font-black text-gray-900">أضعف المهارات في الاختبار</div>
                        <div className="space-y-2">
                            {directedQuizSkillAnalysis.slice(0, 5).map((skill) => (
                                <div key={skill.skill} className="rounded-xl bg-white p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 text-sm font-black text-gray-900">{displayText(skill.skill)}</div>
                                        <div className={`rounded-full px-2.5 py-1 text-xs font-black ${skill.mastery < 50 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {skill.mastery}%
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs font-bold text-gray-500">
                                        {skill.affectedStudents} طالب متأثر - {skill.attempts} دليل من الإجابات
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-3 text-sm font-black text-gray-900">أول الطلاب للمتابعة</div>
                        <div className="space-y-2">
                            {directedQuizStudentAnalysis.slice(0, 5).map(({ result, studentName, score, weakSkills }) => (
                                <div key={result.id || result._id || `${result.userId}-${result.date}`} className="rounded-xl bg-white p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 text-sm font-black text-gray-900">{studentName}</div>
                                        <div className={`rounded-full px-2.5 py-1 text-xs font-black ${score >= 75 ? 'bg-emerald-50 text-emerald-700' : score >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                            {score}%
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs font-bold leading-5 text-gray-500">
                                        {weakSkills.length
                                            ? `متابعة: ${weakSkills.map((skill) => `${displayText(skill.skill)} ${Number(skill.mastery || 0)}%`).join('، ')}`
                                            : 'لا توجد مهارة ضعيفة واضحة في هذه المحاولة.'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-500">
                    لا توجد محاولات مسجلة لهذا الاختبار الموجه داخل الفلتر الحالي بعد.
                </div>
            )}
        </div>
    ) : null}
  </>
);
