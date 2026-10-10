import React from 'react';
import { Link } from 'react-router-dom';
import type { Skill } from '../../types';
import { displayText, buildDirectedQuizManagerLink, type ScopedQuizResult, type ScopedAnalyticsOverview } from './reportDomain';

interface Props {
  scopedLatestResults: ScopedQuizResult[];
  skills: Skill[];
  scopedAnalytics: ScopedAnalyticsOverview;
}

export const ScopedRecentAttemptsPanel = ({ scopedLatestResults, skills, scopedAnalytics }: Props) => (
  <div className="rounded-3xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
              <div className="text-lg font-black text-gray-900">محاولات حديثة</div>
          </div>
          <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {scopedLatestResults.length} محاولة حديثة
          </span>
      </div>
      {scopedLatestResults.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {scopedLatestResults.map((result, index) => {
                  const resultId = String(result.id || result._id || `${result.userId || 'student'}-${index}`);
                  const weakSkills = (result.skillsAnalysis || [])
                      .filter((skill) => Number(skill.mastery ?? 100) < 75)
                      .slice(0, 2);
                  const primaryWeakSkill = weakSkills[0];
                  const resolvedAttemptSkill = primaryWeakSkill?.skill
                      ? skills.find((skill) => displayText(skill.name) === displayText(primaryWeakSkill.skill))
                      : undefined;
                  const attemptStudent = result.userId
                      ? scopedAnalytics.weakestStudents.find((student) => student.id === result.userId)
                      : undefined;
                  const attemptFollowUpLink = buildDirectedQuizManagerLink({
                      pathId: resolvedAttemptSkill?.pathId,
                      subjectId: resolvedAttemptSkill?.subjectId,
                      sectionId: resolvedAttemptSkill?.sectionId,
                      skillId: resolvedAttemptSkill?.id,
                      targetUserId: result.userId || attemptStudent?.id,
                      targetGroupId: attemptStudent?.groupIds?.[0],
                  });
                  const resultDate = result.date || result.createdAt;

                  return (
                      <div key={resultId} className="rounded-2xl border border-gray-100 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-500">{displayText(result.studentName) || 'طالب'}</div>
                                  <div className="mt-1 font-black leading-6 text-gray-900">{displayText(result.quizTitle) || 'اختبار'}</div>
                              </div>
                              <div className={`rounded-full px-3 py-1 text-sm font-black ${Number(result.score || 0) >= 75 ? 'bg-emerald-50 text-emerald-700' : Number(result.score || 0) >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {Number(result.score || 0)}%
                              </div>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-white px-3 py-1.5">
                                  <div className="font-bold text-gray-500">صحيح</div>
                                  <div className="mt-1 font-black text-gray-900">{Number(result.correctAnswers || 0)}</div>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-1.5">
                                  <div className="font-bold text-gray-500">الأسئلة</div>
                                  <div className="mt-1 font-black text-gray-900">{Number(result.totalQuestions || 0)}</div>
                              </div>
                          </div>
                          {weakSkills.length ? (
                              <>
                                  <div className="mt-2 text-xs font-bold leading-6 text-rose-700">
                                      متابعة: {weakSkills.map((skill) => `${displayText(skill.skill) || 'مهارة'} (${Number(skill.mastery || 0)}%)`).join('، ')}
                                  </div>
                                  <Link
                                      to={attemptFollowUpLink}
                                      className="print-hide mt-2 inline-flex rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700"
                                  >
                                      اختبار متابعة
                                  </Link>
                              </>
                          ) : (
                              <div className="mt-2 text-xs font-bold leading-6 text-emerald-700">لا توجد أولوية واضحة.</div>
                          )}
                          {resultDate ? (
                              <div className="mt-2 text-[11px] font-bold text-gray-400">
                                  {new Date(resultDate).toLocaleDateString('ar-SA')}
                              </div>
                          ) : null}
                      </div>
                  );
              })}
          </div>
      ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 p-4 text-sm leading-7 text-gray-500">
              لا توجد محاولات حديثة داخل هذا النطاق بعد. بعد أول اختبار للطالب ستظهر المحاولة هنا مباشرة للمشرف أو ولي الأمر المرتبط.
          </div>
      )}
  </div>
);
