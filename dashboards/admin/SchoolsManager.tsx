import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Group, B2BPackage, AccessCode } from '../../types';
import { Building2, Users, BookOpen, Plus, Search, MoreVertical, Edit2, Trash2, Key, Upload, FileSpreadsheet, Download, Activity, CheckCircle } from 'lucide-react';

export const SchoolsManager: React.FC = () => {
    const { groups, b2bPackages, accessCodes, createGroup, updateGroup, deleteGroup, createB2BPackage, createAccessCode } = useStore();
    
    const [selectedSchool, setSelectedSchool] = useState<Group | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'import' | 'reports'>('overview');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const schools = groups.filter(g => g.type === 'SCHOOL');

    const handleCreateSchool = () => {
        const newSchool: Group = {
            id: `s_${Date.now()}`,
            name: 'مدرسة جديدة',
            type: 'SCHOOL',
            ownerId: 'u5',
            supervisorIds: [],
            studentIds: [],
            courseIds: [],
            createdAt: Date.now(),
            totalStudents: 0,
            totalSupervisors: 0,
            totalCourses: 0
        };
        createGroup(newSchool);
        setSelectedSchool(newSchool);
    };

    if (selectedSchool) {
        const schoolPackages = b2bPackages.filter(p => p.schoolId === selectedSchool.id);
        const schoolCodes = accessCodes.filter(c => c.schoolId === selectedSchool.id);
        const schoolClasses = groups.filter(g => g.type === 'CLASS' && g.parentId === selectedSchool.id);

        return (
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSchool(null)} className="text-gray-500 hover:text-gray-900">
                        &rarr; عودة لقائمة المدارس
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{selectedSchool.name}</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                    {[
                        { id: 'overview', label: 'نظرة عامة والفصول' },
                        { id: 'packages', label: 'الباقات والأكواد' },
                        { id: 'import', label: 'استيراد الطلاب (Excel)' },
                        { id: 'reports', label: 'تقارير الأداء' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                                activeTab === tab.id 
                                ? 'border-amber-500 text-amber-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Users className="text-blue-500" size={24} />
                                        <h3 className="font-bold text-gray-900">إجمالي الطلاب</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-blue-600">{selectedSchool.studentIds.length}</p>
                                </div>
                                <div className="bg-purple-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Building2 className="text-purple-500" size={24} />
                                        <h3 className="font-bold text-gray-900">الفصول الدراسية</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-purple-600">{schoolClasses.length}</p>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <BookOpen className="text-emerald-500" size={24} />
                                        <h3 className="font-bold text-gray-900">الباقات النشطة</h3>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-600">{schoolPackages.filter(p => p.status === 'active').length}</p>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">الفصول الدراسية</h3>
                                    <button 
                                        onClick={() => {
                                            createGroup({
                                                id: `c_${Date.now()}`,
                                                name: `فصل جديد - ${selectedSchool.name}`,
                                                type: 'CLASS',
                                                parentId: selectedSchool.id,
                                                ownerId: 'u5',
                                                supervisorIds: [],
                                                studentIds: [],
                                                courseIds: [],
                                                createdAt: Date.now(),
                                                totalStudents: 0,
                                                totalSupervisors: 0,
                                                totalCourses: 0
                                            });
                                        }}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> إضافة فصل
                                    </button>
                                </div>
                                {schoolClasses.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500">لا توجد فصول دراسية مضافة حتى الآن</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {schoolClasses.map(cls => (
                                            <div key={cls.id} className="border border-gray-100 p-4 rounded-xl flex justify-between items-center hover:shadow-sm transition-shadow">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{cls.name}</h4>
                                                    <p className="text-sm text-gray-500">{cls.studentIds.length} طالب • {cls.supervisorIds.length} مشرف</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            const newName = prompt('أدخل اسم الفصل الجديد:', cls.name);
                                                            if (newName) {
                                                                updateGroup(cls.id, { name: newName });
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-amber-600 transition-colors"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if(window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) {
                                                                deleteGroup(cls.id);
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'packages' && (
                        <div className="space-y-8">
                            {/* Packages */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">الباقات المخصصة</h3>
                                    <button 
                                        onClick={() => {
                                            createB2BPackage({
                                                id: `pkg_${Date.now()}`,
                                                schoolId: selectedSchool.id,
                                                name: 'باقة جديدة',
                                                courseIds: [],
                                                type: 'free_access',
                                                maxStudents: 100,
                                                status: 'active',
                                                createdAt: Date.now()
                                            });
                                        }}
                                        className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} /> تخصيص باقة
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {schoolPackages.map(pkg => (
                                        <div key={pkg.id} className="border border-gray-200 p-5 rounded-xl">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{pkg.name}</h4>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full mt-1 inline-block ${pkg.type === 'free_access' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {pkg.type === 'free_access' ? 'وصول مجاني للطلاب' : 'خصم خاص'}
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {pkg.status === 'active' ? 'نشط' : 'منتهي'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p>عدد الدورات المشمولة: {pkg.courseIds.length}</p>
                                                <p>الحد الأقصى للطلاب: {pkg.maxStudents}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Access Codes */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">أكواد التفعيل (Promo Codes)</h3>
                                    <button 
                                        onClick={() => {
                                            if(schoolPackages.length === 0) return alert('يجب إنشاء باقة أولاً');
                                            createAccessCode({
                                                id: `code_${Date.now()}`,
                                                code: `${selectedSchool.name.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                                schoolId: selectedSchool.id,
                                                packageId: schoolPackages[0].id,
                                                maxUses: 50,
                                                currentUses: 0,
                                                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                                                createdAt: Date.now()
                                            });
                                        }}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                                    >
                                        <Key size={16} /> توليد كود جديد
                                    </button>
                                </div>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-right">
                                        <thead className="bg-gray-100 text-gray-600 text-sm">
                                            <tr>
                                                <th className="p-4 font-medium">الكود</th>
                                                <th className="p-4 font-medium">الباقة المرتبطة</th>
                                                <th className="p-4 font-medium">الاستخدام</th>
                                                <th className="p-4 font-medium">تاريخ الانتهاء</th>
                                                <th className="p-4 font-medium">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {schoolCodes.map(code => (
                                                <tr key={code.id} className="bg-white">
                                                    <td className="p-4 font-mono font-bold text-amber-600">{code.code}</td>
                                                    <td className="p-4 text-sm text-gray-800">{schoolPackages.find(p => p.id === code.packageId)?.name}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(code.currentUses / code.maxUses) * 100}%` }}></div>
                                                            </div>
                                                            <span className="text-xs text-gray-500">{code.currentUses}/{code.maxUses}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500">{new Date(code.expiresAt).toLocaleDateString('ar-SA')}</td>
                                                    <td className="p-4">
                                                        <button className="text-gray-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'import' && (
                        <div className="max-w-3xl mx-auto py-8">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">استيراد الطلاب دفعة واحدة</h2>
                                <p className="text-gray-500">قم بتحميل النموذج، تعبئته ببيانات الطلاب، ثم رفعه لإنشاء الحسابات تلقائياً.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="border border-gray-200 rounded-xl p-6 text-center hover:border-amber-500 transition-colors group cursor-pointer">
                                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Download size={32} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">1. تحميل النموذج</h3>
                                    <p className="text-sm text-gray-500 mb-4">ملف Excel جاهز يحتوي على الأعمدة المطلوبة (الاسم، البريد، الفصل).</p>
                                    <button className="text-amber-600 font-bold text-sm">تحميل Template.xlsx</button>
                                </div>

                                <div 
                                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer relative overflow-hidden ${
                                        uploadSuccess ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                                    }`}
                                >
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls, .csv" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                            if(e.target.files && e.target.files.length > 0) {
                                                setIsUploading(true);
                                                setUploadSuccess(false);
                                                setTimeout(() => {
                                                    setIsUploading(false);
                                                    setUploadSuccess(true);
                                                }, 2000);
                                            }
                                        }}
                                    />
                                    {isUploading ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                            <p className="font-bold text-blue-600">جاري معالجة الملف...</p>
                                        </div>
                                    ) : uploadSuccess ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle size={32} />
                                            </div>
                                            <h3 className="font-bold text-emerald-900 mb-2">تم الاستيراد بنجاح!</h3>
                                            <p className="text-sm text-emerald-600 mb-4">تم إنشاء 150 حساب طالب جديد.</p>
                                            <button className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto hover:bg-emerald-700">
                                                <Download size={16} /> تحميل بيانات الدخول
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Upload size={32} />
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-2">2. رفع الملف</h3>
                                            <p className="text-sm text-gray-500 mb-4">اسحب وأفلت ملف Excel هنا أو انقر للاختيار.</p>
                                            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold pointer-events-none">اختيار ملف</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {!uploadSuccess && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                    <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="font-bold text-emerald-800">ماذا يحدث بعد الرفع؟</h4>
                                        <p className="text-sm text-emerald-600 mt-1">
                                            سيقوم النظام بإنشاء حسابات للطلاب، تعيين كلمات مرور عشوائية، وربطهم بالمدرسة والفصول المحددة. ستحصل بعدها على ملف Excel يحتوي على بيانات الدخول لتوزيعها على الطلاب.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="py-12 text-center">
                            <Activity size={64} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">تقارير أداء المدرسة</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                سيتم عرض إحصائيات تفصيلية حول أداء طلاب هذه المدرسة، متوسط الدرجات، ونقاط الضعف الشائعة لديهم لمساعدة المعلمين في التركيز عليها.
                            </p>
                            <button className="mt-6 bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors">
                                توليد تقرير شامل (PDF)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المدارس والجهات (B2B)</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة التعاقدات، الباقات، وأكواد التفعيل للمدارس</p>
                </div>
                <button 
                    onClick={handleCreateSchool}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} /> إضافة مدرسة جديدة
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schools.map(school => (
                    <div key={school.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                <Building2 size={24} />
                            </div>
                            <button className="text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical size={20} />
                            </button>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{school.name}</h3>
                        <p className="text-sm text-gray-500 mb-6 line-clamp-2">{school.metadata?.description || 'لا يوجد وصف'}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">الطلاب</p>
                                <p className="font-bold text-gray-900">{school.studentIds.length || school.totalStudents}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">الباقات</p>
                                <p className="font-bold text-gray-900">{b2bPackages.filter(p => p.schoolId === school.id).length}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedSchool(school)}
                            className="w-full bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-amber-700 py-2.5 rounded-xl font-bold text-sm transition-colors border border-gray-200 hover:border-amber-200"
                        >
                            إدارة المدرسة
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
