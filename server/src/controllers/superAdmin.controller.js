import mongoose from "mongoose";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import {
  AppConfig,
  Billing,
  Conversation,
  ImpersonationSession,
  Message,
  Usage,
  User,
  Workspace,
} from "../models/index.js";
import { generateToken } from "../utils/token.utils.js";

const HOURS_1_MS = 60 * 60 * 1000;
const HOURS_24_MS = 24 * HOURS_1_MS;
const HOURS_48_MS = 48 * HOURS_1_MS;

const normalizeText = (value) => String(value || "").trim();

const parsePositiveInt = (value, fallback, min = 1, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
};

const toObjectId = (value) => {
  const normalized = normalizeText(value);
  return mongoose.Types.ObjectId.isValid(normalized) ? normalized : "";
};

const getWorkspaceOwnerMap = async (workspaces = []) => {
  const ownerIds = Array.from(
    new Set(
      workspaces
        .map((workspace) => String(workspace?.ownerId?._id || workspace?.ownerId || ""))
        .filter(Boolean),
    ),
  );
  if (ownerIds.length === 0) return new Map();

  const owners = await User.find({ _id: { $in: ownerIds } })
    .select("_id name email")
    .lean();
  return new Map(owners.map((owner) => [String(owner._id), owner]));
};

const buildWorkspaceMetrics = async (workspaceIds = []) => {
  if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) {
    return {
      usersByWorkspace: new Map(),
      conversationsByWorkspace: new Map(),
      messagesByWorkspace: new Map(),
      usageByWorkspace: new Map(),
    };
  }

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * HOURS_24_MS);

  const [userAgg, conversationAgg, messageAgg, usageAgg] = await Promise.all([
    User.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      {
        $group: {
          _id: "$workspaceId",
          totalUsers: { $sum: 1 },
          agents: {
            $sum: {
              $cond: [{ $eq: ["$role", "agent"] }, 1, 0],
            },
          },
          admins: {
            $sum: {
              $cond: [{ $eq: ["$role", "admin"] }, 1, 0],
            },
          },
          owners: {
            $sum: {
              $cond: [{ $eq: ["$role", "owner"] }, 1, 0],
            },
          },
        },
      },
    ]),
    Conversation.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      {
        $group: {
          _id: "$workspaceId",
          totalConversations: { $sum: 1 },
          openConversations: {
            $sum: {
              $cond: [{ $in: ["$status", ["open", "pending", "escalated"]] }, 1, 0],
            },
          },
          resolvedConversations: {
            $sum: {
              $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
            },
          },
          conversations30d: {
            $sum: {
              $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0],
            },
          },
        },
      },
    ]),
    Message.aggregate([
      {
        $match: {
          workspaceId: { $in: workspaceIds },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$workspaceId",
          messages30d: { $sum: 1 },
        },
      },
    ]),
    Usage.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      {
        $group: {
          _id: "$workspaceId",
          aiTokensUsed: { $sum: "$aiTokensUsed" },
          conversationsThisMonth: { $sum: "$conversationsThisMonth" },
        },
      },
    ]),
  ]);

  return {
    usersByWorkspace: new Map(userAgg.map((row) => [String(row._id), row])),
    conversationsByWorkspace: new Map(
      conversationAgg.map((row) => [String(row._id), row]),
    ),
    messagesByWorkspace: new Map(messageAgg.map((row) => [String(row._id), row])),
    usageByWorkspace: new Map(usageAgg.map((row) => [String(row._id), row])),
  };
};

const getBillingMapForOwners = async (ownersByWorkspace = new Map()) => {
  const ownerIds = Array.from(ownersByWorkspace.values()).map((owner) =>
    String(owner?._id || ""),
  );
  const uniqueOwnerIds = Array.from(new Set(ownerIds.filter(Boolean)));
  if (uniqueOwnerIds.length === 0) return new Map();

  const billingDocs = await Billing.find({ user: { $in: uniqueOwnerIds } })
    .populate("currentPlan", "name")
    .select("user status nextBillingDate trialEndsAt trialStartedAt currentPlan")
    .lean();
  return new Map(billingDocs.map((doc) => [String(doc.user), doc]));
};

