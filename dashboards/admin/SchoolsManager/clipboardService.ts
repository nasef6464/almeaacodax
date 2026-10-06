type CopyTextOptions = {
    useTextareaFallback?: boolean;
};

export const copyTextToClipboard = async (
    text: string,
    { useTextareaFallback = false }: CopyTextOptions = {},
) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        if (!useTextareaFallback) {
            throw error;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        return true;
    }
};
