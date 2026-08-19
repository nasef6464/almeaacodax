import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'dashboards/admin/FinancialManager.tsx');
const source = fs.readFileSync(target, 'utf8');

const startMarker = "    const applyCountryPreset = async (country: 'SA' | 'EG') => {";
const endMarker = "\n\n    const applyProviderPreset = (";

const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('Guard failed: applyCountryPreset block shape was not found exactly. No file was changed.');
}

const currentBlock = source.slice(start, end);
if (currentBlock.includes('api.applyPaymentCountryPreset')) {
  console.log('Payment country preset runtime call already present; no repair needed.');
  process.exit(0);
}

if (!currentBlock.includes('setSettings((current) => ({ ...current, ...preset }))')) {
  throw new Error('Guard failed: expected local-only preset behavior is no longer present. No file was changed.');
}

const replacement = `    const applyCountryPreset = async (country: 'SA' | 'EG') => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.applyPaymentCountryPreset(country) as { settings?: PaymentSettings } | PaymentSettings;
            const persistedSettings = 'settings' in response && response.settings ? response.settings : response;
            setSettings(persistedSettings as PaymentSettings);
            setFeedback(country === 'SA' ? 'تم تطبيق إعدادات الدفع للسعودية وحفظها' : 'تم تطبيق إعدادات الدفع لمصر وحفظها');
            setTimeout(() => setFeedback(null), 3000);
        } catch (presetError) {
            setError(presetError instanceof Error ? presetError.message : 'تعذر تطبيق إعدادات الدولة الآن.');
        } finally {
            setLoading(false);
        }
    };`;

const next = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(target, next, 'utf8');
console.log('Applied guarded payment country preset runtime repair.');
