import React from 'react';
import { ProductConfigSellableSettingsPanel } from './ProductConfigSellableSettingsPanel';
import { PlatformIntegrationsManager as LegacyPlatformIntegrationsManager } from './PlatformIntegrationsManagerLegacy';

export const PlatformIntegrationsManager: React.FC = () => (
    <div className="space-y-6">
        <ProductConfigSellableSettingsPanel />
        <LegacyPlatformIntegrationsManager />
    </div>
);
