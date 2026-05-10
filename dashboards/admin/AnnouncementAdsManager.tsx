import React, { useMemo, useState } from 'react';
import { ExternalLink, ImagePlus, Megaphone, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AnnouncementAd, AnnouncementAudience } from '../../types';

const audienceLabels: Record<AnnouncementAudience, string> = {
  all: 'كل الزوار',
  guest: 'غير المسجلين',
  student: 'الطلاب',
  parent: 'أولياء الأمور',
  staff: 'الإدارة والفريق',
};

const toDateInput = (value?: number) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const fromDateInput = (value: string, boundary: 'start' | 'end' = 'start') => {
  if (!value) return undefined;
  const suffix = boundary === 'end' ? 'T23:59:59.999' : 'T00:00:00.000';
  return new Date(`${value}${suffix}`).getTime();
};

const createDefaultAd = (): AnnouncementAd => ({
  id: `ad_${Date.now()}`,
  title: 'إعلان جديد',
  body: '',
  imageUrl: '',
  ctaLabel: 'افتح الآن',
  ctaUrl: '/',
  audience: 'all',
  isActive: true,
  priority: 10,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const AnnouncementAdsManager: React.FC = () => {
  const { announcementAds, createAnnouncementAd, updateAnnouncementAd, deleteAnnouncementAd } = useStore();
  const [selectedId, setSelectedId] = useState(announcementAds[0]?.id || '');
  const [feedback, setFeedback] = useState('');

  const sortedAds = useMemo(
    () => [...announcementAds].sort((a, b) => a.priority - b.priority || b.createdAt - a.createdAt),
    [announcementAds],
  );

  const selectedAd = sortedAds.find((ad) => ad.id === selectedId) || sortedAds[0];

  const addAd = () => {
    const nextAd = createDefaultAd();
    createAnnouncementAd(nextAd);
    setSelectedId(nextAd.id);
    setFeedback('تم إنشاء إعلان جديد.');
  };

  const updateSelected = (data: Partial<AnnouncementAd>) => {
    if (!selectedAd) return;
    updateAnnouncementAd(selectedAd.id, data);
    setFeedback('تم حفظ التعديل.');
  };

  const handleImageUpload = (file?: File) => {
    if (!file || !selectedAd) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateSelected({ imageUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              <Megaphone size={14} />
              إدارة الإعلانات
            </div>
            <h2 className="mt-3 text-2xl font-black text-gray-950">الإعلانات العائمة عند فتح الموقع</h2>
            <p className="mt-2 text-sm leading-7 text-gray-500">
              أعلن بصورة أو رسالة مختصرة، وحدد الجمهور وزر الانتقال داخل المنصة.
            </p>
          </div>
          <button
            type="button"
            onClick={addAd}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
          >
            <Plus size={18} />
            إعلان جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {sortedAds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              لا توجد إعلانات بعد.
            </div>
          ) : (
            sortedAds.map((ad) => (
              <button
                type="button"
                key={ad.id}
                onClick={() => setSelectedId(ad.id)}
                className={`w-full rounded-2xl border p-4 text-right shadow-sm transition ${
                  selectedAd?.id === ad.id ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-gray-950">{ad.title}</span>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${ad.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {ad.isActive ? 'نشط' : 'متوقف'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">{audienceLabels[ad.audience]}</div>
              </button>
            ))
          )}
        </div>

        {selectedAd ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-bold text-gray-700">عنوان الإعلان</span>
                  <input
                    value={selectedAd.title}
                    onChange={(event) => updateSelected({ title: event.target.value })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-bold text-gray-700">النص المختصر</span>
                  <textarea
                    value={selectedAd.body || ''}
                    onChange={(event) => updateSelected({ body: event.target.value })}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-700">الجمهور</span>
                  <select
                    value={selectedAd.audience}
                    onChange={(event) => updateSelected({ audience: event.target.value as AnnouncementAudience })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    {Object.entries(audienceLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-700">الترتيب</span>
                  <input
                    type="number"
                    value={selectedAd.priority}
                    onChange={(event) => updateSelected({ priority: Number(event.target.value || 0) })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-700">من تاريخ</span>
                  <input
                    type="date"
                    value={toDateInput(selectedAd.startsAt)}
                    onChange={(event) => updateSelected({ startsAt: fromDateInput(event.target.value, 'start') })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-700">حتى تاريخ</span>
                  <input
                    type="date"
                    value={toDateInput(selectedAd.endsAt)}
                    onChange={(event) => updateSelected({ endsAt: fromDateInput(event.target.value, 'end') })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-700">نص الزر</span>
                  <input
                    value={selectedAd.ctaLabel || ''}
                    onChange={(event) => updateSelected({ ctaLabel: event.target.value })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-bold text-gray-700">رابط الزر</span>
                  <input
                    value={selectedAd.ctaUrl || ''}
                    placeholder="/category/p_xxx أو https://"
                    onChange={(event) => updateSelected({ ctaUrl: event.target.value })}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-bold text-gray-700">رابط الصورة أو رفع صورة</span>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      value={selectedAd.imageUrl || ''}
                      onChange={(event) => updateSelected({ imageUrl: event.target.value })}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                    />
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-indigo-200 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
                      <ImagePlus size={18} />
                      تحميل
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event.target.files?.[0])} />
                    </label>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSelected({ isActive: !selectedAd.isActive })}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-black ${
                    selectedAd.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {selectedAd.isActive ? 'نشط ويظهر' : 'متوقف'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteAnnouncementAd(selectedAd.id);
                    setSelectedId(sortedAds.find((ad) => ad.id !== selectedAd.id)?.id || '');
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-2.5 text-sm font-black text-red-600"
                >
                  <Trash2 size={16} />
                  حذف
                </button>
                {feedback ? <span className="text-xs font-bold text-emerald-600">{feedback}</span> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-black text-gray-800">معاينة مختصرة</div>
              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-lg">
                {selectedAd.imageUrl ? (
                  <img src={selectedAd.imageUrl} alt="" className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-28 bg-gradient-to-l from-indigo-600 to-amber-500" />
                )}
                <div className="space-y-3 p-4">
                  <div className="text-xs font-bold text-amber-600">إعلان المنصة</div>
                  <div className="text-lg font-black text-gray-950">{selectedAd.title}</div>
                  {selectedAd.body ? <p className="text-xs leading-6 text-gray-500">{selectedAd.body}</p> : null}
                  {selectedAd.ctaLabel ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white">
                      {selectedAd.ctaLabel}
                      <ExternalLink size={14} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
