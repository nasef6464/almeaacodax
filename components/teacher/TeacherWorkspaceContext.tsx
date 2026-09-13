import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export type TeacherWorkspaceData = {
  personas: { platformTrainer: boolean; schoolTeacher: boolean };
  schools: Array<{
    schoolId: string;
    schoolName: string;
    source: 'membership' | 'legacy';
    smartClassroomEnabled: boolean;
    assignments: Array<{
      assignmentId: string;
      classId: string;
      className: string;
      subjectId: string;
      studentCount: number;
      students: Array<{ studentId: string; name: string; isActive: boolean }>;
    }>;
    assessments: Array<{ assessmentId: string; title: string; subjectId: string; classIds: string[]; dueDate: string | null; quizKind: string }>;
  }>;
};

const TeacherWorkspaceContext = createContext<TeacherWorkspaceData | null>(null);

export const useTeacherWorkspaceOptional = () => useContext(TeacherWorkspaceContext);

export const TeacherWorkspaceGate: React.FC<{
  workspace: 'platform' | 'school';
  children: React.ReactNode;
}> = ({ workspace, children }) => {
  const [data, setData] = useState<TeacherWorkspaceData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api.getSchoolTeacherWorkspace()
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (failed) return <Navigate to="/dashboard" replace />;
  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-indigo-600"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  if (workspace === 'platform' && !data.personas.platformTrainer) {
    return <Navigate to={data.personas.schoolTeacher ? '/school-teacher-dashboard' : '/dashboard'} replace />;
  }
  if (workspace === 'school' && !data.personas.schoolTeacher) {
    return <Navigate to={data.personas.platformTrainer ? '/instructor-dashboard' : '/dashboard'} replace />;
  }
  return <TeacherWorkspaceContext.Provider value={data}>{children}</TeacherWorkspaceContext.Provider>;
};
