import React, { useState } from 'react';
import { Question } from '../../../types';
import { RichTextEditor } from '../../../components/RichTextEditor';
import { Save, X, Wand2, Loader2 } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { generateQuizQuestion } from '../../../services/geminiService';

interface UnifiedQuestionBuilderProps {
  initialQuestion?: Partial<Question>;
  onSave: (question: Partial<Question>) => void;
  onCancel: () => void;
  subjectId?: string;
  sectionId?: string;
}

export const UnifiedQuestionBuilder: React.FC<UnifiedQuestionBuilderProps> = ({ 
  initialQuestion, 
  onSave, 
  onCancel,
  subjectId,
  sectionId
}) => {
  const { nestedSkills, subjects, sections, paths } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [question, setQuestion] = useState<Partial<Question>>(initialQuestion || {
    text: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    explanation: '',
    videoUrl: '',
    difficulty: 'Medium',
    type: 'mcq',
    pathId: '',
    subject: subjectId || '',
    sectionId: sectionId || '',
    skillIds: []
  });

  const handleSave = () => {
    if (!question.text) {
      alert('يرجى إدخال نص السؤال');
      return;
    }
    if (question.type === 'mcq' && question.options?.some(o => !o)) {
      alert('يرجى تعبئة جميع الخيارات');
      return;
    }
    onSave(question);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    let topicName = "القدرات العقلية"; // fallback
    
    if (question.subject) {
      const subjectName = subjects.find(s => s.id === question.subject)?.name;
      if (subjectName) topicName = subjectName;
    } else if (question.pathId) {
      const pathName = paths.find(p => p.id === question.pathId)?.name;
      if (pathName) topicName = pathName;
    }

    if (question.sectionId) {
      const sectionName = sections.find(s => s.id === question.sectionId)?.name;
      if (sectionName) topicName += ` - ${sectionName}`;
    }

    if (question.skillIds && question.skillIds.length > 0) {
      const topic = useStore.getState().topics.find(t => t.id === question.skillIds![0])?.title;
      if (topic) topicName += ` - ${topic}`;
    }

    try {
      const generated = await generateQuizQuestion(topicName);
      if (generated) {
        setQuestion(prev => ({
          ...prev,
          text: generated.question,
          options: generated.options,
          correctOptionIndex: generated.correctIndex,
          explanation: generated.explanation,
          type: 'mcq'
        }));
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء التوليد');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            منشئ الأسئلة الموحد
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-bold text-gray-700">نص السؤال</label>
            <button 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} 
              {isGenerating ? 'جارِ التوليد...' : 'توليد بالذكاء الاصطناعي'}
            </button>
          </div>
          <RichTextEditor 
            value={question.text || ''} 
            onChange={val => setQuestion(prev => ({ ...prev, text: val }))} 
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">نوع السؤال</label>
              <select 
                value={question.type || 'mcq'}
                onChange={(e) => setQuestion(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="mcq">اختيار من متعدد</option>
                <option value="true_false">صح أم خطأ</option>
                <option value="essay">مقال / نصي</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">مستوى الصعوبة</label>
              <select 
                value={question.difficulty || 'Medium'}
                onChange={(e) => setQuestion(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Easy">سهل</option>
                <option value="Medium">متوسط</option>
                <option value="Hard">صعب</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">المسار (اختياري)</label>
              <select
                value={question.pathId || ''}
                onChange={(e) => setQuestion({ ...question, pathId: e.target.value, subject: '', sectionId: '', skillIds: [] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- كل المسارات --</option>
                {paths.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">المادة</label>
              <select
                value={question.subject || ''}
                onChange={(e) => setQuestion({ ...question, subject: e.target.value, sectionId: '', skillIds: [] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={!!question.pathId && subjects.filter(s => s.pathId === question.pathId).length === 0}
              >
                <option value="">-- اختر المادة --</option>
                {subjects.filter(s => !question.pathId || s.pathId === question.pathId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-2">القسم</label>
              <select
                value={question.sectionId || ''}
                onChange={(e) => setQuestion({ ...question, sectionId: e.target.value, skillIds: [] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={!question.subject}
              >
                <option value="">-- اختر القسم --</option>
                {sections.filter(s => s.subjectId === question.subject).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">ربط بالمهارات (اختياري)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {question.skillIds?.map(skillId => {
                  const topic = useStore.getState().topics.find(t => t.id === skillId);
                  return topic ? (
                    <span key={skillId} className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                      {topic.title}
                      <button onClick={() => setQuestion(prev => ({ ...prev, skillIds: prev.skillIds?.filter(id => id !== skillId) }))} className="text-indigo-600 hover:text-indigo-900">
                        <X size={14} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
              <select 
                value=""
                onChange={(e) => {
                  if (e.target.value && !question.skillIds?.includes(e.target.value)) {
                    setQuestion(prev => ({ ...prev, skillIds: [...(prev.skillIds || []), e.target.value] }));
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- أضف مهارة --</option>
                {useStore.getState().topics.filter(t => 
                  (!question.subject || t.subjectId === question.subject) && !t.parentId
                ).map(mainTopic => (
                  <optgroup key={mainTopic.id} label={mainTopic.title}>
                    <option value={mainTopic.id}>{mainTopic.title} (رئيسية)</option>
                    {useStore.getState().topics.filter(sub => sub.parentId === mainTopic.id).map(sub => (
                      <option key={sub.id} value={sub.id}>- {sub.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">رابط فيديو الشرح (اختياري)</label>
              <input 
                type="text" 
                value={question.videoUrl || ''}
                onChange={(e) => setQuestion(prev => ({ ...prev, videoUrl: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="https://..."
              />
            </div>
          </div>

          {question.type === 'mcq' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">الخيارات</label>
              {question.options?.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="correctOption"
                    checked={question.correctOptionIndex === idx} 
                    onChange={() => setQuestion(prev => ({ ...prev, correctOptionIndex: idx }))} 
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <input 
                    type="text" 
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...(question.options || [])];
                      newOpts[idx] = e.target.value;
                      setQuestion(prev => ({ ...prev, options: newOpts }));
                    }} 
                    className={`flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 ${question.correctOptionIndex === idx ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`} 
                    placeholder={`الخيار ${idx + 1}`} 
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-2">اختر الزر الدائري بجانب الخيار الصحيح.</p>
            </div>
          )}

          {question.type === 'true_false' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">الإجابة الصحيحة</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tf" checked={question.correctOptionIndex === 0} onChange={() => setQuestion(prev => ({...prev, correctOptionIndex: 0, options: ['صح', 'خطأ']}))} className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold">صح</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tf" checked={question.correctOptionIndex === 1} onChange={() => setQuestion(prev => ({...prev, correctOptionIndex: 1, options: ['صح', 'خطأ']}))} className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold">خطأ</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">شرح الإجابة (اختياري)</label>
            <RichTextEditor 
              value={question.explanation || ''} 
              onChange={val => setQuestion(prev => ({ ...prev, explanation: val }))} 
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
            إلغاء
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} /> حفظ السؤال
          </button>
        </div>
      </div>
    </div>
  );
};
