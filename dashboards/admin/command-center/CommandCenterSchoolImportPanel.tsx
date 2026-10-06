import React, { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { api } from "../../../services/api";
import { parseImportFile } from "../SchoolsManager/importFileReaders";

export const CommandCenterSchoolImportPanel: React.FC<{
  onDraftCreated: () => Promise<void>;
  onError: (message: string) => void;
}> = ({ onDraftCreated, onError }) => {
  const [schoolName, setSchoolName] = useState("");
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState("");

  const createDraft = async (file: File) => {
    const normalizedSchoolName = schoolName.trim();
    if (!normalizedSchoolName) {
      onError("اكتب اسم المدرسة قبل رفع الملف.");
      return;
    }

    setImporting(true);
    setSummary("");
    onError("");
    try {
      const rows = await parseImportFile(file);
      const classNames = [
        ...new Set(rows.map((row) => String(row.className || "").trim()).filter(Boolean)),
      ];
      if (!classNames.length) {
        throw new Error("الملف لا يحتوي أسماء فصول. أضف عمود className/الفصل.");
      }

      const classKeyByName = new Map(
        classNames.map((name, index) => [name, `class-${index + 1}`]),
      );
      const payload = {
        schoolName: normalizedSchoolName,
        classes: classNames.map((name) => ({
          key: classKeyByName.get(name)!,
          name,
        })),
        students: rows.map((row) => ({
          email: row.email,
          name: row.name,
          classKey: classKeyByName.get(String(row.className || "").trim()) || "",
        })),
        teachers: [],
        supervisors: [],
        requestId: `command-center-school-import-${Date.now()}`,
        idempotencyKey: `school-import:${normalizedSchoolName}:${file.name}:${file.size}:${file.lastModified}`,
      };

      const validation = await api.validateSchoolSetupCommandDraft(payload);
      if (!(validation as { ok?: boolean }).ok) {
        const issues = Array.isArray((validation as { issues?: unknown[] }).issues)
          ? (validation as { issues: unknown[] }).issues.length
          : 0;
        setSummary(
          `تم تحليل ${rows.length} طالب و${classNames.length} فصل، لكن توجد ${issues} ملاحظات قبل إنشاء المسودة.`,
        );
        return;
      }

      await api.createSchoolSetupCommandDraft(payload);
      setSummary(
        `تم إنشاء مسودة مدرسة من ${rows.length} طالب و${classNames.length} فصل. راجعها ثم اعتمدها.`,
      );
      await onDraftCreated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذر تحليل ملف المدرسة.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5">
      <div className="flex items-center gap-2 text-cyan-900 font-black">
        <FileSpreadsheet size={18} />
        استيراد مدرسة إلى مسودة آمنة
      </div>
      <p className="mt-1 text-xs font-bold text-cyan-700">
        ارفع CSV/TSV/XLSX بنفس قالب إدارة المدارس. سيتم تحليل الطلاب والفصول محليًا ثم إنشاء Draft فقط؛ الحسابات غير الموجودة لن تُنشأ تلقائيًا.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={schoolName}
          onChange={(event) => setSchoolName(event.target.value)}
          placeholder="اسم المدرسة"
          className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-cyan-400"
        />
        <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-xs font-black text-white ${importing ? "pointer-events-none opacity-60" : ""}`}>
          {importing ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          رفع الملف
          <input
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            className="hidden"
            disabled={importing}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void createDraft(file);
            }}
          />
        </label>
      </div>
      {summary && (
        <div className="mt-3 rounded-xl border border-cyan-200 bg-white p-3 text-xs font-bold text-cyan-900">
          {summary}
        </div>
      )}
    </section>
  );
};
