import mongoose from "mongoose";

const RoutingStateSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: "__all__",
    },
    nextIndex: { type: Number, default: 0, min: 0 },
    lastAssignedAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

RoutingStateSchema.index({ workspaceId: 1, department: 1 }, { unique: true });

export const RoutingState = mongoose.model("RoutingState", RoutingStateSchema);

