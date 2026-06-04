import React, { useMemo, useState } from 'react';
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

const PaymentModal = React.lazy(() => import('../components/PaymentModal').then((module) => ({ default: module.PaymentModal })));

const formatPrice = (price?: number, currency = 'SAR') =>
  `${new Intl.NumberFormat('ar-SA').format(Number(price || 0))} ${currency}`;

const isPublicMembership = (course: ReturnType<typeof useStore.getState>['courses'][number]) =>
  course.isPackage === true &&
  course.packageType === 'membership' &&
  !(course.pathId || course.category || course.subjectId || course.subject);

const isVisiblePackage = (course: ReturnType<typeof useStore.getState>['courses'][number]) =>
  course.showOnPlatform !== false &&
  course.isPublished !== false &&
  (!course.approvalStatus || course.approvalStatus === 'approved');

const Pricing: React.FC = () => {
  const { user, courses } = useStore();
  const [selectedMembership, setSelectedMembership] = useState<any | null>(null);
  const isAdmin = user?.role === 'admin';

  const memberships = useMemo(
    () =>
      courses
        .filter((course) => isPublicMembership(course) && isVisiblePackage(course))
        .sort((a, b) => Number(a.price || 0) - Number(b.price || 0)),
    [courses],
  );

  const freeMembershipLink = user?.id && user.id !== 'guest' ? '/dashboard' : '/login';

  return (
    <div data-testid="pricing-memberships-page" className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900 sm:text-4xl">عضويات المنصة</h1>
          <p className="mt-3 text-sm text-gray-600 sm:text-base">
            العضوية هنا اشتراك عام على مستوى المنصة. باقات المسارات والمدارس تدار بشكل مستقل داخل المسارات والمدارس.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">مجانية</span>
            <h2 className="mt-3 text-2xl font-black text-gray-900">عضوية مجانية</h2>
            <div className="mt-2 text-3xl font-black text-indigo-700">0 ر.س</div>
            <ul className="mt-5 space-y-2 text-sm text-gray-700">
              <li className="rounded-xl bg-gray-50 px-3 py-2">الوصول للمحتوى المجاني</li>
              <li className="rounded-xl bg-gray-50 px-3 py-2">لوحة طالب أساسية</li>
              <li className="rounded-xl bg-gray-50 px-3 py-2">شراء باقات المسارات عند الحاجة</li>
            </ul>
            <Link
              to={freeMembershipLink}
              data-testid="pricing-free-membership-start"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700"
            >
              ابدأ الآن
            </Link>
          </div>

          {memberships.map((membership) => (
            <div key={membership.id} className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">عضوية عامة</span>
              <h2 className="mt-3 text-2xl font-black text-gray-900">{membership.title}</h2>
              <div className="mt-2 text-3xl font-black text-indigo-700">
                {formatPrice(membership.price, membership.currency || 'SAR')}
              </div>
              {membership.description ? (
                <p className="mt-3 text-sm leading-7 text-gray-600">{membership.description}</p>
              ) : null}
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {(membership.features?.length ? membership.features : ['وصول عام حسب إعدادات المدير']).slice(0, 5).map((feature: string) => (
                  <li key={feature} className="rounded-xl bg-gray-50 px-3 py-2">{feature}</li>
                ))}
              </ul>
              <button
                type="button"
                data-testid="pricing-membership-request"
                onClick={() => setSelectedMembership({
                  ...membership,
                  packageId: membership.id,
                  purchaseType: 'package',
                  isPackage: true,
                  contentTypes: membership.packageContentTypes?.length ? membership.packageContentTypes : ['all'],
                  packageContentTypes: membership.packageContentTypes?.length ? membership.packageContentTypes : ['all'],
                  accessContext: 'هذه عضوية عامة على مستوى المنصة وليست باقة مسار محددة.',
                })}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white hover:bg-amber-600"
              >
                <CreditCard size={16} />
                طلب العضوية
              </button>
            </div>
          ))}
        </div>

        {memberships.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
            لا توجد عضويات عامة منشورة من الإدارة حاليا. يستطيع الطالب استخدام العضوية المجانية أو شراء باقات المسارات من صفحات المسارات.
          </div>
        ) : null}

        {isAdmin ? (
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-white p-4 text-sm leading-7 text-gray-700 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-1 rounded-full bg-indigo-50 p-2 text-indigo-600">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <div className="font-black text-gray-900">إدارة العضويات العامة</div>
                  <div className="text-gray-600">
                    العضويات العامة تظهر هنا بعد نشرها من تبويب العضويات. باقات المسارات والمدارس تبقى منفصلة في أماكنها.
                  </div>
                </div>
              </div>
              <Link
                to="/admin-dashboard?tab=memberships"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700"
              >
                فتح إدارة العضويات
                <ExternalLink size={16} />
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <React.Suspense fallback={null}>
        <PaymentModal
          isOpen={!!selectedMembership}
          onClose={() => setSelectedMembership(null)}
          item={selectedMembership || {}}
          type="package"
        />
      </React.Suspense>
    </div>
  );
};

export default Pricing;
