import { catchAsyncHandler } from "../middleware/error.middleware.js";
import { Conversation, Message, Usage } from "../models/index.js";
import { User } from "../models/user.model.js";

const getWorkspaceContext = (req) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  const workspaceId = String(req.user?.workspaceId || "").trim();
  return { isSuperAdmin, workspaceId };
};

const ensureWorkspaceAccess = (req, res) => {
  const ctx = getWorkspaceContext(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    res.status(400).json({ message: "Workspace is required for analytics" });
    return null;
  }
  return ctx;
};

const parseDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const toCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const getDateRange = (query = {}) => {
  const days = Math.max(1, Math.min(Number(query.days) || 30, 366));
  const requestedStart = parseDate(query.startDate || query.from);
  const requestedEnd = parseDate(query.endDate || query.to);

  let start = requestedStart;
  let end = requestedEnd;

  if (!start && !end) {
    end = new Date();
    start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
  } else if (start && !end) {
    end = new Date(start);
    end.setDate(start.getDate() + (days - 1));
  } else if (!start && end) {
    start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  const diffDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime() + 1) / (24 * 60 * 60 * 1000)),
  );

  return { start, end, days: diffDays };
};

const buildWorkspaceScope = (ctx) =>
  ctx.isSuperAdmin ? {} : { workspaceId: ctx.workspaceId };

const getResolutionSeconds = (conversation) => {
  const createdAt = new Date(conversation?.createdAt || 0).getTime();
  if (!Number.isFinite(createdAt) || createdAt <= 0) return 0;

  const resolvedAtRaw =
    conversation?.metadata?.resolvedAt ||
    (conversation?.status === "resolved" ? conversation?.updatedAt : null);
  const resolvedAt = new Date(resolvedAtRaw || 0).getTime();
  if (!Number.isFinite(resolvedAt) || resolvedAt <= createdAt) return 0;

  return Math.round((resolvedAt - createdAt) / 1000);
};

