import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Video, HelpCircle, Lock, Unlock, ChevronDown, ChevronUp, GripVertical, Save, X, Target, Layers, CornerDownLeft, Users, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { NestedSkill, NestedSubSkill, Lesson } from '../../types';
import { UnifiedLessonBuilder } from './builders/UnifiedLessonBuilder';

interface SkillsTreeManagerProps {
  subjectId?: string;
}

export const SkillsTreeManager: React.FC<SkillsTreeManagerProps> = ({ subjectId }) => {
  const { nestedSkills, updateNestedSkills: setSkills, paths, subjects } = useStore();
  
  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectId || '');

  const skills = nestedSkills.filter(s => {
    if (subjectId) return s.subjectId === subjectId;
    if (selectedSubjectId) return s.subjectId === selectedSubjectId;
    if (selectedPathId) {
      const pathSubjects = subjects.filter(sub => sub.pathId === selectedPathId).map(sub => sub.id);
      return s.subjectId && pathSubjects.includes(s.subjectId);
    }
    return true;
  });

  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [expandedSubSkillId, setExpandedSubSkillId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'analytics'>('manage');
  
  // Modals state
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Partial<NestedSkill> | null>(null);

  const [isSubSkillModalOpen, setIsSubSkillModalOpen] = useState(false);
  const [editingSubSkill, setEditingSubSkill] = useState<Partial<NestedSubSkill> | null>(null);
  const [activeParentSkillId, setActiveParentSkillId] = useState<string | null>(null);

  // Lesson Modal State
  const [editingLesson, setEditingLesson] = useState<{subSkillId: string, lesson: Lesson} | null>(null);
  const [isLinkLessonModalOpen, setIsLinkLessonModalOpen] = useState(false);
  const [selectedLessonIdToLink, setSelectedLessonIdToLink] = useState('');

  // Quiz Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Partial<{ id: string; title: string; questionCount: number }> | null>(null);
  const [activeSubSkillId, setActiveSubSkillId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSkillId(expandedSkillId === id ? null : id);
    setExpandedSubSkillId(null); // Reset sub-skill expansion when changing main skill
  };

  const toggleSubExpand = (id: string) => {
    setExpandedSubSkillId(expandedSubSkillId === id ? null : id);
  };

  const toggleLock = (id: string, isSubSkill: boolean = false, parentId?: string) => {
    if (isSubSkill && parentId) {
      setSkills(nestedSkills.map(s => {
        if (s.id === parentId) {
          return {
            ...s,
            subSkills: s.subSkills.map(sub => sub.id === id ? { ...sub, isLocked: !sub.isLocked } : sub)
          };
        }
        return s;
      }));
    } else {
      setSkills(nestedSkills.map(s => s.id === id ? { ...s, isLocked: !s.isLocked } : s));
    }
  };

  const handleDeleteSkill = (id: string, isSubSkill: boolean = false, parentId?: string) => {
    if (confirm(`هل أنت متأكد من حذف هذه المهارة ${isSubSkill ? 'الفرعية' : 'الرئيسية'}؟ سيتم حذف جميع المحتويات المرتبطة بها.`)) {
      if (isSubSkill && parentId) {
        setSkills(nestedSkills.map(s => {
          if (s.id === parentId) {
            return { ...s, subSkills: s.subSkills.filter(sub => sub.id !== id) };
          }
          return s;
        }));
      } else {
        setSkills(nestedSkills.filter(s => s.id !== id));
      }
    }
  };

  // --- Main Skill Handlers ---
  const handleSaveSkill = () => {
    if (!editingSkill?.name) return alert('يرجى إدخال اسم المهارة');
    if (!subjectId && !editingSkill?.subjectId) return alert('يرجى اختيار المادة');

    if (editingSkill.id) {
      setSkills(nestedSkills.map(s => s.id === editingSkill.id ? { ...s, ...editingSkill } as NestedSkill : s));
    } else {
      const newSkill: NestedSkill = {
        id: `skill_${Date.now()}`,
        name: editingSkill.name,
        description: editingSkill.description || '',
        isLocked: editingSkill.isLocked || false,
        pathId: editingSkill.pathId || selectedPathId,
        subjectId: editingSkill.subjectId || subjectId || selectedSubjectId,
        subSkills: []
      };
      setSkills([...nestedSkills, newSkill]);
    }
    setIsSkillModalOpen(false);
    setEditingSkill(null);
  };

  const openAddModal = () => {
    setEditingSkill({ name: '', description: '', isLocked: false, subjectId: subjectId || selectedSubjectId, pathId: selectedPathId });
    setIsSkillModalOpen(true);
  };

  const openEditModal = (skill: NestedSkill) => {
    setEditingSkill(skill);
    setIsSkillModalOpen(true);
  };

  // --- Sub Skill Handlers ---
  const handleSaveSubSkill = () => {
    if (!editingSubSkill?.name || !activeParentSkillId) return alert('يرجى إدخال اسم المهارة الفرعية');

    setSkills(nestedSkills.map(s => {
      if (s.id === activeParentSkillId) {
        if (editingSubSkill.id) {
          // Update
          return {
            ...s,
            subSkills: s.subSkills.map(sub => sub.id === editingSubSkill.id ? { ...sub, ...editingSubSkill } as NestedSubSkill : sub)
          };
        } else {
          // Create
          const newSubSkill: NestedSubSkill = {
            id: `sub_${Date.now()}`,
            name: editingSubSkill.name,
            description: editingSubSkill.description || '',
            isLocked: editingSubSkill.isLocked || false,
            lessons: [],
            quizzes: []
          };
          return { ...s, subSkills: [...s.subSkills, newSubSkill] };
        }
      }
      return s;
    }));
    
    setIsSubSkillModalOpen(false);
    setEditingSubSkill(null);
    setActiveParentSkillId(null);
  };

  const openAddSubSkillModal = (parentId: string) => {
    setActiveParentSkillId(parentId);
    setEditingSubSkill({ name: '', description: '', isLocked: false });
    setIsSubSkillModalOpen(true);
  };

  const openEditSubSkillModal = (parentId: string, subSkill: NestedSubSkill) => {
    setActiveParentSkillId(parentId);
    setEditingSubSkill(subSkill);
    setIsSubSkillModalOpen(true);
  };

  // --- Lesson Handlers ---
  const handleSaveLesson = (subSkillId: string, updatedLesson: Lesson) => {
    setSkills(nestedSkills.map(s => {
      if (s.id === activeParentSkillId) {
        return {
          ...s,
          subSkills: s.subSkills.map(sub => {
            if (sub.id === subSkillId) {
              const existingLessonIndex = sub.lessons.findIndex(l => l.id === updatedLesson.id);
              if (existingLessonIndex >= 0) {
                // Update
                const newLessons = [...sub.lessons];
                newLessons[existingLessonIndex] = updatedLesson;
                return { ...sub, lessons: newLessons };
              } else {
                // Create
                return { ...sub, lessons: [...sub.lessons, updatedLesson] };
              }
            }
            return sub;
          })
        };
      }
      return s;
    }));
    
    setEditingLesson(null);
  };

  const handleLinkLesson = () => {
    if (!selectedLessonIdToLink || !activeParentSkillId || !activeSubSkillId) return alert('يرجى اختيار درس');
    
    const lessonToLink = useStore.getState().lessons.find(l => l.id === selectedLessonIdToLink);
    if (!lessonToLink) return alert('الدرس غير موجود');

    setSkills(nestedSkills.map(s => {
      if (s.id === activeParentSkillId) {
        return {
          ...s,
          subSkills: s.subSkills.map(sub => {
            if (sub.id === activeSubSkillId) {
              // Check if already linked
              if (sub.lessons.some(l => l.id === lessonToLink.id)) {
                alert('هذا الدرس مرتبط بالفعل بهذه المهارة');
                return sub;
              }
              return { ...sub, lessons: [...sub.lessons, lessonToLink] };
            }
            return sub;
          })
        };
      }
      return s;
    }));
    
    setIsLinkLessonModalOpen(false);
    setSelectedLessonIdToLink('');
  };

  const openLinkLessonModal = (parentId: string, subSkillId: string) => {
    setActiveParentSkillId(parentId);
    setActiveSubSkillId(subSkillId);
    setSelectedLessonIdToLink('');
    setIsLinkLessonModalOpen(true);
  };

  const openAddLessonModal = (parentId: string, subSkillId: string) => {
    setActiveParentSkillId(parentId);
    setEditingLesson({
      subSkillId,
      lesson: {
        id: `lesson_${Date.now()}`,
        title: '',
        type: 'video',
        duration: '0',
        isCompleted: false,
        order: 1,
        skillIds: []
      }
    });
  };

  const openEditLessonModal = (parentId: string, subSkillId: string, lesson: Lesson) => {
    setActiveParentSkillId(parentId);
    setEditingLesson({ subSkillId, lesson });
  };

  const handleDeleteLesson = (parentId: string, subSkillId: string, lessonId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
      setSkills(nestedSkills.map(s => {
        if (s.id === parentId) {
          return {
            ...s,
            subSkills: s.subSkills.map(sub => {
              if (sub.id === subSkillId) {
                return { ...sub, lessons: sub.lessons.filter(l => l.id !== lessonId) };
              }
              return sub;
            })
          };
        }
        return s;
      }));
    }
  };

  // --- Quiz Handlers ---
  const handleSaveQuiz = () => {
    if (!editingQuiz?.title || !activeParentSkillId || !activeSubSkillId) return alert('يرجى إدخال عنوان الاختبار');

    setSkills(nestedSkills.map(s => {
      if (s.id === activeParentSkillId) {
        return {
          ...s,
          subSkills: s.subSkills.map(sub => {
            if (sub.id === activeSubSkillId) {
              if (editingQuiz.id) {
                // Update
                return {
                  ...sub,
                  quizzes: sub.quizzes.map(q => q.id === editingQuiz.id ? { ...q, ...editingQuiz } as any : q)
                };
              } else {
                // Create
                const newQuiz = {
                  id: `quiz_${Date.now()}`,
                  title: editingQuiz.title,
                  questionCount: editingQuiz.questionCount || 0
                };
                return { ...sub, quizzes: [...sub.quizzes, newQuiz] };
              }
            }
            return sub;
          })
        };
      }
      return s;
    }));
    
    setIsQuizModalOpen(false);
    setEditingQuiz(null);
  };

  const handleDeleteQuiz = (parentId: string, subSkillId: string, quizId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
      setSkills(nestedSkills.map(s => {
        if (s.id === parentId) {
          return {
            ...s,
            subSkills: s.subSkills.map(sub => {
              if (sub.id === subSkillId) {
                return { ...sub, quizzes: sub.quizzes.filter(q => q.id !== quizId) };
              }
              return sub;
            })
          };
        }
        return s;
      }));
    }
  };

  const openAddQuizModal = (parentId: string, subSkillId: string) => {
    setActiveParentSkillId(parentId);
    setActiveSubSkillId(subSkillId);
    setEditingQuiz({ title: '', questionCount: 0 });
    setIsQuizModalOpen(true);
  };

  const openEditQuizModal = (parentId: string, subSkillId: string, quiz: any) => {
    setActiveParentSkillId(parentId);
    setActiveSubSkillId(subSkillId);
    setEditingQuiz(quiz);
    setIsQuizModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">مركز المهارات</h2>
          <p className="text-gray-500 text-sm mt-1">إدارة شجرة المهارات وربطها بالدروس والاختبارات وتحليل الأداء.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${activeTab === 'manage' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            إدارة المهارات
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl font-bold transition-colors ${activeTab === 'analytics' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            تحليل المهارات
          </button>
          {activeTab === 'manage' && (
            <button 
              onClick={openAddModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm mr-2"
            >
              <Plus size={18} />
              إضافة مهارة رئيسية
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {!subjectId && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
          <select 
            value={selectedPathId}
            onChange={(e) => {
              setSelectedPathId(e.target.value);
              setSelectedSubjectId('');
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
          >
            <option value="">كل المسارات</option>
            {paths.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select 
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
            disabled={!selectedPathId}
          >
            <option value="">كل المواد</option>
            {subjects.filter(s => s.pathId === selectedPathId).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Reports */}
      {activeTab === 'manage' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="text-gray-500 text-sm mb-1">المهارات الرئيسية</div>
              <div className="text-2xl font-bold text-indigo-600">{skills.length}</div>
            </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm mb-1">المهارات الفرعية</div>
          <div className="text-2xl font-bold text-emerald-600">
            {skills.reduce((acc, s) => acc + s.subSkills.length, 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm mb-1">الدروس المرتبطة</div>
          <div className="text-2xl font-bold text-blue-600">
            {skills.reduce((acc, s) => acc + s.subSkills.reduce((subAcc, sub) => subAcc + sub.lessons.length, 0), 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 text-sm mb-1">الاختبارات المرتبطة</div>
          <div className="text-2xl font-bold text-amber-600">
            {skills.reduce((acc, s) => acc + s.subSkills.reduce((subAcc, sub) => subAcc + sub.quizzes.length, 0), 0)}
          </div>
        </div>
      </div>

      {/* Skills List */}
      <div className="space-y-4">
        {skills.map((skill) => (
          <div key={skill.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all">
            {/* Main Skill Header */}
            <div className={`p-4 flex items-center justify-between transition-colors ${expandedSkillId === skill.id ? 'bg-indigo-50/50 border-b border-indigo-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleExpand(skill.id)}>
                <div className="cursor-grab text-gray-400 hover:text-gray-600">
                  <GripVertical size={20} />
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${skill.isLocked ? 'bg-gray-200 text-gray-500' : 'bg-indigo-600 text-white'}`}>
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    {skill.name}
                    {skill.isLocked && <Lock size={16} className="text-gray-400" />}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {skill.subSkills.length} مهارات فرعية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleLock(skill.id)} 
                  className={`p-2 rounded-lg transition-colors ${skill.isLocked ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  title={skill.isLocked ? 'فتح المهارة' : 'قفل المهارة'}
                >
                  {skill.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
                <button onClick={() => openEditModal(skill)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDeleteSkill(skill.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                  <Trash2 size={18} />
                </button>
                <button onClick={() => toggleExpand(skill.id)} className={`p-2 rounded-lg transition-colors ml-2 ${expandedSkillId === skill.id ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-200'}`}>
                  {expandedSkillId === skill.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
            </div>

            {/* Expanded Content (Sub Skills) */}
            {expandedSkillId === skill.id && (
              <div className="p-6 bg-white animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    <Layers size={20} className="text-indigo-500" />
                    المهارات الفرعية ({skill.name})
                  </h4>
                  <button 
                    onClick={() => openAddSubSkillModal(skill.id)}
                    className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} /> إضافة مهارة فرعية
                  </button>
                </div>

                <div className="space-y-4 pl-4 border-r-2 border-indigo-100 mr-2 pr-6">
                  {skill.subSkills.map(subSkill => (
                    <div key={subSkill.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      {/* Sub Skill Header */}
                      <div className="p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleSubExpand(subSkill.id)}>
                          <CornerDownLeft size={18} className="text-gray-400" />
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${subSkill.isLocked ? 'bg-gray-200 text-gray-500' : 'bg-indigo-100 text-indigo-600'}`}>
                            <Target size={16} />
                          </div>
                          <div>
                            <h5 className="font-bold text-gray-800 flex items-center gap-2">
                              {subSkill.name}
                              {subSkill.isLocked && <Lock size={12} className="text-gray-400" />}
                            </h5>
                            <p className="text-xs text-gray-500">
                              {subSkill.lessons.length} درس · {subSkill.quizzes.length} اختبار
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleLock(subSkill.id, true, skill.id)} className={`p-1.5 rounded-lg transition-colors ${subSkill.isLocked ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                            {subSkill.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                          </button>
                          <button onClick={() => openEditSubSkillModal(skill.id, subSkill)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteSkill(subSkill.id, true, skill.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                          <button onClick={() => toggleSubExpand(subSkill.id)} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors ml-1">
                            {expandedSubSkillId === subSkill.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Sub Skill Content (Lessons & Quizzes) */}
                      {expandedSubSkillId === subSkill.id && (
                        <div className="p-5 border-t border-gray-100 bg-white">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Lessons */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                                  <Video size={16} className="text-indigo-500" /> دروس الفيديو
                                </h6>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => openLinkLessonModal(skill.id, subSkill.id)}
                                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                  >
                                    <Plus size={12} /> ربط درس موجود
                                  </button>
                                  <button 
                                    onClick={() => openAddLessonModal(skill.id, subSkill.id)}
                                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                  >
                                    <Plus size={12} /> إضافة درس جديد
                                  </button>
                                </div>
                              </div>
                              {subSkill.lessons.length > 0 ? (
                                <div className="space-y-2">
                                  {subSkill.lessons.map(lesson => (
                                    <div key={lesson.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg bg-gray-50 hover:border-indigo-200 transition-colors">
                                      <div>
                                        <p className="font-bold text-xs text-gray-800">{lesson.title}</p>
                                        <p className="text-[10px] text-gray-500">{lesson.duration} دقيقة</p>
                                      </div>
                                      <div className="flex gap-1">
                                        <button onClick={() => openEditLessonModal(skill.id, subSkill.id, lesson)} className="p-1 text-gray-400 hover:text-blue-600 rounded"><Edit2 size={12} /></button>
                                        <button onClick={() => handleDeleteLesson(skill.id, subSkill.id, lesson.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={12} /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                  <p className="text-xs text-gray-500">لا توجد دروس.</p>
                                </div>
                              )}
                            </div>

                            {/* Quizzes */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h6 className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
                                  <HelpCircle size={16} className="text-emerald-500" /> الاختبارات التدريبية
                                </h6>
                                <button 
                                  onClick={() => openAddQuizModal(skill.id, subSkill.id)}
                                  className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                >
                                  <Plus size={12} /> إضافة
                                </button>
                              </div>
                              {subSkill.quizzes.length > 0 ? (
                                <div className="space-y-2">
                                  {subSkill.quizzes.map(quiz => (
                                    <div key={quiz.id} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg bg-gray-50 hover:border-emerald-200 transition-colors">
                                      <div>
                                        <p className="font-bold text-xs text-gray-800">{quiz.title}</p>
                                        <p className="text-[10px] text-gray-500">{quiz.questionCount} أسئلة</p>
                                      </div>
                                      <div className="flex gap-1">
                                        <button onClick={() => openEditQuizModal(skill.id, subSkill.id, quiz)} className="p-1 text-gray-400 hover:text-blue-600 rounded"><Edit2 size={12} /></button>
                                        <button onClick={() => handleDeleteQuiz(skill.id, subSkill.id, quiz.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={12} /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                  <p className="text-xs text-gray-500">لا توجد اختبارات.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {skill.subSkills.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Layers size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 mb-3">لا توجد مهارات فرعية مضافة.</p>
                      <button 
                        onClick={() => openAddSubSkillModal(skill.id)}
                        className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center gap-2"
                      >
                        <Plus size={16} /> أضف المهارة الفرعية الأولى
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {skills.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Target size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد مهارات رئيسية</h3>
            <p className="text-gray-500 mb-4">ابدأ ببناء شجرة المهارات الخاصة بهذه المادة.</p>
            <button 
              onClick={openAddModal}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={18} />
              إضافة مهارة رئيسية
            </button>
          </div>
        )}
      </div>
      </>
      )}

      {/* Analytics View */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="text-indigo-600" />
              تحليل أداء المهارات (المهارات التي تحتاج تقوية)
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              يعرض هذا القسم المهارات الفرعية التي يواجه الطلاب صعوبة فيها بناءً على نتائج الاختبارات، مما يساعدك على توجيه جهودك لإضافة المزيد من الدروس أو الأسئلة التدريبية.
            </p>

            <div className="space-y-4">
              {skills.flatMap(skill => 
                skill.subSkills.map(subSkill => {
                  // Mock analytics data
                  const mockScore = Math.floor(Math.random() * 40) + 40; // 40 to 80
                  const isWeak = mockScore < 60;
                  const studentsCount = Math.floor(Math.random() * 100) + 20;

                  if (!isWeak) return null;

                  return (
                    <div key={subSkill.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-red-100 bg-red-50/30 rounded-xl gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{skill.name}</span>
                          <span className="text-gray-400 text-xs">&gt;</span>
                          <h4 className="font-bold text-gray-800">{subSkill.name}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                          <span className="flex items-center gap-1 text-red-600 font-bold">
                            متوسط الأداء: {mockScore}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} /> {studentsCount} طالب مختبر
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 w-full md:w-auto">
                        <button 
                          onClick={() => openAddLessonModal(skill.id, subSkill.id)}
                          className="flex-1 md:flex-none px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Video size={16} /> إضافة درس
                        </button>
                        <button 
                          onClick={() => openAddQuizModal(skill.id, subSkill.id)}
                          className="flex-1 md:flex-none px-4 py-2 bg-white border border-emerald-200 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <HelpCircle size={16} /> إضافة اختبار
                        </button>
                      </div>
                    </div>
                  );
                })
              ).filter(Boolean).length === 0 && (
                <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-emerald-500 mb-2 flex justify-center"><CheckCircle2 size={32} /></div>
                  <h4 className="font-bold text-gray-800">أداء ممتاز!</h4>
                  <p className="text-gray-500 text-sm">لا توجد مهارات ضعيفة حالياً بناءً على بيانات الطلاب.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Main Skill Modal */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Target size={20} className="text-indigo-600" />
                {editingSkill?.id ? 'تعديل المهارة الرئيسية' : 'إضافة مهارة رئيسية'}
              </h3>
              <button onClick={() => setIsSkillModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {!subjectId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">المسار</label>
                    <select 
                      value={editingSkill?.pathId || ''}
                      onChange={(e) => setEditingSkill({ ...editingSkill, pathId: e.target.value, subjectId: '' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    >
                      <option value="">اختر المسار</option>
                      {paths.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
                    <select 
                      value={editingSkill?.subjectId || ''}
                      onChange={(e) => setEditingSkill({ ...editingSkill, subjectId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      disabled={!editingSkill?.pathId}
                    >
                      <option value="">اختر المادة</option>
                      {subjects.filter(s => s.pathId === editingSkill?.pathId).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المهارة الرئيسية</label>
                <input 
                  type="text" 
                  value={editingSkill?.name || ''}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="مثال: الجبر، الهندسة..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">وصف المهارة (اختياري)</label>
                <textarea 
                  value={editingSkill?.description || ''}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24"
                  placeholder="وصف قصير للمهارة..."
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input 
                  type="checkbox" 
                  id="isLockedMain"
                  checked={editingSkill?.isLocked || false}
                  onChange={(e) => setEditingSkill({ ...editingSkill, isLocked: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isLockedMain" className="text-sm font-bold text-gray-700 cursor-pointer">
                  قفل المهارة (تتطلب اشتراك)
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsSkillModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                إلغاء
              </button>
              <button onClick={handleSaveSkill} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Save size={18} /> حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Sub Skill Modal */}
      {isSubSkillModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Layers size={20} className="text-indigo-600" />
                {editingSubSkill?.id ? 'تعديل المهارة الفرعية' : 'إضافة مهارة فرعية'}
              </h3>
              <button onClick={() => setIsSubSkillModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المهارة الفرعية</label>
                <input 
                  type="text" 
                  value={editingSubSkill?.name || ''}
                  onChange={(e) => setEditingSubSkill({ ...editingSubSkill, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="مثال: المعادلات الخطية، زوايا المثلث..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">وصف المهارة (اختياري)</label>
                <textarea 
                  value={editingSubSkill?.description || ''}
                  onChange={(e) => setEditingSubSkill({ ...editingSubSkill, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24"
                  placeholder="وصف قصير للمهارة الفرعية..."
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input 
                  type="checkbox" 
                  id="isLockedSub"
                  checked={editingSubSkill?.isLocked || false}
                  onChange={(e) => setEditingSubSkill({ ...editingSubSkill, isLocked: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isLockedSub" className="text-sm font-bold text-gray-700 cursor-pointer">
                  قفل المهارة (تتطلب اشتراك)
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsSubSkillModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                إلغاء
              </button>
              <button onClick={handleSaveSubSkill} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Save size={18} /> حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Lesson Builder Modal */}
      {editingLesson && (
        <UnifiedLessonBuilder
          initialLesson={editingLesson.lesson}
          moduleId={editingLesson.subSkillId}
          onSave={handleSaveLesson}
          onCancel={() => setEditingLesson(null)}
        />
      )}

      {/* Link Lesson Modal */}
      {isLinkLessonModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <Video size={20} className="text-indigo-600" />
                ربط درس موجود
              </h3>
              <button onClick={() => setIsLinkLessonModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">اختر درساً من مركز الدروس</label>
                <select 
                  value={selectedLessonIdToLink}
                  onChange={(e) => setSelectedLessonIdToLink(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="">-- اختر درساً --</option>
                  {useStore.getState().lessons.filter(l => l.subjectId === selectedSubjectId || l.subjectId === subjectId).map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsLinkLessonModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                إلغاء
              </button>
              <button onClick={handleLinkLesson} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Save size={18} /> ربط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Quiz Modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <HelpCircle size={20} className="text-emerald-600" />
                {editingQuiz?.id && !editingQuiz.id.startsWith('quiz_') ? 'تعديل الاختبار' : 'إضافة اختبار تدريبي'}
              </h3>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">اختر اختباراً من بنك الاختبارات</label>
                <select 
                  value={editingQuiz?.id || ''}
                  onChange={(e) => {
                    const selectedQuiz = useStore.getState().quizzes.find(q => q.id === e.target.value);
                    if (selectedQuiz) {
                      setEditingQuiz({
                        id: selectedQuiz.id,
                        title: selectedQuiz.title,
                        questionCount: selectedQuiz.questionIds.length
                      });
                    } else {
                      setEditingQuiz({ id: '', title: '', questionCount: 0 });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">-- اختر اختباراً --</option>
                  {useStore.getState().quizzes.filter(q => q.subjectId === selectedSubjectId || q.subjectId === subjectId).map(q => (
                    <option key={q.id} value={q.id}>{q.title} ({q.questionIds.length} أسئلة)</option>
                  ))}
                </select>
              </div>
              
              <div className="text-sm text-gray-500 mt-2">
                ملاحظة: يمكنك إنشاء اختبارات جديدة من قسم "إدارة الاختبارات المحاكية".
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsQuizModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                إلغاء
              </button>
              <button onClick={handleSaveQuiz} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
                <Save size={18} /> حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
