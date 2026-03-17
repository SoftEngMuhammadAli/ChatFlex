import jwt from "jsonwebtoken";
import { ImpersonationSession, User, Workspace } from "../models/index.js";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;

const getImpersonationSessionId = (decoded) =>
  String(
    decoded?.impersonationSessionId ||
      decoded?.impersonation?.sessionId ||
      "",
  ).trim();

async function checkAuth(req, res, next) {
  let token;

  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith("Bearer ")) {
    token = authorization.split("Bearer ")[1];
  }

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized: No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid token: user not found" });
    }

    req.auth = {
      tokenPayload: decoded,
      impersonation: null,
    };

    const impersonationSessionId = getImpersonationSessionId(decoded);
    if (impersonationSessionId) {
      const impersonationSession = await ImpersonationSession.findOne({
        _id: impersonationSessionId,
        targetUserId: user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      })
        .select("superAdminId workspaceId expiresAt")
        .lean();

      if (!impersonationSession) {
        return res.status(401).json({
          message: "Invalid or expired impersonation session",
        });
      }

      const superAdmin = await User.findOne({
        _id: impersonationSession.superAdminId,
        role: "super-admin",
      })
        .select("_id name email role")
        .lean();

      if (!superAdmin) {
        return res.status(401).json({
          message: "Impersonation session is no longer valid",
        });
      }

      req.auth.impersonation = {
        sessionId: String(impersonationSession._id || impersonationSessionId),
        superAdminId: String(superAdmin._id || ""),
        superAdminName: String(superAdmin.name || ""),
        superAdminEmail: String(superAdmin.email || ""),
        workspaceId: String(impersonationSession.workspaceId || ""),
      };
    }

    const userRole = String(user.role || "").toLowerCase();
    const isSuperAdmin = userRole === "super-admin";
    const workspaceId = String(user.workspaceId || "").trim();
    const canBypassWorkspaceSuspension =
      isSuperAdmin || Boolean(req.auth?.impersonation?.superAdminId);

    if (!canBypassWorkspaceSuspension && workspaceId) {
      const workspace = await Workspace.findById(workspaceId)
        .select("status suspension")
        .lean();

      const isSuspended =
        String(workspace?.status || "").toLowerCase() === "suspended" ||
        workspace?.suspension?.isSuspended === true;

      if (isSuspended) {
        const reason = String(workspace?.suspension?.reason || "").trim();
        return res.status(403).json({
          message: reason
            ? `Workspace is suspended: ${reason}`
            : "Workspace is suspended. Contact support.",
          workspaceSuspended: true,
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Session Expired" });
    }
    return res
      .status(401)
      .json({ message: "Invalid Token", error: error.message });
  }
}

function authorizeRoles(...rolesAuthorization) {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          message: "Unauthorized: No user found in request",
        });
      }

      if (!rolesAuthorization.includes(user.role)) {
        return res.status(403).json({
          errorType: "Authorization Error",
          details: `Access denied for role '${user.role}'.`,
          allowedOnlyFor: rolesAuthorization,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  };
}

export { checkAuth, authorizeRoles };
