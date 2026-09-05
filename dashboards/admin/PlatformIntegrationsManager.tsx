import React, { useState } from 'react';
import { ProductConfigSellableSettingsPanel } from './ProductConfigSellableSettingsPanel';
import { PlatformIntegrationsManager as LegacyPlatformIntegrationsManager } from './PlatformIntegrationsManagerLegacy';

export const PlatformIntegrationsManager: React.FC = () => {
    const [legacyRevision, setLegacyRevision] = useState(0);

    return (
        <div className="space-y-6">
            <ProductConfigSellableSettingsPanel onSaved={() => setLegacyRevision((current) => current + 1)} />
            <LegacyPlatformIntegrationsManager key={legacyRevision} />
        </div>
    );
};
