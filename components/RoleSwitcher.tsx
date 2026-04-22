import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Role } from '../types';
import { Shield, User, Users, BookOpen, UserCheck, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RoleSwitcher: React.FC = () => {
    const { user, changeRole } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const roles = [
        { id: Role.ADMIN, label: 'مدير النظام', icon: <Shield size={16} />, path: '/admin-dashboard' },
        { id: Role.SUPERVISOR, label: 'مشرف', icon: <UserCheck size={16} />, path: '/supervisor-dashboard' },
        { id: Role.TEACHER, label: 'معلم', icon: <BookOpen size={16} />, path: '/instructor-dashboard' },
        { id: Role.PARENT, label: 'ولي أمر', icon: <Users size={16} />, path: '/parent-dashboard' },
        { id: Role.STUDENT, label: 'طالب', icon: <User size={16} />, path: '/dashboard' },
    ];

    const handleRoleChange = (roleId: Role, path: string) => {
        changeRole(roleId);
        setIsOpen(false);
        navigate(path);
    };

    return (
        <div className="fixed bottom-8 left-8 z-[100]" dir="rtl">
            {isOpen && (
                <div className="absolute bottom-16 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 w-56 overflow-hidden mb-2 transform transition-all">
                    <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800">محاكي الأدوار (Simulation)</span>
                    </div>
                    <div className="py-2">
                        {roles.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => handleRoleChange(r.id, r.path)}
                                className={`w-full text-right px-4 py-3 flex items-center gap-3 transition-colors ${
                                    user.role === r.id 
                                    ? 'bg-amber-50 text-amber-600 font-bold border-r-4 border-amber-500' 
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-r-4 border-transparent'
                                }`}
                            >
                                <div className={`${user.role === r.id ? 'text-amber-500' : 'text-gray-400'}`}>
                                    {r.icon}
                                </div>
                                <span className="text-sm">{r.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`px-5 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all ${
                    isOpen ? 'bg-amber-500 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
            >
                <Shield size={20} />
                <span className="font-medium text-sm">تغيير الدور</span>
                <ChevronUp size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
        </div>
    );
};
