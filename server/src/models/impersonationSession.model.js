import mongoose from "mongoose";

const ImpersonationSessionSchema = new mongoose.Schema(
  {
    superAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

ImpersonationSessionSchema.index({ superAdminId: 1, startedAt: -1 });
ImpersonationSessionSchema.index({ targetUserId: 1, revokedAt: 1 });

export const ImpersonationSession = mongoose.model(
  "ImpersonationSession",
  ImpersonationSessionSchema,
);
