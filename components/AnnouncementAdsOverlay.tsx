import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AnnouncementAd, Role, User } from '../types';

const DISMISSED_KEY = 'almeaa-dismissed-announcement-ads';

const getDismissedIds = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]') as string[]);
  } catch {
    return new Set<string>();
  }
};

const dismissIds = (ids: string[]) => {
  try {
    const nextIds = new Set([...getDismissedIds(), ...ids]);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...nextIds]));
  } catch {
    // Session storage can be unavailable in strict privacy modes.
  }
};

const matchesAudience = (ad: AnnouncementAd, user?: User | null) => {
  const role = user?.role;
  if (ad.audience === 'all') return true;
  if (ad.audience === 'guest') return !role || user?.id === 'guest';
  if (ad.audience === 'student') return role === Role.STUDENT;
  if (ad.audience === 'parent') return role === Role.PARENT;
  if (ad.audience === 'staff') return role === Role.ADMIN || role === Role.TEACHER || role === Role.SUPERVISOR;
  return true;
};

const isLiveNow = (ad: AnnouncementAd) => {
  const now = Date.now();
  return ad.isActive && (!ad.startsAt || ad.startsAt <= now) && (!ad.endsAt || ad.endsAt >= now);
};

const goToTarget = (url: string) => {
  const target = url.trim();
  if (!target) return;

  if (/^https?:\/\//i.test(target)) {
    window.location.href = target;
    return;
  }

  const hashTarget = target.startsWith('#') ? target.slice(1) : target;
  window.location.hash = hashTarget.startsWith('/') ? hashTarget : `/${hashTarget}`;
};

export const AnnouncementAdsOverlay: React.FC = () => {
  const user = useStore((state) => state.user);
  const announcementAds = useStore((state) => state.announcementAds);
  const [closed, setClosed] = useState(false);
  const [index, setIndex] = useState(0);

  const visibleAds = useMemo(() => {
    const dismissedIds = getDismissedIds();
    return announcementAds
      .filter((ad) => ad.id && !dismissedIds.has(ad.id) && isLiveNow(ad) && matchesAudience(ad, user))
      .sort((a, b) => a.priority - b.priority || b.createdAt - a.createdAt);
  }, [announcementAds, user]);

  if (closed || visibleAds.length === 0) {
    return null;
  }

  const activeIndex = Math.min(index, visibleAds.length - 1);
  const activeAd = visibleAds[activeIndex];

  const closeOverlay = () => {
    dismissIds(visibleAds.map((ad) => ad.id));
    setClosed(true);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6" dir="rtl">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
        <button
          type="button"
          onClick={closeOverlay}
          className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm transition hover:bg-gray-100"
          aria-label="إغلاق الإعلان"
        >
          <X size={22} />
        </button>

        {activeAd.imageUrl ? (
          <div className="bg-gray-100">
            <img src={activeAd.imageUrl} alt={activeAd.title} className="h-64 w-full object-cover" />
          </div>
        ) : (
          <div className="h-36 bg-gradient-to-l from-indigo-600 to-amber-500" />
        )}

        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <p className="text-xs font-bold text-amber-600">إعلان المنصة</p>
            <h2 className="text-2xl font-black text-gray-950">{activeAd.title}</h2>
            {activeAd.body ? <p className="text-sm leading-7 text-gray-600">{activeAd.body}</p> : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {visibleAds.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIndex((current) => Math.max(0, current - 1))}
                    disabled={activeIndex === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-700 disabled:opacity-40"
                    aria-label="الإعلان السابق"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="text-xs font-bold text-gray-500">
                    {activeIndex + 1} / {visibleAds.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIndex((current) => Math.min(visibleAds.length - 1, current + 1))}
                    disabled={activeIndex >= visibleAds.length - 1}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-700 disabled:opacity-40"
                    aria-label="الإعلان التالي"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </>
              ) : null}
            </div>

            {activeAd.ctaLabel && activeAd.ctaUrl ? (
              <button
                type="button"
                onClick={() => {
                  dismissIds([activeAd.id]);
                  goToTarget(activeAd.ctaUrl || '');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
              >
                {activeAd.ctaLabel}
                <ExternalLink size={16} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
