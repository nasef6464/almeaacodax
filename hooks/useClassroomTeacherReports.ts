import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { normalizeClassroomReport, type CanonicalClassroomReport, type ClassroomSavedReport } from '../components/classroom/classroomReportViewModel';

export function useClassroomTeacherReports(schoolId: string, enabled = true) {
  const version = useRef(0);
  const pending = useRef(false);
  const [state, setState] = useState<{ schoolId: string; reports: CanonicalClassroomReport[]; loading: boolean; error: string }>({ schoolId: '', reports: [], loading: false, error: '' });

  const reload = useCallback(async () => {
    if (!schoolId || !enabled || pending.current) return;
    const requestVersion = ++version.current;
    pending.current = true;
    setState({ schoolId, reports: [], loading: true, error: '' });
    try {
      const result = await api.getClassroomTeacherHistory(schoolId, undefined, 'summary');
      if (requestVersion !== version.current) return;
      const reports = (Array.isArray(result?.sessions) ? result.sessions : [])
        .map((session) => normalizeClassroomReport(session as ClassroomSavedReport))
        .filter((report) => report.status === 'ended' || report.status === 'archived' || Boolean(report.endedAt));
      setState({ schoolId, reports, loading: false, error: '' });
    } catch {
      if (requestVersion === version.current) setState({ schoolId, reports: [], loading: false, error: 'تعذر تحميل تقارير الحصص. حاول مرة أخرى.' });
    } finally {
      if (requestVersion === version.current) pending.current = false;
    }
  }, [schoolId, enabled]);

  useEffect(() => {
    void reload();
    return () => { ++version.current; pending.current = false; };
  }, [reload]);

  const current = enabled && schoolId && state.schoolId === schoolId;
  return { reports: current ? state.reports : [], loading: current ? state.loading : Boolean(enabled && schoolId), error: current ? state.error : '', reload };
}
