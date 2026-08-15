import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  EyeOff,
  Eye,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  Unlock,
  FileText,
  Dumbbell,
  Award,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { Quiz, Question } from "../../types";
import { UnifiedQuizBuilder } from "./UnifiedQuizBuilder";
import { UnifiedQuestionBuilder } from "./builders/UnifiedQuestionBuilder";
import { isMaterialQuizCandidate, isTrueMockExam } from "../../utils/mockExam";

type PanelKind = "drill" | "test";

interface SubjectQuizzesPanelProps {
  subjectId: string;
  kind: PanelKind;
}

const kindLabel = (kind: PanelKind) => (kind === "drill" ? "تدريب" : "اختبار");
const kindPlural = (kind: PanelKind) => (kind === "drill" ? "التدريبات" : "الاختبارات");
const kindColor = (kind: PanelKind) =>
  kind === "drill"
    ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", pill: "bg-emerald-100 text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700" }
    : { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100", pill: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700" };

// إصلاح #3: استبعاد المحاكيات الحقيقية من لوحة التدريبات/الاختبارات العادية
const quizMatchesKind = (quiz: Quiz, kind: PanelKind): boolean => {
  if (isTrueMockExam(quiz)) return false;
  if (quiz.quizKind) return quiz.quizKind === kind;
  if (kind === "drill") return quiz.placement === "training" || quiz.showInTraining === true;
  return quiz.placement === "mock" || quiz.type === "quiz" || !quiz.placement;
};

