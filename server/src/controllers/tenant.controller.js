import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User, Workspace } from "../models/index.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import { buildClientUrl, sendTeamInvitationEmail } from "../utils/email.utils.js";
import {
  buildWorkspaceSettingsPayload,
  ensureWorkspaceForUser,
  getWorkspaceContext,
  getWorkspaceForRequest,
  resolveWorkspaceId,
} from "../utils/workspace.utils.js";

const VALID_ROLES = new Set([
  "super-admin",
  "owner",
  "admin",
  "agent",
  "viewer",
]);
const TEAM_MEMBER_SAFE_SELECT =
  "-passwordHash -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires";
const INVITATION_EXPIRY_HOURS = 72;

const generateRawToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
const generateTokenExpiryDate = (hoursFromNow = 24) =>
  new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

const deriveInvitationStatus = (member) => {
  if (member?.invitationStatus === "pending") return "pending";
  if (member?.invitationStatus === "approved") return "approved";
  return member?.emailVerified ? "approved" : "pending";
};

const toTeamMemberPayload = (member) => {
  const data = typeof member?.toObject === "function" ? member.toObject() : member;
  const invitationStatus = deriveInvitationStatus(data);

  return {
    ...data,
    invitationStatus,
    invitationPending: invitationStatus === "pending",
    invitationApproved: invitationStatus === "approved",
  };
};

const normalizeRole = (value) => String(value || "").trim().toLowerCase();
const normalizeDepartments = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : String(value || "").split(","))
        .map((item) =>
          String(item || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-"),
        )
        .filter(Boolean),
    ),
  ).slice(0, 20);

const canAssignRole = (actorRole, targetRole) => {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);

  if (actor === "super-admin") return true;
  if (actor === "owner") return ["admin", "agent", "viewer"].includes(target);
  if (actor === "admin") return ["agent", "viewer"].includes(target);
  return false;
};

const canManageExistingRole = (actorRole, existingRole) => {
  const actor = normalizeRole(actorRole);
  const existing = normalizeRole(existingRole);

  if (actor === "super-admin") return true;
  if (actor === "owner") return ["owner", "admin", "agent", "viewer"].includes(existing);
  if (actor === "admin") return ["agent", "viewer"].includes(existing);
  return false;
};
const includeWidgetVisitors = (req) =>
  String(req.query?.includeWidgetVisitors || "").trim().toLowerCase() ===
  "true";

const ensureWorkspaceAccess = async (req, res) => {
  const ctx = getWorkspaceContext(req);
  if (ctx.isSuperAdmin) {
    return {
      ...ctx,
      workspaceId: resolveWorkspaceId(req.query?.workspaceId || req.body?.workspaceId),
    };
  }

  const workspace = await ensureWorkspaceForUser(req.user);
  if (!workspace?._id) {
    res.status(400).json({ message: "Workspace is required for this action" });
    return null;
  }

  return {
    ...ctx,
    workspaceId: String(workspace._id),
    workspace,
  };
};

/* -------------------- Workspace Lifecycle -------------------- */
export const createWorkspace = catchAsyncHandler(async (req, res) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  const requestedOwnerId = resolveWorkspaceId(req.body?.ownerId);
  const ownerId = isSuperAdmin && requestedOwnerId ? requestedOwnerId : String(req.user?._id || "");

  if (!ownerId) {
    return res.status(400).json({ message: "ownerId is required" });
  }

  const owner = await User.findById(ownerId);
  if (!owner) {
    return res.status(404).json({ message: "Workspace owner not found" });
  }

  const workspace = await Workspace.create({
    name: String(req.body?.name || "").trim() || `${owner.name || "Team"} Workspace`,
    ownerId: owner._id,
    plan: String(req.body?.plan || "starter").trim() || "starter",
    limits: req.body?.limits,
    allowedDomains: Array.isArray(req.body?.allowedDomains)
      ? req.body.allowedDomains
          .map((domain) => String(domain || "").trim().toLowerCase())
          .filter(Boolean)
      : [],
    brandSettings: req.body?.settings || req.body?.brandSettings,
    aiSettings: req.body?.aiSettings,
  });

  // Non super-admin workspace owners should be mapped to the newly created workspace.
  if (!isSuperAdmin || !owner.workspaceId) {
    owner.workspaceId = workspace._id;
    if (!owner.role || owner.role === "viewer") {
      owner.role = "owner";
    }
    await owner.save();
  }

  return res.status(201).json({
    success: true,
    message: "Workspace created successfully",
    data: buildWorkspaceSettingsPayload(workspace),
  });
});