const buildAgentPerformance = async ({ ctx, conversations, messages }) => {
  if (!Array.isArray(conversations) || conversations.length === 0) return [];

  const metricsByAgent = new Map();

  const ensureMetric = (agentId) => {
    const normalized = String(agentId || "");
    if (!normalized) return null;
    if (!metricsByAgent.has(normalized)) {
      metricsByAgent.set(normalized, {
        totalMessages: 0,
        firstResponsesMs: [],
        resolvedConversations: 0,
        resolutionSeconds: [],
      });
    }
    return metricsByAgent.get(normalized);
  };

  const firstVisitorByConversation = new Map();
  const firstAgentByConversation = new Map();

  for (const message of messages) {
    const conversationId = String(message.conversationId || "");
    if (!conversationId) continue;

    const senderType = String(message.senderType || "");
    const createdAt = new Date(message.createdAt).getTime();
    if (!Number.isFinite(createdAt)) continue;

    if (senderType === "visitor" && !firstVisitorByConversation.has(conversationId)) {
      firstVisitorByConversation.set(conversationId, createdAt);
      continue;
    }

    const isAgentMessage = senderType === "agent" || senderType === "owner";
    if (!isAgentMessage) continue;

    const senderId = String(message.senderId || "");
    const metric = ensureMetric(senderId);
    if (metric) metric.totalMessages += 1;

    if (
      firstVisitorByConversation.has(conversationId) &&
      !firstAgentByConversation.has(conversationId)
    ) {
      const visitorTime = firstVisitorByConversation.get(conversationId);
      if (createdAt >= visitorTime) {
        firstAgentByConversation.set(conversationId, senderId);
        if (metric) {
          metric.firstResponsesMs.push(createdAt - visitorTime);
        }
      }
    }
  }

  for (const conversation of conversations) {
    if (conversation.status !== "resolved") continue;
    const assignedAgentId = String(conversation.assignedTo || "");
    const metric = ensureMetric(assignedAgentId);
    if (!metric) continue;
    metric.resolvedConversations += 1;

    const resolutionSeconds = getResolutionSeconds(conversation);
    if (resolutionSeconds > 0) {
      metric.resolutionSeconds.push(resolutionSeconds);
    }
  }

  const agents = await User.find({
    _id: { $in: Array.from(metricsByAgent.keys()) },
    ...buildWorkspaceScope(ctx),
  })
    .select("_id name email role")
    .lean();

  const byId = new Map(agents.map((agent) => [String(agent._id), agent]));

  return Array.from(metricsByAgent.entries())
    .map(([agentId, metric]) => {
      const agent = byId.get(agentId);
      if (!agent) return null;

      const avgFirstResponseSeconds =
        metric.firstResponsesMs.length > 0
          ? Math.round(
              metric.firstResponsesMs.reduce((sum, value) => sum + value, 0) /
                metric.firstResponsesMs.length /
                1000,
            )
          : 0;

      const avgResolutionSeconds =
        metric.resolutionSeconds.length > 0
          ? Math.round(
              metric.resolutionSeconds.reduce((sum, value) => sum + value, 0) /
                metric.resolutionSeconds.length,
            )
          : 0;

      return {
        agentId,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        totalMessages: Number(metric.totalMessages || 0),
        resolvedConversations: Number(metric.resolvedConversations || 0),
        avgFirstResponseSeconds,
        avgResolutionSeconds,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalMessages - a.totalMessages);
};

const buildMessageMaps = (messages = []) => {
  const byConversation = new Map();
  const hourBuckets = Array.from({ length: 24 }, () => 0);

  for (const message of messages) {
    const conversationId = String(message?.conversationId || "");
    if (conversationId) {
      if (!byConversation.has(conversationId)) {
        byConversation.set(conversationId, {
          hasAi: false,
          hasAgent: false,
          hasVisitor: false,
        });
      }
      const entry = byConversation.get(conversationId);
      const senderType = String(message.senderType || "");
      if (senderType === "ai") entry.hasAi = true;
      if (senderType === "agent" || senderType === "owner") entry.hasAgent = true;
      if (senderType === "visitor") entry.hasVisitor = true;
    }

    const hour = new Date(message.createdAt).getUTCHours();
    if (Number.isInteger(hour) && hour >= 0 && hour < 24) {
      hourBuckets[hour] += 1;
    }
  }

  return { byConversation, hourBuckets };
};

const buildSummaryMetrics = ({ conversations, messages }) => {
  const resolvedConversations = conversations.filter(
    (conversation) => String(conversation.status || "") === "resolved",
  );

  const resolutionSeconds = resolvedConversations
    .map((conversation) => getResolutionSeconds(conversation))
    .filter((seconds) => seconds > 0);

  const avgResolutionTimeSeconds =
    resolutionSeconds.length > 0
      ? Math.round(
          resolutionSeconds.reduce((sum, value) => sum + value, 0) /
            resolutionSeconds.length,
        )
      : 0;

  const { byConversation, hourBuckets } = buildMessageMaps(messages);

  let peakHourUtc = 0;
  let peakHourCount = 0;
  hourBuckets.forEach((count, hour) => {
    if (count > peakHourCount) {
      peakHourCount = count;
      peakHourUtc = hour;
    }
  });

  const aiDeflectedCount = conversations.filter((conversation) => {
    const key = String(conversation._id || "");
    const messageMap = byConversation.get(key);
    if (!messageMap) return false;
    return messageMap.hasAi && !messageMap.hasAgent;
  }).length;

  const aiDeflectionRate =
    conversations.length > 0
      ? Number(((aiDeflectedCount / conversations.length) * 100).toFixed(2))
      : 0;

  const csatScores = conversations
    .map((conversation) => Number(conversation?.metadata?.csatScore))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);

  const csatAverage =
    csatScores.length > 0
      ? Number(
          (
            csatScores.reduce((sum, value) => sum + value, 0) / csatScores.length
          ).toFixed(2),
        )
      : 0;

  const leadConversions = conversations.filter(
    (conversation) => conversation?.metadata?.leadConverted === true,
  ).length;

  const leadConversionRate =
    conversations.length > 0
      ? Number(((leadConversions / conversations.length) * 100).toFixed(2))
      : 0;

  return {
    resolvedConversations: resolvedConversations.length,
    avgResolutionTimeSeconds,
    peakHourUtc,
    peakHourCount,
    aiDeflectionRate,
    aiDeflectedCount,
    csatAverage,
    csatResponses: csatScores.length,
    leadConversions,
    leadConversionRate,
  };
};

const buildTimeSeries = ({ messages, conversations, start, days }) => {
  const byDate = new Map();

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    byDate.set(toDateKey(day), {
      date: toDateKey(day),
      messages: 0,
      conversations: 0,
      resolvedConversations: 0,
      aiMessages: 0,
    });
  }

  for (const message of messages) {
    const key = toDateKey(message.createdAt);
    if (!byDate.has(key)) continue;
    const entry = byDate.get(key);
    entry.messages += 1;
    if (String(message.senderType || "") === "ai") {
      entry.aiMessages += 1;
    }
  }

  for (const conversation of conversations) {
    const createdKey = toDateKey(conversation.createdAt);
    if (byDate.has(createdKey)) {
      byDate.get(createdKey).conversations += 1;
    }

    if (String(conversation.status || "") !== "resolved") continue;

    const resolvedAtRaw =
      conversation?.metadata?.resolvedAt || conversation?.updatedAt || null;
    if (!resolvedAtRaw) continue;
    const resolvedKey = toDateKey(resolvedAtRaw);
    if (byDate.has(resolvedKey)) {
      byDate.get(resolvedKey).resolvedConversations += 1;
    }
  }

  return Array.from(byDate.values());
};

const getWorkspaceUserStats = async (ctx) => {
  if (ctx.isSuperAdmin) {
    const [totalUsers, activeUsers] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: { $in: ["online", "busy", "active"] } }),
    ]);
    return { totalUsers, activeUsers, workspaceUserIds: [] };
  }

  const users = await User.find({ workspaceId: ctx.workspaceId }).select("_id").lean();
  const workspaceUserIds = users.map((user) => user._id);

  const [totalUsers, activeUsers] = await Promise.all([
    User.countDocuments({ workspaceId: ctx.workspaceId }),
    User.countDocuments({
      workspaceId: ctx.workspaceId,
      status: { $in: ["online", "busy", "active"] },
    }),
  ]);

  return { totalUsers, activeUsers, workspaceUserIds };
};

