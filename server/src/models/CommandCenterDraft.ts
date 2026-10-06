import mongoose, { Schema } from "mongoose";

export const COMMAND_DRAFT_KINDS = [
  "question_batch",
  "quiz",
  "quiz_update",
  "course",
  "school_setup",
  "content",
  "workflow",
  "developer_task",
] as const;

export const COMMAND_DRAFT_STATUSES = ["pending", "approved", "rejected"] as const;
export const COMMAND_DRAFT_APPLY_STATUSES = ["not_applied", "applying", "applied", "failed"] as const;

const commandCenterDraftSchema = new Schema(
  {
    kind: { type: String, enum: COMMAND_DRAFT_KINDS, required: true, index: true },
    title: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, required: true },
    source: {
      type: String,
      enum: ["admin_ui", "mcp", "external_agent", "system"],
      default: "admin_ui",
      index: true,
    },
    status: {
      type: String,
      enum: COMMAND_DRAFT_STATUSES,
      default: "pending",
      index: true,
    },
    requiredScopes: { type: [String], default: [] },
    createdBy: { type: String, required: true, index: true },
    createdByType: {
      type: String,
      enum: ["admin_session", "api_key", "oauth", "system"],
      required: true,
    },
    requestId: { type: String, default: "", index: true },
    idempotencyKey: { type: String, default: undefined },
    reviewedBy: { type: String, default: "" },
    reviewedAt: { type: Number, default: null },
    reviewNotes: { type: String, default: "" },
    applyStatus: {
      type: String,
      enum: COMMAND_DRAFT_APPLY_STATUSES,
      default: "not_applied",
      index: true,
    },
    appliedResourceType: { type: String, default: "" },
    appliedResourceId: { type: String, default: "" },
    appliedAt: { type: Number, default: null },
    appliedBy: { type: String, default: "" },
    applyError: { type: String, default: "" },
    applyResult: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

commandCenterDraftSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);
commandCenterDraftSchema.index({ status: 1, kind: 1, createdAt: -1 });
commandCenterDraftSchema.index({ applyStatus: 1, status: 1, createdAt: -1 });

export const CommandCenterDraftModel = mongoose.model(
  "CommandCenterDraft",
  commandCenterDraftSchema,
);
