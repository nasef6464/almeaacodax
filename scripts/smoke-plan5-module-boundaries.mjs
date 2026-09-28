import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [app, routeTree, seo, seoResolver, seoData, store, storeState, auth, authSchemas, trainerPortfolio, quiz, quizPolicy] = await Promise.all([
  read("App.tsx"),
  read("app/AppRouteTree.tsx"),
  read("app/SeoRouteMeta.tsx"),
  read("app/resolveSeoRouteMeta.ts"),
  read("app/seoRouteMetaData.ts"),
  read("store/useStore.ts"),
  read("store/AppState.ts"),
  read("server/src/routes/auth.routes.ts"),
  read("server/src/modules/auth/http/authSchemas.ts"),
  read("server/src/modules/auth/application/trainerPortfolio.ts"),
  read("server/src/routes/quiz.routes.ts"),
  read("server/src/modules/quizzes/domain/quizAccessPolicy.ts"),
]);

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const budgets = {
  "App.tsx": [app.length, 35000],
  "store/useStore.ts": [store.length, 50000],
  "server/src/routes/auth.routes.ts": [auth.length, 65000],
  "server/src/routes/quiz.routes.ts": [quiz.length, 40000],
};
for (const [name, [size, limit]] of Object.entries(budgets)) {
  assert(size <= limit, `${name} exceeded PLAN 5 ownership budget: ${size} > ${limit}`);
}
assert(app.includes("AppRouteTree") && !app.includes('path="/dashboard"'), "App shell must not own product route declarations");
assert(routeTree.includes('path="/dashboard"') && routeTree.includes('path="/review"'), "route tree must own learner routes");
assert(app.includes("SeoRouteMeta") && !app.includes("ADMIN_TAB_METAS"), "SEO ownership must remain outside App shell");
assert(seo.includes("resolvePageMeta") && seoResolver.includes("SEO_PRIVATE_PREFIXES") && seoData.includes("ADMIN_TAB_METAS") && seoData.includes("STUDENT_TAB_METAS"), "SEO route metadata ownership incomplete");
assert(store.includes("import type { AppState }") && !store.includes("interface AppState"), "store runtime must consume extracted state contract");
assert(storeState.includes("export interface AppState"), "store state contract missing");
assert(auth.includes("authSchemas.js") && !auth.includes('from "zod"'), "auth transport must not own validation schemas");
assert(auth.includes("trainerPortfolio.js") && !auth.includes("const getTrainerPortfolio"), "auth transport must not own trainer portfolio application logic");
assert(authSchemas.includes("adminCreateUserSchema"), "auth schemas module incomplete");
assert(trainerPortfolio.includes("getTrainerPerformance"), "trainer portfolio module incomplete");
assert(quiz.includes("quizAccessPolicy.js") && !quiz.includes("const hasSchoolPackageAccess"), "quiz transport must not own commercial access policy");
assert(quizPolicy.includes("canSubmitQuiz") && quizPolicy.includes("resolveDirectedQuizReadAccess"), "quiz access policy module incomplete");

console.log("PASS PLAN 5 residual architecture/module-boundary guard", budgets);
