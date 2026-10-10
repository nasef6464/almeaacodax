import React from 'react';

type SkillEvidence = { skillId: string; evidenceCount: number; accuracy: number | null };
type Intelligence = {
  generatedAt?: string;
  bounds?: { sessionLimit?: number; resultLimit?: number; trendDays?: number };
  schoolPerformance?: {
    smartClassroom?: { sessions?: number; responses?: number; accuracy?: number | null; skillHeatmap?: SkillEvidence[]; trend?: Array<{ day: string; responses: number; accuracy: number | null }> };
    officialAssessments?: { attempts?: number; averageScore?: number | null; skills?: SkillEvidence[] };
  };
};

/** Uses the existing, manually requested school report; sources remain separate. */
export function SchoolExecutiveSummary({ report, skillNames = {} }: { report: Intelligence; skillNames?: Record<string, string> }) {
  const classroom = report.schoolPerformance?.smartClassroom;
  const official = report.schoolPerformance?.officialAssessments;
  const days = (classroom?.trend || []).filter(day => day.responses > 0 && day.accuracy !== null);
  const previous = days.at(-2); const latest = days.at(-1);
  const skillList = (skills: SkillEvidence[] | undefined, source: string) => <div className="mt-3 space-y-2"><p className="text-xs font-bold">أبرز المهارات المحتاجة للدعم — {source}</p>{(skills || []).filter(s => s.evidenceCount > 0 && s.accuracy !== null && s.accuracy < 60).sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100)).slice(0, 3).map(skill => <p key={skill.skillId} className="text-xs">{skillNames[skill.skillId] || 'مهارة غير مسماة'} • {skill.accuracy}% • {skill.evidenceCount} قياس</p>)}{!(skills || []).some(s => s.evidenceCount > 0 && s.accuracy !== null && s.accuracy < 60) && <p className="text-xs text-slate-500">لا توجد مهارات دون 60% في هذا المصدر.</p>}</div>;
  return <section aria-label="ملخص المدرسة" className="mt-4 rounded-2xl border border-amber-100 bg-white p-4 space-y-3">
    <h4 className="font-black text-slate-900">ملخص المدرسة</h4>
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-xl bg-indigo-50 p-3"><h5 className="text-sm font-bold">التقويم أثناء الحصص</h5><p className="mt-1 text-xs">{classroom?.sessions ?? 0} حصة • {classroom?.responses ?? 0} إجابة • دقة {classroom?.accuracy == null ? 'لم تُقَس' : `${classroom.accuracy}%`}</p>{skillList(classroom?.skillHeatmap, 'الحصص')}</article>
      <article className="rounded-xl bg-emerald-50 p-3"><h5 className="text-sm font-bold">اختبارات المدرسة</h5><p className="mt-1 text-xs">{official?.attempts ?? 0} محاولة • متوسط الدرجة {official?.averageScore == null ? 'لم يُقَس' : `${official.averageScore}%`}</p>{skillList(official?.skills, 'الاختبارات')}</article>
    </div>
    {previous && latest && <p className="text-xs">دقة إجابات الحصص: {previous.day} ({previous.accuracy}%) ← {latest.day} ({latest.accuracy}%). الدفعات والطلاب قد يختلفون؛ هذا اتجاه يومي وليس قياس أثر تدخل بعينه.</p>}
    <p className="text-xs text-slate-500">الحصص: نسبة الإجابات الصحيحة. مهارات الاختبارات: نسبة القياسات التي بلغت 60%، وليست متوسط تمكن المهارة. المحاولات ليست عدد الطلاب المشاركين.</p>
    <p className="text-xs text-slate-500">ملخص آخر البيانات المتاحة ضمن حدود التقرير: حتى {report.bounds?.sessionLimit ?? '—'} حصة و{report.bounds?.resultLimit ?? '—'} نتيجة. التحليل الذاتي للمنصة منفصل عن هذه المقارنة.</p>
  </section>;
}
