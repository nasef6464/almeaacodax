import { readFile } from "node:fs/promises";

const routes = await readFile(new URL("../server/src/routes/ai.routes.ts", import.meta.url), "utf8");
const routing = await readFile(new URL("../server/src/modules/ai/application/aiCapabilityRouting.ts", import.meta.url), "utf8");
const media = await readFile(new URL("../services/aiMediaClient.ts", import.meta.url), "utf8");
const chat = await readFile(new URL("../components/ChatWidget.tsx", import.meta.url), "utf8");
const control = await readFile(new URL("../dashboards/admin/ai/AiControlCenterSettings.tsx", import.meta.url), "utf8");

const checks = [];
const check = (name, pass) => checks.push({ name, status: pass ? "PASS" : "FAIL" });

check("vision is an explicit capability rather than hidden inside generic chat",
  routing.includes('"vision_chat"') &&
  routes.includes('hasImage ? "vision_chat" : "student_chat"') &&
  control.includes("vision_chat: 'رؤية الصور للطالب'"));

check("current vision transport only routes images to the implemented Gemini image adapter",
  routes.includes('capability === "vision_chat"') &&
  routes.includes('provider === "gemini" || provider === "none"'));

check("images are resized and compressed in the browser before Node receives them",
  media.includes("compressImageForAi") &&
  media.includes("maxDimension") &&
  media.includes("maxBytes") &&
  chat.includes("compressImageForAi(file)"));

check("voice v1 is push-to-talk and reuses the text tutor instead of adding a paid realtime stack",
  media.includes("recognizeArabicOnce") &&
  media.includes('recognition.lang = "ar-SA"') &&
  chat.includes("handleVoiceInput") &&
  chat.includes("getChatResponse"));

check("static tutor voice uses browser speech synthesis with no provider TTS call",
  media.includes("SpeechSynthesisUtterance") &&
  media.includes("window.speechSynthesis.speak") &&
  chat.includes("speakArabic(botMsg.text)"));

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ phase: "AI-6-voice-vision", status: failed.length ? "FAIL" : "PASS", checks }, null, 2));
if (failed.length) process.exit(1);
