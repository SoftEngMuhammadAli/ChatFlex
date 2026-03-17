import { Notification } from "../models/notification.model.js";
import { WorkflowTask } from "../models/workflowTask.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";
import {
  sendDailyDigestForWorkspace,
  sendNotificationEmail,
} from "../services/notification.service.js";

const getWorkspaceScope = (req) => {
  const isSuperAdmin = String(req.user?.role || "") === "super-admin";
  if (isSuperAdmin) return {};
  const workspaceId = String(req.user?.workspaceId || "").trim();
  return workspaceId ? { workspaceId } : {};
};

const resolveWorkspaceId = (req) => {
  const role = String(req.user?.role || "").toLowerCase();
  const requested = String(
    req.body?.workspaceId || req.query?.workspaceId || "",
  ).trim();
  if (role === "super-admin") {
    return requested || String(req.user?.workspaceId || "").trim();
  }
  return String(req.user?.workspaceId || "").trim();
};

const buildNotificationQuery = (req, notificationId) => {
  const query = {
    _id: notificationId,
    userId: req.user._id,
    ...getWorkspaceScope(req),
  };
  return query;
};

// Get notification service status + current user notifications.
export const getNotificationStatus = catchAsyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    userId: req.user._id,
    ...getWorkspaceScope(req),
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = notifications.reduce(
    (sum, item) => sum + (item.read ? 0 : 1),
    0,
  );

  return res.status(200).json({
    message: "Notification Service is running",
    data: notifications,
    unreadCount,
  });
});

export const createOrUpdateNotification = catchAsyncHandler(
  async (req, res) => {
    const { notificationId, type, title, message, read, metadata } = req.body;
    if (!message) {
      return res.status(400).json({
        message: "Notification message is required",
      });
    }

    const payload = {
      type:
        String(type || "").trim().toLowerCase() === "email"
          ? "email"
          : "in-app",
      title: String(title || "").trim(),
      message: String(message).trim(),
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      read: Boolean(read),
      ...(Boolean(read) ? { readAt: new Date() } : {}),
    };

    let notification;
    if (notificationId) {
      notification = await Notification.findOneAndUpdate(
        buildNotificationQuery(req, notificationId),
        payload,
        { new: true, runValidators: true },
      );
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
    } else {
      notification = await Notification.create({
        userId: req.user._id,
        ...getWorkspaceScope(req),
        ...payload,
      });
    }

    return res.status(notificationId ? 200 : 201).json({
      message: notificationId
        ? "Notification updated successfully"
        : "Notification created successfully",
      data: notification,
    });
  },
);

export const markNotificationAsRead = catchAsyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    buildNotificationQuery(req, notificationId),
    { read: true, readAt: new Date() },
    { new: true },
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.status(200).json({
    message: `Notification ${notificationId} marked as read`,
    data: notification,
  });
});

export const deleteNotification = catchAsyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  if (!notificationId) {
    return res.status(400).json({ message: "Notification ID is required" });
  }

  const deleted = await Notification.findOneAndDelete(
    buildNotificationQuery(req, notificationId),
  );
  if (!deleted) {
    return res.status(404).json({ message: "Notification not found" });
  }

  return res.status(200).json({
    message: `Notification ${notificationId} deleted successfully`,
  });
});

export const triggerNotificationEmail = catchAsyncHandler(async (req, res) => {
  const to = String(req.body?.to || req.user?.email || "").trim();
  const subject = String(req.body?.subject || "ChatFlex Notification").trim();
  const message = String(req.body?.message || "").trim();

  if (!to || !message) {
    return res.status(400).json({ message: "to and message are required" });
  }

  const result = await sendNotificationEmail({
    to,
    subject,
    message,
    html: String(req.body?.html || "").trim(),
  });

  return res.status(200).json({ data: result });
});

export const scheduleDailyDigest = catchAsyncHandler(async (req, res) => {
  const workspaceId = resolveWorkspaceId(req);
  if (!workspaceId) {
    return res.status(400).json({ message: "workspaceId is required" });
  }

  const sendNow = Boolean(req.body?.sendNow);
  if (sendNow) {
    const result = await sendDailyDigestForWorkspace({ workspaceId });
    return res.status(200).json({ data: { scheduled: false, ...result } });
  }

  const dueAt = req.body?.dueAt ? new Date(req.body.dueAt) : new Date();
  if (Number.isNaN(dueAt.getTime())) {
    return res.status(400).json({ message: "Invalid dueAt value" });
  }

  const task = await WorkflowTask.create({
    workspaceId,
    taskType: "daily-digest",
    dueAt,
    status: "pending",
    payload: {
      requestedBy: String(req.user?._id || ""),
    },
  });

  return res.status(201).json({
    data: task,
  });
});