const plainText = (html?: string | null) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const QuizCard: React.FC<{
  quiz: Quiz;
  kind: PanelKind;
  questions: Question[];
  skills: { id: string; name: string }[];
  onToggleVisibility: () => void;
  onToggleAccess: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}> = ({ quiz, kind, questions, skills, onToggleVisibility, onToggleAccess, onEdit, onDelete, onPreview }) => {
  const [expanded, setExpanded] = useState(false);
  const c = kindColor(kind);
  const isVisible = quiz.showOnPlatform !== false;
  const isPaid = quiz.access?.type === "paid";
  const qCount = quiz.questionIds?.length || 0;

  const quizSkillNames = useMemo(() => {
    const ids = new Set(
      (quiz.questionIds || []).flatMap((qid) => {
        const q = questions.find((x) => x.id === qid);
        return q?.skillIds || [];
      })
    );
    return Array.from(ids)
      .map((id) => skills.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[];
  }, [quiz.questionIds, questions, skills]);

  const previewQuestions = useMemo(
    () =>
      (quiz.questionIds || [])
        .slice(0, 3)
        .map((id) => questions.find((q) => q.id === id))
        .filter(Boolean) as Question[],
    [quiz.questionIds, questions]
  );

  return (
    <div className={`rounded-2xl border ${isVisible ? "border-gray-100" : "border-dashed border-gray-200 bg-gray-50/60"} bg-white shadow-sm transition-all`}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${c.pill}`}>
              {kind === "drill" ? <Dumbbell size={10} /> : <Award size={10} />} {kindLabel(kind)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isVisible ? "bg-sky-50 text-sky-700" : "bg-gray-100 text-gray-500"}`}>
              {isVisible ? "👁 ظاهر" : "🙈 مخفي"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isPaid ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {isPaid ? "🔒 ضمن باقة" : "✅ مجاني"}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-600">{qCount} سؤال</span>
          </div>
          <h4 className={`font-black text-sm ${isVisible ? "text-gray-900" : "text-gray-400"}`}>{quiz.title}</h4>
          {quizSkillNames.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {quizSkillNames.slice(0, 4).map((name) => (
                <span key={name} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">{name}</span>
              ))}
              {quizSkillNames.length > 4 && <span className="text-[10px] font-bold text-gray-400">+{quizSkillNames.length - 4}</span>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onToggleVisibility} title={isVisible ? "إخفاء" : "إظهار"} className={`rounded-xl p-2 transition ${isVisible ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={onToggleAccess} title={isPaid ? "تحويل لمجاني" : "جعله ضمن باقة"} className={`rounded-xl p-2 transition ${isPaid ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"}`}>
            {isPaid ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button onClick={onPreview} title="معاينة" className="rounded-xl bg-violet-50 p-2 text-violet-700 hover:bg-violet-100 transition">
            <ExternalLink size={14} />
          </button>
          <button onClick={onEdit} title="تعديل" className="rounded-xl bg-indigo-50 p-2 text-indigo-700 hover:bg-indigo-100 transition">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} title="حذف" className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100 transition">
            <Trash2 size={14} />
          </button>
          {qCount > 0 && (
            <button onClick={() => setExpanded((v) => !v)} title={expanded ? "إخفاء الأسئلة" : "عرض أول 3 أسئلة"} className="rounded-xl bg-gray-50 p-2 text-gray-500 hover:bg-gray-100 transition">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>
      {expanded && previewQuestions.length > 0 && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2">
          <p className="text-[11px] font-black text-gray-400 mb-2">معاينة أول 3 أسئلة:</p>
          {previewQuestions.map((q, i) => (
            <div key={q.id} className="rounded-xl bg-gray-50 px-3 py-2.5 flex items-start gap-2">
              <span className="text-[10px] font-black text-gray-400 mt-0.5 shrink-0">س{i + 1}</span>
              <div className="min-w-0">
                {q.imageUrl && (
                  <img src={q.imageUrl} alt="" className="mb-1 max-h-20 max-w-[200px] rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                {!q.imageUrl && !plainText(q.text) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><ImageIcon size={12} /> صورة فقط</span>
                )}
                {plainText(q.text) && <p className="line-clamp-2 text-xs font-bold text-gray-700 leading-5">{plainText(q.text)}</p>}
                {(q.skillIds || []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(q.skillIds || []).slice(0, 3).map((sid) => (
                      <span key={sid} className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                        {skills.find((s) => s.id === sid)?.name || sid}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {qCount > 3 && <p className="text-center text-[10px] font-bold text-gray-400">+ {qCount - 3} سؤال — افتح التعديل لعرض الكل</p>}
        </div>
      )}
    </div>
  );
};

export const SubjectQuizzesPanel: React.FC<SubjectQuizzesPanelProps> = ({ subjectId, kind }) => {
  // إصلاح #1: استدعاء addQuestion و user من useStore
  const { user, quizzes: allQuizzes, questions, skills, updateQuiz, deleteQuiz, subjects, addQuestion } = useStore();
  const subject = useMemo(() => subjects.find((s) => s.id === subjectId), [subjects, subjectId]);
  const pathId = subject?.pathId || "";

  const [search, setSearch] = useState("");
  const [visFilter, setVisFilter] = useState<"all" | "visible" | "hidden">("all");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  // إصلاح #1: حالة لعرض خطأ إضافة السؤال دون إغلاق النافذة
  const [questionSaveError, setQuestionSaveError] = useState<string | null>(null);

  const subjectQuizzes = useMemo(
    () => allQuizzes.filter((q) => isMaterialQuizCandidate(q) && q.subjectId === subjectId && quizMatchesKind(q, kind)),
    [allQuizzes, subjectId, kind]
  );

  const filteredQuizzes = useMemo(
    () =>
      subjectQuizzes
        .filter((q) => {
          if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
          if (visFilter === "visible" && q.showOnPlatform === false) return false;
          if (visFilter === "hidden" && q.showOnPlatform !== false) return false;
          return true;
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [subjectQuizzes, search, visFilter]
  );

  const visibleCount = subjectQuizzes.filter((q) => q.showOnPlatform !== false).length;
  const hiddenCount = subjectQuizzes.filter((q) => q.showOnPlatform === false).length;

  const toggleVisibility = (quiz: Quiz) => updateQuiz(quiz.id, { showOnPlatform: quiz.showOnPlatform !== false ? false : true });
  const toggleAccess = (quiz: Quiz) => {
    const isPaid = quiz.access?.type === "paid";
    updateQuiz(quiz.id, { access: { ...(quiz.access || {}), type: isPaid ? "free" : "paid" } });
  };
  const handleDelete = (id: string) => { if (window.confirm("هل أنت متأكد من الحذف نهائياً؟")) deleteQuiz(id); };
  const handleEdit = (id: string) => { setEditingQuizId(id); setShowBuilder(true); };
  const handlePreview = (quiz: Quiz) => window.open(`${window.location.origin}/#/quiz/${quiz.id}`, "_blank", "noopener,noreferrer");
  const subjectSkills = useMemo(() => skills.filter((s) => s.subjectId === subjectId), [skills, subjectId]);
  const c = kindColor(kind);

  // إصلاح #1 (حرجة): كان onSave={() => setShowQuestionBuilder(false)} يُغلق النافذة دون حفظ.
  // الآن يستدعي addQuestion → api → قاعدة البيانات ويعرض خطأ واضح عند الفشل.
  const handleQuestionSave = async (savedQuestion: Partial<Question>) => {
    setQuestionSaveError(null);
    try {
      await addQuestion({
        ...savedQuestion,
        ownerType: savedQuestion.ownerType || (user?.role === "teacher" ? "teacher" : "platform"),
        ownerId: savedQuestion.ownerId || user?.id || "",
        createdBy: savedQuestion.createdBy || user?.id || "",
        approvalStatus: savedQuestion.approvalStatus || (user?.role === "admin" ? "approved" : "pending_review"),
      } as Question);
      setShowQuestionBuilder(false);
    } catch (error) {
      // النافذة تبقى مفتوحة — المستخدم يرى الخطأ ولا يفقد بياناته
      setQuestionSaveError(error instanceof Error ? error.message : "تعذر حفظ السؤال. تحقق من الاتصال وحاول مجدداً.");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={`text-xl font-black ${c.text} flex items-center gap-2`}>
            {kind === "drill" ? <Dumbbell size={18} /> : <Award size={18} />} إدارة {kindPlural(kind)}
          </h3>
          <p className="mt-1 text-xs font-bold text-gray-400">
            {kind === "drill"
              ? "تدريبات مكثفة على مهارة أو مهارتين — تُسحب من مركز الاختبارات أو تُنشأ مباشرة."
              : "اختبارات متعددة المهارات — تُسحب من مركز الاختبارات أو تُنشأ مباشرة."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setQuestionSaveError(null); setShowQuestionBuilder(true); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 transition"
          >
            <FileText size={14} /> إضافة سؤال
          </button>
          <button onClick={() => { setEditingQuizId(null); setShowBuilder(true); }} className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white transition ${c.btn}`}>
            <Plus size={14} /> إنشاء {kindLabel(kind)} جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-3 text-center`}>
          <div className={`text-2xl font-black ${c.text}`}>{subjectQuizzes.length}</div>
          <div className="text-[10px] font-bold text-gray-500 mt-0.5">الكلي</div>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-center">
          <div className="text-2xl font-black text-sky-700">{visibleCount}</div>
          <div className="text-[10px] font-bold text-gray-500 mt-0.5">ظاهر للطالب</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
          <div className="text-2xl font-black text-gray-500">{hiddenCount}</div>
          <div className="text-[10px] font-bold text-gray-500 mt-0.5">مخفي / مسودة</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`ابحث في ${kindPlural(kind)}...`} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-bold outline-none focus:border-indigo-300 focus:bg-white" />
        </label>
        {(["all", "visible", "hidden"] as const).map((v) => (
          <button key={v} onClick={() => setVisFilter(v)} className={`rounded-xl px-3 py-2 text-xs font-black transition ${visFilter === v ? `${c.bg} ${c.text} border ${c.border}` : "bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100"}`}>
            {v === "all" ? "الكل" : v === "visible" ? "👁 ظاهر" : "🙈 مخفي"}
          </button>
        ))}
      </div>

      <div className={`rounded-2xl border ${c.border} ${c.bg} px-4 py-3 text-xs font-bold ${c.text} flex items-start gap-2`}>
        <Sparkles size={14} className="mt-0.5 shrink-0" />
        <span>
          {kind === "drill"
            ? "ما تنشئه هنا يُحفظ في مركز الاختبارات ويمكن استدعاؤه في أي مادة أو خطة دراسية."
            : "ما تنشئه هنا يُحفظ في مركز الاختبارات ويمكن ربطه بأي مسار أو مادة لاحقاً."}
        </span>
      </div>

      <div className="space-y-3">
        {filteredQuizzes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            {kind === "drill" ? <Dumbbell size={36} className="mx-auto mb-3 text-gray-300" /> : <Award size={36} className="mx-auto mb-3 text-gray-300" />}
            <p className="text-sm font-black text-gray-400">
              {search || visFilter !== "all" ? "لا توجد نتائج تطابق الفلتر" : `لم تُضَف ${kindPlural(kind)} لهذه المادة بعد`}
            </p>
            <button onClick={() => { setEditingQuizId(null); setShowBuilder(true); }} className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white ${c.btn}`}>
              <Plus size={14} /> أنشئ {kind === "drill" ? "تدريباً" : "اختباراً"} الآن
            </button>
          </div>
        )}
        {filteredQuizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} kind={kind} questions={questions} skills={subjectSkills} onToggleVisibility={() => toggleVisibility(quiz)} onToggleAccess={() => toggleAccess(quiz)} onEdit={() => handleEdit(quiz.id)} onDelete={() => handleDelete(quiz.id)} onPreview={() => handlePreview(quiz)} />
        ))}
      </div>

      {showBuilder && (
        <UnifiedQuizBuilder
          role="admin"
          defaultKind={kind}
          editingQuiz={editingQuizId ? (allQuizzes.find(q => q.id === editingQuizId) ?? undefined) : undefined}
          onClose={() => { setShowBuilder(false); setEditingQuizId(null); }}
        />
      )}

      {showQuestionBuilder && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8" onClick={() => setShowQuestionBuilder(false)}>
          <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"><FileText size={14} /> منشئ الأسئلة الموحد</div>
                <h3 className="mt-2 text-lg font-black text-gray-900">إضافة سؤال إلى بنك الأسئلة</h3>
                <p className="text-xs font-bold text-gray-400">يُحفظ في مركز الأسئلة حسب التصنيف</p>
              </div>
              <button onClick={() => setShowQuestionBuilder(false)} className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 text-lg leading-none">✕</button>
            </div>
            <div className="p-6">
              {/* إصلاح #1: رسالة خطأ واضحة — النافذة لا تُغلق عند الفشل */}
              {questionSaveError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  ⚠️ {questionSaveError}
                </div>
              )}
              <UnifiedQuestionBuilder
                initialQuestion={{ pathId, subject: subjectId }}
                subjectId={subjectId}
                onSave={handleQuestionSave}
                onCancel={() => setShowQuestionBuilder(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectQuizzesPanel;
