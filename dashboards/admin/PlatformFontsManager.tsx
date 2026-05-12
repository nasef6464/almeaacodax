import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, Type, Upload } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { PLATFORM_FONT_SETTINGS_UPDATED } from '../../components/PlatformFontBootstrap';
import { PlatformFontSettings, PlatformFontUpload } from '../../types';
import {
    applyPlatformFontSettings,
    DEFAULT_PLATFORM_FONT_SETTINGS,
    normalizePlatformFontSettings,
    PLATFORM_FONT_OPTIONS,
} from '../../utils/platformFonts';

const MAX_FONT_SIZE_BYTES = 500 * 1024;

const readFontFile = (file: File): Promise<PlatformFontUpload> =>
    new Promise((resolve, reject) => {
        if (!['font/woff2', 'font/woff', 'font/ttf', 'font/otf', 'application/font-woff', 'application/x-font-ttf', 'application/octet-stream'].includes(file.type) && !/\.(woff2?|ttf|otf)$/i.test(file.name)) {
            reject(new Error('ارفع ملف خط بصيغة WOFF أو WOFF2 أو TTF أو OTF فقط.'));
            return;
        }

        if (file.size > MAX_FONT_SIZE_BYTES) {
            reject(new Error('حجم الخط كبير. الأفضل أن يكون أقل من 500KB حتى لا يبطئ فتح المنصة.'));
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('تعذر قراءة ملف الخط.'));
        reader.onload = () => {
            const dataUrl = String(reader.result || '');
            const extension = file.name.split('.').pop()?.toLowerCase();
            const mimeType =
                extension === 'woff2'
                    ? 'font/woff2'
                    : extension === 'ttf'
                        ? 'font/ttf'
                        : extension === 'otf'
                            ? 'font/otf'
                            : 'font/woff';
            resolve({
                name: file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '') || 'PlatformCustomFont',
                dataUrl: dataUrl.replace(/^data:.*?;base64,/, `data:${mimeType};base64,`),
                fileName: file.name,
                mimeType,
                size: file.size,
            });
        };
        reader.readAsDataURL(file);
    });

