import { Schema, model, models } from "mongoose";

const DoubtsSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    messages: {
      type: [
        {
          role: { type: String, enum: ["user", "assistant"], required: true },
          content: { type: String, required: true },
          timestamp: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    subject: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DoubtsSessionModel = models.DoubtsSession || model("DoubtsSession", DoubtsSessionSchema);
