const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    oauthProvider: { type: String, enum: ["google", "github", null], default: null },
    oauthId: { type: String, default: null, index: true },
    role: {
      type: String,
      enum: ["owner", "admin", "agent", "viewer"],
      default: "agent"
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    status: { type: String, enum: ["active", "invited", "suspended"], default: "active" },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

module.exports = mongoose.model("User", userSchema);
