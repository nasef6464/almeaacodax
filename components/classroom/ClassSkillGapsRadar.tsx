import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, Target, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  buildClassroomSkillDiagnostics,
  normalizeClassroomReport,
  type CanonicalClassroomReport,
  type ClassroomSavedReport,
} from './classroomReportViewModel';

interface ClassSkillGapsRadarProps {
  schoolId: string;
  assignments: Array<{ assignmentId: string; classId: string; className: string; subjectId?: string }>;
  onLaunchChallengeForSkill?: (skillId: string) => void;
}

type SkillRow = {
  key: string;
  skillId: string;
  skillName: string;
  pathId?: string;
  subjectId?: string;
  accuracy: number;
  totalAttempts: number;
  studentsAtRiskCount: number;
};

export const ClassSkillGapsRadar: React.FC<ClassSkillGapsRadarProps> = ({
  schoolId,
  assignments,
  onLaunchChallengeForSkill,
}) => {
  const [selectedClassId, setSelectedClassId] = useState(assignments[0]?.classId || '');
  const [selectedPathId, setSelectedPathId] = useState('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [reports, setReports] = useState<CanonicalClassroomReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    setLoading(true);
    api.getClassroomTeacherHistory(schoolId)
      .then((result) => {
        if (cancelled) return;
        const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
        setReports(
          sessions
            .map((session) => normalizeClassroomReport(session as ClassroomSavedReport))
            .filter((report) => report.status === 'ended' || report.status === 'archived' || Boolean(report.endedAt)),
        );
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const selectedClass = assignments.find((assignment) => assignment.classId === selectedClassId) || assignments[0];

  const classReports = useMemo(
    () => reports.filter((report) => !selectedClassId || report.classId === selectedClassId),
    [reports, selectedClassId],
  );

  const pathOptions = useMemo(
    () => Array.from(new Set(
      classReports.flatMap((report) => report.questions.map((question) => String(question.pathId || '')).filter(Boolean)),
    )).sort(),
    [classReports],
  );

  const subjectOptions = useMemo(
    () => Array.from(new Set(
      classReports.flatMap((report) => report.questions
        .filter((question) => selectedPathId === 'all' || String(question.pathId || '') === selectedPathId)
        .map((question) => String(question.subjectId || question.subject || report.subjectName || ''))
        .filter(Boolean)),
    )).sort((a, b) => a.localeCompare(b, 'ar')),
    [classReports, selectedPathId],
  );

  useEffect(() => {
    if (selectedSubjectId === 'all') return;
    if (!subjectOptions.includes(selectedSubjectId)) setSelectedSubjectId('all');
  }, [selectedSubjectId, subjectOptions]);

  const scopedReports = useMemo(
    () => classReports.map((report) => ({
      ...report,
      questions: report.questions.filter((question) =>
        (selectedPathId === 'all' || String(question.pathId || '') === selectedPathId) &&
        (selectedSubjectId === 'all' || String(question.subject || report.subjectName || '') === selectedSubjectId),
      ),
    })).filter((report) => report.questions.length > 0),
    [classReports, selectedPathId, selectedSubjectId],
  );

  const skills = useMemo<SkillRow[]>(() =>
    buildClassroomSkillDiagnostics(scopedReports).map((diagnostic) => ({
      key: diagnostic.scopeKey,
      skillId: diagnostic.skillId,
      skillName: diagnostic.skillName,
      pathId: diagnostic.pathId,
      subjectId: diagnostic.subjectId,
      accuracy: diagnostic.accuracy ?? 0,
      totalAttempts: diagnostic.totalAnswered,
      studentsAtRiskCount: 0,
    })),
  [scopedReports]);

  const criticalGapsCount = skills.filter((skill) => skill.accuracy < 60).length;
  const masteredSkillsCount = skills.filter((skill) => skill.accuracy >= 80).length;
  const avgClassAccuracy = skills.length
    ? Math.round(skills.reduce((sum, skill) => sum + skill.accuracy, 0) / skills.length)
    : 0;

  return (
    <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" dir="rtl">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Target size={18} />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">رادار فجوات الفصل المهارية</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            بيانات فعلية من الحصص المسجلة، مع عزل المسار والمادة قبل تجميع المهارات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {assignments.length > 1 && (
            <select
              value={selectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setSelectedPathId('all');
                setSelectedSubjectId('all');
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {assignments.map((assignment) => (
                <option key={assignment.classId} value={assignment.classId}>{assignment.className}</option>
              ))}
            </select>
          )}
          <select
            value={selectedPathId}
            onChange={(event) => {
              setSelectedPathId(event.target.value);
              setSelectedSubjectId('all');
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">كل المسارات</option>
            {pathOptions.map((pathId) => <option key={pathId} value={pathId}>{pathId}</option>)}
          </select>
          <select
            value={selectedSubjectId}
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">كل المواد</option>
            {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="متوسط دقة الفصل" value={skills.length ? `${avgClassAccuracy}%` : '—'} />
        <Kpi label="فجوات حرجة (<60%)" value={criticalGapsCount} tone="rose" />
        <Kpi label="مهارات متقنة (≥80%)" value={masteredSkillsCount} tone="emerald" />
        <Kpi label="الفصل المعروض" value={selectedClass?.className || 'الفصل المسند'} tone="indigo" />
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500">
          جارٍ تحميل بيانات المهارات الفعلية…
        </div>
      ) : skills.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500">
          لا توجد أدلة مهارية مطابقة للنطاق المحدد حتى الآن.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {skills.map((skill) => {
            const isCritical = skill.accuracy < 60;
            const isMastered = skill.accuracy >= 80;
            const statusBg = isCritical
              ? 'border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10'
              : isMastered
                ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                : 'border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10';
            const progressColor = isCritical ? 'bg-rose-500' : isMastered ? 'bg-emerald-500' : 'bg-amber-500';

            return (
              <div key={skill.key} className={`flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all hover:shadow-xs ${statusBg}`}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-black text-slate-400">{skill.pathId || 'مسار غير محدد'} · {skill.subjectId || 'مادة غير محددة'}</div>
                      <h3 className="mt-1 text-xs sm:text-sm font-black text-slate-900 dark:text-white">{skill.skillName}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${
                      isCritical ? 'bg-rose-100 text-rose-800' : isMastered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>{skill.accuracy}%</span>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700">
                    <div className={`h-full transition-all duration-500 ${progressColor}`} style={{ width: `${skill.accuracy}%` }} />
                  </div>
                  <div className="mt-2.5 text-[11px] text-slate-500">إجمالي الأدلة: {skill.totalAttempts}</div>
                </div>

                {!skill.skillId.startsWith('subject:') && (
                  <div className="mt-4 border-t border-slate-200/60 pt-3 dark:border-slate-800">
                    {onLaunchChallengeForSkill ? (
                      <button
                        type="button"
                        onClick={() => onLaunchChallengeForSkill(skill.skillId)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black transition-all ${
                          isCritical ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">{isCritical ? <AlertTriangle size={14} /> : <Zap size={14} />}تدريب الفصل على المهارة</span>
                        <ChevronLeft size={14} />
                      </button>
                    ) : (
                      <Link
                        to={`/classroom/teacher?schoolId=${encodeURIComponent(schoolId)}&classId=${encodeURIComponent(selectedClassId)}&skillId=${encodeURIComponent(skill.skillId)}`}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-black transition-all ${
                          isCritical ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">{isCritical ? <AlertTriangle size={14} /> : <Zap size={14} />}تدريب الفصل على المهارة</span>
                        <ChevronLeft size={14} />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const Kpi: React.FC<{ label: string; value: React.ReactNode; tone?: 'rose' | 'emerald' | 'indigo' }> = ({ label, value, tone }) => {
  const className = tone === 'rose'
    ? 'bg-rose-50/70 text-rose-800'
    : tone === 'emerald'
      ? 'bg-emerald-50/70 text-emerald-800'
      : tone === 'indigo'
        ? 'bg-indigo-50/70 text-indigo-800'
        : 'bg-slate-50 text-slate-800';
  return (
    <div className={`rounded-2xl p-4 text-center ${className}`}>
      <span className="text-xs font-bold opacity-75">{label}</span>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
};
