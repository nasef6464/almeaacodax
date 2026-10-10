import React from "react";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type Props = { mode: string; index: number; total: number };

export const PracticeSessionHeader: React.FC<Props> = ({ mode, index, total }) => (
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-black text-indigo-950">
                {mode === "mistakes" ? "اختبار تدريبي: تصحيح الأخطاء السابقة" : mode === "saved" ? "اختبار تدريبي: الأسئلة المحفوظة" : "جلسة تدريب حر وتثبيت إتقان"}
              </h2>
              <p className="text-[11px] font-bold text-indigo-700/80">اختبار تدريبي غير مسجل رسمياً — لا يؤثر على معدلك التراكمي.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
              السؤال {index + 1} من {total}
            </span>
            <Link to="/dashboard?tab=favorites" className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">
              خروج
            </Link>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100/60">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${Math.round(((index + 1) / total) * 100)}%` }}
          />
        </div>
      </div>
);
