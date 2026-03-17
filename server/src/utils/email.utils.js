import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, "../templates");

/**
 * Safely parse boolean from env
 */
const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

/**
 * Get SMTP configuration from environment
 */
const getMailConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user || "no-reply@chatflex.local";

  return { host, port, secure, user, pass, from };
};

/**
 * Create nodemailer transporter
 */
const createTransporter = () => {
  const { host, port, secure, user, pass } = getMailConfig();

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      // helps in local dev with self-signed certs, but should be false in production
      rejectUnauthorized: false,
    },
  });
};

/**
 * Build frontend URL safely
 */
export const buildClientUrl = (pathname, params = {}) => {
  const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(
    /\/+$/,
    "",
  );

  const query = new URLSearchParams(params).toString();
  return `${base}${pathname}${query ? `?${query}` : ""}`;
};

/**
 * Send generic email
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const { from, host, user } = getMailConfig();
  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    return {
      delivered: true,
      messageId: info.messageId,
    };
  } catch (error) {
    throw new Error(
      `Failed to send email via SMTP (${host}, user: ${user}) → ${error.message}`,
    );
  }
};

const renderEmailTemplate = async (templateName, data = {}) => {
  const layoutPath = path.join(templatesDir, "layouts", "email-layout.ejs");
  const templatePath = path.join(templatesDir, "emails", `${templateName}.ejs`);
  const body = await ejs.renderFile(templatePath, data, { async: true });
  return ejs.renderFile(
    layoutPath,
    {
      subject: data.subject || "ChatFlex",
      body,
    },
    { async: true },
  );
};

/**
 * Verification Email
 */
export const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const safeName = name || "there";

  const subject = "Verify your ChatFlex account";

  const text = `Hi ${safeName}, verify your account here: ${verificationUrl}`;
  const html = await renderEmailTemplate("verification-email", {
    subject,
    name: safeName,
    verificationUrl,
  });

  return sendEmail({ to, subject, text, html });
};

/**
 * Password Reset Email
 */
export const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const safeName = name || "there";

  const subject = "Reset your ChatFlex password";

  const text = `Hi ${safeName}, reset your password here: ${resetUrl}`;
  const html = await renderEmailTemplate("password-reset-email", {
    subject,
    name: safeName,
    resetUrl,
  });

  return sendEmail({ to, subject, text, html });
};

/**
 * Team Invitation Email
 */
export const sendTeamInvitationEmail = async ({
  to,
  name,
  inviterName,
  workspaceName,
  role,
  invitationUrl,
}) => {
  const safeName = name || "there";
  const safeInviter = inviterName || "A teammate";
  const safeWorkspaceName = workspaceName || "your workspace";
  const safeRole = role || "agent";

  const subject = `You're invited to join ${safeWorkspaceName} on ChatFlex`;
  const text = `Hi ${safeName}, ${safeInviter} invited you as ${safeRole} to ${safeWorkspaceName}. Accept invitation: ${invitationUrl}`;
  const html = await renderEmailTemplate("team-invitation-email", {
    subject,
    name: safeName,
    inviterName: safeInviter,
    workspaceName: safeWorkspaceName,
    role: safeRole,
    invitationUrl,
  });

  return sendEmail({ to, subject, text, html });
};
