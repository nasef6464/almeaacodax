import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../services/api';

interface ParentApprovalsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ParentApprovalsModal: React.FC<ParentApprovalsModalProps> = ({ isOpen, onClose }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
        }
    }, [isOpen]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await api.get('/parent/approvals');
            if (Array.isArray(data)) {
                setRequests(data);
            }
        } catch (error) {
            console.error('Failed to fetch approvals', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            setActionLoading(id);
            await api.post(`/parent/approvals/${id}/${action}`, {});
            setRequests(requests.filter(r => r.id !== id));
        } catch (error) {
            console.error(`Failed to ${action} request`, error);
            alert(`حدث خطأ أثناء ${action === 'approve' ? 'الموافقة' : 'الرفض'}`);
        } finally {
            setActionLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">سير عمل الموافقات</h2>
                        <p className="text-sm text-gray-500 font-bold mt-1">
                            مراجعة طلبات واشتراكات الأبناء
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                    {loading ? (
                        <div className="text-center py-10">جاري التحميل...</div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900">لا توجد طلبات معلقة</h3>
                            <p className="text-sm text-gray-500 font-bold mt-2">جميع طلبات الأبناء تمت مراجعتها.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mb-2">
                                            {req.itemType === 'course' ? 'دورة' : req.itemType === 'subscription' ? 'اشتراك' : req.itemType === 'package' ? 'باقة' : 'طلب'}
                                        </div>
                                        <h4 className="font-black text-gray-900">{req.itemName}</h4>
                                        <p className="text-sm text-gray-500 mt-1 font-bold">
                                            مبلغ الطلب: {req.amount} {req.currency}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAction(req.id, 'reject')}
                                            disabled={actionLoading === req.id}
                                            className="flex-1 md:flex-none px-4 py-2 rounded-xl font-bold text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {actionLoading === req.id ? 'جاري...' : <><XCircle size={16} /> رفض</>}
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, 'approve')}
                                            disabled={actionLoading === req.id}
                                            className="flex-1 md:flex-none px-4 py-2 rounded-xl font-bold text-sm text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {actionLoading === req.id ? 'جاري...' : <><CheckCircle size={16} /> موافقة</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
