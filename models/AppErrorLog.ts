import { Schema, model, models } from "mongoose";

const ErrorEventSchema = new Schema(
  {
    seenAt: { type: Date, default: Date.now },
    message: { type: String, required: true },
    stack: { type: String, default: "" },
    digest: { type: String, default: "" },
    route: { type: String, default: "" },
    url: { type: String, default: "" },
    method: { type: String, default: "" },
    statusCode: { type: Number, default: 500 },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: "" },
    sessionId: { type: String, default: "" },
    requestId: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: true }
);

const AppErrorLogSchema = new Schema(
  {
    fingerprint: { type: String, required: true, unique: true, index: true },
    source: {
      type: String,
      enum: ["server", "client", "render", "unhandled_rejection"],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "fatal"],
      default: "error",
      index: true
    },
    message: { type: String, required: true },
    stack: { type: String, default: "" },
    digest: { type: String, default: "" },
    route: { type: String, default: "" },
    url: { type: String, default: "" },
    method: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved", "ignored"],
      default: "open",
      index: true
    },
    statusCode: { type: Number, default: 500 },
    occurrences: { type: Number, default: 1 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    lastNotifiedAt: { type: Date, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userEmail: { type: String, default: "" },
    sessionId: { type: String, default: "" },
    requestId: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
    affectedUserIds: { type: [String], default: [] },
    events: { type: [ErrorEventSchema], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

AppErrorLogSchema.index({ severity: 1, status: 1, lastSeenAt: -1 });

export const AppErrorLogModel = models.AppErrorLog || model("AppErrorLog", AppErrorLogSchema);
