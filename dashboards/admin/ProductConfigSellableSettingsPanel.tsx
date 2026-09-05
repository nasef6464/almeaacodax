import React, { useEffect, useState } from 'react';
import { RefreshCw, Save, Settings2 } from 'lucide-react';
import { api } from '../../services/api';

type ProductConfigAdminFields = {
    auth: {
        defaultRole: 'student' | 'parent';
        registrationTitle: string;
        registrationSubtitle: string;
        termsLink: string;
        privacyLink: string;
    };
    seo: {
        defaultKeywords: string[];
        organizationName: string;
        organizationLogoUrl: string;
        organizationUrl: string;
    };
};

type IntegrationPayload = {
    auth?: Partial<ProductConfigAdminFields['auth']>;
    seo?: Partial<ProductConfigAdminFields['seo']>;
};

const EMPTY_FIELDS: ProductConfigAdminFields = {
    auth: {
        defaultRole: 'student',
        registrationTitle: '',
        registrationSubtitle: '',
        termsLink: '',
        privacyLink: '',
    },
    seo: {
        defaultKeywords: [],
        organizationName: '',
        organizationLogoUrl: '',
        organizationUrl: '',
    },
};

const readFields = (payload: unknown): ProductConfigAdminFields => {
    const source = (payload && typeof payload === 'object' ? payload : {}) as {
        auth?: Partial<ProductConfigAdminFields['auth']>;
        seo?: Partial<ProductConfigAdminFields['seo']>;
    };

    return {
        auth: {
            ...EMPTY_FIELDS.auth,
            ...(source.auth || {}),
            defaultRole: source.auth?.defaultRole === 'parent' ? 'parent' : 'student',
        },
        seo: {
            ...EMPTY_FIELDS.seo,
            ...(source.seo || {}),
            defaultKeywords: Array.isArray(source.seo?.defaultKeywords)
                ? source.seo.defaultKeywords.map((item) => String(item || '').trim()).filter(Boolean)
                : [],
        },
    };
};

const normalizeKeywords = (value: string) =>
    value
        .split(/[\n,،]+/)
        .map((item) => item.trim())
        .filter(Boolean);

