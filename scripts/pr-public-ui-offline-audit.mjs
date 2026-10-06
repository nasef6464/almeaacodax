import { chromium } from "playwright";

const BASE_URL = String(process.env.UI_AUDIT_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const routes = [
  { path: "/about", expect: "public" },
  { path: "/contact", expect: "public" },
  { path: "/faq", expect: "public" },
  { path: "/privacy", expect: "public" },
  { path: "/terms", expect: "public" },
  { path: "/forgot-password", expect: "public" },
  { path: "/login", expect: "auth" },
  { path: "/signup", expect: "auth" },
  { path: "/dashboard", expect: "guarded" },
  { path: "/reports", expect: "guarded" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

const results = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      locale: "ar-SA",
    });

    await context.route("**/api/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          paths: [],
          subjects: [],
          sections: [],
          courses: [],
          memberships: [],
          items: [],
          data: [],
        }),
      });
    });

    for (const spec of routes) {
      const page = await context.newPage();
      let status = "PASS";
      let error = "";
      try {
        await page.goto(`${BASE_URL}${spec.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        await page.waitForTimeout(250);

        const state = await page.evaluate(() => {
          const text = document.body?.innerText || "";
          const visible = Array.from(
            document.querySelectorAll("a[href],button,input,select,textarea,[role='button']"),
          ).filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          });
          return {
            href: location.href,
            bodyLength: text.length,
            controls: visible.length,
            hasAuth:
              Boolean(document.querySelector('input[type="password"]')) ||
              /تسجيل الدخول|إنشاء حساب|البريد الإلكتروني|Login|Sign up/i.test(text),
            hasGuard:
              /تسجيل الدخول|ليس لديك صلاحية|غير مصرح|Authentication required|Login/i.test(text),
            crashed:
              /Application error|Internal Server Error|Something went wrong|حدث خطأ غير متوقع/i.test(text),
            overflow: document.documentElement.scrollWidth > innerWidth + 24,
          };
        });

        if (state.crashed) throw new Error("visible application crash state");
        if (state.overflow) throw new Error("horizontal overflow");
        if (state.bodyLength < 60) throw new Error("page body is unexpectedly empty");
        if (spec.expect === "public" && state.controls === 0) {
          throw new Error("public page has no visible controls");
        }
        if (spec.expect === "auth" && !state.hasAuth) {
          throw new Error("auth entry did not render");
        }
        if (
          spec.expect === "guarded" &&
          !state.hasAuth &&
          !state.hasGuard &&
          !state.href.includes("login") &&
          !state.href.includes("auth=login")
        ) {
          throw new Error("guarded route did not fail closed to auth");
        }
      } catch (caught) {
        status = "FAIL";
        error = caught instanceof Error ? caught.message : String(caught);
      }
      results.push({ viewport: viewport.name, ...spec, status, error });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const failures = results.filter((item) => item.status !== "PASS");
console.log(JSON.stringify({ total: results.length, pass: results.length - failures.length, fail: failures.length, results }, null, 2));
if (failures.length) process.exit(1);
