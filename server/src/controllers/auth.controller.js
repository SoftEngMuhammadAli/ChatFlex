import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { User, Usage, Workspace } from "../models/index.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import {
  generateToken,
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.utils.js";
import { ensureWorkspaceForUser } from "../utils/workspace.utils.js";
import {
  buildClientUrl,
  sendPasswordResetEmail,
  sendTeamInvitationEmail,
  sendVerificationEmail,
} from "../utils/email.utils.js";

dotenv.config();

const generateRawToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const generateTokenExpiryDate = (hoursFromNow = 24) =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

const setAuthCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const buildSessionUser = (user, workspace = null) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  workspaceId: user.workspaceId || null,
  workspaceName: workspace?.name || "Workspace",
  emailVerified: user.emailVerified,
  authProvider: user.authProvider || "local",
  oauthProviderId: user.oauthProviderId || null,
  profilePictureUrl: String(user.profilePictureUrl || "").trim(),
});

const getWorkspaceSuspensionMessage = (workspace) => {
  const isSuspended =
    String(workspace?.status || "").toLowerCase() === "suspended" ||
    workspace?.suspension?.isSuspended === true;
  if (!isSuspended) return "";

  const reason = String(workspace?.suspension?.reason || "").trim();
  return reason
    ? `Workspace is suspended: ${reason}`
    : "Workspace is suspended. Contact support.";
};

const issueAndAttachVerificationToken = async (user) => {
  const rawToken = generateRawToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = generateTokenExpiryDate(24);
  await user.save();
  return rawToken;
};

const findUserByToken = async ({ token, tokenField, expiresField }) => {
  const hashedToken = hashToken(token);
  return User.findOne({
    [tokenField]: hashedToken,
    [expiresField]: { $gt: new Date() },
  });
};

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const INVITATION_EXPIRY_HOURS = 72;

const isPendingInvitation = (user) =>
  String(user?.invitationStatus || "").trim().toLowerCase() === "pending";

const buildInvitationRequiredPayload = (
  user,
  message = "Your team invitation is still pending. Please accept the invitation link from your email.",
) => ({
  message,
  invitationRequired: true,
  invitationStatus: "pending",
  requiresPasswordSetup: Boolean(user?.requiresPasswordSetup),
});

const sendPendingInvitationEmail = async (
  user,
  inviterName = "A teammate",
) => {
  const rawToken = generateRawToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = generateTokenExpiryDate(
    INVITATION_EXPIRY_HOURS,
  );
  user.invitationSentAt = new Date();
  await user.save();

  const workspaceName = user.workspaceId
    ? (await Workspace.findById(user.workspaceId).select("name"))?.name ||
      "your workspace"
    : "your workspace";

  const invitationUrl = buildClientUrl("/team-invite/accept", {
    token: rawToken,
    email: user.email,
  });

  await sendTeamInvitationEmail({
    to: user.email,
    name: user.name,
    inviterName,
    workspaceName,
    role: user.role,
    invitationUrl,
  });
};

/**
 * ================= REGISTER =================
 */
export const register = catchAsyncHandler(async (req, res) => {
  const { name, email, password, workspaceName } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    if (isPendingInvitation(existingUser)) {
      return res.status(409).json(
        buildInvitationRequiredPayload(
          existingUser,
          "This email already has a pending team invitation. Please accept the invite link sent to your email.",
        ),
      );
    }

    if (!existingUser.emailVerified) {
      const rawToken = await issueAndAttachVerificationToken(existingUser);
      const verificationUrl = buildClientUrl("/verify-email", {
        token: rawToken,
      });
      await sendVerificationEmail({
        to: existingUser.email,
        name: existingUser.name,
        verificationUrl,
      });

      return res.status(200).json({
        message:
          "Account already exists but is not verified. Verification email resent.",
        verificationRequired: true,
      });
    }
    return res.status(400).json({ message: "User already exists" });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const rawToken = generateRawToken();
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: "owner",
    emailVerified: false,
    emailVerificationToken: hashToken(rawToken),
    emailVerificationExpires: generateTokenExpiryDate(24),
  });
  const workspace = await ensureWorkspaceForUser(user, { workspaceName });

  await Usage.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id, scope: "user" } },
    { upsert: true, new: true },
  );

  const verificationUrl = buildClientUrl("/verify-email", { token: rawToken });
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verificationUrl,
  });

  return res.status(201).json({
    message:
      "Registration successful. Please check your email to verify your account.",
    verificationRequired: true,
    verificationToken: process.env.NODE_ENV === "development" ? rawToken : null,
    user: buildSessionUser(user, workspace),
  });
});