export const ProductConfigSellableSettingsPanel: React.FC = () => {
    const [fields, setFields] = useState<ProductConfigAdminFields>(EMPTY_FIELDS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setFields(readFields(await api.getPlatformIntegrations()));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل إعدادات ProductConfig القابلة للبيع.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const updateAuth = <K extends keyof ProductConfigAdminFields['auth']>(
        key: K,
        value: ProductConfigAdminFields['auth'][K],
    ) => {
        setFields((current) => ({
            ...current,
            auth: { ...current.auth, [key]: value },
        }));
        setSuccess(null);
    };

    const updateSeo = <K extends keyof ProductConfigAdminFields['seo']>(
        key: K,
        value: ProductConfigAdminFields['seo'][K],
    ) => {
        setFields((current) => ({
            ...current,
            seo: { ...current.seo, [key]: value },
        }));
        setSuccess(null);
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        const patch: IntegrationPayload = {
            auth: {
                defaultRole: fields.auth.defaultRole,
                registrationTitle: fields.auth.registrationTitle.trim(),
                registrationSubtitle: fields.auth.registrationSubtitle.trim(),
                termsLink: fields.auth.termsLink.trim(),
                privacyLink: fields.auth.privacyLink.trim(),
            },
            seo: {
                defaultKeywords: fields.seo.defaultKeywords,
                organizationName: fields.seo.organizationName.trim(),
                organizationLogoUrl: fields.seo.organizationLogoUrl.trim(),
                organizationUrl: fields.seo.organizationUrl.trim(),
            },
        };

        try {
            await api.updatePlatformIntegrations(patch);
            const verified = readFields(await api.getPlatformIntegrations());
            setFields(verified);
            setSuccess('تم حفظ إعدادات ProductConfig والتأكد منها من الخادم.');
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ إعدادات ProductConfig.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section
            data-testid="product-config-sellable-settings-panel"
            className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6"
        >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-indigo-700">
                        <Settings2 size={18} />
                        <span className="text-xs font-black">ProductConfig / White-label</span>
                    </div>
                    <h2 className="mt-1 text-xl font-black text-gray-900">إعدادات هوية العميل والتسجيل العامة</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
                        هذه الحقول تكمل إعدادات البيع التي يقرأها ProductConfig من نفس PlatformIntegrationSettings؛ لا توجد قاعدة إعدادات موازية.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => void load()}
                        disabled={loading || saving}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-black text-indigo-700 disabled:opacity-60"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        تحديث
                    </button>
                    <button
                        type="button"
                        data-testid="product-config-sellable-settings-save"
                        onClick={() => void save()}
                        disabled={loading || saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                    >
                        <Save size={16} />
                        {saving ? 'جاري الحفظ...' : 'حفظ إعدادات البيع'}
                    </button>
                </div>
            </div>

            {error ? <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}
            {success ? <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div> : null}

            {loading ? (
                <div className="mt-5 text-sm text-gray-500">جاري تحميل الحقول...</div>
            ) : (
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <div className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                        <h3 className="text-base font-black text-gray-900">التسجيل والروابط القانونية</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <label className="block">
                                <span className="mb-1 block text-xs font-black text-gray-600">الدور الافتراضي عند التسجيل</span>
                                <select
                                    data-testid="product-config-default-role"
                                    value={fields.auth.defaultRole}
                                    onChange={(event) => updateAuth('defaultRole', event.target.value as 'student' | 'parent')}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                                >
                                    <option value="student">طالب</option>
                                    <option value="parent">ولي أمر</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-black text-gray-600">عنوان صفحة التسجيل</span>
                                <input
                                    data-testid="product-config-registration-title"
                                    value={fields.auth.registrationTitle}
                                    onChange={(event) => updateAuth('registrationTitle', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                    placeholder="ابدأ رحلتك التعليمية الآن"
                                />
                            </label>
                            <label className="block md:col-span-2">
                                <span className="mb-1 block text-xs font-black text-gray-600">وصف صفحة التسجيل</span>
                                <textarea
                                    data-testid="product-config-registration-subtitle"
                                    value={fields.auth.registrationSubtitle}
                                    onChange={(event) => updateAuth('registrationSubtitle', event.target.value)}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-black text-gray-600">رابط الشروط</span>
                                <input
                                    data-testid="product-config-terms-link"
                                    value={fields.auth.termsLink}
                                    onChange={(event) => updateAuth('termsLink', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                    placeholder="https://example.com/terms"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-black text-gray-600">رابط الخصوصية</span>
                                <input
                                    data-testid="product-config-privacy-link"
                                    value={fields.auth.privacyLink}
                                    onChange={(event) => updateAuth('privacyLink', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                    placeholder="https://example.com/privacy"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white bg-white p-5 shadow-sm">
                        <h3 className="text-base font-black text-gray-900">هوية المؤسسة وSEO العامة</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <label className="block md:col-span-2">
                                <span className="mb-1 block text-xs font-black text-gray-600">الكلمات المفتاحية</span>
                                <textarea
                                    data-testid="product-config-default-keywords"
                                    value={fields.seo.defaultKeywords.join(', ')}
                                    onChange={(event) => updateSeo('defaultKeywords', normalizeKeywords(event.target.value))}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                    placeholder="تعليم، اختبارات، تدريب"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-black text-gray-600">اسم المؤسسة</span>
                                <input
                                    data-testid="product-config-organization-name"
                                    value={fields.seo.organizationName}
                                    onChange={(event) => updateSeo('organizationName', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs font-black text-gray-600">رابط شعار المؤسسة</span>
                                <input
                                    data-testid="product-config-organization-logo-url"
                                    value={fields.seo.organizationLogoUrl}
                                    onChange={(event) => updateSeo('organizationLogoUrl', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                    placeholder="https://example.com/logo.png"
                                />
                            </label>
                            <label className="block md:col-span-2">
                                <span className="mb-1 block text-xs font-black text-gray-600">رابط المؤسسة</span>
                                <input
                                    data-testid="product-config-organization-url"
                                    value={fields.seo.organizationUrl}
                                    onChange={(event) => updateSeo('organizationUrl', event.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                                    placeholder="https://example.com"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
