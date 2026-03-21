import { Schema, model, models } from "mongoose";

const WhiteboardPointSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  { _id: false }
);

const WhiteboardStrokeSchema = new Schema(
  {
    strokeId: { type: String, required: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    color: { type: String, default: "#7B6CF6" },
    width: { type: Number, default: 3 },
    points: { type: [WhiteboardPointSchema], default: [] },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

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
    whiteboardStrokes: {
      type: [WhiteboardStrokeSchema],
      default: []
    },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const StudyRoomModel = models.StudyRoom || model("StudyRoom", StudyRoomSchema);
