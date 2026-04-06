import { Schema, model, models } from "mongoose";

const AiUsageEventSchema = new Schema(
  {
    provider: { type: String, required: true, index: true },
    capability: { type: String, enum: ["text", "structured", "multimodal", "image"], required: true, index: true },
    route: { type: String, default: "unknown", index: true },
    model: { type: String, default: "" },
    promptTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    imageCount: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    success: { type: Boolean, default: true, index: true },
    errorCode: { type: String, default: "" },
    keyFingerprint: { type: String, default: "", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AiUsageEventSchema.index({ createdAt: -1 });
AiUsageEventSchema.index({ provider: 1, createdAt: -1 });
AiUsageEventSchema.index({ route: 1, createdAt: -1 });

export const AiUsageEventModel = models.AiUsageEvent || model("AiUsageEvent", AiUsageEventSchema);
