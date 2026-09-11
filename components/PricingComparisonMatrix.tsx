import React, { useState } from 'react';
import {
  Check,
  X,
  Sparkles,
  GraduationCap,
  School,
  Backpack,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  EducationalStageKey,
  FeatureComparisonRow,
  comparisonDataByStage,
} from './pricingComparisonData';

export type { EducationalStageKey };

interface PricingComparisonMatrixProps {
  onSelectTier?: (tierKey: 'free' | 'standard' | 'pro', stageKey: EducationalStageKey) => void;
}

export const PricingComparisonMatrix: React.FC<PricingComparisonMatrixProps> = ({ onSelectTier }) => {
  const [activeStage, setActiveStage] = useState<EducationalStageKey>('high');
  const { user } = useStore();
  const currentStageData = comparisonDataByStage[activeStage];
  const isRegistered = Boolean(user?.id && user.id !== 'guest');

  const groupedFeatures = currentStageData.features.reduce<Record<string, FeatureComparisonRow[]>>(
    (acc, feature) => {
      if (!acc[feature.category]) acc[feature.category] = [];
      acc[feature.category].push(feature);
      return acc;
    },
    {},
  );

  const renderValue = (val: boolean | string) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 shadow-2xs">
          <Check className="w-4 h-4 stroke-[3]" />
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-400">
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-1 text-xs font-black text-slate-700 bg-slate-100 rounded-lg">
        {val}
      </span>
    );
  };

  return (
    <div className="mt-16 pt-10 border-t border-slate-200" id="packages-comparison" dir="rtl">
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-xs sm:text-sm font-black mb-3.5 shadow-2xs">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>مقارنة المزايا حسب الفئة العمرية والمرحلة الدراسية</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
          اختر الباقة الأنسب لمرحلتك واحتياجك
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          تختلف أهداف التعلم بين الابتدائي، المتوسط، والثانوي. حدد مرحلتك لمعاينة الباقات المصممة خصيصاً لمستواك الدراسي.
        </p>
      </div>

      {/* Stage Switcher Tabs */}
      <div className="flex justify-center mb-8 px-2">
        <div className="inline-flex flex-wrap sm:flex-nowrap p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-inner max-w-full gap-1 sm:gap-2">
          {(
            [
              { key: 'high', label: 'المرحلة الثانوية', icon: <GraduationCap className="w-4 h-4" /> },
              { key: 'middle', label: 'المرحلة المتوسطة', icon: <School className="w-4 h-4" /> },
              { key: 'primary', label: 'المرحلة الابتدائية', icon: <Backpack className="w-4 h-4" /> },
            ] as const
          ).map((tab) => {
            const isActive = activeStage === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStage(tab.key)}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage Audience Banner */}
      <div className="mb-8 rounded-2xl bg-gradient-to-l from-indigo-50/80 via-blue-50/60 to-white border border-indigo-100/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5 shrink-0">
            {currentStageData.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-black text-slate-900">{currentStageData.label}</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                {currentStageData.targetAudience}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-6">
              {currentStageData.decisionMakerNote}
            </p>
          </div>
        </div>
        <div className="text-left shrink-0">
          <span className="text-xs text-indigo-700 font-extrabold bg-white px-3 py-1.5 rounded-xl border border-indigo-200/80 shadow-2xs inline-block">
            {currentStageData.tagline}
          </span>
        </div>
      </div>

      {/* Responsive Comparison Table Container */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[680px] border-collapse text-right">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="p-4 sm:p-6 text-sm font-black text-slate-900 w-2/5">
                المزايا والخصائص
              </th>
              {/* Free Tier */}
              <th className="p-4 sm:p-6 text-center w-1/5 border-r border-slate-200/70">
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">المستوى الأول</div>
                <div className="text-base sm:text-lg font-black text-slate-900">{currentStageData.tiers.free.title}</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1.5">
                  {currentStageData.tiers.free.price}
                </div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{currentStageData.tiers.free.subtitle}</div>
                <Link
                  to={isRegistered ? '/dashboard' : '/login'}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white py-2 text-xs font-black text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  ابدأ مجاناً
                </Link>
              </th>
              {/* Standard Tier */}
              <th className="p-4 sm:p-6 text-center w-1/5 border-r border-slate-200/70">
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">المستوى الثاني</div>
                <div className="text-base sm:text-lg font-black text-slate-900">{currentStageData.tiers.standard.title}</div>
                <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-1.5">
                  {currentStageData.tiers.standard.price}
                </div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{currentStageData.tiers.standard.subtitle}</div>
                <button
                  type="button"
                  onClick={() => onSelectTier?.('standard', activeStage)}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 py-2 text-xs font-black text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  اختر الباقة
                </button>
              </th>
              {/* Pro Tier (Highlighted) */}
              <th className="p-4 sm:p-6 text-center w-1/5 border-r border-indigo-200 bg-indigo-50/50 relative">
                {currentStageData.tiers.pro.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black shadow-xs whitespace-nowrap">
                    ⭐ {currentStageData.tiers.pro.badge}
                  </span>
                )}
                <div className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-1">المستوى الشامل</div>
                <div className="text-base sm:text-lg font-black text-indigo-950">{currentStageData.tiers.pro.title}</div>
                <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1.5">
                  {currentStageData.tiers.pro.price}
                </div>
                <div className="text-xs text-indigo-900/70 mt-1 line-clamp-2">{currentStageData.tiers.pro.subtitle}</div>
                <button
                  type="button"
                  onClick={() => onSelectTier?.('pro', activeStage)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-indigo-600 py-2 text-xs font-black text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  الاشتراك الشامل
                </button>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {Object.entries(groupedFeatures).map(([category, items]) => (
              <React.Fragment key={category}>
                <tr className="bg-slate-100/70">
                  <td colSpan={4} className="py-2.5 px-4 sm:px-6 font-extrabold text-xs text-slate-700">
                    {category}
                  </td>
                </tr>
                {items.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 sm:p-5">
                      <div className="font-extrabold text-slate-900 text-sm leading-snug">{row.name}</div>
                      {row.description && (
                        <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{row.description}</div>
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-center border-r border-slate-100">
                      {renderValue(row.free)}
                    </td>
                    <td className="p-4 sm:p-5 text-center border-r border-slate-100">
                      {renderValue(row.standard)}
                    </td>
                    <td className="p-4 sm:p-5 text-center border-r border-indigo-100 bg-indigo-50/20">
                      {renderValue(row.pro)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/50">
              <td className="p-4 sm:p-6 text-xs text-slate-500 font-bold">
                * جميع الأسعار تشمل ضريبة القيمة المضافة، ويمكن تفعيل الوصول عبر أكواد المدارس أو الكوبونات.
              </td>
              <td className="p-4 sm:p-6 text-center border-r border-slate-200/70">
                <Link
                  to={isRegistered ? '/dashboard' : '/login'}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white py-2 text-xs font-black text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  تجربة مجانية
                </Link>
              </td>
              <td className="p-4 sm:p-6 text-center border-r border-slate-200/70">
                <button
                  type="button"
                  onClick={() => onSelectTier?.('standard', activeStage)}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 py-2 text-xs font-black text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  اشترك الآن
                </button>
              </td>
              <td className="p-4 sm:p-6 text-center border-r border-indigo-200 bg-indigo-50/50">
                <button
                  type="button"
                  onClick={() => onSelectTier?.('pro', activeStage)}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 py-2 text-xs font-black text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  الاشتراك الشامل
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Decision-making Guarantee Callout */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3 text-right">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-slate-900 text-sm sm:text-base">ضمان الجودة ومرونة الترقية</div>
            <div className="text-xs sm:text-sm text-slate-600 mt-0.5">
              يمكنك الترقية بين الباقات في أي وقت وسداد الفارق فقط، مع حفظ كامل تقدمك وإحصائياتك السابقة.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/contact"
            className="px-4 py-2 rounded-xl text-xs font-black text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            تواصل مع المستشار التعليمي
          </a>
        </div>
      </div>
    </div>
  );
};

export default PricingComparisonMatrix;
