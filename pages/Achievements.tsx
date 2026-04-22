
import React from 'react';
import { Award, TrendingUp, Star, Shield, Zap, Clock, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { currentUser } from '../services/mockData';
import { Link } from 'react-router-dom';

export const Achievements: React.FC = () => {
    // Mock level calculation based on points
    const currentLevel = Math.floor(currentUser.points / 1000) + 1;
    const nextLevelPoints = currentLevel * 1000;
    const progressToNextLevel = ((currentUser.points % 1000) / 1000) * 100;

    // Mock badges data (enriching the strings from currentUser)
    const badgesDetails: Record<string, { icon: React.ReactNode, color: string, description: string }> = {
        'Math Whiz': { 
            icon: <Star size={24} />, 
            color: 'bg-amber-500', 
            description: 'أكملت 5 اختبارات رياضيات بنسبة 100%' 
        },
        'Weekly Top Performer': { 
            icon: <TrendingUp size={24} />, 
            color: 'bg-purple-500', 
            description: 'كنت ضمن أفضل 10 طلاب هذا الأسبوع' 
        },
        'Fast Learner': { 
            icon: <Zap size={24} />, 
            color: 'bg-blue-500', 
            description: 'أنهيت كورس كامل في أقل من أسبوع' 
        },
        'Dedicated': { 
            icon: <Clock size={24} />, 
            color: 'bg-emerald-500', 
            description: 'سجلت دخول يومياً لمدة 7 أيام' 
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <header className="flex items-center gap-4">
                <Link to="/dashboard" className="text-gray-500 hover:text-gray-700"><ArrowRight /></Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">الإنجازات</h1>
                    <p className="text-sm text-gray-500">سجل نجاحاتك وأوسمتك</p>
                </div>
            </header>

            {/* Level & Points Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-black border-4 border-white/30">
                            {currentLevel}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">المستوى {currentLevel}</h2>
                            <p className="text-indigo-200">الطريق إلى التميز</p>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-1/2">
                        <div className="flex justify-between text-sm font-bold mb-2">
                            <span>{currentUser.points} نقطة</span>
                            <span>{nextLevelPoints} نقطة</span>
                        </div>
                        <div className="w-full bg-black/20 rounded-full h-4 overflow-hidden">
                            <div 
                                className="bg-amber-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                                style={{ width: `${progressToNextLevel}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-indigo-200 mt-2 text-left">باقي {1000 - (currentUser.points % 1000)} نقطة للوصول للمستوى التالي</p>
                    </div>
                </div>
            </div>

            {/* Badges Section */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Award className="text-amber-500" />
                    الأوسمة المكتسبة
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {currentUser.badges.map((badgeName, index) => {
                        const badge = badgesDetails[badgeName] || { icon: <Shield />, color: 'bg-gray-500', description: 'وسم مميز' };
                        return (
                            <Card key={index} className="p-5 flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow border border-gray-100">
                                <div className={`w-16 h-16 rounded-2xl ${badge.color} text-white flex items-center justify-center shadow-lg rotate-3`}>
                                    {badge.icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{badgeName}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                                </div>
                            </Card>
                        );
                    })}
                    
                    {/* Locked Badge Placeholder */}
                    <Card className="p-5 flex flex-col items-center text-center gap-3 border border-dashed border-gray-300 bg-gray-50 opacity-60 grayscale">
                        <div className="w-16 h-16 rounded-2xl bg-gray-200 text-gray-400 flex items-center justify-center shadow-inner">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-500">?? قريباً</h4>
                            <p className="text-xs text-gray-400 mt-1">استمر في التعلم لفتح المزيد</p>
                        </div>
                    </Card>
                </div>
            </section>

            {/* Recent Activity (Timeline) */}
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-6">سجل النشاط</h3>
                <div className="relative border-r-2 border-gray-100 mr-3 space-y-8">
                    <div className="relative pr-8">
                        <div className="absolute -right-[9px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                        <div>
                            <h4 className="font-bold text-gray-800">إتمام اختبار "النموذج 1"</h4>
                            <p className="text-sm text-gray-500 mt-1">حصلت على +50 نقطة</p>
                            <span className="text-xs text-gray-400 block mt-2">منذ ساعتين</span>
                        </div>
                    </div>
                    <div className="relative pr-8">
                        <div className="absolute -right-[9px] top-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                        <div>
                            <h4 className="font-bold text-gray-800">تسجيل الدخول اليومي</h4>
                            <p className="text-sm text-gray-500 mt-1">حصلت على +10 نقاط</p>
                            <span className="text-xs text-gray-400 block mt-2">أمس</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
