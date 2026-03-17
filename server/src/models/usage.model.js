import mongoose from "mongoose";

const UsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      unique: true,
      sparse: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      unique: true,
      sparse: true,
    },
    scope: {
      type: String,
      enum: ["global", "user", "workspace"],
      default: "user",
    },
    conversationsThisMonth: { type: Number, default: 0 },
    aiTokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Usage = mongoose.model("Usage", UsageSchema);
