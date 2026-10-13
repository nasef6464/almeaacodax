import React, { useState } from 'react';
import { ProductConfigSellableSettingsPanel } from './ProductConfigSellableSettingsPanel';
import { PlatformIntegrationsManager as LegacyPlatformIntegrationsManager } from './PlatformIntegrationsManagerLegacy';

export const PlatformIntegrationsManager: React.FC = () => {
    const [legacyRevision, setLegacyRevision] = useState(0);

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm">اختيارات المزود وحساب المدرس أو المنصة والرابط اليدوي في قسم إدارة الحصص. حفظ بيانات التطبيق هنا لا يعني تفويض الحساب أو نجاح إنشاء اجتماع تلقائيًا.</div>
            <ProductConfigSellableSettingsPanel onSaved={() => setLegacyRevision((current) => current + 1)} />
            <LegacyPlatformIntegrationsManager key={legacyRevision} />
        </div>
    );
};
