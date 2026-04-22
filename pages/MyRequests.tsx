
import React from 'react';
import { myRequests } from '../services/mockData';
import { Card } from '../components/ui/Card';
import { CheckCircle, Clock, XCircle, FileText, DollarSign, Calendar } from 'lucide-react';

export const MyRequests: React.FC = () => {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-800">طلباتي</h1>
                <p className="text-sm text-gray-500">سجل طلبات الاشتراك في الدورات</p>
            </header>

            {myRequests.length === 0 ? (
                <Card className="p-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>لا توجد طلبات حالياً.</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {myRequests.map((req) => (
                        <Card key={req.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-800">{req.courseName}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                        req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                        req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
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
