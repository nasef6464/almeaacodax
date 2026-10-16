import fs from "node:fs";
import { execSync } from "node:child_process";

console.log("=== Almeaa Platform — Gemini AI Repository & Architecture Audit ===");

const runCommand = (cmd, label) => {
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true, output: output.trim() };
  } catch (error) {
    return { ok: false, output: (error.stdout || error.stderr || error.message || "").trim() };
  }
};

// 1. Gather Git State
const commitInfo = runCommand('git log -n 1 --pretty=format:"%h - %s (%an, %cd)"', "Git Commit").output;
const changedFilesRaw = runCommand("git diff --name-only HEAD~1 HEAD", "Changed Files").output;
const changedFiles = changedFilesRaw ? changedFilesRaw.split("\n").filter(Boolean) : [];

console.log(`Latest commit: ${commitInfo}`);
console.log(`Changed files count: ${changedFiles.length}`);

// 2. Perform Code Checks
console.log("\n--- Checking Frontend TypeScript & UI Typings ---");
const frontendCheck = runCommand("npx tsc --noEmit", "Frontend Check");
console.log(`Frontend Typecheck: ${frontendCheck.ok ? "PASS" : "WARN/FAIL"}`);

console.log("\n--- Checking Backend Server Typings & Schema Models ---");
const backendCheck = runCommand("npx tsc --noEmit -p server/tsconfig.json", "Backend Check");
console.log(`Backend Typecheck: ${backendCheck.ok ? "PASS" : "WARN/FAIL"}`);

// 3. Prepare Audit Payload for Gemini
const auditContext = `
Commit: ${commitInfo}
Recent Modified Files (${changedFiles.length}):
${changedFiles.slice(0, 30).map((f) => ` - ${f}`).join("\n") || "No recent git diff detected (direct head audit)"}

Frontend Typings Status: ${frontendCheck.ok ? "PASSED (0 TypeScript compile errors)" : `ERRORS:\n${frontendCheck.output.slice(0, 800)}`}
Backend Typings Status: ${backendCheck.ok ? "PASSED (0 TypeScript compile errors)" : `ERRORS:\n${backendCheck.output.slice(0, 800)}`}
`;

const apiKey = process.env.GEMINI_API_KEY;

async function executeGeminiReview() {
  let aiReviewMarkdown = "";

  if (!apiKey || apiKey === "dummy" || apiKey.includes("your-key")) {
    aiReviewMarkdown = `
> [!WARNING]
> لم يتم تزويد مفتاح \`GEMINI_API_KEY\` في بيئة التشغيل أو في خزنة GitHub Secrets.
> 
> **لتفعيل المراجعة الذكية عبر الذكاء الاصطناعي:**
> 1. افتح إعدادات المستودع على GitHub: **Settings** ➡️ **Secrets and variables** ➡️ **Actions**.
> 2. اضغط **New repository secret**.
> 3. أدخل الاسم: \`GEMINI_API_KEY\` والقيمة: مفتاح الـ API من Google AI Studio.
`;
    console.log("\n[Notice] GEMINI_API_KEY is not set or placeholder. Skipping AI generation step.");
  } else {
    try {
      const preferredModel = process.env.GEMINI_MODEL || "gemini-4-argon";
      console.log(`\n--- Initiating Gemini AI Deep Review using model: ${preferredModel} ---`);
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
You are a Principal Software Engineer and QA Architect auditing the Almeaa Educational Platform repository (React 19, TypeScript, Tailwind, Node.js Express, MongoDB Atlas).
Review this system diagnostic report and changes:

${auditContext}

Provide a concise, professional audit report in Arabic using GitHub Markdown, structured as follows:
## 🔍 تقرير فحص ومراجعة منصة المئة عبر الذكاء الاصطناعي (Gemini / Argon)
1. **فحص الواجهات والفرونت إند (Frontend & UI):** تقييم التوافق والأنواع.
2. **فحص الباك إند والـ APIs (Backend & Server):** تقييم سلامة المسارات والمنطق.
3. **فحص قاعدة البيانات والنماذج (MongoDB & Schemas):** ملاحظات حول الأداء وسلامة المخططات.
4. **الخلاصة والتوصيات الهندسية:** هل المنظومة مستقرة أم توجد نقاط تحتاج تدخل المطورين؟
`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: preferredModel,
          contents: prompt,
        });
      } catch (modelErr) {
        if (preferredModel !== "gemini-2.5-flash") {
          console.warn(`Model ${preferredModel} is currently quota-capped or unavailable, falling back to gemini-2.5-flash...`);
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });
        } else {
          throw modelErr;
        }
      }

      aiReviewMarkdown = response.text || "لم يتم استلام نص من نموذج الذكاء الاصطناعي.";
      console.log("\nGemini AI Review generated successfully!");
    } catch (err) {
      console.error("\nError calling Gemini AI:", err.message);
      aiReviewMarkdown = `> [!CAUTION]\n> حدث خطأ أثناء الاتصال بنموذج Gemini: ${err.message}`;
    }
  }

  // 4. Output Summary to GitHub Step Summary if running in CI
  const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  const fullReport = `
# 🚀 تقرير الفحص الشامل للمستودع (Almeaa Repository Audit)

* **Commit:** \`${commitInfo}\`
* **Frontend Check:** ${frontendCheck.ok ? "✅ سليم (0 أخطاء)" : "⚠️ توجد أخطاء"}
* **Backend Check:** ${backendCheck.ok ? "✅ سليم (0 أخطاء)" : "⚠️ توجد أخطاء"}
* **Files Analyzed:** ${changedFiles.length} ملف

---

${aiReviewMarkdown}
`;

  if (stepSummaryPath) {
    try {
      fs.appendFileSync(stepSummaryPath, fullReport, "utf8");
      console.log("\nAudit report written to GITHUB_STEP_SUMMARY successfully.");
    } catch (e) {
      console.warn("Failed to write to GITHUB_STEP_SUMMARY:", e.message);
    }
  }

  console.log("\n=== Final Report Summary ===\n");
  console.log(fullReport);
}

executeGeminiReview();
