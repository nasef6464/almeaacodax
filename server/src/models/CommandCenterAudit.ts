import mongoose, { Schema } from "mongoose";

const commandCenterAuditSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    toolId: { type: String, default: "", index: true },
    draftId: { type: String, default: "", index: true },
    actorId: { type: String, required: true, index: true },
    actorType: {
      type: String,
      enum: ["admin_session", "api_key", "oauth", "system"],
      required: true,
    },
    source: {
      type: String,
      enum: ["admin_ui", "mcp", "external_agent", "system"],
      required: true,
      index: true,
    },
    requestId: { type: String, default: "", index: true },
    outcome: {
      type: String,
      enum: ["success", "rejected", "failed"],
      required: true,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

commandCenterAuditSchema.index({ createdAt: -1, action: 1 });
commandCenterAuditSchema.index({ actorId: 1, createdAt: -1 });

export const CommandCenterAuditModel = mongoose.model(
  "CommandCenterAudit",
  commandCenterAuditSchema,
);
