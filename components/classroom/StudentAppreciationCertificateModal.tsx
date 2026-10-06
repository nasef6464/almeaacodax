import React, { useRef, useState } from 'react';
import { Award, CheckCircle2, Download, MessageCircle, Printer, Share2, Sparkles, Trophy, X, Zap } from 'lucide-react';

export type CertificateKind = 'excellence' | 'smart_classroom_hero' | 'persistence';

interface StudentAppreciationCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSchoolName?: string;
  defaultTeacherName?: string;
  defaultClassName?: string;
  suggestedStudents?: Array<{ id: string; name: string }>;
}

const KIND_DETAILS: Record<CertificateKind, { title: string; subtitle: string; badge: string; accentColor: string }> = {
  excellence: {
    title: 'شهادة تفوق وتميز أكاديمي',
    subtitle: 'تقديراً للأداء الاستثنائي والدرجات العالية في مسار القدرات العامة والتحصيلي.',
    badge: '🏆 وسام التفوق والتميز',
    accentColor: 'from-amber-600 via-amber-500 to-yellow-400',
  },
  smart_classroom_hero: {
    title: 'شهادة بطل الحصة الذكية والتحديات',
    subtitle: 'تقديراً للسرعة والذكاء ودقة الإجابة في مسابقات الحصة الذكية وأسئلة التحدي المباشرة.',
    badge: '⚡ بطل التحديات السريعة',
    accentColor: 'from-purple-600 via-indigo-600 to-amber-500',
  },
  persistence: {
    title: 'شهادة تطور ومثابرة دراسية',
    subtitle: 'تقديراً للالتزام اليومي والتحسن الملحوظ والشغف المستمر في إتقان المهارات.',
    badge: '🌟 وسام المثابرة والتقدم',
    accentColor: 'from-emerald-600 via-teal-600 to-emerald-400',
  },
};

