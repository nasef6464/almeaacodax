import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Package,
  Plus,
  RefreshCw,
  Save,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { useStore } from '../../store/useStore';
import { Course, PackageContentType, PaymentRequest, Role } from '../../types';

const formatNumber = (value?: number | null) => new Intl.NumberFormat('ar-SA').format(value || 0);

const courseVisible = (course: Course) => course.showOnPlatform !== false && course.isPublished !== false;
const isGeneralMembership = (course: Course) =>
  course.isPackage === true &&
  course.packageType === 'membership' &&
  !(course.pathId || course.category || course.subjectId || course.subject);
const isPathPackage = (course: Course) => course.isPackage === true && !isGeneralMembership(course);

const contentTypeLabels: Record<PackageContentType, string> = {
  all: 'كل المنصة',
  courses: 'الدورات',
  foundation: 'التأسيس',
  banks: 'التدريب',
  tests: 'الاختبارات',
  mockExams: 'الاختبارات المحاكية',
  library: 'المكتبة',
};

const defaultMembership = () => ({
  title: '',
  price: 0,
  currency: 'SAR',
  description: '',
  features: 'وصول عام للمنصة\nدعم حسب إعدادات الإدارة',
  packageContentTypes: ['all'] as PackageContentType[],
});

export const MembershipsManager: React.FC = () => {
  const { courses, users, paths, addCourse, updateCourse } = useStore();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [form, setForm] = useState(defaultMembership);
  const [editingId, setEditingId] = useState<string | null>(null);

  const memberships = useMemo(
    () => courses.filter(isGeneralMembership).sort((a, b) => Number(a.price || 0) - Number(b.price || 0)),
    [courses],
  );

  const pathPackages = useMemo(
    () => courses.filter(isPathPackage).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [courses],
  );

  const membershipIds = useMemo(() => new Set(memberships.map((course) => course.id)), [memberships]);

  const membershipRequests = useMemo(
    () =>
      paymentRequests.filter((request) => {
        const targetId = request.packageId || request.itemId;
        return request.itemType === 'package' && membershipIds.has(targetId);
      }),
    [membershipIds, paymentRequests],
  );

  const premiumUsers = useMemo(
    () =>
      users.filter((item) => {
        if (item.role !== Role.STUDENT) return false;
        if (item.subscription?.plan === 'premium') return true;
        return (item.subscription?.purchasedPackages || []).some((packageId) => membershipIds.has(packageId));
      }),
    [membershipIds, users],
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

  const resetForm = () => {
    setForm(defaultMembership());
    setEditingId(null);
  };

  const editMembership = (course: Course) => {
    setEditingId(course.id);
    setForm({
      title: course.title || '',
      price: Number(course.price || 0),
      currency: course.currency || 'SAR',
      description: course.description || '',
      features: (course.features || []).join('\n'),
      packageContentTypes: course.packageContentTypes?.length ? course.packageContentTypes : ['all'],
    });
  };

  const saveMembership = async () => {
    const title = form.title.trim();
    if (!title) {
      setStatusMessage('اكتب اسم العضوية أولا.');
      return;
    }

    setBusyId(editingId || 'new');
    setStatusMessage('');
    const now = Date.now();
    const payload: Course = {
      id: editingId || `membership_${now}`,
      title,
      thumbnail: '',
      instructor: 'منصة المئة',
      price: Math.max(0, Number(form.price || 0)),
      currency: form.currency || 'SAR',
      duration: 0,
      level: 'Beginner',
      rating: 5,
      progress: 0,
      category: '',
      subject: '',
      pathId: '',
      subjectId: '',
      features: form.features.split('\n').map((item) => item.trim()).filter(Boolean),
      description: form.description.trim(),
      isPackage: true,
      packageType: 'membership',
      packageContentTypes: form.packageContentTypes.length ? form.packageContentTypes : ['all'],
      includedCourses: [],
      isPublished: true,
      showOnPlatform: true,
      approvalStatus: 'approved',
      approvedAt: now,
      createdAt: now,
    } as Course;

    try {
      if (editingId) {
        await updateCourse(editingId, payload);
        setStatusMessage('تم تحديث العضوية العامة.');
      } else {
        await addCourse(payload);
        setStatusMessage('تم إنشاء العضوية العامة.');
      }
      resetForm();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'تعذر حفظ العضوية.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleMembershipVisibility = async (course: Course) => {
    const nextVisible = !courseVisible(course);
    setBusyId(course.id);
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
      setBusyId(null);
    }
  };

  const exportMemberships = () => {
    const header = ['name', 'price', 'visible', 'pendingRequests', 'subscribers'];
    const lines = memberships.map((course) => {
      const requests = membershipRequests.filter((request) => (request.packageId || request.itemId) === course.id);
      const subscribers = users.filter((item) => (item.subscription?.purchasedPackages || []).includes(course.id));
      return [
        course.title,
        String(course.price || 0),
        courseVisible(course) ? 'yes' : 'no',
        String(requests.filter((request) => request.status === 'pending').length),
        String(subscribers.length),
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `memberships-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleContentType = (type: PackageContentType) => {
    setForm((current) => {
      if (type === 'all') {
        return { ...current, packageContentTypes: ['all'] };
      }
      const withoutAll = current.packageContentTypes.filter((item) => item !== 'all');
      const next = withoutAll.includes(type) ? withoutAll.filter((item) => item !== type) : [...withoutAll, type];
      return { ...current, packageContentTypes: next.length ? next : ['all'] };
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-indigo-700">
              <CreditCard size={16} />
              عضويات عامة مستقلة عن باقات المسارات
            </div>
            <h1 className="mt-2 text-2xl font-black text-gray-900">إدارة العضويات</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
              العضوية تفتح المنصة حسب نطاقها العام. باقات المسارات والمدارس تبقى منفصلة، ويمكن أن يشترك نفس المحتوى في أكثر من باقة أو عضوية.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadPaymentRequests()}
              disabled={loadingRequests}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loadingRequests ? 'animate-spin' : ''} />
              تحديث الطلبات
            </button>
            <button
              type="button"
              onClick={exportMemberships}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700"
            >
              <Download size={16} />
              تصدير CSV
            </button>
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {statusMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'العضويات العامة', value: memberships.length, icon: <Package size={18} /> },
          { label: 'ظاهرة للطلاب', value: memberships.filter(courseVisible).length, icon: <Eye size={18} /> },
          { label: 'باقات المسارات منفصلة', value: pathPackages.length, icon: <Package size={18} /> },
          { label: 'طلبات معلقة', value: membershipRequests.filter((request) => request.status === 'pending').length, icon: <AlertTriangle size={18} /> },
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

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-gray-900">{editingId ? 'تعديل عضوية' : 'إنشاء عضوية عامة'}</h2>
          <div className="mt-4 space-y-3">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="اسم العضوية"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold focus:border-indigo-400 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value || 0) }))}
                placeholder="السعر"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold focus:border-indigo-400 focus:outline-none"
              />
              <input
                value={form.currency}
                onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value || 'SAR' }))}
                placeholder="SAR"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="وصف مختصر"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold focus:border-indigo-400 focus:outline-none"
            />
            <textarea
              value={form.features}
              onChange={(event) => setForm((current) => ({ ...current, features: event.target.value }))}
              placeholder="ميزة في كل سطر"
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold focus:border-indigo-400 focus:outline-none"
            />
            <div>
              <div className="mb-2 text-xs font-black text-gray-600">نطاق العضوية</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(contentTypeLabels) as PackageContentType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleContentType(type)}
                    className={`rounded-lg border px-3 py-2 text-xs font-black ${
                      form.packageContentTypes.includes(type)
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {contentTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void saveMembership()}
                disabled={busyId === 'new' || busyId === editingId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                <Save size={16} />
                حفظ
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">العضويات العامة</h2>
              <p className="mt-1 text-sm text-gray-500">هذه فقط التي تظهر في صفحة عضويات المنصة.</p>
            </div>
            <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
              <Plus size={14} />
              عضوية جديدة
            </button>
          </div>

          {memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm leading-7 text-gray-600">
              لا توجد عضويات عامة منشورة حتى الآن. أنشئ عضوية من النموذج، وستظهر مباشرة في صفحة العضويات للطلاب.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-right text-sm">
                <thead className="bg-gray-50 text-xs font-black text-gray-500">
                  <tr>
                    <th className="px-4 py-3">العضوية</th>
                    <th className="px-4 py-3">النطاق</th>
                    <th className="px-4 py-3">السعر</th>
                    <th className="px-4 py-3">الطلبات</th>
                    <th className="px-4 py-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {memberships.map((course) => {
                    const requests = membershipRequests.filter((request) => (request.packageId || request.itemId) === course.id);
                    const subscribers = users.filter((item) => (item.subscription?.purchasedPackages || []).includes(course.id));
                    const contentTypes = course.packageContentTypes?.length ? course.packageContentTypes : ['all'];
                    return (
                      <tr key={course.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-black text-gray-900">{course.title}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            {courseVisible(course) ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-black text-emerald-700">
                                <CheckCircle2 size={12} /> ظاهرة
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-black text-gray-600">
                                <EyeOff size={12} /> مخفية
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {contentTypes.map((type) => contentTypeLabels[type as PackageContentType] || type).join(' + ')}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-900">
                          {formatNumber(course.price)} {course.currency || 'SAR'}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          معلق: {formatNumber(requests.filter((request) => request.status === 'pending').length)}
                          <br />
                          مشترك: {formatNumber(subscribers.length)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => editMembership(course)}
                              className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleMembershipVisibility(course)}
                              disabled={busyId === course.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 disabled:opacity-60"
                            >
                              {courseVisible(course) ? <EyeOff size={14} /> : <Eye size={14} />}
                              {courseVisible(course) ? 'إخفاء' : 'إظهار'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-gray-900">باقات المسارات منفصلة</h2>
        <p className="mt-1 text-sm text-gray-500">
          هذه الباقات تدار من تبويب المسارات، ولا تختلط مع العضويات العامة.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pathPackages.slice(0, 9).map((pkg) => {
            const pathName = paths.find((path) => path.id === (pkg.pathId || pkg.category))?.name || 'مسار غير محدد';
            return (
              <div key={pkg.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="font-black text-gray-900">{pkg.title}</div>
                <div className="mt-1 text-xs font-bold text-gray-500">{pathName}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
