import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '../../../services/api';

const MODULES = ['SCHOOL_CORE', 'QUESTION_BANK', 'SCHOOL_ASSESSMENTS', 'PATHS_AND_COURSES', 'INTERACTIVE_VIDEO', 'SMART_CLASSROOM', 'SCHOOL_INTELLIGENCE', 'INTERVENTION_CENTER', 'LIVE_TUTORING', 'WHITE_LABEL', 'EXECUTIVE_ANALYTICS'];

export const SchoolContractPanel: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [modules, setModules] = useState<string[]>(['SCHOOL_CORE']);
  const [status, setStatus] = useState('active');
  const [notice, setNotice] = useState('');
  useEffect(() => { void api.getSchoolContract(schoolId).then(({ contract }) => { if (contract) { setModules(contract.modules); setStatus(contract.status); } }).catch(() => setNotice('تعذر قراءة العقد الآن.')); }, [schoolId]);
  const toggle = (module: string) => setModules((current) => module === 'SCHOOL_CORE' ? current : current.includes(module) ? current.filter((item) => item !== module) : [...current, module]);
  const save = async () => { setNotice('جارٍ حفظ العقد...'); try { await api.updateSchoolContract(schoolId, { status, modules }); setNotice('تم حفظ وحدات العقد من الخادم.'); } catch { setNotice('تعذر حفظ العقد.'); } };
  return <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4" data-testid="school-contract-panel">
    <div className="flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-black text-slate-900"><ShieldCheck size={18} /> عقد المدرسة والوحدات</h3><p className="mt-1 text-xs text-slate-600">الوحدات تُطبّق من الخادم على الميزات الجديدة.</p></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-white px-2 py-1 text-sm"><option value="active">نشط</option><option value="inactive">موقوف</option><option value="expired">منتهي</option></select></div>
    <div className="mt-3 flex flex-wrap gap-2">{MODULES.map((module) => <label key={module} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold ${modules.includes(module) ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}><input className="sr-only" type="checkbox" checked={modules.includes(module)} disabled={module === 'SCHOOL_CORE'} onChange={() => toggle(module)} />{module}</label>)}</div>
    <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-600">{notice}</span><button type="button" onClick={() => void save()} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-black text-white">حفظ العقد</button></div>
  </section>;
};
