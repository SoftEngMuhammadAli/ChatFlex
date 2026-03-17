import mongoose from "mongoose";

export const toId = (value) => (value ? String(value) : "");
export const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// unique key for each thread to identify participants
export const getThreadKey = (a, b) => {
  const first = toId(a);
  const second = toId(b);
  if (!first || !second) return "";
  return [first, second].sort().join(":");
};

// raw status to presence status
export const toPresenceStatus = (rawStatus, isOnline) => {
  if (rawStatus === "busy") return "busy";
  return isOnline ? "active" : "inactive";
};

// normalizing sender role
export const normalizeSenderRole = (role) => {
  if (role === "owner") return "owner";
  if (role === "admin") return "agent";
  return "agent";
};
