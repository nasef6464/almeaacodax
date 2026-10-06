import { AnnouncementAd } from '../../types';

export interface AnnouncementAdsSliceState {
    announcementAds: AnnouncementAd[];
}

export interface AnnouncementAdsSliceActions {
    createAnnouncementAd: (ad: AnnouncementAd) => void;
    updateAnnouncementAd: (id: string, data: Partial<AnnouncementAd>) => void;
    deleteAnnouncementAd: (id: string) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface AnnouncementAdsApi {
    createAnnouncementAd: (payload: AnnouncementAd) => Promise<unknown>;
    updateAnnouncementAd: (id: string, payload: Partial<AnnouncementAd>) => Promise<unknown>;
    deleteAnnouncementAd: (id: string) => Promise<unknown>;
}

export const createAnnouncementAdsSlice = <TState extends AnnouncementAdsSliceState>(
    set: StoreSet<TState>,
    api: AnnouncementAdsApi,
): AnnouncementAdsSliceActions => ({
    createAnnouncementAd: (ad) => set((state) => {
        const normalizedAd: AnnouncementAd = {
            ...ad,
            audience: ad.audience || 'all',
            displayMode: ad.displayMode || 'modal',
            frequency: ad.frequency || 'session',
            imageFit: ad.imageFit || 'cover',
            delaySeconds: Math.max(0, Math.min(30, Number(ad.delaySeconds ?? 0))),
            isActive: ad.isActive !== false,
            priority: Number(ad.priority ?? 0),
            createdAt: ad.createdAt || Date.now(),
            updatedAt: Date.now(),
        };
        api.createAnnouncementAd(normalizedAd).catch(console.error);
        return {
            announcementAds: [...state.announcementAds, normalizedAd].sort((a, b) => a.priority - b.priority),
        } as Partial<TState>;
    }),
    updateAnnouncementAd: (id, data) => set((state) => {
        const normalizedData: Partial<AnnouncementAd> = {
            ...data,
            ...(data.priority !== undefined ? { priority: Number(data.priority) } : {}),
            ...(data.delaySeconds !== undefined ? { delaySeconds: Math.max(0, Math.min(30, Number(data.delaySeconds || 0))) } : {}),
            updatedAt: Date.now(),
        };
        api.updateAnnouncementAd(id, normalizedData).catch(console.error);
        return {
            announcementAds: state.announcementAds
                .map((ad) => (ad.id === id ? { ...ad, ...normalizedData } : ad))
                .sort((a, b) => a.priority - b.priority),
        } as Partial<TState>;
    }),
    deleteAnnouncementAd: (id) => set((state) => {
        api.deleteAnnouncementAd(id).catch(console.error);
        return {
            announcementAds: state.announcementAds.filter((ad) => ad.id !== id),
        } as Partial<TState>;
    }),
});
