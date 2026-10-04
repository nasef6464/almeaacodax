import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ClassroomEndSessionModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClassroomEndSessionModal: React.FC<ClassroomEndSessionModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50">
          <AlertTriangle size={28} />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
          تأكيد إنهاء الحصة الذكية
        </h3>
        <p className="mt-2 text-xs font-bold text-slate-500 leading-relaxed">
          هل أنت متأكد من رغبتك في إنهاء الحصة لجميع الطلاب وحفظ التقرير في الأرشيف؟ سيتم قفل استقبال الإجابات وتثبيت نتائج المشاركة فوراً.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-rose-600 py-3 text-xs font-black text-white hover:bg-rose-700 shadow-md active:scale-95 transition-all"
          >
            نعم، إنهاء وأرشفة
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-black text-slate-700 hover:bg-slate-100 active:scale-95 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            تراجع وإكمال الحصة
          </button>
        </div>
      </div>
    </div>
  );
};
