import bcrypt from "bcryptjs";
import crypto from "crypto";
import axios from "axios";
import { User, Usage } from "../models/index.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import { generateToken, generateRefreshToken } from "../utils/token.utils.js";
import { ensureWorkspaceForUser } from "../utils/workspace.utils.js";

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

const DEFAULT_PROFILE_PICTURE_URL =
  "https://cdn-icons-png.flaticon.com/512/9131/9131529.png";

const isPendingInvitation = (user) =>
  String(user?.invitationStatus || "").trim().toLowerCase() === "pending";

const buildInvitationRequiredPayload = (user) => ({
  message:
    "Your team invitation is still pending. Please accept the invitation link from your email before signing in.",
  invitationRequired: true,
  invitationStatus: "pending",
  requiresPasswordSetup: Boolean(user?.requiresPasswordSetup),
});

const buildSessionUser = (
  user,
  workspace = null,
  providerFallback = "local",
) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  workspaceId: user.workspaceId || null,
  workspaceName: workspace?.name || "Workspace",
  emailVerified: user.emailVerified,
  authProvider: user.authProvider || providerFallback,
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

const getGoogleProfileFromCredential = async (credential) => {
  try {
    const tokenInfo = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { timeout: 10000 },
    );
    return { profile: tokenInfo.data || {}, tokenType: "id_token" };
  } catch {
    // Fallback for access_token flow from useGoogleLogin
    const userInfo = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${credential}` },
        timeout: 10000,
      },
    );
    return { profile: userInfo.data || {}, tokenType: "access_token" };
  }
};

const getGithubProfileFromAccessToken = async (accessToken) => {
  const profileRes = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ChatFlex",
    },
    timeout: 10000,
  });

  const profile = profileRes?.data || {};
  const emailsRes = await axios.get("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ChatFlex",
    },
    timeout: 10000,
  });

  const emails = Array.isArray(emailsRes?.data) ? emailsRes.data : [];
  const primaryEmail =
    emails.find((email) => email?.primary && email?.verified)?.email ||
    emails.find((email) => email?.verified)?.email ||
    "";

  return {
    ...profile,
    email: String(profile.email || primaryEmail || "")
      .trim()
      .toLowerCase(),
  };
};

const getGithubAccessTokenFromCode = async (code) => {
  const clientId = String(process.env.GITHUB_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GITHUB_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not configured");
  }

  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
    },
    {
      headers: {
        Accept: "application/json",
      },
      timeout: 10000,
    },
  );

  const accessToken = String(tokenRes?.data?.access_token || "").trim();
  if (!accessToken) {
    throw new Error("Failed to exchange GitHub code");
  }

  return accessToken;
};

const finalizeGithubSession = async (profile) => {
  const providerUserId = String(profile.id || "").trim();
  const providerPictureUrl = String(profile.avatar_url || "").trim();
  const normalizedEmail = String(profile.email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    throw new Error(
      "GitHub account email is required. Ensure your primary email is verified.",
    );
  }

  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const generatedPassword = crypto.randomBytes(24).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(generatedPassword, salt);

    user = await User.create({
      name: String(profile.name || profile.login || "GitHub User"),
      email: normalizedEmail,
      passwordHash,
      role: "owner",
      authProvider: "github",
      oauthProviderId: providerUserId || null,
      profilePictureUrl: providerPictureUrl || undefined,
      emailVerified: true,
    });
    await ensureWorkspaceForUser(user, {
      workspaceName: `${profile.name || profile.login || "GitHub"} Workspace`,
    });

    await Usage.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id, scope: "user" } },
      { upsert: true, new: true },
    );
  } else {
    if (isPendingInvitation(user)) {
      return { pendingInvite: true, user };
    }

    let changed = false;
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      changed = true;
    }
    if (user.authProvider !== "github") {
      user.authProvider = "github";
      changed = true;
    }
    if (providerUserId && user.oauthProviderId !== providerUserId) {
      user.oauthProviderId = providerUserId;
      changed = true;
    }
    if (
      providerPictureUrl &&
      (!String(user.profilePictureUrl || "").trim() ||
        String(user.profilePictureUrl || "").trim() ===
          DEFAULT_PROFILE_PICTURE_URL)
    ) {
      user.profilePictureUrl = providerPictureUrl;
      changed = true;
    }
    if (changed) {
      await user.save();
    }
  }

  const workspace = await ensureWorkspaceForUser(user, {
    workspaceName: `${profile.name || profile.login || "GitHub"} Workspace`,
  });

  return { pendingInvite: false, user, workspace };
};

/**
 * ================= GOOGLE LOGIN =================
 */
export const googleLogin = catchAsyncHandler(async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  let profilePayload;
  try {
    profilePayload = await getGoogleProfileFromCredential(credential);
  } catch {
    return res.status(401).json({ message: "Invalid Google token" });
  }

  const profile = profilePayload.profile || {};
  const providerUserId = String(profile.sub || profile.id || "").trim();
  const providerPictureUrl = String(profile.picture || "").trim();
  if (!profile?.email) {
    return res.status(401).json({ message: "Invalid Google token" });
  }

  const expectedAud = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  if (
    profilePayload.tokenType === "id_token" &&
    expectedAud &&
    String(profile.aud || "") !== expectedAud
  ) {
    return res.status(401).json({ message: "Google token audience mismatch" });
  }

  const normalizedEmail = String(profile.email).trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const generatedPassword = crypto.randomBytes(24).toString("hex");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(generatedPassword, salt);

    user = await User.create({
      name: String(
        profile.name || normalizedEmail.split("@")[0] || "Google User",
      ),
      email: normalizedEmail,
      passwordHash,
      role: "owner",
      authProvider: "google",
      oauthProviderId: providerUserId || null,
      profilePictureUrl: providerPictureUrl || undefined,
      emailVerified: true,
    });
    await ensureWorkspaceForUser(user, {
      workspaceName: `${profile.name || "Google"} Workspace`,
    });

    await Usage.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id, scope: "user" } },
      { upsert: true, new: true },
    );
  } else {
    if (isPendingInvitation(user)) {
      return res.status(403).json(buildInvitationRequiredPayload(user));
    }

    let changed = false;
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      changed = true;
    }
    if (user.authProvider !== "google") {
      user.authProvider = "google";
      changed = true;
    }
    if (providerUserId && user.oauthProviderId !== providerUserId) {
      user.oauthProviderId = providerUserId;
      changed = true;
    }
    if (
      providerPictureUrl &&
      (!String(user.profilePictureUrl || "").trim() ||
        String(user.profilePictureUrl || "").trim() ===
          DEFAULT_PROFILE_PICTURE_URL)
    ) {
      user.profilePictureUrl = providerPictureUrl;
      changed = true;
    }
    if (changed) {
      await user.save();
    }
  }
  const workspace = await ensureWorkspaceForUser(user, {
    workspaceName: `${profile.name || "Google"} Workspace`,
  });
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
    message: "Google login successful",
    token,
    user: buildSessionUser(user, workspace, "google"),
  });
});

/**
 * ================= GITHUB LOGIN =================
 */
export const githubLogin = catchAsyncHandler(async (req, res) => {
  const { accessToken } = req.body || {};
  if (!accessToken) {
    return res.status(400).json({ message: "GitHub access token is required" });
  }

  let profile;
  try {
    profile = await getGithubProfileFromAccessToken(accessToken);
  } catch {
    return res.status(401).json({ message: "Invalid GitHub token" });
  }
  const { user, workspace, pendingInvite } = await finalizeGithubSession(profile);
  if (pendingInvite) {
    return res.status(403).json(buildInvitationRequiredPayload(user));
  }
  const githubSuspensionMessage = getWorkspaceSuspensionMessage(workspace);
  if (githubSuspensionMessage && user.role !== "super-admin") {
    return res.status(403).json({
      message: githubSuspensionMessage,
      workspaceSuspended: true,
    });
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  setAuthCookie(res, token);
  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    message: "GitHub login successful",
    token,
    user: buildSessionUser(user, workspace, "github"),
  });
});

export const githubCodeLogin = catchAsyncHandler(async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    return res.status(400).json({ message: "GitHub OAuth code is required" });
  }

  let accessToken = "";
  try {
    accessToken = await getGithubAccessTokenFromCode(code);
  } catch (error) {
    if (
      String(error?.message || "")
        .toLowerCase()
        .includes("configured")
    ) {
      return res.status(500).json({ message: error.message });
    }
    return res.status(401).json({ message: "Invalid GitHub OAuth code" });
  }

  let profile;
  try {
    profile = await getGithubProfileFromAccessToken(accessToken);
  } catch {
    return res.status(401).json({ message: "Invalid GitHub token" });
  }

  const { user, workspace, pendingInvite } = await finalizeGithubSession(profile);
  if (pendingInvite) {
    return res.status(403).json(buildInvitationRequiredPayload(user));
  }
  const githubCodeSuspensionMessage = getWorkspaceSuspensionMessage(workspace);
  if (githubCodeSuspensionMessage && user.role !== "super-admin") {
    return res.status(403).json({
      message: githubCodeSuspensionMessage,
      workspaceSuspended: true,
    });
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  setAuthCookie(res, token);
  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    message: "GitHub login successful",
    token,
    user: buildSessionUser(user, workspace, "github"),
  });
});
