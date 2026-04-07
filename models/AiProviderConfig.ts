import { Schema, model, models } from "mongoose";

const AiProviderConfigSchema = new Schema(
  {
    key: { type: String, enum: ["primary", "fallback", "image"], required: true, unique: true, index: true },
    provider: { type: String, enum: ["google", "groq", "nvidia"], required: true },
    enabled: { type: Boolean, default: true },
    apiBase: { type: String, default: "" },
    textModel: { type: String, default: "" },
    multimodalModel: { type: String, default: "" },
    imageModel: { type: String, default: "" },
    apiKeyCiphertext: { type: String, default: "" },
    apiKeyIv: { type: String, default: "" },
    apiKeyTag: { type: String, default: "" },
    keyFingerprint: { type: String, default: "" },
    lastValidatedAt: { type: Date, default: null },
    lastValidationStatus: { type: String, enum: ["unknown", "valid", "warning", "invalid"], default: "unknown" },
    lastValidationMessage: { type: String, default: "" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const AiProviderConfigModel = models.AiProviderConfig || model("AiProviderConfig", AiProviderConfigSchema);
