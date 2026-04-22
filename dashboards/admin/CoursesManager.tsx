import React, { useState } from 'react';
import { Course } from '../../types';
import { useStore } from '../../store/useStore';
import { AdvancedCourseBuilder } from './AdvancedCourseBuilder';
import { Plus, Search, Edit2, Trash2, Eye, Star, Users } from 'lucide-react';

interface CoursesManagerProps {
  subjectId?: string;
}

export const CoursesManager: React.FC<CoursesManagerProps> = ({ subjectId }) => {
  const { courses, addCourse, updateCourse, deleteCourse } = useStore();
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreateNew = () => {
    setEditingCourse(subjectId ? { subject: subjectId } as Partial<Course> as Course : undefined);
    setIsBuilding(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsBuilding(true);
  };

  const handleSaveCourse = (courseData: Partial<Course>) => {
    if (editingCourse?.id) {
      // Update existing
      updateCourse(editingCourse.id, courseData);
    } else {
      // Create new
      const newCourse = {
        ...courseData,
        id: `course_${Date.now()}`,
        subject: subjectId || courseData.subject || '',
      } as Course;
      addCourse(newCourse);
    }
    setIsBuilding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الدورة بشكل نهائي؟')) {
      deleteCourse(id);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectId ? c.subject === subjectId : true;
    return matchesSearch && matchesSubject;
  });

  if (isBuilding) {
    return (
      <AdvancedCourseBuilder 
        initialCourse={editingCourse} 
        onSave={handleSaveCourse} 
        onCancel={() => setIsBuilding(false)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">إدارة الدورات (LMS)</h2>
          <p className="text-gray-500 text-sm mt-1">قم بإنشاء وتعديل الدورات، الوحدات، والدروس.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إنشاء دورة جديدة
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="ابحث عن دورة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الدورة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">القسم</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">السعر</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">إحصائيات (وهمية/حقيقية)</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الحالة</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCourses.map(course => (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={course.thumbnail || 'https://via.placeholder.com/150'} alt={course.title} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-gray-800">{course.title}</div>
                        <div className="text-xs text-gray-500">{course.instructor}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">
                      {course.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-emerald-600">{course.price} {course.currency}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users size={12} /> {course.fakeStudentsCount || course.studentCount || 0} طالب
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400" /> {course.fakeRating || course.rating || 0} تقييم
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      course.isPublished !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {course.isPublished !== false ? 'منشور' : 'مسودة'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(course)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="تعديل المنهج والإعدادات">
                        <Edit2 size={18} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="معاينة">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleDelete(course.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    لا توجد دورات مطابقة للبحث.
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
