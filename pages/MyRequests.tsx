import React, { useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { CheckCircle, Clock, XCircle, FileText, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';

type RequestStatus = 'completed' | 'pending' | 'cancelled';

interface RequestRow {
  id: string;
  courseName: string;
  status: RequestStatus;
  orderDate: string;
  price: number;
  paymentMethod: string;
}

export const MyRequests: React.FC = () => {
  const { user, courses, enrolledCourses } = useStore();

  const rows = useMemo<RequestRow[]>(() => {
    const purchasedIds = user.subscription?.purchasedCourses || [];
    const courseIds = Array.from(new Set([...purchasedIds, ...enrolledCourses]));

    return courseIds
      .map((courseId) => {
        const course = courses.find((item) => item.id === courseId);
        if (!course) return null;

        const isPurchased = purchasedIds.includes(courseId);
        const status: RequestStatus = isPurchased ? 'completed' : 'pending';

        return {
          id: `req_${courseId}`,
          courseName: course.title,
          status,
          orderDate: new Date().toLocaleDateString('ar-SA'),
          price: course.price || 0,
          paymentMethod: isPurchased ? 'بطاقة إلكترونية' : 'قيد المراجعة',
        };
      })
      .filter((item): item is RequestRow => !!item);
  }, [user.subscription?.purchasedCourses, enrolledCourses, courses]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800">طلباتي</h1>
        <p className="text-sm text-gray-500">سجل طلبات الاشتراك في الدورات</p>
      </header>

      {rows.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-20" />
          <p>لا توجد طلبات حالياً.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((req) => (
            <Card key={req.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800">{req.courseName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    req.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : req.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                  >
                    {req.status === 'completed' && <CheckCircle size={10} />}
                    {req.status === 'pending' && <Clock size={10} />}
                    {req.status === 'cancelled' && <XCircle size={10} />}
                    {req.status === 'completed' ? 'مكتمل' : req.status === 'pending' ? 'قيد المراجعة' : 'ملغي'}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="font-bold">رقم الطلب:</span> {req.id}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {req.orderDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                <div className="text-left">
                  <div className="font-bold text-lg text-gray-900 flex items-center gap-0.5">
                    {req.price} <span className="text-xs font-normal text-gray-500">ر.س</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{req.paymentMethod}</div>
                </div>
                <button className="bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                  عرض الفاتورة
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
