import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const homepageManager = read("dashboards/admin/HomepageManager.tsx");
const landing = read("pages/Landing.tsx");
const packageJson = read("package.json");

const checks = [
  ["Homepage manager defines ColorField", homepageManager.includes("const ColorField")],
  ["Homepage manager uses native color input", homepageManager.includes('type="color"')],
  ["Homepage manager has reusable swatches", homepageManager.includes("COLOR_SWATCHES")],
  ["Homepage manager exposes at least 24 color swatches", (homepageManager.match(/#[0-9a-fA-F]{6}/g) || []).length >= 24],
  ["Homepage manager explains visible color selection", homepageManager.includes("اختر من اللوحة")],
  ["Homepage manager can clear colors to defaults", homepageManager.includes("افتراضي")],
  ["Badge color uses ColorField", /<ColorField label="لون الشارة"[\s\S]*badgeTextColor/.test(homepageManager)],
  ["Title prefix color uses ColorField", /<ColorField label="لون مقدمة العنوان"[\s\S]*titlePrefixColor/.test(homepageManager)],
  ["Title highlight color uses ColorField", /<ColorField label="لون الكلمة المميزة"[\s\S]*titleHighlightColor/.test(homepageManager)],
  ["Title suffix color uses ColorField", /<ColorField label="لون نهاية العنوان"[\s\S]*titleSuffixColor/.test(homepageManager)],
  ["Description color uses ColorField", /<ColorField label="لون الوصف الرئيسي"[\s\S]*descriptionColor/.test(homepageManager)],
  ["Primary CTA color uses ColorField", /<ColorField label="لون زر البداية"[\s\S]*primaryCtaColor/.test(homepageManager)],
  ["Secondary CTA color uses ColorField", /<ColorField label="لون الزر الثانوي"[\s\S]*secondaryCtaColor/.test(homepageManager)],
  ["Tertiary CTA color uses ColorField", /<ColorField label="لون الزر الثالث"[\s\S]*tertiaryCtaColor/.test(homepageManager)],
  ["Landing still validates safe HEX colors", landing.includes("resolveHeroColor")],
  ["npm script is registered", packageJson.includes("smoke:batch100l-homepage-color-picker")],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length > 0) {
  console.error("BATCH 100L homepage color picker contract failed:");
  for (const [label] of failed) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log("BATCH 100L homepage color picker contract passed.");
