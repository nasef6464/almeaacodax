import React, { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "../../../services/api";
import { useStore } from "../../../store/useStore";
import type { CommandCenterWorkflow } from "../../../services/apiGroups/commandCenterApi";

export const CommandCenterNaturalLanguagePanel: React.FC<{
  onWorkflowPlanned: (workflow: CommandCenterWorkflow) => void;
  onError: (message: string) => void;
}> = ({ onWorkflowPlanned, onError }) => {
  const paths = useStore((state) => state.paths);
  const subjects = useStore((state) => state.subjects);
  const sections = useStore((state) => state.sections);

  const [message, setMessage] = useState("");
  const [pathId, setPathId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [summary, setSummary] = useState("");
  const [clarification, setClarification] = useState("");
  const [planning, setPlanning] = useState(false);

  const scopedSubjects = useMemo(
    () => subjects.filter((subject) => !pathId || subject.pathId === pathId),
    [subjects, pathId],
  );
  const scopedSections = useMemo(
    () => sections.filter((section) => !subjectId || section.subjectId === subjectId),
    [sections, subjectId],
  );

  const changePath = (value: string) => {
    setPathId(value);
    if (subjectId && !subjects.some((subject) => subject.id === subjectId && subject.pathId === value)) {
      setSubjectId("");
      setSectionId("");
    }
  };

  const changeSubject = (value: string) => {
    setSubjectId(value);
    if (sectionId && !sections.some((section) => section.id === sectionId && section.subjectId === value)) {
      setSectionId("");
    }
  };

  const plan = async () => {
    const command = message.trim();
    if (!command) return;
    onError("");
    setPlanning(true);
    setSummary("");
    setClarification("");
    try {
      const result = await api.aiAdminCommandPlan({
        message: command,
        ...(pathId ? { pathId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(sectionId ? { sectionId } : {}),
      });
      setSummary(result.summary || "");
      setClarification(result.clarification || "");
      if (result.workflow) onWorkflowPlanned(result.workflow as CommandCenterWorkflow);
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذر تخطيط الأمر.");
    } finally {
      setPlanning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5" dir="rtl">
      <div className="flex items-center gap-2 text-indigo-900 font-black">
        <Sparkles size={18} />
        أمر ذكي للمنصة
      </div>
      <p className="mt-1 text-xs font-bold text-indigo-700">
        حدد المسار والمادة عند أوامر الدورات حتى يقرأ النظام محتوى المنصة الحالي ويطبق Reuse-first تلقائيًا.
      </p>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <select
          value={pathId}
          onChange={(event) => changePath(event.target.value)}
          className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold"
        >
          <option value="">كل المسارات / غير محدد</option>
          {paths.map((path) => <option key={path.id} value={path.id}>{path.name}</option>)}
        </select>
        <select
          value={subjectId}
          onChange={(event) => changeSubject(event.target.value)}
          className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold"
        >
          <option value="">كل المواد / غير محدد</option>
          {scopedSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <select
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
          className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold"
        >
          <option value="">كل الأقسام / غير محدد</option>
          {scopedSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
        </select>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        placeholder="مثال: كوّن لي دورة من الفيديوهات والدروس والاختبارات الموجودة في هذا النطاق، وضع تدريبًا بعد كل درس، ثم افحص النواقص."
        className="mt-3 w-full rounded-xl border border-indigo-200 bg-white p-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={planning || !message.trim()}
          onClick={() => void plan()}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          {planning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          كوّن خطة التنفيذ
        </button>
        {summary && <span className="text-xs font-black text-indigo-900">{summary}</span>}
      </div>

      {clarification && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          {clarification}
        </div>
      )}
    </section>
  );
};
