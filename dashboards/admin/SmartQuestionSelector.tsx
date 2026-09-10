import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, Filter, Zap, BookOpen, Brain, X, CheckCircle2, GripVertical, BarChart2, AlertCircle, Loader2, RefreshCw, ChevronRight, ChevronLeft, Eye, CheckSquare, Layers } from "lucide-react";
import { useStore } from "../../store/useStore";
import { Question } from "../../types";
import { api } from "../../services/api";
import { assessmentQuestionSource } from "../../utils/exams/assessmentQuestionSource";
import { normalizeQuestionHtml } from "../../utils/questionHtml";

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
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const selectedSkillKey = useMemo(() => [...selectedSkillIds].sort().join("|"), [selectedSkillIds]);
  const questionSourceFilters = useMemo(() => ({
    pathId,
    subjectId,
    sectionId: selectedSectionId || undefined,
    skillIds: mode === "skills" && selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
    difficulty: difficulty === "all" ? undefined : difficulty,
    search: searchTerm.trim() || undefined,
  }), [difficulty, mode, pathId, searchTerm, selectedSectionId, selectedSkillIds, subjectId]);

  // ── بحث صفحة واحدة من المصدر القانوني؛ لا نحمّل بنك المسار كاملاً ──────────
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
      .searchPage({
        ...questionSourceFilters,
        page: manualPage,
        limit: CLIENT_PAGE_SIZE,
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
  }, [manualPage, pathId, questionSourceFilters, refreshKey]);

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

  const totalManualPages = Math.max(1, Math.ceil(totalAvailable / CLIENT_PAGE_SIZE));
  const visibleFilteredQuestions = apiQuestions;

  useEffect(() => {
    setManualPage(1);
  }, [mode, searchTerm, difficulty, selectedSectionId, selectedSkillKey]);

  useEffect(() => {
    if (manualPage > totalManualPages) setManualPage(totalManualPages);
  }, [manualPage, totalManualPages]);

  // ── الأقسام والمهارات المتاحة للمادة المختارة داخل المسار ─────────────────
  const scopedSubjectIds = useMemo(() => {
    if (subjectId) return new Set([subjectId]);
    return new Set(subjects.filter((subject) => subject.pathId === pathId).map((subject) => subject.id));
  }, [subjects, pathId, subjectId]);

  const availableSections = useMemo(
    () => sections.filter((section) => scopedSubjectIds.has(section.subjectId)),
    [sections, scopedSubjectIds],
  );
  const availableSkills = useMemo(() => {
    if (!selectedSectionId) return skills.filter((skill) => scopedSubjectIds.has(skill.subjectId));
    return skills.filter((skill) => scopedSubjectIds.has(skill.subjectId) && skill.sectionId === selectedSectionId);
  }, [skills, scopedSubjectIds, selectedSectionId]);

  useEffect(() => {
    if (!selectedSectionId) return;
    if (availableSections.some((section) => section.id === selectedSectionId)) return;
    setSelectedSectionId("");
    setSelectedSkillIds([]);
  }, [availableSections, selectedSectionId]);

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

  const skillNameMap = useMemo(() => {
    const map = new Map<string, string>();
    skills.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [skills]);

  const sectionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sections]);

  const allCurrentPageSelected = visibleFilteredQuestions.length > 0 && visibleFilteredQuestions.every((q) => selectedIds.includes(q.id));
  const toggleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      const currentPageIds = new Set(visibleFilteredQuestions.map((q) => q.id));
      onChange(selectedIds.filter((id) => !currentPageIds.has(id)));
    } else {
      const remainingSlots = maxQuestions - selectedIds.length;
      const toAdd = visibleFilteredQuestions
        .map((q) => q.id)
        .filter((id) => !selectedIds.includes(id))
        .slice(0, remainingSlots);
      onChange([...selectedIds, ...toAdd]);
    }
  };

  const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و'];

  return (
    <div data-testid="assessment-question-selector" className="space-y-4">
      {/* ── الشريط العلوي لاختيار الوضع والملخص ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/90 p-2.5 rounded-2xl border border-gray-200/80">
        <div className="flex gap-1.5 bg-gray-200/80 p-1 rounded-xl">
          {[
            { id: "manual" as SelectionMode, label: "تصفح الأسئلة", icon: <Filter size={14} /> },
            { id: "skills" as SelectionMode, label: "تصفية بالمهارات", icon: <BookOpen size={14} /> },
            { id: "smart" as SelectionMode, label: "توليد ذكي تلقائي", icon: <Brain size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                mode === tab.id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <span className="font-bold text-gray-500">
            {totalAvailable > 0 && !loadingQuestions && (
              <span className="bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 font-bold">
                {totalAvailable} سؤال متاح
              </span>
            )}
          </span>
          <span className="font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
            المختارة: {selectedIds.length} / {maxQuestions}
          </span>
        </div>
      </div>

      {!pathId && (
        <div className="py-8 text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl font-bold">
          ⚠️ اختر المسار أولاً لتظهر الأسئلة
        </div>
      )}

      {/* ── التقسيم الرئيسي: تصفح الأسئلة (يمين) + السلة المختارة (يسار) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ══════════════════════════════════════════════════════════════════════
            القسم الرئيسي: استعراض الأسئلة والبحث والفلاتر (8 أعمدة)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">

          {/* حالة التوليد الذكي */}
          {mode === "smart" && (
            <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/70 border border-indigo-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-800 font-black text-sm">
                <Brain size={18} className="text-indigo-600" />
                <span>التوليد التلقائي الذكي للاختبار</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">عدد الأسئلة المطلوب إضافتها</label>
                  <input
                    type="number"
                    min={1}
                    max={maxQuestions}
                    value={smartCount}
                    onChange={(e) => setSmartCount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-black text-center focus:outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">توزيع مستويات الصعوبة</label>
                  <select
                    value={smartMode}
                    onChange={(e) => setSmartMode(e.target.value as SmartMode)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="balanced">متوازن (30% سهل / 50% متوسط / 20% صعب)</option>
                    <option value="easy">أسهل (60% سهل / 30% متوسط / 10% صعب)</option>
                    <option value="hard">أصعب (10% سهل / 30% متوسط / 60% صعب)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">المهارات المستهدفة للتوليد</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-white/80 rounded-xl border border-indigo-100">
                  {availableSkills.slice(0, 30).map((skill) => {
                    const isSkillActive = selectedSkillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => setSelectedSkillIds((prev) => prev.includes(skill.id) ? prev.filter((id) => id !== skill.id) : [...prev, skill.id])}
                        className={`text-xs px-2.5 py-1 rounded-full border font-bold transition-all ${
                          isSkillActive
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "border-gray-200 text-gray-700 hover:border-indigo-300 bg-white"
                        }`}
                      >
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {smartError && (
                <p className="text-rose-600 text-xs font-bold flex items-center gap-1">
                  <AlertCircle size={14} /> {smartError}
                </p>
              )}

              <button
                type="button"
                onClick={handleSmartGenerate}
                disabled={smartLoading || !pathId}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl text-sm transition-all disabled:opacity-50 shadow"
              >
                {smartLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> جارٍ التوليد الذكي للأسئلة...</>
                ) : (
                  <><Zap size={16} /> توليد {smartCount} سؤال تلقائياً وإضافتها للاختيار</>
                )}
              </button>
            </div>
          )}

          {/* شريط الفلاتر والبحث في نمط التصفح اليدوي أو بالمهارات */}
          {mode !== "smart" && (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 space-y-3 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                {/* البحث السريع */}
                <div className="md:col-span-6 relative">
                  <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    data-testid="assessment-question-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث في نص السؤال أو الرموز..."
                    dir="rtl"
                    className="w-full pr-9 pl-8 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* القسم */}
                <div className="md:col-span-3">
                  <select
                    value={selectedSectionId}
                    onChange={(e) => { setSelectedSectionId(e.target.value); setSelectedSkillIds([]); }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">كل الأقسام</option>
                    {availableSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* مستوى الصعوبة */}
                <div className="md:col-span-3 flex gap-1">
                  {(["all", "Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 text-[11px] font-black py-1.5 rounded-lg border transition-all ${
                        difficulty === d
                          ? d === "all"
                            ? "bg-gray-800 text-white border-gray-800 shadow-xs"
                            : DIFFICULTY_COLORS[d] + " border-current shadow-xs"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50/50"
                      }`}
                    >
                      {d === "all" ? "الكل" : DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* شريط المهارات (يظهر بوضوح في نمط بالمهارات) */}
              {mode === "skills" && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                    <span className="flex items-center gap-1 text-indigo-700">
                      <BookOpen size={13} /> المهارات المتاحة للتصفية ({availableSkills.length})
                    </span>
                    {selectedSkillIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSkillIds([])}
                        className="text-[11px] text-rose-600 hover:underline font-bold"
                      >
                        إلغاء تحديد المهارات ({selectedSkillIds.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                    {availableSkills.map((skill) => {
                      const isSkillSelected = selectedSkillIds.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => setSelectedSkillIds((prev) => prev.includes(skill.id) ? prev.filter((id) => id !== skill.id) : [...prev, skill.id])}
                          className={`text-xs px-2.5 py-1 rounded-full border font-bold transition-all ${
                            isSkillSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "border-gray-200 text-gray-600 hover:border-indigo-300 bg-white"
                          }`}
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* شريط الإجراءات السريعة وحالة التصفية */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllCurrentPage}
                    disabled={visibleFilteredQuestions.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-black text-xs transition-all disabled:opacity-40"
                  >
                    <CheckSquare size={13} />
                    <span>
                      {allCurrentPageSelected
                        ? "إلغاء تحديد أسئلة الصفحة"
                        : `تحديد كل أسئلة الصفحة (${visibleFilteredQuestions.length})`}
                    </span>
                  </button>

                  <span className="text-gray-400 font-bold hidden sm:inline">
                    • مطابقة الفلتر: {totalAvailable} سؤال
                  </span>
                </div>

                {totalManualPages > 1 && (
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-500">
                    <button
                      type="button"
                      data-testid="assessment-question-page-previous"
                      onClick={() => setManualPage((page) => Math.max(1, page - 1))}
                      disabled={manualPage <= 1}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronRight size={13} /> السابق
                    </button>
                    <span className="px-2 font-mono">صفحة {manualPage} من {totalManualPages}</span>
                    <button
                      type="button"
                      data-testid="assessment-question-page-next"
                      onClick={() => setManualPage((page) => Math.min(totalManualPages, page + 1))}
                      disabled={manualPage >= totalManualPages}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                    >
                      التالي <ChevronLeft size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* تنبيهات التحميل والخطأ */}
          {loadingQuestions && (
            <div className="py-12 text-center text-xs text-indigo-700 flex flex-col items-center justify-center gap-2.5 font-bold bg-white rounded-2xl border border-gray-100">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <span>جارٍ تحميل الأسئلة من بنك الأسئلة...</span>
            </div>
          )}

          {loadError && !loadingQuestions && (
            <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
              <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <AlertCircle size={15} /> {loadError}
              </span>
              <button
                type="button"
                onClick={handleRefetch}
                className="text-xs font-black text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-rose-100 shadow-xs"
              >
                <RefreshCw size={13} /> إعادة المحاولة
              </button>
            </div>
          )}

          {/* ── قائمة بطاقات الأسئلة الواسعة والمباشرة ───────────────────── */}
          {!loadingQuestions && !loadError && pathId && (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1 rounded-2xl">
              {visibleFilteredQuestions.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-200">
                  <BarChart2 size={36} className="mx-auto mb-2.5 opacity-30 text-indigo-400" />
                  <p className="font-bold text-sm text-gray-600">لا توجد أسئلة تطابق الفلتر الحالي</p>
                  <p className="text-gray-400 mt-1">جرّب تغيير مستوى الصعوبة أو تصفية المهارات أو نص البحث</p>
                </div>
              ) : (
                visibleFilteredQuestions.map((q, idx) => {
                  const isSelected = selectedIds.includes(q.id);
                  const rawText = q.text || "";
                  const cleanSnippet = rawText.replace(/<[^>]+>/g, "").trim();
                  const hasText = cleanSnippet.length > 0;
                  const questionNum = (manualPage - 1) * CLIENT_PAGE_SIZE + idx + 1;
                  const skillName = q.skillId ? skillNameMap.get(q.skillId) : null;
                  const sectionName = q.sectionId ? sectionNameMap.get(q.sectionId) : null;

                  return (
                    <div
                      key={q.id}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isSelected
                          ? "bg-indigo-50/40 border-indigo-300 shadow-sm ring-1 ring-indigo-200"
                          : "bg-white border-gray-200/90 hover:border-indigo-300 hover:shadow-xs"
                      }`}
                    >
                      {/* رأس بطاقة السؤال */}
                      <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          {/* زر التحديد الأساسي المتوافق مع الـ Contract */}
                          <button
                            type="button"
                            data-testid={`assessment-question-select-${q.id}`}
                            onClick={() => toggleQuestion(q.id)}
                            disabled={!isSelected && selectedIds.length >= maxQuestions}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                                : "bg-white border border-gray-300 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-40"
                            }`}
                          >
                            <CheckCircle2 size={14} className={isSelected ? "text-white" : "text-gray-400"} />
                            <span>{isSelected ? "محدد للاختبار" : "تحديد السؤال"}</span>
                          </button>

                          <span className="text-xs font-black text-gray-400 font-mono">#{questionNum}</span>

                          {/* شارة الصعوبة */}
                          {q.difficulty && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[q.difficulty] || ""}`}>
                              {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                            </span>
                          )}

                          {/* شارة المهارة */}
                          {skillName && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                              <BookOpen size={10} />
                              {skillName}
                            </span>
                          )}

                          {/* شارة القسم */}
                          {sectionName && (
                            <span className="hidden md:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {sectionName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                          {q.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setZoomImageUrl(q.imageUrl || null)}
                              title="معاينة الصورة مكبرة"
                              className="p-1 rounded-lg hover:bg-gray-200 text-indigo-600 font-bold flex items-center gap-1 text-[11px]"
                            >
                              <Eye size={13} /> تكبير الصورة
                            </button>
                          )}
                          <span>#{q.id.slice(-6)}</span>
                        </div>
                      </div>

                      {/* محتوى بطاقة السؤال */}
                      <div className="p-4 space-y-3 text-right" dir="rtl">
                        {/* نص السؤال */}
                        {hasText ? (
                          <div
                            className="text-sm font-bold text-gray-900 leading-relaxed border-r-2 border-indigo-400 pr-2.5"
                            dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(rawText) }}
                          />
                        ) : (
                          <div className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <Layers size={13} />
                            <span>سؤال مصور (المسألة موجودة بالصورة أدناه):</span>
                          </div>
                        )}

                        {/* صورة السؤال المباشرة والواضحة */}
                        {q.imageUrl && (
                          <div className="relative group rounded-xl border border-gray-200 bg-gray-50/50 p-2 max-w-xl mx-auto sm:mx-0">
                            <img
                              src={q.imageUrl}
                              alt="صورة السؤال"
                              className="max-h-60 w-auto mx-auto object-contain rounded-lg cursor-zoom-in bg-white"
                              onClick={() => setZoomImageUrl(q.imageUrl || null)}
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomImageUrl(q.imageUrl || null)}
                              className="absolute bottom-3 left-3 bg-black/70 hover:bg-black text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shadow"
                            >
                              <Eye size={12} /> تكبير
                            </button>
                          </div>
                        )}

                        {/* خيارات الإجابة (MCQ) */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === q.correctOptionIndex;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs leading-relaxed transition-all ${
                                    isCorrect
                                      ? "bg-emerald-50/90 border-emerald-300 text-emerald-900 font-bold"
                                      : "bg-gray-50/70 border-gray-100 text-gray-700 font-medium"
                                  }`}
                                >
                                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5 ${
                                    isCorrect ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"
                                  }`}>
                                    {OPTION_LETTERS[optIdx] || String(optIdx + 1)}
                                  </span>
                                  <span
                                    className="flex-1"
                                    dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(opt) || "—" }}
                                  />
                                  {isCorrect && (
                                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600 mt-0.5" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* الشرح إن وجد */}
                        {q.explanation && (
                          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2.5 flex items-start gap-2">
                            <span className="shrink-0 font-black">💡 الشرح:</span>
                            <div className="flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(q.explanation) }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ترقيم الصفحات السفلي */}
          {totalManualPages > 1 && mode !== "smart" && (
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 bg-white p-2.5 rounded-xl border border-gray-100">
              <button
                type="button"
                onClick={() => setManualPage((page) => Math.max(1, page - 1))}
                disabled={manualPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight size={13} /> السابق
              </button>
              <span className="font-mono">صفحة {manualPage} من {totalManualPages}</span>
              <button
                type="button"
                onClick={() => setManualPage((page) => Math.min(totalManualPages, page + 1))}
                disabled={manualPage >= totalManualPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
              >
                التالي <ChevronLeft size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            القسم الأيسر: السلة الجانبية للأسئلة المختارة (4 أعمدة)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 flex flex-col gap-3 lg:sticky lg:top-1 bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-gray-900">
              الأسئلة المختارة <span className="text-indigo-600 mr-1">({selectedIds.length}/{maxQuestions})</span>
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
              {["Easy","Medium","Hard"].map((d) => (
                <span key={d} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full inline-block ${d==="Easy"?"bg-emerald-400":d==="Medium"?"bg-amber-400":"bg-rose-400"}`}/>
                  {selectedQuestions.filter((q) => q.difficulty === d).length}
                </span>
              ))}
            </div>
          </div>

          {/* شريط نسبة الاكتمال */}
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (selectedIds.length / maxQuestions) * 100)}%` }}
            />
          </div>

          {/* فحص النزاهة القانوني للـ Contract */}
          {(missingSelectedIds.length > 0 || duplicateSelectedIds.length > 0 || selectionHydrationError) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 space-y-1">
              {selectionHydrationError && <p>تعذر التحقق من بعض الأسئلة المختارة: {selectionHydrationError}</p>}
              {missingSelectedIds.length > 0 && <p>{missingSelectedIds.length} سؤال غير متاح حاليًا. لن يتم إخفاؤه بصمت.</p>}
              {duplicateSelectedIds.length > 0 && <p>تم اكتشاف IDs مكررة في الاختيار القديم: {duplicateSelectedIds.length}</p>}
            </div>
          )}

          {/* قائمة العناصر المختارة بالسحب والإفلات */}
          <div className="overflow-y-auto space-y-2 max-h-[520px] border border-gray-100 rounded-xl p-2 bg-gray-50/50">
            {selectedIds.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                <BarChart2 size={32} className="mx-auto mb-2 opacity-30 text-indigo-400" />
                <p className="font-bold">لم تختر أسئلة بعد</p>
                <p className="text-[11px] text-gray-400 mt-1">اضغط "تحديد السؤال" من القائمة لإضافته هنا</p>
              </div>
            ) : (
              selectedIds.map((id, index) => {
                const q = allQuestionsMap.get(id);
                if (!q) {
                  return (
                    <div key={`${id}-${index}`} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs">
                      <AlertCircle size={13} className="text-amber-600 shrink-0" />
                      <span className="text-gray-400 font-mono text-[10px] w-5 shrink-0">{index + 1}</span>
                      <span className="flex-1 font-bold text-amber-800 line-clamp-1">سؤال غير متاح حاليًا — {id}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedAt(index)}
                        className="shrink-0 text-amber-500 hover:text-rose-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                }

                const plainText = (q.text || "").replace(/<[^>]+>/g, "").trim();
                const displayTitle = plainText ? plainText.slice(0, 50) : (q.imageUrl ? "سؤال مصور" : `سؤال #${q.id.slice(-5)}`);

                return (
                  <div
                    key={`${q.id}-${index}`}
                    data-testid={`assessment-selected-question-${q.id}`}
                    draggable
                    onDragStart={(e) => { setDraggedId(q.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(q.id); }}
                    onDrop={(e) => handleDrop(e, q.id)}
                    onDragLeave={() => setDragOverId(null)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border bg-white text-xs transition-all cursor-grab ${
                      dragOverId === q.id ? "border-indigo-500 bg-indigo-50 shadow-xs" : "border-gray-200 hover:border-gray-300 shadow-2xs"
                    }`}
                  >
                    <GripVertical size={13} className="text-gray-400 shrink-0" />
                    <span className="text-gray-400 font-mono text-[10px] w-4 shrink-0">{index + 1}</span>

                    {/* مصغر الصورة إن وجد */}
                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt="مصغر"
                        onClick={() => setZoomImageUrl(q.imageUrl || null)}
                        className="w-8 h-8 rounded-lg border border-gray-200 object-contain bg-white shrink-0 cursor-pointer"
                        title="انقر للتكبير"
                      />
                    )}

                    <span className="flex-1 font-bold line-clamp-1 text-gray-800">{displayTitle}</span>

                    {q.difficulty && (
                      <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[q.difficulty] || ""}`}>
                        {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeSelectedAt(index)}
                      className="shrink-0 p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف من الاختبار"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
              <span className="text-gray-500 font-bold">يمكنك سحب الأسئلة لإعادة الترتيب</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-black"
              >
                مسح الكل ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── نافذة منبثقة لتكبير صورة السؤال (Zoom Lightbox) ───────────────── */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-3 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-gray-100 text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <Eye size={14} className="text-indigo-600" />
                معاينة مكبرة لصورة السؤال
              </span>
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-rose-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={zoomImageUrl}
              alt="معاينة مكبرة"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartQuestionSelector;
