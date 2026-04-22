import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Role, User } from '../../types';
import { Search, Filter, MoreVertical, Edit2, Shield, UserCheck, UserX, Plus } from 'lucide-react';

export const UsersManager: React.FC = () => {
    const { users, groups, updateUser, toggleUserStatus, assignStudentToGroup } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
    const [editingUser, setEditingUser] = useState<string | null>(null);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleRoleChange = (userId: string, newRole: Role) => {
        updateUser(userId, { role: newRole });
        setEditingUser(null);
    };

    const getRoleBadge = (role: Role) => {
        switch (role) {
            case Role.ADMIN: return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">مدير</span>;
            case Role.SUPERVISOR: return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">مشرف</span>;
            case Role.TEACHER: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">معلم</span>;
            case Role.PARENT: return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">ولي أمر</span>;
            case Role.STUDENT: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">طالب</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة الصلاحيات، المجموعات، وحالة الحسابات</p>
                </div>
                <button className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                    <Plus size={18} />
                    <span>إضافة مستخدم</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم أو البريد الإلكتروني..." 
                        className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400" />
                    <select 
                        className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
                    >
                        <option value="all">جميع الأدوار</option>
                        <option value={Role.ADMIN}>مدير</option>
                        <option value={Role.SUPERVISOR}>مشرف</option>
                        <option value={Role.TEACHER}>معلم</option>
                        <option value={Role.PARENT}>ولي أمر</option>
                        <option value={Role.STUDENT}>طالب</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-gray-700">المستخدم</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-700">الدور</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-700">المجموعة</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-700">الحالة</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-700">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                            <div>
                                                <p className="font-bold text-gray-900">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.email || 'لا يوجد بريد'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser === user.id ? (
                                            <select 
                                                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                                            >
                                                <option value={Role.ADMIN}>مدير</option>
                                                <option value={Role.SUPERVISOR}>مشرف</option>
                                                <option value={Role.TEACHER}>معلم</option>
                                                <option value={Role.PARENT}>ولي أمر</option>
                                                <option value={Role.STUDENT}>طالب</option>
                                            </select>
                                        ) : (
                                            getRoleBadge(user.role)
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUser === user.id && user.role === Role.STUDENT ? (
                                            <select 
                                                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        assignStudentToGroup(user.id, e.target.value);
                                                    }
                                                }}
                                            >
                                                <option value="">+ إضافة لمجموعة</option>
                                                {groups.filter(g => !user.groupIds?.includes(g.id)).map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {user.schoolId && (
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                                        {groups.find(g => g.id === user.schoolId)?.name || 'مدرسة غير معروفة'}
                                                    </span>
                                                )}
                                                {user.groupIds?.map(gid => {
                                                    const g = groups.find(group => group.id === gid);
                                                    if (!g || g.type === 'SCHOOL') return null;
                                                    return (
                                                        <span key={gid} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                            {g.name}
                                                        </span>
                                                    );
                                                })}
                                                {!user.schoolId && (!user.groupIds || user.groupIds.length === 0) && (
                                                    <span className="text-sm text-gray-400">-</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button 
                                            onClick={() => toggleUserStatus(user.id)}
                                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                                user.isActive 
                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                            }`}
                                        >
                                            {user.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                                            {user.isActive ? 'نشط' : 'موقوف'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="تعديل"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            لا يوجد مستخدمين يطابقون بحثك.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
