import { onlineUserIds } from "../sockets/socketStore.js";
import { User } from "../models/user.model.js";

// Backward-compatible helper for controllers that still use the old utility.
export const getOnlineUserIdsForWorkspace = async (workspaceId = "") => {
  const ids = Array.from(onlineUserIds);
  if (!workspaceId || ids.length === 0) return ids;

  const users = await User.find({
    _id: { $in: ids },
    workspaceId,
  }).select("_id");

  return users.map((user) => String(user._id));
};
