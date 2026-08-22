import React, { useMemo, useState } from "react";
import {
  X, Users, CheckCircle2, XCircle, Clock, Award, AlertTriangle,
  BarChart2, Target, Bell, ChevronDown, ChevronUp, TrendingUp,
  TrendingDown, Minus, BookOpen, User,
} from "lucide-react";
import { QuizResult } from "../../types";

interface StudentRow {
  id: string;
  name: string;
  groupName?: string;
}

interface AssignedTestDetailPanelProps {
  quizId: string;
  quizTitle: string;
  quizKind?: "drill" | "test" | "mock";
  totalQuestions: number;
  passingScore: number;
  targetStudents: StudentRow[];
  results: QuizResult[];
  dueDate?: string;
  onClose: () => void;
  onRemindAbsent?: (absentIds: string[]) => void;
  onAssignToStudent?: (studentId: string) => void;
}

const SCORE_COLOR = (s: number) =>
  s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-600" : "text-rose-600";
const SCORE_BG = (s: number) =>
  s >= 80 ? "bg-emerald-50 border-emerald-200" : s >= 60 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200";

export const AssignedTestDetailPanel: React.FC<AssignedTestDetailPanelProps> = ({
  quizTitle,
  quizKind,
  totalQuestions,
  passingScore,
  targetStudents,
  results,
  dueDate,
  onClose,
  onRemindAbsent,
  onAssignToStudent,
}) => {
  const [activeSection, setActiveSection] = useState<"overview" | "students" | "questions">("overview");
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);

  const KIND_LABELS: Record<string, string> = { drill: "تدريب", test: "اختبار", mock: "محاكي" };
  const KIND_COLORS: Record<string, string> = {
    drill: "bg-emerald-100 text-emerald-700",
    test: "bg-indigo-100 text-indigo-700",
    mock: "bg-violet-100 text-violet-700",
  };

  // ── تحليل النتائج ──────────────────────────────────────────────────────────
  const resultsByStudent = useMemo(() => {
    const map = new Map<string, QuizResult>();
    results.forEach((r) => { if (r.userId) map.set(r.userId, r); });
    return map;
  }, [results]);

  const participatedIds = useMemo(() =>
    new Set(results.map((r) => r.userId).filter(Boolean) as string[]), [results]);

  const absentStudents = useMemo(() =>
    targetStudents.filter((s) => !participatedIds.has(s.id)), [targetStudents, participatedIds]);

  const participatedStudents = useMemo(() =>
    targetStudents.filter((s) => participatedIds.has(s.id)), [targetStudents, participatedIds]);

  const avgScore = useMemo(() =>
    results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0, [results]);

  const passedCount = results.filter((r) => r.score >= passingScore).length;
  const failedCount = results.filter((r) => r.score < passingScore).length;
  const participationRate = targetStudents.length > 0
    ? Math.round((results.length / targetStudents.length) * 100) : 0;

  // ── أسوأ أسئلة (من questionReview) ────────────────────────────────────────
  const questionStats = useMemo(() => {
    const qMap = new Map<string, { text: string; correct: number; wrong: number }>();
    results.forEach((r) => {
      (r.questionReview || []).forEach((q) => {
        const existing = qMap.get(q.questionId) || { text: q.text || q.questionId, correct: 0, wrong: 0 };
        if (q.isCorrect) existing.correct++;
        else existing.wrong++;
        qMap.set(q.questionId, existing);
      });
    });
    return Array.from(qMap.values())
      .map((q) => ({ ...q, errorRate: q.wrong + q.correct > 0 ? Math.round((q.wrong / (q.wrong + q.correct)) * 100) : 0 }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 8);
  }, [results]);

  // ── أضعف المهارات (من skillsAnalysis) ─────────────────────────────────────
  const weakSkills = useMemo(() => {
    const skillMap = new Map<string, { name: string; totalMastery: number; count: number }>();
    results.forEach((r) => {
      (r.skillsAnalysis || []).forEach((s) => {
        const existing = skillMap.get(s.skillId || s.skill) || { name: s.skill, totalMastery: 0, count: 0 };
        existing.totalMastery += s.mastery ?? 0;
        existing.count++;
        skillMap.set(s.skillId || s.skill, existing);
      });
    });
    return Array.from(skillMap.values())
      .map((s) => ({ ...s, avgMastery: Math.round(s.totalMastery / s.count) }))
      .sort((a, b) => a.avgMastery - b.avgMastery)
      .slice(0, 6);
  }, [results]);

  const displayStudents = showAbsentOnly ? absentStudents : targetStudents;

  // ── KPI Card ───────────────────────────────────────────────────────────────
  const KpiCard = ({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) => (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${color}`}>
      <div className="p-2 bg-white/60 rounded-lg">{icon}</div>
      <div>
        <p className="text-[11px] font-bold opacity-70">{label}</p>
        <p className="text-lg font-black">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white flex items-start justify-between shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {quizKind && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20`}>
                  {KIND_LABELS[quizKind] || quizKind}
                </span>
              )}
              {dueDate && (
                <span className="text-[10px] font-bold opacity-70 flex items-center gap-1">
                  <Clock size={10}/> حتى {dueDate}
                </span>
              )}
            </div>
            <h2 className="text-base font-black truncate">{quizTitle}</h2>
            <p className="text-xs opacity-80 mt-0.5">
              {targetStudents.length} طالب مستهدف • {totalQuestions} سؤال • نجاح {passingScore}%
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0">
            <X size={18}/>
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
          {([
            { id: "overview", label: "نظرة عامة", icon: <BarChart2 size={13}/> },
            { id: "students", label: `الطلاب (${targetStudents.length})`, icon: <Users size={13}/> },
            { id: "questions", label: "تحليل الأسئلة", icon: <BookOpen size={13}/> },
          ] as const).map((tab) => (
            <button key={tab.id} type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all border-b-2 ${
                activeSection === tab.id
                  ? "text-indigo-700 border-indigo-600 bg-white"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ══════ نظرة عامة ══════ */}
          {activeSection === "overview" && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2.5">
                <KpiCard label="متوسط الدرجة" value={`${avgScore}%`}
                  color={SCORE_BG(avgScore)}
                  icon={<Target size={16} className={SCORE_COLOR(avgScore)}/>}/>
                <KpiCard label="نسبة المشاركة" value={`${participationRate}%`}
                  color={participationRate >= 80 ? "bg-emerald-50 border-emerald-200" : participationRate >= 50 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"}
                  icon={<Users size={16} className={participationRate >= 80 ? "text-emerald-600" : participationRate >= 50 ? "text-amber-600" : "text-rose-600"}/>}/>
                <KpiCard label="نجحوا" value={`${passedCount} / ${results.length}`}
                  color="bg-emerald-50 border-emerald-200"
                  icon={<CheckCircle2 size={16} className="text-emerald-600"/>}/>
                <KpiCard label="لم يشاركوا" value={absentStudents.length}
                  color={absentStudents.length > 0 ? "bg-rose-50 border-rose-200" : "bg-gray-50 border-gray-200"}
                  icon={<AlertTriangle size={16} className={absentStudents.length > 0 ? "text-rose-500" : "text-gray-400"}/>}/>
              </div>

              {/* توزيع الدرجات */}
              {results.length > 0 && (
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                  <h4 className="text-xs font-black text-gray-700 mb-3">توزيع الدرجات</h4>
                  {[
                    { label: "ممتاز (90-100%)", min: 90, max: 101, color: "bg-emerald-500" },
                    { label: "جيد جداً (75-89%)", min: 75, max: 90, color: "bg-green-400" },
                    { label: "جيد (60-74%)", min: 60, max: 75, color: "bg-amber-400" },
                    { label: "ضعيف (< 60%)", min: 0, max: 60, color: "bg-rose-400" },
                  ].map((band) => {
                    const count = results.filter((r) => r.score >= band.min && r.score < band.max).length;
                    const pct = results.length > 0 ? Math.round((count / results.length) * 100) : 0;
                    return (
                      <div key={band.label} className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] text-gray-500 w-36 shrink-0 font-medium">{band.label}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className={`${band.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="text-[11px] font-black text-gray-700 w-8 text-left">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* أضعف المهارات */}
              {weakSkills.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <h4 className="text-xs font-black text-amber-800 mb-3 flex items-center gap-1.5">
                    <TrendingDown size={13}/> أضعف المهارات في الفصل
                  </h4>
                  <div className="space-y-2">
                    {weakSkills.map((s) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-700 flex-1 font-medium truncate">{s.name}</span>
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${s.avgMastery >= 60 ? "bg-amber-400" : "bg-rose-400"}`}
                            style={{ width: `${s.avgMastery}%` }}/>
                        </div>
                        <span className={`text-[11px] font-black w-8 text-left ${SCORE_COLOR(s.avgMastery)}`}>{s.avgMastery}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* تذكير الغائبين */}
              {absentStudents.length > 0 && onRemindAbsent && (
                <button type="button"
                  onClick={() => onRemindAbsent(absentStudents.map((s) => s.id))}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all shadow-sm">
                  <Bell size={15}/>
                  تذكير {absentStudents.length} طالب غائب
                </button>
              )}
            </>
          )}

          {/* ══════ الطلاب ══════ */}
          {activeSection === "students" && (
            <>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowAbsentOnly(false)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${!showAbsentOnly ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
                  الكل ({targetStudents.length})
                </button>
                <button type="button" onClick={() => setShowAbsentOnly(true)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${showAbsentOnly ? "bg-rose-500 text-white border-rose-500" : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"}`}>
                  غائبون ({absentStudents.length})
                </button>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {displayStudents.map((student) => {
                  const result = resultsByStudent.get(student.id);
                  const participated = !!result;
                  return (
                    <div key={student.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs transition-all ${
                        participated ? "bg-white border-gray-100" : "bg-rose-50/60 border-rose-100"
                      }`}>
                      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                        participated
                          ? result && result.score >= passingScore ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          : "bg-gray-200 text-gray-500"
                      }`}>
                        {participated ? (result ? `${result.score}%` : "—") : "غ"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{student.name}</p>
                        {student.groupName && <p className="text-[10px] text-gray-400">{student.groupName}</p>}
                      </div>
                      {participated && result ? (
                        <div className="flex items-center gap-2 shrink-0">
                          {result.score >= passingScore
                            ? <CheckCircle2 size={13} className="text-emerald-500"/>
                            : <XCircle size={13} className="text-rose-400"/>
                          }
                          <span className={`font-black text-xs ${SCORE_COLOR(result.score)}`}>{result.score}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-bold text-rose-500">لم يؤدِّ</span>
                          {onAssignToStudent && (
                            <button type="button" onClick={() => onAssignToStudent(student.id)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 hover:bg-indigo-50 transition-all">
                              <User size={10}/>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {displayStudents.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-xs font-bold">
                    <CheckCircle2 size={28} className="mx-auto mb-2 opacity-30"/>
                    لا يوجد طلاب في هذه القائمة
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════ تحليل الأسئلة ══════ */}
          {activeSection === "questions" && (
            <>
              {questionStats.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart2 size={32} className="mx-auto mb-2 opacity-30"/>
                  <p className="text-xs font-bold">لا توجد بيانات كافية لتحليل الأسئلة بعد</p>
                  <p className="text-[11px] mt-1 text-gray-300">يحتاج النظام لنتائج تفصيلية من الطلاب</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-black text-gray-600">الأسئلة الأعلى نسبة خطأ (من {results.length} إجابة)</p>
                  {questionStats.map((q, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${q.errorRate >= 70 ? "bg-rose-50 border-rose-100" : q.errorRate >= 50 ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${q.errorRate >= 70 ? "bg-rose-500 text-white" : q.errorRate >= 50 ? "bg-amber-500 text-white" : "bg-gray-400 text-white"}`}>
                          {i + 1}
                        </span>
                        <p className="text-xs font-medium text-gray-800 leading-relaxed line-clamp-2 flex-1"
                          dangerouslySetInnerHTML={{ __html: q.text || "—" }}/>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${q.errorRate >= 70 ? "bg-rose-500" : q.errorRate >= 50 ? "bg-amber-400" : "bg-gray-400"}`}
                            style={{ width: `${q.errorRate}%` }}/>
                        </div>
                        <span className={`font-black shrink-0 ${q.errorRate >= 70 ? "text-rose-600" : q.errorRate >= 50 ? "text-amber-600" : "text-gray-500"}`}>
                          {q.errorRate}% خطأ
                        </span>
                        <span className="text-gray-400 shrink-0">({q.wrong} خطأ / {q.correct} صح)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignedTestDetailPanel;
