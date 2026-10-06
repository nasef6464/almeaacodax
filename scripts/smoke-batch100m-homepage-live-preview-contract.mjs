import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const homepageManager = read("dashboards/admin/HomepageManager.tsx");
const packageJson = read("package.json");

const checks = [
  ["Homepage manager renders live preview component", homepageManager.includes("<HeroLivePreview settings={settings} />")],
  ["HeroLivePreview component exists", homepageManager.includes("const HeroLivePreview")],
  ["Live preview has Arabic title", homepageManager.includes("معاينة حية قبل الحفظ")],
  ["Live preview explains pre-save behavior", homepageManager.includes("جرّب النصوص والألوان هنا أولًا")],
  ["Live preview uses badge color", homepageManager.includes("badgeTextColor") && homepageManager.includes("style={{ color: badgeTextColor }}")],
  ["Live preview uses title colors", homepageManager.includes("titlePrefixColor") && homepageManager.includes("titleHighlightColor") && homepageManager.includes("titleSuffixColor")],
  ["Live preview uses description color", homepageManager.includes("descriptionColor") && homepageManager.includes("style={{ color: descriptionColor }}")],
  ["Live preview uses CTA colors", homepageManager.includes("primaryCtaColor") && homepageManager.includes("secondaryCtaColor") && homepageManager.includes("tertiaryCtaColor")],
  ["Live preview uses current hero image", homepageManager.includes("hero.imageUrl") && homepageManager.includes("<img src={hero.imageUrl}")],
  ["Live preview does not save by itself", !/HeroLivePreview[\s\S]{0,2500}handleSave/.test(homepageManager)],
  ["npm script is registered", packageJson.includes("smoke:batch100m-homepage-live-preview")],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length > 0) {
  console.error("BATCH 100M homepage live preview contract failed:");
  for (const [label] of failed) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log("BATCH 100M homepage live preview contract passed.");
