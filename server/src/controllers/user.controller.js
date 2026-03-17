import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { User } from "../models/index.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";

const VALID_ROLES = new Set([
  "super-admin",
  "owner",
  "admin",
  "agent",
  "viewer",
]);

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

const sanitizeUser = (user) => {
  if (!user) return null;
  const raw = typeof user.toObject === "function" ? user.toObject() : user;
  delete raw.passwordHash;
  return raw;
};

const includeWidgetVisitors = (req) =>
  String(req.query?.includeWidgetVisitors || "").trim().toLowerCase() ===
  "true";

const getWorkspaceContext = (req) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  const workspaceId = String(req.user?.workspaceId || "").trim();
  return { isSuperAdmin, workspaceId };
};

const ensureWorkspaceAccess = (req, res) => {
  const ctx = getWorkspaceContext(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    res.status(400).json({ message: "Workspace is required for this action" });
    return null;
  }
  return ctx;
};

// Create User (Admin)
export const createUser = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const actorRole = String(req.user?.role || "");
  const { name, email, password, role, departments } = req.body;

  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const normalizedRole = normalizeRole(role);

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

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: normalizedRole,
    departments: normalizeDepartments(departments),
    workspaceId: ctx.isSuperAdmin ? undefined : ctx.workspaceId,
    emailVerified: true,
  });

  return res.status(201).json({
    message: "User created successfully",
    data: sanitizeUser(user),
  });
});

// Get All Users (Admin)
export const getAllUsers = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = {};
  if (!includeWidgetVisitors(req)) {
    query.email = { $not: /@widget\.chatflex\.local$/i };
  }
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const users = await User.find(query).select("-passwordHash");

  if (users.length === 0 || !users) {
    return res.status(404).json({ message: "No users found" });
  }

  return res.status(200).json({
    message: "Users fetched successfully",
    data: users,
  });
});

// Get User By ID (Admin)
export const getUserById = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { id } = req.params;
  const query = { _id: id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const user = await User.findOne(query).select("-passwordHash");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "User fetched successfully",
    data: user,
  });
});

export const getCurrentUserProfile = catchAsyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const user = await User.findById(userId).select("-passwordHash");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "Profile fetched successfully",
    data: user,
  });
});

// Update User By ID (Admin)
export const updateUserById = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const actorRole = String(req.user?.role || "");
  const { id } = req.params;
  const updates = { ...(req.body || {}) };

  if (typeof updates.profilePictureUrl === "string") {
    updates.profilePictureUrl = updates.profilePictureUrl.trim();
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

  if (!ctx.isSuperAdmin) {
    delete updates.workspaceId;
  }

  const query = { _id: id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }

  const existingUser = await User.findOne(query);
  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!canManageExistingRole(actorRole, existingUser.role)) {
    return res.status(403).json({ message: "Insufficient permission for target user" });
  }

  if (typeof updates.role === "string" && !canAssignRole(actorRole, updates.role)) {
    return res.status(403).json({ message: "Insufficient permission for target role" });
  }

  const updatedUser = await User.findOneAndUpdate(query, updates, {
    new: true,
  }).select("-passwordHash");

  return res.status(200).json({
    message: "User updated successfully",
    data: updatedUser,
  });
});

export const updateCurrentUserProfile = catchAsyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { name, password, profilePictureUrl } = req.body || {};

  const updates = {};
  if (typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    updates.passwordHash = await bcrypt.hash(password, salt);
  }

  if (typeof profilePictureUrl === "string") {
    updates.profilePictureUrl = profilePictureUrl.trim();
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updates, {
    new: true,
  }).select("-passwordHash");

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname || ""));
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (String(file.mimetype || "").startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
});

export const uploadCurrentUserAvatar = catchAsyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  const userId = req.user?._id;
  const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePictureUrl: avatarUrl.trim() },
    { new: true },
  ).select("-passwordHash");

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "Profile picture updated successfully",
    data: updatedUser,
  });
});

export const deleteCurrentUserAvatar = catchAsyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePictureUrl: "" },
    { new: true },
  ).select("-passwordHash");

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    message: "Profile picture removed successfully",
    data: updatedUser,
  });
});

// Delete User By ID (Admin)
export const deleteUserById = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const actorRole = String(req.user?.role || "");
  const { id } = req.params;

  const query = { _id: id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }

  const existingUser = await User.findOne(query);
  if (!existingUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!canManageExistingRole(actorRole, existingUser.role)) {
    return res.status(403).json({ message: "Insufficient permission for target user" });
  }

  const deletedUser = await User.findOneAndDelete(query);

  return res.status(200).json({
    message: `User ${deletedUser.name} deleted successfully`,
  });
});

// Get User By Role (Admin)
export const getUserByRole = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { role } = req.params;

  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }

  const query = { role };
  if (!includeWidgetVisitors(req)) {
    query.email = { $not: /@widget\.chatflex\.local$/i };
  }
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const users = await User.find(query).select("-passwordHash");

  if (users.length === 0) {
    return res.status(404).json({ message: "No users found with this role" });
  }

  return res.status(200).json({
    message: "Users fetched successfully",
    data: users,
  });
});

// Assign Role to User (Admin)
export const assignRoleToUser = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const actorRole = String(req.user?.role || "");
  const { id } = req.params;
  const { role } = req.body;

  if (!id || !role) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided" });
  }
  const normalizedRole = normalizeRole(role);
  if (!VALID_ROLES.has(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role provided" });
  }
  if (!ctx.isSuperAdmin && normalizedRole === "super-admin") {
    return res
      .status(403)
      .json({ message: "Only super-admin can assign super-admin role" });
  }

  const query = { _id: id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const user = await User.findOne(query);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!canManageExistingRole(actorRole, user.role)) {
    return res.status(403).json({ message: "Insufficient permission for target user" });
  }

  if (!canAssignRole(actorRole, normalizedRole)) {
    return res.status(403).json({ message: "Insufficient permission for target role" });
  }

  user.role = normalizedRole;
  await user.save();

  return res.status(200).json({
    message: "Role assigned successfully",
    data: sanitizeUser(user),
  });
});