const getUsageStats = async ({ ctx, workspaceUserIds }) => {
  const usageQuery = ctx.isSuperAdmin
    ? { scope: { $in: ["global", "user", "workspace"] } }
    : {
        $or: [
          { workspaceId: ctx.workspaceId },
          { userId: { $in: workspaceUserIds } },
        ],
      };

  const usage = await Usage.find(usageQuery).select(
    "aiTokensUsed conversationsThisMonth",
  );

  return {
    aiTokensUsed: usage.reduce(
      (sum, item) => sum + Number(item.aiTokensUsed || 0),
      0,
    ),
    conversationsThisMonth: usage.reduce(
      (sum, item) => sum + Number(item.conversationsThisMonth || 0),
      0,
    ),
  };
};

const getConversationAndMessageDocs = async ({ ctx, range }) => {
  const workspaceScope = buildWorkspaceScope(ctx);

  const conversationQuery = {
    ...workspaceScope,
    createdAt: { $gte: range.start, $lte: range.end },
  };

  const messageQuery = {
    ...workspaceScope,
    createdAt: { $gte: range.start, $lte: range.end },
  };

  const [conversations, messages] = await Promise.all([
    Conversation.find(conversationQuery)
      .select("_id assignedTo status metadata createdAt updatedAt")
      .lean(),
    Message.find(messageQuery)
      .select("conversationId senderType senderId createdAt")
      .sort({ conversationId: 1, createdAt: 1 })
      .lean(),
  ]);

  return { conversations, messages };
};

export const getAnalyticsSummary = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const range = getDateRange(req.query || {});
  const { totalUsers, activeUsers, workspaceUserIds } =
    await getWorkspaceUserStats(ctx);

  const [usage, docs] = await Promise.all([
    getUsageStats({ ctx, workspaceUserIds }),
    getConversationAndMessageDocs({ ctx, range }),
  ]);

  const totalConversations = docs.conversations.length;
  const totalMessages = docs.messages.length;

  const summaryMetrics = buildSummaryMetrics({
    conversations: docs.conversations,
    messages: docs.messages,
  });

  const agentPerformance = await buildAgentPerformance({
    ctx,
    conversations: docs.conversations,
    messages: docs.messages,
  });

  const firstResponseValues = agentPerformance
    .map((item) => Number(item.avgFirstResponseSeconds || 0))
    .filter((value) => value > 0);
  const firstResponseTimeSeconds =
    firstResponseValues.length > 0
      ? Math.round(
          firstResponseValues.reduce((sum, value) => sum + value, 0) /
            firstResponseValues.length,
        )
      : 0;

  return res.status(200).json({
    data: {
      totalUsers,
      activeUsers,
      totalConversations,
      totalChats: totalConversations,
      totalMessages,
      aiTokensUsed: usage.aiTokensUsed,
      conversationsThisMonth: usage.conversationsThisMonth,
      firstResponseTimeSeconds,
      resolutionTimeSeconds: summaryMetrics.avgResolutionTimeSeconds,
      resolvedConversations: summaryMetrics.resolvedConversations,
      peakHourUtc: summaryMetrics.peakHourUtc,
      peakHourCount: summaryMetrics.peakHourCount,
      aiDeflectionRate: summaryMetrics.aiDeflectionRate,
      aiDeflectedCount: summaryMetrics.aiDeflectedCount,
      csatAverage: summaryMetrics.csatAverage,
      csatResponses: summaryMetrics.csatResponses,
      leadConversions: summaryMetrics.leadConversions,
      leadConversionRate: summaryMetrics.leadConversionRate,
      range: {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        days: range.days,
      },
      agentPerformance,
    },
  });
});

export const getAnalyticsTimeSeries = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const range = getDateRange(req.query || {});
  const docs = await getConversationAndMessageDocs({ ctx, range });
  const points = buildTimeSeries({
    messages: docs.messages,
    conversations: docs.conversations,
    start: range.start,
    days: range.days,
  });

  return res.status(200).json({
    data: {
      days: range.days,
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
      points,
    },
  });
});

export const exportAnalyticsCsv = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const range = getDateRange(req.query || {});
  const docs = await getConversationAndMessageDocs({ ctx, range });
  const points = buildTimeSeries({
    messages: docs.messages,
    conversations: docs.conversations,
    start: range.start,
    days: range.days,
  });

  const lines = [
    ["date", "messages", "conversations", "resolved_conversations", "ai_messages"].join(","),
  ];

  points.forEach((point) => {
    lines.push(
      [
        point.date,
        point.messages,
        point.conversations,
        point.resolvedConversations,
        point.aiMessages,
      ]
        .map(toCsvCell)
        .join(","),
    );
  });

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="analytics-timeseries.csv"',
  );

  return res.status(200).send(csv);
});
