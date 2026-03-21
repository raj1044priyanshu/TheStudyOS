import { Schema, model, models } from "mongoose";

const FeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    source: {
      type: String,
      enum: ["landing", "dashboard", "other"],
      default: "landing",
      index: true
    },
    category: {
      type: String,
      enum: ["general", "bug", "feature_request", "content", "design", "performance", "support", "other"],
      default: "general",
      index: true
    },
    rating: { type: Number, min: 1, max: 5, default: null, index: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved", "ignored"],
      default: "open",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true
    },
    labels: { type: [String], default: [] },
    adminNotes: { type: String, default: "" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    pageUrl: { type: String, default: "" },
    referrer: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    viewport: { type: String, default: "" },
    browser: { type: String, default: "" },
    os: { type: String, default: "" },
    ip: { type: String, default: "" },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });

export const FeedbackModel = models.Feedback || model("Feedback", FeedbackSchema);
