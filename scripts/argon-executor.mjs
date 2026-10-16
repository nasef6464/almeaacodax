import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// 1. Resolve Project Root
const REPO_ROOT = process.cwd();

// 2. Load GEMINI_API_KEY from server/.env if not already in process.env
if (!process.env.GEMINI_API_KEY) {
  const envPath = path.join(REPO_ROOT, "server", ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...rest] = trimmed.split("=");
      const val = rest.join("=").trim();
      if (key && val && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ خطأ: لم يتم العثور على GEMINI_API_KEY في بيئة التشغيل أو في server/.env");
  process.exit(1);
}

// 3. Parse Task Prompt from arguments
const rawArgs = process.argv.slice(2);
const taskPrompt = rawArgs.join(" ").trim();

if (!taskPrompt) {
  console.log("Usage: node scripts/argon-executor.mjs \"<Task Description>\"");
  console.log("Example: npm run argon -- \"Add a new helper function in utils/math.ts\"");
  process.exit(0);
}

console.log("=================================================");
console.log("🤖 Almeaa Platform — Gemini / Argon Task Executor");
console.log("=================================================");
console.log(`📌 المهمة المطلوبة: "${taskPrompt}"\n`);

// 4. Gather Workspace Context
// Extract potential file paths mentioned in the prompt
const potentialPathRegex = /([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]{1,6})/g;
const matchedPaths = taskPrompt.match(potentialPathRegex) || [];
const contextFiles = [];

for (const rawMatch of matchedPaths) {
  const normalized = rawMatch.replace(/\\/g, "/");
  const fullPath = path.resolve(REPO_ROOT, normalized);
  if (fullPath.startsWith(REPO_ROOT) && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const rel = path.relative(REPO_ROOT, fullPath).replace(/\\/g, "/");
    try {
      const content = fs.readFileSync(fullPath, "utf8");
      contextFiles.push({ path: rel, content: content.slice(0, 15000) });
      console.log(`📂 تم تضمين سياق الملف المذكور: ${rel} (${content.length} bytes)`);
    } catch {}
  }
}

// Git Status Snapshot
let gitStatus = "";
try {
  gitStatus = execSync("git status --short", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }).trim();
} catch {}

const preferredModel = process.env.GEMINI_MODEL || "gemini-4-argon";

// 5. Construct System Instructions & Prompt
const systemPrompt = `
You are Gemini 4 Argon, the Principal Software Engineer and Autonomous AI Agent for the Almeaa Educational Platform.
Repository Architecture:
- Frontend: React 19, Vite, Tailwind CSS, TypeScript (in components/, pages/, src/, dashboards/)
- Backend: Node.js, Express, TypeScript, Mongoose/MongoDB Atlas (in server/src/)
- Workflows & Scripts: .github/workflows/, scripts/

YOUR MISSION:
Execute the user's task instruction by providing concrete file modifications and additions.

IMPORTANT OUTPUT CONSTRAINTS:
1. You MUST respond with ONLY a single, valid JSON object.
2. Do NOT add prose, commentary, or greetings outside the JSON.
3. The JSON MUST strictly follow this exact structure:
{
  "explanation": "Short Arabic summary of the changes executed",
  "commitMessage": "feat/fix(scope): concise English commit message following conventional commits",
  "filesToWrite": [
    {
      "path": "relative/path/to/file.ext",
      "content": "Complete, working, full new file content (never truncate or use placeholders)"
    }
  ],
  "filesToDelete": [
    "relative/path/to/obsolete_file.ext"
  ]
}
`;

const userMessage = `
User Task Instruction:
"""
${taskPrompt}
"""

Git Status Snapshot:
${gitStatus || "Clean working tree"}

Context Files Provided (${contextFiles.length}):
${contextFiles.map((f) => `--- File: ${f.path} ---\n${f.content}\n--- End File ---`).join("\n\n") || "No explicit files provided in prompt."}

Execute this task and return ONLY the required JSON.
`;

