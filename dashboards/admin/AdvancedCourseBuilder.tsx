import React, { useState } from 'react';
import { Course, Module, Lesson, LessonType, InteractiveQuestion } from '../../types';
import { UnifiedLessonBuilder } from './builders/UnifiedLessonBuilder';
import { UnifiedQuestionBuilder } from './builders/UnifiedQuestionBuilder';
import { QuizBuilder } from './QuizBuilder';
import { RichTextEditor } from '../../components/RichTextEditor';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useStore } from '../../store/useStore';
import { 
  Plus, GripVertical, Trash2, Edit2, Video, FileText, HelpCircle, 
  Settings, BookOpen, Save, X, Youtube, Video as VideoIcon, 
  MessageSquare, Users, Star, Clock, FileBadge, Tag, Bell,
  Link as LinkIcon, Lock, Unlock, Globe, ChevronDown, ChevronUp
} from 'lucide-react';

interface AdvancedCourseBuilderProps {
  initialCourse?: Course;
  onSave: (course: Partial<Course>) => void;
  onCancel: () => void;
}

export const AdvancedCourseBuilder: React.FC<AdvancedCourseBuilderProps> = ({ initialCourse, onSave, onCancel }) => {
  const { nestedSkills } = useStore();
  const [activeTab, setActiveTab] = useState<'curriculum' | 'settings'>('curriculum');
  const [settingsTab, setSettingsTab] = useState<'basic' | 'pricing' | 'advanced'>('basic');
  
  const [courseData, setCourseData] = useState<Partial<Course>>(initialCourse || {
    title: '',
    description: '',
    category: 'القدرات',
    level: 'Beginner',
    price: 0,
    currency: 'SAR',
    duration: 0,
    instructor: '',
    thumbnail: '',
    modules: [],
    isPublished: false,
    fakeRating: 5.0,
    fakeStudentsCount: 0,
    features: [],
    qa: [],
    files: []
  });

  // --- Curriculum Management ---
  const addModule = () => {
    const newModule: Module = {
      id: `mod_${Date.now()}`,
      title: 'قسم جديد',
      order: (courseData.modules?.length || 0) + 1,
      lessons: []
    };
    setCourseData(prev => ({ ...prev, modules: [...(prev.modules || []), newModule] }));
  };

  const updateModuleTitle = (moduleId: string, title: string) => {
    setCourseData(prev => ({
      ...prev,
      modules: prev.modules?.map(m => m.id === moduleId ? { ...m, title } : m)
    }));
  };

  const deleteModule = (moduleId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
      setCourseData(prev => ({
        ...prev,
        modules: prev.modules?.filter(m => m.id !== moduleId)
      }));
    }
  };

  const addLesson = (moduleId: string, type: LessonType) => {
    const module = courseData.modules?.find(m => m.id === moduleId);
    if (!module) return;

    let title = 'درس جديد';
    switch(type) {
      case 'video': title = 'درس فيديو جديد'; break;
      case 'quiz': title = 'اختبار جديد'; break;
      case 'text': title = 'نص درس جديد'; break;
      case 'live_youtube': title = 'بث مباشر (يوتيوب)'; break;
      case 'zoom': title = 'اجتماع زوم'; break;
      case 'google_meet': title = 'اجتماع جوجل ميت'; break;
      case 'teams': title = 'اجتماع تيمز'; break;
    }

    const newLesson: Lesson = {
      id: `les_${Date.now()}`,
      title,
      type,
      duration: '0 دقيقة',
      isCompleted: false,
      order: module.lessons.length + 1,
      skillIds: [],
      accessControl: 'enrolled',
      videoSource: type === 'video' ? 'upload' : undefined
    };

    setCourseData(prev => ({
      ...prev,
      modules: prev.modules?.map(m => 
        m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m
      )
    }));
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    setCourseData(prev => ({
      ...prev,
      modules: prev.modules?.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } 
          : m
      )
    }));
  };

  // Drag and drop handler
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'module') {
      const newModules = Array.from(courseData.modules || []);
      const [reorderedItem] = newModules.splice(source.index, 1);
      newModules.splice(destination.index, 0, reorderedItem);
      const updatedModules = newModules.map((m, index) => ({ ...m, order: index + 1 }));
      setCourseData(prev => ({ ...prev, modules: updatedModules }));
      return;
    }

    if (type === 'lesson' && source.droppableId === destination.droppableId) {
      const moduleId = source.droppableId;
      const moduleIndex = courseData.modules?.findIndex(m => m.id === moduleId);
      if (moduleIndex === undefined || moduleIndex === -1) return;

      const newModules = [...(courseData.modules || [])];
      const newLessons = Array.from(newModules[moduleIndex].lessons);
      const [reorderedItem] = newLessons.splice(source.index, 1);
      newLessons.splice(destination.index, 0, reorderedItem);

      const updatedLessons = newLessons.map((l, index) => ({ ...l, order: index + 1 }));
      newModules[moduleIndex] = { ...newModules[moduleIndex], lessons: updatedLessons };

      setCourseData(prev => ({ ...prev, modules: newModules }));
    }
  };

  const getLessonIcon = (type: LessonType) => {
    switch (type) {
      case 'video': return <Video size={16} className="text-blue-500" />;
      case 'text': return <FileText size={16} className="text-emerald-500" />;
      case 'quiz': return <HelpCircle size={16} className="text-purple-500" />;
      case 'live_youtube': return <Youtube size={16} className="text-red-500" />;
      case 'zoom': return <VideoIcon size={16} className="text-blue-400" />;
      case 'google_meet': return <VideoIcon size={16} className="text-green-500" />;
      case 'teams': return <VideoIcon size={16} className="text-indigo-600" />;
      default: return <FileText size={16} className="text-gray-500" />;
    }
  };

  // Lesson Edit Modal State
  const [editingLesson, setEditingLesson] = useState<{moduleId: string, lesson: Lesson} | null>(null);

  const handleSaveLesson = (moduleId: string, updatedLesson: Lesson) => {
    setCourseData(prev => ({
      ...prev,
      modules: prev.modules?.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: m.lessons.map(l => l.id === updatedLesson.id ? updatedLesson : l) }
          : m
      )
    }));
    setEditingLesson(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            {initialCourse ? 'تعديل الدورة (Master Builder)' : 'إنشاء دورة جديدة (Master Builder)'}
          </h2>
        </div>
        <button 
          onClick={() => onSave(courseData)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Save size={18} />
          حفظ الدورة
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200 px-6 bg-white">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'curriculum' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={18} />
          المناهج الدراسية
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings size={18} />
          إعدادات الدورة
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          
          {/* TAB: CURRICULUM */}
          {activeTab === 'curriculum' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">باني المناهج (Curriculum Builder)</h3>
                  <p className="text-sm text-gray-500">قم بإضافة الأقسام والدروس والاختبارات والاجتماعات الحية.</p>
                </div>
                <button 
                  onClick={addModule}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Plus size={18} />
                  إضافة قسم جديد
                </button>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="course-modules" type="module">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                      {courseData.modules?.map((module, index) => (
                        <Draggable key={module.id} draggableId={module.id} index={index}>
                          {(provided) => (
                            <div 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                            >
                              {/* Module Header */}
                              <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-3">
                                <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-600">
                                  <GripVertical size={20} />
                                </div>
                                <div className="flex-1">
                                  <input 
                                    type="text" 
                                    value={module.title}
                                    onChange={(e) => updateModuleTitle(module.id, e.target.value)}
                                    className="bg-transparent font-bold text-gray-800 focus:outline-none focus:border-b-2 focus:border-indigo-500 w-full text-lg"
                                    placeholder="اسم القسم..."
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => deleteModule(module.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>

                              {/* Lessons List */}
                              <Droppable droppableId={module.id} type="lesson">
                                {(provided) => (
                                  <div {...provided.droppableProps} ref={provided.innerRef} className="p-4 space-y-3 min-h-[50px]">
                                    {module.lessons.map((lesson, lessonIndex) => (
                                      <Draggable key={lesson.id} draggableId={lesson.id} index={lessonIndex}>
                                        {(provided) => (
                                          <div 
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className="flex items-center gap-3 bg-white border border-gray-200 p-3 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
                                          >
                                            <div {...provided.dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-500">
                                              <GripVertical size={18} />
                                            </div>
                                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                                              {getLessonIcon(lesson.type)}
                                            </div>
                                            <div className="flex-1">
                                              <span className="font-bold text-gray-800">{lesson.title}</span>
                                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                                                <span className="flex items-center gap-1">
                                                  {lesson.accessControl === 'public' ? <Globe size={12} className="text-emerald-500" /> : <Lock size={12} />}
                                                  {lesson.accessControl === 'public' ? 'متاح للجميع (معاينة)' : 'للمشتركين فقط'}
                                                </span>
                                                {lesson.type === 'video' && lesson.interactiveQuestions && lesson.interactiveQuestions.length > 0 && (
                                                  <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                                    <HelpCircle size={12} /> يحتوي أسئلة تفاعلية
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                onClick={() => setEditingLesson({ moduleId: module.id, lesson })}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-bold text-sm flex items-center gap-1"
                                              >
                                                <Edit2 size={16} /> إعدادات الدرس
                                              </button>
                                              <button onClick={() => deleteLesson(module.id, lesson.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    
                                    {/* Add Lesson Buttons */}
                                    <div className="pt-4 mt-2 border-t border-gray-100 flex gap-2 flex-wrap">
                                      <button onClick={() => addLesson(module.id, 'video')} className="text-sm font-bold text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <Video size={16} /> درس فيديو
                                      </button>
                                      <button onClick={() => addLesson(module.id, 'quiz')} className="text-sm font-bold text-gray-600 hover:text-purple-600 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <HelpCircle size={16} /> اختبار
                                      </button>
                                      <button onClick={() => addLesson(module.id, 'text')} className="text-sm font-bold text-gray-600 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <FileText size={16} /> نص درس
                                      </button>
                                      <button onClick={() => addLesson(module.id, 'live_youtube')} className="text-sm font-bold text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <Youtube size={16} /> بث يوتيوب
                                      </button>
                                      <button onClick={() => addLesson(module.id, 'zoom')} className="text-sm font-bold text-gray-600 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <VideoIcon size={16} /> زوم
                                      </button>
                                      <button onClick={() => addLesson(module.id, 'google_meet')} className="text-sm font-bold text-gray-600 hover:text-green-600 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <VideoIcon size={16} /> جوجل ميت
                                      </button>
                                      <button onClick={() => addLesson(module.id, 'teams')} className="text-sm font-bold text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 px-3 py-2 rounded-xl flex items-center gap-2 transition-all">
                                        <VideoIcon size={16} /> تيمز
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              {courseData.modules?.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                  <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد أقسام في هذه الدورة</h3>
                  <p className="text-gray-500 mb-6">ابدأ ببناء المنهج الدراسي بإضافة القسم الأول.</p>
                  <button onClick={addModule} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2 shadow-sm">
                    <Plus size={18} />
                    إضافة القسم الأول
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="flex gap-6 animate-fade-in">
              {/* Settings Sidebar */}
              <div className="w-64 flex-shrink-0 space-y-2">
                <button 
                  onClick={() => setSettingsTab('basic')}
                  className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${settingsTab === 'basic' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <FileText size={18} /> المعلومات الأساسية
                </button>
                <button 
                  onClick={() => setSettingsTab('pricing')}
                  className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${settingsTab === 'pricing' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Tag size={18} /> التسعير والاشتراكات
                </button>
                <button 
                  onClick={() => setSettingsTab('advanced')}
                  className={`w-full text-right px-4 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${settingsTab === 'advanced' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Settings size={18} /> إعدادات متقدمة
                </button>
              </div>

              {/* Settings Content */}
              <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                
                {settingsTab === 'basic' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-4">المعلومات الأساسية للدورة</h3>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">عنوان الدورة</label>
                      <input 
                        type="text" 
                        value={courseData.title || ''} 
                        onChange={(e) => setCourseData({...courseData, title: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">وصف الدورة</label>
                      <RichTextEditor 
                        value={courseData.description || ''} 
                        onChange={(val) => setCourseData({...courseData, description: val})} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">القسم / المسار</label>
                        <select 
                          value={courseData.category || 'القدرات'} 
                          onChange={(e) => setCourseData({...courseData, category: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="القدرات">القدرات</option>
                          <option value="التحصيلي">التحصيلي</option>
                          <option value="الرخصة المهنية">الرخصة المهنية</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">المستوى</label>
                        <select 
                          value={courseData.level || 'Beginner'} 
                          onChange={(e) => setCourseData({...courseData, level: e.target.value as any})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="Beginner">مبتدئ (تأسيس)</option>
                          <option value="Intermediate">متوسط (تدريب)</option>
                          <option value="Advanced">متقدم (مكثف)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">المهارات المرتبطة (اختياري)</label>
                      <select 
                        multiple
                        value={courseData.skills || []}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setCourseData({...courseData, skills: values});
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-32"
                      >
                        {nestedSkills.map(mainSkill => (
                          <optgroup key={mainSkill.id} label={mainSkill.name}>
                            <option value={mainSkill.id}>{mainSkill.name} (رئيسية)</option>
                            {mainSkill.subSkills?.map(sub => (
                              <option key={sub.id} value={sub.id}>- {sub.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">اضغط Ctrl (أو Cmd) لاختيار أكثر من مهارة.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">الصورة المصغرة (Thumbnail)</label>
                      <div className="flex items-center gap-4">
                        {courseData.thumbnail && (
                          <img src={courseData.thumbnail} alt="Thumbnail" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        )}
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setCourseData({...courseData, thumbnail: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">أو أدخل رابط الصورة مباشرة:</p>
                          <input 
                            type="text" 
                            value={courseData.thumbnail || ''} 
                            onChange={(e) => setCourseData({...courseData, thumbnail: e.target.value})}
                            className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'pricing' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-4">التسعير والاشتراكات</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">السعر (SAR)</label>
                        <input 
                          type="number" 
                          value={courseData.price || 0} 
                          onChange={(e) => setCourseData({...courseData, price: Number(e.target.value)})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">السعر الأصلي (قبل الخصم)</label>
                        <input 
                          type="number" 
                          value={courseData.originalPrice || ''} 
                          onChange={(e) => setCourseData({...courseData, originalPrice: Number(e.target.value)})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 mb-2">إدراج في العضويات / الباقات</h4>
                      <p className="text-sm text-gray-500 mb-4">اختر الباقات التي تتضمن هذه الدورة مجاناً.</p>
                      {/* Placeholder for membership selection */}
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="pkg1" className="rounded text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="pkg1" className="text-sm font-bold text-gray-700">باقة التأسيس الشامل</label>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'advanced' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 border-b pb-4">إعدادات متقدمة (Master Settings)</h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-bold text-gray-700">الإحصائيات الوهمية (Fake Stats)</h4>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">عدد الطلاب المبدئي</label>
                          <input 
                            type="number" 
                            value={courseData.fakeStudentsCount || 0} 
                            onChange={(e) => setCourseData({...courseData, fakeStudentsCount: Number(e.target.value)})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">سيزداد هذا العدد تلقائياً مع التسجيلات الحقيقية.</p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">التقييم (من 5)</label>
                          <input 
                            type="number" 
                            step="0.1" max="5" min="1"
                            value={courseData.fakeRating || 5} 
                            onChange={(e) => setCourseData({...courseData, fakeRating: Number(e.target.value)})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-gray-700">خيارات الدورة</h4>
                        
                        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input 
                            type="checkbox" 
                            checked={courseData.isPublished}
                            onChange={(e) => setCourseData({...courseData, isPublished: e.target.checked})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5"
                          />
                          <div>
                            <span className="block font-bold text-gray-800">نشر الدورة</span>
                            <span className="text-xs text-gray-500">جعل الدورة مرئية للطلاب.</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input 
                            type="checkbox" 
                            checked={courseData.dripContentEnabled}
                            onChange={(e) => setCourseData({...courseData, dripContentEnabled: e.target.checked})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5"
                          />
                          <div>
                            <span className="block font-bold text-gray-800">تدفق المحتوى (Drip Content)</span>
                            <span className="text-xs text-gray-500">فتح الدروس تدريجياً بناءً على جدول زمني.</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input 
                            type="checkbox" 
                            checked={courseData.certificateEnabled}
                            onChange={(e) => setCourseData({...courseData, certificateEnabled: e.target.checked})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5"
                          />
                          <div>
                            <span className="block font-bold text-gray-800">تفعيل الشهادات</span>
                            <span className="text-xs text-gray-500">إصدار شهادة عند إكمال الدورة.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Lesson Edit Modal */}
      {editingLesson && (
        <UnifiedLessonBuilder 
          initialLesson={editingLesson.lesson}
          moduleId={editingLesson.moduleId}
          onSave={handleSaveLesson}
          onCancel={() => setEditingLesson(null)}
        />
      )}
    </div>
  );
};
