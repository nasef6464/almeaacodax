import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { Course, PaymentRequest, Role } from '../../types';

const formatNumber = (value?: number | null) => new Intl.NumberFormat('ar-SA').format(value || 0);

const courseVisible = (course: Course) => course.showOnPlatform !== false && course.isPublished !== false;

const packageReady = (course: Course) =>
  Boolean(course.title?.trim()) &&
  Number(course.price || 0) >= 0 &&
  Boolean((course.packageContentTypes || []).length || course.packageType === 'membership');

export const MembershipsManager: React.FC = () => {
  const { courses, users, paths, updateCourse } = useStore();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [busyPackageId, setBusyPackageId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const publicPackages = useMemo(
    () =>
      courses
        .filter((course) => course.isPackage)
        .sort((a, b) => (a.packageType === 'membership' ? -1 : 0) - (b.packageType === 'membership' ? -1 : 0)),
    [courses],
  );

  const publicPackageIds = useMemo(() => new Set(publicPackages.map((course) => course.id)), [publicPackages]);

  const premiumUsers = useMemo(
    () =>
      users.filter((item) => {
        if (item.role !== Role.STUDENT) return false;
        if (item.subscription?.plan === 'premium') return true;
        return (item.subscription?.purchasedPackages || []).some((packageId) => publicPackageIds.has(packageId));
      }),
    [publicPackageIds, users],
  );

  const packageRequests = useMemo(
    () =>
      paymentRequests.filter((request) => {
        const targetId = request.packageId || request.itemId;
        return request.itemType === 'package' && publicPackageIds.has(targetId);
      }),
    [paymentRequests, publicPackageIds],
  );

  const packageRows = useMemo(
    () =>
      publicPackages.map((course) => {
        const buyers = users.filter((item) => (item.subscription?.purchasedPackages || []).includes(course.id));
        const requests = packageRequests.filter((request) => (request.packageId || request.itemId) === course.id);
        const path = paths.find((item) => item.id === course.pathId);
        return {
          course,
          buyersCount: buyers.length,
          pendingRequestsCount: requests.filter((request) => request.status === 'pending').length,
          approvedRequestsCount: requests.filter((request) => request.status === 'approved').length,
          pathName: path?.name || (course.packageType === 'membership' ? 'عضوية عامة' : 'كل المنصة'),
          ready: packageReady(course),
          visible: courseVisible(course),
        };
      }),
    [packageRequests, paths, publicPackages, users],
  );

  const loadPaymentRequests = async () => {
    setLoadingRequests(true);
    setStatusMessage('');
    try {
      const payload = await api.getPaymentRequests(undefined, { page: 1, limit: 100, status: 'all' });
      setPaymentRequests((payload.requests || []) as PaymentRequest[]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'تعذر تحميل طلبات العضوية.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    void loadPaymentRequests();
  }, []);

  const togglePackageVisibility = async (course: Course) => {
    const nextVisible = !courseVisible(course);
    setBusyPackageId(course.id);
    setStatusMessage('');
    try {
      await updateCourse(course.id, {
        showOnPlatform: nextVisible,
        isPublished: nextVisible,
        approvalStatus: nextVisible ? 'approved' : 'draft',
        approvedAt: nextVisible ? Date.now() : course.approvedAt,
      });
      setStatusMessage(nextVisible ? 'تم إظهار العضوية للطلاب.' : 'تم إخفاء العضوية من صفحة الطلاب.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'تعذر تحديث حالة العضوية.');
    } finally {
      setBusyPackageId(null);
    }
  };

  const exportMemberships = () => {
    const header = ['name', 'scope', 'price', 'visible', 'ready', 'pendingRequests', 'subscribers'];
    const lines = packageRows.map((row) =>
      [
        row.course.title,
        row.pathName,
        String(row.course.price || 0),
        row.visible ? 'yes' : 'no',
        row.ready ? 'yes' : 'no',
        String(row.pendingRequestsCount),
        String(row.buyersCount),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `memberships-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPathsMembershipBuilder = () => {
    window.location.hash = '#/admin-dashboard?tab=paths';
  };

  const openFinancialRequests = () => {
    window.location.hash = '#/admin-dashboard?tab=financial';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-indigo-700">
            <CreditCard size={16} />
            مركز مستقل للعضويات والباقات
          </div>
          <h1 className="mt-2 text-2xl font-black text-gray-900">إدارة العضويات</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
            يجمع هذا التبويب العضويات العامة، باقات المسارات، طلبات العضوية، والمشتركين في مكان واحد مع بقاء الإنشاء
            والتحرير التفصيلي داخل إدارة المسارات والاعتماد المالي داخل المالية.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPathsMembershipBuilder}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700"
          >
            <Package size={16} />
            إنشاء/تعديل عضوية
          </button>
          <button
            type="button"
            onClick={openFinancialRequests}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={16} />
            طلبات الدفع
          </button>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'إجمالي العضويات', value: publicPackages.length, icon: <Package size={18} /> },
          { label: 'ظاهرة للطلاب', value: packageRows.filter((row) => row.visible).length, icon: <Eye size={18} /> },
          { label: 'جاهزة للبيع', value: packageRows.filter((row) => row.ready).length, icon: <CheckCircle2 size={18} /> },
          {
            label: 'طلبات معلقة',
            value: packageRequests.filter((request) => request.status === 'pending').length,
            icon: <AlertTriangle size={18} />,
          },
          { label: 'مشتركون نشطون', value: premiumUsers.length, icon: <Users size={18} /> },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span className="text-xs font-black">{card.label}</span>
              {card.icon}
            </div>
            <div className="mt-3 text-3xl font-black text-gray-900">{formatNumber(card.value)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">العضويات والباقات العامة</h2>
            <p className="mt-1 text-sm text-gray-500">إظهار/إخفاء سريع، جاهزية البيع، وعدد الطلبات والمشتركين.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadPaymentRequests()}
              disabled={loadingRequests}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loadingRequests ? 'animate-spin' : ''} />
              تحديث الطلبات
            </button>
            <button
              type="button"
              onClick={exportMemberships}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700"
            >
              <Download size={14} />
              تصدير CSV
            </button>
          </div>
        </div>

        {packageRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm leading-7 text-gray-600">
            لا توجد عضويات أو باقات منشأة حتى الآن. ابدأ من زر إنشاء/تعديل عضوية، ثم ارجع هنا لمراجعة الظهور والطلبات.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-right text-sm">
              <thead className="bg-gray-50 text-xs font-black text-gray-500">
                <tr>
                  <th className="px-4 py-3">العضوية</th>
                  <th className="px-4 py-3">النطاق</th>
                  <th className="px-4 py-3">السعر</th>
                  <th className="px-4 py-3">الجاهزية</th>
                  <th className="px-4 py-3">الطلبات</th>
                  <th className="px-4 py-3">المشتركون</th>
                  <th className="px-4 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packageRows.map((row) => (
                  <tr key={row.course.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-black text-gray-900">{row.course.title}</div>
                      <div className="mt-1 text-xs text-gray-500">{row.course.packageType || 'package'}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{row.pathName}</td>
                    <td className="px-4 py-4 font-bold text-gray-900">
                      {formatNumber(row.course.price)} {row.course.currency || 'SAR'}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                          row.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {row.ready ? 'جاهزة' : 'تحتاج ضبط'}
                      </span>
                      <div className="mt-2 text-xs text-gray-500">{row.visible ? 'ظاهرة للطلاب' : 'مخفية حاليا'}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      معلق: {formatNumber(row.pendingRequestsCount)}
                      <br />
                      معتمد: {formatNumber(row.approvedRequestsCount)}
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900">{formatNumber(row.buyersCount)}</td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => void togglePackageVisibility(row.course)}
                        disabled={busyPackageId === row.course.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {row.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                        {busyPackageId === row.course.id ? 'جار التحديث...' : row.visible ? 'إخفاء' : 'إظهار'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-gray-900">طلبات العضوية الأخيرة</h2>
          <div className="mt-4 space-y-3">
            {packageRequests.slice(0, 6).map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-gray-900">{request.userName}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-gray-600">{request.status}</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{request.itemName}</div>
              </div>
            ))}
            {packageRequests.length === 0 ? <p className="text-sm text-gray-500">لا توجد طلبات عضوية مرتبطة بالباقات الحالية.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-gray-900">المشتركون</h2>
          <div className="mt-4 space-y-3">
            {premiumUsers.slice(0, 8).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div>
                  <div className="font-black text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.email}</div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                  {item.subscription?.plan === 'premium' ? 'Premium' : 'Package'}
                </span>
              </div>
            ))}
            {premiumUsers.length === 0 ? <p className="text-sm text-gray-500">لا يوجد مشتركون مرتبطون بعضوية عامة حاليا.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
};