const buildWorkspacePayloads = async (workspaces = []) => {
  const workspaceIds = workspaces.map((workspace) => workspace._id);
  const ownersByWorkspace = await getWorkspaceOwnerMap(workspaces);
  const ownerByWorkspaceId = new Map(
    workspaces.map((workspace) => [
      String(workspace._id),
      ownersByWorkspace.get(String(workspace.ownerId?._id || workspace.ownerId || "")) || null,
    ]),
  );

  const [metrics, billingByOwner] = await Promise.all([
    buildWorkspaceMetrics(workspaceIds),
    getBillingMapForOwners(ownerByWorkspaceId),
  ]);

  return workspaces.map((workspace) => {
    const workspaceId = String(workspace._id);
    const owner = ownerByWorkspaceId.get(workspaceId) || null;
    const ownerBilling = billingByOwner.get(String(owner?._id || "")) || null;

    const userMetrics = metrics.usersByWorkspace.get(workspaceId) || {};
    const conversationMetrics =
      metrics.conversationsByWorkspace.get(workspaceId) || {};
    const messageMetrics = metrics.messagesByWorkspace.get(workspaceId) || {};
    const usageMetrics = metrics.usageByWorkspace.get(workspaceId) || {};

    return {
      workspaceId,
      name: String(workspace.name || "Workspace"),
      plan: String(workspace.plan || "starter"),
      status: String(workspace.status || "active"),
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      owner: owner
        ? {
            id: String(owner._id || ""),
            name: String(owner.name || ""),
            email: String(owner.email || ""),
          }
        : null,
      team: {
        totalUsers: Number(userMetrics.totalUsers || 0),
        agents: Number(userMetrics.agents || 0),
        admins: Number(userMetrics.admins || 0),
        owners: Number(userMetrics.owners || 0),
      },
      conversations: {
        total: Number(conversationMetrics.totalConversations || 0),
        open: Number(conversationMetrics.openConversations || 0),
        resolved: Number(conversationMetrics.resolvedConversations || 0),
        last30d: Number(conversationMetrics.conversations30d || 0),
      },
      messages: {
        last30d: Number(messageMetrics.messages30d || 0),
      },
      usage: {
        aiTokensUsed: Number(usageMetrics.aiTokensUsed || 0),
        conversationsThisMonth: Number(usageMetrics.conversationsThisMonth || 0),
      },
      billing: ownerBilling
        ? {
            status: String(ownerBilling.status || ""),
            planName: String(ownerBilling?.currentPlan?.name || ""),
            nextBillingDate: ownerBilling.nextBillingDate || null,
            trialStartedAt: ownerBilling.trialStartedAt || null,
            trialEndsAt: ownerBilling.trialEndsAt || null,
          }
        : null,
      abuseMonitoring: workspace.abuseMonitoring || {
        score: 0,
        level: "low",
        flags: [],
        lastScannedAt: null,
      },
      suspension: workspace.suspension || {
        isSuspended: false,
        reason: "",
        suspendedAt: null,
        suspendedBy: null,
        unsuspendedAt: null,
      },
    };
  });
};

const getOrCreateAppConfig = async () => {
  let config = await AppConfig.findOne({});
  if (config) return config;
  config = await AppConfig.create({});
  return config;
};

