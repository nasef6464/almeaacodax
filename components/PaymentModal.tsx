
import React, { useState } from 'react';
import { X, CreditCard, Landmark, Wallet, CheckCircle2, ChevronLeft, ShieldCheck, Lock } from 'lucide-react';
import { useStore } from '../store/useStore';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    type?: 'course' | 'package' | 'skill' | 'test';
}

type PaymentMethod = 'card' | 'transfer' | 'wallet';

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, item, type = 'course' }) => {
    const [step, setStep] = useState<'method' | 'details' | 'success'>('method');
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [loading, setLoading] = useState(false);
    const { enrollCourse } = useStore();

    if (!isOpen || !item) return null;

    const handleMethodSelect = (m: PaymentMethod) => {
        setMethod(m);
        setStep('details');
    };

    const handlePayment = () => {
        setLoading(true);
        // Simulate payment process
        setTimeout(() => {
            setLoading(false);
            if (type === 'course') {
                enrollCourse(item.id);
            }
            setStep('success');
        }, 2000);
    };

    const getTitle = () => {
        if (type === 'package') return 'الاشتراك في الباقة';
        if (type === 'skill') return 'شراء المهارة';
        if (type === 'test') return 'شراء الاختبار';
        return 'الاشتراك في الدورة';
    };

    const getItemName = () => {
        return item.title || item.name || 'العنصر المحدد';
    };

    const getPrice = () => {
        return item.price || 0;
    };

    const getCurrency = () => {
        return item.currency || 'ر.س';
    };

    const renderMethodSelector = () => (
        <div className="space-y-4 animate-fade-in">
            <h3 className="text-xl font-black text-gray-800 mb-6 text-right">{getTitle()}</h3>
            
            <button 
                onClick={() => handleMethodSelect('card')}
                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <CreditCard size={24} />
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-800">بطاقة بنكية (مدى / فيزا / ماستركارد)</p>
                        <p className="text-xs text-gray-500">دفع آمن وفوري</p>
                    </div>
                </div>
                <ChevronLeft size={20} className="text-gray-400" />
            </button>

            <button 
                onClick={() => handleMethodSelect('transfer')}
                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-amber-100 text-amber-600 p-3 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Landmark size={24} />
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-800">تحويل بنكي</p>
                        <p className="text-xs text-gray-500">الراجحي / الأهلي / بنك مصر</p>
                    </div>
                </div>
                <ChevronLeft size={20} className="text-gray-400" />
            </button>

            <button 
                onClick={() => handleMethodSelect('wallet')}
                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Wallet size={24} />
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-gray-800">محافظ إلكترونية</p>
                        <p className="text-xs text-gray-500">STC Pay / Vodafone Cash / Fawry</p>
                    </div>
                </div>
                <ChevronLeft size={20} className="text-gray-400" />
            </button>
        </div>
    );

    const renderDetails = () => (
        <div className="space-y-6 animate-fade-in text-right">
            <div className="flex items-center gap-2 text-indigo-600 mb-4 cursor-pointer" onClick={() => setStep('method')}>
                <ChevronLeft size={20} className="transform rotate-180" />
                <span className="font-bold text-sm">العودة لطرق الدفع</span>
            </div>

            {method === 'card' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-gray-800">تفاصيل البطاقة</h3>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600">رقم البطاقة</label>
                        <input type="text" placeholder="**** **** **** ****" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600">تاريخ الانتهاء</label>
                            <input type="text" placeholder="MM/YY" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600">CVV</label>
                            <input type="text" placeholder="***" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>
            )}

            {method === 'transfer' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-gray-800">بيانات التحويل</h3>
                    <div className="bg-gray-50 p-6 rounded-2xl space-y-4 border border-gray-100">
                        <div>
                            <p className="text-xs text-gray-400">اسم البنك</p>
                            <p className="font-bold text-gray-800">مصرف الراجحي</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">رقم الآيبان (IBAN)</p>
                            <p className="font-mono font-bold text-indigo-600 text-lg">SA 1234 5678 9012 3456 7890</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">اسم المستفيد</p>
                            <p className="font-bold text-gray-800">شركة منصة المئة التعليمية</p>
                        </div>
                    </div>
                    <p className="text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-lg">يرجى إرفاق صورة التحويل بعد إتمام العملية لتفعيل الدورة.</p>
                    <button className="w-full py-4 border-2 border-dashed border-indigo-300 rounded-2xl text-indigo-600 font-bold hover:bg-indigo-50 transition-colors">
                        إرفاق إيصال التحويل
                    </button>
                </div>
            )}

            {method === 'wallet' && (
                <div className="space-y-4">
                    <h3 className="text-xl font-black text-gray-800">الدفع عبر المحفظة</h3>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-600">رقم الهاتف المرتبط بالمحفظة</label>
                        <input type="text" placeholder="05xxxxxxxx" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 p-4 border-2 border-indigo-500 bg-indigo-50 rounded-xl flex flex-col items-center gap-2">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/STC_Pay_Logo.svg/1200px-STC_Pay_Logo.svg.png" alt="STC Pay" className="h-8 object-contain" />
                            <span className="text-xs font-bold">STC Pay</span>
                        </div>
                        <div className="flex-1 p-4 border border-gray-200 rounded-xl flex flex-col items-center gap-2 grayscale hover:grayscale-0 cursor-pointer">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Vodafone_Cash_logo.svg/2560px-Vodafone_Cash_logo.svg.png" alt="Vodafone Cash" className="h-8 object-contain" />
                            <span className="text-xs font-bold">Vodafone Cash</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="pt-6">
                <div className="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl">
                    <span className="text-gray-500 font-bold">إجمالي المبلغ:</span>
                    <span className="text-2xl font-black text-indigo-600">{getPrice()} {getCurrency()}</span>
                </div>
                
                <button 
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            جاري المعالجة...
                        </>
                    ) : (
                        <>إتمام عملية الدفع <ShieldCheck size={20} /></>
                    )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-4 text-gray-400 text-xs">
                    <Lock size={12} />
                    <span>تشفير آمن 256-bit SSL</span>
                </div>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="text-center py-12 animate-scale-up">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-slow">
                <CheckCircle2 size={64} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4">مبروك! تم الاشتراك بنجاح</h3>
            <p className="text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed">
                تم تفعيل <span className="font-bold text-indigo-600">{getItemName()}</span> في حسابك. يمكنك الآن البدء في رحلة التعلم فوراً.
            </p>
            <button 
                onClick={() => {
                    onClose();
                }}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg"
            >
                ابدأ التعلم الآن
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-scale-up">
                <button 
                    onClick={onClose}
                    className="absolute top-6 left-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="p-8 md:p-12">
                    {step === 'method' && renderMethodSelector()}
                    {step === 'details' && renderDetails()}
                    {step === 'success' && renderSuccess()}
                </div>
            </div>
        </div>
    );
};
