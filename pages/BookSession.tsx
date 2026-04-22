import React, { useState } from 'react';
import { Calendar, Clock, BookOpen, Send, CheckCircle, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useStore } from '../store/useStore';

export const BookSession: React.FC = () => {
    const navigate = useNavigate();
    const { addActivity } = useStore();
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Add to recent activity
        addActivity({
            type: 'skill_practice', // Reusing this type for now, could add 'session_booked'
            title: `تم حجز حصة خاصة: ${subject}`,
            link: '/dashboard'
        });

        setIsSubmitted(true);
        
        setTimeout(() => {
            navigate('/dashboard');
        }, 3000);
    };

    if (isSubmitted) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6 animate-scale-up">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle size={40} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">تم تأكيد الحجز بنجاح!</h2>
                        <p className="text-gray-500">تم إرسال طلبك للمدرس. سيتم التواصل معك قريباً لتأكيد الموعد.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl text-right text-sm text-gray-600 space-y-2">
                        <p><span className="font-bold">المادة:</span> {subject}</p>
                        <p><span className="font-bold">التاريخ:</span> {date}</p>
                        <p><span className="font-bold">الوقت:</span> {time}</p>
                    </div>
                    <p className="text-xs text-gray-400">سيتم تحويلك للرئيسية تلقائياً...</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in pb-20">
            <header className="flex items-center gap-4">
                <Link to="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                    <ArrowRight size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">حجز حصة خاصة</h1>
                    <p className="text-gray-500 text-sm">احجز جلسة فردية مع أفضل المدرسين لشرح النقاط الصعبة</p>
                </div>
            </header>

            <Card className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Subject Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">المادة / المهارة</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                <BookOpen size={18} />
                            </div>
                            <select 
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                            >
                                <option value="" disabled>اختر المادة...</option>
                                <option value="القدرات - كمي (الجبر)">القدرات - كمي (الجبر)</option>
                                <option value="القدرات - كمي (الهندسة)">القدرات - كمي (الهندسة)</option>
                                <option value="القدرات - لفظي (استيعاب المقروء)">القدرات - لفظي (استيعاب المقروء)</option>
                                <option value="التحصيلي - رياضيات">التحصيلي - رياضيات</option>
                                <option value="التحصيلي - فيزياء">التحصيلي - فيزياء</option>
                                <option value="أخرى">أخرى (يرجى التوضيح في الملاحظات)</option>
                            </select>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">التاريخ المفضل</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                    <Calendar size={18} />
                                </div>
                                <input 
                                    type="date" 
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700">الوقت المفضل</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                    <Clock size={18} />
                                </div>
                                <select 
                                    required
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                >
                                    <option value="" disabled>اختر الوقت...</option>
                                    <option value="04:00 PM - 05:00 PM">04:00 م - 05:00 م</option>
                                    <option value="05:00 PM - 06:00 PM">05:00 م - 06:00 م</option>
                                    <option value="08:00 PM - 09:00 PM">08:00 م - 09:00 م</option>
                                    <option value="09:00 PM - 10:00 PM">09:00 م - 10:00 م</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">ملاحظات للمدرس (اختياري)</label>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="اكتب هنا أي تفاصيل أو أسئلة معينة تريد التركيز عليها خلال الحصة..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-y"
                        ></textarea>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                        <Send size={20} />
                        تأكيد الحجز
                    </button>
                </form>
            </Card>
        </div>
    );
};
