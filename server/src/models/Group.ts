import mongoose, { Schema } from "mongoose";

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["SCHOOL", "CLASS", "PRIVATE_GROUP"], required: true },
    parentId: { type: String, default: null },
    ownerId: { type: String, required: true },
    supervisorIds: { type: [String], default: [] },
    studentIds: { type: [String], default: [] },
    courseIds: { type: [String], default: [] },
    metadata: {
      description: { type: String, default: "" },
      location: { type: String, default: "" },
      settings: { type: Schema.Types.Mixed, default: {} },
    },
  },
  {
    timestamps: true,
  },
);

export const GroupModel = mongoose.model("Group", groupSchema);
