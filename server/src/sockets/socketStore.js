// userId -> Set(socketId)
export const users = new Map();
// Set(userId)
export const onlineUserIds = new Set();
// threadKey -> Set(userId)
export const typingByThread = new Map();
