import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AnnouncementAd, Role, User } from '../types';

const SESSION_DISMISSED_KEY = 'almeaa-dismissed-announcement-ads';
const PERMANENT_DISMISSED_KEY = 'almeaa-dismissed-announcement-ads-once';
export const ANNOUNCEMENT_AD_PREVIEW_EVENT = 'almeaa-announcement-ad-preview';

const getDismissedIds = (storage: Storage, key: string) => {
  try {
    return new Set(JSON.parse(storage.getItem(key) || '[]') as string[]);
  } catch {
    return new Set<string>();
  }
};

const dismissIds = (ids: string[], frequency: AnnouncementAd['frequency'] = 'session') => {
  if (frequency === 'always') return;

  try {
    const storage = frequency === 'once' ? localStorage : sessionStorage;
    const key = frequency === 'once' ? PERMANENT_DISMISSED_KEY : SESSION_DISMISSED_KEY;
    const nextIds = new Set([...getDismissedIds(storage, key), ...ids]);
    storage.setItem(key, JSON.stringify([...nextIds]));
  } catch {
    // Storage can be unavailable in strict privacy modes.
  }
};

const isDismissed = (ad: AnnouncementAd) => {
  if (ad.frequency === 'always') return false;
  const sessionDismissed = getDismissedIds(sessionStorage, SESSION_DISMISSED_KEY);
  const permanentDismissed = getDismissedIds(localStorage, PERMANENT_DISMISSED_KEY);
  return sessionDismissed.has(ad.id) || permanentDismissed.has(ad.id);
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
  const [dismissedVersion, setDismissedVersion] = useState(0);
  const [canShowDelayed, setCanShowDelayed] = useState(false);
  const [previewAdId, setPreviewAdId] = useState<string | null>(null);

  const visibleAds = useMemo(() => {
    return announcementAds
      .filter((ad) => {
        if (!ad.id) return false;
        if (previewAdId === ad.id) return true;
        return !isDismissed(ad) && isLiveNow(ad) && matchesAudience(ad, user);
      })
      .sort((a, b) => a.priority - b.priority || b.createdAt - a.createdAt);
  }, [announcementAds, dismissedVersion, previewAdId, user]);

  const activeIndex = Math.min(index, Math.max(visibleAds.length - 1, 0));
  const activeAd = visibleAds[activeIndex];

  useEffect(() => {
    setCanShowDelayed(false);
    if (!activeAd) return;

    const delayMs = previewAdId === activeAd.id ? 0 : Math.max(0, Math.min(30, Number(activeAd.delaySeconds || 0))) * 1000;
    const timer = window.setTimeout(() => setCanShowDelayed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [activeAd?.id, activeAd?.delaySeconds, previewAdId]);

  useEffect(() => {
    const handlePreview = (event: Event) => {
      const adId = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!adId) return;
      setClosed(false);
      setPreviewAdId(adId);
      setIndex(0);
      setDismissedVersion((current) => current + 1);
    };

    window.addEventListener(ANNOUNCEMENT_AD_PREVIEW_EVENT, handlePreview);
    return () => window.removeEventListener(ANNOUNCEMENT_AD_PREVIEW_EVENT, handlePreview);
  }, []);

  if (closed || visibleAds.length === 0 || !activeAd || !canShowDelayed) {
    return null;
  }

  const closeOverlay = () => {
    if (!previewAdId) {
      visibleAds.forEach((ad) => dismissIds([ad.id], ad.frequency));
    }
    setPreviewAdId(null);
    setClosed(true);
  };

  const skipActiveAd = () => {
    if (!previewAdId) {
      dismissIds([activeAd.id], activeAd.frequency);
    }
    if (previewAdId === activeAd.id) {
      setPreviewAdId(null);
    }
    setIndex((current) => Math.min(current, Math.max(visibleAds.length - 2, 0)));
    setDismissedVersion((current) => current + 1);
  };

  const imageObjectClass = activeAd.imageFit === 'contain' ? 'object-contain bg-gray-50' : 'object-cover';

  if (activeAd.displayMode === 'top-banner') {
    return (
      <div className="fixed inset-x-0 top-0 z-[90] px-3 pt-3" dir="rtl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-amber-200/90 bg-white/95 p-3.5 shadow-2xl shadow-slate-950/15 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between ring-1 ring-amber-500/20">
          <div className="flex min-w-0 items-center gap-3.5">
            {activeAd.imageUrl ? (
              <img src={activeAd.imageUrl} alt={activeAd.title} className={`h-14 w-20 rounded-xl shadow-xs ${imageObjectClass}`} />
            ) : (
              <div className="h-14 w-20 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 shadow-xs flex items-center justify-center text-white font-black text-xs">
                إعلان
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <p className="text-[11px] font-black text-amber-600">إعلان المنصة</p>
              </div>
              <h2 className="truncate text-sm font-black text-gray-950 sm:text-base">{activeAd.title}</h2>
              {activeAd.body ? <p className="line-clamp-1 text-xs font-medium text-gray-500">{activeAd.body}</p> : null}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 shrink-0">
            {activeAd.ctaLabel && activeAd.ctaUrl ? (
              <button
                type="button"
                onClick={() => {
                  dismissIds([activeAd.id], activeAd.frequency);
                  goToTarget(activeAd.ctaUrl || '');
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/25 transition hover:from-indigo-700 hover:to-indigo-800 hover:shadow-lg active:scale-[0.98]"
              >
                {activeAd.ctaLabel}
                <ExternalLink size={13} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={skipActiveAd}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100/80 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
              aria-label="إغلاق الإعلان"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs px-4 py-6" dir="rtl">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/10 animate-scale-in">
        <button
          type="button"
          onClick={closeOverlay}
          className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm text-gray-700 shadow-md transition hover:bg-white hover:scale-105 active:scale-95"
          aria-label="إغلاق الإعلان"
        >
          <X size={20} />
        </button>

        {activeAd.imageUrl ? (
          <div className="bg-gray-100 max-h-72 overflow-hidden relative">
            <img src={activeAd.imageUrl} alt={activeAd.title} className={`h-64 sm:h-72 w-full ${imageObjectClass}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 relative flex items-center justify-center">
            <div className="text-white/20 text-7xl font-black select-none pointer-events-none">✨</div>
          </div>
        )}

        <div className="space-y-5 p-6 sm:p-7">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] font-black text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>إعلان المنصة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight leading-tight">{activeAd.title}</h2>
            {activeAd.body ? <p className="text-sm sm:text-base leading-7 text-gray-600">{activeAd.body}</p> : null}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100">
            <div className="flex items-center gap-2">
              {visibleAds.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIndex((current) => Math.max(0, current - 1))}
                    disabled={activeIndex === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    aria-label="الإعلان السابق"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="text-xs font-bold text-gray-500 px-1">
                    {activeIndex + 1} / {visibleAds.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIndex((current) => Math.min(visibleAds.length - 1, current + 1))}
                    disabled={activeIndex >= visibleAds.length - 1}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                    aria-label="الإعلان التالي"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </>
              ) : null}
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {visibleAds.length > 1 ? (
                <button
                  type="button"
                  onClick={skipActiveAd}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                >
                  تخطي هذا الإعلان
                </button>
              ) : null}
              {activeAd.ctaLabel && activeAd.ctaUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    dismissIds([activeAd.id], activeAd.frequency);
                    goToTarget(activeAd.ctaUrl || '');
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/25 transition hover:from-indigo-700 hover:to-indigo-800 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {activeAd.ctaLabel}
                  <ExternalLink size={16} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
