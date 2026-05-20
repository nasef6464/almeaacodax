import React from 'react';
import { Link } from 'react-router-dom';

type Plan = {
  id: 'free' | 'basic' | 'premium';
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  features: string[];
  cta: string;
  ctaLink: string;
};

const plans: Plan[] = [
  {
    id: 'free',
    name: 'مجاني',
    price: '0 ر.س',
    period: 'مدى الحياة',
    features: [
      'الوصول إلى محتوى تعليمي مجاني',
      'تجربة محدودة للاختبارات',
      'لوحة طالب أساسية',
    ],
    cta: 'ابدأ الآن',
    ctaLink: '/courses',
  },
  {
    id: 'basic',
    name: 'أساسي',
    price: '49 ر.س',
    period: 'شهريًا',
    features: [
      'فتح الدورات الأساسية الكاملة',
      'تدريبات واختبارات أكثر',
      'تحليل أداء أسبوعي',
    ],
    cta: 'اشترك في الأساسي',
    ctaLink: '/courses',
  },
  {
    id: 'premium',
    name: 'متميز',
    price: '99 ر.س',
    period: 'شهريًا',
    highlight: true,
    features: [
      'كل محتوى المنصة بدون قيود',
      'اختبارات محاكية متقدمة',
      'شهادات + تحليلات ذكية كاملة',
    ],
    cta: 'اشترك في المتميز',
    ctaLink: '/courses',
  },
];

const Pricing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">خطط الاشتراك</h1>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            اختر الخطة المناسبة لك وابدأ رحلة تعليمية أقوى في منصة المئة.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 shadow-sm transition-all ${
                plan.highlight
                  ? 'border-amber-300 bg-amber-50/60 shadow-amber-100'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.highlight ? (
                <span className="inline-block rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
                  الأكثر طلبًا
                </span>
              ) : null}

              <h2 className="mt-3 text-2xl font-black text-gray-900">{plan.name}</h2>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-3xl font-black text-indigo-700">{plan.price}</span>
                <span className="pb-1 text-sm text-gray-500">{plan.period}</span>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-xl bg-white/80 px-3 py-2">
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to={plan.ctaLink}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-black text-white ${
                  plan.highlight ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
          الدفع والاشتراكات الفعلية تُفعّل عند ربط بوابة الدفع رسميًا. حاليًا هذه الصفحة توضح الباقات التجارية المعتمدة.
        </div>
      </div>
    </div>
  );
};

export default Pricing;

