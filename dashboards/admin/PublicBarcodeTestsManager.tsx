import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clipboard, FileQuestion, Loader2, QrCode, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../services/api';

type CreatedBarcodeTest = {
  test: {
    id: string;
    slug: string;
    title: string;
  };
  publicUrl: string;
  qrPayload: string;
};

type PublicBarcodeReport = {
  summary: {
    submissions: number;
    averageScore: number;
    weakestSkills: Array<{ skillId: string; mastery: number; attempts: number }>;
  };
  rows: Array<{
    id: string;
    studentName: string;
    schoolName?: string;
    classroomName?: string;
    score: number;
    submittedAt: number;
  }>;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const PublicBarcodeTestsManager: React.FC = () => {
  const { paths, subjects, questions, skills } = useStore();
  const firstPathId = paths[0]?.id || '';
  const [pathId, setPathId] = useState(firstPathId);
  const activeSubjects = useMemo(() => subjects.filter((subject) => subject.pathId === pathId), [subjects, pathId]);
  const [subjectId, setSubjectId] = useState(activeSubjects[0]?.id || '');
  const [title, setTitle] = useState('اختبار سريع');
  const [description, setDescription] = useState('اختبار قصير للتعرف على مستواك.');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showResultToStudent, setShowResultToStudent] = useState(true);
  const [createdTest, setCreatedTest] = useState<CreatedBarcodeTest | null>(null);
  const [report, setReport] = useState<PublicBarcodeReport | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  const normalizedSubjectId = subjectId || activeSubjects[0]?.id || '';
  const eligibleQuestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return questions
      .filter((question) => {
        const approved = !question.approvalStatus || question.approvalStatus === 'approved';
        return approved && question.pathId === pathId && question.subject === normalizedSubjectId;
      })
      .filter((question) => !term || question.text.toLowerCase().includes(term))
      .slice(0, 80);
  }, [normalizedSubjectId, pathId, questions, searchTerm]);

  const selectedSkills = useMemo(() => {
    const selectedQuestions = questions.filter((question) => selectedQuestionIds.includes(question.id));
    return [...new Set(selectedQuestions.flatMap((question) => question.skillIds || []))];
  }, [questions, selectedQuestionIds]);

  const fullPublicUrl = useMemo(() => {
    if (!createdTest) return '';
    const relative = createdTest.publicUrl || `/barcode-test/${createdTest.test.slug}`;
    return `${window.location.origin}${relative.startsWith('/') ? relative : `/${relative}`}`;
  }, [createdTest]);

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  const createTest = async () => {
    setError('');
    setFeedback('');
    setCreatedTest(null);
    setReport(null);
    if (!pathId || !normalizedSubjectId) {
      setError('اختر المسار والمادة أولًا.');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      setError('اختر سؤالًا واحدًا على الأقل.');
      return;
    }
    setSaving(true);
    try {
      const response = (await api.createPublicBarcodeTest({
        title,
        description,
        pathId,
        subjectId: normalizedSubjectId,
        skillIds: selectedSkills,
        questionIds: selectedQuestionIds,
        status: 'active',
        showResultToStudent,
        collectSchool: true,
        collectClassroom: true,
      })) as CreatedBarcodeTest;
      setCreatedTest(response);
      setFeedback('تم إنشاء رابط الاختبار والباركود.');
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر إنشاء الاختبار الآن.'));
    } finally {
      setSaving(false);
    }
  };

  const loadReport = async () => {
    if (!createdTest) return;
    setLoadingReport(true);
    setError('');
    try {
      const response = (await api.getPublicBarcodeTestReport(createdTest.test.id)) as PublicBarcodeReport;
      setReport(response);
    } catch (err) {
      setError(getErrorMessage(err, 'تعذر قراءة التقرير الآن.'));
    } finally {
      setLoadingReport(false);
    }
  };

  const copyLink = async () => {
    if (!fullPublicUrl) return;
    try {
      await navigator.clipboard.writeText(fullPublicUrl);
      setFeedback('تم نسخ الرابط.');
    } catch {
      setFeedback(fullPublicUrl);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
              اختبارات باركود
            </span>
            <h1 className="mt-3 text-2xl font-black text-slate-900">اختبار عام بدون تسجيل</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
              أنشئ اختبارًا قصيرًا من مركز الأسئلة، ثم انشر الرابط أو QR للطلاب.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <QrCode className="mx-auto mb-2 text-indigo-600" />
            <div className="text-xs font-black text-slate-500">يدخل الطالب مباشرة</div>
          </div>
        </div>
      </div>

      {(error || feedback) && (
        <div className={`rounded-2xl border p-4 text-sm font-black ${error ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || feedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">اسم الاختبار</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">عرض النتيجة للطالب</span>
              <button
                type="button"
                onClick={() => setShowResultToStudent((value) => !value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm font-black ${showResultToStudent ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {showResultToStudent ? 'نعم، يظهر ملخص بسيط' : 'لا، الإدارة فقط ترى النتائج'}
              </button>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-black text-slate-600">وصف قصير</span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">المسار</span>
              <select
                value={pathId}
                onChange={(event) => {
                  const nextPathId = event.target.value;
                  const nextSubject = subjects.find((subject) => subject.pathId === nextPathId);
                  setPathId(nextPathId);
                  setSubjectId(nextSubject?.id || '');
                  setSelectedQuestionIds([]);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {paths.map((path) => <option key={path.id} value={path.id}>{path.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">المادة</span>
              <select
                value={normalizedSubjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setSelectedQuestionIds([]);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث داخل الأسئلة"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-[430px] space-y-2 overflow-auto pr-1">
              {eligibleQuestions.map((question) => {
                const selected = selectedQuestionIds.includes(question.id);
                const skillNames = (question.skillIds || [])
                  .map((skillId) => skills.find((skill) => skill.id === skillId)?.name)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('، ');
                return (
                  <button
                    type="button"
                    key={question.id}
                    onClick={() => toggleQuestion(question.id)}
                    className={`w-full rounded-2xl border p-3 text-right transition ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-100'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {selected && <CheckCircle2 size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-black leading-6 text-slate-800">{question.text}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{skillNames || 'بدون مهارة محددة'}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {eligibleQuestions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <FileQuestion className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-black text-slate-500">لا توجد أسئلة معتمدة لهذا الاختيار.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-sm font-black text-slate-500">الأسئلة المختارة</div>
            <div className="mt-2 text-4xl font-black text-slate-900">{selectedQuestionIds.length}</div>
            <button
              type="button"
              onClick={createTest}
              disabled={saving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
              إنشاء الرابط والباركود
            </button>
          </div>

          {createdTest && (
            <div className="rounded-3xl border border-emerald-100 bg-white p-5 text-center shadow-sm">
              <QRCodeSVG value={fullPublicUrl} size={190} className="mx-auto rounded-2xl bg-white p-2" />
              <p className="mt-4 break-all rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{fullPublicUrl}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
                  <Clipboard size={14} />
                  نسخ
                </button>
                <a href={fullPublicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">
                  فتح الاختبار
                </a>
              </div>
              <button
                type="button"
                onClick={loadReport}
                disabled={loadingReport}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
              >
                {loadingReport && <Loader2 size={14} className="animate-spin" />}
                تحديث التقرير
              </button>
            </div>
          )}

          {report && (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-900">ملخص النتائج</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-black text-slate-900">{report.summary.submissions}</div>
                  <div className="text-xs font-bold text-slate-500">محاولة</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-black text-slate-900">{report.summary.averageScore}%</div>
                  <div className="text-xs font-bold text-slate-500">متوسط</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {report.rows.slice(0, 5).map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                    <span>{row.studentName}</span>
                    <span>{row.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PublicBarcodeTestsManager;
