import {DirectorCatalogFields} from './school-director/DirectorCatalogFields';
import {DirectorQuestionPicker} from './school-director/DirectorQuestionPicker';
import {DirectorAssessmentCards,type DirectorAssessment} from './school-director/DirectorAssessmentCards';
import React, { useEffect, useState } from "react";
import { BookOpenCheck, BrainCircuit, Radio, ShieldAlert } from "lucide-react";
import { api } from "../services/api";

type School = {
  schoolId: string;
  schoolName: string;
  permissions: string[];
  modules: string[];
};
type Classroom = { classId: string; className: string };
type Student = { studentId: string; name: string; classId?:string };

export const SchoolDirectorAcademicCenter: React.FC<{
  school: School;
  area?: 'assessments'|'sessions'|'interventions'|'transfer';
  schools: School[];
  classes: Classroom[];
  students: Student[];
  onRefresh: () => Promise<void>;
}> = ({ school, schools, classes, students, onRefresh, area }) => {
  const can = (permission: string, module: string) =>
    school.permissions.includes(permission) && school.modules.includes(module) && (!area || (permission.startsWith('SCHOOL_ASSESSMENTS')?area==='assessments':permission.startsWith('SCHOOL_SMART')?area==='sessions':permission.startsWith('SCHOOL_INTERVENTIONS')?area==='interventions':area==='transfer'));
  const [assessments,setAssessments]=useState<DirectorAssessment[]>([]);
  const [showCreate,setShowCreate]=useState(false);
  const [interventionSubject,setInterventionSubject]=useState('');
  const [counts, setCounts] = useState({
    assessments: 0,
    sessions: 0,
    interventions: 0,
  });
  const [assessment, setAssessment] = useState({
    title: "",
    classId: classes[0]?.classId || "",
    pathId: "",
    subjectId: "",
    questionIds: [] as string[],
  });
  const [intervention, setIntervention] = useState({
    classId: classes[0]?.classId || "",
    studentId: "",
    skillId: "",
    pathId: "",
  });
  const [transfer, setTransfer] = useState({
    studentId: "",
    targetSchoolId: "",
    targetClassId: "",
    confirmation: "",
  });
  const [targetClasses, setTargetClasses] = useState<Classroom[]>([]);
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const [a, s, i] = await Promise.all([
      can("SCHOOL_ASSESSMENTS_MANAGE", "SCHOOL_ASSESSMENTS")
        ? api.getSchoolDirectorAcademicAssessments(school.schoolId)
        : Promise.resolve({ assessments: [] }),
      can("SCHOOL_SMART_CLASSROOM_VIEW", "SMART_CLASSROOM")
        ? api.getSchoolDirectorSmartClassrooms(school.schoolId)
        : Promise.resolve({ sessions: [] }),
      can("SCHOOL_INTERVENTIONS_VIEW", "INTERVENTION_CENTER")
        ? api.getSchoolDirectorInterventions(school.schoolId)
        : Promise.resolve({ interventions: [] }),
    ]);
    setAssessments(a.assessments || []);
    setCounts({
      assessments: a.assessments?.length || 0,
      sessions: s.sessions?.length || 0,
      interventions: i.interventions?.length || 0,
    });
  };
  useEffect(() => {
    void load().catch(() => setMessage("تعذر تحميل التشغيل الأكاديمي."));
  }, [school.schoolId]);
  useEffect(() => {
    setAssessment({
      title: "",
      classId: classes[0]?.classId || "",
      pathId: "",
      subjectId: "",
      questionIds: [] as string[],
    });
    setIntervention({
      classId: classes[0]?.classId || "",
      studentId: students[0]?.studentId || "",
      skillId: "",
      pathId: "",
    });
    setTransfer({
      studentId: "",
      targetSchoolId: "",
      targetClassId: "",
      confirmation: "",
    });
    setTargetClasses([]);
    setInterventionSubject('');
    setShowCreate(false);
    setMessage("");
  }, [school.schoolId]);

  const run = async (
    key: string,
    action: () => Promise<void>,
    success: string,
  ) => {
    setPending(key);
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر تنفيذ العملية.",
      );
    } finally {
      setPending("");
    }
  };
  const targetSchools = schools.filter(
    (item) =>
      item.schoolId !== school.schoolId &&
      item.permissions.includes("SCHOOL_STUDENTS_TRANSFER_SCHOOL") &&
      item.modules.includes("SCHOOL_CORE"),
  );
  const hasAny =
    can("SCHOOL_ASSESSMENTS_MANAGE", "SCHOOL_ASSESSMENTS") ||
    can("SCHOOL_SMART_CLASSROOM_VIEW", "SMART_CLASSROOM") ||
    can("SCHOOL_INTERVENTIONS_VIEW", "INTERVENTION_CENTER") ||
    can("SCHOOL_INTERVENTIONS_MANAGE", "INTERVENTION_CENTER") ||
    (can("SCHOOL_STUDENTS_TRANSFER_SCHOOL", "SCHOOL_CORE") &&
      targetSchools.length > 0);
  if (!hasAny) return null;

  return (
    <section
      className="mt-7 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
      data-testid="director-academic-center"
    >
      <div>
        <h2 className="mt-1 text-xl font-black">
          {area==='assessments'?'اختبارات المدرسة':area==='interventions'?'الدعم والمهارات':area==='sessions'?'الحصص الذكية':area==='transfer'?'النقل بين المدارس':'الاختبارات والفصول الذكية والتدخلات'}
        </h2>
      </div>
      {message && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold">
          {message}
        </p>
      )}
      <div className="mt-5 grid gap-4">
        {can("SCHOOL_ASSESSMENTS_MANAGE", "SCHOOL_ASSESSMENTS") && (
          <article className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <h3 className="flex items-center gap-2 font-black">
              <BookOpenCheck size={18} /> أحدث الاختبارات{" "}
              <span className="mr-auto rounded-full bg-white px-2">
                {counts.assessments}
              </span>
            </h3>
            <div className="mt-4"><DirectorAssessmentCards items={assessments} schoolId={school.schoolId}/></div>
            <button type="button" onClick={()=>setShowCreate(value=>!value)} className="mt-4 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white">{showCreate?'إلغاء الإضافة':'إضافة اختبار'}</button>
            {showCreate&&<div className="mt-3 grid gap-3">
              <label className="text-xs font-bold">عنوان الاختبار<input aria-label="عنوان الاختبار" value={assessment.title} onChange={e=>setAssessment({...assessment,title:e.target.value})} className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm"/></label>
              <label className="text-xs font-bold">فصل الاختبار<select aria-label="فصل الاختبار" value={assessment.classId} onChange={e=>setAssessment({...assessment,classId:e.target.value})} className="mt-1 block w-full rounded-xl border px-3 py-2 text-sm"><option value="">اختر الفصل</option>{classes.map(item=><option key={item.classId} value={item.classId}>{item.className}</option>)}</select></label>
              <DirectorCatalogFields pathId={assessment.pathId} subjectId={assessment.subjectId} labels={{path:'مسار الاختبار',subject:'مادة الاختبار'}} onChange={choice=>setAssessment({...assessment,pathId:choice.pathId,subjectId:choice.subjectId,questionIds:[]})}/>
              <p className="text-xs text-slate-600">يُنشر الاختبار مباشرة للفصل المحدد عند الإنشاء.</p>
              <DirectorQuestionPicker key={assessment.pathId+'|'+assessment.subjectId} pathId={assessment.pathId} subjectId={assessment.subjectId} value={assessment.questionIds} onChange={questionIds=>setAssessment({...assessment,questionIds})}/>
              <button
                disabled={pending === "assessment" || !assessment.title.trim() || !assessment.classId || !assessment.pathId || !assessment.subjectId || !assessment.questionIds.length}
                onClick={() => void run("assessment", async () => {
                  await api.createSchoolDirectorAssessment(school.schoolId, { ...assessment, title:assessment.title.trim() });
                  setAssessment({ ...assessment, title: "", questionIds: [] });
                  setShowCreate(false);
                }, "تم إنشاء اختبار المدرسة من بنك الأسئلة الحالي.")}
                className="rounded-xl bg-indigo-700 py-2 text-sm font-black text-white"
              >
                إنشاء الاختبار
              </button>
            </div>}
          </article>
        )}
        {can("SCHOOL_SMART_CLASSROOM_VIEW", "SMART_CLASSROOM") && (
          <article className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <h3 className="flex items-center gap-2 font-black">
              <Radio size={18} /> الفصول الذكية
            </h3>
            <p className="mt-4 text-4xl font-black text-sky-800">
              {counts.sessions}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              جلسة ظاهرة ضمن هذه المدرسة فقط. التشغيل نفسه يبقى بيد المعلم
              المكلف.
            </p>
          </article>
        )}
        {(can("SCHOOL_INTERVENTIONS_VIEW", "INTERVENTION_CENTER") ||
          can("SCHOOL_INTERVENTIONS_MANAGE", "INTERVENTION_CENTER")) && (
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <h3 className="flex items-center gap-2 font-black">
              <BrainCircuit size={18} /> التدخلات{" "}
              <span className="mr-auto rounded-full bg-white px-2">
                {counts.interventions}
              </span>
            </h3>
            {can("SCHOOL_INTERVENTIONS_MANAGE", "INTERVENTION_CENTER") && (
              <div className="mt-3 grid gap-2">
                <select aria-label="طالب الدعم" value={intervention.studentId} onChange={(e) => setIntervention({ ...intervention, studentId: e.target.value })} className="rounded-xl border bg-white px-3 py-2 text-sm">
                  <option value="">اختر الطالب</option>
                  {students.filter(item=>item.classId===intervention.classId).map((item) => (<option key={item.studentId} value={item.studentId}>{item.name}</option>))}
                </select>
                <select aria-label="فصل الدعم" value={intervention.classId} onChange={(e) => setIntervention({ ...intervention, classId: e.target.value,studentId:'' })} className="rounded-xl border bg-white px-3 py-2 text-sm">
                  {classes.map((item) => (<option key={item.classId} value={item.classId}>{item.className}</option>))}
                </select>
                <DirectorCatalogFields pathId={intervention.pathId} subjectId={interventionSubject} skillId={intervention.skillId} labels={{path:'المسار العلاجي',subject:'مادة الدعم',skill:'المهارة'}} onChange={choice=>{setInterventionSubject(choice.subjectId);setIntervention({...intervention,pathId:choice.pathId,skillId:choice.skillId});}}/>
                <button disabled={pending==='intervention'||!intervention.studentId||!intervention.classId||!intervention.pathId||!intervention.skillId} onClick={() => void run("intervention", async () => { await api.createSchoolDirectorIntervention(school.schoolId, intervention); }, "تم إنشاء التدخل وربط خطة علاجية بالطالب.")} className="rounded-xl bg-emerald-700 py-2 text-sm font-black text-white">
                  إنشاء تدخل
                </button>
              </div>
            )}
          </article>
        )}
      </div>
      {can("SCHOOL_STUDENTS_TRANSFER_SCHOOL", "SCHOOL_CORE") &&
        targetSchools.length > 0 && (
          <article className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <h3 className="flex items-center gap-2 font-black text-rose-900">
              <ShieldAlert size={18} /> نقل طالب بين مدرستين — عملية حساسة
            </h3>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <select value={transfer.studentId} onChange={(e) => setTransfer({ ...transfer, studentId: e.target.value })} className="rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="">اختر الطالب</option>
                {students.map((item) => (<option key={item.studentId} value={item.studentId}>{item.name}</option>))}
              </select>
              <select
                value={transfer.targetSchoolId}
                onChange={(e) => {
                  const id = e.target.value;
                  setTransfer({ ...transfer, targetSchoolId: id, targetClassId: "" });
                  if (id) void api.getSchoolDirectorTransferTargetClasses(id).then((data) => setTargetClasses(data.classes || [])).catch(() => { setTargetClasses([]); setMessage("تعذر تحميل فصول المدرسة الهدف."); });
                }}
                className="rounded-xl border bg-white px-3 py-2 text-sm"
              >
                <option value="">المدرسة الهدف</option>
                {targetSchools.map((item) => (<option key={item.schoolId} value={item.schoolId}>{item.schoolName}</option>))}
              </select>
              <select value={transfer.targetClassId} onChange={(e) => setTransfer({ ...transfer, targetClassId: e.target.value })} className="rounded-xl border bg-white px-3 py-2 text-sm">
                <option value="">الفصل الهدف</option>
                {targetClasses.map((item) => (<option key={item.classId} value={item.classId}>{item.className}</option>))}
              </select>
              <input value={transfer.confirmation} onChange={(e) => setTransfer({ ...transfer, confirmation: e.target.value })} placeholder="اكتب TRANSFER للتأكيد" className="rounded-xl border bg-white px-3 py-2 text-sm" />
            </div>
            <button
              disabled={transfer.confirmation !== "TRANSFER" || !transfer.studentId || !transfer.targetClassId || pending === "transfer"}
              onClick={() => void run("transfer", async () => {
                await api.transferSchoolDirectorStudent(school.schoolId, transfer.studentId, { targetSchoolId: transfer.targetSchoolId, targetClassId: transfer.targetClassId, confirmation: "TRANSFER" });
                await onRefresh();
              }, "تم نقل الطالب وتسجيل العملية في سجل التدقيق.")}
              className="mt-3 rounded-xl bg-rose-700 px-5 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              تأكيد النقل بين المدرستين
            </button>
          </article>
        )}
    </section>
  );
};
