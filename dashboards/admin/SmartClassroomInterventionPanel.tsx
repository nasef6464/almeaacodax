import React, {useEffect, useRef, useState} from 'react';
import {CheckCircle2, PlusCircle, RefreshCw} from 'lucide-react';
import {api} from '../../services/api';
import {useStore} from '../../store/useStore';

type SkillEvidence = {skillId: string; evidenceCount: number; accuracy: number | null};
type Candidate = {studentId: string; name: string; schoolId: string; classId: string; skills?: SkillEvidence[]};
type Intervention = {_id: string; skillId: string; actionRef: string; targetStudentIds: string[]; status?: string};
const candidateKey = (student: Candidate) => JSON.stringify([student.studentId, student.schoolId, student.classId]);
const fieldClass = 'mt-1 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50';

export const SmartClassroomInterventionPanel: React.FC = () => {
  const {paths, subjects, skills, groups = []} = useStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [responseLimit, setResponseLimit] = useState(0);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [pathId, setPathId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [skillId, setSkillId] = useState('');
  const [minimumEvidence, setMinimumEvidence] = useState('3');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outcomeId, setOutcomeId] = useState('');
  const revision = useRef(0);
  const writePending = useRef(false);

  const load = async () => {
    const requestId = ++revision.current;
    setLoading(true);
    try {
      const [data, records] = await Promise.all([api.getSupervisorClassroomIntelligence(), api.getSupervisorInterventions()]);
      if (requestId !== revision.current) return;
      setCandidates(data.intelligence?.schoolPerformance?.smartClassroom?.studentSkillEvidence || []);
      setResponseLimit(data.intelligence?.bounds?.responseLimit || 0);
      setInterventions(records.interventions || []);
    } catch {
      if (requestId === revision.current) {
        setCandidates([]); setInterventions([]);
        setMessage('تعذر تحميل المتابعة. أعد المحاولة.');
      }
    } finally {
      if (requestId === revision.current) setLoading(false);
    }
  };
  useEffect(() => {void load(); return () => {revision.current++;};}, []);

  // Ambiguous catalog IDs cannot silently select another material's skill.
  const skillIdCounts = new Map<string, number>();
  for (const skill of skills) skillIdCounts.set(skill.id, (skillIdCounts.get(skill.id) || 0) + 1);
  const materialSkills = skills.filter(skill => skill.pathId === pathId && skill.subjectId === subjectId && skillIdCounts.get(skill.id) === 1);
  const availableCandidates = subjectId ? candidates.filter(student => student.skills?.some(evidence => materialSkills.some(skill => skill.id === evidence.skillId))) : [];
  const selected = availableCandidates.find(student => candidateKey(student) === studentKey);
  const availableSkills = materialSkills.filter(skill => selected?.skills?.some(evidence => evidence.skillId === skill.id && evidence.evidenceCount > 0));
  const selectedEvidence = selected?.skills?.find(skill => skill.skillId === skillId);
  const evidenceMinimum = Number(minimumEvidence);
  const activePath = paths.find(path => path.id === pathId && path.isActive !== false);
  const validSubject = subjects.some(subject => subject.id === subjectId && subject.pathId === pathId);
  const canCreate = !loading && !saving && !!activePath && validSubject && !!selected?.schoolId && !!selected.classId && availableSkills.some(skill => skill.id === skillId) && Number.isInteger(evidenceMinimum) && evidenceMinimum >= 1 && evidenceMinimum <= 500;
  const resetStudent = () => {setStudentKey(''); setSkillId(''); setMessage('');};

  const create = async () => {
    if (!canCreate || !selected || writePending.current) return;
    writePending.current = true; setSaving(true); setMessage('');
    const requestId = revision.current;
    try {
      await api.createSupervisorIntervention({schoolId: selected.schoolId, classId: selected.classId, skillId, targetStudentIds: [selected.studentId], pathId, minimumEvidence: evidenceMinimum});
      if (requestId !== revision.current) return;
      setMessage('تم إسناد خطة المتابعة للطالب.');
      await load();
    } catch {
      if (requestId === revision.current) setMessage('تعذر الإسناد. تحقق من نطاق الطالب وتفعيل الخدمة للمدرسة.');
    } finally {
      writePending.current = false;
      if (requestId === revision.current || requestId + 1 === revision.current) setSaving(false);
    }
  };
  const showOutcome = async (id: string) => {
    const requestId = revision.current;
    setOutcomeId(id); setMessage('');
    try {
      const result = await api.getSupervisorInterventionOutcome(id);
      if (requestId !== revision.current) return;
      const comparison = result.comparison;
      setMessage(comparison?.confidence === 'measured' && Number.isFinite(comparison.delta)
        ? `فرق الدقة قبل المتابعة وبعدها: ${comparison.delta} نقطة مئوية. لا يثبت بمفرده أثر الخطة.`
        : 'لا تتوفر مقارنة كافية قبل المتابعة وبعدها.');
    } catch {
      if (requestId === revision.current) setMessage('تعذر قراءة النتيجة. أعد المحاولة.');
    } finally {
      if (requestId === revision.current) setOutcomeId('');
    }
  };

  return <section aria-label="مركز التدخلات" className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5" dir="rtl">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><PlusCircle size={19} className="text-emerald-600"/> دعم الطلاب</h2>
      <button type="button" disabled={loading || saving || !!outcomeId} onClick={() => {setMessage(''); void load();}} className="shrink-0 rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50"><RefreshCw size={15} className="ml-1 inline"/>تحديث</button>
    </div>
    <p className="mt-2 text-xs text-slate-500">أدلة الحصص المتاحة ضمن حد {responseLimit || '—'} إجابة حديثة؛ اختر المادة ثم الطالب والمهارة.</p>
    {message && <p role="status" className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">{message}</p>}
    {loading ? <p role="status" className="py-6 text-sm text-slate-500">جارٍ تحميل المتابعة…</p> : <>
      <fieldset disabled={saving} className="mt-4 min-w-0 rounded-xl bg-slate-50 p-3 sm:p-4">
        <legend className="px-1 text-sm font-bold">خطة متابعة جديدة</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-xs font-bold">المسار<select className={fieldClass} value={activePath?.id || ''} onChange={event => {setPathId(event.target.value); setSubjectId(''); resetStudent();}}><option value="">اختر المسار</option>{paths.filter(path => path.isActive !== false).map(path => <option key={path.id} value={path.id}>{path.name}</option>)}</select></label>
          <label className="min-w-0 text-xs font-bold">المادة<select className={fieldClass} disabled={!activePath} value={validSubject ? subjectId : ''} onChange={event => {setSubjectId(event.target.value); resetStudent();}}><option value="">اختر المادة</option>{subjects.filter(subject => subject.pathId === pathId).map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label className="min-w-0 text-xs font-bold">الطالب<select className={fieldClass} disabled={!subjectId} value={selected ? studentKey : ''} onChange={event => {setStudentKey(event.target.value); setSkillId(''); setMessage('');}}><option value="">اختر الطالب</option>{availableCandidates.map((student, index) => <option key={candidateKey(student)} value={candidateKey(student)}>{student.name} — {groups.find(group => group.id === student.classId)?.name || `فصل ${index + 1}`}</option>)}</select></label>
          <label className="min-w-0 text-xs font-bold">المهارة<select className={fieldClass} disabled={!selected} value={availableSkills.some(skill => skill.id === skillId) ? skillId : ''} onChange={event => setSkillId(event.target.value)}><option value="">اختر المهارة</option>{availableSkills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
        </div>
        {(!candidates.length || (subjectId && !availableCandidates.length)) && <p className="mt-3 text-sm text-slate-500">لا توجد أدلة حصص متاحة لهذا الاختيار.</p>}
        {selectedEvidence && <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">دقة إجابات المهارة: {selectedEvidence.accuracy == null ? 'لم تُقَس' : `${selectedEvidence.accuracy}%`} · {selectedEvidence.evidenceCount} إجابة</p>}
        <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer py-2">إعدادات المتابعة</summary><label className="block max-w-xs py-2">الحد الأدنى للإجابات قبل المتابعة وبعدها<input type="number" min="1" max="500" step="1" className={fieldClass} value={minimumEvidence} onChange={event => setMinimumEvidence(event.target.value)}/></label></details>
        <p className="mt-2 text-xs text-slate-500">الخطة تتبع المسار المختار؛ لا تضمن تدريبًا حصريًا لهذه المهارة.</p>
        <button type="button" disabled={!canCreate} onClick={() => void create()} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">{saving ? 'جارٍ الإسناد…' : 'إسناد خطة متابعة'}</button>
      </fieldset>
      <div className="mt-5"><h3 className="text-sm font-bold text-slate-900">سجل المتابعة</h3>
        {interventions.length ? <div className="mt-3 space-y-2">{interventions.map(item => <article key={item._id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
          <div className="min-w-0 flex-1"><h4 className="break-words text-sm font-bold">{skills.find(skill => skill.id === item.skillId)?.name || 'مهارة غير متاحة في التصنيف'}</h4><p className="mt-1 text-xs text-slate-500">{paths.find(path => path.id === item.actionRef)?.name || 'مسار غير متاح'} · {item.targetStudentIds.length} طالب · {item.status === 'completed' ? 'مكتملة' : item.status === 'cancelled' ? 'ملغاة' : 'قيد المتابعة'}</p></div>
          <button type="button" disabled={saving || !!outcomeId} onClick={() => void showOutcome(item._id)} className="shrink-0 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50"><CheckCircle2 size={14} className="ml-1 inline"/>{outcomeId === item._id ? 'جارٍ القياس…' : 'قياس النتيجة'}</button>
        </article>)}</div> : <p className="mt-3 text-sm text-slate-500">لا توجد خطط متابعة في نطاقك بعد.</p>}
      </div>
    </>}
  </section>;
};
