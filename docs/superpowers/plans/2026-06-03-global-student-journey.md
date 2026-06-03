# Global Student Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تحويل منصة المئة إلى رحلة طالب ومشرف واضحة بمستوى إنتاج عالمي: خطوة تالية واضحة، تقارير بسيطة، تدخل علاجي مباشر، وفحص بصري وتشغيلي قبل كل نشر.

**Architecture:** نبني طبقة إرشاد وتجميع فوق الصفحات الحالية بدل إعادة كتابة المنصة. الطالب يرى "خطوتك التالية" في كل مرحلة، والمشرف يرى "أول تدخل" من التقارير، وتتحول الفحوصات الحالية إلى بوابة موحدة قبل النشر.

**Tech Stack:** React 19, Vite, Zustand, React Router, Tailwind CSS, Playwright/browser audits, Node smoke contracts, Render API, Vercel deployment.

---

### Task 1: Student Next Step Contract

**Files:**
- Create: `scripts/smoke-global-student-journey-contract.mjs`
- Modify: `package.json`
- Review: `pages/Dashboard.tsx`, `pages/SubjectLearningPage.tsx`, `pages/Quizzes.tsx`, `pages/Reports.tsx`, `pages/Plan.tsx`

- [ ] **Step 1: Add a contract that checks the student journey has a visible next step**

Create `scripts/smoke-global-student-journey-contract.mjs` with checks for:

```js
const requiredStudentSignals = [
  ['pages/Dashboard.tsx', ['تقاريري', 'خطة', 'التوصيات']],
  ['pages/SubjectLearningPage.tsx', ['تأسيس', 'التدريب', 'الاختبارات المحاكية', 'عرض الباقات المناسبة']],
  ['pages/Quizzes.tsx', ['اختباراتي', 'اختبار موجه', 'الترشيحات']],
  ['pages/Reports.tsx', ['أضعف مهارة', 'الخطوة التالية', 'خطة']],
  ['pages/Plan.tsx', ['خطة', 'مهارة', 'اختبار']],
];
```

Expected result: the smoke fails if any page loses the learner guidance language.

- [ ] **Step 2: Add npm script**

Add:

```json
"smoke:global-student-journey": "node scripts/smoke-global-student-journey-contract.mjs"
```

- [ ] **Step 3: Run the contract**

Run: `npm run smoke:global-student-journey`

Expected: PASS with a count of checked journey signals.

### Task 2: Student Next Action Strip

**Files:**
- Create: `components/StudentNextActionStrip.tsx`
- Modify: `pages/Dashboard.tsx`
- Test: `scripts/smoke-global-student-journey-contract.mjs`

- [ ] **Step 1: Add a compact student-only component**

The component accepts:

```ts
type StudentNextActionStripProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};
```

It renders one focused action, short supporting copy, and one secondary link at most.

- [ ] **Step 2: Place it at the top of the student dashboard overview**

Decision rules:
- If the student has no selected path, primary action is choose path.
- If the student has weak skill data, primary action is reports.
- If the student has no quiz attempts, primary action is quizzes.
- Otherwise primary action is plan.

- [ ] **Step 3: Verify mobile**

Run a browser audit at 390px and desktop width. Expected: no horizontal scroll and no text overlap.

### Task 3: Simple Student Reports Mode

**Files:**
- Modify: `pages/Reports.tsx`
- Test: `scripts/smoke-reports-role-contract.mjs`

- [ ] **Step 1: Keep the student first screen to three blocks**

Student first view should show:
- overall status,
- weakest skill,
- next action.

Detailed skills and historical attempts stay available behind an explicit "عرض التفاصيل" control.

- [ ] **Step 2: Keep remediation copy short**

Every recommendation should be one direct action:

```text
راجع درس المهارة، حل تدريبًا قصيرًا، ثم أعد اختبارًا مصغرًا.
```

- [ ] **Step 3: Run reports contract**

