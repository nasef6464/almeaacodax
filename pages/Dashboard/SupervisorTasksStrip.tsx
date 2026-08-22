import React, { useMemo } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronRight,
  ClipboardList, Clock, PlayCircle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Quiz {
  id: string;
  title: string;
  quizKind?: string;
  settings?: { maxAttempts?: number; timeLimit?: number };
  targetGroupIds?: string[];
  targetUserIds?: string[];
  isPublished?: boolean;
  createdBy?: string;
  dueDate?: string | null;     // ✅ اسم الحقل الصحيح من types.ts
  supervisorMessage?: string;
}

interface QuizResult {
  quizId: string;
  userId?: string;
  score: number;
  date: string;
}

interface SupervisorTasksStripProps {
  assignedQuizzes: Quiz[];
  examResults: QuizResult[];
  userId: string;
  onStartQuiz: (quizId: string) => void;
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function isExpired(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

// ── Main Component ─────────────────────────────────────────────────────────────
export const SupervisorTasksStrip: React.FC<SupervisorTasksStripProps> = ({
  assignedQuizzes, examResults, userId, onStartQuiz,
}) => {
  const tasks = useMemo(() => {
    return assignedQuizzes.map((quiz) => {
      const results = examResults.filter(
        (r) => r.quizId === quiz.id && (r.userId === userId || !r.userId),
      );
      const bestResult = results.reduce<QuizResult | null>(
        (best, r) => (!best || r.score > best.score ? r : best), null,
      );
      const attemptsUsed = results.length;
      const maxAttempts = quiz.settings?.maxAttempts ?? 999;
      const expired = isExpired(quiz.dueDate);
      const done = attemptsUsed >= maxAttempts;

      let statusLabel: string;
      let statusColor: string;
      let canStart: boolean;

      if (expired) {
        statusLabel = 'انتهى الوقت';
        statusColor = 'text-gray-400';
        canStart = false;
      } else if (done && attemptsUsed > 0) {
        statusLabel = `مكتمل ✓ (${bestResult?.score ?? 0}%)`;
        statusColor = 'text-emerald-600';
        canStart = false;
      } else if (attemptsUsed > 0) {
        statusLabel = `جارٍ (${attemptsUsed}/${maxAttempts === 999 ? '∞' : maxAttempts})`;
        statusColor = 'text-indigo-600';
        canStart = true;
      } else {
        statusLabel = 'لم يبدأ';
        statusColor = 'text-rose-600';
        canStart = true;
      }

      const isMock = quiz.quizKind === 'mock' || String(quiz.quizKind ?? '').includes('mock');
      const kind = isMock ? 'محاكي قياس' : quiz.quizKind === 'drill' ? 'تدريب' : 'اختبار';

      return {
        id: quiz.id,
        title: quiz.title,
        kind,
        isMock,
        statusLabel,
        statusColor,
        canStart,
        expired,
        done,
        attemptsUsed,
        bestScore: bestResult?.score ?? null,
        dueDate: quiz.dueDate,
        supervisorMessage: quiz.supervisorMessage,
      };
    });
  }, [assignedQuizzes, examResults, userId]);

  const pending = tasks.filter((t) => t.canStart && !t.done);
  const completed = tasks.filter((t) => t.done || t.expired);
  const total = tasks.length;

  if (total === 0) return null;

  return (
    <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm space-y-4">
      {/* ── رأس القسم ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <ClipboardList size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">مهامي من المشرف</h3>
            <p className="text-[11px] text-gray-400">
              {pending.length > 0
                ? `${pending.length} مهمة تنتظرك`
                : `${completed.length}/${total} مكتملة ✓`}
            </p>
          </div>
        </div>
        {pending.length > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white">
            {pending.length}
          </span>
        )}
      </div>

      {/* ── المهام المعلقة أولاً ── */}
      <div className="space-y-2">
        {tasks
          .sort((a, b) => {
            // المعلق أولاً، المكتمل أخيراً
            if (a.canStart && !b.canStart) return -1;
            if (!a.canStart && b.canStart) return 1;
            return 0;
          })
          .map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
                task.canStart
                  ? 'border-indigo-200 bg-white shadow-sm hover:shadow-md'
                  : task.done
                  ? 'border-emerald-100 bg-emerald-50/50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              {/* أيقونة الحالة */}
              <div className={`shrink-0 ${task.done ? 'text-emerald-500' : task.canStart ? 'text-indigo-500' : 'text-gray-300'}`}>
                {task.done ? (
                  <CheckCircle2 size={20} />
                ) : task.canStart ? (
                  <AlertCircle size={20} />
                ) : (
                  <Clock size={20} />
                )}
              </div>

              {/* المعلومات */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900 truncate">{task.title}</p>
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                    {task.kind}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className={`text-[11px] font-black ${task.statusColor}`}>
                    {task.statusLabel}
                  </span>
                  {task.dueDate && !task.done && !task.expired && (
                    <span className="text-[11px] text-gray-400">
                      ينتهي: {new Date(task.dueDate).toLocaleDateString('ar-SA')}
                    </span>
                  )}
                </div>
                {task.supervisorMessage && (
                  <p className="text-[11px] text-gray-500 mt-0.5 italic">
                    💬 "{task.supervisorMessage}"
                  </p>
                )}
              </div>

              {/* زر البدء */}
              {task.canStart && (
                <button
                  onClick={() => onStartQuiz(task.id)}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 transition-colors"
                >
                  <PlayCircle size={14} />
                  {task.attemptsUsed > 0 ? 'تابع' : 'ابدأ'}
                </button>
              )}
              {task.done && task.bestScore !== null && (
                <span className="shrink-0 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
                  {task.bestScore}%
                </span>
              )}
            </div>
          ))}
      </div>

      {/* ── رابط لكل الاختبارات ── */}
      <button
        onClick={() => {
          window.location.assign('/dashboard?tab=quizzes');
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-indigo-100 bg-indigo-50 py-2.5 text-xs font-black text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        عرض كل اختباراتي
        <ChevronRight size={13} />
      </button>
    </div>
  );
};