const calculateAbuseSignals = async (workspaceId) => {
  const now = Date.now();
  const oneHourAgo = new Date(now - HOURS_1_MS);
  const twentyFourHoursAgo = new Date(now - HOURS_24_MS);
  const fortyEightHoursAgo = new Date(now - HOURS_48_MS);

  const [
    messagesLastHour,
    conversationsLastHour,
    staleOpenConversations,
    recentVisitorMessages,
    visitorOnlyAgg,
  ] = await Promise.all([
    Message.countDocuments({
      workspaceId,
      createdAt: { $gte: oneHourAgo },
    }),
    Conversation.countDocuments({
      workspaceId,
      createdAt: { $gte: oneHourAgo },
    }),
    Conversation.countDocuments({
      workspaceId,
      status: { $in: ["open", "pending", "escalated"] },
      updatedAt: { $lte: fortyEightHoursAgo },
    }),
    Message.find({
      workspaceId,
      senderType: "visitor",
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .select("content")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean(),
    Message.aggregate([
      {
        $match: {
          workspaceId,
          createdAt: { $gte: twentyFourHoursAgo },
        },
      },
      {
        $group: {
          _id: "$conversationId",
          visitorMessages: {
            $sum: {
              $cond: [{ $eq: ["$senderType", "visitor"] }, 1, 0],
            },
          },
          agentMessages: {
            $sum: {
              $cond: [{ $in: ["$senderType", ["agent", "owner", "admin"]] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const spamRegex =
    /\b(casino|viagra|adult|crypto giveaway|free money|loan approved)\b/i;
  const spamLikeMessages = recentVisitorMessages.filter((entry) =>
    spamRegex.test(String(entry?.content || "")),
  ).length;

  const visitorOnlyConversations = visitorOnlyAgg.filter(
    (item) =>
      Number(item.visitorMessages || 0) >= 5 &&
      Number(item.agentMessages || 0) === 0,
  ).length;

  let score = 0;
  const flags = [];

  if (messagesLastHour >= 400) {
    score += 30;
    flags.push("high_message_burst_1h");
  } else if (messagesLastHour >= 150) {
    score += 15;
    flags.push("elevated_message_volume_1h");
  }

  if (conversationsLastHour >= 120) {
    score += 25;
    flags.push("high_conversation_burst_1h");
  } else if (conversationsLastHour >= 50) {
    score += 12;
    flags.push("elevated_conversation_volume_1h");
  }

  if (staleOpenConversations >= 120) {
    score += 20;
    flags.push("large_stale_open_backlog");
  } else if (staleOpenConversations >= 40) {
    score += 10;
    flags.push("stale_open_backlog");
  }

  if (visitorOnlyConversations >= 50) {
    score += 20;
    flags.push("many_unanswered_visitor_threads");
  } else if (visitorOnlyConversations >= 20) {
    score += 10;
    flags.push("unanswered_visitor_threads");
  }

  if (spamLikeMessages >= 40) {
    score += 25;
    flags.push("spam_keyword_detected");
  } else if (spamLikeMessages >= 15) {
    score += 12;
    flags.push("possible_spam_activity");
  }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  return {
    score,
    level,
    flags,
    signals: {
      messagesLastHour,
      conversationsLastHour,
      staleOpenConversations,
      visitorOnlyConversations,
      spamLikeMessages,
    },
  };
};

export const getWorkspaceMonitoring = catchAsyncHandler(async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1, 1, 5000);
  const limit = parsePositiveInt(req.query.limit, 20, 1, 200);
  const search = normalizeText(req.query.search).toLowerCase();
  const statusFilter = normalizeText(req.query.status).toLowerCase();
  const flaggedOnly = String(req.query.flagged || "").toLowerCase() === "true";

  const query = {};
  if (statusFilter && ["active", "suspended"].includes(statusFilter)) {
    query.status = statusFilter;
  }
  if (flaggedOnly) {
    query["abuseMonitoring.score"] = { $gte: 60 };
  }

  const workspaces = await Workspace.find(query)
    .select(
      "_id name ownerId plan status createdAt updatedAt suspension abuseMonitoring",
    )
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  let payload = await buildWorkspacePayloads(workspaces);
  if (search) {
    payload = payload.filter((item) => {
      const workspaceName = String(item.name || "").toLowerCase();
      const ownerName = String(item.owner?.name || "").toLowerCase();
      const ownerEmail = String(item.owner?.email || "").toLowerCase();
      return (
        workspaceName.includes(search) ||
        ownerName.includes(search) ||
        ownerEmail.includes(search)
      );
    });
  }

  const total = payload.length;
  const start = (page - 1) * limit;
  const end = start + limit;

  return res.status(200).json({
    data: payload.slice(start, end),
    meta: {
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

export const scanWorkspaceAbuse = catchAsyncHandler(async (req, res) => {
  const workspaceId = toObjectId(req.params.workspaceId);
  if (!workspaceId) {
    return res.status(400).json({ message: "Invalid workspaceId" });
  }

  const workspace = await Workspace.findById(workspaceId).select("_id name");
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  const result = await calculateAbuseSignals(workspaceId);

  await Workspace.findByIdAndUpdate(workspaceId, {
    abuseMonitoring: {
      score: result.score,
      level: result.level,
      flags: result.flags,
      lastScannedAt: new Date(),
    },
  });

  return res.status(200).json({
    data: {
      workspaceId,
      workspaceName: workspace.name,
      ...result,
      scannedAt: new Date().toISOString(),
    },
  });
});

export const updateWorkspaceSuspension = catchAsyncHandler(async (req, res) => {
  const workspaceId = toObjectId(req.params.workspaceId);
  if (!workspaceId) {
    return res.status(400).json({ message: "Invalid workspaceId" });
  }

  const action = normalizeText(req.body?.action).toLowerCase();
  if (!["suspend", "unsuspend"].includes(action)) {
    return res.status(400).json({ message: "action must be suspend or unsuspend" });
  }

  const workspace = await Workspace.findById(workspaceId).select(
    "_id ownerId status suspension",
  );
  if (!workspace) {
    return res.status(404).json({ message: "Workspace not found" });
  }

  if (action === "suspend") {
    const reason =
      normalizeText(req.body?.reason) || "Suspended by super-admin control";
    workspace.status = "suspended";
    workspace.suspension = {
      isSuspended: true,
      reason,
      suspendedAt: new Date(),
      suspendedBy: req.user?._id || null,
      unsuspendedAt: null,
    };
    await workspace.save();

    await Billing.updateMany(
      { user: workspace.ownerId },
      {
        status: "suspended",
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
    );

    return res.status(200).json({
      data: {
        workspaceId,
        status: "suspended",
        reason,
      },
    });
  }

  workspace.status = "active";
  workspace.suspension = {
    isSuspended: false,
    reason: "",
    suspendedAt: null,
    suspendedBy: null,
    unsuspendedAt: new Date(),
  };
  await workspace.save();

  await Billing.updateMany(
    { user: workspace.ownerId, status: "suspended" },
    {
      status: "pending_payment",
      suspendedAt: null,
      suspensionReason: "",
    },
  );

  return res.status(200).json({
    data: {
      workspaceId,
      status: "active",
    },
  });
});

export const getGlobalModelConfig = catchAsyncHandler(async (_req, res) => {
  const config = await getOrCreateAppConfig();
  return res.status(200).json({
    data: config.globalModelConfig || {
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 1024,
      systemPrompt: "",
    },
  });
});

export const updateGlobalModelConfig = catchAsyncHandler(async (req, res) => {
  const config = await getOrCreateAppConfig();

  const model = normalizeText(req.body?.model) || "gpt-4o-mini";
  const temperature = Number(req.body?.temperature);
  const maxTokens = Number(req.body?.maxTokens);
  const systemPrompt = String(req.body?.systemPrompt || "");

  config.globalModelConfig = {
    model,
    temperature: Number.isFinite(temperature)
      ? Math.max(0, Math.min(2, temperature))
      : 0.3,
    maxTokens: Number.isFinite(maxTokens)
      ? Math.max(64, Math.min(16384, Math.trunc(maxTokens)))
      : 1024,
    systemPrompt: systemPrompt.trim(),
  };

  await config.save();
  return res.status(200).json({
    data: config.globalModelConfig,
  });
});

const resolveTargetUserForImpersonation = async ({ workspaceId, userId }) => {
  if (userId) {
    const query = { _id: userId, role: { $ne: "super-admin" } };
    if (workspaceId) {
      query.workspaceId = workspaceId;
    }
    return User.findOne(query)
      .select("_id name email role workspaceId emailVerified profilePictureUrl")
      .lean();
  }

  if (!workspaceId) return null;

  const owner = await User.findOne({
    workspaceId,
    role: "owner",
  })
    .select("_id name email role workspaceId emailVerified profilePictureUrl")
    .lean();
  if (owner) return owner;

  const fallback = await User.findOne({
    workspaceId,
    role: { $in: ["admin", "agent"] },
  })
    .sort({ role: 1, createdAt: 1 })
    .select("_id name email role workspaceId emailVerified profilePictureUrl")
    .lean();
  return fallback || null;
};

export const startWorkspaceImpersonation = catchAsyncHandler(async (req, res) => {
  const requestedWorkspaceId = toObjectId(req.body?.workspaceId);
  const requestedUserId = toObjectId(req.body?.userId);
  const reason = normalizeText(req.body?.reason);

  const targetUser = await resolveTargetUserForImpersonation({
    workspaceId: requestedWorkspaceId,
    userId: requestedUserId,
  });
  if (!targetUser) {
    return res.status(404).json({
      message: "No eligible target user found for impersonation",
    });
  }

  const workspaceId = String(targetUser.workspaceId || requestedWorkspaceId || "");
  if (!workspaceId) {
    return res.status(400).json({
      message: "Target user is not linked to a workspace",
    });
  }

  const workspace = await Workspace.findById(workspaceId).select("name");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const session = await ImpersonationSession.create({
    superAdminId: req.user?._id,
    targetUserId: targetUser._id,
    workspaceId,
    reason,
    expiresAt,
    ipAddress: String(
      req.headers["x-forwarded-for"] || req.ip || req.socket?.remoteAddress || "",
    )
      .split(",")[0]
      .trim(),
    userAgent: String(req.headers["user-agent"] || "").trim(),
  });

  const token = generateToken(
    { _id: targetUser._id, role: targetUser.role },
    {
      impersonationSessionId: String(session._id),
    },
  );

  return res.status(200).json({
    data: {
      token,
      user: {
        id: String(targetUser._id),
        _id: String(targetUser._id),
        name: String(targetUser.name || ""),
        email: String(targetUser.email || ""),
        role: String(targetUser.role || ""),
        workspaceId,
        workspaceName: String(workspace?.name || "Workspace"),
        emailVerified: targetUser.emailVerified === true,
        profilePictureUrl: String(targetUser.profilePictureUrl || "").trim(),
        isImpersonating: true,
        impersonationSessionId: String(session._id),
        impersonatedBy: {
          id: String(req.user?._id || ""),
          name: String(req.user?.name || ""),
          email: String(req.user?.email || ""),
        },
      },
      session: {
        id: String(session._id),
        expiresAt: session.expiresAt,
      },
    },
  });
});

export const stopWorkspaceImpersonation = catchAsyncHandler(async (req, res) => {
  const sessionId = String(req.auth?.impersonation?.sessionId || "").trim();
  const superAdminId = String(req.auth?.impersonation?.superAdminId || "").trim();

  if (!sessionId || !superAdminId) {
    return res.status(400).json({
      message: "No active impersonation session found",
    });
  }

  await ImpersonationSession.findByIdAndUpdate(sessionId, {
    revokedAt: new Date(),
    revokedBy: superAdminId,
  });

  return res.status(200).json({
    message: "Impersonation session stopped",
  });
});