/* -------------------- Workspace Settings -------------------- */
export const getWorkspaceSettings = catchAsyncHandler(async (req, res) => {
  const workspace = await getWorkspaceForRequest(req);

  if (!workspace) {
    return res.status(404).json({
      success: false,
      message: "Workspace settings not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: buildWorkspaceSettingsPayload(workspace),
  });
});

export const updateWorkspaceSettings = catchAsyncHandler(async (req, res) => {
  const workspace = await getWorkspaceForRequest(req);

  if (!workspace) {
    return res.status(404).json({
      success: false,
      message: "Workspace settings not found",
    });
  }

  const { name, settings, limits, allowedDomains, aiSettings, plan } = req.body || {};

  if (typeof name === "string" && name.trim()) {
    workspace.name = name.trim();
  }

  if (settings && typeof settings === "object") {
    workspace.brandSettings = {
      ...(workspace.brandSettings?.toObject?.() || workspace.brandSettings || {}),
      ...settings,
    };
  }

  if (limits && typeof limits === "object") {
    workspace.limits = {
      ...(workspace.limits?.toObject?.() || workspace.limits || {}),
      ...limits,
    };
  }

  if (Array.isArray(allowedDomains)) {
    workspace.allowedDomains = allowedDomains
      .map((domain) => String(domain || "").trim().toLowerCase())
      .filter(Boolean);
  }

  if (aiSettings && typeof aiSettings === "object") {
    workspace.aiSettings = {
      ...(workspace.aiSettings?.toObject?.() || workspace.aiSettings || {}),
      ...aiSettings,
    };
  }

  if (typeof plan === "string" && plan.trim()) {
    workspace.plan = plan.trim();
  }

  await workspace.save();

  return res.status(200).json({
    success: true,
    message: "Workspace settings updated successfully",
    data: buildWorkspaceSettingsPayload(workspace),
  });
});

/* -------------------- Team Members CRUD -------------------- */
export const getTeamMembers = catchAsyncHandler(async (req, res) => {
  const ctx = await ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = {
    role: { $in: ["owner", "admin", "super-admin", "agent", "viewer"] },
  };
  if (!includeWidgetVisitors(req)) {
    query.email = { $not: /@widget\.chatflex\.local$/i };
  }

  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  } else if (ctx.workspaceId) {
    query.workspaceId = ctx.workspaceId;
  }

  const users = await User.find(query)
    .select(TEAM_MEMBER_SAFE_SELECT)
    .sort({ createdAt: -1 });

  const payload = users.map((user) => toTeamMemberPayload(user));

  return res.status(200).json({
    success: true,
    message: "Team members fetched successfully",
    count: payload.length,
    data: payload,
  });
});

export const getTeamMemberById = catchAsyncHandler(async (req, res) => {
  const ctx = await ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const { id } = req.params;
  const query = { _id: id };
  if (!ctx.isSuperAdmin || ctx.workspaceId) {
    query.workspaceId = ctx.workspaceId;
  }

  const user = await User.findOne(query).select(TEAM_MEMBER_SAFE_SELECT);
  if (!user) {
    return res.status(404).json({ message: "Team member not found" });
  }

  return res.status(200).json({
    success: true,
    message: "Team member fetched successfully",
    data: toTeamMemberPayload(user),
  });
});

