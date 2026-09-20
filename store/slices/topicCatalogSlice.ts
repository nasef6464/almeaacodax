import { Topic } from '../../types';

export interface TopicCatalogSliceState {
    topics: Topic[];
}

export interface TopicCatalogSliceActions {
    addTopic: (topic: Topic) => void;
    updateTopic: (topicId: string, data: Partial<Topic>) => void;
    deleteTopic: (topicId: string) => void;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

interface TopicCatalogApi {
    createTopic: (payload: Topic) => Promise<unknown>;
    updateTopic: (id: string, payload: Partial<Topic>) => Promise<unknown>;
    deleteTopic: (id: string) => Promise<unknown>;
}

export const createTopicCatalogSlice = <TState extends TopicCatalogSliceState>(
    set: StoreSet<TState>,
    api: TopicCatalogApi,
): TopicCatalogSliceActions => ({
    addTopic: (topic) => {
        const normalizedTopic: Topic = {
            ...topic,
            showOnPlatform: typeof topic.showOnPlatform === 'boolean' ? topic.showOnPlatform : false,
        };
        api.createTopic(normalizedTopic).catch(console.error);
        set((state) => ({
            topics: [...state.topics, normalizedTopic],
        }) as Partial<TState>);
    },

    updateTopic: (topicId, data) => {
        api.updateTopic(topicId, data).catch(console.error);
        set((state) => ({
            topics: state.topics.map((topic) =>
                topic.id === topicId ? { ...topic, ...data } : topic,
            ),
        }) as Partial<TState>);
    },

    deleteTopic: (topicId) => {
        api.deleteTopic(topicId).catch(console.error);
        set((state) => ({
            topics: state.topics.filter((topic) => topic.id !== topicId),
        }) as Partial<TState>);
    },
});
