import { User } from "../models/user.model.js";
import { RoutingState } from "../models/routingState.model.js";
import { getOnlineUserIdsForWorkspace } from "../utils/onlineUsers.js";

const normalizeDepartment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeAgentDepartments = (departments = []) =>
  (Array.isArray(departments) ? departments : [])
    .map((entry) => normalizeDepartment(entry))
    .filter(Boolean);

const filterAgentsByDepartment = (agents, department = "") => {
  const normalizedDepartment = normalizeDepartment(department);
  if (!normalizedDepartment) return agents;

  return agents.filter((agent) =>
    normalizeAgentDepartments(agent?.departments).includes(normalizedDepartment),
  );
};

const getCandidateAgents = async ({
  workspaceId,
  onlineOnly = false,
  includeBusy = false,
} = {}) => {
  if (!workspaceId) return [];

  const query = {
    workspaceId,
    role: { $in: ["owner", "admin", "agent"] },
    ...(includeBusy ? {} : { status: { $ne: "busy" } }),
  };

  let candidates = await User.find(query)
    .select("_id status departments updatedAt")
    .sort({ _id: 1 })
    .lean();

  if (!onlineOnly) return candidates;

  const onlineIds = new Set(await getOnlineUserIdsForWorkspace(workspaceId));
  candidates = candidates.filter((item) =>
    onlineIds.has(String(item?._id || "")),
  );

  return candidates;
};

const pickFromRotatingList = async ({ workspaceId, department, candidates }) => {
  if (!workspaceId || !Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const normalizedDepartment = normalizeDepartment(department) || "__all__";

  const state = await RoutingState.findOneAndUpdate(
    { workspaceId, department: normalizedDepartment },
    { $setOnInsert: { nextIndex: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const nextIndex = Number(state?.nextIndex || 0);
  const safeIndex = nextIndex % candidates.length;
  const selected = candidates[safeIndex] || candidates[0];

  state.nextIndex = (safeIndex + 1) % candidates.length;
  state.lastAssignedAgentId = selected?._id || null;
  await state.save();

  return selected;
};

export const pickRoundRobinAgent = async ({
  workspaceId,
  department = "",
  preferOnline = true,
} = {}) => {
  if (!workspaceId) return null;

  const onlineCandidates = preferOnline
    ? await getCandidateAgents({ workspaceId, onlineOnly: true })
    : [];
  const allCandidates = await getCandidateAgents({
    workspaceId,
    onlineOnly: false,
  });

  const onlineByDepartment = filterAgentsByDepartment(
    onlineCandidates,
    department,
  );
  if (onlineByDepartment.length > 0) {
    return pickFromRotatingList({
      workspaceId,
      department,
      candidates: onlineByDepartment,
    });
  }

  const allByDepartment = filterAgentsByDepartment(allCandidates, department);
  if (allByDepartment.length > 0) {
    return pickFromRotatingList({
      workspaceId,
      department,
      candidates: allByDepartment,
    });
  }

  if (allCandidates.length > 0) {
    return pickFromRotatingList({
      workspaceId,
      department: "__all__",
      candidates: allCandidates,
    });
  }

  return null;
};

export const getRoundRobinSnapshot = async ({ workspaceId, department }) => {
  if (!workspaceId) return null;
  const normalizedDepartment = normalizeDepartment(department) || "__all__";
  return RoutingState.findOne({
    workspaceId,
    department: normalizedDepartment,
  })
    .select("workspaceId department nextIndex lastAssignedAgentId updatedAt")
    .lean();
};
