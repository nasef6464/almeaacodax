import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, HelpCircle, Layers, Lightbulb, Target, TrendingUp, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SkillItem {
  skillId: string;
  skillName: string;
  category: 'كمي' | 'لفظي' | 'تأسيس';
  accuracy: number;
  totalAttempts: number;
  studentsAtRiskCount: number;
}

interface ClassSkillGapsRadarProps {
  schoolId: string;
  assignments: Array<{ assignmentId: string; classId: string; className: string; subjectId?: string }>;
  onLaunchChallengeForSkill?: (skillId: string) => void;
}

const DEFAULT_SKILLS_DATA: Record<string, SkillItem[]> = {
  default: [
    { skillId: 'math-ratio', skillName: 'النسبة والتناسب والنسبة المئوية', category: 'كمي', accuracy: 84, totalAttempts: 142, studentsAtRiskCount: 3 },
    { skillId: 'math-geo', skillName: 'الهندسة والمساحات والمحيط والمجسمات', category: 'كمي', accuracy: 52, totalAttempts: 120, studentsAtRiskCount: 11 },
    { skillId: 'math-algebra', skillName: 'الجبر والمعادلات والأسس والجذور', category: 'كمي', accuracy: 71, totalAttempts: 135, studentsAtRiskCount: 6 },
    { skillId: 'verbal-reading', skillName: 'استيعاب المقروء وتحليل النصوص', category: 'لفظي', accuracy: 88, totalAttempts: 110, studentsAtRiskCount: 2 },
    { skillId: 'verbal-analogy', skillName: 'التناظر اللفظي والعلاقات المنطقية', category: 'لفظي', accuracy: 46, totalAttempts: 128, studentsAtRiskCount: 14 },
    { skillId: 'speed-drill', skillName: 'الحساب الذهني واستراتيجيات الحل السريع', category: 'تأسيس', accuracy: 65, totalAttempts: 98, studentsAtRiskCount: 8 },
  ],
};

export const ClassSkillGapsRadar: React.FC<ClassSkillGapsRadarProps> = ({
  schoolId,
  assignments,
  onLaunchChallengeForSkill,
}) => {
  const [selectedClassId, setSelectedClassId] = useState(assignments[0]?.classId || '');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'كمي' | 'لفظي' | 'تأسيس'>('all');

  const selectedClass = assignments.find((a) => a.classId === selectedClassId) || assignments[0];
  const skills = DEFAULT_SKILLS_DATA[selectedClassId] || DEFAULT_SKILLS_DATA.default;

  const filteredSkills = categoryFilter === 'all'
    ? skills
    : skills.filter((s) => s.category === categoryFilter);

  const criticalGapsCount = skills.filter((s) => s.accuracy < 60).length;
  const masteredSkillsCount = skills.filter((s) => s.accuracy >= 80).length;
  const avgClassAccuracy = Math.round(skills.reduce((acc, s) => acc + s.accuracy, 0) / skills.length);

  return (
    <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" dir="rtl">
      {/* Header with Class Selector */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Target size={18} />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              رادار فجوات الفصل المهارية
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            خريطة بصرية فورية لنسب إتقان المهارات في كل فصل لكشف الفجوات الحرجة قبل الحصص
          </p>
        </div>

        {assignments.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">اختر الفصل:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {assignments.map((assignment) => (
                <option key={assignment.classId} value={assignment.classId}>
                  {assignment.className} {assignment.subjectId ? `(${assignment.subjectId})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Class Radar KPI Summary */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800/60">
          <span className="text-xs font-bold text-slate-500">متوسط دقة الفصل</span>
          <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{avgClassAccuracy}%</div>
        </div>

        <div className="rounded-2xl bg-rose-50/70 p-4 text-center dark:bg-rose-950/30">
          <span className="text-xs font-bold text-rose-800 dark:text-rose-300">فجوات حرجة (&lt;60%)</span>
          <div className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-400">{criticalGapsCount} مهارات</div>
        </div>

        <div className="rounded-2xl bg-emerald-50/70 p-4 text-center dark:bg-emerald-950/30">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">مهارات متقنة (≥80%)</span>
          <div className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-400">{masteredSkillsCount} مهارات</div>
        </div>

        <div className="rounded-2xl bg-indigo-50/70 p-4 text-center dark:bg-indigo-950/30">
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">الفصل المعروض</span>
          <div className="mt-1 text-sm font-black truncate text-indigo-900 dark:text-indigo-200">
            {selectedClass?.className || 'الفصل المسند'}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'كمي', 'لفظي', 'تأسيس'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cat === 'all' ? 'جميع المهارات' : cat}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          {filteredSkills.length} مهارات مرصودة
        </span>
      </div>

      {/* Skills Heatmap Cards Grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {filteredSkills.map((skill) => {
          const isCritical = skill.accuracy < 60;
          const isMastered = skill.accuracy >= 80;
          const statusBg = isCritical
            ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10'
            : isMastered
            ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10'
            : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10';

          const progressColor = isCritical
            ? 'bg-rose-500'
            : isMastered
            ? 'bg-emerald-500'
            : 'bg-amber-500';

          return (
            <div
              key={skill.skillId}
              className={`flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all hover:shadow-xs ${statusBg}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-6 px-2 items-center justify-center rounded-md text-[10px] font-black ${
                      skill.category === 'كمي' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                      skill.category === 'لفظي' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {skill.category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {skill.skillName}
                    </h3>
                  </div>

                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${
                    isCritical ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' :
                    isMastered ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}>
                    {skill.accuracy}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                  <div className={`h-full transition-all duration-500 ${progressColor}`} style={{ width: `${skill.accuracy}%` }} />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>إجمالي المحاولات: {skill.totalAttempts}</span>
                  <span className={isCritical ? 'font-bold text-rose-700 dark:text-rose-400' : ''}>
                    {skill.studentsAtRiskCount > 0 ? `${skill.studentsAtRiskCount} طلاب بحاجة لمراجعة` : 'الجميع متقن'}
                  </span>
                </div>
              </div>

              {/* Action Button for Teacher */}
              <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                <Link
                  to={`/classroom/teacher?schoolId=${encodeURIComponent(schoolId)}&classId=${encodeURIComponent(selectedClassId)}`}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black transition-all ${
                    isCritical
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isCritical ? <AlertTriangle size={14} /> : <Zap size={14} />}
                    {isCritical ? 'طرح سؤال تحدي لعلاج هذه الفجوة' : 'تدريب الفصل على المهارة'}
                  </span>
                  <ChevronLeft size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
