import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = String(process.env.PLAN9_BASE_URL || process.env.UI_AUDIT_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const OUT_DIR = path.resolve("audit-artifacts", "plan9-public-quality");
const routes = ["/", "/pricing", "/courses", "/quizzes"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, locale: "ar-SA" });
    await context.addInitScript(() => {
      window.__plan9Metrics = { lcp: 0, cls: 0 };
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) window.__plan9Metrics.lcp = Math.max(window.__plan9Metrics.lcp || 0, last.startTime || 0);
        }).observe({ type: "largest-contentful-paint", buffered: true });
      } catch {}
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__plan9Metrics.cls += entry.value || 0;
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
    });

    for (const route of routes) {
      const page = await context.newPage();
      const serverErrors = [];
      page.on("response", (response) => {
        if (response.status() >= 500) serverErrors.push({ status: response.status(), url: response.url() });
      });
      const started = Date.now();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(1800);
      const elapsedMs = Date.now() - started;

      const state = await page.evaluate(() => {
        const metric = window.__plan9Metrics || { lcp: 0, cls: 0 };
        const paint = performance.getEntriesByType("paint");
        const fcp = paint.find((entry) => entry.name === "first-contentful-paint")?.startTime || 0;
        const nav = performance.getEntriesByType("navigation")[0];
        const buttons = [...document.querySelectorAll("button")];
        const controls = [...document.querySelectorAll("input, select, textarea")];
        const imgs = [...document.querySelectorAll("img")];
        const unlabeledButtons = buttons.filter((el) => {
          const label = [
            el.textContent,
            el.getAttribute("aria-label"),
            el.getAttribute("title"),
          ].map((value) => String(value || "").trim()).join("");
          return !label;
        }).length;
        const unlabeledControls = controls.filter((el) => {
          const id = el.getAttribute("id");
          const hasForLabel = id ? Boolean(document.querySelector(`label[for="${CSS.escape(id)}"]`)) : false;
          return !hasForLabel && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.getAttribute("title");
        }).length;
        const imagesMissingAlt = imgs.filter((img) => !img.hasAttribute("alt")).length;
        const direction = getComputedStyle(document.documentElement).direction;
        return {
          lang: document.documentElement.lang,
          dir: document.documentElement.dir,
          direction,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 24,
          viewportWidth: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          fcpMs: Math.round(fcp),
          lcpMs: Math.round(metric.lcp || 0),
          cls: Number((metric.cls || 0).toFixed(4)),
          domContentLoadedMs: Math.round(nav?.domContentLoadedEventEnd || 0),
          loadMs: Math.round(nav?.loadEventEnd || 0),
          unlabeledButtons,
          unlabeledControls,
          imagesMissingAlt,
          bodyLength: (document.body?.innerText || "").trim().length,
        };
      });

      const checks = {
        pageRendered: state.bodyLength > 100,
        rtl: state.dir === "rtl" && state.direction === "rtl" && state.lang.toLowerCase().startsWith("ar"),
        noMobileOverflow: viewport.name !== "mobile" || !state.horizontalOverflow,
        labeledButtons: state.unlabeledButtons === 0,
        labeledFormControls: state.unlabeledControls === 0,
        imageAltContract: state.imagesMissingAlt === 0,
        no5xx: serverErrors.length === 0,
        fcpLabBudget: state.fcpMs === 0 || state.fcpMs <= 3000,
        lcpLabBudget: state.lcpMs === 0 || state.lcpMs <= 4000,
        clsLabBudget: state.cls <= 0.25,
      };
      const status = Object.values(checks).every(Boolean) ? "PASS" : "FAIL";
      results.push({ route, viewport: viewport.name, status, elapsedMs, checks, state, serverErrors });
      await page.screenshot({
        path: path.join(OUT_DIR, `${viewport.name}-${route === "/" ? "root" : route.slice(1).replace(/\//g, "_")}.png`),
        fullPage: true,
      }).catch(() => undefined);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  note: "Lab Chromium measurements; not field Core Web Vitals.",
  total: results.length,
  pass: results.filter((item) => item.status === "PASS").length,
  fail: results.filter((item) => item.status === "FAIL").length,
  results,
};
fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.fail) process.exit(1);
