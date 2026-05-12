import { PlatformFontFamily, PlatformFontSettings, PlatformFontUpload } from '../types';

export const DEFAULT_PLATFORM_FONT_SETTINGS: PlatformFontSettings = {
    key: 'default',
    bodyFont: 'tajawal',
    headingFont: 'tajawal',
    bodyCustomFont: {},
    headingCustomFont: {},
};

export const PLATFORM_FONT_OPTIONS: Array<{ id: PlatformFontFamily; label: string; cssFamily: string; googleFamily?: string; note: string }> = [
    { id: 'tajawal', label: 'Tajawal', cssFamily: "'Tajawal'", googleFamily: 'Tajawal:wght@300;400;500;700;800;900', note: 'الافتراضي الحالي للمنصة.' },
    { id: 'cairo', label: 'Cairo', cssFamily: "'Cairo'", googleFamily: 'Cairo:wght@300;400;500;700;800;900', note: 'واضح ومناسب للوحات والإدارة.' },
    { id: 'ibm-plex-sans-arabic', label: 'IBM Plex Sans Arabic', cssFamily: "'IBM Plex Sans Arabic'", googleFamily: 'IBM+Plex+Sans+Arabic:wght@300;400;500;700;800', note: 'هادئ ومهني للنصوص الطويلة.' },
    { id: 'noto-kufi-arabic', label: 'Noto Kufi Arabic', cssFamily: "'Noto Kufi Arabic'", googleFamily: 'Noto+Kufi+Arabic:wght@400;500;700;800', note: 'قوي للعناوين والواجهات التعليمية.' },
    { id: 'system', label: 'System', cssFamily: 'ui-sans-serif, system-ui', note: 'أسرع تحميلًا إذا أردت تقليل الاعتماد الخارجي.' },
    { id: 'custom', label: 'خط مرفوع', cssFamily: 'var(--platform-custom-font-fallback)', note: 'ارفع WOFF/WOFF2 خفيفًا من الإدارة.' },
];

const getOption = (id?: PlatformFontFamily) =>
    PLATFORM_FONT_OPTIONS.find((option) => option.id === id) || PLATFORM_FONT_OPTIONS[0];

export const normalizePlatformFontSettings = (settings?: Partial<PlatformFontSettings> | null): PlatformFontSettings => ({
    ...DEFAULT_PLATFORM_FONT_SETTINGS,
    ...settings,
    bodyFont: settings?.bodyFont || DEFAULT_PLATFORM_FONT_SETTINGS.bodyFont,
    headingFont: settings?.headingFont || DEFAULT_PLATFORM_FONT_SETTINGS.headingFont,
    bodyCustomFont: settings?.bodyCustomFont || {},
    headingCustomFont: settings?.headingCustomFont || {},
});

const removeElement = (id: string) => {
    document.getElementById(id)?.remove();
};

const ensureGoogleFonts = (settings: PlatformFontSettings) => {
    const families = [getOption(settings.bodyFont).googleFamily, getOption(settings.headingFont).googleFamily].filter(Boolean);
    if (!families.length) {
        removeElement('platform-font-google-link');
        return;
    }

    const href = `https://fonts.googleapis.com/css2?${families.map((family) => `family=${family}`).join('&')}&display=swap`;
    let link = document.getElementById('platform-font-google-link') as HTMLLinkElement | null;
    if (!link) {
        link = document.createElement('link');
        link.id = 'platform-font-google-link';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    link.href = href;
};

const customFontCss = (name: string, upload?: PlatformFontUpload) => {
    if (!upload?.dataUrl || !name) {
        return '';
    }

    return `
@font-face {
  font-family: '${name}';
  src: url('${upload.dataUrl}') format('${upload.mimeType?.includes('woff2') ? 'woff2' : upload.mimeType?.includes('ttf') ? 'truetype' : upload.mimeType?.includes('otf') ? 'opentype' : 'woff'}');
  font-display: swap;
}`;
};

const getCssFamily = (font: PlatformFontFamily, customName: string, fallback = "'Tajawal'") => {
    if (font === 'custom') {
        return customName ? `'${customName}', ${fallback}` : fallback;
    }

    return getOption(font).cssFamily;
};

export const applyPlatformFontSettings = (rawSettings?: Partial<PlatformFontSettings> | null) => {
    if (typeof document === 'undefined') {
        return;
    }

    const settings = normalizePlatformFontSettings(rawSettings);
    ensureGoogleFonts(settings);

    const bodyCustomName = settings.bodyCustomFont?.name?.trim() || 'PlatformCustomBody';
    const headingCustomName = settings.headingCustomFont?.name?.trim() || 'PlatformCustomHeading';
    const bodyFamily = getCssFamily(settings.bodyFont, bodyCustomName);
    const headingFamily = getCssFamily(settings.headingFont, headingCustomName, bodyFamily);
    document.documentElement.style.setProperty('--platform-font-body', bodyFamily);
    document.documentElement.style.setProperty('--platform-font-heading', headingFamily);

    let style = document.getElementById('platform-custom-font-style') as HTMLStyleElement | null;
    if (!style) {
        style = document.createElement('style');
        style.id = 'platform-custom-font-style';
        document.head.appendChild(style);
    }
    style.textContent = [
        settings.bodyFont === 'custom' ? customFontCss(bodyCustomName, settings.bodyCustomFont) : '',
        settings.headingFont === 'custom' ? customFontCss(headingCustomName, settings.headingCustomFont) : '',
    ].filter(Boolean).join('\n');
};
