import mongoose, { Schema } from "mongoose";

const moduleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    lessons: { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false },
);

const courseSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: "" },
    instructor: { type: String, required: true, trim: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "SAR" },
    duration: { type: Number, default: 0 },
    level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
    rating: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    category: { type: String, default: "" },
    subject: { type: String, default: "" },
    features: { type: [String], default: [] },
    description: { type: String, default: "" },
    instructorBio: { type: String, default: "" },
    modules: { type: [moduleSchema], default: [] },
    isPublished: { type: Boolean, default: false },
    isPackage: { type: Boolean, default: false },
    packageType: { type: String, enum: ["courses", "videos", "tests"], default: "courses" },
    originalPrice: { type: Number, default: null },
    includedCourses: { type: [String], default: [] },
    prerequisiteCourseIds: { type: [String], default: [] },
    dripContentEnabled: { type: Boolean, default: false },
    certificateEnabled: { type: Boolean, default: false },
    skills: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

export const CourseModel = mongoose.model("Course", courseSchema);
