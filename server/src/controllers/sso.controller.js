import { Issuer, generators } from "openid-client";
import { Workspace, User, Usage } from "../models/index.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import { generateToken, generateRefreshToken } from "../utils/token.utils.js";
import { ensureWorkspaceForUser } from "../utils/workspace.utils.js";
import { buildClientUrl } from "../utils/email.utils.js";
import { encryptSecret, decryptSecret } from "../utils/crypto.util.js";

const normalizeText = (value) => String(value || "").trim();

const cookieNameForWorkspace = (workspaceId) => `cf_oidc_${workspaceId}`;

const getServerPublicUrl = () =>
  normalizeText(process.env.SERVER_PUBLIC_URL) ||
  normalizeText(process.env.PUBLIC_URL) ||
  "";

const buildRedirectUri = (workspaceId) => {
  const base = getServerPublicUrl();
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}/api/sso/oidc/${encodeURIComponent(
    workspaceId,
  )}/callback`;
};

const setTempCookie = (res, name, value) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 10 * 60 * 1000,
  });
};

const clearTempCookie = (res, name) => {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
};

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

const buildSessionUser = (user, workspace) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  workspaceId: user.workspaceId || null,
  workspaceName: workspace?.name || "Workspace",
  emailVerified: Boolean(user.emailVerified),
  authProvider: user.authProvider || "oidc",
  oauthProviderId: user.oauthProviderId || null,
  profilePictureUrl: String(user.profilePictureUrl || "").trim(),
});

const loadWorkspaceOidc = async (workspaceId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { workspace: null, oidc: null };
  const oidc = workspace?.authSettings?.oidc || null;
  return { workspace, oidc };
};

export const getOidcConfig = catchAsyncHandler(async (req, res) => {
  const workspaceId = normalizeText(req.params.workspaceId);
  const { workspace, oidc } = await loadWorkspaceOidc(workspaceId);
  if (!workspace) return res.status(404).json({ message: "Workspace not found" });

  return res.status(200).json({
    data: {
      workspaceId,
      enabled: Boolean(oidc?.enabled),
      issuerUrl: String(oidc?.issuerUrl || ""),
      clientId: String(oidc?.clientId || ""),
      allowAutoProvision: oidc?.allowAutoProvision !== false,
      defaultRole: String(oidc?.defaultRole || "viewer"),
    },
  });
});

export const updateOidcConfig = catchAsyncHandler(async (req, res) => {
  const role = String(req.user?.role || "");
  if (!["owner", "admin", "super-admin"].includes(role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const workspaceId = normalizeText(req.params.workspaceId || req.user?.workspaceId);
  const { workspace } = await loadWorkspaceOidc(workspaceId);
  if (!workspace) return res.status(404).json({ message: "Workspace not found" });

  if (role !== "super-admin" && normalizeText(workspace.ownerId) !== normalizeText(req.user?._id)) {
    // Owners/admins can only manage their own workspace config.
    // Admins are allowed as long as they're within the workspace.
    if (normalizeText(req.user?.workspaceId) !== normalizeText(workspace._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
  }

  const enabled = req.body?.enabled === true;
  const issuerUrl = normalizeText(req.body?.issuerUrl);
  const clientId = normalizeText(req.body?.clientId);
  const clientSecret = normalizeText(req.body?.clientSecret);
  const allowAutoProvision = req.body?.allowAutoProvision !== false;
  const defaultRole = ["viewer", "agent", "admin"].includes(String(req.body?.defaultRole))
    ? String(req.body.defaultRole)
    : "viewer";

  workspace.authSettings = workspace.authSettings || {};
  workspace.authSettings.oidc = workspace.authSettings.oidc || {};
  workspace.authSettings.oidc.enabled = enabled;
  workspace.authSettings.oidc.issuerUrl = issuerUrl;
  workspace.authSettings.oidc.clientId = clientId;
  workspace.authSettings.oidc.clientSecret = encryptSecret(clientSecret);
  workspace.authSettings.oidc.allowAutoProvision = allowAutoProvision;
  workspace.authSettings.oidc.defaultRole = defaultRole;
  await workspace.save();

  return res.status(200).json({
    message: "OIDC settings updated",
  });
});

export const startOidcLogin = catchAsyncHandler(async (req, res) => {
  const workspaceId = normalizeText(req.params.workspaceId);
  const { workspace, oidc } = await loadWorkspaceOidc(workspaceId);
  if (!workspace) return res.status(404).json({ message: "Workspace not found" });

  if (oidc?.enabled !== true) {
    return res.status(400).json({ message: "SSO is not enabled for this workspace" });
  }

  const issuerUrl = normalizeText(oidc?.issuerUrl);
  const clientId = normalizeText(oidc?.clientId);
  const clientSecret = decryptSecret(oidc?.clientSecret);
  const redirectUri = buildRedirectUri(workspaceId);
  if (!issuerUrl || !clientId || !clientSecret || !redirectUri) {
    return res.status(400).json({ message: "SSO is not configured correctly" });
  }

  const issuer = await Issuer.discover(issuerUrl);
  const client = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ["code"],
  });

  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  const nonce = generators.nonce();

  const returnTo = normalizeText(req.query.returnTo) || "/login";
  setTempCookie(
    res,
    cookieNameForWorkspace(workspaceId),
    Buffer.from(
      JSON.stringify({
        cv: codeVerifier,
        state,
        nonce,
        returnTo,
      }),
      "utf8",
    ).toString("base64"),
  );

  const url = client.authorizationUrl({
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return res.redirect(url);
});

export const finishOidcLogin = catchAsyncHandler(async (req, res) => {
  const workspaceId = normalizeText(req.params.workspaceId);
  const { workspace, oidc } = await loadWorkspaceOidc(workspaceId);
  if (!workspace) return res.status(404).json({ message: "Workspace not found" });

  if (oidc?.enabled !== true) {
    return res.status(400).json({ message: "SSO is not enabled for this workspace" });
  }

  const cookieName = cookieNameForWorkspace(workspaceId);
  const cookieValue = normalizeText(req.cookies?.[cookieName]);
  clearTempCookie(res, cookieName);
  if (!cookieValue) {
    return res.status(400).json({ message: "SSO session expired. Please try again." });
  }

  let temp;
  try {
    temp = JSON.parse(Buffer.from(cookieValue, "base64").toString("utf8"));
  } catch {
    return res.status(400).json({ message: "SSO session invalid. Please try again." });
  }

  const issuerUrl = normalizeText(oidc?.issuerUrl);
  const clientId = normalizeText(oidc?.clientId);
  const clientSecret = decryptSecret(oidc?.clientSecret);
  const redirectUri = buildRedirectUri(workspaceId);
  if (!issuerUrl || !clientId || !clientSecret || !redirectUri) {
    return res.status(400).json({ message: "SSO is not configured correctly" });
  }

  const issuer = await Issuer.discover(issuerUrl);
  const client = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ["code"],
  });

  const params = client.callbackParams(req);
  const tokenSet = await client.callback(redirectUri, params, {
    code_verifier: String(temp.cv || ""),
    state: String(temp.state || ""),
    nonce: String(temp.nonce || ""),
  });

  const claims = tokenSet.claims();
  const email = normalizeText(claims?.email).toLowerCase();
  const subject = normalizeText(claims?.sub);
  const displayName = normalizeText(claims?.name || claims?.preferred_username || "");
  const picture = normalizeText(claims?.picture || "");

  if (!email) {
    return res.status(400).json({ message: "SSO profile did not include an email" });
  }

  let user = await User.findOne({ email, workspaceId: workspace._id });
  if (!user) {
    if (oidc?.allowAutoProvision === false) {
      return res.status(403).json({ message: "User is not allowed in this workspace" });
    }
    user = await User.create({
      name: displayName || email.split("@")[0],
      email,
      passwordHash: "oidc",
      role: oidc?.defaultRole || "viewer",
      workspaceId: workspace._id,
      emailVerified: true,
      authProvider: "oidc",
      oauthProviderId: subject || null,
      profilePictureUrl: picture,
    });
    await Usage.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id, scope: "user" } },
      { upsert: true, new: true },
    );
  } else {
    let dirty = false;
    if (subject && user.oauthProviderId !== subject) {
      user.oauthProviderId = subject;
      dirty = true;
    }
    if (picture && user.profilePictureUrl !== picture) {
      user.profilePictureUrl = picture;
      dirty = true;
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      dirty = true;
    }
    if (dirty) await user.save();
  }

  const ensuredWorkspace = await ensureWorkspaceForUser(user);
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);
  setAuthCookie(res, token);
  setRefreshCookie(res, refreshToken);

  const returnTo = normalizeText(temp?.returnTo) || "/login";
  const redirectTo = buildClientUrl("/sso/oidc/callback", {
    token,
    returnTo,
    workspaceId: normalizeText(workspace._id),
  });

  return res.redirect(redirectTo);
});

