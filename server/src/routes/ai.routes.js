import express from "express";
import {
  getAIResponse,
  getLatestAIConversation,
  getAIConversationMessages,
  getWorkspaceAISettings,
  updateWorkspaceAISettings,
  getConversationAISummary,
  getConversationAISuggestions,
  knowledgeUpload,
  uploadKnowledgePdf,
  addKnowledgeWebsite,
} from "../controllers/ai.controller.js";
import { checkAuth, authorizeRoles } from "../middleware/auth.middleware.js";
import { checkPlanLimits } from "../middleware/plan.middleware.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();
const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: "ai",
});

router.use(aiRateLimiter);

/**
 * @swagger
 * /api/v1/ai/respond:
 *   post:
 *     summary: Send user message to AI and get response
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *               conversationId: { type: string }
 *     responses:
 *       200: { description: AI response payload }
 *       403: { description: Access denied or token limit reached }
 */
router.post("/respond", checkAuth, checkPlanLimits("ai"), getAIResponse);

/**
 * @swagger
 * /api/v1/ai/conversations/latest:
 *   get:
 *     summary: Get latest AI conversation for current user
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Latest AI conversation }
 */
router.get("/conversations/latest", checkAuth, getLatestAIConversation);

/**
 * @swagger
 * /api/v1/ai/conversations/{id}/messages:
 *   get:
 *     summary: Get messages for AI conversation
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Message list }
 *       404: { description: Conversation not found }
 */
router.get("/conversations/:id/messages", checkAuth, getAIConversationMessages);

/**
 * @swagger
 * /api/v1/ai/settings:
 *   get:
 *     summary: Get AI settings for current workspace
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: AI settings payload }
 *       404: { description: Workspace not found }
 */
router.get("/settings", checkAuth, getWorkspaceAISettings);

/**
 * @swagger
 * /api/v1/ai/settings:
 *   put:
 *     summary: Update AI settings for workspace
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode: { type: string, enum: [disabled, faq-first, hybrid, ai-only] }
 *               escalationEnabled: { type: boolean }
 *               fallbackMessage: { type: string }
 *               brandTone: { type: string }
 *               confidenceThreshold: { type: number, minimum: 0, maximum: 1 }
 *               autoDetectLanguage: { type: boolean }
 *               responseLanguage: { type: string }
 *               model: { type: string }
 *               temperature: { type: number, minimum: 0, maximum: 1 }
 *               knowledgeSources:
 *                 type: object
 *                 properties:
 *                   manualFaqEnabled: { type: boolean }
 *                   websiteUrls:
 *                     type: array
 *                     items: { type: string }
 *     responses:
 *       200: { description: AI settings updated }
 *       403: { description: Forbidden }
 *       404: { description: Workspace not found }
 */
router.put(
  "/settings",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  updateWorkspaceAISettings,
);

/**
 * @swagger
 * /api/v1/ai/conversations/{id}/summary:
 *   get:
 *     summary: Generate AI summary for a workspace conversation
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: AI summary payload }
 *       404: { description: Conversation not found }
 */
router.get(
  "/conversations/:id/summary",
  checkAuth,
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  getConversationAISummary,
);

/**
 * @swagger
 * /api/v1/ai/conversations/{id}/suggestions:
 *   get:
 *     summary: Get AI reply suggestions for a conversation
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: AI reply suggestions }
 *       404: { description: Conversation not found }
 */
router.get(
  "/conversations/:id/suggestions",
  checkAuth,
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  getConversationAISuggestions,
);

/**
 * @swagger
 * /api/v1/ai/knowledge/pdf:
 *   post:
 *     summary: Upload knowledge-base PDF for workspace AI settings
 *     tags: [AI]
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
 *       200: { description: PDF source uploaded }
 *       400: { description: No file uploaded }
 *       404: { description: Workspace not found }
 */
router.post(
  "/knowledge/pdf",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  knowledgeUpload.single("file"),
  uploadKnowledgePdf,
);

/**
 * @swagger
 * /api/v1/ai/knowledge/website:
 *   post:
 *     summary: Add website URL as workspace AI knowledge source
 *     tags: [AI]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string }
 *     responses:
 *       200: { description: Website source added }
 *       400: { description: url is required }
 *       404: { description: Workspace not found }
 */
router.post(
  "/knowledge/website",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  addKnowledgeWebsite,
);

export default router;
