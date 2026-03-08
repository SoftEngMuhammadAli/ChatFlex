const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const getSummary = async (req, res, next) => {
  try {
    const workspaceId = req.user.workspaceId;
    const { from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    const baseFilter = { workspaceId };
    if (from || to) baseFilter.createdAt = dateFilter;

    const [totalChats, openChats, pendingChats, resolvedChats, totalMessages] = await Promise.all([
      Conversation.countDocuments(baseFilter),
      Conversation.countDocuments({ ...baseFilter, status: "open" }),
      Conversation.countDocuments({ ...baseFilter, status: "pending" }),
      Conversation.countDocuments({ ...baseFilter, status: "resolved" }),
      Message.countDocuments(baseFilter)
    ]);

    const peakHours = await Message.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const avgResolution = await Conversation.aggregate([
      {
        $match: {
          ...baseFilter,
          resolvedAt: { $ne: null }
        }
      },
      {
        $project: {
          resolutionMs: { $subtract: ["$resolvedAt", "$createdAt"] }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionMs: { $avg: "$resolutionMs" }
        }
      }
    ]);

    return res.json({
      totalChats,
      openChats,
      pendingChats,
      resolvedChats,
      totalMessages,
      aiDeflectionRate: 0,
      avgResolutionMs: avgResolution[0]?.avgResolutionMs || 0,
      peakHours: peakHours.map((h) => ({
        hour: h._id,
        count: h.count
      }))
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getSummary };
