import { Schema, model, models } from "mongoose";

const AdminAuditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    targetModel: { type: String, required: true, index: true },
    targetId: { type: String, default: "", index: true },
    summary: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLogModel = models.AdminAuditLog || model("AdminAuditLog", AdminAuditLogSchema);
