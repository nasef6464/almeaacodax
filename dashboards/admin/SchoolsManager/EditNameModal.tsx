import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface EditNameModalProps {
    isOpen: boolean;
    title: string;
    initialValue: string;
    onClose: () => void;
    onSave: (newName: string) => Promise<void>;
}

export const EditNameModal: React.FC<EditNameModalProps> = ({
    isOpen,
    title,
    initialValue,
    onClose,
    onSave,
}) => {
    const [name, setName] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setName(initialValue);
            setError(null);
            setIsSaving(false);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('الاسم مطلوب.');
            return;
        }
        if (trimmedName === initialValue) {
            onClose();
            return;
        }
        
        setIsSaving(true);
        setError(null);
        try {
            await onSave(trimmedName);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'تعذر حفظ الاسم. يرجى المحاولة لاحقاً.');
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>
                <h3 className="text-xl font-black text-gray-900 mb-6 pr-6">{title}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الجديد</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(null); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSave();
                                if (e.key === 'Escape') onClose();
                            }}
                            autoFocus
                            disabled={isSaving}
                            className={`w-full rounded-xl border ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'} px-4 py-3 text-sm focus:outline-none focus:ring-4 transition-all`}
                        />
                        {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={() => void handleSave()}
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                        >
                            {isSaving ? (
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <Check size={18} />
                            )}
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
