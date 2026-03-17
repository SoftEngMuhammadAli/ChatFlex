import express from "express";
import {
  createVisitorConversation,
  getVisitorDirectMessages,
  getWidgetConfig,
  getWidgetPublicMeta,
  getVisitorConversationMessages,
  leaveVisitorConversation,
  postVisitorMessage,
  updateVisitorMessage,
  deleteVisitorMessage,
  updateVisitorProfile,
  uploadVisitorFile,
} from "../controllers/widget.controller.js";
import { upload } from "../controllers/widget.controller.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { z } from "zod";

const router = express.Router();
const widgetRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  keyPrefix: "widget",
});

router.use(widgetRateLimiter);

const handleWidgetUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "File too large. Maximum allowed size is 25MB.",
      });
    }
    return res.status(400).json({
      message: err.message || "File upload failed.",
    });
  });
};

/**
 * @swagger
 * /api/v1/widget/config:
 *   get:
 *     summary: Get widget config using workspace API key or widgetTemplate credentials
 *     tags: [Widget]
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: widgetId
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: widgetToken
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: visitorEmail
 *         required: false
 *         schema: { type: string }
 *     responses:
 *       200: { description: Widget config payload }
 *       401: { description: Invalid API key or credentials }
 */
router.get("/config", getWidgetConfig);

/**
 * @swagger
 * /api/v1/widget/public-meta:
 *   get:
 *     summary: Get widget public meta
 *     tags: [Widget]
 *     responses:
 *       200: { description: Public meta data }
 */
router.get("/public-meta", getWidgetPublicMeta);

/**
 * @swagger
 * /api/v1/widget/start:
 *   post:
 *     summary: Start or resume visitor conversation and assign agent
 *     tags: [Widget]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visitorId]
 *             properties:
 *               apiKey: { type: string }
 *               widgetId: { type: string }
 *               widgetToken: { type: string }
 *               visitorId: { type: string }
 *               metadata: { type: object }
 *               forceNewConversation: { type: boolean }
 *     responses:
 *       200: { description: Existing conversation returned }
 *       201: { description: New conversation created }
 *       403: { description: Plan limit reached }
 */
const widgetStartSchema = z.object({
  apiKey: z.string().trim().optional(),
  widgetId: z.string().trim().optional(),
  widgetToken: z.string().trim().optional(),
  visitorId: z.string().trim().min(1),
  visitorEmail: z.string().trim().email().optional(),
  metadata: z.record(z.any()).optional(),
  department: z.string().trim().optional(),
  forceNewConversation: z.boolean().optional(),
});

router.post("/start", validateBody(widgetStartSchema), createVisitorConversation);

/**
 * @swagger
 * /api/v1/widget/direct-messages:
 *   get:
 *     summary: Get visitor direct messages (visitor <-> assigned agent)
 *     tags: [Widget]
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: widgetId
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: widgetToken
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: visitorId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: visitorEmail
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: after
 *         required: false
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Message list }
 */
router.get("/direct-messages", getVisitorDirectMessages);

/**
 * @swagger
 * /api/v1/widget/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get conversation-scoped widget messages
 *     tags: [Widget]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: apiKey
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: widgetId
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: widgetToken
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: visitorEmail
 *         required: false
 *         schema: { type: string }
 *       - in: query
 *         name: after
 *         required: false
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Message list }
 *       404: { description: Conversation not found }
 */
router.get(
  "/conversations/:conversationId/messages",
  getVisitorConversationMessages,
);

/**
 * @swagger
 * /api/v1/widget/conversations/{conversationId}/messages:
 *   post:
 *     summary: Post visitor message to widget conversation
 *     tags: [Widget]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visitorId, content]
 *             properties:
 *               apiKey: { type: string }
 *               widgetId: { type: string }
 *               widgetToken: { type: string }
 *               visitorId: { type: string }
 *               visitorEmail: { type: string }
 *               content: { type: string }
 *     responses:
 *       201: { description: Message created }
 *       403: { description: Visitor mismatch }
 */
const widgetPostMessageSchema = z.object({
  apiKey: z.string().trim().optional(),
  widgetId: z.string().trim().optional(),
  widgetToken: z.string().trim().optional(),
  visitorId: z.string().trim().min(1),
  visitorEmail: z.string().trim().email().optional(),
  content: z.string().trim().optional(),
  attachments: z.array(z.any()).optional(),
});
router.post(
  "/conversations/:conversationId/messages",
  validateBody(widgetPostMessageSchema),
  postVisitorMessage,
);

