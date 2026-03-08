const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Workspace = require("../models/Workspace");
const { signToken } = require("../utils/jwt");
const { createOneTimeToken, hashToken } = require("../utils/token");

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
const isEmailVerificationRequired =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true" || process.env.NODE_ENV === "production";
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const uniqueWorkspaceSlug = async (workspaceName) => {
  const base = slugify(workspaceName) || "workspace";
  let slug = base;
  let counter = 1;

  while (await Workspace.exists({ slug })) {
    counter += 1;
    slug = `${base}-${counter}`;
  }
  return slug;
};

const sanitizeUser = (user) => ({
  id: user._id,
  workspaceId: user.workspaceId,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  isEmailVerified: user.isEmailVerified
});

const register = async (req, res, next) => {
  try {
    const { name, email, password, workspaceName } = req.body;
    if (!name || !email || !password || !workspaceName) {
      return res.status(400).json({ message: "name, email, password, and workspaceName are required" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await User.hashPassword(password);
    const owner = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: "owner",
      status: "active",
      isEmailVerified: !isEmailVerificationRequired
    });

    const slug = await uniqueWorkspaceSlug(workspaceName);
    const workspace = await Workspace.create({
      name: workspaceName,
      slug,
      ownerId: owner._id
    });

    owner.workspaceId = workspace._id;

    let verifyToken = null;
    if (isEmailVerificationRequired) {
      verifyToken = createOneTimeToken(60 * 24);
      owner.emailVerificationTokenHash = verifyToken.tokenHash;
      owner.emailVerificationExpires = verifyToken.expiresAt;
    } else {
      owner.emailVerificationTokenHash = null;
      owner.emailVerificationExpires = null;
    }
    await owner.save();

    if (!isEmailVerificationRequired) {
      const token = signToken(owner);
      return res.status(201).json({
        token,
        verificationRequired: false,
        user: sanitizeUser(owner),
        workspace
      });
    }

    return res.status(201).json({
      message: "Registration successful. Please verify your email before login.",
      verificationRequired: true,
      user: sanitizeUser(owner),
      workspace,
      devVerificationToken:
        process.env.NODE_ENV !== "production" && verifyToken ? verifyToken.plainToken : undefined
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (isEmailVerificationRequired && !user.isEmailVerified) {
      return res.status(403).json({
        message: "Email not verified. Please verify your email first."
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const workspace = user.workspaceId ? await Workspace.findById(user.workspaceId) : null;
    const token = signToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
      workspace
    });
  } catch (error) {
    return next(error);
  }
};

const requestEmailVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.json({ message: "If this email exists, a verification link has been sent." });
    }

    const verifyToken = createOneTimeToken(60 * 24);
    user.emailVerificationTokenHash = verifyToken.tokenHash;
    user.emailVerificationExpires = verifyToken.expiresAt;
    await user.save();

    return res.json({
      message: "Verification token generated.",
      devVerificationToken:
        process.env.NODE_ENV !== "production" ? verifyToken.plainToken : undefined
    });
  } catch (error) {
    return next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ message: "email and token are required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(400).json({ message: "Invalid verification token" });
    }

    const tokenHash = hashToken(token);
    const isValid =
      user.emailVerificationTokenHash === tokenHash &&
      user.emailVerificationExpires &&
      user.emailVerificationExpires > new Date();

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.json({ message: "Email verified successfully." });
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.json({ message: "If this email exists, a reset link has been sent." });
    }

    const resetToken = createOneTimeToken(30);
    user.passwordResetTokenHash = resetToken.tokenHash;
    user.passwordResetExpires = resetToken.expiresAt;
    await user.save();

    return res.json({
      message: "Password reset token generated.",
      devResetToken: process.env.NODE_ENV !== "production" ? resetToken.plainToken : undefined
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "email, token, and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const tokenHash = hashToken(token);
    const isValid =
      user.passwordResetTokenHash === tokenHash &&
      user.passwordResetExpires &&
      user.passwordResetExpires > new Date();

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.json({ message: "Password reset successful." });
  } catch (error) {
    return next(error);
  }
};

const getGoogleProfile = async (idToken) => {
  if (!googleClient) {
    throw new Error("Google OAuth is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Google profile does not include email");
  }

  return {
    provider: "google",
    oauthId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    emailVerified: Boolean(payload.email_verified)
  };
};

const getGithubProfile = async (accessToken) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "chatflex-server"
  };

  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) {
    throw new Error("GitHub token validation failed");
  }
  const userData = await userRes.json();

  const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
  if (!emailsRes.ok) {
    throw new Error("Could not fetch GitHub emails");
  }
  const emailList = await emailsRes.json();
  const verifiedEmail =
    emailList.find((entry) => entry.primary && entry.verified)?.email ||
    emailList.find((entry) => entry.verified)?.email;

  if (!verifiedEmail) {
    throw new Error("GitHub account does not have a verified email");
  }

  return {
    provider: "github",
    oauthId: String(userData.id),
    email: verifiedEmail.toLowerCase(),
    name: userData.name || userData.login || verifiedEmail.split("@")[0],
    emailVerified: true
  };
};

const oauthLogin = async (req, res, next) => {
  try {
    const { provider, idToken, accessToken, workspaceName } = req.body;
    if (!provider || !["google", "github"].includes(provider)) {
      return res.status(400).json({ message: "provider must be google or github" });
    }

    let profile;
    if (provider === "google") {
      if (!idToken) {
        return res.status(400).json({ message: "idToken is required for google OAuth" });
      }
      profile = await getGoogleProfile(idToken);
    } else {
      if (!accessToken) {
        return res.status(400).json({ message: "accessToken is required for github OAuth" });
      }
      profile = await getGithubProfile(accessToken);
    }

    let user =
      (await User.findOne({ oauthProvider: profile.provider, oauthId: profile.oauthId })) ||
      (await User.findOne({ email: profile.email }));

    if (!user) {
      const randomPassword = await User.hashPassword(
        `${profile.provider}:${profile.oauthId}:${Date.now()}`
      );
      user = await User.create({
        name: profile.name,
        email: profile.email,
        passwordHash: randomPassword,
        role: "owner",
        status: "active",
        isEmailVerified: profile.emailVerified,
        oauthProvider: profile.provider,
        oauthId: profile.oauthId
      });

      const slug = await uniqueWorkspaceSlug(workspaceName || `${profile.name}-workspace`);
      const workspace = await Workspace.create({
        name: workspaceName || `${profile.name}'s Workspace`,
        slug,
        ownerId: user._id
      });

      user.workspaceId = workspace._id;
      await user.save();
    } else {
      if (!user.oauthProvider || !user.oauthId) {
        user.oauthProvider = profile.provider;
        user.oauthId = profile.oauthId;
      }
      if (!user.isEmailVerified && profile.emailVerified) {
        user.isEmailVerified = true;
      }
      await user.save();
    }

    user.lastLoginAt = new Date();
    await user.save();

    const workspace = user.workspaceId ? await Workspace.findById(user.workspaceId) : null;
    const token = signToken(user);

    return res.json({
      token,
      user: sanitizeUser(user),
      workspace
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-passwordHash -passwordResetTokenHash -emailVerificationTokenHash"
    );
    const workspace = user?.workspaceId ? await Workspace.findById(user.workspaceId) : null;

    return res.json({ user, workspace });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  requestEmailVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  oauthLogin
};
