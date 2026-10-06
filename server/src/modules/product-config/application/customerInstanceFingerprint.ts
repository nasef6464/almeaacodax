import { createHash } from "node:crypto";
import type { CustomerInstancePlan } from "./customerInstanceManifest.js";

export const fingerprintCustomerInstancePlan = (plan: CustomerInstancePlan) =>
  `sha256:${createHash("sha256").update(JSON.stringify(plan)).digest("hex")}`;