/**
 * @swagger
 * /api/v1/widget/conversations/{conversationId}/messages/{messageId}:
 *   patch:
 *     summary: Update visitor message in widget conversation
 *     tags: [Widget]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey: { type: string }
 *               widgetId: { type: string }
 *               widgetToken: { type: string }
 *               visitorId: { type: string }
 *               visitorEmail: { type: string }
 *               content: { type: string }
 *     responses:
 *       200: { description: Message updated }
 *       403: { description: Visitor mismatch }
 *       404: { description: Message not found }
 *   delete:
 *     summary: Delete visitor message in widget conversation
 *     tags: [Widget]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey: { type: string }
 *               widgetId: { type: string }
 *               widgetToken: { type: string }
 *               visitorId: { type: string }
 *               visitorEmail: { type: string }
 *     responses:
 *       200: { description: Message deleted }
 *       403: { description: Visitor mismatch }
 *       404: { description: Message not found }
 */
const widgetEditMessageSchema = z.object({
  apiKey: z.string().trim().optional(),
  widgetId: z.string().trim().optional(),
  widgetToken: z.string().trim().optional(),
  visitorId: z.string().trim().min(1),
  visitorEmail: z.string().trim().email().optional(),
  content: z.string().trim().optional(),
  attachments: z.array(z.any()).optional(),
});

router.patch(
  "/conversations/:conversationId/messages/:messageId",
  validateBody(widgetEditMessageSchema),
  updateVisitorMessage,
);
router.delete(
  "/conversations/:conversationId/messages/:messageId",
  validateBody(
    z.object({
      apiKey: z.string().trim().optional(),
      widgetId: z.string().trim().optional(),
      widgetToken: z.string().trim().optional(),
      visitorId: z.string().trim().min(1),
      visitorEmail: z.string().trim().email().optional(),
    }),
  ),
  deleteVisitorMessage,
);

/**
 * @swagger
 * /api/v1/widget/conversations/{conversationId}/leave:
 *   post:
 *     summary: Mark conversation as visitor-left (non-resolved)
 *     tags: [Widget]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visitorId]
 *             properties:
 *               apiKey: { type: string }
 *               widgetId: { type: string }
 *               widgetToken: { type: string }
 *               visitorId: { type: string }
 *               visitorEmail: { type: string }
 *     responses:
 *       200: { description: Conversation left successfully }
 *       403: { description: Visitor mismatch }
 */
router.post(
  "/conversations/:conversationId/leave",
  validateBody(
    z.object({
      apiKey: z.string().trim().optional(),
      widgetId: z.string().trim().optional(),
      widgetToken: z.string().trim().optional(),
      visitorId: z.string().trim().min(1),
      visitorEmail: z.string().trim().email().optional(),
    }),
  ),
  leaveVisitorConversation,
);

/**
 * @swagger
 * /api/v1/widget/visitor:
 *   put:
 *     summary: Update visitor profile data
 *     tags: [Widget]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [visitorId]
 *             properties:
 *               apiKey: { type: string }
 *               widgetId: { type: string }
 *               widgetToken: { type: string }
 *               visitorId: { type: string }
 *               visitorEmail: { type: string }
 *               metadata:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   email: { type: string }
 *     responses:
 *       200: { description: Profile updated successfully }
 *       400: { description: Bad request }
 *       403: { description: Visitor mismatch }
 *       404: { description: User not found }
 */
router.put(
  "/visitor",
  validateBody(
    z.object({
      apiKey: z.string().trim().optional(),
      widgetId: z.string().trim().optional(),
      widgetToken: z.string().trim().optional(),
      visitorId: z.string().trim().min(1),
      visitorEmail: z.string().trim().email().optional(),
      department: z.string().trim().optional(),
      metadata: z.record(z.any()).optional(),
    }),
  ),
  updateVisitorProfile,
);

/**
 * @swagger
 * /api/v1/widget/upload:
 *   post:
 *     summary: Upload a file from the widget
 *     tags: [Widget]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               apiKey: { type: string }
 *               widgetId: { type: string }
 *               widgetToken: { type: string }
 *               visitorId: { type: string }
 *     responses:
 *       200: { description: File uploaded successfully }
 *       403: { description: Access denied }
 */
router.post("/upload", handleWidgetUpload, uploadVisitorFile);

export default router;
