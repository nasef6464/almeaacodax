import mongoose, { Schema } from "mongoose";

const announcementAdSchema = new Schema(
  {
    id: { type: String, index: true, sparse: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    ctaLabel: { type: String, default: "" },
    ctaUrl: { type: String, default: "" },
    audience: { type: String, enum: ["all", "guest", "student", "parent", "staff"], default: "all" },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    startsAt: { type: Number, default: null },
    endsAt: { type: Number, default: null },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: true,
  },
);

announcementAdSchema.pre("findOneAndUpdate", function updateTimestamp(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

export const AnnouncementAdModel = mongoose.model("AnnouncementAd", announcementAdSchema);
