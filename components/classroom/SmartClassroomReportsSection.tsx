import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Presentation, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { SmartClassroomReportModal } from './SmartClassroomReportModal';

export interface ClassroomSavedReport {
  sessionId: string;
  schoolId: string;
  classId: string;
  className?: string;
  subject?: string;
  day?: string;
  period?: string;
  participantCount: number;
  responseCount: number;
  correctCount: number;
  endedAt: string;
  questions?: Array<{
    questionId: string;
    text: string;
    options: string[];
    answeredCount?: number;
    correctCount?: number;
    isChallenge?: boolean;
    skillId?: string;
    skillName?: string;
    subject?: string;
  }>;
}

interface SmartClassroomReportsSectionProps {
  schoolId: string;
  assignments: Array<{ assignmentId: string; classId: string; className: string; subjectId?: string }>;
  smartClassroomEnabled: boolean;
  onPrepareIntervention?: (skillId: string) => void;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month';

export const SmartClassroomReportsSection: React.FC<SmartClassroomReportsSectionProps> = ({
  schoolId,
  assignments,
  onPrepareIntervention,
}) => {
  const [reports, setReports] = useState<ClassroomSavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ClassroomSavedReport | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;

    api.getClassroomTeacherHistory(schoolId)
      .then((res) => {
        if (!active) return;
        if (res?.sessions && Array.isArray(res.sessions)) {
          setReports(res.sessions);
        } else {
          loadLocalFallback();
        }
      })
      .catch(() => {
        if (!active) return;
        loadLocalFallback();
      });

    function loadLocalFallback() {
      try {
        const raw = localStorage.getItem(`smart_classroom_reports_${schoolId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setReports(parsed);
        }
      } catch {
        // safe fallback
      }
    }

    return () => {
      active = false;
    };
  }, [schoolId]);

  const filteredReports = useMemo(() => {
    const now = Date.now();
    return reports.filter((report) => {
      if (selectedClassFilter !== 'all' && report.classId !== selectedClassFilter) return false;
      const reportTime = new Date(report.endedAt).getTime();
      if (timeFilter === 'today') {
        if (new Date(report.endedAt).toDateString() !== new Date().toDateString()) return false;
      } else if (timeFilter === 'week') {
        if (now - reportTime > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (timeFilter === 'month') {
        if (now - reportTime > 30 * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [reports, timeFilter, selectedClassFilter]);

  const totalSessions = filteredReports.length;
  const totalParticipants = filteredReports.reduce((acc, report) => acc + (report.participantCount || 0), 0);
  const totalResponses = filteredReports.reduce((acc, report) => acc + (report.responseCount || 0), 0);
  const totalCorrect = filteredReports.reduce((acc, report) => acc + (report.correctCount || 0), 0);
  const overallAccuracy = totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : null;

  const skillDiagnostics = useMemo(() => {
    const map = new Map<string, { skillId: string; skillName: string; totalAsked: number; correctCount: number; sessionsCount: number }>();
    filteredReports.forEach((report) => {
      (report.questions || []).forEach((question) => {
        const skillKey = question.skillId || question.subject || 'مهارة التحليل وحل المشكلات';
        const current = map.get(skillKey) || {
          skillId: skillKey,
          skillName: question.skillName || skillKey,
          totalAsked: 0,
          correctCount: 0,
          sessionsCount: 0,
        };
        current.totalAsked += question.answeredCount || 1;
        current.correctCount += question.correctCount || 0;
        current.sessionsCount += 1;
        map.set(skillKey, current);
      });
    });
    return Array.from(map.values())
      .map((skill) => {
        const accuracy = skill.totalAsked > 0 ? Math.round((skill.correctCount / skill.totalAsked) * 100) : 0;
        return { ...skill, accuracy, isWeak: accuracy < 65 };
      })
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [filteredReports]);

  const weakSkills = skillDiagnostics.filter((skill) => skill.isWeak);

  return (
    <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
            <Presentation className="text-indigo-600" size={22} />
            سجل وتقارير الحصص الذكية وتشخيص المهارات
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            أرشيف الحصص التفاعلية، وتحليلات دقة إجابات الفصول، والتشخيص الدقيق لنقاط ضعف الطلاب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {assignments.length > 1 && (
            <select
              value={selectedClassFilter}
              onChange={(event) => setSelectedClassFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">جميع الفصول</option>
              {assignments.map((assignment) => (
                <option key={assignment.classId} value={assignment.classId}>{assignment.className}</option>
              ))}
            </select>
          )}

          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
            {[
              { id: 'all', label: 'كامل الفترة' },
              { id: 'month', label: 'آخر شهر' },
              { id: 'week', label: 'آخر أسبوع' },
              { id: 'today', label: 'اليوم' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeFilter(tab.id as TimeFilter)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                  timeFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-indigo-50/50 p-4 text-center dark:bg-indigo-950/20">
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            الحصص المنفذة ({timeFilter === 'all' ? 'الكل' : timeFilter === 'today' ? 'اليوم' : timeFilter === 'week' ? 'الأسبوع' : 'الشهر'})
          </span>
          <div className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-100">{totalSessions}</div>
        </div>
        <div className="rounded-2xl bg-emerald-50/50 p-4 text-center dark:bg-emerald-950/20">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">الطلاب المشاركون</span>
          <div className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-100">{totalParticipants}</div>
        </div>
        <div className="rounded-2xl bg-amber-50/50 p-4 text-center dark:bg-amber-950/20">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">الإجابات المرصودة</span>
          <div className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-100">{totalResponses}</div>
        </div>
        <div className="rounded-2xl bg-purple-50/50 p-4 text-center dark:bg-purple-950/20">
          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">متوسط الإتقان</span>
          <div className="mt-1 text-2xl font-black text-purple-900 dark:text-purple-100">
            {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
          </div>
        </div>
      </div>

      {filteredReports.length > 0 && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/30 p-5 dark:border-rose-950/40 dark:bg-rose-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-rose-100 pb-3 dark:border-rose-900/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-rose-600" size={18} />
              <h3 className="text-sm font-black text-rose-950 dark:text-rose-200">
                تشخيص فجوات المهارات في الفترة المحددة ({timeFilter === 'all' ? 'كامل الفترة' : timeFilter === 'today' ? 'اليوم' : timeFilter === 'week' ? 'آخر أسبوع' : 'آخر شهر'})
              </h3>
            </div>
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
              {weakSkills.length > 0 ? `${weakSkills.length} مهارات تحتاج معالجة` : 'جميع المهارات بنسبة إتقان جيدة ✨'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {skillDiagnostics.slice(0, 6).map((skill) => (
              <div
                key={skill.skillId}
                className={`rounded-xl border p-3.5 bg-white transition-all dark:bg-slate-800 ${
                  skill.isWeak
                    ? 'border-rose-200 dark:border-rose-900/60 shadow-xs'
                    : 'border-slate-100 dark:border-slate-750'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{skill.skillName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      skill.isWeak
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200'
                    }`}
                  >
                    {skill.accuracy}% إتقان
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  تم اختبارها في {skill.sessionsCount} حصة · {skill.totalAsked} إجابة
                </div>
                {skill.isWeak && onPrepareIntervention && (
                  <button
                    type="button"
                    onClick={() => onPrepareIntervention(skill.skillId)}
                    className="mt-2.5 flex items-center gap-1 text-[11px] font-black text-rose-600 hover:text-rose-800 dark:text-rose-400"
                  >
                    <Zap size={12} /> تحضير سؤال تحدي علاجي لهذه المهارة
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">
          جلسات الحصص المؤرشفة ({filteredReports.length})
        </h3>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-800/30">
            <Presentation size={32} className="mx-auto text-slate-400 opacity-60" />
            <p className="mt-3 font-bold">لا توجد تقارير حصص مطابقة للفترة المحددة.</p>
            <p className="mt-1 text-xs text-slate-400">يمكنك تغيير الفلتر الزمني أو بدء حصة ذكية جديدة للفصل.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const accuracy = report.responseCount > 0
                ? Math.round((report.correctCount / report.responseCount) * 100)
                : null;
              return (
                <div
                  key={report.sessionId}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xs transition-all hover:border-indigo-200 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">
                        {report.className || `فصل ${report.classId.slice(-4)}`}
                      </span>
                      {report.day && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-750 dark:text-slate-300">
                          {report.day}
                        </span>
                      )}
                      {report.period && (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          الحصة {report.period}
                        </span>
                      )}
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {report.participantCount} طالب مشارك
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      تاريخ الجلسة: {new Date(report.endedAt).toLocaleDateString('ar-SA')} ·{' '}
                      {new Date(report.endedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <span className="text-xs text-slate-500">نسبة الإتقان</span>
                      <div className="font-black text-emerald-600">{accuracy !== null ? `${accuracy}%` : '—'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 transition-colors"
                    >
                      عرض التقرير المفصل
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedReport && (
        <SmartClassroomReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </section>
  );
};
