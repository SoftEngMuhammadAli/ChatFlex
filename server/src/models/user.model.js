import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook", "github"],
      default: "local",
    },
    oauthProviderId: {
      type: String,
      default: null,
      trim: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    widgetVisitorId: {
      type: String,
      trim: true,
      default: "",
    },
    widgetVisitorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["super-admin", "admin", "owner", "agent", "viewer"],
      default: "owner",
    },
    departments: {
      type: [String],
      default: () => [],
    },
    status: {
      type: String,
      enum: ["online", "offline", "busy"],
      default: "offline",
    },
    profilePictureUrl: {
      type: String,
      trim: true,
      default: "https://cdn-icons-png.flaticon.com/512/9131/9131529.png",
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    invitationStatus: {
      type: String,
      enum: ["pending", "approved"],
      default: "approved",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    invitationSentAt: { type: Date, default: null },
    invitationAcceptedAt: { type: Date, default: null },
    requiresPasswordSetup: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.passwordHash);
};

UserSchema.index(
  { workspaceId: 1, widgetVisitorId: 1 },
  { unique: true, sparse: true },
);

export const User = mongoose.model("User", UserSchema);
