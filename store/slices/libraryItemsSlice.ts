import { LibraryItem, Topic } from '../../types';

export interface LibraryItemsSliceState {
    libraryItems: LibraryItem[];
    topics: Topic[];
}

export interface LibraryItemsSliceActions {
    addLibraryItem: (item: LibraryItem) => void;
    updateLibraryItem: (id: string, item: Partial<LibraryItem>) => void;
    deleteLibraryItem: (id: string) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface LibraryItemsApi {
    createLibraryItem: (payload: LibraryItem) => Promise<unknown>;
    updateLibraryItem: (id: string, payload: Partial<LibraryItem>) => Promise<unknown>;
    deleteLibraryItem: (id: string) => Promise<unknown>;
    updateTopic: (id: string, payload: Partial<Topic>) => Promise<unknown>;
}

export const createLibraryItemsSlice = <TState extends LibraryItemsSliceState>(
    set: StoreSet<TState>,
    api: LibraryItemsApi,
): LibraryItemsSliceActions => ({
    addLibraryItem: (item) => {
        const normalizedItem: LibraryItem = {
            ...item,
            showOnPlatform: typeof item.showOnPlatform === 'boolean' ? item.showOnPlatform : false,
        };
        api.createLibraryItem(normalizedItem).catch(console.error);
        set((state) => ({ libraryItems: [normalizedItem, ...state.libraryItems] }) as Partial<TState>);
    },
    updateLibraryItem: (id, item) => {
        api.updateLibraryItem(id, item).catch(console.error);
        set((state) => ({
            libraryItems: state.libraryItems.map((existingItem) =>
                existingItem.id === id ? { ...existingItem, ...item } : existingItem,
            ),
        }) as Partial<TState>);
    },
    deleteLibraryItem: (id) => {
        api.deleteLibraryItem(id).catch(console.error);
        set((state) => ({
            libraryItems: state.libraryItems.filter((item) => item.id !== id),
            topics: state.topics.map((topic) => {
                if (!topic.libraryItemIds?.includes(id)) return topic;
                const nextLibraryItemIds = topic.libraryItemIds.filter((itemId) => itemId !== id);
                api.updateTopic(topic.id, { libraryItemIds: nextLibraryItemIds }).catch(console.error);
                return { ...topic, libraryItemIds: nextLibraryItemIds };
            }),
        }) as Partial<TState>);
    },
});
