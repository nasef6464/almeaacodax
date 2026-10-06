import React, { useState } from "react";
import { FileSpreadsheet, Loader2, ShieldCheck } from "lucide-react";
import { api } from "../../../services/api";
import { parseImportFile, parseRelationFile } from "../SchoolsManager/importFileReaders";
import { getDuplicateImportEmails } from "../SchoolsManager/importRowParsing";
import type { ImportRow, RelationImportRow } from "../SchoolsManager/contracts";
import {
  buildSchoolDraftFromImportedRows,
  importedRowsMissingClasses,
} from "./schoolImportDraftAdapter";

type Issue = { type?: string; message?: string; ref?: string };

export const SchoolImportDraftPanel: React.FC<{
  onDraftCreated: () => Promise<void>;
}> = ({ onDraftCreated }) => {
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [roster, setRoster] = useState<ImportRow[]>([]);
  const [relations, setRelations] = useState<RelationImportRow[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const readRoster = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await parseImportFile(file);
      const duplicates = getDuplicateImportEmails(rows);
      if (duplicates.length) throw new Error(`بريد مكرر: ${duplicates.slice(0, 5).join("، ")}`);
      setRoster(rows);
      setMessage(`تمت قراءة ${rows.length} طالب.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر قراءة الملف.");
    }
  };

  const readRelations = async (file?: File) => {
    if (!file) return;
    try {
      const rows = await parseRelationFile(file);
      setRelations(rows);
      setMessage(`تمت قراءة ${rows.length} صف علاقات.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر قراءة ملف العلاقات.");
    }
  };

  const run = async (createDraft: boolean) => {
    setIssues([]);
    setMessage("");
    if (!schoolName.trim()) return setMessage("اكتب اسم المدرسة أولًا.");
    const missingClasses = importedRowsMissingClasses(roster);
    if (missingClasses.length) {
      return setMessage(`يوجد ${missingClasses.length} طالب بدون فصل.`);
    }

    const payload = buildSchoolDraftFromImportedRows({
      schoolName,
      schoolId,
      roster,
      relations,
    });
    if (!payload.classes.length) return setMessage("الملف يحتاج فصلًا واحدًا على الأقل.");

    setBusy(true);
    try {
      if (!createDraft) {
        const validation = (await api.validateSchoolSetupCommandDraft(payload)) as {
          ok?: boolean;
          issues?: Issue[];
        };
        setIssues(validation.issues || []);
        setMessage(validation.ok ? "الفحص ناجح؛ المسودة جاهزة." : "راجع المشكلات الظاهرة.");
      } else {
        const stamp = Date.now();
        await api.createSchoolSetupCommandDraft({
          ...payload,
          requestId: `school-import-${stamp}`,
          idempotencyKey: `school-import:${schoolId || schoolName}:${stamp}`,
        });
        setMessage("تم إنشاء Draft المدرسة بدون تعديل حي.");
        await onDraftCreated();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تنفيذ العملية.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5" dir="rtl">
      <div className="flex items-center gap-2 font-black text-sky-900">
        <FileSpreadsheet size={18} />
        مدرسة من Excel / CSV
      </div>
      <p className="mt-1 text-xs font-bold leading-6 text-sky-700">
        نفس قارئ إدارة المدارس الآمن؛ النتيجة Draft للمراجعة، ولا تُنشئ حسابات جديدة تلقائيًا.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
          placeholder="اسم المدرسة" className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold" />
        <input value={schoolId} onChange={(e) => setSchoolId(e.target.value)}
          placeholder="School ID اختياري" className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold" />
        <label className="rounded-xl border border-dashed border-sky-300 bg-white p-3 text-xs font-bold">
          كشف الطلاب والفصول
          <input type="file" accept=".xlsx,.xls,.csv,.tsv" className="mt-2 block w-full text-[11px]"
            onChange={(e) => void readRoster(e.target.files?.[0])} />
          <span className="mt-1 block text-[10px] text-slate-500">{roster.length} صف</span>
        </label>
        <label className="rounded-xl border border-dashed border-sky-300 bg-white p-3 text-xs font-bold">
          ملف العلاقات — اختياري
          <input type="file" accept=".xlsx,.xls,.csv,.tsv" className="mt-2 block w-full text-[11px]"
            onChange={(e) => void readRelations(e.target.files?.[0])} />
          <span className="mt-1 block text-[10px] text-slate-500">{relations.length} صف</span>
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={() => void run(false)}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-800 disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} فحص
        </button>
        <button type="button" disabled={busy} onClick={() => void run(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
          <FileSpreadsheet size={13} /> إنشاء Draft
        </button>
      </div>
      {message && <div className="mt-3 text-xs font-bold text-slate-700">{message}</div>}
      {issues.length > 0 && (
        <div className="mt-3 max-h-40 overflow-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
          {issues.slice(0, 30).map((issue, index) => (
            <div key={index} className="text-[11px] font-bold text-amber-900">
              {issue.message || issue.type}{issue.ref ? ` • ${issue.ref}` : ""}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
