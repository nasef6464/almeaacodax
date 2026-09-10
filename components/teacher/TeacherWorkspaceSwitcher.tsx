import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, School } from 'lucide-react';
import { useTeacherWorkspaceOptional } from './TeacherWorkspaceContext';

export const TeacherWorkspaceSwitcher: React.FC = () => {
  const data = useTeacherWorkspaceOptional();
  const location = useLocation();
  if (!data?.personas.platformTrainer || !data.personas.schoolTeacher) return null;
  const schoolActive = location.pathname.startsWith('/school-teacher-dashboard');
  return (
    <div data-testid="teacher-context-switcher" className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 text-xs font-black">
      <Link to="/instructor-dashboard" className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 ${!schoolActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
        <BookOpen size={14} /> المنصة
      </Link>
      <Link to="/school-teacher-dashboard" className={`flex items-center justify-center gap-1 rounded-lg px-2 py-2 ${schoolActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
        <School size={14} /> المدرسة
      </Link>
    </div>
  );
};
