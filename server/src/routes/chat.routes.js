import express from "express";
import {
  getConversations,
  getMessages,
  postMessage,
  updateMessageById,
  deleteMessageById,
  createConversation,
  updateConversationStatus,
  assignConversation,
  updateConversationTags,
  addConversationNote,
  removeConversationNote,
  setConversationTypingLock,
  chatUpload,
  uploadChatFile,
} from "../controllers/chat.controller.js";
import { checkAuth, authorizeRoles } from "../middleware/auth.middleware.js";
import { checkPlanLimits } from "../middleware/plan.middleware.js";

const router = express.Router();

router.use(checkAuth);

const handleChatUpload = (req, res, next) => {
  chatUpload.single("file")(req, res, (err) => {
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
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get workspace conversations
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, pending, resolved] }
 *     responses:
 *       200: { description: Conversation list }
 */
router.get("/conversations", getConversations);

/**
 * @swagger
 * /api/v1/chat:
 *   post:
 *     summary: Create manual conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Conversation created }
 */
router.post("/", checkPlanLimits("conversation"), createConversation);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/messages:
 *   get:
 *     summary: Get messages for conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Message list }
 */
router.get("/conversations/:id/messages", getMessages);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/messages:
 *   post:
 *     summary: Post agent message in conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               attachments: { type: array, items: { type: object } }
 *     responses:
 *       201: { description: Message created }
 */
router.post("/conversations/:id/messages", postMessage);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/status:
 *   patch:
 *     summary: Update conversation status
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [open, pending, resolved, escalated] }
 *     responses:
 *       200: { description: Conversation status updated }
 */
router.patch(
  "/conversations/:id/status",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  updateConversationStatus,
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/assign:
 *   patch:
 *     summary: Assign conversation to a user
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: Conversation assigned }
 */
router.patch(
  "/conversations/:id/assign",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  assignConversation,
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/tags:
 *   patch:
 *     summary: Update conversation tags
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation tags updated }
 */
router.patch(
  "/conversations/:id/tags",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  updateConversationTags,
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/notes:
 *   post:
 *     summary: Add internal note to conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Note added }
 */
router.post(
  "/conversations/:id/notes",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  addConversationNote,
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/notes/{noteId}:
 *   delete:
 *     summary: Remove internal note from conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Note removed }
 */
router.delete(
  "/conversations/:id/notes/:noteId",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  removeConversationNote,
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/typing-lock:
 *   patch:
 *     summary: Update typing lock on conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Typing lock updated }
 */
router.patch(
  "/conversations/:id/typing-lock",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  setConversationTypingLock,
);

/**
 * @swagger
 * /api/v1/chat/messages/{messageId}:
 *   patch:
 *     summary: Update a chat message by id
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
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
 *               content: { type: string }
 *     responses:
 *       200: { description: Message updated }
 *       404: { description: Message not found }
 *   delete:
 *     summary: Delete a chat message by id
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Message deleted }
 *       404: { description: Message not found }
 */
router.patch("/messages/:messageId", updateMessageById);
router.delete("/messages/:messageId", deleteMessageById);

/**
 * @swagger
 * /api/v1/chat/upload:
 *   post:
 *     summary: Upload chat attachment file
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: File uploaded successfully }
 *       400: { description: Invalid file upload request }
 */
router.post("/upload", handleChatUpload, uploadChatFile);

export default router;
