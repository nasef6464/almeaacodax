import React, { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { UsersManager } from './UsersManager';
import { SchoolsManager } from './SchoolsManager';
import { PathsManager } from './PathsManager';
import { QuizBuilder } from './QuizBuilder';
import { QuestionBankManager } from './QuestionBankManager';
import { LessonsManager } from './LessonsManager';
import { QuizzesManager } from './QuizzesManager';
import { SkillsTreeManager } from './SkillsTreeManager';
import { FinancialManager } from './FinancialManager';
import { 
    LayoutDashboard, Users, BookOpen, FileQuestion, 
    Target, Award, Building2, CreditCard, Bell, 
    Activity, Settings, User, FolderOpen
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('paths'); // Changed default to paths

    const menuItems = [
        { id: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard size={20} /> },
        { id: 'paths', label: 'إدارة المسارات (مساحات العمل)', icon: <FolderOpen size={20} /> },
        { id: 'lessons', label: 'مركز الدروس', icon: <BookOpen size={20} /> },
        { id: 'quizzes', label: 'مركز الاختبارات', icon: <FileQuestion size={20} /> },
        { id: 'questions', label: 'مركز الأسئلة', icon: <Target size={20} /> },
        { id: 'skills', label: 'مركز المهارات', icon: <Award size={20} /> },
        { id: 'users', label: 'إدارة المستخدمين', icon: <Users size={20} /> },
        { id: 'groups', label: 'المجموعات والمدارس', icon: <Building2 size={20} /> },
        { id: 'financial', label: 'المالية والاشتراكات', icon: <CreditCard size={20} /> },
        { id: 'notifications', label: 'الإشعارات', icon: <Bell size={20} /> },
        { id: 'monitoring', label: 'مراقبة النظام', icon: <Activity size={20} /> },
        { id: 'settings', label: 'الإعدادات', icon: <Settings size={20} /> },
    ];

    const renderSidebar = () => (
        <div className="py-6 space-y-1">
            <div className="mb-8 px-6">
                <h2 className="text-xl font-bold text-gray-900">لوحة الإدارة</h2>
                <p className="text-sm text-gray-500 mt-1">التحكم الكامل بالمنصة</p>
            </div>
            {menuItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-6 py-3 transition-colors ${
                        activeTab === item.id 
                        ? 'bg-amber-50 text-amber-600 font-bold border-r-4 border-amber-500' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent'
                    }`}
                >
                    <div className={`${activeTab === item.id ? 'text-amber-500' : 'text-gray-400'}`}>
                        {item.icon}
                    </div>
                    <span className="text-sm">{item.label}</span>
                </button>
            ))}
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-gray-900">نظرة عامة (Overview)</h1>
                            <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                                آخر تحديث: اليوم، 10:30 صباحاً
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* KPI Cards */}
                            {[
                                { title: 'إجمالي الطلاب', value: '1,245', trend: '+12%', color: 'text-blue-600', bg: 'bg-blue-50' },
                                { title: 'الدورات النشطة', value: '34', trend: '+2', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { title: 'الاختبارات المنجزة', value: '8,920', trend: '+150', color: 'text-purple-600', bg: 'bg-purple-50' },
                                { title: 'الإيرادات (الشهر)', value: 'SAR 45,200', trend: '+5%', color: 'text-amber-600', bg: 'bg-amber-50' }
                            ].map((kpi, i) => (
                                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-gray-500 text-sm font-medium">{kpi.title}</h3>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${kpi.bg} ${kpi.color}`}>
                                            {kpi.trend}
                                        </span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 mt-4">{kpi.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 flex flex-col items-center justify-center">
                                <Activity size={48} className="text-gray-200 mb-4" />
                                <p className="text-gray-400 font-medium">مساحة للرسوم البيانية (Analytics Chart)</p>
                                <p className="text-gray-400 text-sm mt-2">سيتم دمج مكتبة Recharts هنا</p>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">أحدث النشاطات</h3>
                                <div className="flex-1 overflow-y-auto space-y-4">
                                    {[1, 2, 3, 4, 5].map((_, i) => (
                                        <div key={i} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                <User size={14} className="text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-800">طالب جديد انضم للمنصة</p>
                                                <p className="text-xs text-gray-400 mt-1">منذ {i + 1} ساعة</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'paths':
                return <PathsManager />;
            case 'lessons':
                return <LessonsManager />;
            case 'quizzes':
                return <QuizzesManager />;
            case 'questions':
                return <QuestionBankManager />;
            case 'skills':
                return <SkillsTreeManager />;
            case 'users':
                return <UsersManager />;
            case 'groups':
                return <SchoolsManager />;
            case 'financial':
                return <FinancialManager />;
            default:
                return (
                    <div className="flex items-center justify-center h-[calc(100vh-8rem)] animate-fade-in">
                        <div className="text-center max-w-sm">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 mb-6">
                                <div className="text-amber-500 scale-150">
                                    {menuItems.find(m => m.id === activeTab)?.icon}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                {menuItems.find(m => m.id === activeTab)?.label}
                            </h2>
                            <p className="text-gray-500 leading-relaxed">
                                هذا القسم قيد التطوير. سيتم إضافة واجهات التحكم والإدارة الخاصة بهذا القسم قريباً.
                            </p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <DashboardLayout sidebar={renderSidebar()}>
            {renderContent()}
        </DashboardLayout>
    );
};
