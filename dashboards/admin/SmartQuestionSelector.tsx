import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, Filter, Zap, BookOpen, Brain, X, CheckCircle2, GripVertical, BarChart2, AlertCircle, Loader2, RefreshCw, ChevronRight, ChevronLeft } from "lucide-react";
import { useStore } from "../../store/useStore";
import { Question } from "../../types";
import { api } from "../../services/api";
import { assessmentQuestionSource } from "../../utils/exams/assessmentQuestionSource";

type SelectionMode = "manual" | "skills" | "smart";
type Difficulty = "all" | "Easy" | "Medium" | "Hard";
type SmartMode = "balanced" | "easy" | "hard";

export interface SmartQuestionSelectorProps {
  pathId: string;
  subjectId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxQuestions?: number;
}

const DIFFICULTY_LABELS: Record<string, string> = { Easy: "سهل", Medium: "متوسط", Hard: "صعب" };
const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Hard: "bg-rose-100 text-rose-700 border-rose-200",
};
const CLIENT_PAGE_SIZE = 100;

export const SmartQuestionSelector: React.FC<SmartQuestionSelectorProps> = ({
  pathId, subjectId, selectedIds, onChange, maxQuestions = 100,
}) => {
  const { skills, sections, subjects } = useStore();

  // ── Canonical question-source state ───────────────────────────────────────
  const [apiQuestions, setApiQuestions] = useState<Question[]>([]);
  const [hydratedSelectedQuestions, setHydratedSelectedQuestions] = useState<Question[]>([]);
  const [missingSelectedIds, setMissingSelectedIds] = useState<string[]>([]);
  const [duplicateSelectedIds, setDuplicateSelectedIds] = useState<string[]>([]);
  const [selectionHydrationError, setSelectionHydrationError] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const requestGenerationRef = useRef(0);

  const [mode, setMode] = useState<SelectionMode>("manual");
  const [searchTerm, setSearchTerm] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [smartCount, setSmartCount] = useState(10);
  const [smartMode, setSmartMode] = useState<SmartMode>("balanced");
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [manualPage, setManualPage] = useState(1);
  const selectedSkillKey = useMemo(() => [...selectedSkillIds].sort().join("|"), [selectedSkillIds]);

  // ── تحميل النطاق الحالي من المصدر القانوني بدون حد 300/1000 صامت ─────────
  useEffect(() => {
    const generation = ++requestGenerationRef.current;

    if (!pathId) {
      setApiQuestions([]);
      setTotalAvailable(0);
      setLoadError("");
      setLoadingQuestions(false);
      return;
    }

    setLoadingQuestions(true);
    setLoadError("");

    void assessmentQuestionSource
      .loadAll({
        pathId,
        subjectId,
        sectionId: selectedSectionId || undefined,
        approvalStatus: 'approved',
      })
      .then((result) => {
        if (generation !== requestGenerationRef.current) return;
        setApiQuestions(result.questions);
        setTotalAvailable(result.total);
        setLoadError("");
      })
      .catch((error) => {
        if (generation !== requestGenerationRef.current) return;
        setApiQuestions([]);
        setTotalAvailable(0);
        setLoadError(error instanceof Error ? error.message : "تعذر تحميل الأسئلة. حاول مجدداً.");
      })
      .finally(() => {
        if (generation === requestGenerationRef.current) setLoadingQuestions(false);
      });
  }, [pathId, subjectId, selectedSectionId, refreshKey]);

  // ── Hydrate المختارة بالـIDs مباشرة؛ لا تعتمد على Store أو الصفحة الحالية ─
  const selectedHydrationKey = useMemo(
    () => selectedIds.map(String).filter(Boolean).sort().join("\u0001"),
    [selectedIds],
  );

  useEffect(() => {
    let active = true;

    if (!selectedHydrationKey) {
      setHydratedSelectedQuestions([]);
      setMissingSelectedIds([]);
      setDuplicateSelectedIds([]);
      setSelectionHydrationError("");
      return () => {
        active = false;
      };
    }

    setSelectionHydrationError("");
    void assessmentQuestionSource
      .hydrateByIds(selectedIds)
      .then((result) => {
        if (!active) return;
        setHydratedSelectedQuestions(result.questions);
        setMissingSelectedIds(result.missingIds);
        setDuplicateSelectedIds(result.duplicateIds);
      })
      .catch((error) => {
        if (!active) return;
        setHydratedSelectedQuestions([]);
        setMissingSelectedIds([]);
        setDuplicateSelectedIds([]);
        setSelectionHydrationError(error instanceof Error ? error.message : "تعذر التحقق من الأسئلة المختارة.");
      });

    return () => {
      active = false;
    };
  }, [selectedHydrationKey]);

  // ── خريطة المصدر الحالي + hydrate المختارة؛ الـAPI هو مصدر الحقيقة ────────
  const allQuestionsMap = useMemo(() => {
    const map = new Map<string, Question>();
    apiQuestions.forEach((q) => map.set(q.id, q));
    hydratedSelectedQuestions.forEach((q) => map.set(q.id, q));
    return map;
  }, [apiQuestions, hydratedSelectedQuestions]);

  const selectedQuestions = useMemo(
    () => selectedIds.map((id) => allQuestionsMap.get(id)).filter(Boolean) as Question[],
    [selectedIds, allQuestionsMap],
  );

  // ── الفلترة تعمل على كامل النطاق الذي تم تحميله عبر pagination ─────────────
  const filteredQuestions = useMemo(() => {
    let result = apiQuestions;
    if (mode === "skills" && selectedSkillIds.length > 0)
      result = result.filter((q) => (q.skillIds || []).some((id) => selectedSkillIds.includes(id)));
    if (searchTerm.trim())
      result = result.filter((q) => (q.text || "").toLowerCase().includes(searchTerm.toLowerCase()));
    if (difficulty !== "all") result = result.filter((q) => q.difficulty === difficulty);
    return result;
  }, [apiQuestions, mode, selectedSkillIds, searchTerm, difficulty]);

  const totalManualPages = Math.max(1, Math.ceil(filteredQuestions.length / CLIENT_PAGE_SIZE));
  const visibleFilteredQuestions = useMemo(() => {
    const start = (manualPage - 1) * CLIENT_PAGE_SIZE;
    return filteredQuestions.slice(start, start + CLIENT_PAGE_SIZE);
  }, [filteredQuestions, manualPage]);

  useEffect(() => {
    setManualPage(1);
  }, [mode, searchTerm, difficulty, selectedSectionId, selectedHydrationKey, selectedSkillKey]);

  useEffect(() => {
    if (manualPage > totalManualPages) setManualPage(totalManualPages);
  }, [manualPage, totalManualPages]);

  // ── الأقسام والمهارات المتاحة للمسار ──────────────────────────────────────
  const pathSubjectIds = useMemo(() => {
    return new Set(subjects.filter((s) => s.pathId === pathId).map((s) => s.id));
  }, [subjects, pathId]);

  const availableSections = useMemo(
    () => sections.filter((s) => pathSubjectIds.has(s.subjectId)),
    [sections, pathSubjectIds],
  );
  const availableSkills = useMemo(() => {
    if (!selectedSectionId) return skills.filter((s) => pathSubjectIds.has(s.subjectId));
    return skills.filter((s) => pathSubjectIds.has(s.subjectId) && s.sectionId === selectedSectionId);
  }, [skills, pathSubjectIds, selectedSectionId]);

  const toggleQuestion = useCallback((id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((sid) => sid !== id));
    else if (selectedIds.length < maxQuestions) onChange([...selectedIds, id]);
  }, [selectedIds, onChange, maxQuestions]);

  const removeSelectedAt = useCallback((index: number) => {
    onChange(selectedIds.filter((_, selectedIndex) => selectedIndex !== index));
  }, [selectedIds, onChange]);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDragOverId(null); return; }
    const from = selectedIds.indexOf(draggedId);
    const to = selectedIds.indexOf(targetId);
    if (from === -1 || to === -1) { setDragOverId(null); return; }
    const next = [...selectedIds];
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    onChange(next);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleSmartGenerate = async () => {
    setSmartLoading(true);
    setSmartError("");
    try {
      const params = new URLSearchParams({ pathId, count: String(smartCount), mode: smartMode });
      if (subjectId) params.set("subjectId", subjectId);
      if (selectedSkillIds.length > 0) params.set("skillIds", selectedSkillIds.join(","));
      const result = await api.get(`/quizzes/smart-suggest?${params.toString()}`) as { questions: Question[] };
      const newIds = (result.questions || []).map((q: Question) => q.id).filter(Boolean);
      onChange([...new Set([...selectedIds, ...newIds])].slice(0, maxQuestions));
    } catch (err) {
      setSmartError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSmartLoading(false);
    }
  };

  const handleRefetch = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* اللوحة اليسرى */}
      <div className="flex flex-col gap-3">
        {/* أزرار الطريقة */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { id: "manual" as SelectionMode, label: "يدوي", icon: <Filter size={13}/> },
            { id: "skills" as SelectionMode, label: "بالمهارات", icon: <BookOpen size={13}/> },
            { id: "smart" as SelectionMode, label: "ذكي تلقائي", icon: <Brain size={13}/> },
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => setMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${mode === tab.id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {!pathId && (
          <div className="py-6 text-center text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl font-bold">
            ⚠️ اختر المسار أولاً لتظهر الأسئلة
          </div>
        )}

        {loadingQuestions && (
          <div className="py-6 text-center text-xs text-indigo-600 flex items-center justify-center gap-2 font-bold">
            <Loader2 size={16} className="animate-spin"/> جارٍ تحميل الأسئلة...
          </div>
        )}

        {loadError && !loadingQuestions && (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <AlertCircle size={13}/> {loadError}
            </span>
            <button type="button" onClick={handleRefetch}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <RefreshCw size={12}/> إعادة المحاولة
            </button>
          </div>
        )}

        {!loadingQuestions && !loadError && pathId && apiQuestions.length > 0 && (
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold px-1">
            <span>{filteredQuestions.length} مطابق للفلاتر</span>
            <span>{totalAvailable} متاح في النطاق الحالي</span>
          </div>
        )}

        {mode === "smart" && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">عدد الأسئلة</label>
                <input type="number" min={1} max={maxQuestions} value={smartCount}
                  onChange={(e) => setSmartCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-center focus:outline-none focus:border-indigo-400"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">توزيع الصعوبة</label>
                <select value={smartMode} onChange={(e) => setSmartMode(e.target.value as SmartMode)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
                  <option value="balanced">متوازن (30/50/20)</option>
                  <option value="easy">أسهل (60/30/10)</option>
                  <option value="hard">أصعب (10/30/60)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">المهارات (تضيق التوليد)</label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {availableSkills.slice(0, 20).map((skill) => (
                  <button key={skill.id} type="button"
                    onClick={() => setSelectedSkillIds((prev) => prev.includes(skill.id) ? prev.filter((id) => id !== skill.id) : [...prev, skill.id])}
                    className={`text-xs px-2 py-0.5 rounded-full border font-bold transition-all ${selectedSkillIds.includes(skill.id) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-400"}`}>
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>
            {smartError && <p className="text-rose-600 text-xs font-bold flex items-center gap-1"><AlertCircle size={13}/>{smartError}</p>}
            <button type="button" onClick={handleSmartGenerate} disabled={smartLoading || !pathId}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50">
              {smartLoading ? <><Loader2 size={15} className="animate-spin"/>جارٍ التوليد...</> : <><Zap size={15}/>توليد {smartCount} سؤال</>}
            </button>
          </div>
        )}

        {mode !== "smart" && !loadingQuestions && (
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث في السؤال..." dir="rtl"
                className="w-full pr-9 pl-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"/>
            </div>
            <select value={selectedSectionId} onChange={(e) => { setSelectedSectionId(e.target.value); setSelectedSkillIds([]); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-400">
              <option value="">كل الأقسام</option>
              {availableSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {mode === "skills" && (
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50">
                {availableSkills.slice(0, 30).map((skill) => (
                  <button key={skill.id} type="button"
                    onClick={() => setSelectedSkillIds((prev) => prev.includes(skill.id) ? prev.filter((id) => id !== skill.id) : [...prev, skill.id])}
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${selectedSkillIds.includes(skill.id) ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500"}`}>
                    {skill.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              {(["all", "Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                <button key={d} type="button" onClick={() => setDifficulty(d)}
                  className={`flex-1 text-xs font-bold py-1.5 rounded-lg border transition-all ${difficulty === d ? d === "all" ? "bg-gray-700 text-white border-gray-700" : DIFFICULTY_COLORS[d] + " border-current" : "border-gray-200 text-gray-500"}`}>
                  {d === "all" ? "الكل" : DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode !== "smart" && !loadingQuestions && pathId && (
          <div className="space-y-2">
            <div className="overflow-y-auto space-y-1.5 max-h-64 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
              {filteredQuestions.length === 0
                ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    <BarChart2 size={24} className="mx-auto mb-2 opacity-30"/>
                    <p className="font-bold">
                      {apiQuestions.length === 0
                        ? "لا توجد أسئلة في هذا النطاق بعد"
                        : "لا توجد أسئلة تطابق الفلتر"}
                    </p>
                  </div>
                )
                : visibleFilteredQuestions.map((q) => {
                    const isSelected = selectedIds.includes(q.id);
                    const plainText = (q.text || "").replace(/<[^>]+>/g, "").slice(0, 100);
                    return (
                      <button key={q.id} type="button" onClick={() => toggleQuestion(q.id)}
                        disabled={!isSelected && selectedIds.length >= maxQuestions}
                        className={`w-full text-right px-3 py-2.5 rounded-lg border flex items-start gap-2 text-xs transition-all ${isSelected ? "bg-indigo-50 border-indigo-300 text-indigo-900" : "bg-white border-gray-100 text-gray-700 hover:border-indigo-200 disabled:opacity-40"}`}>
                        <CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${isSelected ? "text-indigo-600" : "text-gray-300"}`}/>
                        <span className="flex-1 line-clamp-2 font-medium leading-relaxed">{plainText || "—"}</span>
                        {q.difficulty && (
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[q.difficulty] || ""}`}>
                            {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                          </span>
                        )}
                      </button>
                    );
                  })
              }
            </div>
            {totalManualPages > 1 && (
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 px-1">
                <button type="button" onClick={() => setManualPage((page) => Math.max(1, page - 1))} disabled={manualPage <= 1}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40">
                  <ChevronRight size={12}/> السابق
                </button>
                <span>صفحة {manualPage} من {totalManualPages}</span>
                <button type="button" onClick={() => setManualPage((page) => Math.min(totalManualPages, page + 1))} disabled={manualPage >= totalManualPages}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40">
                  التالي <ChevronLeft size={12}/>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* اللوحة اليمنى: المختارة */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-gray-900">
            المختارة <span className="text-indigo-600 mr-1">({selectedIds.length}/{maxQuestions})</span>
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            {["Easy","Medium","Hard"].map((d) => (
              <span key={d} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full inline-block ${d==="Easy"?"bg-emerald-400":d==="Medium"?"bg-amber-400":"bg-rose-400"}`}/>
                {selectedQuestions.filter((q) => q.difficulty === d).length}
              </span>
            ))}
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (selectedIds.length / maxQuestions) * 100)}%` }}/>
        </div>

        {(missingSelectedIds.length > 0 || duplicateSelectedIds.length > 0 || selectionHydrationError) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 space-y-1">
            {selectionHydrationError && <p>تعذر التحقق من بعض الأسئلة المختارة: {selectionHydrationError}</p>}
            {missingSelectedIds.length > 0 && <p>{missingSelectedIds.length} سؤال مختار غير موجود/غير متاح حاليًا. لن يتم إخفاؤه بصمت.</p>}
            {duplicateSelectedIds.length > 0 && <p>تم اكتشاف IDs مكررة في الاختيار القديم: {duplicateSelectedIds.length}</p>}
          </div>
        )}

        <div className="overflow-y-auto space-y-1.5 max-h-80 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
          {selectedIds.length === 0
            ? <div className="py-10 text-center text-xs text-gray-400"><BarChart2 size={28} className="mx-auto mb-2 opacity-30"/><p className="font-bold">لم تختر أسئلة بعد</p></div>
            : selectedIds.map((id, index) => {
                const q = allQuestionsMap.get(id);
                if (!q) {
                  return (
                    <div key={`${id}-${index}`} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs">
                      <AlertCircle size={13} className="text-amber-600 shrink-0"/>
                      <span className="text-gray-400 font-mono text-[10px] w-5 shrink-0">{index + 1}</span>
                      <span className="flex-1 font-bold text-amber-800 line-clamp-1">سؤال غير متاح حاليًا — {id}</span>
                      <button type="button" onClick={() => removeSelectedAt(index)}
                        className="shrink-0 text-amber-500 hover:text-rose-500 transition-colors"><X size={13}/></button>
                    </div>
                  );
                }

                const plainText = (q.text || "").replace(/<[^>]+>/g, "").slice(0, 80);
                return (
                  <div key={`${q.id}-${index}`} draggable
                    onDragStart={(e) => { setDraggedId(q.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(q.id); }}
                    onDrop={(e) => handleDrop(e, q.id)}
                    onDragLeave={() => setDragOverId(null)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-xs transition-all cursor-grab ${dragOverId === q.id ? "border-indigo-400 bg-indigo-50" : "border-gray-100"}`}>
                    <GripVertical size={13} className="text-gray-300 shrink-0"/>
                    <span className="text-gray-400 font-mono text-[10px] w-5 shrink-0">{index + 1}</span>
                    <span className="flex-1 font-medium line-clamp-1 text-gray-700">{plainText || "—"}</span>
                    {q.difficulty && (
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[q.difficulty] || ""}`}>
                        {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                      </span>
                    )}
                    <button type="button" onClick={() => removeSelectedAt(index)}
                      className="shrink-0 text-gray-300 hover:text-rose-500 transition-colors"><X size={13}/></button>
                  </div>
                );
              })
          }
        </div>
        {selectedIds.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-rose-500 font-bold py-1">
            مسح الكل ({selectedIds.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default SmartQuestionSelector;