export const createTeamMember = catchAsyncHandler(async (req, res) => {
  const ctx = await ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const actorRole = String(req.user?.role || "");

  const { name, email, role, password, departments } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = password
    ? await bcrypt.hash(password, salt)
    : await bcrypt.hash("temporary_password_change_me", salt);

  const targetWorkspaceId =
    ctx.isSuperAdmin && resolveWorkspaceId(req.body?.workspaceId)
      ? resolveWorkspaceId(req.body.workspaceId)
      : ctx.workspaceId;

  if (!targetWorkspaceId) {
    return res.status(400).json({ message: "workspaceId is required" });
  }
  const normalizedRole = normalizeRole(role || "agent");
  if (!VALID_ROLES.has(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role provided" });
  }
  if (!ctx.isSuperAdmin && normalizedRole === "super-admin") {
    return res
      .status(403)
      .json({ message: "Only super-admin can create super-admin users" });
  }

  if (!canAssignRole(actorRole, normalizedRole)) {
    return res.status(403).json({ message: "Insufficient permission for target role" });
  }

  const newUser = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: normalizedRole,
    departments: normalizeDepartments(departments),
    workspaceId: targetWorkspaceId,
    emailVerified: true,
    invitationStatus: "approved",
    invitationAcceptedAt: new Date(),
    requiresPasswordSetup: !password,
  });
  const safeUser = await User.findById(newUser._id).select(TEAM_MEMBER_SAFE_SELECT);

  return res.status(201).json({
    success: true,
    message: "Team member created successfully",
    data: toTeamMemberPayload(safeUser),
  });
});

