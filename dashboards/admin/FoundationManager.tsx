import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Topic, Lesson, Quiz } from '../../types';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, BookOpen, FileQuestion, Link as LinkIcon, X, Lock, LockOpen, Eye } from 'lucide-react';

interface FoundationManagerProps {
  subjectId: string;
}

export const FoundationManager: React.FC<FoundationManagerProps> = ({ subjectId }) => {
  const { topics, addTopic, updateTopic, deleteTopic, lessons, quizzes, subjects } = useStore();
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Partial<Topic> | null>(null);

  // Attachment state
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachingToTopicId, setAttachingToTopicId] = useState<string | null>(null);
  const [attachType, setAttachType] = useState<'lesson' | 'quiz'>('lesson');

  const currentSubject = subjects.find(item => item.id === subjectId);
  const subjectTopics = topics.filter(t => t.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const mainTopics = subjectTopics.filter(t => !t.parentId);
  const availableLessons = lessons
    .filter((lesson) => {
      const matchesSubject = lesson.subjectId === subjectId;
      const matchesPath = currentSubject?.pathId ? lesson.pathId === currentSubject.pathId : true;
      return matchesSubject && matchesPath;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title, 'ar'));
  const availableQuizzes = quizzes
    .filter((quiz) => {
      const matchesSubject = quiz.subjectId === subjectId;
      const matchesPath = currentSubject?.pathId ? quiz.pathId === currentSubject.pathId : true;
      return matchesSubject && matchesPath && quiz.type === 'quiz';
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ar'));

  const toggleExpand = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleCreateNew = (parentId?: string) => {
    setEditingTopic({
      pathId: currentSubject?.pathId,
      subjectId,
      parentId,
      title: '',
      order: subjectTopics.filter(t => t.parentId === parentId).length,
      showOnPlatform: false,
      lessonIds: [],
      quizIds: []
    });
    setIsEditing(true);
  };

  const handleSaveTopic = () => {
    if (!editingTopic?.title) return;
    const subject = subjects.find(item => item.id === (editingTopic.subjectId || subjectId));

    if (editingTopic.id) {
      const updateData = { ...editingTopic, pathId: editingTopic.pathId || subject?.pathId };
      if (updateData.parentId === undefined) {
        updateData.parentId = null; // Use null instead of undefined for Firebase
      }
      updateTopic(editingTopic.id, updateData);
    } else {
      const newTopic: Topic = {
        ...(editingTopic as Topic),
        pathId: editingTopic.pathId || subject?.pathId,
        id: `topic_${Date.now()}`
      };
      if (newTopic.parentId === undefined) {
        newTopic.parentId = null; // Use null instead of undefined for Firebase
      }
      addTopic(newTopic);
    }
    setIsEditing(false);
    setEditingTopic(null);
  };

  const handleDelete = (topicId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموضوع؟ سيتم حذف جميع المواضيع الفرعية أيضاً.')) {
      // Delete subtopics first
      const subtopics = topics.filter(t => t.parentId === topicId);
      subtopics.forEach(st => deleteTopic(st.id));
      // Delete main topic
      deleteTopic(topicId);
    }
  };

  const handleAttach = (itemId: string) => {
    if (!attachingToTopicId) return;
    const topic = topics.find(t => t.id === attachingToTopicId);
    if (!topic) return;

    if (attachType === 'lesson') {
      if (!topic.lessonIds.includes(itemId)) {
        updateTopic(topic.id, { lessonIds: [...topic.lessonIds, itemId] });
      }
    } else {
      if (!topic.quizIds.includes(itemId)) {
        updateTopic(topic.id, { quizIds: [...topic.quizIds, itemId] });
      }
    }
    setIsAttaching(false);
  };

  const handleRemoveAttachment = (topicId: string, itemId: string, type: 'lesson' | 'quiz') => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    if (type === 'lesson') {
      updateTopic(topicId, { lessonIds: topic.lessonIds.filter(id => id !== itemId) });
    } else {
      updateTopic(topicId, { quizIds: topic.quizIds.filter(id => id !== itemId) });
    }
  };

  const handleTogglePlatformVisibility = (topic: Topic) => {
    updateTopic(topic.id, { showOnPlatform: topic.showOnPlatform === false });
  };

  const handlePreviewTopic = (topic: Topic) => {
    const pathId = topic.pathId || currentSubject?.pathId;
    const targetSubjectId = topic.subjectId || subjectId;
    if (!pathId || !targetSubjectId) return;
    const url = `/#/category/${pathId}?subject=${targetSubjectId}&tab=skills&topic=${topic.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePreviewAttachment = (item: Lesson | Quiz, type: 'lesson' | 'quiz') => {
    const url = type === 'lesson'
      ? (item as Lesson).videoUrl || `/#/category/${item.pathId || currentSubject?.pathId || ''}?subject=${item.subjectId || subjectId}&tab=skills`
      : `/#/quiz/${item.id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderTopic = (topic: Topic, level: number = 0) => {
    const subtopics = subjectTopics.filter(t => t.parentId === topic.id);
    const isExpanded = expandedTopics.has(topic.id);
    const attachedLessons = lessons.filter(l => topic.lessonIds?.includes(l.id));
    const attachedQuizzes = quizzes.filter(q => topic.quizIds?.includes(q.id));

    return (
      <div key={topic.id} className={`border border-gray-100 rounded-xl mb-3 bg-white overflow-hidden shadow-sm ${level > 0 ? 'mr-8 border-r-4 border-r-indigo-200' : ''}`}>
        <div className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            {subtopics.length > 0 ? (
              <button onClick={() => toggleExpand(topic.id)} className="text-gray-500 hover:text-indigo-600">
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
            ) : (
              <div className="w-5" /> // Spacer
            )}
            <h3 className={`font-bold ${level === 0 ? 'text-lg text-gray-800' : 'text-md text-gray-700'}`}>
              {topic.title}
            </h3>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
              {subtopics.length} مواضيع فرعية
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${topic.showOnPlatform === false ? 'bg-gray-100 text-gray-600' : 'bg-sky-50 text-sky-700'}`}>
              {topic.showOnPlatform === false ? 'مخفي عن المنصة' : 'ظاهر على المنصة'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePreviewTopic(topic)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="معاينة الموضوع كما سيظهر للطالب"
            >
              <Eye size={18} />
            </button>
            <button 
              onClick={() => {
                setAttachingToTopicId(topic.id);
                setIsAttaching(true);
              }}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="ربط محتوى"
            >
              <LinkIcon size={18} />
            </button>
            <button 
              onClick={() => handleTogglePlatformVisibility(topic)}
              className={`p-2 rounded-lg transition-colors ${topic.showOnPlatform === false ? 'text-gray-500 hover:bg-gray-100' : 'text-sky-600 hover:bg-sky-50'}`}
              title={topic.showOnPlatform === false ? 'إظهار الموضوع على المنصة' : 'إخفاء الموضوع عن المنصة'}
            >
              {topic.showOnPlatform === false ? <Lock size={18} /> : <LockOpen size={18} />}
            </button>
            <button 
              onClick={() => handleCreateNew(topic.id)}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="إضافة موضوع فرعي"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={() => {
                setEditingTopic(topic);
                setIsEditing(true);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 size={18} />
            </button>
            <button 
              onClick={() => handleDelete(topic.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Attachments */}
        {(attachedLessons.length > 0 || attachedQuizzes.length > 0) && (
          <div className="px-12 py-3 bg-white border-t border-gray-50 flex flex-wrap gap-2">
            {attachedLessons.map(lesson => (
              <div key={lesson.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm border border-blue-100">
                <BookOpen size={14} />
                <span className="truncate max-w-[150px]">{lesson.title}</span>
                <button
                  onClick={() => handlePreviewAttachment(lesson, 'lesson')}
                  className="text-blue-400 hover:text-blue-700"
                  title="معاينة الدرس"
                >
                  <Eye size={14} />
                </button>
                <button onClick={() => handleRemoveAttachment(topic.id, lesson.id, 'lesson')} className="text-blue-400 hover:text-blue-600">
                  <X size={14} />
                </button>
              </div>
            ))}
            {attachedQuizzes.map(quiz => (
              <div key={quiz.id} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm border border-amber-100">
                <FileQuestion size={14} />
                <span className="truncate max-w-[150px]">{quiz.title}</span>
                <button
                  onClick={() => handlePreviewAttachment(quiz, 'quiz')}
                  className="text-amber-400 hover:text-amber-700"
                  title="معاينة التدريب"
                >
                  <Eye size={14} />
                </button>
                <button onClick={() => handleRemoveAttachment(topic.id, quiz.id, 'quiz')} className="text-amber-400 hover:text-amber-600">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Subtopics */}
        {isExpanded && subtopics.length > 0 && (
          <div className="p-4 bg-white border-t border-gray-50">
            {subtopics.map(st => renderTopic(st, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">إدارة التأسيس (الموضوعات)</h2>
          <p className="text-gray-500 text-sm mt-1">قم ببناء شجرة الموضوعات التأسيسية وربطها بالدروس والتدريبات. هذه المساحة خاصة بالتعلّم وليست مصدر مهارات التقييم والتحليل.</p>
        </div>
        <button 
          onClick={() => handleCreateNew()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة موضوع رئيسي
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {mainTopics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            لا توجد مواضيع تأسيسية بعد. ابدأ بإضافة موضوع رئيسي.
          </div>
        ) : (
          <div>
            {mainTopics.map(topic => renderTopic(topic))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && editingTopic && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingTopic.id ? 'تعديل الموضوع' : 'إضافة موضوع جديد'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">عنوان الموضوع</label>
                <input 
                  type="text" 
                  value={editingTopic.title || ''}
                  onChange={(e) => setEditingTopic({...editingTopic, title: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="مثال: الكسور العشرية"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">الترتيب</label>
                <input 
                  type="number" 
                  value={editingTopic.order || 0}
                  onChange={(e) => setEditingTopic({...editingTopic, order: parseInt(e.target.value)})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <label className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingTopic.showOnPlatform !== false}
                  onChange={(e) => setEditingTopic({ ...editingTopic, showOnPlatform: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
                <span className="font-medium text-gray-700">إظهار هذا الموضوع على المنصة</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleSaveTopic}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                حفظ
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attach Modal */}
      {isAttaching && attachingToTopicId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h3 className="text-xl font-bold mb-4">ربط محتوى بالموضوع</h3>
            
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setAttachType('lesson')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${attachType === 'lesson' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                ربط درس (من المكتبة)
              </button>
              <button 
                onClick={() => setAttachType('quiz')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${attachType === 'quiz' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                ربط تدريب (من مركز الاختبارات)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl p-2">
              {attachType === 'lesson' ? (
                  <div className="space-y-2">
                  {availableLessons.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">لا توجد دروس في المكتبة المركزية.</p>
                  ) : (
                    availableLessons
                      .filter((lesson) => !topics.find((topic) => topic.id === attachingToTopicId)?.lessonIds.includes(lesson.id))
                      .map(lesson => (
                      <div key={lesson.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                          <BookOpen size={18} className="text-blue-500" />
                          <span className="font-medium text-gray-800">{lesson.title}</span>
                        </div>
                        <button 
                          onClick={() => handleAttach(lesson.id)}
                          className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold hover:bg-indigo-100"
                        >
                          اختيار
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                  <div className="space-y-2">
                  {availableQuizzes.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">لا توجد اختبارات في المركز المركزي.</p>
                  ) : (
                    availableQuizzes
                      .filter((quiz) => !topics.find((topic) => topic.id === attachingToTopicId)?.quizIds.includes(quiz.id))
                      .map(quiz => (
                      <div key={quiz.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                          <FileQuestion size={18} className="text-amber-500" />
                          <span className="font-medium text-gray-800">{quiz.title}</span>
                        </div>
                        <button 
                          onClick={() => handleAttach(quiz.id)}
                          className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold hover:bg-indigo-100"
                        >
                          اختيار
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsAttaching(false)}
              className="mt-4 w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
