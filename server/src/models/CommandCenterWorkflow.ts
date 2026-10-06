import mongoose, { Schema } from "mongoose";

export const COMMAND_WORKFLOW_STATUSES = [
  "planned",
  "running",
  "completed",
  "failed",
] as const;

const workflowStepSchema = new Schema(
  {
    id: { type: String, required: true },
    toolId: { type: String, required: true },
    title: { type: String, default: "" },
    input: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["planned", "running", "completed", "failed", "skipped"],
      default: "planned",
    },
    output: { type: Schema.Types.Mixed, default: {} },
    error: { type: String, default: "" },
    startedAt: { type: Number, default: null },
    completedAt: { type: Number, default: null },
  },
  { _id: false },
);

const commandCenterWorkflowSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ["admin_ui", "mcp", "external_agent", "system"],
      required: true,
      index: true,
    },
    createdBy: { type: String, required: true, index: true },
    createdByType: {
      type: String,
      enum: ["admin_session", "api_key", "system"],
      required: true,
    },
    status: {
      type: String,
      enum: COMMAND_WORKFLOW_STATUSES,
      default: "planned",
      index: true,
    },
    steps: { type: [workflowStepSchema], default: [] },
    requestId: { type: String, default: "", index: true },
    idempotencyKey: { type: String, default: undefined },
    currentStepId: { type: String, default: "" },
    verification: {
      ok: { type: Boolean, default: false },
      checkedAt: { type: Number, default: null },
      completedSteps: { type: Number, default: 0 },
      failedSteps: { type: Number, default: 0 },
      missingDraftIds: { type: [String], default: [] },
    },
    lastError: { type: String, default: "" },
    startedAt: { type: Number, default: null },
    completedAt: { type: Number, default: null },
  },
  { timestamps: true },
);

commandCenterWorkflowSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);
commandCenterWorkflowSchema.index({ status: 1, createdAt: -1 });

export const CommandCenterWorkflowModel = mongoose.model(
  "CommandCenterWorkflow",
  commandCenterWorkflowSchema,
);
