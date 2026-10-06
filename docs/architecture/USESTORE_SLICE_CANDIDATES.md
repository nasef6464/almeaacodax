# useStore slice candidates

Date: 2026-08-26

Scope: analysis only. This note does not authorize a store rewrite, RBAC change, database change, route change, or API contract change.

## Current state

- `store/useStore.ts` is a single Zustand persisted store of about 1,944 lines.
- It mixes state, API synchronization, optimistic updates, domain rules, hydration, persisted-session behavior, and admin actions in one file.
- It is widely consumed across app bootstrap, public pages, student learning pages, admin dashboards, school management, reports, quizzes, and smoke-contract scripts.
- Because consumers import `useStore` directly, the first safe refactor must preserve `useStore` as a compatibility facade.

## Important constraints

- Do not split the store by moving callers first.
- Do not change the persisted storage key: `learning-platform-storage`.
- Do not change persisted migration behavior without a dedicated migration review.
- Do not move Mongo/API semantics into frontend slices.
- Do not change authentication, access checks, school scope, quiz integrity, or payment/access rules while doing structural work.

## Candidate slices

### 1. User/auth slice

Owns:

- `user`
- `users`
- `hydrateUsers`
- `addUser`
- `updateUser`
- `toggleUserStatus`
- `changeRole`

Reason:

- This is the identity base for almost every feature.
- It should become a stable public API before RBAC/multi-tenant work.

Risk:

- High fan-out. Keep `useStore` facade exports unchanged until all callers are proven.

### 2. Learning progress slice

Owns:

- `enrolledCourses`
- `enrolledPaths`
- `completedLessons`
- `examResults`
- `questionAttempts`
- `favorites`
- `reviewLater`
- `recentActivity`
- `skillProgress`
- `hydrateExamResults`
- `hydrateQuestionAttempts`
- `hydrateSkillProgress`
- `enrollCourse`
- `enrollPath`
- `unenrollPath`
- `markLessonComplete`
- `saveExamResult`
- `recordQuestionAttempt`
- `toggleFavorite`
- `toggleReviewLater`
- `addActivity`

Reason:

- This is student-facing product state and should be isolated before advanced analytics.

Risk:

- Reports, dashboards, quizzes, and learning pages consume these fields heavily.

### 3. Content slice

Owns:

- `courses`
- `questions`
- `quizzes`
- `lessons`
- `topics`
- `hydrateCourses`
- `hydrateQuestions`
- `hydrateQuizzes`
- `hydrateContentBootstrap` content portions
- course/question/quiz/lesson/topic actions

Reason:

- Platform team owns content, courses, question bank, quizzes, lessons, and topics.
- This slice is a prerequisite for trainer/content-manager ownership later.

Risk:

- Some actions call APIs and also perform local cascade updates. Keep those behaviors untouched during extraction.

### 4. Taxonomy and skills slice

Owns:

- `paths`
- `levels`
- `subjects`
- `sections`
- `skills`
- `nestedSkills`
- `hydrateTaxonomy`
- taxonomy actions
- skill actions
- `updateNestedSkills`

Reason:

- Taxonomy is used across content, learning, quizzes, reports, and admin builders.
- It should become a stable read model before deeper course/path cleanup.

Risk:

- `PathsManager` currently has active unrelated changes in the worktree. Do not couple this slice work to those changes.

### 5. Schools/organizations slice

Owns:

- `groups`
- group actions
- student assignment/removal actions
- supervisor assignment/removal actions
- course-to-group assignment actions

Reason:

- This is the natural future home for school hierarchy concerns: school, class, supervisor, teacher, student relationships.
- It aligns with the platform target without changing DB/RBAC now.

Risk:

- This area is sensitive because it models school/class/student/supervisor relationships. Extract only behind the existing `useStore` facade at first.

### 6. B2B access slice

Owns:

- `b2bPackages`
- `accessCodes`
- B2B package actions
- access code actions
- `redeemAccessCode`
- `checkAccess`
- `hasScopedPackageAccess`
- `getMatchingPackage`

Reason:

- Package and access logic is separate from school hierarchy and will matter for SaaS subscriptions/packages.

Risk:

- Access rules are business-critical. Do not change logic while moving code.

### 7. Commerce/cart slice

Owns:

- `cartItems`
- `addToCart`
- `removeFromCart`
- `clearCart`
- `cartCount`

Reason:

- Cart behavior is small and low-risk compared with content/schools.

Risk:

- Payment/access integration must remain unchanged.

### 8. Library/editorial slice

Owns:

- `libraryItems`
- library item actions
- announcement ad actions
- `announcementAds`

Reason:

- Library/editorial content is platform-owned but not the same as core course/question/quiz authoring.

Risk:

- Library item deletion currently updates topic references. Preserve this cascade behavior.

### 9. Study plans slice

Owns:

- `studyPlans`
- `createStudyPlan`
- `updateStudyPlan`
- `deleteStudyPlan`
- `archiveStudyPlan`

Reason:

- This can become a student planning/intervention domain later.

Risk:

- May later connect to academic interventions; do not over-model it now.

### 10. Persistence/bootstrap slice

Owns:

- persisted key/version
- `partialize`
- `migrate`
- bootstrap hydration orchestration

Reason:

- Store persistence is a cross-cutting concern and must not be accidentally scattered.

Risk:

- Highest migration risk. Keep storage key and migration semantics unchanged until a dedicated migration plan exists.

## Recommended extraction order

1. Create type-only slice interfaces beside the existing store.
2. Extract pure helpers first, not state.
3. Extract the smallest low-risk slices first: cart, study plans, library/editorial.
4. Extract schools/groups only after `SchoolsManager` cleanup is stable and committed.
5. Extract B2B access after schools/groups because access depends on user/school/package relationships.
6. Extract auth/user before RBAC work, but only with facade compatibility.
7. Leave persistence/bootstrap until the end.

## Compatibility rule

The public import stays:

```ts
import { useStore } from '../store/useStore';
```

During migration, `useStore.ts` should compose slices internally and continue exporting the same state/action names. Callers should not be migrated until the facade is proven green.

## First safe implementation actions later

1. Add `store/slices/types.ts` with type aliases only.
2. Move cart helper logic into `store/slices/cartSlice.ts` while preserving `useStore` exports.
3. Run the full gate after each slice.
4. Only then move study plans.
5. Do not start schools/groups slicing until current `SchoolsManager` refactor is committed and baseline checks are recorded.
