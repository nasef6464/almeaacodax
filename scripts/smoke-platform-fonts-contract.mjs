import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [
  ['types.ts', ['PlatformFontSettings', 'PlatformFontFamily', 'PlatformFontUpload']],
  ['server/src/models/PlatformFontSettings.ts', ['PlatformFontSettingsModel', 'bodyFont', 'headingFont']],
  ['server/src/routes/content.routes.ts', ['platform-font-settings', 'PlatformFontSettingsModel', 'requireRole(["admin"])']],
  ['services/api.ts', ['getPlatformFontSettings', 'updatePlatformFontSettings']],
  ['utils/platformFonts.ts', ['DEFAULT_PLATFORM_FONT_SETTINGS', 'applyPlatformFontSettings', '--platform-font-body', '--platform-font-heading']],
  ['components/PlatformFontBootstrap.tsx', ['getPlatformFontSettings', 'PLATFORM_FONT_SETTINGS_UPDATED']],
  ['dashboards/admin/PlatformFontsManager.tsx', ['updatePlatformFontSettings(settings, user.token)', 'رفع خط مخصص', '500KB']],
  ['dashboards/admin/AdminDashboard.tsx', ['PlatformFontsManager', 'platform-fonts', 'Type size={20}']],
  ['index.html', ['--platform-font-body', '--platform-font-heading', 'var(--platform-font-body)', 'platform-heading-font']],
];

for (const [file, needles] of checks) {
  const content = read(file);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${file} must include: ${needle}`);
    }
  }
}

console.log('Platform fonts contract passed: admin-managed global fonts are wired end to end.');
