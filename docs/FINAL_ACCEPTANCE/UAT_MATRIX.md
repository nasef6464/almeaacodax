# ALMEAA CODAX — USER ACCEPTANCE TESTING (UAT) MATRIX
**مصفوفة اختبارات القبول الميداني والسيناريوهات الواقعية**

---

## 1. Test Execution Matrix Overview

| Test Suite | Total Scenarios | Passed | Failed | Blocked | Coverage Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01: Admin & School Management** | 6 | 6 | 0 | 0 | 100% |
| **TC-02: Supervisor Academic Journey** | 4 | 4 | 0 | 0 | 100% |
| **TC-03: Teacher Multi-Subject Operations** | 6 | 6 | 0 | 0 | 100% |
| **TC-04: Student Learning & Quiz Execution** | 6 | 6 | 0 | 0 | 100% |
| **TC-05: Independent Learner eCommerce** | 4 | 4 | 0 | 0 | 100% |
| **TC-06: End-to-End Assessment & Reports Chain** | 5 | 5 | 0 | 0 | 100% |
| **Total Test Cases** | **31** | **31** | **0** | **0** | **100% PASS** |

---

## 2. Detailed Scenario Breakdown

### TC-01: Admin & School Operations Lifecycle

| Test ID | Test Scenario | Actor / Persona | Real-Browser Execution Steps | Actual Result | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-ADM-01` | Admin Authentication | Admin (`nasef64@gmail.com`) | Enter credentials in `#smart-login-form`, submit | Login returns 200, JWT token stored, redirected to `/admin-dashboard` | **PASS** | `admin_login_result.png` |
| `UAT-ADM-02` | School Operations Navigation | Admin | Click `تشغيل المدارس` from admin sidebar | Operations tab loads dynamically, displays metrics and school list | **PASS** | `admin_schools_screen_live.png` |
| `UAT-ADM-03` | UAT School Identification | Admin | Locate `ALMEAA UAT School` in school cards | School card visible with code `UAT-2026-ALMEAA-01` and active status | **PASS** | `admin_schools_fully_loaded.png` |
| `UAT-ADM-04` | School Workspace Opening | Admin | Click `فتح تشغيل المدرسة` | School workspace loads showing 3 classes, 5 students, 39 staff | **PASS** | `admin_uat_school_workspace.png` |
| `UAT-ADM-05` | Classroom Roster Inspection | Admin | Click `إدارة الفصول` | Displays cards for `UAT Class 101`, `102`, and `201` with action buttons | **PASS** | `admin_uat_school_classes_view.png` |
| `UAT-ADM-06` | Teacher Assignment Controls | Admin | Verify `إسناد المعلم للفصل` dropdown | Dropdown lists available teachers and classes with save action | **PASS** | `admin_uat_school_classes_view.png` |

---

### TC-02: Academic Supervisor Quality & Monitoring

| Test ID | Test Scenario | Actor / Persona | Real-Browser Execution Steps | Actual Result | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-SUP-01` | Supervisor Login | Supervisor (`uat.supervisor@almeaa.local`) | Submit login via smart auth modal | Authenticates and navigates to `/supervisor-dashboard` | **PASS** | `supervisor_dashboard_desktop.png` |
| `UAT-SUP-02` | Dashboard Metrics Display | Supervisor | Inspect dashboard header and summary cards | Overview cards display student distribution and performance metrics | **PASS** | `supervisor_dashboard_desktop.png` |
| `UAT-SUP-03` | Class Schedule Access | Supervisor | Inspect class monitoring section | Displays active cohorts with teacher assignments | **PASS** | `supervisor_dashboard_desktop.png` |
| `UAT-SUP-04` | Mobile Responsiveness | Supervisor | View on mobile viewport (390x844) | Sidebar collapses into drawer, no horizontal overflow | **PASS** | `supervisor_dashboard_mobile.png` |

---

### TC-03: Subject Teachers Instruction Operations

| Test ID | Test Scenario | Actor / Persona | Real-Browser Execution Steps | Actual Result | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-TCH-01` | Math Teacher Login | Math Teacher (`uat.teacher.math@almeaa.local`) | Authenticate via smart login | Navigates directly to `/school-teacher-dashboard` | **PASS** | `teacher_math_dashboard_desktop.png` |
| `UAT-TCH-02` | Math Class 101 Linkage | Math Teacher | View assigned classes in teacher workspace | `UAT Class 101` available with quantitative syllabus tools | **PASS** | `teacher_math_dashboard_desktop.png` |
| `UAT-TCH-03` | Verbal Teacher Login | Verbal Teacher (`uat.teacher.verbal@almeaa.local`) | Authenticate via smart login | Dashboard opens with verbal syllabus and diagnostic tests | **PASS** | `teacher_verbal_dashboard_desktop.png` |
| `UAT-TCH-04` | Verbal Class 102 Linkage | Verbal Teacher | Verify Class 102 syllabus tools | Class 102 content reflects verbal comprehension track | **PASS** | `teacher_verbal_dashboard_desktop.png` |
| `UAT-TCH-05` | Tahsili Teacher Login | Tahsili Teacher (`uat.teacher.tahsili@almeaa.local`) | Authenticate via smart login | Workspace reflects Tahsili scientific track controls | **PASS** | `teacher_tahsili_dashboard_desktop.png` |
| `UAT-TCH-06` | Tahsili Class 201 Linkage | Tahsili Teacher | Verify Class 201 management | Class 201 scientific track modules accessible | **PASS** | `teacher_tahsili_dashboard_desktop.png` |

