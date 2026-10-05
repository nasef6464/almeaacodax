import { CommandCenterAuditModel } from "../../../models/CommandCenterAudit.js";
import type { CommandPrincipal } from "./commandAuthorization.js";

export async function recordCommandAudit(input: {
  principal: CommandPrincipal;
  action: string;
  toolId?: string;
  draftId?: string;
  requestId?: string;
  outcome: "success" | "rejected" | "failed";
  metadata?: Record<string, unknown>;
}) {
  await CommandCenterAuditModel.create({
    action: input.action,
    toolId: input.toolId || "",
    draftId: input.draftId || "",
    actorId: input.principal.id,
    actorType: input.principal.type,
    source: input.principal.source,
    requestId: input.requestId || "",
    outcome: input.outcome,
    metadata: input.metadata || {},
  });
}
