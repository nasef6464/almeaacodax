import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export function useAutoDismissMessage(
    message: string | null,
    clearMessage: Dispatch<SetStateAction<string | null>>,
    delayMs = 5000,
) {
    useEffect(() => {
        if (!message) return;

        const timer = window.setTimeout(() => clearMessage(null), delayMs);
        return () => window.clearTimeout(timer);
    }, [clearMessage, delayMs, message]);
}