---

### TC-04: Student Learning & Quiz Execution Engine

| Test ID | Test Scenario | Actor / Persona | Real-Browser Execution Steps | Actual Result | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-STU-01` | Student 01 Login | Student (`uat.student01@almeaa.local`) | Login with student credentials | Redirects to `/dashboard` with points, badges, and progress | **PASS** | `student_dashboard_desktop.png` |
| `UAT-STU-02` | Quiz Catalog Navigation | Student 01 | Navigate to `/quizzes` | Catalog renders assessment categories and past attempts | **PASS** | `student_quizzes_catalog.png` |
| `UAT-STU-03` | Mock Exam Initiation | Student 01 | Open `/mock-exams` | Launches simulation view with questions and option selectors | **PASS** | `student_quiz_taking_view.png` |
| `UAT-STU-04` | Question Answer Selection | Student 01 | Click answer radio options (A/B/C/D) | Instant selection highlight, saves draft answer locally | **PASS** | `student_quiz_taking_view.png` |
| `UAT-STU-05` | Review Later (مراجعة لاحقاً) | Student 01 | Click 'مراجعة لاحقاً' button | Flags question for review in side navigator | **PASS** | `student_quiz_taking_view.png` |
| `UAT-STU-06` | Student Mobile Layout | Student 01 | Render on 390x844 mobile viewport | Question cards adapt, buttons stack cleanly | **PASS** | `student_dashboard_mobile.png` |

---

### TC-05: Independent Student eCommerce Journey

| Test ID | Test Scenario | Actor / Persona | Real-Browser Execution Steps | Actual Result | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-IND-01` | Independent Student Auth | Independent (`uat.independent@almeaa.local`) | Authenticate via smart login | Logs in cleanly with independent learner role | **PASS** | Session storage profile verified |
| `UAT-IND-02` | Course Catalog Browsing | Independent Student | Navigate to `/courses` | Displays courses catalog with filter and search | **PASS** | `independent_courses_catalog.png` |
| `UAT-IND-03` | Pricing & Package Selection | Independent Student | Navigate to `/pricing` | Displays commercial tiers and subscription benefits | **PASS** | `independent_pricing_packages.png` |
| `UAT-IND-04` | Cart & Checkout Verification | Independent Student | Navigate to `/cart` | Cart renders with empty/active state and checkout action | **PASS** | `independent_cart_view.png` |

---

### TC-06: End-to-End Pedagogical Assessment & Cross-Role Reports Chain

| Test ID | Test Scenario | Actor / Persona | Real-Browser Execution Steps | Actual Result | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-E2E-01` | Graded Quiz Execution | Student 01 (`uat.student01@almeaa.local`) | Take `quiz_1790961529583_853f3`, answer Q1-Q4, submit via finish dialog | Submission accepted, graded score 100% computed & recorded in MongoDB Atlas | **PASS** | `e2e_student_quiz_results.png` |
| `UAT-E2E-02` | Student Academic Report | Student 01 | Navigate to `/reports` | Comprehensive analytics, skill mastery, and test attempt history render cleanly | **PASS** | `e2e_student_reports_view.png` |
| `UAT-E2E-03` | Teacher Class 101 Report | Math Teacher (`uat.teacher.math@almeaa.local`) | Navigate to `/school-teacher-dashboard` | Class 101 student roster displays Student 01's 100% test completion | **PASS** | `e2e_teacher_reports_view.png` |
| `UAT-E2E-04` | Supervisor School Report | Supervisor (`uat.supervisor@almeaa.local`) | Navigate to `/supervisor-dashboard` -> Reports | Aggregated school analytics reflect active cohort performance & student metrics | **PASS** | `e2e_supervisor_reports_view.png` |
| `UAT-E2E-05` | Admin Operations & Tabs | Admin (`nasef64@gmail.com`) | Navigate to `/admin-dashboard` (Schools, Users, Questions, Courses, Ops, Backups) | School operations view and all 5 admin modules render with full operational fidelity | **PASS** | `e2e_admin_reports_view.png`, `admin_tab_*.png` |
