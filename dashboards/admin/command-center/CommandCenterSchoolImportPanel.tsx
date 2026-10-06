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

const stablePayloadFingerprint = (value: unknown) => {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const CommandCenterSchoolImportPanel: React.FC<{
  onDraftCreated: () => Promise<void>;
  onError: (message: string) => void;
}> = ({ onDraftCreated, onError }) => {
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [roster, setRoster] = useState<ImportRow[]>([]);
  const [relations, setRelations] = useState<RelationImportRow[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const readRoster = async (file?: File) => {
    if (!file) return;
    onError("");
    try {
      const rows = await parseImportFile(file);
      const duplicates = getDuplicateImportEmails(rows);
      if (duplicates.length) throw new Error(`بريد مكرر: ${duplicates.slice(0, 5).join("، ")}`);
      setRoster(rows);
      setSummary(`تمت قراءة ${rows.length} طالب.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذر قراءة ملف الطلاب.");
    }
  };

  const readRelations = async (file?: File) => {
    if (!file) return;
    onError("");
    try {
      const rows = await parseRelationFile(file);
      setRelations(rows);
      setSummary(`تمت قراءة ${rows.length} صف علاقات للطلاب/المعلمين/المشرفين.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذر قراءة ملف العلاقات.");
    }
  };

  const run = async (createDraft: boolean) => {
    onError("");
    setIssues([]);
    setSummary("");
    if (!schoolName.trim()) return onError("اكتب اسم المدرسة أولًا.");
    const missingClasses = importedRowsMissingClasses(roster);
    if (missingClasses.length) {
      return onError(`يوجد ${missingClasses.length} طالب بدون فصل.`);
    }

    const payload = buildSchoolDraftFromImportedRows({
      schoolName,
      schoolId,
      roster,
      relations,
    });
    if (!payload.classes.length) return onError("الملفات تحتاج فصلًا واحدًا على الأقل.");

    setBusy(true);
    try {
      const validation = (await api.validateSchoolSetupCommandDraft(payload)) as {
        ok?: boolean;
        issues?: Issue[];
      };
      setIssues(validation.issues || []);
      if (!validation.ok) {
        setSummary("راجع المشكلات الظاهرة قبل إنشاء المسودة.");
        return;
      }

      if (!createDraft) {
        setSummary(
          `الفحص ناجح: ${payload.students.length} طالب، ${payload.teachers.length} معلم، ${payload.supervisors.length} مشرف، ${payload.classes.length} فصل.`,
        );
        return;
      }

      const fingerprint = stablePayloadFingerprint(payload);
      await api.createSchoolSetupCommandDraft({
        ...payload,
        requestId: `school-import-${fingerprint}`,
        idempotencyKey: `school-import:${fingerprint}`,
      });
      setSummary("تم إنشاء Draft المدرسة فقط؛ لا توجد حسابات أو علاقات حية قبل اعتماد وتطبيق بشري.");
      await onDraftCreated();
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذر تنفيذ استيراد المدرسة.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5" dir="rtl">
      <div className="flex items-center gap-2 font-black text-cyan-900">
        <FileSpreadsheet size={18} />
        استيراد مدرسة إلى مسودة آمنة
      </div>
      <p className="mt-1 text-xs font-bold leading-6 text-cyan-700">
        يدعم كشف الطلاب والفصول وملف العلاقات للمعلمين والمشرفين باستخدام نفس قارئ إدارة المدارس. النتيجة Draft فقط، ولا تُنشئ حسابات جديدة تلقائيًا.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={schoolName}
          onChange={(event) => setSchoolName(event.target.value)}
          placeholder="اسم المدرسة"
          className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-bold"
        />
        <input
          value={schoolId}
          onChange={(event) => setSchoolId(event.target.value)}
          placeholder="School ID اختياري عند تحديث مدرسة موجودة"
          className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-bold"
        />
        <label className="rounded-xl border border-dashed border-cyan-300 bg-white p-3 text-xs font-bold">
          كشف الطلاب والفصول
          <input
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            className="mt-2 block w-full text-[11px]"
            onChange={(event) => void readRoster(event.target.files?.[0])}
          />
          <span className="mt-1 block text-[10px] text-slate-500">{roster.length} صف</span>
        </label>
        <label className="rounded-xl border border-dashed border-cyan-300 bg-white p-3 text-xs font-bold">
          ملف العلاقات — اختياري
          <input
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            className="mt-2 block w-full text-[11px]"
            onChange={(event) => void readRelations(event.target.files?.[0])}
          />
          <span className="mt-1 block text-[10px] text-slate-500">{relations.length} صف</span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(false)}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-black text-cyan-800 disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} فحص
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          <FileSpreadsheet size={13} /> إنشاء Draft
        </button>
      </div>
      {summary && <div className="mt-3 text-xs font-bold text-slate-700">{summary}</div>}
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