export const StudentAppreciationCertificateModal: React.FC<StudentAppreciationCertificateModalProps> = ({
  isOpen,
  onClose,
  defaultSchoolName = 'مدارس الرواد الأهلية',
  defaultTeacherName = 'أستاذ المادة',
  defaultClassName = 'الصف الثالث الثانوي (أ)',
  suggestedStudents = [
    { id: '1', name: 'فهد العتيبي' },
    { id: '2', name: 'سارة الشمري' },
    { id: '3', name: 'عبدالله القحطاني' },
    { id: '4', name: 'ريان الغامدي' },
  ],
}) => {
  const [studentName, setStudentName] = useState(suggestedStudents[0]?.name || 'فهد العتيبي');
  const [schoolName, setSchoolName] = useState(defaultSchoolName);
  const [teacherName, setTeacherName] = useState(defaultTeacherName);
  const [className, setClassName] = useState(defaultClassName);
  const [kind, setKind] = useState<CertificateKind>('smart_classroom_hero');
  const [dateStr] = useState(() => new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }));
  const [certCode] = useState(() => `CERT-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Date.now().toString().slice(-4)}`);

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentKind = KIND_DETAILS[kind];

  const handlePrint = () => {
    window.print();
  };

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته 💐\nيسر إدارة ${schoolName} بالتعاون مع منصة المئة أن تهنئكم بتفوق ابنكم البطل (${studentName}) في ${className} وحصوله على:\n"${currentKind.badge}" 🏅\nنبارك لكم هذا التميز ونتمنى له دوام التوفيق والدرجات العليا!`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-certificate, #printable-certificate * { visibility: visible !important; }
          #printable-certificate { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; margin: 0 !important; padding: 20px !important; box-shadow: none !important; border: 0 !important; z-index: 99999 !important; background: white !important; }
        }
      `}</style>

      <div className="relative my-auto w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Trophy size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">منشئ شهادات التقدير والتحفيز</h2>
              <p className="text-xs text-slate-500">إصدار وتخصيص شهادة تفوق فورية للطباعة أو الإرسال لولي الأمر</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Inputs Configuration Bar */}
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <label className="text-[11px] font-bold text-slate-500">اسم الطالب:</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              list="student-names-list"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <datalist id="student-names-list">
              {suggestedStudents.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500">نوع التكريم:</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as CertificateKind)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="smart_classroom_hero">⚡ بطل الحصص الذكية والتحدي</option>
              <option value="excellence">🏆 وسام التفوق والتميز الدراسي</option>
              <option value="persistence">🌟 وسام المثابرة والتطور المستمر</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500">الفصل:</label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500">المعلم / مانح الشهادة:</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Certificate Printable Preview Sheet */}
        <div className="p-4 sm:p-6">
          <div
            id="printable-certificate"
            ref={printAreaRef}
            className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border-4 border-amber-300/80 bg-gradient-to-br from-amber-50/20 via-white to-slate-50 p-6 sm:p-10 shadow-lg text-slate-900"
          >
            {/* Elegant Border Inset Frame */}
            <div className="pointer-events-none absolute inset-2 rounded-xl border border-amber-400/40" />
            <div className="pointer-events-none absolute inset-3 rounded-lg border border-amber-200/50" />

            {/* Top Logo & Branding */}
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-5">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500">{schoolName}</span>
                <p className="text-xs text-slate-400">قسم التطوير وقياس نواتج التعلّم</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 font-black text-white shadow-md">
                  ١٠٠
                </span>
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900">منصة المئة التعليمية</div>
                  <div className="text-[10px] font-bold text-indigo-700">شريك التميز المدرسي</div>
                </div>
              </div>
            </div>

            {/* Main Certificate Title & Body */}
            <div className="my-6 text-center">
              <span className="inline-block rounded-full bg-amber-100/90 px-4 py-1 text-xs font-black text-amber-900 shadow-2xs">
                {currentKind.badge}
              </span>

              <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
                {currentKind.title}
              </h1>

              <p className="mx-auto mt-4 max-w-lg text-xs sm:text-sm leading-relaxed text-slate-600">
                يسر إدارة المدرسة ومنصة المئة أن تمنح هذه الشهادة والوسام التكريمي للبطل المتميز:
              </p>

              {/* Student Name Display */}
              <div className="mx-auto my-5 inline-block border-b-2 border-amber-400 px-8 py-2">
                <span className="text-2xl sm:text-3xl font-black text-indigo-900">
                  {studentName || 'اسم الطالب'}
                </span>
              </div>

              <p className="text-xs text-slate-500 font-bold">
                المقيد في: <span className="text-slate-800">{className}</span>
              </p>

              <p className="mx-auto mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
                {currentKind.subtitle}
              </p>
            </div>

            {/* Bottom Signatures & Seal */}
            <div className="mt-8 flex items-end justify-between border-t border-amber-200/60 pt-5 text-xs text-slate-600">
              <div className="text-right">
                <p className="text-[11px] text-slate-400">تاريخ المنح:</p>
                <p className="font-bold text-slate-800">{dateStr}</p>
                <p className="mt-1 text-[10px] font-mono text-slate-400">رقم الاعتماد: {certCode}</p>
              </div>

              {/* Gold Seal Graphic */}
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-500/10 text-amber-600 shadow-inner">
                  <Award size={28} />
                </div>
                <span className="mt-1 text-[10px] font-black text-amber-800">معتمد رسمياً</span>
              </div>

              <div className="text-left">
                <p className="text-[11px] text-slate-400">معلم المادة:</p>
                <p className="font-black text-slate-800">{teacherName}</p>
                <p className="mt-1 font-serif text-[11px] italic text-indigo-700">التوقيع والاعتماد</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            يمكنك طباعة الشهادة كـ PDF مقاس A4 أو تسليمها للطالب في الفصل.
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700"
            >
              <MessageCircle size={15} /> إرسال لولي الأمر (واتساب)
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700"
            >
              <Printer size={15} /> طباعة الشهادة فوراً (A4)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