export const PlatformFontsManager: React.FC = () => {
    const { user, logout } = useAuth();
    const [settings, setSettings] = useState<PlatformFontSettings>(DEFAULT_PLATFORM_FONT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadSettings = async () => {
            try {
                const response = await api.getPlatformFontSettings();
                if (!cancelled) {
                    const nextSettings = normalizePlatformFontSettings(response as PlatformFontSettings);
                    setSettings(nextSettings);
                    applyPlatformFontSettings(nextSettings);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل إعدادات الخطوط.');
                    setSettings(DEFAULT_PLATFORM_FONT_SETTINGS);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadSettings();

        return () => {
            cancelled = true;
        };
    }, []);

    const selectedBodyOption = useMemo(
        () => PLATFORM_FONT_OPTIONS.find((option) => option.id === settings.bodyFont) || PLATFORM_FONT_OPTIONS[0],
        [settings.bodyFont],
    );
    const selectedHeadingOption = useMemo(
        () => PLATFORM_FONT_OPTIONS.find((option) => option.id === settings.headingFont) || PLATFORM_FONT_OPTIONS[0],
        [settings.headingFont],
    );

    const updateSettings = (patch: Partial<PlatformFontSettings>) => {
        const nextSettings = normalizePlatformFontSettings({ ...settings, ...patch });
        setSettings(nextSettings);
        applyPlatformFontSettings(nextSettings);
    };

    const handleFontUpload = async (target: 'body' | 'heading', file?: File) => {
        if (!file) return;
        setError(null);
        setSuccess(null);

        try {
            const upload = await readFontFile(file);
            updateSettings(
                target === 'body'
                    ? { bodyFont: 'custom', bodyCustomFont: upload }
                    : { headingFont: 'custom', headingCustomFont: upload },
            );
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع الخط.');
        }
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(null);

        if (!user?.token) {
            setError('انتهت جلسة الإدارة. سجل الدخول كمدير ثم أعد المحاولة.');
            logout();
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.updatePlatformFontSettings(settings, user.token);
            const savedSettings = normalizePlatformFontSettings(response as PlatformFontSettings);
            setSettings(savedSettings);
            applyPlatformFontSettings(savedSettings);
            window.dispatchEvent(new CustomEvent(PLATFORM_FONT_SETTINGS_UPDATED, { detail: savedSettings }));
            setSuccess('تم حفظ خطوط المنصة وتطبيقها على الواجهة.');
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'تعذر حفظ إعدادات الخطوط.';
            setError(message.includes('Authentication required') ? 'انتهت جلسة الإدارة أو لم تصل صلاحية الحفظ للخادم.' : message);
        } finally {
            setIsSaving(false);
        }
    };

    const resetToDefault = () => {
        updateSettings(DEFAULT_PLATFORM_FONT_SETTINGS);
        setSuccess('تمت معاينة الخط الافتراضي. اضغط حفظ التعديلات لتثبيته.');
    };

    if (isLoading) {
        return (
            <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-2xl bg-indigo-50" />
                <div className="text-sm font-black text-gray-700">جاري تحميل إدارة الخطوط...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                        <Type size={14} />
                        إعداد عام
                    </div>
                    <h1 className="mt-3 text-2xl font-black text-gray-900">إدارة خطوط المنصة</h1>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        التحكم هنا يؤثر على واجهة المنصة كلها. الافتراضي الحالي محفوظ كما هو: Tajawal.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={resetToDefault}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 hover:bg-gray-50"
                    >
                        <RotateCcw size={16} />
                        رجوع للافتراضي
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save size={16} />
                        {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                </div>
            </div>

            {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
            {success ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div> : null}

            <div className="grid gap-5 lg:grid-cols-2">
                {[
                    {
                        key: 'body' as const,
                        title: 'خط النصوص العامة',
                        value: settings.bodyFont,
                        customFont: settings.bodyCustomFont,
                        selectedOption: selectedBodyOption,
                    },
                    {
                        key: 'heading' as const,
                        title: 'خط العناوين',
                        value: settings.headingFont,
                        customFont: settings.headingCustomFont,
                        selectedOption: selectedHeadingOption,
                    },
                ].map((section) => (
                    <section key={section.key} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-4">
                            <h2 className="text-lg font-black text-gray-900">{section.title}</h2>
                            <p className="mt-1 text-xs leading-5 text-gray-500">{section.selectedOption.note}</p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            {PLATFORM_FONT_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => updateSettings(section.key === 'body' ? { bodyFont: option.id } : { headingFont: option.id })}
                                    className={`rounded-2xl border px-4 py-3 text-right transition ${
                                        section.value === option.id
                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100'
                                            : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-white'
                                    }`}
                                >
                                    <div className="font-black">{option.label}</div>
                                    <div className="mt-1 text-[11px] font-bold text-gray-500 line-clamp-1">{option.note}</div>
                                </button>
                            ))}
                        </div>

                        <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-50">
                            <span className="inline-flex items-center gap-2">
                                <Upload size={16} />
                                رفع خط مخصص
                            </span>
                            <span className="text-[11px] font-bold text-indigo-500">WOFF/WOFF2 حتى 500KB</span>
                            <input
                                type="file"
                                accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2"
                                className="hidden"
                                onChange={(event) => void handleFontUpload(section.key, event.target.files?.[0])}
                            />
                        </label>

                        {section.customFont?.fileName ? (
                            <div className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-xs font-bold text-gray-600">
                                الملف الحالي: {section.customFont.fileName} - {Math.round((section.customFont.size || 0) / 1024)}KB
                            </div>
                        ) : null}
                    </section>
                ))}
            </div>

            <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-gray-700">
                    <Type size={16} />
                    معاينة مباشرة
                </div>
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                    <h2 className="platform-heading-font text-3xl font-black text-gray-900">حقق المئة في اختباراتك</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">
                        رحلة تعليمية ذكية تجمع بين التدريب المكثف والشروحات التفاعلية والتحليل الدقيق. هذه المعاينة تتغير فورًا قبل الحفظ.
                    </p>
                    <button className="mt-5 rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-white">زر تجريبي</button>
                </div>
            </section>
        </div>
    );
};