/**
 * ================= RESEND VERIFICATION =================
 */
export const resendVerificationEmail = catchAsyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(200).json({
      message:
        "If an account exists with this email, a verification email has been sent",
    });
  }

  if (isPendingInvitation(user)) {
    const inviterName = user.invitedBy
      ? (await User.findById(user.invitedBy).select("name"))?.name ||
        "A teammate"
      : "A teammate";

    await sendPendingInvitationEmail(user, inviterName);

    return res.status(200).json({
      ...buildInvitationRequiredPayload(
        user,
        "Team invitation email resent. Please accept the invite link to join the workspace.",
      ),
    });
  }

  if (user.emailVerified) {
    return res.status(200).json({ message: "Email is already verified" });
  }

  const rawToken = await issueAndAttachVerificationToken(user);
  const verificationUrl = buildClientUrl("/verify-email", { token: rawToken });
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    verificationUrl,
  });

  return res.status(200).json({
    message:
      "If an account exists with this email, a verification email has been sent",
    verificationToken: process.env.NODE_ENV === "development" ? rawToken : null,
  });
});

/**
 * ================= VERIFY EMAIL =================
 */
export const verifyEmail = catchAsyncHandler(async (req, res) => {
  const token = req.body?.token || req.query?.token || req.params?.token;

  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  const user = await findUserByToken({
    token,
    tokenField: "emailVerificationToken",
    expiresField: "emailVerificationExpires",
  });

  if (!user) {
    return res
      .status(400)
      .json({ message: "Invalid or expired verification token" });
  }

  if (isPendingInvitation(user) && user.requiresPasswordSetup) {
    return res.status(400).json(
      buildInvitationRequiredPayload(
        user,
        "Please accept the team invitation link to set your password and join the workspace.",
      ),
    );
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  if (user.invitationStatus === "pending") {
    user.invitationStatus = "approved";
    user.invitationAcceptedAt = new Date();
  }
  await user.save();

  return res.status(200).json({
    message: "Email verified successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
});

/**
 * ================= TEAM INVITE DETAILS =================
 */
export const getTeamInviteDetails = catchAsyncHandler(async (req, res) => {
  const token = req.query?.token || req.body?.token || req.params?.token;

  if (!token) {
    return res.status(400).json({ message: "Invitation token is required" });
  }

  const user = await findUserByToken({
    token,
    tokenField: "emailVerificationToken",
    expiresField: "emailVerificationExpires",
  });

  if (!user || user.invitationStatus !== "pending") {
    return res.status(400).json({
      message: "Invalid or expired invitation token",
    });
  }

  const workspace = user.workspaceId
    ? await Workspace.findById(user.workspaceId).select("name")
    : null;

  return res.status(200).json({
    message: "Invitation details fetched successfully",
    data: {
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId || null,
      workspaceName: workspace?.name || "Workspace",
      requiresPasswordSetup: Boolean(user.requiresPasswordSetup),
      invitationStatus: user.invitationStatus,
    },
  });
});

/**
 * ================= ACCEPT TEAM INVITE =================
 */
export const acceptTeamInvite = catchAsyncHandler(async (req, res) => {
  const token = req.body?.token || req.query?.token || req.params?.token;
  const displayName = normalizeName(req.body?.name);
  const providedPassword = String(req.body?.password || "");

  if (!token) {
    return res.status(400).json({ message: "Invitation token is required" });
  }

  const user = await findUserByToken({
    token,
    tokenField: "emailVerificationToken",
    expiresField: "emailVerificationExpires",
  });

  if (!user || user.invitationStatus !== "pending") {
    return res.status(400).json({
      message: "Invalid or expired invitation token",
    });
  }

  const hasPasswordInput = String(providedPassword).trim().length > 0;
  if (user.requiresPasswordSetup && !hasPasswordInput) {
    return res.status(400).json({
      message: "Password is required to accept this invitation",
    });
  }

  if (hasPasswordInput) {
    if (providedPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(providedPassword, salt);
  }

  if (displayName) {
    user.name = displayName;
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  user.invitationStatus = "approved";
  user.invitationAcceptedAt = new Date();
  user.requiresPasswordSetup = false;
  await user.save();

  const workspace = await ensureWorkspaceForUser(user);
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  setAuthCookie(res, accessToken);
  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    message: "Invitation accepted successfully",
    token: accessToken,
    user: buildSessionUser(user, workspace),
  });
});

/**
 * ================= LOGIN =================
 */
export const login = catchAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  if (isPendingInvitation(user)) {
    return res
      .status(403)
      .json(buildInvitationRequiredPayload(user));
  }

  if (!user.emailVerified && user.role !== "super-admin") {
    return res.status(403).json({
      message: "Please verify your email before logging in",
      verificationRequired: true,
    });
  }
  const workspace = await ensureWorkspaceForUser(user);
  const suspensionMessage = getWorkspaceSuspensionMessage(workspace);
  if (suspensionMessage && user.role !== "super-admin") {
    return res.status(403).json({
      message: suspensionMessage,
      workspaceSuspended: true,
    });
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  setAuthCookie(res, token);
  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    message: "Login successful",
    token,
    user: buildSessionUser(user, workspace),
  });
});

