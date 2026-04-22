import React, { useState } from 'react';
import { CreditCard, TrendingUp, DollarSign, Users, Award, ShoppingCart, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const FinancialManager: React.FC = () => {
    const { users, b2bPackages } = useStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'b2b' | 'b2c' | 'transactions'>('overview');

    const b2cPremiumUsers = users.filter(u => u.subscription?.plan === 'premium');
    const totalB2BPackages = b2bPackages.length;

    // Mock data for display
    const kpis = [
        { label: 'إجمالي الإيرادات', value: 'SAR 145,200', trend: '+12%', isPositive: true, icon: <DollarSign size={24} /> },
        { label: 'اشتراكات الأفراد (B2C)', value: `${b2cPremiumUsers.length}`, trend: '+5%', isPositive: true, icon: <Users size={24} /> },
        { label: 'باقات المدارس (B2B)', value: `${totalB2BPackages}`, trend: '+2%', isPositive: true, icon: <BuildingIcon /> },
        { label: 'متوسط قيمة العميل', value: 'SAR 450', trend: '-1%', isPositive: false, icon: <TrendingUp size={24} /> },
    ];

    const recentTransactions = [
        { id: 'TRX-101', user: 'محمد أحمد', type: 'B2C (اشتراك بريميوم)', amount: 'SAR 199', date: '2023-10-25', status: 'ناجح' },
        { id: 'TRX-102', user: 'مدرسة رواد المستقبل', type: 'B2B (باقة 500 طالب)', amount: 'SAR 15,000', date: '2023-10-24', status: 'ناجح' },
        { id: 'TRX-103', user: 'سارة خالد', type: 'شراء دورة مفردة', amount: 'SAR 99', date: '2023-10-24', status: 'ناجح' },
        { id: 'TRX-104', user: 'فهد عبدالله', type: 'B2C (اشتراك بريميوم)', amount: 'SAR 199', date: '2023-10-23', status: 'مرفوض' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المالية والاشتراكات</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة الإيرادات، خطط الاشتراك، والمدفوعات</p>
                </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200">
                {[
                    { id: 'overview', label: 'نظرة عامة' },
                    { id: 'b2c', label: 'اشتراكات الأفراد' },
                    { id: 'b2b', label: 'باقات المدارس' },
                    { id: 'transactions', label: 'سجل العمليات' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                            activeTab === tab.id 
                            ? 'border-indigo-500 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {kpis.map((kpi, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                        {kpi.icon}
                                    </div>
                                    <div className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${kpi.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                                        {kpi.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        {kpi.trend}
                                    </div>
                                </div>
                                <h3 className="text-gray-500 text-sm font-medium mb-1">{kpi.label}</h3>
                                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">أحدث العمليات المالية</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-600 text-sm">
                                    <tr>
                                        <th className="p-4 font-medium">رقم العملية</th>
                                        <th className="p-4 font-medium">العميل</th>
                                        <th className="p-4 font-medium">النوع</th>
                                        <th className="p-4 font-medium">المبلغ</th>
                                        <th className="p-4 font-medium">التاريخ</th>
                                        <th className="p-4 font-medium">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentTransactions.map(trx => (
                                        <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{trx.id}</td>
                                            <td className="p-4 text-gray-800">{trx.user}</td>
                                            <td className="p-4 text-gray-600">{trx.type}</td>
                                            <td className="p-4 font-bold text-indigo-600">{trx.amount}</td>
                                            <td className="p-4 text-gray-500">{trx.date}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${trx.status === 'ناجح' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {trx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab !== 'overview' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">قريباً</h2>
                    <p className="text-gray-500 max-w-sm mx-auto">
                        يجري العمل على تطوير هذا القسم لإدارة تفاصيل الاشتراكات والباقات والتقارير المالية.
                    </p>
                </div>
            )}
        </div>
    );
};

const BuildingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <path d="M9 22v-4h6v4"></path>
        <path d="M8 6h.01"></path>
        <path d="M16 6h.01"></path>
        <path d="M12 6h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M12 14h.01"></path>
        <path d="M16 10h.01"></path>
        <path d="M16 14h.01"></path>
        <path d="M8 10h.01"></path>
        <path d="M8 14h.01"></path>
    </svg>
);
