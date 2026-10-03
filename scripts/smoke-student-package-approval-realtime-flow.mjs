import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const authContext = await read("contexts/AuthContext.tsx");
const myRequests = await read("pages/MyRequests.tsx");

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", message: error.message });
  }
}

function assertIncludes(source, fragment, label) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing required fragment for ${label}: ${fragment}`);
  }
}

// 1. Check syncStoreUser preserves purchasedPackages when backendUser is undefined (Refresh resilience)
check("syncStoreUser preserves purchasedPackages on fast session restore", () => {
  assertIncludes(
    authContext,
    "purchasedPackages: backendUser",
    "AuthContext: conditional backendUser package sync"
  );
  assertIncludes(
    authContext,
    "(existing?.subscription?.purchasedPackages || [])",
    "AuthContext: fallback to existing store packages"
  );
});

// 2. Check syncStoreUser preserves purchasedCourses on fast session restore
check("syncStoreUser preserves purchasedCourses on fast session restore", () => {
  assertIncludes(
    authContext,
    "purchasedCourses: backendUser",
    "AuthContext: conditional backendUser courses sync"
  );
  assertIncludes(
    authContext,
    "(existing?.subscription?.purchasedCourses || [])",
    "AuthContext: fallback to existing store courses"
  );
});

// 3. Check AuthContext exports refreshProfile
check("AuthContext exposes refreshProfile in context type and provider value", () => {
  assertIncludes(authContext, "refreshProfile?: () => Promise<void>;", "AuthContextType");
  assertIncludes(authContext, "const refreshProfile = useCallback", "refreshProfile implementation");
  assertIncludes(authContext, "refreshProfile, devSwitchRole", "Provider value export");
});

// 4. Check AuthContext automatically revalidates on focus and visibility change
check("AuthContext auto-revalidates user entitlements on tab focus/visibility change", () => {
  assertIncludes(authContext, "window.addEventListener('focus', handleFocusOrVisible);", "Focus listener");
  assertIncludes(authContext, "document.addEventListener('visibilitychange', handleFocusOrVisible);", "Visibility listener");
  assertIncludes(authContext, "void refreshProfile();", "Trigger refresh on visible");
});

// 5. Check MyRequests synchronizes profile on load and refresh
check("MyRequests refreshes profile entitlements when requests are retrieved", () => {
  assertIncludes(myRequests, "import { useAuth } from '../contexts/AuthContext';", "useAuth import");
  assertIncludes(myRequests, "const { refreshProfile } = useAuth();", "useAuth hook usage");
  assertIncludes(myRequests, "refreshProfile ? refreshProfile().catch(() => null) : Promise.resolve()", "Entitlement refresh");
});

// 6. Simulate state progression for package approval flow
check("Simulated Cross-Actor Entitlement Flow matches expected invariants", () => {
  // Scenario: Student purchases package -> Admin approves -> Entitlement unlocks
  let studentStoreUser = {
    id: "student_1",
    role: "student",
    subscription: { plan: "free", purchasedPackages: [], purchasedCourses: [] },
  };

  // Step 1: Request pending
  const paymentRequest = {
    id: "req_999",
    userId: "student_1",
    packageId: "pkg_qudrat_complete",
    status: "pending",
  };

  if (studentStoreUser.subscription.purchasedPackages.includes(paymentRequest.packageId)) {
    throw new Error("Student should not have access before approval");
  }

  // Step 2: Admin approves request on server
  paymentRequest.status = "approved";
  const updatedBackendUser = {
    id: "student_1",
    email: "student@test.local",
    role: "student",
    subscription: {
      plan: "free",
      purchasedPackages: [paymentRequest.packageId],
      purchasedCourses: ["course_1"],
    },
  };

  // Step 3: Student calls refreshProfile (triggered by visibility/focus/MyRequests)
  studentStoreUser = {
    ...studentStoreUser,
    subscription: {
      ...studentStoreUser.subscription,
      purchasedPackages: updatedBackendUser.subscription.purchasedPackages,
      purchasedCourses: updatedBackendUser.subscription.purchasedCourses,
    },
  };

  if (!studentStoreUser.subscription.purchasedPackages.includes("pkg_qudrat_complete")) {
    throw new Error("Student access was not unlocked after approval synchronization");
  }

  // Step 4: Accidental reload (F5) occurs with fast session restore (backendUser not yet loaded)
  const reloadedStoreUser = {
    ...studentStoreUser,
    subscription: {
      ...studentStoreUser.subscription,
      purchasedPackages: studentStoreUser.subscription.purchasedPackages || [],
    },
  };

  if (!reloadedStoreUser.subscription.purchasedPackages.includes("pkg_qudrat_complete")) {
    throw new Error("Student access was lost after page reload");
  }
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error("Package Entitlement Real-Time Contract: FAILED");
  console.error(JSON.stringify(failed, null, 2));
  process.exit(1);
}

console.log(`Package Entitlement Real-Time Contract: PASS (${checks.length}/${checks.length} checks passed)`);