/**
 * ================= FORGOT PASSWORD =================
 */
export const forgotPassword = catchAsyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(200).json({
      message:
        "If an account exists with this email, a password reset link has been sent",
    });
  }

  const rawToken = generateRawToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const resetUrl = buildClientUrl("/reset-password", { token: rawToken });
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  return res.status(200).json({
    message:
      "If an account exists with this email, a password reset link has been sent",
    resetToken: process.env.NODE_ENV === "development" ? rawToken : null,
  });
});

/**
 * ================= RESET PASSWORD =================
 */
export const resetPassword = catchAsyncHandler(async (req, res) => {
  const token = req.body?.token || req.query?.token;
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ message: "Token and new password are required" });
  }

  if (String(newPassword).length < 6) {
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters" });
  }

  const user = await findUserByToken({
    token,
    tokenField: "passwordResetToken",
    expiresField: "passwordResetExpires",
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return res.status(200).json({
    message: "Password reset successfully",
  });
});

/**
 * ================= LOGOUT =================
 */
export const logout = catchAsyncHandler(async (_req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  });

  return res.status(200).json({
    message: "Logout successful",
  });
});

/**
 * ================= Refresh Token =================
 */
export const refreshToken = catchAsyncHandler(async (req, res) => {
  const refreshTokenCookie = req.cookies.refreshToken;
  const refreshSecret =
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET;

  if (!refreshTokenCookie) {
    return res.status(401).json({ message: "No refresh token found" });
  }

  let decodedUser;
  try {
    decodedUser = jwt.verify(refreshTokenCookie, refreshSecret);
  } catch (_err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const accessToken = generateAccessToken({
    _id: decodedUser.id,
    role: decodedUser.role || null,
  });

  const user = await User.findById(decodedUser.id);
  if (!user) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
  if (isPendingInvitation(user)) {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    return res
      .status(403)
      .json(buildInvitationRequiredPayload(user));
  }

  const workspace = await ensureWorkspaceForUser(user);
  const suspensionMessage = getWorkspaceSuspensionMessage(workspace);
  if (suspensionMessage && user.role !== "super-admin") {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    return res.status(403).json({
      message: suspensionMessage,
      workspaceSuspended: true,
    });
  }
  const rotatedRefreshToken = generateRefreshToken(user);

  setAuthCookie(res, accessToken);
  setRefreshCookie(res, rotatedRefreshToken);

  return res.status(200).json({
    message: "Refresh token successful",
    token: accessToken,
    user: buildSessionUser(user, workspace),
  });
});
