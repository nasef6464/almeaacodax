import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Eye, Loader2, Save, Search, ShieldCheck, UserCog, UserX, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../services/api';

type Trainer = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
  managedPathIds?: string[];
  managedSubjectIds?: string[];
  persona?: 'platform' | 'hybrid' | 'unconfigured';
  portfolio?: Record<string, number>;
};

const statusLabel: Record<string, string> = { active: 'نشط', inactive: 'موقوف', unconfigured: 'غير مهيأ' };
const personaLabel: Record<string, string> = { platform: 'مدرب منصة', hybrid: 'مدرب منصة + معلم مدرسة', unconfigured: 'حساب غير مهيأ' };
const resolveId = (value: any) => String(value?.id || value?._id || '');

export const TrainersManager: React.FC = () => {
  const { paths, subjects } = useStore();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [persona, setPersona] = useState('');
  const [pathId, setPathId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableSubjects = useMemo(() => subjects.filter((subject) => !pathId || subject.pathId === pathId), [subjects, pathId]);
  const pathNames = (ids: string[] = []) => paths.filter((item) => ids.includes(item.id)).map((item) => item.name).join('، ') || 'غير محدد';
  const subjectNames = (ids: string[] = []) => subjects.filter((item) => ids.includes(item.id)).map((item) => item.name).join('، ') || 'غير محدد';

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await api.getAdminTrainers({ page, limit: 25, search: search.trim() || undefined, status: status as any || undefined, persona: persona as any || undefined, pathId: pathId || undefined, subjectId: subjectId || undefined });
      setTrainers((response.trainers || []) as Trainer[]);
      setTotalPages(Math.max(1, Number(response.pagination?.totalPages || 1)));
    } catch (cause) {
      console.error(cause); setError('تعذر تحميل مركز المدربين الآن.');
    } finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [page, search, status, persona, pathId, subjectId]);

  const openTrainer = async (trainer: Trainer) => {
    setDetailLoading(true); setError('');
    try { const response = await api.getAdminTrainer(trainer.id); setSelected(response.trainer); }
    catch { setError('تعذر تحميل ملف المدرب.'); }
    finally { setDetailLoading(false); }
  };

  const saveTrainer = async (patch: Record<string, unknown>) => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const response = await api.updateAdminUser(resolveId(selected), patch) as { user?: Trainer };
      setSelected((current: any) => ({ ...current, ...(response.user || patch) }));
      await load();
    } catch (cause) { console.error(cause); setError('لم يتم حفظ تغيير المدرب على الخادم.'); }
    finally { setSaving(false); }
  };

  const portfolioItems = (selected?.portfolio?.items || {}) as Record<string, any[]>;
  const portfolioStats = (selected?.portfolio?.stats || selected?.portfolio || {}) as Record<string, number>;

  return <div className="space-y-6" dir="rtl">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><h2 className="text-2xl font-black text-gray-900">إدارة المدربين</h2><p className="mt-1 text-sm text-gray-500">نطاق التخصص، الإنتاج، الاعتماد، وحالة كل مدرب منصة.</p></div>
      <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700"><ShieldCheck size={17} /> بيانات مباشرة من الخادم</div>
    </div>
    <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3 xl:grid-cols-6">
      <label className="relative md:col-span-2"><Search className="absolute right-3 top-3 text-gray-400" size={17}/><input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="ابحث بالاسم أو البريد" className="w-full rounded-xl border border-gray-200 py-2 pr-9 pl-3 text-sm"/></label>
      <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">كل الحالات</option>{Object.entries(statusLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select value={persona} onChange={(e) => { setPage(1); setPersona(e.target.value); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">كل الشخصيات</option><option value="platform">مدرب منصة</option><option value="hybrid">هجين</option></select>
      <select value={pathId} onChange={(e) => { setPage(1); setPathId(e.target.value); setSubjectId(''); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">كل المسارات</option>{paths.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={subjectId} onChange={(e) => { setPage(1); setSubjectId(e.target.value); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="">كل المواد</option>{availableSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    </div>
    {error ? <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm"><table className="w-full text-right text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="px-5 py-4">المدرب</th><th className="px-5 py-4">الشخصية</th><th className="px-5 py-4">النطاق</th><th className="px-5 py-4">الإنتاج</th><th className="px-5 py-4">بانتظار الاعتماد</th><th className="px-5 py-4"></th></tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={6} className="p-10 text-center text-gray-400"><Loader2 className="mx-auto animate-spin"/>جارٍ تحميل المدربين…</td></tr> : trainers.map((trainer) => <tr key={trainer.id}><td className="px-5 py-4"><div className="font-bold text-gray-900">{trainer.name}</div><div className="text-xs text-gray-500">{trainer.email}</div></td><td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{personaLabel[trainer.persona || 'unconfigured']}</span><div className={`mt-2 text-xs font-bold ${trainer.isActive === false ? 'text-red-600' : 'text-emerald-600'}`}>{trainer.isActive === false ? 'موقوف' : 'نشط'}</div></td><td className="max-w-[240px] px-5 py-4 text-xs text-gray-600"><div>مسارات: {pathNames(trainer.managedPathIds)}</div><div className="mt-1">مواد: {subjectNames(trainer.managedSubjectIds)}</div></td><td className="px-5 py-4 font-black text-gray-800">{trainer.portfolio?.total || 0}</td><td className="px-5 py-4 font-black text-amber-600">{trainer.portfolio?.pending_review || 0}</td><td className="px-5 py-4"><button onClick={() => void openTrainer(trainer)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"><Eye size={14}/>فتح الملف</button></td></tr>)}</tbody></table></div>
    <div className="flex items-center justify-center gap-3 text-sm"><button disabled={page<=1||loading} onClick={() => setPage((v) => v-1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRight size={16}/></button><span>{page} / {totalPages}</span><button disabled={page>=totalPages||loading} onClick={() => setPage((v) => v+1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft size={16}/></button></div>
    {selected || detailLoading ? (
      <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/40 p-4" onClick={() => !saving && setSelected(null)}>
        <div className="mx-auto my-8 max-w-5xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {detailLoading || !selected ? (
            <div className="p-16 text-center">
              <Loader2 className="mx-auto animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-black">{selected.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selected.email} · {personaLabel[selected.persona]}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-full bg-gray-100 p-2">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  ['إجمالي المحتوى', 'total'],
                  ['بانتظار الاعتماد', 'pending_review'],
                  ['معتمد', 'approved'],
                  ['منشور', 'published'],
                ].map(([label, key]) => (
                  <div key={key} className="rounded-2xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="mt-1 text-2xl font-black">{portfolioStats[key] || 0}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border p-4">
                  <h4 className="mb-3 font-black">نطاق إنتاج المدرب</h4>
                  <label className="block text-xs font-bold text-gray-600">المسارات</label>
                  <select
                    multiple
                    value={selected.managedPathIds || []}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        managedPathIds: Array.from(e.currentTarget.selectedOptions).map((o) => o.value),
                        managedSubjectIds: (selected.managedSubjectIds || []).filter((id) =>
                          subjects.some(
                            (s) => s.id === id && Array.from(e.currentTarget.selectedOptions).some((o) => o.value === s.pathId),
                          ),
                        ),
                      })
                    }
                    className="mt-1 h-28 w-full rounded-xl border p-2"
                  >
                    {paths.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <label className="mt-3 block text-xs font-bold text-gray-600">المواد</label>
                  <select
                    multiple
                    value={selected.managedSubjectIds || []}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        managedSubjectIds: Array.from(e.currentTarget.selectedOptions).map((o) => o.value),
                      })
                    }
                    className="mt-1 h-28 w-full rounded-xl border p-2"
                  >
                    {subjects
                      .filter(
                        (s) =>
                          !(selected.managedPathIds || []).length ||
                          (selected.managedPathIds || []).includes(s.pathId),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() =>
                        void saveTrainer({
                          managedPathIds: selected.managedPathIds || [],
                          managedSubjectIds: selected.managedSubjectIds || [],
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      <Save size={15} />
                      حفظ النطاق
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => void saveTrainer({ isActive: selected.isActive === false })}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold"
                    >
                      {selected.isActive === false ? <CheckCircle2 size={15} /> : <UserX size={15} />}{' '}
                      {selected.isActive === false ? 'إعادة تفعيل' : 'إيقاف'}
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border p-4">
                  <h4 className="mb-3 font-black">إنتاج المدرب</h4>
                  {Object.entries(portfolioItems).map(([type, items]) => (
                    <div key={type} className="mb-3">
                      <div className="mb-1 text-sm font-bold text-indigo-700">
                        {type} ({items.length})
                      </div>
                      {items.length ? (
                        items.slice(0, 6).map((item) => (
                          <div key={resolveId(item)} className="border-b py-1 text-xs text-gray-700">
                            {item.title || item.text || 'عنصر بلا عنوان'}{' '}
                            <span className="text-gray-400">— {item.approvalStatus || 'draft'}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400">لا يوجد</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => {
                    window.location.hash = '#/admin-dashboard?tab=paths';
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white"
                >
                  <BookOpen size={16} />
                  فتح مراكز المحتوى
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    ) : null}
  </div>;
};