export const inviteTeamMember = catchAsyncHandler(async (req, res) => {
  const ctx = await ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const actorRole = String(req.user?.role || "");
  const inviterId = String(req.user?._id || "");
  const inviterName = String(req.user?.name || "A teammate");

  const {
    name = "",
    email,
    role = "agent",
    departments,
    workspaceId: requestedWorkspaceId,
  } = req.body || {};
  const hasDepartmentsField = Object.prototype.hasOwnProperty.call(
    req.body || {},
    "departments",
  );
  const normalizedDepartments = hasDepartmentsField
    ? normalizeDepartments(departments)
    : null;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedRole = normalizeRole(role || "agent");
  if (!VALID_ROLES.has(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role provided" });
  }
  if (!ctx.isSuperAdmin && normalizedRole === "super-admin") {
    return res
      .status(403)
      .json({ message: "Only super-admin can invite super-admin users" });
  }
  if (!canAssignRole(actorRole, normalizedRole)) {
    return res.status(403).json({ message: "Insufficient permission for target role" });
  }

  const targetWorkspaceId =
    ctx.isSuperAdmin && resolveWorkspaceId(requestedWorkspaceId)
      ? resolveWorkspaceId(requestedWorkspaceId)
      : ctx.workspaceId;

  if (!targetWorkspaceId) {
    return res.status(400).json({ message: "workspaceId is required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const inviteeName =
    String(name || "")
      .trim()
      .replace(/\s+/g, " ") || normalizedEmail.split("@")[0];

  const rawToken = generateRawToken();
  const hashedToken = hashToken(rawToken);
  const tokenExpiresAt = generateTokenExpiryDate(INVITATION_EXPIRY_HOURS);

  let invitee = await User.findOne({ email: normalizedEmail });

  if (invitee) {
    const inviteeId = String(invitee._id || "");
    if (inviterId && inviteeId && inviteeId === inviterId) {
      return res.status(400).json({
        message: "You cannot invite yourself",
      });
    }

    const existingWorkspaceId = String(invitee.workspaceId || "");
    if (existingWorkspaceId && existingWorkspaceId !== String(targetWorkspaceId)) {
      return res.status(400).json({
        message: "User already belongs to another workspace",
      });
    }

    if (
      existingWorkspaceId === String(targetWorkspaceId) &&
      deriveInvitationStatus(invitee) === "approved"
    ) {
      return res.status(400).json({
        message:
          "User is already an active member of this workspace. Use Edit to change role.",
      });
    }

    invitee.role = normalizedRole;
    if (hasDepartmentsField) {
      invitee.departments = normalizedDepartments;
    }
    invitee.workspaceId = targetWorkspaceId;
    invitee.name = invitee.name || inviteeName;
    invitee.emailVerificationToken = hashedToken;
    invitee.emailVerificationExpires = tokenExpiresAt;
    invitee.invitationStatus = "pending";
    invitee.invitationSentAt = new Date();
    invitee.invitedBy = inviterId || null;
    invitee.invitationAcceptedAt = null;
    invitee.requiresPasswordSetup = Boolean(invitee.requiresPasswordSetup);

    await invitee.save();
  } else {
    const salt = await bcrypt.genSalt(10);
    const temporaryPassword = generateRawToken();
    const passwordHash = await bcrypt.hash(temporaryPassword, salt);

    invitee = await User.create({
      name: inviteeName,
      email: normalizedEmail,
      passwordHash,
      role: normalizedRole,
      departments: normalizedDepartments || [],
      workspaceId: targetWorkspaceId,
      emailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: tokenExpiresAt,
      invitationStatus: "pending",
      invitationSentAt: new Date(),
      invitedBy: inviterId || null,
      invitationAcceptedAt: null,
      requiresPasswordSetup: true,
    });
  }

  const invitationUrl = buildClientUrl("/team-invite/accept", {
    token: rawToken,
    email: normalizedEmail,
  });

  const workspaceName =
    ctx.workspace?.name ||
    (await Workspace.findById(targetWorkspaceId).select("name"))?.name ||
    "your workspace";

  await sendTeamInvitationEmail({
    to: normalizedEmail,
    name: inviteeName,
    inviterName,
    workspaceName,
    role: normalizedRole,
    invitationUrl,
  });

  const safeUser = await User.findById(invitee._id).select(TEAM_MEMBER_SAFE_SELECT);

  return res.status(200).json({
    success: true,
    message: "Invitation email sent successfully",
    data: toTeamMemberPayload(safeUser),
  });
});

export const resendTeamInvitation = catchAsyncHandler(async (req, res) => {
  const ctx = await ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const actorRole = String(req.user?.role || "");
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Team member ID is required" });
  }

  const query = { _id: id };
  if (!ctx.isSuperAdmin || ctx.workspaceId) {
    query.workspaceId = ctx.workspaceId;
  }

  const existingUser = await User.findOne(query);
  if (!existingUser) {
    return res.status(404).json({ message: "Team member not found" });
  }

  if (!canManageExistingRole(actorRole, existingUser.role)) {
    return res.status(403).json({ message: "Insufficient permission for target user" });
  }

  if (deriveInvitationStatus(existingUser) !== "pending") {
    return res.status(400).json({
      message: "Invitation is already approved for this member",
    });
  }

  const rawToken = generateRawToken();
  existingUser.emailVerificationToken = hashToken(rawToken);
  existingUser.emailVerificationExpires = generateTokenExpiryDate(
    INVITATION_EXPIRY_HOURS,
  );
  existingUser.invitationStatus = "pending";
  existingUser.invitationSentAt = new Date();
  existingUser.invitedBy = req.user?._id || existingUser.invitedBy || null;
  existingUser.invitationAcceptedAt = null;

  await existingUser.save();

  const invitationUrl = buildClientUrl("/team-invite/accept", {
    token: rawToken,
    email: existingUser.email,
  });

  const workspaceName =
    ctx.workspace?.name ||
    (await Workspace.findById(existingUser.workspaceId).select("name"))?.name ||
    "your workspace";

  await sendTeamInvitationEmail({
    to: existingUser.email,
    name: existingUser.name,
    inviterName: String(req.user?.name || "A teammate"),
    workspaceName,
    role: existingUser.role,
    invitationUrl,
  });

  const safeUser = await User.findById(existingUser._id).select(
    TEAM_MEMBER_SAFE_SELECT,
  );

  return res.status(200).json({
    success: true,
    message: "Invitation email resent successfully",
    data: toTeamMemberPayload(safeUser),
  });
});

export const updateTeamMember = catchAsyncHandler(async (req, res) => {
  const ctx = await ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const actorRole = String(req.user?.role || "");

  const { id } = req.params;
  const updates = { ...(req.body || {}) };

  if (!ctx.isSuperAdmin) {
    delete updates.workspaceId;
  }

  if (updates.password) {
    const salt = await bcrypt.genSalt(10);
    updates.passwordHash = await bcrypt.hash(updates.password, salt);
    delete updates.password;
  }

  if (typeof updates.role === "string") {
    const normalizedRole = normalizeRole(updates.role);
    if (!VALID_ROLES.has(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }
    if (!ctx.isSuperAdmin && normalizedRole === "super-admin") {
      return res
        .status(403)
        .json({ message: "Only super-admin can assign super-admin role" });
    }
    updates.role = normalizedRole;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "departments")) {
    updates.departments = normalizeDepartments(updates.departments);
  }

  const query = { _id: id };
  if (!ctx.isSuperAdmin || ctx.workspaceId) {
    query.workspaceId = ctx.workspaceId;
  }

  const existingUser = await User.findOne(query);
  if (!existingUser) {
    return res.status(404).json({ message: "Team member not found" });
  }

  if (!canManageExistingRole(actorRole, existingUser.role)) {
    return res.status(403).json({ message: "Insufficient permission for target user" });
  }

  if (typeof updates.role === "string" && !canAssignRole(actorRole, updates.role)) {
    return res.status(403).json({ message: "Insufficient permission for target role" });
  }

  if (typeof updates.name === "string") {
    const normalizedName = String(updates.name).trim().replace(/\s+/g, " ");
    if (!normalizedName) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    updates.name = normalizedName;
  }

  let invitationTokenForResend = null;
  let shouldResendInvitation = false;

  if (typeof updates.email === "string") {
    const normalizedEmail = String(updates.email).trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email cannot be empty" });
    }

    const sameEmail =
      String(existingUser.email || "").trim().toLowerCase() === normalizedEmail;
    if (!sameEmail) {
      const emailOwner = await User.findOne({ email: normalizedEmail }).select("_id");
      if (emailOwner && String(emailOwner._id) !== String(existingUser._id)) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    updates.email = normalizedEmail;

    if (!sameEmail && deriveInvitationStatus(existingUser) === "pending") {
      invitationTokenForResend = generateRawToken();
      updates.emailVerificationToken = hashToken(invitationTokenForResend);
      updates.emailVerificationExpires = generateTokenExpiryDate(
        INVITATION_EXPIRY_HOURS,
      );
      updates.invitationStatus = "pending";
      updates.invitationSentAt = new Date();
      updates.invitedBy = req.user?._id || existingUser.invitedBy || null;
      updates.invitationAcceptedAt = null;
      shouldResendInvitation = true;
    }
  }

  const updatedUser = await User.findOneAndUpdate(query, updates, {
    new: true,
  }).select(TEAM_MEMBER_SAFE_SELECT);

  if (shouldResendInvitation && invitationTokenForResend) {
    const invitationUrl = buildClientUrl("/team-invite/accept", {
      token: invitationTokenForResend,
      email: updatedUser.email,
    });
    const workspaceName =
      ctx.workspace?.name ||
      (await Workspace.findById(updatedUser.workspaceId).select("name"))?.name ||
      "your workspace";

    await sendTeamInvitationEmail({
      to: updatedUser.email,
      name: updatedUser.name,
      inviterName: String(req.user?.name || "A teammate"),
      workspaceName,
      role: updatedUser.role,
      invitationUrl,
    });
  }

  return res.status(200).json({
    message: "Team member updated successfully",
    data: toTeamMemberPayload(updatedUser),
  });
});

export const deleteTeamMember = catchAsyncHandler(async (req, res) => {
  const ctx = await ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const actorRole = String(req.user?.role || "");

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Team member ID is required" });
  }

  const query = { _id: id };
  if (!ctx.isSuperAdmin || ctx.workspaceId) {
    query.workspaceId = ctx.workspaceId;
  }

  const existingUser = await User.findOne(query);
  if (!existingUser) {
    return res.status(404).json({ message: "Team member not found" });
  }

  if (!canManageExistingRole(actorRole, existingUser.role)) {
    return res.status(403).json({ message: "Insufficient permission for target user" });
  }

  const deletedUser = await User.findOneAndDelete(query);

  return res.status(200).json({
    message: `Team member ${deletedUser.name} deleted successfully`,
  });
});
