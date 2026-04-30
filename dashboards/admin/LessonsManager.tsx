import React, { useMemo, useState } from 'react';
import { Lesson } from '../../types';
import { Plus, Search, Edit2, Trash2, Play, FileText, Lock, LockOpen, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { UnifiedLessonBuilder } from './builders/UnifiedLessonBuilder';

interface LessonsManagerProps {
  subjectId?: string;
}

const getStatusMeta = (lesson: Lesson) => {
  if (lesson.approvalStatus === 'rejected') {
    return { label: 'مرفوض', className: 'bg-red-50 text-red-600' };
  }

  if (lesson.approvalStatus === 'pending_review') {
    return { label: 'بانتظار المراجعة', className: 'bg-amber-50 text-amber-600' };
  }

  if (lesson.approvalStatus === 'approved') {
    return { label: 'معتمد', className: 'bg-emerald-50 text-emerald-600' };
  }

  return { label: 'محتوى قديم', className: 'bg-gray-100 text-gray-600' };
};

const getVisibilityMeta = (lesson: Lesson) =>
  lesson.showOnPlatform === false
    ? { label: 'مخفي عن المنصة', className: 'bg-gray-100 text-gray-600' }
    : { label: 'ظاهر على المنصة', className: 'bg-sky-50 text-sky-700' };

export const LessonsManager: React.FC<LessonsManagerProps> = ({ subjectId }) => {
  const { user, lessons: globalLessons, addLesson, updateLesson, deleteLesson, paths, subjects, sections, skills, topics } = useStore();
  const canReview = user.role === 'admin';
  const managedPathIds = user.managedPathIds || [];
  const managedSubjectIds = user.managedSubjectIds || [];
  const allowedPaths = user.role === 'teacher'
    ? paths.filter((path) => managedPathIds.length === 0 || managedPathIds.includes(path.id))
    : paths;
  const allowedSubjects = user.role === 'teacher'
    ? subjects.filter((subject) => {
        if (managedSubjectIds.length > 0) return managedSubjectIds.includes(subject.id);
        if (managedPathIds.length > 0) return managedPathIds.includes(subject.pathId);
        return true;
      })
    : subjects;

  const [selectedPathId, setSelectedPathId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const lessons = globalLessons.filter((lesson) => {
    if (user.role === 'teacher') {
      if (managedSubjectIds.length > 0 && !managedSubjectIds.includes(lesson.subjectId)) return false;
      if (managedPathIds.length > 0 && lesson.pathId && !managedPathIds.includes(lesson.pathId)) return false;
    }
    if (subjectId && lesson.subjectId !== subjectId) return false;
    if (selectedSubjectId && lesson.subjectId !== selectedSubjectId) return false;
    if (selectedSectionId && lesson.sectionId !== selectedSectionId) return false;
    if (selectedPathId && !subjectId && !selectedSubjectId && lesson.pathId !== selectedPathId) return false;
    if (selectedSkillId && (!lesson.skillIds || !lesson.skillIds.includes(selectedSkillId))) return false;
    return true;
  });

  const [currentLesson, setCurrentLesson] = useState<Partial<Lesson>>({
    title: '',
    type: 'video',
    duration: '0',
    isCompleted: false,
    subjectId: selectedSubjectId || '',
    sectionId: selectedSectionId || '',
    pathId: selectedPathId || '',
    skillIds: [],
    order: 1,
    showOnPlatform: false,
  });

  const availableMainSkills = useMemo(
    () => sections.filter((section) => section.subjectId === selectedSubjectId && allowedSubjects.some((subject) => subject.id === section.subjectId)),
    [allowedSubjects, sections, selectedSubjectId],
  );

  const availableSubSkills = useMemo(
    () =>
      skills
        .filter((skill) => skill.subjectId === selectedSubjectId && (!selectedSectionId || skill.sectionId === selectedSectionId))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [skills, selectedSectionId, selectedSubjectId],
  );

  const subSkillNameMap = useMemo(() => new Map(availableSubSkills.map((skill) => [skill.id, skill.name])), [availableSubSkills]);

  const handleCreateNew = () => {
    setCurrentLesson({
      title: '',
      type: 'video',
      duration: '0',
      isCompleted: false,
      subjectId: selectedSubjectId || '',
      sectionId: selectedSectionId || '',
      pathId: selectedPathId || '',
      skillIds: [],
      order: lessons.length + 1,
      showOnPlatform: false,
    });
    setIsEditing(true);
  };

  const handleEdit = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدرس نهائيًا؟')) {
      deleteLesson(id);
    }
  };

  const handleDuplicate = (lesson: Lesson) => {
    const duplicatedLesson: Lesson = {
      ...lesson,
      id: `l_${Date.now()}_copy`,
      title: `${lesson.title} (نسخة)`,
      approvalStatus: 'draft',
      showOnPlatform: false,
    };
    addLesson(duplicatedLesson);
  };

  const handleSave = (_moduleId: string | undefined, lessonToSave: Lesson) => {
    if (currentLesson.id) {
      updateLesson(lessonToSave.id, lessonToSave);
    } else {
      addLesson({
        ...lessonToSave,
        id: `l_${Date.now()}`,
      });
    }
    setIsEditing(false);
  };

  const handleApprove = (lesson: Lesson) => {
    updateLesson(lesson.id, {
      approvalStatus: 'approved',
      approvedAt: Date.now(),
    });
  };

  const handleReject = (lesson: Lesson) => {
    updateLesson(lesson.id, {
      approvalStatus: 'rejected',
    });
  };

  const handleTogglePlatformVisibility = (lesson: Lesson) => {
    updateLesson(lesson.id, {
      showOnPlatform: lesson.showOnPlatform === false,
    });
  };

  const handlePreviewLesson = (lesson: Lesson) => {
    const topic = topics.find((item) => item.lessonIds?.includes(lesson.id));
    const pathId = lesson.pathId || topic?.pathId || selectedPathId || '';
    const targetSubjectId = lesson.subjectId || topic?.subjectId || selectedSubjectId;

    const params = new URLSearchParams();
    if (targetSubjectId) params.set('subject', targetSubjectId);
    params.set('tab', 'skills');
    params.set('content', 'lessons');
    params.set('lesson', lesson.id);
    if (topic?.id) params.set('topic', topic.id);

    window.open(`${window.location.origin}/#/category/${pathId}?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const filteredLessons = lessons.filter((lesson) => lesson.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isEditing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-120px)] animate-fade-in relative z-50">
        <UnifiedLessonBuilder initialLesson={currentLesson as Lesson} onSave={handleSave} onCancel={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">مركز الدروس</h2>
          <p className="text-gray-500 text-sm mt-1">إدارة الدروس واعتماد ما يُرفع من المعلمين قبل ظهوره في المنصة.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة درس جديد
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        {!subjectId && (
          <>
            <select
              value={selectedPathId}
              onChange={(e) => {
                setSelectedPathId(e.target.value);
                setSelectedSubjectId('');
                setSelectedSectionId('');
                setSelectedSkillId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">كل المسارات</option>
              {allowedPaths.map((path) => (
                <option key={path.id} value={path.id}>{path.name}</option>
              ))}
            </select>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedSectionId('');
                setSelectedSkillId('');
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!selectedPathId}
            >
              <option value="">كل المواد</option>
              {allowedSubjects.filter((subject) => subject.pathId === selectedPathId).map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </>
        )}
        <select
          value={selectedSectionId}
          onChange={(e) => {
            setSelectedSectionId(e.target.value);
            setSelectedSkillId('');
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!selectedSubjectId}
        >
          <option value="">كل المهارات الرئيسة</option>
          {availableMainSkills.map((section) => (
            <option key={section.id} value={section.id}>{section.name}</option>
          ))}
        </select>
        <select
          value={selectedSkillId}
          onChange={(e) => setSelectedSkillId(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!selectedSubjectId}
        >
          <option value="">كل المهارات الفرعية</option>
          {availableSubSkills.map((skill) => (
            <option key={skill.id} value={skill.id}>{skill.name}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="ابحث في عنوان الدرس..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">عنوان الدرس</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">النوع</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المدة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المادة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">المهارات الفرعية</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الحالة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLessons.map((lesson) => {
                const statusMeta = getStatusMeta(lesson);
                return (
                  <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lesson.type === 'video' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {lesson.type === 'video' ? <Play size={18} className="ml-1" /> : <FileText size={18} />}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{lesson.title}</div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            {lesson.ownerType === 'teacher' ? 'محتوى معلم' : lesson.ownerType === 'school' ? 'محتوى مدرسة' : 'محتوى المنصة'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {lesson.type === 'video' ? 'فيديو' : lesson.type === 'text' ? 'مقال' : 'درس تفاعلي'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{lesson.duration} دقيقة</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">
                        {subjects.find((subject) => subject.id === lesson.subjectId)?.name || 'غير محدد'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(lesson.skillIds || []).slice(0, 3).map((skillId) => (
                          <span key={skillId} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs font-bold">
                            {subSkillNameMap.get(skillId) || 'مهارة'}
                          </span>
                        ))}
                        {(lesson.skillIds || []).length > 3 && (
                          <span className="text-xs text-gray-500">+{(lesson.skillIds || []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusMeta.className}`}>{statusMeta.label}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getVisibilityMeta(lesson).className}`}>
                          {getVisibilityMeta(lesson).label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canReview && lesson.approvalStatus !== 'approved' && (
                          <button onClick={() => handleApprove(lesson)} className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                            اعتماد
                          </button>
                        )}
                        {canReview && lesson.approvalStatus !== 'rejected' && (
                          <button onClick={() => handleReject(lesson)} className="px-3 py-1 text-xs font-bold text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            رفض
                          </button>
                        )}
                        <button
                          onClick={() => handleTogglePlatformVisibility(lesson)}
                          className={`p-2 rounded-lg transition-colors ${
                            lesson.showOnPlatform === false ? 'text-gray-500 hover:bg-gray-100' : 'text-sky-600 hover:bg-sky-50'
                          }`}
                          title={lesson.showOnPlatform === false ? 'إظهار الدرس على المنصة' : 'إخفاء الدرس عن المنصة'}
                        >
                          {lesson.showOnPlatform === false ? <Lock size={18} /> : <LockOpen size={18} />}
                        </button>
                        <button onClick={() => handleDuplicate(lesson)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="نسخ">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button onClick={() => handleEdit(lesson)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handlePreviewLesson(lesson)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="معاينة الدرس قبل النشر">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleDelete(lesson.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLessons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    لا توجد دروس مطابقة للبحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
