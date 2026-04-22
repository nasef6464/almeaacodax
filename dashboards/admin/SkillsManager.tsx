import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Skill, CategoryPath, CategorySubject, CategorySection } from '../../types';
import { Target, Search, Filter, Plus, BookOpen, HelpCircle, Edit2, Trash2, Link as LinkIcon, Unlink, FolderTree, BarChart3, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export const SkillsManager: React.FC = () => {
    const { 
        skills, paths, subjects, sections, questionAttempts, questions,
        createSkill, updateSkill, deleteSkill, 
        linkSkillToLesson, unlinkSkillFromLesson,
        addPath, addSubject, addSection 
    } = useStore();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [pathFilter, setPathFilter] = useState<string>('all');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [activeTab, setActiveTab] = useState<'skills' | 'taxonomy' | 'reports'>('skills');

    // Taxonomy form states
    const [newPathName, setNewPathName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [selectedPathForSubject, setSelectedPathForSubject] = useState('');
    const [newSectionName, setNewSectionName] = useState('');
    const [selectedSubjectForSection, setSelectedSubjectForSection] = useState('');

    // Mock lessons for linking (in a real app, this would come from useStore.lessons)
    const mockLessons = [
        { id: 'l1', title: 'أساسيات الكسور' },
        { id: 'l2', title: 'تطبيقات على الكسور' },
        { id: 'l3', title: 'مقدمة في استيعاب المقروء' }
    ];

    const filteredSkills = skills.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesPath = pathFilter === 'all' || s.pathId === pathFilter;
        const matchesSubject = subjectFilter === 'all' || s.subjectId === subjectFilter;
        return matchesSearch && matchesPath && matchesSubject;
    });

    const getPathName = (pathId: string) => paths?.find(p => p.id === pathId)?.name || 'غير محدد';
    const getSubjectName = (subjectId: string) => subjects?.find(s => s.id === subjectId)?.name || 'غير محدد';
    const getSectionName = (sectionId: string) => sections?.find(s => s.id === sectionId)?.name || 'غير محدد';

    const handleCreateSkill = () => {
        if (!paths?.length || !subjects?.length || !sections?.length) {
            alert('يجب إضافة مسار ومادة وقسم واحد على الأقل قبل إنشاء مهارة.');
            return;
        }
        const newSkill: Skill = {
            id: `sk_${Date.now()}`,
            name: 'مهارة جديدة',
            pathId: paths[0].id,
            subjectId: subjects.find(s => s.pathId === paths[0].id)?.id || subjects[0].id,
            sectionId: sections[0].id, // Ideally should filter by subject
            description: 'وصف المهارة هنا...',
            lessonIds: [],
            questionIds: [],
            createdAt: Date.now()
        };
        createSkill(newSkill);
        setSelectedSkill(newSkill);
    };

    const handleAddPath = () => {
        if (!newPathName.trim()) return;
        addPath({ id: `p_${Date.now()}`, name: newPathName });
        setNewPathName('');
    };

    const handleAddSubject = () => {
        if (!newSubjectName.trim() || !selectedPathForSubject) return;
        addSubject({ id: `sub_${Date.now()}`, pathId: selectedPathForSubject, name: newSubjectName });
        setNewSubjectName('');
    };

    const handleAddSection = () => {
        if (!newSectionName.trim() || !selectedSubjectForSection) return;
        addSection({ id: `sec_${Date.now()}`, subjectId: selectedSubjectForSection, name: newSectionName });
        setNewSectionName('');
    };

    // Calculate skill reports
    const skillReports = useMemo(() => {
        return skills.map(skill => {
            // Find all questions linked to this skill
            const skillQuestions = questions.filter(q => q.skillIds?.includes(skill.id));
            const questionIds = skillQuestions.map(q => q.id);
            
            // Find all attempts for these questions
            const attempts = questionAttempts.filter(a => questionIds.includes(a.questionId));
            
            const totalAttempts = attempts.length;
            const correctAttempts = attempts.filter(a => a.isCorrect).length;
            const successRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
            
            let status: 'weak' | 'average' | 'strong' | 'no_data' = 'no_data';
            if (totalAttempts > 0) {
                if (successRate < 50) status = 'weak';
                else if (successRate >= 80) status = 'strong';
                else status = 'average';
            }

            return {
                ...skill,
                totalAttempts,
                correctAttempts,
                successRate,
                status,
                questionCount: questionIds.length
            };
        }).sort((a, b) => a.successRate - b.successRate); // Sort by weakest first
    }, [skills, questionAttempts]);

    if (selectedSkill) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSkill(null)} className="text-gray-500 hover:text-gray-900">
                        &rarr; عودة للقائمة
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">تفاصيل المهارة</h1>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 space-y-4">
                            <input 
                                type="text" 
                                value={selectedSkill.name || ''}
                                onChange={(e) => {
                                    updateSkill(selectedSkill.id, { name: e.target.value });
                                    setSelectedSkill({ ...selectedSkill, name: e.target.value });
                                }}
                                className="text-2xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-amber-500 focus:outline-none px-1 py-1 w-full max-w-md"
                            />
                            
                            <div className="flex flex-wrap gap-3">
                                <select
                                    value={selectedSkill.pathId || ''}
                                    onChange={(e) => {
                                        updateSkill(selectedSkill.id, { pathId: e.target.value });
                                        setSelectedSkill({ ...selectedSkill, pathId: e.target.value });
                                    }}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-gray-50"
                                >
                                    {paths?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <select
                                    value={selectedSkill.subjectId || ''}
                                    onChange={(e) => {
                                        updateSkill(selectedSkill.id, { subjectId: e.target.value });
                                        setSelectedSkill({ ...selectedSkill, subjectId: e.target.value });
                                    }}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-gray-50"
                                >
                                    {subjects?.filter(s => s.pathId === selectedSkill.pathId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select
                                    value={selectedSkill.sectionId || ''}
                                    onChange={(e) => {
                                        updateSkill(selectedSkill.id, { sectionId: e.target.value });
                                        setSelectedSkill({ ...selectedSkill, sectionId: e.target.value });
                                    }}
                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-gray-50"
                                >
                                    {sections?.filter(s => s.subjectId === selectedSkill.subjectId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <textarea 
                                value={selectedSkill.description || ''}
                                onChange={(e) => {
                                    updateSkill(selectedSkill.id, { description: e.target.value });
                                    setSelectedSkill({ ...selectedSkill, description: e.target.value });
                                }}
                                placeholder="وصف المهارة..."
                                className="w-full text-sm text-gray-600 bg-transparent border border-gray-200 focus:border-amber-500 focus:outline-none rounded-lg p-3 resize-none h-24"
                            />
                        </div>
                        <div className="flex gap-2 mr-4">
                            <button 
                                onClick={() => {
                                    if(window.confirm('هل أنت متأكد من حذف هذه المهارة؟')) {
                                        deleteSkill(selectedSkill.id);
                                        setSelectedSkill(null);
                                    }
                                }}
                                className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4">
                            <BookOpen className="text-blue-500" size={24} />
                            <div>
                                <p className="text-sm text-gray-500">الدروس المرتبطة</p>
                                <p className="text-xl font-bold text-gray-900">{selectedSkill.lessonIds?.length || 0}</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg flex items-center gap-4">
                            <HelpCircle className="text-emerald-500" size={24} />
                            <div>
                                <p className="text-sm text-gray-500">الأسئلة المرتبطة</p>
                                <p className="text-xl font-bold text-gray-900">{selectedSkill.questionIds?.length || 0}</p>
                            </div>
                        </div>
                    </div>

                    {/* Linking Section */}
                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <LinkIcon size={18} className="text-gray-400" />
                            ربط المهارة بالدروس
                        </h3>
                        <div className="space-y-3">
                            {mockLessons.map(lesson => {
                                const isLinked = selectedSkill.lessonIds?.includes(lesson.id);
                                return (
                                    <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-sm font-medium text-gray-800">{lesson.title}</span>
                                        <button
                                            onClick={() => {
                                                if (isLinked) {
                                                    unlinkSkillFromLesson(selectedSkill.id, lesson.id);
                                                    setSelectedSkill({ ...selectedSkill, lessonIds: (selectedSkill.lessonIds || []).filter(id => id !== lesson.id) });
                                                } else {
                                                    linkSkillToLesson(selectedSkill.id, lesson.id);
                                                    setSelectedSkill({ ...selectedSkill, lessonIds: [...(selectedSkill.lessonIds || []), lesson.id] });
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                                isLinked 
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100' 
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                        >
                                            {isLinked ? <Unlink size={14} /> : <LinkIcon size={14} />}
                                            {isLinked ? 'إلغاء الربط' : 'ربط'}
                                        </button>
                                    </div>
                                );
                            })}
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
                    <h1 className="text-2xl font-bold text-gray-900">إدارة المهارات والتصنيفات</h1>
                    <p className="text-gray-500 text-sm mt-1">بناء شجرة المعرفة وربطها بالمحتوى التعليمي</p>
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('skills')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'skills' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        المهارات
                    </button>
                    <button 
                        onClick={() => setActiveTab('taxonomy')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'taxonomy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        التصنيفات (المسارات والمواد)
                    </button>
                    <button 
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'reports' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        تقارير المهارات
                    </button>
                </div>
            </div>

            {activeTab === 'skills' ? (
                <>
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="ابحث باسم المهارة..." 
                                className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" />
                            <select 
                                className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                value={pathFilter}
                                onChange={(e) => {
                                    setPathFilter(e.target.value);
                                    setSubjectFilter('all'); // Reset subject when path changes
                                }}
                            >
                                <option value="all">جميع المسارات</option>
                                {paths?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select 
                                className="border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                disabled={pathFilter === 'all'}
                            >
                                <option value="all">جميع المواد</option>
                                {subjects?.filter(s => pathFilter === 'all' || s.pathId === pathFilter).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={handleCreateSkill}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                        >
                            <Plus size={18} />
                            <span>إضافة مهارة</span>
                        </button>
                    </div>

                    {/* Skills Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSkills?.map(skill => (
                            <div 
                                key={skill.id} 
                                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col"
                                onClick={() => setSelectedSkill(skill)}
                            >
                                {/* Status Indicator */}
                                <div className={`absolute top-0 right-0 w-1 h-full ${(skill.questionIds?.length || 0) === 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />

                                <div className="flex items-start gap-3 mb-3">
                                    <Target size={20} className="text-amber-500 shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{skill.name}</h3>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{getPathName(skill.pathId)}</span>
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">{getSubjectName(skill.subjectId)}</span>
                                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px]">{getSectionName(skill.sectionId)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <p className="text-sm text-gray-500 mb-6 line-clamp-2 flex-1">
                                    {skill.description || 'لا يوجد وصف'}
                                </p>
                                
                                <div className="flex items-center gap-4 pt-4 border-t border-gray-50 mt-auto">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <BookOpen size={14} className={(skill.lessonIds?.length || 0) > 0 ? 'text-blue-500' : ''} />
                                        <span>{skill.lessonIds?.length || 0} درس</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <HelpCircle size={14} className={(skill.questionIds?.length || 0) > 0 ? 'text-emerald-500' : 'text-red-400'} />
                                        <span className={(skill.questionIds?.length || 0) === 0 ? 'text-red-500 font-medium' : ''}>
                                            {skill.questionIds?.length || 0} سؤال
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!filteredSkills || filteredSkills.length === 0) && (
                            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
                                لا توجد مهارات تطابق بحثك.
                            </div>
                        )}
                    </div>
                </>
            ) : activeTab === 'taxonomy' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Paths */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <FolderTree className="text-amber-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-900">المسارات</h2>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                placeholder="اسم المسار الجديد..." 
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                value={newPathName}
                                onChange={(e) => setNewPathName(e.target.value)}
                            />
                            <button onClick={handleAddPath} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors">
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {paths?.map(p => (
                                <div key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm font-medium text-gray-800">
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Subjects */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <BookOpen className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-900">المواد الرئيسية</h2>
                        </div>
                        <div className="space-y-3 mb-4">
                            <select 
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                value={selectedPathForSubject}
                                onChange={(e) => setSelectedPathForSubject(e.target.value)}
                            >
                                <option value="">اختر المسار...</option>
                                {paths?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="اسم المادة..." 
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    value={newSubjectName}
                                    onChange={(e) => setNewSubjectName(e.target.value)}
                                    disabled={!selectedPathForSubject}
                                />
                                <button onClick={handleAddSubject} disabled={!selectedPathForSubject} className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-3 py-2 rounded-lg transition-colors">
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {subjects?.map(s => (
                                <div key={s.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm flex flex-col gap-1">
                                    <span className="font-medium text-gray-800">{s.name}</span>
                                    <span className="text-xs text-gray-500">{getPathName(s.pathId)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-6">
                            <Target className="text-purple-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-900">الأقسام الفرعية</h2>
                        </div>
                        <div className="space-y-3 mb-4">
                            <select 
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                value={selectedSubjectForSection}
                                onChange={(e) => setSelectedSubjectForSection(e.target.value)}
                            >
                                <option value="">اختر المادة...</option>
                                {subjects?.map(s => <option key={s.id} value={s.id}>{s.name} ({getPathName(s.pathId)})</option>)}
                            </select>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="اسم القسم..." 
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    disabled={!selectedSubjectForSection}
                                />
                                <button onClick={handleAddSection} disabled={!selectedSubjectForSection} className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-3 py-2 rounded-lg transition-colors">
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {sections?.map(s => (
                                <div key={s.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm flex flex-col gap-1">
                                    <span className="font-medium text-gray-800">{s.name}</span>
                                    <span className="text-xs text-gray-500">{getSubjectName(s.subjectId)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'reports' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-500 rounded-lg">
                                <TrendingDown size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">مهارات تحتاج تطوير</p>
                                <p className="text-2xl font-bold text-gray-900">{skillReports.filter(s => s.status === 'weak').length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-lg">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">مهارات قوية</p>
                                <p className="text-2xl font-bold text-gray-900">{skillReports.filter(s => s.status === 'strong').length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
                                <BarChart3 size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">إجمالي المحاولات</p>
                                <p className="text-2xl font-bold text-gray-900">{skillReports.reduce((acc, curr) => acc + curr.totalAttempts, 0)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">أداء الطلاب حسب المهارة</h2>
                            <p className="text-sm text-gray-500 mt-1">ترتيب المهارات من الأضعف للأقوى بناءً على نسب الإجابات الصحيحة</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50 text-gray-500 text-sm">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">المهارة</th>
                                        <th className="px-6 py-4 font-medium">التصنيف</th>
                                        <th className="px-6 py-4 font-medium">الأسئلة</th>
                                        <th className="px-6 py-4 font-medium">المحاولات</th>
                                        <th className="px-6 py-4 font-medium">نسبة النجاح</th>
                                        <th className="px-6 py-4 font-medium">الحالة</th>
                                        <th className="px-6 py-4 font-medium">إجراء مقترح</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {skillReports.map(report => (
                                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{report.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-500">
                                                    {getPathName(report.pathId)} &gt; {getSubjectName(report.subjectId)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{report.questionCount}</td>
                                            <td className="px-6 py-4 text-gray-600">{report.totalAttempts}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full bg-gray-100 rounded-full h-2 max-w-[100px]">
                                                        <div 
                                                            className={`h-2 rounded-full ${
                                                                report.status === 'weak' ? 'bg-red-500' : 
                                                                report.status === 'strong' ? 'bg-emerald-500' : 
                                                                report.status === 'average' ? 'bg-amber-500' : 'bg-gray-300'
                                                            }`} 
                                                            style={{ width: `${report.totalAttempts > 0 ? report.successRate : 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {report.totalAttempts > 0 ? `${report.successRate}%` : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {report.status === 'weak' && <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold flex items-center gap-1 w-max"><TrendingDown size={12}/> ضعف</span>}
                                                {report.status === 'strong' && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold flex items-center gap-1 w-max"><TrendingUp size={12}/> قوة</span>}
                                                {report.status === 'average' && <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs font-bold flex items-center gap-1 w-max"><BarChart3 size={12}/> متوسط</span>}
                                                {report.status === 'no_data' && <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs font-bold flex items-center gap-1 w-max"><AlertCircle size={12}/> لا بيانات</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {report.status === 'weak' ? (
                                                    <button className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                                                        إضافة أسئلة/دروس
                                                    </button>
                                                ) : report.status === 'no_data' ? (
                                                    <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                                                        ربط أسئلة
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400">مستوى جيد</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {skillReports.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                لا توجد مهارات لعرض تقاريرها.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
