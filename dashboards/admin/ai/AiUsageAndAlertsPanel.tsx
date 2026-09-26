import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Coins, Gauge, ShieldAlert, Zap } from 'lucide-react';

type UsageSummary = {
  last24h: number;
  fallbackCount: number;
  errorCount: number;
  totalTokens24h: number;
  cachedTokens24h: number;
  requestsToday?: number;
  totalTokensToday?: number;
  estimatedCostMicrosUsdToday?: number;
};

type ProviderHealth = {
  provider: string;
  failures: number;
  open: boolean;
  openUntil?: number;
  lastFailureAt?: number;
};

export const AiUsageAndAlertsPanel: React.FC<{
  summary?: UsageSummary | null;
  providerHealth?: ProviderHealth[];
  paidAllowed?: boolean;
  dailySpendCapUsd?: number;
}> = ({ summary, providerHealth = [], paidAllowed = false, dailySpendCapUsd = 0 }) => {
  const last24h = Math.max(0, Number(summary?.last24h || 0));
  const fallbackRate = last24h > 0 ? Number(summary?.fallbackCount || 0) / last24h : 0;
  const cacheRate = Number(summary?.totalTokens24h || 0) > 0
    ? Number(summary?.cachedTokens24h || 0) / Number(summary?.totalTokens24h || 1)
    : 0;
  const costUsd = Number(summary?.estimatedCostMicrosUsdToday || 0) / 1_000_000;
  const openProviders = providerHealth.filter((item) => item.open);

  const alerts = [
    ...(paidAllowed && dailySpendCapUsd <= 0
      ? [{ level: 'warn' as const, text: 'الإنفاق المدفوع مسموح بدون سقف يومي. يفضّل تحديد Hard Spend Cap.' }]
      : []),
    ...(openProviders.length
      ? [{ level: 'warn' as const, text: `Circuit مفتوح حاليًا: ${openProviders.map((item) => item.provider).join('، ')}.` }]
      : []),
    ...(fallbackRate >= 0.2 && last24h >= 5
      ? [{ level: 'warn' as const, text: `نسبة fallback مرتفعة: ${Math.round(fallbackRate * 100)}% خلال 24 ساعة.` }]
      : []),
    ...(Number(summary?.errorCount || 0) > 0
      ? [{ level: 'warn' as const, text: `يوجد ${Number(summary?.errorCount || 0)} خطأ AI مسجل يحتاج مراجعة.` }]
      : []),
  ];

  const cards = [
    {
      label: 'طلبات اليوم',
      value: Number(summary?.requestsToday || 0).toLocaleString('en-US'),
      sub: `${last24h.toLocaleString('en-US')} خلال 24 ساعة`,
      icon: <Activity size={18} />,
    },
    {
      label: 'Tokens اليوم',
      value: Number(summary?.totalTokensToday || 0).toLocaleString('en-US'),
      sub: `Cache ${Math.round(cacheRate * 100)}%`,
      icon: <Gauge size={18} />,
    },
    {
      label: 'تكلفة اليوم المقدرة',
      value: `$${costUsd.toFixed(4)}`,
      sub: paidAllowed ? `السقف: ${dailySpendCapUsd > 0 ? `$${dailySpendCapUsd.toFixed(2)}` : 'غير محدد'}` : 'المدفوع مغلق',
      icon: <Coins size={18} />,
    },
    {
      label: 'Fallback',
      value: `${Math.round(fallbackRate * 100)}%`,
      sub: `${Number(summary?.fallbackCount || 0).toLocaleString('en-US')} تفاعل`,
      icon: <Zap size={18} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-500">{card.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{card.value}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-1">{card.sub}</p>
              </div>
              <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
          <ShieldAlert size={17} className="text-amber-600" />
          التنبيهات التشغيلية
        </h3>
        <div className="mt-3 space-y-2">
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={16} /> لا توجد تنبيهات تكلفة أو Provider Health حرجة حاليًا.
            </div>
          ) : alerts.map((alert, index) => (
            <div key={index} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {alert.text}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-black text-gray-900 mb-3">صحة المزودات</h3>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {providerHealth.length === 0 ? (
            <p className="text-xs font-bold text-gray-400">لا توجد بيانات Circuit مسجلة بعد.</p>
          ) : providerHealth.map((item) => (
            <div key={item.provider} className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-gray-800">{item.provider}</p>
                <p className="text-[10px] font-bold text-gray-400">Failures: {item.failures}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-black ${item.open ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {item.open ? 'Circuit Open' : 'Healthy'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
