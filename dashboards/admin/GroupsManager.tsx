import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Group, GroupType, Role } from '../../types';
import { Building2, Users, BookOpen, Plus, Search, MoreVertical, Edit2, Trash2, UserCheck, UserMinus, Shield } from 'lucide-react';

export const GroupsManager: React.FC = () => {
    const { 
        groups, 
        users, 
        createGroup, 
        updateGroup, 
        deleteGroup, 
        assignStudentToGroup, 
        removeStudentFromGroup,
        assignSupervisorToGroup,
        removeSupervisorFromGroup
    } = useStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<GroupType | 'ALL'>('ALL');
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    const filteredGroups = groups.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'ALL' || g.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const getTypeBadge = (type: GroupType) => {
        switch (type) {
            case 'SCHOOL': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">مدرسة</span>;
            case 'CLASS': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">فصل</span>;
            case 'PRIVATE_GROUP': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">مجموعة خاصة</span>;
            default: return null;
        }
    };

    const handleCreateGroup = () => {
        const currentUser = useStore.getState().user;
        const newGroup: Group = {
            id: `g_${Date.now()}`,
            name: 'مجموعة جديدة',
            type: 'CLASS',
            ownerId: currentUser?.id || 'admin',
            supervisorIds: [],
            studentIds: [],
            courseIds: [],
            createdAt: Date.now(),
            totalStudents: 0,
            totalSupervisors: 0,
            totalCourses: 0
        };
        createGroup(newGroup);
        setSelectedGroup(newGroup);
    };

    if (selectedGroup) {
        // Detailed View
        const groupStudents = users.filter(u => selectedGroup.studentIds.includes(u.id));
        const groupSupervisors = users.filter(u => selectedGroup.supervisorIds.includes(u.id));
        
        const availableStudents = users.filter(u => u.role === Role.STUDENT && !selectedGroup.studentIds.includes(u.id));
        const availableSupervisors = users.filter(u => (u.role === Role.SUPERVISOR || u.role === Role.TEACHER) && !selectedGroup.supervisorIds.includes(u.id));

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedGroup(null)} className="text-gray-500 hover:text-gray-900">
                        &rarr; عودة للقائمة
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">تفاصيل المجموعة</h1>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-xl font-bold text-gray-900">{selectedGroup.name}</h2>
                                {getTypeBadge(selectedGroup.type)}
                            </div>
                            <p className="text-sm text-gray-500">تم الإنشاء: {new Date(selectedGroup.createdAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 text-gray-500 hover:text-amber-600 bg-gray-50 hover:bg-amber-50 rounded-lg transition-colors">
                                <Edit2 size={18} />
                            </button>
                            <button 
                                onClick={() => {
                                    if(window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
                                        deleteGroup(selectedGroup.id);
                                        setSelectedGroup(null);
                                    }
                                }}
                                className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4">
                            <Users className="text-blue-500" size={24} />
                            <div>
                                <p className="text-sm text-gray-500">الطلاب</p>
                                <p className="text-xl font-bold text-gray-900">{selectedGroup.studentIds.length}</p>
                            </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg flex items-center gap-4">
                            <Shield className="text-purple-500" size={24} />
                            <div>
                                <p className="text-sm text-gray-500">المشرفين</p>
                                <p className="text-xl font-bold text-gray-900">{selectedGroup.supervisorIds.length}</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg flex items-center gap-4">
                            <BookOpen className="text-amber-500" size={24} />
                            <div>
                                <p className="text-sm text-gray-500">الدورات</p>
                                <p className="text-xl font-bold text-gray-900">{selectedGroup.courseIds.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Students Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-900">الطلاب المسجلين</h3>
                                <select 
                                    className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            assignStudentToGroup(e.target.value, selectedGroup.id);
                                            // Refresh local state view
                                            setSelectedGroup(useStore.getState().groups.find(g => g.id === selectedGroup.id) || null);
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="">+ إضافة طالب</option>
                                    {availableStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {groupStudents.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">لا يوجد طلاب</p>
                                ) : (
                                    groupStudents.map(student => (
                                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <img src={student.avatar} alt="" className="w-8 h-8 rounded-full" />
                                                <span className="text-sm font-medium">{student.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    removeStudentFromGroup(student.id, selectedGroup.id);
                                                    setSelectedGroup(useStore.getState().groups.find(g => g.id === selectedGroup.id) || null);
                                                }}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <UserMinus size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Supervisors Section */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-900">المشرفين والمعلمين</h3>
                                <select 
                                    className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            assignSupervisorToGroup(e.target.value, selectedGroup.id);
                                            setSelectedGroup(useStore.getState().groups.find(g => g.id === selectedGroup.id) || null);
                                        }
                                    }}
                                    value=""
                                >
                                    <option value="">+ إضافة مشرف</option>
                                    {availableSupervisors.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {groupSupervisors.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">لا يوجد مشرفين</p>
                                ) : (
                                    groupSupervisors.map(supervisor => (
                                        <div key={supervisor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <img src={supervisor.avatar} alt="" className="w-8 h-8 rounded-full" />
                                                <span className="text-sm font-medium">{supervisor.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    removeSupervisorFromGroup(supervisor.id, selectedGroup.id);
                                                    setSelectedGroup(useStore.getState().groups.find(g => g.id === selectedGroup.id) || null);
                                                }}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <UserMinus size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المجموعات والمدارس</h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة المدارس، الفصول، والمجموعات الخاصة</p>
                </div>
                <button 
                    onClick={handleCreateGroup}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span>إنشاء مجموعة</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="ابحث باسم المجموعة أو المدرسة..." 
                        className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-gray-400" />
                    <select 
                        className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as GroupType | 'ALL')}
                    >
                        <option value="ALL">جميع الأنواع</option>
                        <option value="SCHOOL">مدارس</option>
                        <option value="CLASS">فصول</option>
                        <option value="PRIVATE_GROUP">مجموعات خاصة</option>
                    </select>
                </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map(group => (
                    <div 
                        key={group.id} 
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => setSelectedGroup(group)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg group-hover:text-amber-600 transition-colors">{group.name}</h3>
                                <div className="mt-2">{getTypeBadge(group.type)}</div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-900">
                                <MoreVertical size={18} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-gray-50">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">الطلاب</p>
                                <p className="font-bold text-gray-900">{group.studentIds.length}</p>
                            </div>
                            <div className="text-center border-r border-l border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">المشرفين</p>
                                <p className="font-bold text-gray-900">{group.supervisorIds.length}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 mb-1">الدورات</p>
                                <p className="font-bold text-gray-900">{group.courseIds.length}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredGroups.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
                        لا توجد مجموعات تطابق بحثك.
                    </div>
                )}
            </div>
        </div>
    );
};
