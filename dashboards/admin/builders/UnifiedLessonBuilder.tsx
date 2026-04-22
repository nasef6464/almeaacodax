import React, { useState } from 'react';
import { Lesson, LessonType } from '../../../types';
import { Save, X, Video, FileText, HelpCircle, Video as VideoIcon, Youtube } from 'lucide-react';
import { QuizBuilder } from '../QuizBuilder';
import { UnifiedQuestionBuilder } from './UnifiedQuestionBuilder';
import { Question } from '../../../types';
import { useStore } from '../../../store/useStore';

interface UnifiedLessonBuilderProps {
  initialLesson: Lesson;
  moduleId?: string;
  onSave: (moduleId: string | undefined, lesson: Lesson) => void;
  onCancel: () => void;
}

export const UnifiedLessonBuilder: React.FC<UnifiedLessonBuilderProps> = ({ 
  initialLesson, 
  moduleId,
  onSave, 
  onCancel 
}) => {
  const [lesson, setLesson] = useState<Lesson>(initialLesson);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const { quizzes } = useStore();

  const getLessonIcon = (type: LessonType) => {
    switch (type) {
      case 'video': return <Video size={18} className="text-blue-500" />;
      case 'text': return <FileText size={18} className="text-emerald-500" />;
      case 'quiz': return <HelpCircle size={18} className="text-purple-500" />;
      case 'live_youtube': return <Youtube size={18} className="text-red-500" />;
      case 'zoom': return <VideoIcon size={18} className="text-blue-400" />;
      case 'google_meet': return <VideoIcon size={18} className="text-green-500" />;
      case 'teams': return <VideoIcon size={18} className="text-indigo-600" />;
      default: return <FileText size={18} className="text-gray-500" />;
    }
  };

  const handleSave = () => {
    if (!lesson.title) {
      alert('يرجى إدخال عنوان الدرس');
      return;
    }
    onSave(moduleId, lesson);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            {getLessonIcon(lesson.type)}
            منشئ الدروس الموحد: {lesson.title || 'درس جديد'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Common Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اسم الدرس</label>
              <input 
                type="text" 
                value={lesson.title || ''}
                onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">الوصول (Access)</label>
              <select 
                value={lesson.accessControl || 'enrolled'}
                onChange={(e) => setLesson({ ...lesson, accessControl: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="public">متاح للجميع (معاينة مجانية)</option>
                <option value="enrolled">للمشتركين في الدورة فقط</option>
                <option value="specific_groups">لمجموعات محددة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">وصف قصير للدرس</label>
            <textarea 
              value={lesson.description || ''}
              onChange={(e) => setLesson({ ...lesson, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ربط بمهارات (Skill Mapping)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {lesson.skillIds?.map(skillId => {
                const topic = useStore.getState().topics.find(t => t.id === skillId);
                return topic ? (
                  <span key={skillId} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                    {topic.title}
                    <button onClick={() => setLesson(prev => ({ ...prev, skillIds: prev.skillIds?.filter(id => id !== skillId) }))} className="text-indigo-600 hover:text-indigo-900">
                      <X size={14} />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
            <select 
              value=""
              onChange={(e) => {
                if (e.target.value && !lesson.skillIds?.includes(e.target.value)) {
                  setLesson(prev => ({ ...prev, skillIds: [...(prev.skillIds || []), e.target.value] }));
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- أضف مهارة --</option>
              {useStore.getState().topics.filter(t => !lesson.subjectId || t.subjectId === lesson.subjectId).filter(t => !t.parentId).map(mainTopic => (
                <optgroup key={mainTopic.id} label={mainTopic.title}>
                  <option value={mainTopic.id}>{mainTopic.title} (رئيسية)</option>
                  {useStore.getState().topics.filter(sub => sub.parentId === mainTopic.id).map(sub => (
                    <option key={sub.id} value={sub.id}>- {sub.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">عند ربط الدرس بمهارة، سيظهر أيضاً في "مركز المهارات" للطالب.</p>
          </div>

          {/* Video Specific Settings */}
          {lesson.type === 'video' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2"><Video size={18} className="text-blue-500"/> إعدادات الفيديو</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">مصدر الفيديو</label>
                  <select 
                    value={lesson.videoSource || 'upload'}
                    onChange={(e) => setLesson({ ...lesson, videoSource: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="upload">رفع مباشر (مكتبة المنصة)</option>
                    <option value="youtube">رابط يوتيوب (بدون أدوات يوتيوب)</option>
                    <option value="vimeo">رابط Vimeo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رابط الفيديو / الملف</label>
                  <input 
                    type="text" 
                    value={lesson.videoUrl || ''}
                    onChange={(e) => setLesson({ ...lesson, videoUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Interactive Video Features */}
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h5 className="font-bold text-purple-800 flex items-center gap-2">
                      <HelpCircle size={16} /> الأسئلة التفاعلية داخل الفيديو
                    </h5>
                    <p className="text-xs text-purple-600">إيقاف الفيديو عند وقت محدد وعرض سؤال للطالب.</p>
                  </div>
                  <button 
                    onClick={() => setShowQuestionBuilder(true)}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors"
                  >
                    + إضافة سؤال
                  </button>
                </div>
                
                {(!lesson.interactiveQuestions || lesson.interactiveQuestions.length === 0) ? (
                  <div className="text-center py-4 text-purple-400 text-sm bg-white/50 rounded-lg border border-purple-100 border-dashed">
                    لم يتم إضافة أسئلة تفاعلية لهذا الفيديو.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lesson.interactiveQuestions.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-purple-100">
                        <span className="text-sm font-bold text-gray-700 truncate flex-1" dangerouslySetInnerHTML={{__html: q.inlineQuestion?.text || 'سؤال من بنك الأسئلة'}} />
                        <button 
                          onClick={() => setLesson(prev => ({ ...prev, interactiveQuestions: prev.interactiveQuestions?.filter((_, i) => i !== idx) }))}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Meeting Specific Settings */}
          {['live_youtube', 'zoom', 'google_meet', 'teams'].includes(lesson.type) && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <VideoIcon size={18} className="text-green-500"/> إعدادات البث / الاجتماع
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">رابط الاجتماع / البث</label>
                  <input 
                    type="text" 
                    value={lesson.meetingUrl || ''}
                    onChange={(e) => setLesson({ ...lesson, meetingUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">موعد الاجتماع</label>
                  <input 
                    type="datetime-local" 
                    value={lesson.meetingDate || ''}
                    onChange={(e) => setLesson({ ...lesson, meetingDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quiz Specific Settings */}
          {lesson.type === 'quiz' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle size={18} className="text-purple-500"/> إعدادات الاختبار
              </h4>
              <p className="text-sm text-gray-500">يمكنك ربط هذا الدرس باختبار موجود أو إنشاء اختبار جديد باستخدام منشئ الاختبارات الموحد.</p>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اختيار من بنك الاختبارات</label>
                  <select 
                    value={lesson.quizId || ''}
                    onChange={(e) => setLesson({ ...lesson, quizId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- اختر اختباراً --</option>
                    {quizzes.map(q => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-400 font-bold">أو</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <button 
                  onClick={() => setShowQuizBuilder(true)}
                  className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                >
                  فتح منشئ الاختبارات الموحد لإنشاء اختبار جديد
                </button>
              </div>
            </div>
          )}

        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
            إلغاء
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} /> حفظ التغييرات
          </button>
        </div>
      </div>

      {showQuizBuilder && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <div className="p-4">
            <button onClick={() => setShowQuizBuilder(false)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold">
              <X size={20} /> العودة للدرس
            </button>
            <QuizBuilder />
          </div>
        </div>
      )}

      {showQuestionBuilder && (
        <UnifiedQuestionBuilder 
          onSave={(q) => {
            // Add to interactive questions
            const newQ = { ...q, id: `q_${Date.now()}`, timestamp: 0 } as any;
            setLesson(prev => ({
              ...prev,
              interactiveQuestions: [...(prev.interactiveQuestions || []), newQ]
            }));
            setShowQuestionBuilder(false);
          }}
          onCancel={() => setShowQuestionBuilder(false)}
        />
      )}
    </div>
  );
};
