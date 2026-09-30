import { ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
};

export const SimpleAiSetupHeader = ({ showAdvanced, onToggleAdvanced }: Props) => (
  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="font-black text-sm text-indigo-950">إضافة مفتاح AI في 3 خطوات</h3>
        <p className="text-xs font-bold text-indigo-800/80 mt-1">
          1) اختر المزود واكتب اسم الـProject والمفتاح. 2) اضغط «إضافة المفتاح». 3) اضغط «حفظ وتشفير» ثم «اختبر».
        </p>
      </div>
      <button type="button" onClick={onToggleAdvanced} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-700">
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showAdvanced ? 'إخفاء الخيارات المتقدمة' : 'إعدادات متقدمة'}
      </button>
    </div>
  </div>
);
