import { typingByThread } from "../socketStore.js";
import { toId, getThreadKey } from "../socketUtils.js";
import { emitTypingStatus } from "../socketEmitters.js";

export const handleTypingStart = (io, socket, { senderId, receiverId }) => {
  const socketUserId = toId(socket.userId);
  const requestedSenderId = toId(senderId || socketUserId);
  if (!socketUserId || requestedSenderId !== socketUserId) return;

  const normalizedSenderId = socketUserId;
  const normalizedReceiverId = toId(receiverId);
  const threadKey = getThreadKey(normalizedSenderId, normalizedReceiverId);

  if (!threadKey) return;

  if (!typingByThread.has(threadKey)) {
    typingByThread.set(threadKey, new Set());
  }
  const typers = typingByThread.get(threadKey);
  if (typers.has(normalizedSenderId)) return;

  typers.add(normalizedSenderId);
  emitTypingStatus({
    io,
    senderId: normalizedSenderId,
    receiverId: normalizedReceiverId,
    isTyping: true,
  });
};

export const handleTypingStop = (io, socket, { senderId, receiverId }) => {
  const socketUserId = toId(socket.userId);
  const requestedSenderId = toId(senderId || socketUserId);
  if (!socketUserId || requestedSenderId !== socketUserId) return;

  const normalizedSenderId = socketUserId;
  const normalizedReceiverId = toId(receiverId);
  const threadKey = getThreadKey(normalizedSenderId, normalizedReceiverId);

  if (!threadKey || !typingByThread.has(threadKey)) return;
  const typers = typingByThread.get(threadKey);
  if (!typers.has(normalizedSenderId)) return;

  typers.delete(normalizedSenderId);
  emitTypingStatus({
    io,
    senderId: normalizedSenderId,
    receiverId: normalizedReceiverId,
    isTyping: false,
  });

  if (typers.size === 0) {
    typingByThread.delete(threadKey);
  }
};
