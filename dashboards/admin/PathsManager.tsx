import React, { useState } from 'react';
import { CoursesManager } from './CoursesManager';
import { QuestionBankManager } from './QuestionBankManager';
import { FoundationManager } from './FoundationManager';
import { SkillsTreeManager } from './SkillsTreeManager';
import { QuizBuilder } from './QuizBuilder';
import { QuizzesManager } from './QuizzesManager';
import { LibraryManager } from './LibraryManager';
import { 
  FolderOpen, BookOpen, Target, FileQuestion, 
  Award, Library, ChevronLeft, Plus, Settings,
  Layers, Package, LayoutGrid, X, Lock
} from 'lucide-react';
import { useStore } from '../../store/useStore';

const getPathIcon = (path: any) => {
  if (path?.iconUrl) return <img src={path.iconUrl} alt={path.name} className="w-8 h-8 object-contain" />;
  return path?.icon || '📚';
};

const getPathColor = (path: any) => {
  const color = path?.color || 'gray';
  return `bg-${color}-100 text-${color}-600`;
};

const getSubjectIcon = (subject: any) => {
  if (subject?.iconUrl) return <img src={subject.iconUrl} alt={subject.name} className="w-8 h-8 object-contain" />;
  return subject?.icon || '📖';
};

const getSubjectColor = (subject: any) => {
  const color = subject?.color || 'gray';
  return `bg-${color}-100 text-${color}-600`;
};

