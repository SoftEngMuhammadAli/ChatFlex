import mongoose from "mongoose";

const CannedResponseSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "General" },
    shortcut: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true, lowercase: true }],
    enabled: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true },
);

CannedResponseSchema.index({ workspaceId: 1, title: 1 });
CannedResponseSchema.index({ workspaceId: 1, shortcut: 1 });

export const CannedResponse = mongoose.model(
  "CannedResponse",
  CannedResponseSchema,
);
