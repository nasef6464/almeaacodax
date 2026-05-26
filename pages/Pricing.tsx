import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

type MembershipPlan = {
  id: 'free' | 'basic' | 'premium';
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  features: string[];
  cta: string;
  action: 'internal' | 'whatsapp';
};

const WHATSAPP_PHONE = '00966508438250';

const membershipPlans: MembershipPlan[] = [
  {
    id: 'free',
    name: 'عضوية مجانية',
    price: '0 ر.س',
    period: 'مدى الحياة',
    features: [
      'الوصول إلى محتوى تعليمي مجاني',
      'تجربة محدودة للاختبارات',
      'لوحة طالب أساسية',
    ],
    cta: 'ابدأ الآن',
    action: 'internal',
  },
  {
    id: 'basic',
    name: 'عضوية أساسية',
    price: '49 ر.س',
    period: 'شهريًا',
    features: [
      'فتح الدورات الأساسية الكاملة',
      'تدريبات واختبارات إضافية',
      'تحليل أداء أسبوعي',
    ],
    cta: 'اطلب العضوية الأساسية',
    action: 'whatsapp',
  },
  {
    id: 'premium',
    name: 'عضوية مميزة',
    price: '99 ر.س',
    period: 'شهريًا',
    highlight: true,
    features: [
      'كل محتوى المنصة بدون قيود',
      'اختبارات محاكية متقدمة',
      'شهادات وتحليلات ذكية كاملة',
    ],
    cta: 'اطلب العضوية المميزة',
    action: 'whatsapp',
  },
];

const buildMembershipRequestUrl = (plan: MembershipPlan) => {
  const message = [
    'مرحبًا، أريد الاشتراك في عضوية منصة المئة.',
    `العضوية: ${plan.name}`,
    `السعر: ${plan.price} / ${plan.period}`,
    'هذه عضوية عامة للمنصة وليست باقة مسار تعلم.',
  ].join('\n');

  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
};

const Pricing: React.FC = () => {
  const { user } = useStore();
  const freeMembershipLink = user ? '/dashboard' : '/login';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">عضويات المنصة</h1>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            اختر العضوية المناسبة لك وابدأ رحلة تعليمية أقوى في منصة المئة.
          </p>
          <p className="mx-auto mt-3 max-w-2xl rounded-full bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700">
            العضويات هنا اشتراك عام للمنصة، وليست باقات ساحة التعلم داخل المسارات.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {membershipPlans.map((plan) => (
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

              {plan.action === 'internal' ? (
                <Link
                  to={freeMembershipLink}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-black text-white ${
                    plan.highlight ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <a
                  href={buildMembershipRequestUrl(plan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-white ${
                    plan.highlight ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {plan.cta}
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800">
          هذه الصفحة خاصة بعضويات المنصة العامة. باقات ساحة التعلم تدار بشكل مستقل داخل المسارات وساحة التعلم.
        </div>

        {isAdmin ? (
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-white p-4 text-sm leading-7 text-gray-700 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-1 rounded-full bg-indigo-50 p-2 text-indigo-600">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <div className="font-black text-gray-900">إدارة العضويات العامة للمدير</div>
                  <div className="text-gray-600">
                    من لوحة المدير افتح إدارة المسارات ثم تبويب الباقات الشاملة، وفعل خيار "عضوية عامة تفتح كل المنصة".
                  </div>
                </div>
              </div>
              <Link
                to="/admin-dashboard?tab=paths"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700"
              >
                فتح إدارة العضويات
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Pricing;
