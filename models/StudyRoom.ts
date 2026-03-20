import { Schema, model, models } from "mongoose";

const StudyRoomSchema = new Schema(
  {
    roomCode: { type: String, unique: true, required: true, index: true },
    hostUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          name: { type: String, required: true },
          avatar: { type: String, default: "" },
          joinedAt: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    subject: { type: String, default: "General" },
    isActive: { type: Boolean, default: true, index: true },
    timerDuration: { type: Number, default: 25 },
    timerStartedAt: { type: Date, default: null },
    timerPaused: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const StudyRoomModel = models.StudyRoom || model("StudyRoom", StudyRoomSchema);
