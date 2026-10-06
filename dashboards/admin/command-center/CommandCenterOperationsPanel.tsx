import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Play, RefreshCw, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { api } from "../../../services/api";
import type { CommandCenterDraft, CommandCenterTool, CommandCenterWorkflow } from "../../../services/apiGroups/commandCenterApi";
import { SchoolImportDraftPanel } from "./SchoolImportDraftPanel";

export const CommandCenterOperationsPanel: React.FC = () => {
  const [tools, setTools] = useState<CommandCenterTool[]>([]);
  const [drafts, setDrafts] = useState<CommandCenterDraft[]>([]);
  const [workflows, setWorkflows] = useState<CommandCenterWorkflow[]>([]);
  const [commandText, setCommandText] = useState("");
  const [commandSummary, setCommandSummary] = useState("");
  const [commandClarification, setCommandClarification] = useState("");
  const [planning, setPlanning] = useState(false);
  const [health, setHealth] = useState<{
    draftFirst: boolean;
    liveWritesEnabled: boolean;
    principalType: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [healthResponse, toolResponse, draftResponse, workflowResponse] = await Promise.all([
        api.commandCenterHealth(),
        api.getCommandCenterTools(),
        api.getCommandCenterDrafts({ limit: 30 }),
        api.getCommandCenterWorkflows(20),
      ]);
      setHealth(healthResponse);
      setTools(toolResponse.tools || []);
      setDrafts(draftResponse.drafts || []);
      setWorkflows(workflowResponse.workflows || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل مركز الأوامر.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyDraft = async (draftId: string) => {
    setActingId(draftId);
    setError("");
    try {
      await api.applyCommandCenterDraft(draftId);
      await load();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "تعذر تنفيذ المسودة.");
    } finally {
      setActingId(null);
    }
  };

  const planNaturalLanguageCommand = async () => {
    const message = commandText.trim();
    if (!message) return;
    setPlanning(true);
    setError("");
    setCommandSummary("");
    setCommandClarification("");
    try {
      const result = await api.aiAdminCommandPlan({ message });
      setCommandSummary(result.summary || "");
      setCommandClarification(result.clarification || "");
      if (result.workflow) {
        setWorkflows((current) => [
          result.workflow as CommandCenterWorkflow,
          ...current.filter((item) => item._id !== result.workflow?._id),
        ]);
      }
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "تعذر تخطيط الأمر.");
    } finally {
      setPlanning(false);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    setActingId(workflowId);
    setError("");
    try {
      await api.executeCommandCenterWorkflow(workflowId);
      await load();
    } catch (workflowError) {
      setError(workflowError instanceof Error ? workflowError.message : "تعذر تنفيذ سير العمل.");
    } finally {
      setActingId(null);
    }
  };

  const review = async (draftId: string, decision: "approved" | "rejected") => {
    setActingId(draftId);
    setError("");
    try {
      await api.reviewCommandCenterDraft(draftId, {
        decision,
        notes: decision === "approved"
          ? "اعتماد من مركز قيادة المنصة."
          : "رفض من مركز قيادة المنصة.",
      });
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "تعذر مراجعة المسودة.");
    } finally {
      setActingId(null);
    }
  };

  if (loading && !health) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 flex items-center justify-center gap-2 text-sm font-bold text-slate-600">
        <Loader2 size={18} className="animate-spin" />
        جاري تحميل طبقة أوامر المنصة...
      </div>
    );
  }

  const activeTools = tools.filter((tool) => tool.availability === "active");
  const pendingDrafts = drafts.filter((draft) => draft.status === "pending");

  return (
    <div className="space-y-5" dir="rtl">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 font-black">
              <ShieldCheck size={19} />
              طبقة التنفيذ الآمن
            </div>
            <p className="mt-1 text-xs font-bold text-emerald-700">
              Draft-first مفعّل، والوكلاء الخارجيون لا يملكون نشرًا مباشرًا على البيانات الحية.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800"
          >
            <RefreshCw size={14} />
            تحديث
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="أدوات فعالة" value={activeTools.length} />
          <Stat label="مسودات معلقة" value={pendingDrafts.length} />
          <Stat label="الكتابة الحية" value={health?.liveWritesEnabled ? "مفعلة" : "مقفلة"} />
          <Stat label="الهوية الحالية" value={health?.principalType === "admin_session" ? "مدير" : "Agent"} />
        </div>
      </div>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
        <div className="flex items-center gap-2 text-indigo-900 font-black">
          <Sparkles size={18} />
          أمر ذكي للمنصة
        </div>
        <p className="mt-1 text-xs font-bold text-indigo-700">
          اكتب ما تريد تنفيذه. النظام سيحوّل الأمر إلى خطة آمنة أولًا، ولن يعتمد أو ينشر شيئًا تلقائيًا.
        </p>
        <textarea
          value={commandText}
          onChange={(event) => setCommandText(event.target.value)}
          rows={4}
          placeholder="مثال: راجع محتوى دورة الكمي الموجودة، كوّن خطة لإعادة استخدام الدروس والفيديوهات والاختبارات الحالية، وأظهر لي ما ينقص."
          className="mt-4 w-full rounded-xl border border-indigo-200 bg-white p-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={planning || !commandText.trim()}
            onClick={() => void planNaturalLanguageCommand()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            {planning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            كوّن خطة التنفيذ
          </button>
          {commandSummary && <span className="text-xs font-black text-indigo-900">{commandSummary}</span>}
        </div>
        {commandClarification && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            {commandClarification}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-black text-slate-900">سير العمل — Plan → Execute → Verify</h3>
        <p className="mt-1 text-xs font-bold text-slate-500">
          كل خطوة محفوظة، وإعادة التنفيذ تكمل من آخر خطوة غير مكتملة بدل تكرار ما نجح.
        </p>
        <div className="mt-4 space-y-2">
          {workflows.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-bold text-slate-400">
              لا توجد خطط تنفيذ حتى الآن.
            </div>
          )}
          {workflows.map((workflow) => (
            <div key={workflow._id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-900">{workflow.title}</div>
                  <div className="mt-1 text-[10px] font-bold text-slate-500">
                    {workflow.status} • {workflow.steps.filter((step) => step.status === "completed").length}/{workflow.steps.length} خطوة
                  </div>
                </div>
                {workflow.status !== "completed" && workflow.status !== "running" && (
                  <button
                    type="button"
                    disabled={actingId === workflow._id}
                    onClick={() => void executeWorkflow(workflow._id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50"
                  >
                    {actingId === workflow._id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    {workflow.status === "failed" ? "استكمال" : "تنفيذ الخطة"}
                  </button>
                )}
                {workflow.status === "completed" && (
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-700">
                    تم التحقق
                  </span>
                )}
              </div>
              {workflow.lastError && (
                <div className="mt-2 text-[10px] font-bold text-rose-700">{workflow.lastError}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      <SchoolImportDraftPanel onDraftCreated={load} />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black text-slate-900">الأدوات الموحدة</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            نفس الأدوات ستخدم لوحة ALMEAA وRemote MCP بدون تكرار منطق العمل.
          </p>
          <div className="mt-4 space-y-2">
            {tools.map((tool) => (
              <div key={tool.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800">{tool.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    tool.availability === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {tool.availability === "active" ? "فعال" : "قادم"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-bold text-slate-500">{tool.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-black text-slate-900">طابور المسودات</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            المحتوى الذي ينشئه Agent لا يصل للطلاب قبل مراجعة المدير.
          </p>
          <div className="mt-4 space-y-2">
            {drafts.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs font-bold text-slate-400">
                لا توجد مسودات حتى الآن.
              </div>
            )}
            {drafts.map((draft) => (
              <div key={draft._id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-slate-900">{draft.title}</div>
                    <div className="mt-1 text-[10px] font-bold text-slate-500">
                      {draft.kind} • {draft.source} • {draft.status}
                      {draft.applyStatus ? ` • ${draft.applyStatus}` : ""}
                    </div>
                  </div>
                  {draft.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={actingId === draft._id}
                        onClick={() => void review(draft._id, "approved")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-black text-white disabled:opacity-50"
                      >
                        {actingId === draft._id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        اعتماد
                      </button>
                      <button
                        type="button"
                        disabled={actingId === draft._id}
                        onClick={() => void review(draft._id, "rejected")}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-black text-rose-700 disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        رفض
                      </button>
                    </div>
                  )}
                  {draft.status === "approved" && draft.applyStatus !== "applied" && (
                    <button
                      type="button"
                      disabled={actingId === draft._id || draft.applyStatus === "applying"}
                      onClick={() => void applyDraft(draft._id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50"
                    >
                      {actingId === draft._id || draft.applyStatus === "applying"
                        ? <Loader2 size={12} className="animate-spin" />
                        : <CheckCircle2 size={12} />}
                      {draft.applyStatus === "failed" ? "إعادة التنفيذ" : "تنفيذ"}
                    </button>
                  )}
                  {draft.applyStatus === "applied" && (
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-700">
                      تم التنفيذ • {draft.appliedResourceType || "resource"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
        <h3 className="text-sm font-black text-indigo-900">إدارة الدورات — Reuse-first</h3>
        <p className="mt-2 text-xs font-bold leading-6 text-indigo-800">
          مركز القيادة يستطيع الآن قراءة مخزون الدروس والفيديوهات والاختبارات والملفات والمهارات
          لنفس المسار والمادة، ثم تكوين Course Draft منها. التوليد الجديد لا يستخدم إلا عند وجود
          نقص حقيقي في المحتوى.
        </p>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl border border-white/80 bg-white/80 p-3">
    <div className="text-[10px] font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
  </div>
);
