import mongoose from "mongoose";
import { Message, User } from "../models/index.js";
import { onlineUserIds, typingByThread } from "./socketStore.js";
import {
  toId,
  isObjectId,
  getThreadKey,
  toPresenceStatus,
} from "./socketUtils.js";

export const emitUnreadCounts = async ({ io, userId, workspaceId = "" }) => {
  const normalizedUserId = toId(userId);
  if (!isObjectId(normalizedUserId)) return;

  const receiverObjectId = new mongoose.Types.ObjectId(normalizedUserId);
  const unreadRows = await Message.aggregate([
    {
      $match: {
        receiverId: receiverObjectId,
        readAt: null,
        ...(workspaceId && isObjectId(workspaceId)
          ? { workspaceId: new mongoose.Types.ObjectId(workspaceId) }
          : {}),
      },
    },
    {
      $group: {
        _id: "$senderId",
        count: { $sum: 1 },
      },
    },
  ]);

  const bySender = {};
  let total = 0;
  for (const row of unreadRows) {
    const senderId = toId(row?._id);
    if (!senderId) continue;
    const count = Number(row?.count || 0);
    bySender[senderId] = count;
    total += count;
  }

  io.to(normalizedUserId).emit("unread_counts", {
    userId: normalizedUserId,
    total,
    bySender,
  });
};

export const emitPresenceSnapshot = async (
  io,
  { workspaceId = "", targetUserId = "" } = {},
) => {
  const query = {};
  if (workspaceId && isObjectId(workspaceId)) {
    query.workspaceId = workspaceId;
  }

  const users = await User.find(query).select("_id role status").lean();
  const payload = users.map((user) => {
    const userId = toId(user._id);
    return {
      userId,
      role: user.role,
      status: toPresenceStatus(user.status, onlineUserIds.has(userId)),
    };
  });

  if (targetUserId) {
    io.to(targetUserId).emit("presence_snapshot", payload);
    return;
  }

  if (workspaceId && isObjectId(workspaceId)) {
    io.to(`workspace:${workspaceId}`).emit("presence_snapshot", payload);
    return;
  }

  io.emit("presence_snapshot", payload);
};

export const emitTypingStatus = ({ io, senderId, receiverId, isTyping }) => {
  const normalizedSenderId = toId(senderId);
  const normalizedReceiverId = toId(receiverId);
  const threadKey = getThreadKey(normalizedSenderId, normalizedReceiverId);
  if (!threadKey) return;

  const payload = {
    threadKey,
    userId: normalizedSenderId,
    participants: [normalizedSenderId, normalizedReceiverId],
    isTyping,
  };

  io.to(normalizedSenderId).emit("typing_status_change", payload);
  io.to(normalizedReceiverId).emit("typing_status_change", payload);
};

export const clearTypingForUser = ({ io, userId }) => {
  const normalizedUserId = toId(userId);
  if (!normalizedUserId) return;

  for (const [threadKey, typers] of typingByThread.entries()) {
    if (!typers.has(normalizedUserId)) continue;
    typers.delete(normalizedUserId);

    const [participantA = "", participantB = ""] = threadKey.split(":");
    const receiverId =
      participantA === normalizedUserId ? participantB : participantA;

    emitTypingStatus({
      io,
      senderId: normalizedUserId,
      receiverId,
      isTyping: false,
    });

    if (typers.size === 0) {
      typingByThread.delete(threadKey);
    }
  }
};
