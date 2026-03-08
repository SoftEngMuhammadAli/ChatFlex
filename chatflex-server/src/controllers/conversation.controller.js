const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const buildConversationListQuery = (workspaceId, query) => {
  const dbQuery = { workspaceId };

  if (query.status) dbQuery.status = query.status;
  if (query.assignedTo) dbQuery.assignedTo = query.assignedTo;
  if (query.department) dbQuery.department = query.department;
  if (query.tag) dbQuery.tags = query.tag;

  if (query.search) {
    const regex = new RegExp(query.search, "i");
    dbQuery.$or = [{ "visitor.name": regex }, { "visitor.email": regex }];
  }

  if (query.from || query.to) {
    dbQuery.createdAt = {};
    if (query.from) dbQuery.createdAt.$gte = new Date(query.from);
    if (query.to) dbQuery.createdAt.$lte = new Date(query.to);
  }

  return dbQuery;
};

const listConversations = async (req, res, next) => {
  try {
    const dbQuery = buildConversationListQuery(req.user.workspaceId, req.query);
    const conversations = await Conversation.find(dbQuery)
      .populate("assignedTo", "name email role")
      .sort({ updatedAt: -1 })
      .limit(200);

    return res.json(conversations);
  } catch (error) {
    return next(error);
  }
};

const getConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspaceId: req.user.workspaceId
    }).populate("assignedTo", "name email role");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      workspaceId: req.user.workspaceId,
      conversationId
    }).sort({ createdAt: 1 });

    return res.json({ conversation, messages });
  } catch (error) {
    return next(error);
  }
};

const createConversation = async (req, res, next) => {
  try {
    const { visitor = {}, department = "support", initialMessage = "" } = req.body;

    const conversation = await Conversation.create({
      workspaceId: req.user.workspaceId,
      visitor: {
        name: visitor.name || "Visitor",
        email: visitor.email || "",
        country: visitor.country || "",
        ip: visitor.ip || "",
        pageUrl: visitor.pageUrl || ""
      },
      department
    });

    if (initialMessage) {
      await Message.create({
        workspaceId: req.user.workspaceId,
        conversationId: conversation._id,
        senderType: "visitor",
        content: initialMessage
      });
    }

    return res.status(201).json(conversation);
  } catch (error) {
    return next(error);
  }
};

const assignConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { assignedTo } = req.body;
    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, workspaceId: req.user.workspaceId },
      { assignedTo },
      { new: true }
    ).populate("assignedTo", "name email role");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const io = req.app.get("io");
    io.to(`workspace:${req.user.workspaceId}`).emit("conversation:updated", conversation);

    return res.json(conversation);
  } catch (error) {
    return next(error);
  }
};

const updateConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const updates = {};
    const allowed = ["status", "tags", "lockedBy", "lockedUntil", "department"];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (updates.status === "resolved") {
      updates.resolvedAt = new Date();
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, workspaceId: req.user.workspaceId },
      { $set: updates },
      { new: true }
    ).populate("assignedTo", "name email role");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const io = req.app.get("io");
    io.to(`workspace:${req.user.workspaceId}`).emit("conversation:updated", conversation);

    return res.json(conversation);
  } catch (error) {
    return next(error);
  }
};

const addNote = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, workspaceId: req.user.workspaceId },
      {
        $push: {
          notes: {
            authorId: new mongoose.Types.ObjectId(req.user.id),
            content
          }
        }
      },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    return res.json(conversation.notes);
  } catch (error) {
    return next(error);
  }
};

const addMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, senderType = "agent", attachments = [] } = req.body;
    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      workspaceId: req.user.workspaceId
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const message = await Message.create({
      workspaceId: req.user.workspaceId,
      conversationId,
      senderType,
      senderId: req.user.id,
      content,
      attachments
    });

    const conversationUpdate = {
      updatedAt: new Date()
    };
    if (senderType === "agent" && !conversation.firstRespondedAt) {
      conversationUpdate.firstRespondedAt = new Date();
      conversationUpdate.status = "open";
    }

    await Conversation.updateOne({ _id: conversationId }, { $set: conversationUpdate });

    const io = req.app.get("io");
    io.to(`workspace:${req.user.workspaceId}`).emit("conversation:message", {
      conversationId,
      message
    });

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
};

const createPublicConversation = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const { visitor = {}, department = "support", initialMessage = "" } = req.body;
    const conversation = await Conversation.create({
      workspaceId,
      visitor: {
        name: visitor.name || "Visitor",
        email: visitor.email || "",
        country: visitor.country || "",
        ip: visitor.ip || req.ip || "",
        pageUrl: visitor.pageUrl || ""
      },
      department,
      status: "open"
    });

    if (initialMessage) {
      await Message.create({
        workspaceId,
        conversationId: conversation._id,
        senderType: "visitor",
        content: initialMessage
      });
    }

    const io = req.app.get("io");
    io.to(`workspace:${workspaceId}`).emit("conversation:new", conversation);

    return res.status(201).json({
      conversationId: conversation._id,
      status: conversation.status
    });
  } catch (error) {
    return next(error);
  }
};

const addPublicMessage = async (req, res, next) => {
  try {
    const { workspaceId, conversationId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, workspaceId });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const message = await Message.create({
      workspaceId,
      conversationId,
      senderType: "visitor",
      content
    });

    const io = req.app.get("io");
    io.to(`workspace:${workspaceId}`).emit("conversation:message", {
      conversationId,
      message
    });

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
};

const getPublicMessages = async (req, res, next) => {
  try {
    const { workspaceId, conversationId } = req.params;

    const conversation = await Conversation.findOne({ _id: conversationId, workspaceId });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({ workspaceId, conversationId })
      .sort({ createdAt: 1 })
      .limit(200);

    return res.json(messages);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listConversations,
  getConversationMessages,
  createConversation,
  assignConversation,
  updateConversation,
  addNote,
  addMessage,
  createPublicConversation,
  addPublicMessage,
  getPublicMessages
};