// 6. Call Google Gemini / Argon
async function runExecutor() {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  console.log(`⏳ جارٍ إرسال المهمة للنموذج: ${preferredModel}...`);
  let response;

  try {
    response = await ai.models.generateContent({
      model: preferredModel,
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
  } catch (err) {
    if (preferredModel !== "gemini-2.5-flash") {
      console.warn(`⚠️ تعذر استخدام ${preferredModel} (${err.message?.slice(0, 100)}). جارٍ التراجع التلقائي إلى gemini-2.5-flash...`);
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });
    } else {
      throw err;
    }
  }

  const rawText = response.text?.trim() || "";
  if (!rawText) {
    throw new Error("لم يتم استلام أي نص من النموذج.");
  }

  // 7. Parse JSON Response
  let cleanJson = rawText;
  if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let result;
  try {
    result = JSON.parse(cleanJson);
  } catch (e) {
    console.error("❌ فشل في فك شفرة JSON الراجع من النموذج:");
    console.error(rawText);
    throw new Error(`Invalid JSON returned by Gemini: ${e.message}`);
  }

  console.log(`\n✅ تم استلام خطة التنفيذ:`);
  console.log(`📝 الشرح: ${result.explanation || "لا يوجد"}`);
  console.log(`📌 رسالة الـ Commit: ${result.commitMessage || "chore: apply ai updates"}\n`);

  // 8. Apply File Modifications
  const filesToWrite = Array.isArray(result.filesToWrite) ? result.filesToWrite : [];
  const filesToDelete = Array.isArray(result.filesToDelete) ? result.filesToDelete : [];

  const protectedFiles = [".env", "server/.env", ".git", "package-lock.json"];

  let appliedWrites = 0;
  for (const item of filesToWrite) {
    if (!item.path || typeof item.content !== "string") continue;
    const normalized = item.path.replace(/\\/g, "/").trim();
    if (protectedFiles.some((p) => normalized === p || normalized.endsWith(`/${p}`))) {
      console.warn(`⚠️ تم تخطي تعديل ملف محمي أمنياً: ${normalized}`);
      continue;
    }
    const fullPath = path.resolve(REPO_ROOT, normalized);
    if (!fullPath.startsWith(REPO_ROOT)) {
      console.warn(`⚠️ تم رفض مسار خارج المستودع: ${normalized}`);
      continue;
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, item.content, "utf8");
    console.log(`  ✍️  تمت كتابة: ${normalized} (${item.content.length} حرف)`);
    appliedWrites++;
  }

  let appliedDeletes = 0;
  for (const delPath of filesToDelete) {
    if (typeof delPath !== "string") continue;
    const normalized = delPath.replace(/\\/g, "/").trim();
    if (protectedFiles.some((p) => normalized === p || normalized.endsWith(`/${p}`))) {
      console.warn(`⚠️ تم تخطي حذف ملف محمي أمنياً: ${normalized}`);
      continue;
    }
    const fullPath = path.resolve(REPO_ROOT, normalized);
    if (!fullPath.startsWith(REPO_ROOT)) continue;

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`  🗑️  تم حذف: ${normalized}`);
      appliedDeletes++;
    }
  }

  // 9. Output Summary for GitHub Actions if available
  const summaryEnv = process.env.GITHUB_STEP_SUMMARY;
  if (summaryEnv) {
    const summaryMd = `
## 🤖 تقرير تنفيذ مهمة Argon الذاتية

* **المهمة المطلوبة:** ${taskPrompt}
* **الملفات المكتوبة/المعدلة:** ${appliedWrites} ملف
* **الملفات المحذوفة:** ${appliedDeletes} ملف
* **الرسالة المقترحة:** \`${result.commitMessage || "chore: apply ai updates"}\`

### ملخص التعديلات:
${result.explanation || "تم تطبيق التعديلات بنجاح."}
`;
    try {
      fs.appendFileSync(summaryEnv, summaryMd, "utf8");
    } catch {}
  }

  // Save metadata file for CI to consume commit message and branch details
  const metaPath = path.join(REPO_ROOT, ".argon_last_run.json");
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        taskPrompt,
        commitMessage: result.commitMessage || `feat(ai): ${taskPrompt.slice(0, 50)}`,
        explanation: result.explanation || "",
        appliedWrites,
        appliedDeletes,
        timestamp: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\n🎉 اكتمل التنفيذ بنجاح! (${appliedWrites} كتابة، ${appliedDeletes} حذف)`);
}

runExecutor().catch((err) => {
  console.error("\n❌ حدث خطأ أثناء تنفيذ المهمة:", err.message);
  process.exit(1);
});