export const PathsManager: React.FC = () => {
  const { paths, levels, subjects, courses, questions } = useStore();
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  
  // Tabs for Path Overview
  const [pathTab, setPathTab] = useState<'levels' | 'subjects' | 'packages' | 'settings'>('subjects');
  // Tabs for Subject Workspace
  const [subjectTab, setSubjectTab] = useState<'courses' | 'skills' | 'questions' | 'exams' | 'library' | 'settings'>('courses');

  // Modals state
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<any>(null);
  const [newPathName, setNewPathName] = useState('');
  const [newPathColor, setNewPathColor] = useState('indigo');
  const [newPathIcon, setNewPathIcon] = useState('📚');
  const [newPathIconUrl, setNewPathIconUrl] = useState('');
  const [newPathIconStyle, setNewPathIconStyle] = useState<'default' | 'modern' | 'minimal' | 'playful'>('default');
  const [newPathIsActive, setNewPathIsActive] = useState(true);
  const [newPathParentId, setNewPathParentId] = useState('');
  const [newPathDesc, setNewPathDesc] = useState('');
  const [newPathShowInNavbar, setNewPathShowInNavbar] = useState(true);

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [newLevelName, setNewLevelName] = useState('');
  
  // Delete Confirmation Modal State
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string | null, type: string, title: string, message: string}>({isOpen: false, id: null, type: '', title: '', message: ''});
  
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('indigo');
  const [newSubjectIcon, setNewSubjectIcon] = useState('📖');
  const [newSubjectIconUrl, setNewSubjectIconUrl] = useState('');
  const [newSubjectIconStyle, setNewSubjectIconStyle] = useState<'default' | 'modern' | 'minimal' | 'playful'>('default');

  const currentPath = paths.find(p => p.id === selectedPathId);
  const pathLevels = levels?.filter(l => l.pathId === selectedPathId) || [];
  const currentLevel = levels?.find(l => l.id === selectedLevelId);
  const pathSubjects = subjects.filter(s => s.pathId === selectedPathId && (selectedLevelId ? s.levelId === selectedLevelId : true));
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPath = () => {
    if (!newPathName.trim()) return;
    
    if (editingPath) {
      useStore.getState().updatePath(editingPath.id, {
        name: newPathName.trim(),
        color: newPathColor,
        icon: newPathIcon,
        iconUrl: newPathIconUrl,
        iconStyle: newPathIconStyle,
        description: newPathDesc,
        showInNavbar: newPathShowInNavbar,
        isActive: newPathIsActive,
        parentPathId: newPathParentId || null
      });
    } else {
      const pId = `p_${Date.now()}`;
      const newPath = {
        id: pId,
        name: newPathName.trim(),
        color: newPathColor,
        icon: newPathIcon,
        iconUrl: newPathIconUrl,
        iconStyle: newPathIconStyle,
        description: newPathDesc,
        showInNavbar: newPathShowInNavbar,
        isActive: newPathIsActive,
        parentPathId: newPathParentId || null
      };
      
      useStore.getState().addPath(newPath);
    }
    
    setEditingPath(null);
    setNewPathName('');
    setNewPathIconUrl('');
    setNewPathParentId('');
    setIsPathModalOpen(false);
  };

  const openEditPath = (path: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPath(path);
    setNewPathName(path.name);
    setNewPathColor(path.color || 'indigo');
    setNewPathIcon(path.icon || '📚');
    setNewPathIconUrl(path.iconUrl || '');
    setNewPathIconStyle(path.iconStyle || 'default');
    setNewPathDesc(path.description || '');
    setNewPathShowInNavbar(path.showInNavbar !== false);
    setNewPathIsActive(path.isActive !== false);
    setNewPathParentId(path.parentPathId || '');
    setIsPathModalOpen(true);
  };

  const handleDeletePath = (pathId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      id: pathId,
      type: 'path',
      title: 'حذف مسار',
      message: 'هل أنت متأكد من حذف هذا المسار وجميع مواده ومراحله؟'
    });
  };

  const handleAddLevel = () => {
    if (!newLevelName.trim() || !selectedPathId) return;

    if (editingLevel) {
      useStore.getState().updateLevel(editingLevel.id, {
        name: newLevelName.trim()
      });
    } else {
      const newLevel = {
        id: `l_${Date.now()}`,
        pathId: selectedPathId,
        name: newLevelName.trim()
      };
      useStore.getState().addLevel(newLevel);
    }
    setEditingLevel(null);
    setNewLevelName('');
    setIsLevelModalOpen(false);
  };

  const openEditLevel = (level: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLevel(level);
    setNewLevelName(level.name);
    setIsLevelModalOpen(true);
  };

  const handleDeleteLevel = (levelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      id: levelId,
      type: 'level',
      title: 'حذف مرحلة دراسية',
      message: 'هل أنت متأكد من حذف هذه المرحلة؟ سيتم حذف جميع المواد بداخلها أيضاً.'
    });
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim() || !selectedPathId) return;
    
    if (editingSubject) {
       useStore.getState().updateSubject(editingSubject.id, {
         name: newSubjectName.trim(),
         levelId: selectedLevelId || null,
         color: newSubjectColor,
         icon: newSubjectIcon,
         iconUrl: newSubjectIconUrl,
         iconStyle: newSubjectIconStyle
       });
    } else {
      const newSubject = {
        id: `sub_${Date.now()}`,
        pathId: selectedPathId,
        levelId: selectedLevelId || null,
        name: newSubjectName.trim(),
        color: newSubjectColor,
        icon: newSubjectIcon,
        iconUrl: newSubjectIconUrl,
        iconStyle: newSubjectIconStyle
      };
      useStore.getState().addSubject(newSubject);
    }
    
    setEditingSubject(null);
    setNewSubjectName('');
    setNewSubjectIconUrl('');
    setNewSubjectIconStyle('default');
    setIsSubjectModalOpen(false);
  };

  const openEditSubject = (subject: any, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingSubject(subject);
      setNewSubjectName(subject.name);
      setNewSubjectColor(subject.color || 'indigo');
      setNewSubjectIcon(subject.icon || '📖');
      setNewSubjectIconUrl(subject.iconUrl || '');
      setNewSubjectIconStyle(subject.iconStyle || 'default');
      setIsSubjectModalOpen(true);
  };

  const handleDeleteSubject = (subjectId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteDialog({
          isOpen: true,
          id: subjectId,
          type: 'subject',
          title: 'حذف مادة',
          message: 'هل أنت متأكد من حذف هذه المادة؟'
      });
  };

  const confirmDelete = () => {
    if (!deleteDialog.id) return;
    
    if (deleteDialog.type === 'path') {
      useStore.getState().deletePath(deleteDialog.id);
      if (selectedPathId === deleteDialog.id) setSelectedPathId(null);
    } else if (deleteDialog.type === 'level') {
      useStore.getState().deleteLevel(deleteDialog.id);
    } else if (deleteDialog.type === 'subject') {
      useStore.getState().deleteSubject(deleteDialog.id);
      if (selectedSubjectId === deleteDialog.id) setSelectedSubjectId(null);
    }
    
    setDeleteDialog({ ...deleteDialog, isOpen: false });
  };

  const renderDeleteModal = () => {
    if (!deleteDialog.isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center animate-fade-in p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="p-6">
                    <h3 className="font-bold text-xl text-gray-800 mb-2">{deleteDialog.title}</h3>
                    <p className="text-gray-600 mb-6">{deleteDialog.message}</p>
                    
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
                            className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="button"
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            تأكيد الحذف
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // ---------------------------------------------------------------------------
  // VIEW 1: List of All Paths
  // ---------------------------------------------------------------------------
  if (!selectedPathId) {
    return (
      <>
        {renderDeleteModal()}
        <div className="space-y-6 animate-fade-in relative">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">إدارة المسارات التعليمية</h2>
            <p className="text-gray-500 text-sm mt-1">اختر المسار لإدارة مواده وباقاته.</p>
          </div>
          <button 
            onClick={() => setIsPathModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            إضافة مسار جديد
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map((path, index) => {
            const pathSubs = subjects.filter(s => s.pathId === path.id);
            return (
              <div 
                key={`path-${path.id}-${index}`}
                onClick={() => setSelectedPathId(path.id)}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${getPathColor(path)}`}>
                    {getPathIcon(path)}
                  </div>
                  <div className="flex gap-2">
                      <button onClick={(e) => openEditPath(path, e)} className="text-gray-400 hover:text-indigo-600 transition-colors p-2">
                        <Settings size={18} />
                      </button>
                      <button onClick={(e) => handleDeletePath(path.id, e)} className="text-gray-400 hover:text-red-600 transition-colors p-2">
                        <X size={18} />
                      </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{path.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Layers size={14} /> {pathSubs.length} مواد</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal for adding path */}
        {isPathModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800">{editingPath ? 'تعديل المسار' : 'إضافة مسار جديد'}</h3>
                <button onClick={() => { setIsPathModalOpen(false); setEditingPath(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم المسار</label>
                  <input
                    type="text"
                    value={newPathName}
                    onChange={(e) => setNewPathName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="مثال: القدرات, التحصيلي..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">وصف قصير (يظهر في القوائم)</label>
                  <input
                    type="text"
                    value={newPathDesc}
                    onChange={(e) => setNewPathDesc(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="تأسيس شامل، تدريب مكثف..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">اللون المميز (اختر من القائمة أو لون مخصص)</label>
                    <div className="flex items-center gap-2">
                        <select
                          value={newPathColor.startsWith('#') ? 'custom' : newPathColor}
                          onChange={(e) => {
                              if (e.target.value !== 'custom') setNewPathColor(e.target.value);
                              else setNewPathColor('#6366f1');
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white flex-1"
                        >
                          <option value="indigo">نيلي (Indigo)</option>
                          <option value="blue">أزرق (Blue)</option>
                          <option value="sky">أزرق فاتح (Sky)</option>
                          <option value="cyan">سماوي (Cyan)</option>
                          <option value="teal">أخضر مزرق (Teal)</option>
                          <option value="emerald">أخضر (Emerald)</option>
                          <option value="green">أخضر طبيعي (Green)</option>
                          <option value="lime">ليموني (Lime)</option>
                          <option value="yellow">أصفر (Yellow)</option>
                          <option value="amber">كهرماني (Amber)</option>
                          <option value="orange">برتقالي (Orange)</option>
                          <option value="red">أحمر (Red)</option>
                          <option value="rose">وردي أحمر (Rose)</option>
                          <option value="pink">وردي فاتح (Pink)</option>
                          <option value="fuchsia">فوشيا (Fuchsia)</option>
                          <option value="purple">بنفسجي (Purple)</option>
                          <option value="violet">بنفسجي فاتح (Violet)</option>
                          <option value="slate">رمادي مزرق (Slate)</option>
                          <option value="gray">رمادي (Gray)</option>
                          <option value="custom">لون مخصص (كود Hex)</option>
                        </select>
                        {newPathColor.startsWith('#') && (
                            <input 
                                type="color" 
                                value={newPathColor} 
                                onChange={(e) => setNewPathColor(e.target.value)}
                                className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 shadow-sm"
                                title="اختر لون مخصص"
                            />
                        )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الأيقونة (إيموجي أو صورة)</label>
                    <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newPathIcon}
                          onChange={(e) => setNewPathIcon(e.target.value)}
                          className="w-16 px-2 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center text-xl"
                          placeholder="📚"
                          maxLength={2}
                          disabled={!!newPathIconUrl}
                        />
                        <div className="flex-1 relative">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleIconUpload(e, setNewPathIconUrl)} 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              title="رفع أيقونة صورة"
                            />
                            <div className="w-full h-full min-h-[46px] border border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 text-sm font-bold text-indigo-600 hover:bg-gray-100 transition-colors">
                                {newPathIconUrl ? 'تغيير الصورة المرفوعة' : 'رفع صورة...'}
                            </div>
                        </div>
                        {newPathIconUrl && (
                            <button onClick={() => setNewPathIconUrl('')} className="p-2 text-red-500 hover:bg-red-50 rounded-xl">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نمط الأيقونة والتصميم</label>
                    <select
                      value={newPathIconStyle}
                      onChange={(e) => setNewPathIconStyle(e.target.value as any)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="default">الافتراضي (دائري بسيط)</option>
                      <option value="modern">حديث (بطاقات مفرغة)</option>
                      <option value="minimal">بسيط (بدون خلفيات)</option>
                      <option value="playful">مرح (ألوان زاهية وظلال)</option>
                    </select>
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">مسار رئيسي أم متفرع؟ (اختياري)</label>
                   <select
                      value={newPathParentId}
                      onChange={(e) => setNewPathParentId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                   >
                      <option value="">مسار رئيسي (مستقل)</option>
                      {paths.filter(p => (!editingPath || p.id !== editingPath.id) && !p.parentPathId).map((p, pidx) => (
                          <option key={`popt-${p.id}-${pidx}`} value={p.id}>متفرع من: {p.name}</option>
                      ))}
                   </select>
                </div>
                <div className="space-y-3 mt-4">
                  <label className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer border border-transparent hover:border-gray-200">
                    <input 
                      type="checkbox" 
                      checked={newPathIsActive} 
                      onChange={e => setNewPathIsActive(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="font-medium text-gray-700">تفعيل وعرض هذا المسار للطلاب</span>
                  </label>
                  <label className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer border border-transparent hover:border-gray-200">
                    <input 
                      type="checkbox" 
                      checked={newPathShowInNavbar} 
                      onChange={e => setNewPathShowInNavbar(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded"
                    />
                    <span className="font-medium text-gray-700">إظهار هذا المسار في القائمة العلوية الرئيسة</span>
                  </label>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsPathModalOpen(false); setEditingPath(null); }} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                  إلغاء
                </button>
                <button type="button" onClick={handleAddPath} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                  {editingPath ? 'حفظ التعديلات' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW 2: Path Overview (Subjects & Packages)
  // ---------------------------------------------------------------------------
  if (selectedPathId && !selectedSubjectId) {
    return (
      <>
        {renderDeleteModal()}
        <div className="space-y-6 animate-fade-in h-[calc(100vh-8rem)] flex flex-col">
        {/* Path Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedPathId(null)}
              className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft size={20} className="rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getPathIcon(currentPath)}</span>
                <h2 className="text-xl font-bold text-gray-800">إدارة: {currentPath?.name}</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">إدارة مواد المسار والباقات الشاملة.</p>
            </div>
          </div>
        </div>

        {/* Path Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setPathTab('levels')}
              className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
                pathTab === 'levels' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Target size={18} />
              المراحل الدراسية
            </button>
            <button
              onClick={() => setPathTab('subjects')}
              className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
                pathTab === 'subjects' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={18} />
              المواد الدراسية
            </button>
            <button
              onClick={() => setPathTab('packages')}
              className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
                pathTab === 'packages' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Package size={18} />
              الباقات الشاملة
            </button>
            <button
              onClick={() => setPathTab('settings')}
              className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
                pathTab === 'settings' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings size={18} />
              إعدادات المسار
            </button>
          </div>
        </div>

        {/* Path Content */}
        <div className="flex-1 overflow-y-auto">
          {pathTab === 'levels' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <p className="text-gray-600">
                    يمكنك تقسيم المسار إلى مراحل دراسية (مثلاً: الصف الأول، الصف الثاني). المواد ستكون تابعة لكل مرحلة.
                  </p>
                  <button 
                    onClick={() => setIsLevelModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} />
                    إضافة مرحلة دراسية
                  </button>
              </div>

              {pathLevels.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                      <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-bold text-gray-800">لا توجد مراحل دراسية</h3>
                      <p className="text-gray-500 mt-2">قم بإضافة مرحلة دراسية للبدء في تصنيف المواد داخله.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {pathLevels.map((level, lidx) => {
                          const levelSubjects = subjects.filter(s => s.levelId === level.id);
                          return (
                              <div key={`lvl-${level.id}-${lidx}`} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                  <div className="flex justify-between items-start mb-4">
                                      <h3 className="text-xl font-bold text-gray-800">{level.name}</h3>
                                      <div className="flex gap-2">
                                          <button onClick={(e) => openEditLevel(level, e)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                              <Settings size={16} />
                                          </button>
                                          <button onClick={(e) => handleDeleteLevel(level.id, e)} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                                              <X size={16} />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                                      <Layers size={16} /> 
                                      <span>{levelSubjects.length} مواد مرتبطة</span>
                                  </div>
                                  <div className="space-y-3">
                                      <h4 className="font-bold text-sm text-gray-700">مواد هذه المرحلة:</h4>
                                      <div className="flex flex-wrap gap-2">
                                          {levelSubjects.map((sub, sidx) => (
                                              <span key={`lsub-${sub.id}-${sidx}`} className="bg-gray-50 px-3 py-1 rounded-lg text-sm text-gray-600 border border-gray-100">
                                                  {sub.name}
                                              </span>
                                          ))}
                                          {levelSubjects.length === 0 && <span className="text-sm text-gray-400">لا توجد مواد</span>}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
            </div>
          )}

          {pathTab === 'subjects' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex justify-end">
                <button 
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  إضافة مادة جديدة
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pathSubjects.map((subject, sidx) => {
                  const subjectCoursesCount = courses.filter(c => c.subject === subject.id).length;
                  const subjectQuestionsCount = questions.filter(q => q.subject === subject.id).length;
                  return (
                    <div 
                      key={`psub-${subject.id}-${sidx}`}
                      onClick={() => setSelectedSubjectId(subject.id)}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${getSubjectColor(subject)}`}>
                          {getSubjectIcon(subject)}
                        </div>
                        <div className="flex gap-2">
                           <button onClick={(e) => openEditSubject(subject, e)} className="text-gray-400 hover:text-indigo-600 transition-colors p-2">
                              <Settings size={16} />
                           </button>
                           <button onClick={(e) => handleDeleteSubject(subject.id, e)} className="text-gray-400 hover:text-red-600 transition-colors p-2">
                              <X size={16} />
                           </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{subject.name}</h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md"><BookOpen size={14} /> {subjectCoursesCount} دورات</span>
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md"><FileQuestion size={14} /> {subjectQuestionsCount} سؤال</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pathTab === 'packages' && (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-in">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">إدارة الباقات الشاملة</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">هنا يمكنك إنشاء باقات تجمع بين مواد المسار (مثال: باقة القدرات الشاملة التي تحتوي على دورات الكمي واللفظي معاً بسعر مخفض).</p>
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2">
                <Plus size={18} />
                إنشاء باقة جديدة
              </button>
            </div>
          )}

          {pathTab === 'settings' && (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-in">
              <div className="w-20 h-20 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">إعدادات المسار</h3>
              <p className="text-gray-500 max-w-md mx-auto">تعديل اسم المسار، الأيقونة، اللون، وحالته (مفعل/معطل).</p>
            </div>
          )}
        </div>

        {/* Modal for adding Subject */}
        {isSubjectModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800">{editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h3>
                <button onClick={() => { setIsSubjectModalOpen(false); setEditingSubject(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اسم المادة</label>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="مثال: الكمي, اللفظي..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">اللون المميز (اختر من القائمة أو لون مخصص)</label>
                    <div className="flex items-center gap-2">
                        <select
                          value={newSubjectColor.startsWith('#') ? 'custom' : newSubjectColor}
                          onChange={(e) => {
                              if (e.target.value !== 'custom') setNewSubjectColor(e.target.value);
                              else setNewSubjectColor('#6366f1');
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white flex-1"
                        >
                          <option value="indigo">نيلي (Indigo)</option>
                          <option value="blue">أزرق (Blue)</option>
                          <option value="sky">أزرق فاتح (Sky)</option>
                          <option value="cyan">سماوي (Cyan)</option>
                          <option value="teal">أخضر مزرق (Teal)</option>
                          <option value="emerald">أخضر (Emerald)</option>
                          <option value="green">أخضر طبيعي (Green)</option>
                          <option value="lime">ليموني (Lime)</option>
                          <option value="yellow">أصفر (Yellow)</option>
                          <option value="amber">كهرماني (Amber)</option>
                          <option value="orange">برتقالي (Orange)</option>
                          <option value="red">أحمر (Red)</option>
                          <option value="rose">وردي أحمر (Rose)</option>
                          <option value="pink">وردي فاتح (Pink)</option>
                          <option value="fuchsia">فوشيا (Fuchsia)</option>
                          <option value="purple">بنفسجي (Purple)</option>
                          <option value="violet">بنفسجي فاتح (Violet)</option>
                          <option value="slate">رمادي مزرق (Slate)</option>
                          <option value="gray">رمادي (Gray)</option>
                          <option value="custom">لون مخصص (كود Hex)</option>
                        </select>
                        {newSubjectColor.startsWith('#') && (
                            <input 
                                type="color" 
                                value={newSubjectColor} 
                                onChange={(e) => setNewSubjectColor(e.target.value)}
                                className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 shadow-sm"
                                title="اختر لون مخصص"
                            />
                        )}
                    </div>
                  </div>
                  
                  {pathLevels.length > 0 && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">اختر المرحلة (اختياري)</label>
                      <select
                        value={selectedLevelId || ''}
                        onChange={(e) => setSelectedLevelId(e.target.value || null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="">بدون مرحلة (عامة)</option>
                        {pathLevels.map((l, lidx) => (
                          <option key={`poptlvl-${l.id}-${lidx}`} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">الأيقونة (إيموجي أو صورة)</label>
                    <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newSubjectIcon}
                          onChange={(e) => setNewSubjectIcon(e.target.value)}
                          className="w-16 px-2 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center text-xl"
                          placeholder="📖"
                          maxLength={2}
                          disabled={!!newSubjectIconUrl}
                        />
                        <div className="flex-1 relative">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleIconUpload(e, setNewSubjectIconUrl)} 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              title="رفع أيقونة صورة"
                            />
                            <div className="w-full h-full min-h-[46px] border border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 text-sm font-bold text-indigo-600 hover:bg-gray-100 transition-colors">
                                {newSubjectIconUrl ? 'تغيير الصورة المرفوعة' : 'رفع صورة...'}
                            </div>
                        </div>
                        {newSubjectIconUrl && (
                            <button onClick={() => setNewSubjectIconUrl('')} className="p-2 text-red-500 hover:bg-red-50 rounded-xl">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">نمط الأيقونة والتصميم</label>
                    <select
                      value={newSubjectIconStyle}
                      onChange={(e) => setNewSubjectIconStyle(e.target.value as any)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="default">الافتراضي (دائري بسيط)</option>
                      <option value="modern">حديث (بطاقات مفرغة)</option>
                      <option value="minimal">بسيط (بدون خلفيات)</option>
                      <option value="playful">مرح (ألوان زاهية وظلال)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsSubjectModalOpen(false); setEditingSubject(null); }} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                  إلغاء
                </button>
                <button type="button" onClick={handleAddSubject} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                  {editingSubject ? 'حفظ التعديلات' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for adding Level */}
        {isLevelModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="font-bold text-lg text-gray-800">{editingLevel ? 'تعديل المرحلة' : 'إضافة مرحلة دراسية'}</h3>
                <button type="button" onClick={() => { setIsLevelModalOpen(false); setEditingLevel(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">اسم المرحلة</label>
                <input
                  type="text"
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="مثال: الصف الأول المتوسط..."
                  autoFocus
                />
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsLevelModalOpen(false); setEditingLevel(null); }} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                  إلغاء
                </button>
                <button type="button" onClick={handleAddLevel} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                  {editingLevel ? 'حفظ التعديلات' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW 3: Subject Workspace (Courses, Skills, Questions, etc.)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-8rem)] flex flex-col">
      {/* Subject Header (Breadcrumb style) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedSubjectId(null)}
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-1">
              <span>{currentPath?.name}</span>
              <ChevronLeft size={14} />
              <span className="text-indigo-600">المواد</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getSubjectIcon(currentSubject)}</span>
              <h2 className="text-xl font-bold text-gray-800">مساحة عمل: {currentSubject?.name}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Workspace Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-shrink-0">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setSubjectTab('courses')}
            className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
              subjectTab === 'courses' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BookOpen size={18} />
            إدارة الدورات
          </button>
          <button
            onClick={() => setSubjectTab('skills')}
            className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
              subjectTab === 'skills' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Target size={18} />
            إدارة التأسيس (المواضيع)
          </button>
          <button
            onClick={() => setSubjectTab('questions')}
            className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
              subjectTab === 'questions' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileQuestion size={18} />
            إدارة التدريب
          </button>
          <button
            onClick={() => setSubjectTab('exams')}
            className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
              subjectTab === 'exams' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Award size={18} />
            إدارة الاختبارات المحاكية
          </button>
          <button
            onClick={() => setSubjectTab('library')}
            className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
              subjectTab === 'library' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Library size={18} />
            إدارة المكتبة
          </button>
          <button
            onClick={() => setSubjectTab('settings')}
            className={`flex-1 py-4 px-6 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 min-w-[150px] ${
              subjectTab === 'settings' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings size={18} />
            التحكم بصفحة الطالب
          </button>
        </div>
      </div>

      {/* Subject Workspace Content Area */}
      <div className="flex-1 overflow-y-auto">
        {subjectTab === 'courses' && (
          <div className="animate-fade-in">
            <CoursesManager subjectId={currentSubject?.id || ''} />
          </div>
        )}
        
        {subjectTab === 'skills' && (
          <FoundationManager subjectId={currentSubject?.id || ''} />
        )}

        {subjectTab === 'questions' && (
          <div className="animate-fade-in p-6">
            <QuizzesManager subjectId={currentSubject?.id || ''} filterType="bank" />
          </div>
        )}

        {subjectTab === 'exams' && (
          <div className="animate-fade-in p-6">
            <QuizzesManager subjectId={currentSubject?.id || ''} filterType="quiz" />
          </div>
        )}

        {subjectTab === 'library' && (
          <div className="animate-fade-in p-6">
            <LibraryManager subjectId={currentSubject?.id || ''} />
          </div>
        )}

        {subjectTab === 'settings' && currentSubject && (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-in">
            <div className="w-20 h-20 bg-gray-50 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">التحكم بصفحة الطالب ({currentSubject.name})</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">من هنا يمكنك التحكم بما يظهر للطالب في صفحة التعلم الخاصة بهذه المادة.</p>
            
            <div className="max-w-2xl mx-auto text-right space-y-4">
              {[
                { key: 'showCourses', label: 'تبويب "الدورات"', desc: 'إظهار أو إخفاء تبويب الدورات بالكامل.', default: true },
                { key: 'showSkills', label: 'تبويب "التأسيس" (الموضوعات)', desc: 'إظهار أو إخفاء تبويب التأسيس بالكامل.', default: true },
                { key: 'lockSkillsForNonSubscribers', label: 'قفل التأسيس لغير المشتركين', desc: 'سيظهر المحتوى وعليه علامة 🔒 للطلاب غير المشتركين.', default: false },
                { key: 'showBanks', label: 'تبويب "التدريب الحر"', desc: 'إظهار أو إخفاء تبويب التدريب بالكامل.', default: true },
                { key: 'lockBanksForNonSubscribers', label: 'قفل التدريب لغير المشتركين', desc: 'سيظهر التدريب وعليها علامة 🔒 للطلاب غير المشتركين.', default: false },
                { key: 'showTests', label: 'تبويب "الاختبارات المحاكية"', desc: 'إظهار أو إخفاء تبويب الاختبارات بالكامل.', default: true },
                { key: 'lockTestsForNonSubscribers', label: 'قفل الاختبارات لغير المشتركين', desc: 'سيظهر الاختبار وعليه علامة 🔒 للطلاب غير المشتركين.', default: false },
                { key: 'showLibrary', label: 'تبويب "المكتبة"', desc: 'إظهار أو إخفاء تبويب المكتبة بالكامل.', default: true },
                { key: 'lockLibraryForNonSubscribers', label: 'قفل المكتبة لغير المشتركين', desc: 'سيظهر الملف وعليه علامة 🔒 للطلاب غير المشتركين.', default: false },
              ].map((setting) => {
                  const val = currentSubject.settings?.[setting.key as keyof typeof currentSubject.settings] ?? setting.default;
                  return (
                      <div key={setting.key} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => {
                          const currentSettings = currentSubject.settings || {};
                          useStore.getState().updateSubject(currentSubject.id, {
                              settings: {
                                  ...currentSettings,
                                  [setting.key]: !val
                              }
                          });
                      }}>
                        <div>
                          <h4 className="font-bold text-gray-800">{setting.label}</h4>
                          <p className="text-xs text-gray-500 mt-1">{setting.desc}</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={val as boolean} 
                            onChange={() => {}} // handled by parent div
                            className="w-5 h-5 text-indigo-600 rounded cursor-pointer" 
                        />
                      </div>
                  );
              })}
            </div>
          </div>
        )}
      </div>

      {renderDeleteModal()}
    </div>
  );
};
