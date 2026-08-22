import React, { useState, useMemo } from "react";
import {
  Send, Users, Calendar, MessageSquare, X, CheckCircle2,
  ChevronDown, ChevronUp, Lock, Unlock, AlertCircle, Loader2, User,
} from "lucide-react";

export interface AssignConfig {
  targetGroupIds: string[];
  targetUserIds: string[];
  dueDate?: string;
  message?: string;
  maxAttempts?: number;
  accessType: "free" | "restricted";
}

export interface QuizAssignWidgetProps {
  quizId: string;
  quizTitle: string;
  quizKind?: "drill" | "test" | "mock";
  scopedGroups: Array<{ id: string; name: string; studentIds?: string[] }>;
  scopedStudents?: Array<{ id: string; name: string; groupId?: string }>;
  existingConfig?: Partial<AssignConfig>;
  onAssign: (config: AssignConfig) => Promise<void>;
  onCancel?: () => void;
  confirmLabel?: string;
  hideAccessType?: boolean;
}

export const QuizAssignWidget: React.FC<QuizAssignWidgetProps> = ({
  quizId: _quizId,
  quizTitle,
  quizKind,
  scopedGroups,
  scopedStudents,
  existingConfig,
  onAssign,
  onCancel,
  confirmLabel = "توجيه الاختبار",
  hideAccessType = false,
}) => {
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>(existingConfig?.targetGroupIds ?? []);
  const [targetUserIds, setTargetUserIds] = useState<string[]>(existingConfig?.targetUserIds ?? []);
  const [dueDate, setDueDate] = useState(existingConfig?.dueDate ?? "");
  const [message, setMessage] = useState(existingConfig?.message ?? "");
  const [maxAttempts, setMaxAttempts] = useState(existingConfig?.maxAttempts ?? 1);
  const [accessType, setAccessType] = useState<"free" | "restricted">(existingConfig?.accessType ?? "restricted");
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const KIND_LABELS: Record<string, string> = { drill: "تدريب", test: "اختبار", mock: "محاكي" };
  const KIND_COLORS: Record<string, string> = {
    drill: "bg-emerald-100 text-emerald-700",
    test: "bg-indigo-100 text-indigo-700",
    mock: "bg-violet-100 text-violet-700",
  };

  const totalTargeted = useMemo(() => {
    const fromGroups = scopedGroups
      .filter((g) => targetGroupIds.includes(g.id))
      .reduce((sum, g) => sum + (g.studentIds?.length ?? 0), 0);
    return fromGroups + targetUserIds.length;
  }, [scopedGroups, targetGroupIds, targetUserIds]);

  const toggleGroup = (id: string) =>
    setTargetGroupIds((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  const toggleStudent = (id: string) =>
    setTargetUserIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (targetGroupIds.length === 0 && targetUserIds.length === 0) {
      setError("اختر مجموعة واحدة على الأقل أو طالباً محدداً");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onAssign({ targetGroupIds, targetUserIds, dueDate: dueDate || undefined, message: message || undefined, maxAttempts, accessType });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر التوجيه، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle2 size={28} className="text-emerald-600"/>
        </div>
        <div>
          <p className="text-base font-black text-gray-900">تم التوجيه بنجاح!</p>
          <p className="text-sm text-gray-500 mt-1">وصل الاختبار لـ {totalTargeted} طالب</p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 mt-2">إغلاق</button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-bold mb-0.5">الاختبار</p>
          <p className="text-sm font-black text-gray-900 truncate">{quizTitle}</p>
        </div>
        {quizKind && (
          <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-full ${KIND_COLORS[quizKind] || "bg-gray-100 text-gray-600"}`}>
            {KIND_LABELS[quizKind] || quizKind}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
            <Users size={13} className="text-indigo-500"/> الفصول المستهدفة
          </label>
          {scopedGroups.length > 1 && (
            <button type="button" onClick={() => setTargetGroupIds(scopedGroups.map((g) => g.id))}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800">تحديد الكل</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
          {scopedGroups.map((g) => {
            const isSelected = targetGroupIds.includes(g.id);
            return (
              <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-right ${isSelected ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300"}`}>
                <CheckCircle2 size={13} className={isSelected ? "text-white" : "text-gray-300"}/>
                <span className="truncate">{g.name}</span>
                {g.studentIds && (
                  <span className={`mr-auto text-[10px] ${isSelected ? "text-indigo-200" : "text-gray-400"}`}>{g.studentIds.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {scopedStudents && scopedStudents.length > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={() => setShowStudentPicker((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-indigo-700 transition-colors">
            <User size={13} className="text-indigo-400"/>
            إضافة طلاب بشكل فردي
            {targetUserIds.length > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{targetUserIds.length}</span>
            )}
            {showStudentPicker ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          {showStudentPicker && (
            <div className="border border-gray-100 rounded-xl p-2 max-h-36 overflow-y-auto space-y-1 bg-gray-50/50">
              {scopedStudents.map((s) => {
                const isSelected = targetUserIds.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium text-right transition-all ${isSelected ? "bg-indigo-50 border-indigo-200 text-indigo-900" : "bg-white border-gray-100 text-gray-700 hover:border-indigo-200"}`}>
                    <CheckCircle2 size={12} className={isSelected ? "text-indigo-600" : "text-gray-300"}/>
                    <span className="flex-1 truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
          <MessageSquare size={13} className="text-indigo-500"/> رسالة للطلاب (اختياري)
        </label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={200}
          placeholder="مثال: أرجو إنهاء الاختبار قبل الأربعاء..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-400 placeholder:text-gray-300" dir="rtl"/>
        <p className="text-[10px] text-gray-400 text-left">{message.length}/200</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700 flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-500"/> تاريخ الانتهاء
          </label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"/>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700">عدد المحاولات</label>
          <select value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-400">
            {[1, 2, 3, 5, 10].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "محاولة" : "محاولات"}</option>
            ))}
          </select>
        </div>
      </div>

      {!hideAccessType && (
        <div className="space-y-1.5">
          <label className="text-xs font-black text-gray-700">نوع الوصول</label>
          <div className="flex gap-2">
            {([
              { value: "restricted" as const, label: "مقيّد (للمستهدفين فقط)", icon: <Lock size={12}/> },
              { value: "free" as const,       label: "مجاني (للجميع)",          icon: <Unlock size={12}/> },
            ]).map((opt) => (
              <button key={opt.value} type="button" onClick={() => setAccessType(opt.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${accessType === opt.value ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(targetGroupIds.length > 0 || targetUserIds.length > 0) && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-emerald-800">
              {targetGroupIds.length > 0 && `${targetGroupIds.length} فصل`}
              {targetGroupIds.length > 0 && targetUserIds.length > 0 && " + "}
              {targetUserIds.length > 0 && `${targetUserIds.length} طالب فردي`}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">إجمالي الطلاب المستهدفين: ~{totalTargeted}</p>
          </div>
          <CheckCircle2 size={20} className="text-emerald-500"/>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          <AlertCircle size={13} className="text-rose-500 shrink-0"/>
          <p className="text-xs font-bold text-rose-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1">
            <X size={14}/> إلغاء
          </button>
        )}
        <button type="button" onClick={handleSubmit}
          disabled={loading || (targetGroupIds.length === 0 && targetUserIds.length === 0)}
          className="flex-grow py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm">
          {loading ? <><Loader2 size={15} className="animate-spin"/>جارٍ التوجيه...</> : <><Send size={15}/>{confirmLabel}</>}
        </button>
      </div>
    </div>
  );
};

export default QuizAssignWidget;
