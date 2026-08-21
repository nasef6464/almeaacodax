import React, { useState, useMemo, useEffect } from "react";
import {
  X, ChevronRight, ChevronLeft, BookOpen, Award, Settings,
  Check, Loader2, AlertCircle, FileText, Users, Calendar, Lock, Globe,
  Clock, RotateCcw, Shuffle, Eye,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { Quiz } from "../../types";
import { SmartQuestionSelector } from "./SmartQuestionSelector";
import { getDefaultQuizSettings } from "../../utils/quizSettings";
import { api } from "../../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuizKind = "drill" | "test" | "mock";
type WizardStep = 1 | 2 | 3 | 4;

interface MockSection {
  id: string;
  title: string;
  subjectId: string;
  questionIds: string[];
  timeLimit?: number;
  order: number;
  domain?: "quantitative" | "verbal" | "math" | "physics" | "chemistry" | "biology" | "general";
}

export interface UnifiedQuizBuilderProps {
  role: "admin" | "supervisor" | "teacher";
  allowedGroupIds?: string[];
  allowedPathIds?: string[];
  editingQuiz?: Quiz;
  onSave?: (quiz: Quiz) => void;
  onClose?: () => void;
  defaultKind?: QuizKind;
  initialPathId?: string;
  initialSubjectId?: string;
  initialSkillIds?: string[];
  initialTargetGroupIds?: string[];
  initialTargetUserIds?: string[];
  initialMode?: NonNullable<Quiz['mode']>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const KIND_CONFIG = {
  drill: {
    label: "تدريب",
    desc: "تدريب قصير على مهارة واحدة — بعد درس أو في التأسيس",
    icon: <BookOpen size={22} />,
    gradient: "from-emerald-500 to-teal-500",
    activeCls: "bg-emerald-600 text-white border-emerald-600",
    passiveCls: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  test: {
    label: "اختبار",
    desc: "اختبار شامل على مجموعة مهارات — في صفحة الاختبارات أو داخل دورة",
    icon: <FileText size={22} />,
    gradient: "from-indigo-500 to-blue-500",
    activeCls: "bg-indigo-600 text-white border-indigo-600",
    passiveCls: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
  mock: {
    label: "محاكي قياس",
    desc: "محاكي على غرار اختبار قياس — قدرات أو تحصيلي — متعدد الأقسام",
    icon: <Award size={22} />,
    gradient: "from-violet-500 to-purple-500",
    activeCls: "bg-violet-600 text-white border-violet-600",
    passiveCls: "bg-violet-50 border-violet-200 text-violet-700",
  },
} as const;

const STEPS = [
  { num: 1 as WizardStep, label: "النوع والمعلومات" },
  { num: 2 as WizardStep, label: "الأسئلة" },
  { num: 3 as WizardStep, label: "الإعدادات" },
  { num: 4 as WizardStep, label: "النشر والاستهداف" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export const UnifiedQuizBuilder: React.FC<UnifiedQuizBuilderProps> = ({
  role,
  allowedGroupIds,
  allowedPathIds,
  editingQuiz,
  onSave,
  onClose,
  defaultKind = "test",
  initialPathId = "",
  initialSubjectId = "",
  initialSkillIds,
  initialTargetGroupIds,
  initialTargetUserIds,
  initialMode = "regular",
}) => {
  const { subjects, paths, groups, addQuiz, updateQuiz } = useStore();

  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const isTeacher = role === "teacher";

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(1);
  const [kind, setKind] = useState<QuizKind>(editingQuiz?.quizKind ?? defaultKind);

  // Step 1
  const [title, setTitle] = useState(editingQuiz?.title ?? "");
  const [description, setDescription] = useState(editingQuiz?.description ?? "");
  const [pathId, setPathId] = useState(editingQuiz?.pathId ?? initialPathId);
  const [subjectId, setSubjectId] = useState(editingQuiz?.subjectId ?? initialSubjectId);
  const [qiyasCategory, setQiyasCategory] = useState<"qudrat" | "tahsili">(
    editingQuiz?.mockExam?.qiyasCategory === "tahsili" ? "tahsili" : "qudrat",
  );
  const [mockSections, setMockSections] = useState<MockSection[]>(
    editingQuiz?.mockExam?.sections?.map((s) => ({
      id: s.id,
      title: s.title,
      subjectId: s.subjectId ?? "",
      questionIds: s.questionIds ?? [],
      timeLimit: s.timeLimit,
      order: s.order ?? 0,
      domain: s.domain as MockSection["domain"] ?? "general",
    })) ?? [],
  );

  // Step 2
  const [questionIds, setQuestionIds] = useState<string[]>(editingQuiz?.questionIds ?? []);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  // Step 3
  const defaults = getDefaultQuizSettings({ type: "quiz" });
  const [timeLimit, setTimeLimit] = useState<number>((editingQuiz?.settings as any)?.timeLimit ?? (defaults as any)?.timeLimit ?? 0);
  const [maxAttempts, setMaxAttempts] = useState<number>((editingQuiz?.settings as any)?.maxAttempts ?? 1);
  const [passingScore, setPassingScore] = useState<number>((editingQuiz?.settings as any)?.passingScore ?? 60);
  const [showAnswers, setShowAnswers] = useState<boolean>(editingQuiz?.settings?.showAnswers ?? (editingQuiz?.settings as any)?.showCorrectAnswers ?? true);
  const [showExplanations, setShowExplanations] = useState<boolean>((editingQuiz?.settings as any)?.showExplanations ?? true);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(editingQuiz?.settings?.randomizeQuestions ?? (editingQuiz?.settings as any)?.shuffleQuestions ?? false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>((editingQuiz?.settings as any)?.shuffleOptions ?? false);

  // Step 4
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>(editingQuiz?.targetGroupIds ?? initialTargetGroupIds ?? []);
  const [targetUserIds] = useState<string[]>(editingQuiz?.targetUserIds ?? initialTargetUserIds ?? []);
  const [dueDate, setDueDate] = useState(editingQuiz?.dueDate ?? "");
  const [isPublished, setIsPublished] = useState(editingQuiz?.isPublished ?? isAdmin);
  const [showOnPlatform, setShowOnPlatform] = useState(editingQuiz?.showOnPlatform ?? isAdmin);
  const [accessType, setAccessType] = useState<"free" | "paid" | "package">(
    (editingQuiz?.access?.type as "free" | "paid" | "package") ?? "free",
  );
  const [slots, setSlots] = useState<Array<"tests" | "training" | "course">>(
    (editingQuiz?.learningPlacements?.map((p) => p.slot as "tests" | "training" | "course")) ?? ["tests"],
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Derived ───────────────────────────────────────────────────────────────
  const availablePaths = useMemo(
    () => (allowedPathIds ? paths.filter((p) => allowedPathIds.includes(p.id)) : paths),
    [paths, allowedPathIds],
  );
  const availableSubjects = useMemo(
    () => subjects.filter((s) => !pathId || s.pathId === pathId),
    [subjects, pathId],
  );
  const availableGroups = useMemo(
    () => (allowedGroupIds ? groups.filter((g) => allowedGroupIds.includes(g.id)) : groups),
    [groups, allowedGroupIds],
  );

  // Auto-set pathId from subject
  useEffect(() => {
    if (!subjectId) return;
    const sub = subjects.find((s) => s.id === subjectId);
    if (sub && sub.pathId !== pathId) setPathId(sub.pathId);
  }, [subjectId]);

  // Init mock sections when kind switches to mock
  useEffect(() => {
    if (kind !== "mock" || mockSections.length > 0) return;
    if (qiyasCategory === "qudrat") {
      setMockSections([
        { id: crypto.randomUUID(), title: "قسم الكمي", subjectId: "", questionIds: [], timeLimit: 30, order: 0, domain: "quantitative" },
        { id: crypto.randomUUID(), title: "قسم اللفظي", subjectId: "", questionIds: [], timeLimit: 30, order: 1, domain: "verbal" },
      ]);
    } else {
      setMockSections([
        { id: crypto.randomUUID(), title: "الرياضيات", subjectId: "", questionIds: [], timeLimit: 30, order: 0, domain: "math" },
        { id: crypto.randomUUID(), title: "العلوم", subjectId: "", questionIds: [], timeLimit: 30, order: 1, domain: "general" },
      ]);
    }
  }, [kind, qiyasCategory]);

  // Fetch missing questions if editing an existing quiz
  useEffect(() => {
    if (!editingQuiz) return;
    
    const allIds = editingQuiz.quizKind === 'mock' 
      ? (editingQuiz.mockExam?.sections?.flatMap(s => s.questionIds || []) || [])
      : (editingQuiz.questionIds || []);
      
    if (allIds.length === 0) return;

    const currentQuestions = useStore.getState().questions || [];
    const existingIds = new Set(currentQuestions.map(q => q.id));
    const missingIds = allIds.filter(id => !existingIds.has(id));

    if (missingIds.length > 0) {
      api.getQuestions({ ids: missingIds.join(',') }).then(fetched => {
        if (fetched && fetched.length > 0) {
          useStore.setState(prev => {
            const newQ = [...(prev.questions || [])];
            let added = false;
            fetched.forEach((fq: any) => {
              if (!newQ.find(q => q.id === fq.id)) {
                newQ.push(fq);
                added = true;
              }
            });
            return added ? { questions: newQ } : prev;
          });
        }
      }).catch(err => {
        console.error("Failed to fetch missing questions:", err);
      });
    }
  }, [editingQuiz]);

  // ── Validation ────────────────────────────────────────────────────────────
  const stepValid = [
    title.trim().length > 0 && pathId.length > 0 && subjectId.length > 0,
    kind === "mock" ? mockSections.every((s) => s.questionIds.length > 0) : questionIds.length > 0,
    true,
    isAdmin || targetGroupIds.length > 0 || targetUserIds.length > 0,
  ];

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload: Partial<Quiz> = {
        title: title.trim(),
        description: description.trim(),
        pathId,
        subjectId,
        quizKind: kind,
        questionIds: kind === "mock" ? [] : questionIds,
        settings: {
          ...defaults,
          timeLimit,
          maxAttempts,
          passingScore,
          showAnswers,
          showExplanations,
          randomizeQuestions: shuffleQuestions,
          shuffleOptions,
        } as any,
        access: { type: accessType === "package" ? "paid" : accessType } as any,
        mode: editingQuiz?.mode ?? initialMode,
        skillIds: editingQuiz?.skillIds ?? initialSkillIds ?? [],
        targetGroupIds,
        targetUserIds,
        dueDate: dueDate || undefined,
        isPublished,
        showOnPlatform,
        learningPlacements: slots.map((slot) => ({
          pathId,
          subjectId,
          slot,
          accessType,
          isVisible: true,
          order: 0,
        })),
        ...(kind === "mock"
          ? {
              mockExam: {
                enabled: true,
                pathId,
                sections: mockSections,
                qiyasCategory,
                isStrictSectionLock: true,
              } as any,
              placement: "mock" as const,
              // ضروري: isMockQuiz() يتحقق من showInMock لإظهار الاختبار في QuizzesManager
              showInMock: true,
              showInTraining: false,
            }
          : {
              // drill → يظهر في التدريبات فقط
              // test  → يظهر في الاختبارات + التدريبات (both)
              placement: kind === "drill" ? ("training" as const) : ("both" as const),
              showInTraining: kind === "drill" || kind === "test",
              showInMock: kind === "test",
            }),
        approvalStatus: isTeacher ? "pending_review" : "approved",
      };

      let saved: Quiz;
      if (editingQuiz) {
        saved = (await updateQuiz(editingQuiz.id, payload)) as Quiz;
        // Keep existing fields that weren't updated
        saved = { ...editingQuiz, ...saved };
      } else {
        saved = await addQuiz(payload as Quiz);
      }
      onSave?.(saved);
      onClose?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle helper ─────────────────────────────────────────────────────────
  const Toggle = ({ val, set }: { val: boolean; set: (v: boolean) => void }) => (
    <button type="button" onClick={() => set(!val)}
      className={`w-10 h-5 rounded-full relative transition-all ${val ? "bg-indigo-600" : "bg-gray-200"}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${val ? "right-0.5" : "left-0.5"}`} />
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className={`bg-gradient-to-r ${KIND_CONFIG[kind].gradient} px-6 py-4 text-white flex items-center justify-between shrink-0`}>
          <div>
            <h2 className="text-lg font-black">
              {editingQuiz ? "تعديل" : "إنشاء"} {KIND_CONFIG[kind].label}
            </h2>
            <p className="text-white/80 text-sm mt-0.5">
              {isAdmin ? "مدير المنصة — صلاحيات كاملة" : isSupervisor ? "مشرف — موجّه لمجموعاتك" : "معلم — يُرسل للمراجعة قبل النشر"}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-all">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50 shrink-0 overflow-x-auto">
          {STEPS.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <button key={s.num} type="button"
                onClick={() => isDone && setStep(s.num)}
                disabled={!isDone}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 shrink-0 transition-all ${
                  isActive ? "border-indigo-600 text-indigo-700"
                    : isDone ? "border-transparent text-emerald-600 cursor-pointer"
                      : "border-transparent text-gray-400 cursor-default"
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black ${
                  isActive ? "bg-indigo-600 text-white" : isDone ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"
                }`}>
                  {isDone ? <Check size={10} /> : s.num}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1 ─────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-black text-gray-800 mb-3 block">نوع الاختبار</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(KIND_CONFIG) as QuizKind[])
                    .filter((k) => !(isTeacher && k === "mock"))
                    .map((k) => {
                      const cfg = KIND_CONFIG[k];
                      const isActive = kind === k;
                      return (
                        <button key={k} type="button" onClick={() => setKind(k)}
                          className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-right ${isActive ? cfg.activeCls : cfg.passiveCls + " hover:opacity-80"}`}>
                          <div className="flex items-center gap-2">{cfg.icon}<span className="font-black text-sm">{cfg.label}</span></div>
                          <p className={`text-xs leading-relaxed ${isActive ? "text-white/80" : "opacity-70"}`}>{cfg.desc}</p>
                        </button>
                      );
                    })}
                </div>
              </div>

              {kind === "mock" && (
                <div className="grid grid-cols-2 gap-3">
                  {(["qudrat", "tahsili"] as const).map((cat) => (
                    <button key={cat} type="button"
                      onClick={() => { setQiyasCategory(cat); setMockSections([]); }}
                      className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        qiyasCategory === cat ? "bg-violet-600 text-white border-violet-600" : "bg-violet-50 text-violet-700 border-violet-200"
                      }`}>
                      {cat === "qudrat" ? "قدرات" : "تحصيلي"}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">العنوان *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: اختبار وحدة الاستعارة..." dir="rtl"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">الوصف (اختياري)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={2} dir="rtl"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">المسار *</label>
                  <select value={pathId} onChange={(e) => { setPathId(e.target.value); setSubjectId(""); }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-400">
                    <option value="">اختر المسار</option>
                    {availablePaths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">المادة *</label>
                  <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                    disabled={!pathId}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-400 disabled:opacity-50">
                    <option value="">اختر المادة</option>
                    {availableSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Mock sections setup */}
              {kind === "mock" && (
                <div className="border border-violet-100 rounded-2xl p-4 space-y-3 bg-violet-50/30">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-gray-900">أقسام المحاكي</h4>
                    <button type="button"
                      onClick={() => setMockSections((prev) => [
                        ...prev,
                        { id: crypto.randomUUID(), title: `قسم ${prev.length + 1}`, subjectId: "", questionIds: [], timeLimit: 30, order: prev.length, domain: "general" },
                      ])}
                      className="text-xs font-bold text-violet-700 bg-white px-3 py-1.5 rounded-lg border border-violet-200 hover:border-violet-400 transition-all">
                      + إضافة قسم
                    </button>
                  </div>
                  {mockSections.map((sec, idx) => (
                    <div key={sec.id} className="flex items-center gap-2 bg-white rounded-xl border border-violet-100 p-3">
                      <span className="text-xs font-mono text-gray-400 w-5 shrink-0">{idx + 1}</span>
                      <input value={sec.title}
                        onChange={(e) => setMockSections((prev) => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                        className="flex-1 text-sm font-bold border-0 outline-none bg-transparent" dir="rtl" />
                      <input type="number" min={5} max={180} value={sec.timeLimit ?? 30}
                        onChange={(e) => setMockSections((prev) => prev.map((s, i) => i === idx ? { ...s, timeLimit: Number(e.target.value) } : s))}
                        className="w-16 text-center text-xs border border-gray-200 rounded-lg py-1 focus:outline-none" title="الوقت بالدقيقة" />
                      <span className="text-xs text-gray-400 shrink-0">د</span>
                      {mockSections.length > 1 && (
                        <button type="button" onClick={() => setMockSections((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-gray-300 hover:text-rose-500 transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2 ─────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              {kind === "mock" ? (
                <div>
                  <div className="flex gap-1 border-b border-gray-100 mb-4 overflow-x-auto">
                    {mockSections.map((sec, idx) => (
                      <button key={sec.id} type="button" onClick={() => setActiveSectionIdx(idx)}
                        className={`shrink-0 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                          activeSectionIdx === idx ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500"
                        }`}>
                        {sec.title}
                        <span className={`mr-1 text-[10px] px-1.5 py-0.5 rounded-full font-black ${sec.questionIds.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {sec.questionIds.length}
                        </span>
                      </button>
                    ))}
                  </div>
                  {mockSections[activeSectionIdx] && (
                    <SmartQuestionSelector
                      key={mockSections[activeSectionIdx].id}
                      pathId={pathId}
                      subjectId={mockSections[activeSectionIdx].subjectId || subjectId}
                      selectedIds={mockSections[activeSectionIdx].questionIds}
                      onChange={(ids) => setMockSections((prev) => prev.map((s, i) => i === activeSectionIdx ? { ...s, questionIds: ids } : s))}
                      maxQuestions={80}
                    />
                  )}

                  {/* تحذير: أقسام فارغة */}
                  {mockSections.some((s) => s.questionIds.length === 0) && (
                    <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        <strong>تنبيه:</strong> الأقسام التالية لا تحتوي على أسئلة:{" "}
                        {mockSections.filter((s) => s.questionIds.length === 0).map((s) => s.title).join(" — ")}.
                        يجب إضافة أسئلة لكل قسم قبل الانتقال للخطوة التالية.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <SmartQuestionSelector
                  pathId={pathId}
                  subjectId={subjectId}
                  selectedIds={questionIds}
                  onChange={setQuestionIds}
                  maxQuestions={kind === "drill" ? 20 : 100}
                />
              )}
            </div>
          )}

          {/* ── Step 3 ─────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <label className="text-xs font-black text-gray-700 mb-3 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-500" />المدة الزمنية
                </label>
                <div className="flex items-center gap-3">
                  <input type="number" min={0} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-24 text-center font-black text-lg border border-gray-200 rounded-xl py-2 focus:outline-none focus:border-indigo-400" />
                  <span className="text-sm text-gray-600 font-bold">دقيقة (0 = بلا حد)</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <label className="text-xs font-black text-gray-700 mb-3 flex items-center gap-1.5">
                  <RotateCcw size={14} className="text-indigo-500" />عدد المحاولات
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 0].map((n) => (
                    <button key={n} type="button" onClick={() => setMaxAttempts(n)}
                      className={`px-3 py-2 rounded-lg text-sm font-black border transition-all ${
                        maxAttempts === n ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-200 text-gray-600 hover:border-indigo-400"
                      }`}>
                      {n === 0 ? "∞" : n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <label className="text-xs font-black text-gray-700 mb-2 block">درجة النجاح %</label>
                <input type="range" min={0} max={100} step={5} value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="w-full accent-indigo-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span className="font-black text-indigo-700 text-sm">{passingScore}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                {[
                  { label: "إظهار الإجابة الصحيحة", val: showAnswers, set: setShowAnswers },
                  { label: "إظهار التفسيرات", val: showExplanations, set: setShowExplanations },
                  { label: "ترتيب عشوائي للأسئلة", val: shuffleQuestions, set: setShuffleQuestions },
                  { label: "ترتيب عشوائي للخيارات", val: shuffleOptions, set: setShuffleOptions },
                ].map(({ label, val, set }) => (
                  <label key={label} className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-bold text-gray-700">{label}</span>
                    <Toggle val={val} set={set} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4 ─────────────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Target groups */}
              <div>
                <label className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-500" />
                  المجموعات المستهدفة {!isAdmin && <span className="text-rose-500">*</span>}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50">
                  {availableGroups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white rounded-lg transition-all">
                      <input type="checkbox" checked={targetGroupIds.includes(g.id)}
                        onChange={(e) => {
                          if (e.target.checked) setTargetGroupIds([...targetGroupIds, g.id]);
                          else setTargetGroupIds(targetGroupIds.filter((id) => id !== g.id));
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                      <span className="text-xs font-bold text-gray-700 line-clamp-1">{g.name}</span>
                    </label>
                  ))}
                  {availableGroups.length === 0 && (
                    <p className="col-span-full text-xs text-gray-400 py-4 text-center">لا توجد مجموعات متاحة</p>
                  )}
                </div>
              </div>

              {/* Admin: access + slots */}
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5">
                      <Lock size={14} />نوع الوصول
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["free", "paid", "package"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setAccessType(t)}
                          className={`py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                            accessType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"
                          }`}>
                          {t === "free" ? "🆓 مجاني" : t === "paid" ? "💳 مدفوع" : "📦 باقة"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5">
                      <Globe size={14} />مواضع العرض
                    </label>
                    <div className="space-y-2">
                      {[
                        { id: "tests" as const, label: "صفحة الاختبارات" },
                        { id: "training" as const, label: "التدريبات" },
                        { id: "course" as const, label: "داخل دورة" },
                      ].map(({ id, label }) => (
                        <label key={id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={slots.includes(id)}
                            onChange={(e) => {
                              if (e.target.checked) setSlots([...slots, id]);
                              else setSlots(slots.filter((s) => s !== id));
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                          <span className="text-xs font-bold text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Due date */}
              <div>
                <label className="text-xs font-black text-gray-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={14} />تاريخ انتهاء (اختياري)
                </label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white" />
              </div>

              {/* Publish toggle */}
              <div className="flex items-center gap-4 border border-gray-100 rounded-2xl p-4 bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-800">
                    {isTeacher ? "إرسال للمراجعة" : "نشر الاختبار"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isTeacher
                      ? "سيُرسل للمدير للمراجعة والموافقة قبل الظهور للطلاب"
                      : isPublished ? "سيكون ظاهراً للطلاب فور الحفظ" : "يُحفظ كمسودة"}
                  </p>
                </div>
                {!isTeacher && <Toggle val={isPublished} set={setIsPublished} />}
              </div>

              {/* Admin: show on platform */}
              {isAdmin && (
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 rounded-2xl bg-gray-50">
                  <input type="checkbox" checked={showOnPlatform} onChange={(e) => setShowOnPlatform(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300" />
                  <div>
                    <p className="text-sm font-black text-gray-800">إظهار على المنصة العامة</p>
                    <p className="text-xs text-gray-500">يظهر للجميع بناءً على نوع الوصول المحدد</p>
                  </div>
                </label>
              )}

              {saveError && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm font-bold">
                  <AlertCircle size={16} />{saveError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose} type="button"
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all">
            إلغاء
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button type="button" onClick={() => setStep((s) => (s - 1) as WizardStep)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-all">
                <ChevronRight size={16} />السابق
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={() => setStep((s) => (s + 1) as WizardStep)}
                disabled={!stepValid[step - 1]}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  stepValid[step - 1] ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                التالي <ChevronLeft size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSave}
                disabled={saving || !stepValid[3]}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {isTeacher ? "إرسال للمراجعة" : "حفظ ونشر"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedQuizBuilder;