Run: `npm run smoke:reports-role`

Expected: PASS.

### Task 4: Supervisor Intervention Dashboard

**Files:**
- Modify: `pages/Reports.tsx`
- Modify: `dashboards/admin/AdminDashboard.tsx`
- Test: `scripts/smoke-supervisor-dashboard-contract.mjs`

- [ ] **Step 1: Add a clear supervisor summary**

Show:
- best class,
- worst class,
- struggling students,
- common weak skills,
- latest directed quiz analysis.

- [ ] **Step 2: Add direct remediation CTA**

From weak skill or student row, link to:

```text
/admin-dashboard?tab=quizzes&source=reports&mode=central
```

Expected: supervisor can create a directed remediation quiz without hunting through menus.

- [ ] **Step 3: Export clean Excel/PDF**

Excel sheets:
- Summary
- Students
- Skills
- Directed quiz analysis

PDF should print the visible summary only, not the entire noisy page.

### Task 5: Role Visual Gate Before Deploy

**Files:**
- Modify: `scripts/live-role-pages-audit.mjs`
- Create: `scripts/live-global-release-audit.mjs`
- Modify: `package.json`

- [ ] **Step 1: Build one release command**

Add script:

```json
"smoke:release-visual": "node scripts/live-global-release-audit.mjs"
```

The script runs role journeys for:

```text
student, parent, teacher, supervisor, manager, admin
```

- [ ] **Step 2: Check page quality signals**

Each page must report:
- no console errors,
- no 5xx network errors,
- no login fallback after authenticated login,
- visible primary action,
- screenshot saved.

### Task 6: Global Landing Page Upgrade

**Files:**
- Modify: `pages/Landing.tsx`
- Test: `scripts/smoke-homepage-hero-contract.mjs`

- [ ] **Step 1: Make the first viewport sell the product clearly**

First viewport must communicate:
- القدرات والتحصيلي ونافس,
- تقارير الأداء,
- المدارس والمجموعات,
- الباقات,
- تجربة مجانية.

- [ ] **Step 2: Add proof sections**

Add restrained sections for:
- results/reports,
- schools/groups,
- packages,
- testimonials/metrics.

### Task 7: Recommendation Engine V1

**Files:**
- Modify: `services/api.ts`
- Modify: `pages/Reports.tsx`
- Modify: `pages/Plan.tsx`
- Review: `services/geminiService.ts`

- [ ] **Step 1: Define one recommendation shape**

Use one object for:

```ts
{
  nextLesson?: string;
  nextTraining?: string;
  shortQuiz?: string;
  readinessLabel: 'جاهز' | 'يحتاج تدريب' | 'يحتاج شرح';
  alertTarget?: 'parent' | 'supervisor';
}
```

- [ ] **Step 2: Generate deterministic fallback**

If AI is unavailable, recommendations still work from weak skill, lesson links, quiz links, and mastery.

- [ ] **Step 3: Add alerts later**

Twilio or notification alerts should be added only after the recommendation object is stable and tested.

### Task 8: Security And Deployment Gate

**Files:**
- Test: existing smoke scripts
- Deploy: Vercel production

- [ ] **Step 1: Run local gates**

Run:

```bash
npm run smoke:global-student-journey
npm run smoke:student-learning-journey
npm run smoke:reports-role
npm run smoke:supervisor-dashboard
npm run smoke:api-security
npm run build
npm --prefix server run build
```

- [ ] **Step 2: Run live visual gate**

Run authenticated visual audit for every role with local credentials.

- [ ] **Step 3: Deploy only after gates pass**

Deploy to Vercel production and rerun the most important live checks.

---

## Current Recommendation

ابدأ بالتنفيذ من Task 1 ثم Task 2. السبب: أي تطوير لاحق في التقارير أو الباقات أو الاختبارات سيبقى ناقصًا لو الطالب لا يرى خطوة واحدة واضحة بعد كل شاشة.
