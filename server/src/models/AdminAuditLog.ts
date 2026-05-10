import mongoose, { Schema } from "mongoose";

const adminAuditLogSchema = new Schema(
  {
    actorId: { type: String, default: "", index: true },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "", index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, default: "", index: true },
    resourceId: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: ["success", "blocked", "failed"],
      default: "success",
      index: true,
    },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

adminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLogModel = mongoose.model("AdminAuditLog", adminAuditLogSchema);
