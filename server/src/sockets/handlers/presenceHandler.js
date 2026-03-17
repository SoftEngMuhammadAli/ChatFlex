import { User } from "../../models/index.js";
import { users, onlineUserIds } from "../socketStore.js";
import { toId, toPresenceStatus } from "../socketUtils.js";
import {
  emitPresenceSnapshot,
  emitUnreadCounts,
  clearTypingForUser,
} from "../socketEmitters.js";
import jwt from "jsonwebtoken";

const ACCESS_SECRETS = [
  process.env.JWT_ACCESS_SECRET,
  process.env.JWT_SECRET,
].filter(Boolean);

const verifySocketToken = (token) => {
  for (const secret of ACCESS_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch {
      continue;
    }
  }
  throw new Error("Invalid or expired socket token");
};

const emitWorkspaceEvent = (io, workspaceId, eventName, payload) => {
  const normalizedWorkspaceId = toId(workspaceId);
  if (normalizedWorkspaceId) {
    io.to(`workspace:${normalizedWorkspaceId}`).emit(eventName, payload);
    return;
  }
  io.emit(eventName, payload);
};

const getOnlineUsersForWorkspace = async (workspaceId = "") => {
  const ids = Array.from(onlineUserIds);
  if (!workspaceId) return ids;
  if (ids.length === 0) return [];
  const users = await User.find({
    _id: { $in: ids },
    workspaceId,
  }).select("_id");
  return users.map((user) => toId(user._id));
};

const resolveJoinUser = async (payload = {}) => {
  const token = String(payload?.token || "").trim();

  if (token && ACCESS_SECRETS.length > 0) {
    const decoded = verifySocketToken(token);
    const user = await User.findById(decoded.id).select(
      "_id role status workspaceId email",
    );
    if (!user) {
      throw new Error("Socket join failed: user not found");
    }
    return user;
  }

  const normalizedUserId = toId(payload?.userId);
  if (!normalizedUserId) {
    throw new Error("Invalid join payload: token or userId is required");
  }

  const user = await User.findById(normalizedUserId).select(
    "_id role status workspaceId email",
  );
  if (!user) {
    throw new Error("Socket join failed: user not found");
  }

  // Unauthenticated joins are allowed only for widget visitor shadow users.
  const isWidgetVisitor =
    String(user.role || "") === "viewer" &&
    /@widget\.chatflex\.local$/i.test(String(user.email || "").trim());
  if (!isWidgetVisitor) {
    throw new Error("Invalid join payload: authenticated join required");
  }

  const requestedWorkspaceId = toId(payload?.workspaceId);
  const userWorkspaceId = toId(user.workspaceId);
  if (requestedWorkspaceId && userWorkspaceId && requestedWorkspaceId !== userWorkspaceId) {
    throw new Error("Invalid join payload: workspace mismatch");
  }

  return user;
};

export const handleJoin = async (io, socket, payload) => {
  try {
    const user = await resolveJoinUser(payload);
    const normalizedUserId = toId(user._id);
    const normalizedWorkspaceId = toId(user.workspaceId);

    socket.userId = normalizedUserId;
    socket.workspaceId = normalizedWorkspaceId;
    socket.join(normalizedUserId);
    if (normalizedWorkspaceId) {
      socket.join(`workspace:${normalizedWorkspaceId}`);
    }

    if (!users.has(normalizedUserId)) {
      users.set(normalizedUserId, new Set());
    }

    users.get(normalizedUserId).add(socket.id);
    onlineUserIds.add(normalizedUserId);

    await User.findByIdAndUpdate(user._id, {
      status: "online",
    });

    emitWorkspaceEvent(io, normalizedWorkspaceId, "user_status_change", {
      userId: normalizedUserId,
      status: "active",
    });
    emitWorkspaceEvent(io, normalizedWorkspaceId, "online_users_list", await getOnlineUsersForWorkspace(normalizedWorkspaceId));
    await emitPresenceSnapshot(io, { workspaceId: normalizedWorkspaceId });
    await emitUnreadCounts({
      io,
      userId: normalizedUserId,
      workspaceId: normalizedWorkspaceId,
    });
    socket.emit("join_success", {
      userId: normalizedUserId,
      workspaceId: normalizedWorkspaceId,
    });
  } catch (error) {
    console.error("Socket Join Error:", error.message);
    socket.emit("join_error", { error: error.message });
    socket.emit("message_error", { error: error.message });
  }
};

export const handleSetPresenceStatus = async (
  io,
  socket,
  { userId, status },
) => {
  const socketUserId = toId(socket.userId);
  const socketWorkspaceId = toId(socket.workspaceId);
  const normalizedUserId = toId(userId || socketUserId);
  if (!socketUserId || normalizedUserId !== socketUserId) return;
  const normalizedStatus =
    status === "busy" || status === "offline" || status === "online"
      ? status
      : null;

  if (!normalizedUserId || !normalizedStatus) return;

  await User.findByIdAndUpdate(normalizedUserId, {
    status: normalizedStatus,
  }).catch(() => {});

  emitWorkspaceEvent(io, socketWorkspaceId, "user_status_change", {
    userId: normalizedUserId,
    status: toPresenceStatus(
      normalizedStatus,
      onlineUserIds.has(normalizedUserId),
    ),
  });
  emitPresenceSnapshot(io, { workspaceId: socketWorkspaceId }).catch(() => {});
};

export const handleDisconnect = (io, socket) => {
  const { userId } = socket;
  const workspaceId = toId(socket.workspaceId);
  if (!userId || !users.has(userId)) return;

  const userSockets = users.get(userId);
  userSockets.delete(socket.id);

  if (userSockets.size === 0) {
    users.delete(userId);
    onlineUserIds.delete(userId);
    clearTypingForUser({ io, userId });

    User.findByIdAndUpdate(userId, { status: "offline" }).catch(() => {});

    emitWorkspaceEvent(io, workspaceId, "user_status_change", {
      userId,
      status: "inactive",
    });
    getOnlineUsersForWorkspace(workspaceId)
      .then((workspaceOnlineUsers) =>
        emitWorkspaceEvent(io, workspaceId, "online_users_list", workspaceOnlineUsers),
      )
      .catch(() => {});
    emitPresenceSnapshot(io, { workspaceId }).catch(() => {});
  }
};
