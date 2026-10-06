import { useState } from 'react';
import type { EditNameModalState } from './contracts';

const defaultEditNameModalState: EditNameModalState = {
    isOpen: false,
    title: '',
    initialValue: '',
    onSave: async () => {},
};

export function useEditNameModalState() {
    const [editNameModalState, setEditNameModalState] = useState<EditNameModalState>(defaultEditNameModalState);

    const closeEditNameModal = () => {
        setEditNameModalState((current) => ({ ...current, isOpen: false }));
    };

    return {
        editNameModalState,
        setEditNameModalState,
        closeEditNameModal,
    };
}
