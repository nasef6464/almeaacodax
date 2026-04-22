import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { LibraryItem } from '../../types';
import { Plus, Edit2, Trash2, FileText, Search, Filter } from 'lucide-react';

interface LibraryManagerProps {
  subjectId: string;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ subjectId }) => {
  const { libraryItems, addLibraryItem, updateLibraryItem, deleteLibraryItem } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<LibraryItem> | null>(null);

  const subjectItems = libraryItems.filter(item => item.subjectId === subjectId);

  const handleSave = () => {
    if (editingItem?.id) {
      updateLibraryItem(editingItem.id, editingItem);
    } else {
      addLibraryItem({
        id: `lib_${Date.now()}`,
        title: editingItem?.title || 'ملف جديد',
        size: editingItem?.size || '0 MB',
        downloads: 0,
        type: editingItem?.type || 'pdf',
        subjectId,
        url: editingItem?.url || ''
      });
    }
    setIsEditing(false);
    setEditingItem(null);
  };

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in">
        <h3 className="text-xl font-bold text-gray-800 mb-6">{editingItem?.id ? 'تعديل ملف' : 'إضافة ملف جديد'}</h3>
        
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">عنوان الملف</label>
            <input 
              type="text" 
              value={editingItem?.title || ''} 
              onChange={e => setEditingItem({...editingItem, title: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">نوع الملف</label>
              <select 
                value={editingItem?.type || 'pdf'} 
                onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pdf">PDF</option>
                <option value="doc">Word / Document</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">حجم الملف</label>
              <input 
                type="text" 
                value={editingItem?.size || ''} 
                onChange={e => setEditingItem({...editingItem, size: e.target.value})}
                placeholder="مثال: 2.5 MB"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">رابط الملف</label>
            <input 
              type="text" 
              value={editingItem?.url || ''} 
              onChange={e => setEditingItem({...editingItem, url: e.target.value})}
              placeholder="مثال: رابط المشاركة من جوجل درايف"
              className="w-full px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 mt-2">ضع رابط الملف المباشر أو رابط المشاركة السحابية (مثلاً رابط Google Drive).</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">
              حفظ
            </button>
            <button onClick={() => setIsEditing(false)} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-200">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h3 className="text-xl font-bold text-gray-800">إدارة المكتبة</h3>
          <p className="text-gray-500 mt-1">إدارة الملفات والمستندات الخاصة بهذه المادة</p>
        </div>
        <button 
          onClick={() => { setEditingItem({}); setIsEditing(true); }}
          className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة ملف جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjectItems.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingItem(item); setIsEditing(true); }} className="text-gray-400 hover:text-indigo-600">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => deleteLibraryItem(item.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h4 className="font-bold text-gray-800 mb-1">{item.title}</h4>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{item.size}</span>
              <span>•</span>
              <span>{item.downloads} تحميل</span>
            </div>
          </div>
        ))}
        {subjectItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            لا توجد ملفات في المكتبة حالياً.
          </div>
        )}
      </div>
    </div>
  );
};
