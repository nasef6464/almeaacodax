import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const checks = [];
const assertContains = (label, content, pattern) => {
  const pass = typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
  checks.push({ label, pass });
};
const assertNotContains = (label, content, pattern) => {
  const pass = typeof pattern === "string" ? !content.includes(pattern) : !pattern.test(content);
  checks.push({ label, pass });
};

const homepageManager = read("dashboards/admin/HomepageManager.tsx");
const header = read("components/Header.tsx");
const types = read("types.ts");
const model = read("server/src/models/HomepageSettings.ts");
const routes = read("server/src/routes/content.routes.ts");
const presentationSchemas = read("server/src/modules/content/http/platformPresentationSchemas.ts");

assertContains("HomepageSettings type exposes brand settings", types, "HomepageBrandSettings");
assertContains("Homepage model persists brand settings", model, "homepageBrandSchema");
assertContains("Homepage route uses extracted homepage settings schema", routes, "homepageSettingsSchema");
assertContains("Homepage presentation schema validates brand payload", presentationSchemas, "brand: z");
assertContains("Homepage manager has logo upload handler", homepageManager, "handleBrandLogoUpload");
assertContains("Homepage manager renders logo settings section", homepageManager, "شعار المنصة");
assertContains("Homepage preview button opens clean home route", homepageManager, 'href="/"');
assertContains("Homepage manager has featured course search", homepageManager, "courseSearch");
assertContains("Homepage manager has featured article search", homepageManager, "articleSearch");
assertNotContains("Featured courses selector is not capped at 30", homepageManager, "availableCourses.slice(0, 30)");
assertNotContains("Featured articles selector is not capped at 30", homepageManager, "availableArticleLessons.slice(0, 30)");
assertContains("Header loads homepage branding settings", header, "api.getHomepageSettings");
assertContains("Header uses admin-controlled brand logo", header, "brandLogoUrl");

const failed = checks.filter((check) => !check.pass);

if (failed.length > 0) {
  console.error("BATCH 100K homepage/admin sweep contract failed:");
  for (const check of failed) {
    console.error(`- ${check.label}`);
  }
  process.exit(1);
}

console.log("BATCH 100K homepage/admin sweep contract passed.");
