import { CartItem } from '../../types';

export interface CartSliceState {
    cartItems: CartItem[];
}

export interface CartSliceActions {
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string, itemType?: CartItem['type']) => void;
    clearCart: () => void;
    cartCount: () => number;
}

type StoreSet<TState> = (
    partial:
        | Partial<TState>
        | TState
        | ((state: TState) => Partial<TState> | TState),
) => void;

type StoreGet<TState> = () => TState;

export const createCartSlice = <TState extends CartSliceState>(
    set: StoreSet<TState>,
    get: StoreGet<TState>,
): CartSliceActions => ({
    addToCart: (item) => set((state) => {
        const normalized: CartItem = {
            ...item,
            id: String(item?.id || ''),
            title: String(item?.title || ''),
            type: item?.type || 'course',
            price: Number(item?.price || 0),
            currency: String(item?.currency || 'SAR'),
        };

        if (!normalized.id || !normalized.title) {
            return state;
        }

        const nextItems = state.cartItems.filter(
            (existing) => !(existing.id === normalized.id && existing.type === normalized.type),
        );

        return { cartItems: [...nextItems, normalized] } as Partial<TState>;
    }),
    removeFromCart: (itemId, itemType) => set((state) => ({
        cartItems: state.cartItems.filter((item) => {
            if (item.id !== itemId) return true;
            if (!itemType) return false;
            return item.type !== itemType;
        }),
    } as Partial<TState>)),
    clearCart: () => set({ cartItems: [] } as Partial<TState>),
    cartCount: () => get().cartItems.length,
});
