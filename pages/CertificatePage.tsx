import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../services/api";

const formatIssuedDate = (value: string | number | Date | undefined) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
};

const CertificatePage: React.FC = () => {
  const { code = "" } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificate, setCertificate] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.getCertificateByCode(code);
        if (mounted) setCertificate(data);
      } catch {
        if (mounted) setError("تعذر تحميل الشهادة.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (code) void run();
    return () => {
      mounted = false;
    };
  }, [code]);

  const verifyUrl = useMemo(() => `${window.location.origin}/certificate/${code}`, [code]);

  if (loading) return <div className="p-8 text-center">جاري تحميل الشهادة...</div>;
  if (error || !certificate) return <div className="p-8 text-center text-red-600">{error || "الشهادة غير موجودة"}</div>;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #certificate-sheet, #certificate-sheet * { visibility: visible !important; }
          #certificate-sheet { position: absolute; inset: 0; width: 100%; box-shadow: none !important; border: 0 !important; }
          #certificate-actions { display: none !important; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-100 px-4 py-8" dir="rtl">
        <div id="certificate-sheet" className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-2xl">
          <header className="relative bg-gradient-to-l from-emerald-700 via-emerald-600 to-amber-500 px-8 py-8 text-white">
            <div className="absolute left-6 top-6 h-20 w-20 rounded-full border-2 border-white/60 bg-white/20" />
            <p className="text-sm font-semibold tracking-wide text-emerald-50">منصة المئة للقدرات والتحصيلي</p>
            <h1 className="mt-2 text-3xl font-black">شهادة إتمام معتمدة</h1>
            <p className="mt-2 text-sm text-emerald-50">تم منح هذه الشهادة بعد اجتياز متطلبات الدورة بنجاح.</p>
          </header>

          <main className="grid gap-6 p-8 md:grid-cols-[1.45fr_0.55fr]">
            <section>
              <p className="text-sm text-gray-500">تشهد منصة المئة بأن</p>
              <h2 className="mt-2 text-4xl font-black leading-tight text-emerald-800">{String(certificate.studentName || "طالب المنصة")}</h2>
              <p className="mt-6 text-sm text-gray-500">قد أتم بنجاح الدورة</p>
              <h3 className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-2xl font-black text-amber-700">
                {String(certificate.courseName || "دورة بدون اسم")}
              </h3>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">نسبة الإتمام</p>
                  <p className="mt-1 text-lg font-black text-gray-900">{Number(certificate.completionPercentage || 0)}%</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">تاريخ الإصدار</p>
                  <p className="mt-1 text-lg font-black text-gray-900">{formatIssuedDate(certificate.issuedAt)}</p>
                </div>
              </div>

              <p className="mt-6 text-sm leading-7 text-gray-600">
                يمكن التحقق من صحة هذه الشهادة عبر الرابط الرسمي أو مسح رمز QR المرفق.
              </p>
              <p className="mt-2 text-xs text-gray-500">رمز التحقق: <span className="font-mono text-gray-700">{String(certificate.verificationCode || "")}</span></p>
              <p className="mt-1 text-xs text-gray-500 break-all">{verifyUrl}</p>
            </section>

            <aside className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <QRCodeSVG value={verifyUrl} size={180} />
              <p className="text-center text-xs font-semibold text-emerald-700">امسح للتحقق من الشهادة</p>
            </aside>
          </main>

          <footer id="certificate-actions" className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-8 py-4">
            <button
              onClick={() => window.print()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-emerald-700"
            >
              طباعة / حفظ PDF
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(verifyUrl)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-black text-gray-700 transition-colors hover:bg-gray-50"
            >
              نسخ رابط التحقق
            </button>
          </footer>
        </div>
      </div>
    </>
  );
};

export default CertificatePage;
