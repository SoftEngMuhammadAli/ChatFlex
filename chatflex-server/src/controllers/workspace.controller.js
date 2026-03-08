const crypto = require("crypto");
const Workspace = require("../models/Workspace");
const User = require("../models/User");

const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.user.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    return res.json(workspace);
  } catch (error) {
    return next(error);
  }
};

const updateWorkspaceSettings = async (req, res, next) => {
  try {
    const allowedKeys = ["brandColor", "logoUrl", "welcomeMessage", "widgetPosition", "aiMode"];
    const settingsPatch = {};
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        settingsPatch[`settings.${key}`] = req.body[key];
      }
    }

    const workspace = await Workspace.findByIdAndUpdate(
      req.user.workspaceId,
      { $set: settingsPatch },
      { new: true }
    );

    return res.json(workspace);
  } catch (error) {
    return next(error);
  }
};

const listWorkspaceUsers = async (req, res, next) => {
  try {
    const users = await User.find({ workspaceId: req.user.workspaceId }).select("-passwordHash").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

const inviteUser = async (req, res, next) => {
  try {
    const { name, email, role = "agent" } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "name and email are required" });
    }

    if (!["admin", "agent", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "User with this email already exists" });
    }

    const tempPassword = crypto.randomBytes(8).toString("hex");
    const passwordHash = await User.hashPassword(tempPassword);

    const user = await User.create({
      workspaceId: req.user.workspaceId,
      name,
      email: email.toLowerCase(),
      role,
      passwordHash,
      status: "invited",
      invitedBy: req.user.id
    });

    return res.status(201).json({
      message: "User invited (email delivery to be integrated)",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      tempPassword
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getWorkspace,
  updateWorkspaceSettings,
  listWorkspaceUsers,
  inviteUser
};
