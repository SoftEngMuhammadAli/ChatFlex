import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { sendEmail } from "../utils/email.utils.js";
import { enqueueNotificationEmail } from "../queues/queues.js";

const normalizeRoles = (roles = []) =>
  Array.from(
    new Set(
      (Array.isArray(roles) ? roles : [])
        .map((role) => String(role || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );

const canSendEmail = () =>
  Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );

export const createInAppNotification = async ({
  workspaceId,
  userId,
  title = "",
  message,
  metadata = {},
}) => {
  if (!workspaceId || !userId || !String(message || "").trim()) return null;

  return Notification.create({
    workspaceId,
    userId,
    type: "in-app",
    title: String(title || "").trim(),
    message: String(message || "").trim(),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    read: false,
    readAt: null,
  });
};

export const sendNotificationEmailNow = async ({
  to,
  subject,
  message,
  html = "",
}) => {
  if (!to || !String(message || "").trim() || !canSendEmail()) {
    return { delivered: false };
  }

  try {
    await sendEmail({
      to,
      subject: String(subject || "ChatFlex Notification").trim(),
      text: String(message || "").trim(),
      html: String(html || "").trim() || undefined,
    });
    return { delivered: true };
  } catch (_error) {
    return { delivered: false };
  }
};

export const sendNotificationEmail = async (payload = {}) => {
  const shouldInline =
    String(process.env.NOTIFICATION_DELIVERY_MODE || "")
      .trim()
      .toLowerCase() === "inline";

  if (!shouldInline) {
    const queued = await enqueueNotificationEmail(payload);
    if (queued.queued) return { delivered: false, queued: true, jobId: queued.jobId };
  }
  return sendNotificationEmailNow(payload);
};

export const notifyUsersByRoles = async ({
  workspaceId,
  roles = [],
  title = "",
  message,
  metadata = {},
  sendEmailCopy = false,
}) => {
  if (!workspaceId || !String(message || "").trim()) {
    return { notifiedUserIds: [] };
  }

  const normalizedRoles = normalizeRoles(roles);
  const query = {
    workspaceId,
    ...(normalizedRoles.length > 0 ? { role: { $in: normalizedRoles } } : {}),
  };

  const users = await User.find(query).select("_id email name role").lean();
  if (users.length === 0) return { notifiedUserIds: [] };

  await Notification.insertMany(
    users.map((user) => ({
      workspaceId,
      userId: user._id,
      type: "in-app",
      title: String(title || "").trim(),
      message: String(message || "").trim(),
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      read: false,
      readAt: null,
    })),
  );

  if (sendEmailCopy) {
    await Promise.all(
      users.map((user) =>
        sendNotificationEmail({
          to: user.email,
          subject: title || "ChatFlex Notification",
          message,
        }),
      ),
    );
  }

  return {
    notifiedUserIds: users.map((user) => String(user._id)),
  };
};

const buildDailyDigestSummary = async ({ workspaceId, since }) => {
  const [conversationsCount, resolvedCount, messagesCount] = await Promise.all([
    Conversation.countDocuments({
      workspaceId,
      createdAt: { $gte: since },
    }),
    Conversation.countDocuments({
      workspaceId,
      status: "resolved",
      updatedAt: { $gte: since },
    }),
    Message.countDocuments({
      workspaceId,
      createdAt: { $gte: since },
    }),
  ]);

  return { conversationsCount, resolvedCount, messagesCount };
};

export const sendDailyDigestForWorkspace = async ({ workspaceId }) => {
  if (!workspaceId) return { recipients: 0 };

  const ownersAndAdmins = await User.find({
    workspaceId,
    role: { $in: ["owner", "admin"] },
  })
    .select("_id email name")
    .lean();

  if (ownersAndAdmins.length === 0) return { recipients: 0 };

  const since = new Date();
  since.setDate(since.getDate() - 1);

  const summary = await buildDailyDigestSummary({ workspaceId, since });
  const subject = "ChatFlex Daily Digest";
  const text = [
    "Daily workspace digest (last 24 hours):",
    `- Conversations created: ${summary.conversationsCount}`,
    `- Conversations resolved: ${summary.resolvedCount}`,
    `- Messages exchanged: ${summary.messagesCount}`,
  ].join("\n");

  await Promise.all(
    ownersAndAdmins.map((user) =>
      sendNotificationEmail({
        to: user.email,
        subject,
        message: text,
      }),
    ),
  );

  await Notification.insertMany(
    ownersAndAdmins.map((user) => ({
      workspaceId,
      userId: user._id,
      type: "in-app",
      title: subject,
      message: text,
      metadata: {
        digest: true,
        periodHours: 24,
        generatedAt: new Date().toISOString(),
      },
    })),
  );

  return { recipients: ownersAndAdmins.length, summary };
};
