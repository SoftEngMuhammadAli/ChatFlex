import express from "express";
import {
  getDirectMessages,
  getDirectMessageUsers,
  getUnreadDirectMessageCounts,
  updateDirectMessageById,
  deleteDirectMessageById,
} from "../controllers/directMessage.controller.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(checkAuth);

/**
 * @swagger
 * /api/v1/direct-messages/unread-counts:
 *   get:
 *     summary: Get unread direct message counts by user
 *     tags: [DirectMessages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread direct message counts }
 */
router.get("/unread-counts", getUnreadDirectMessageCounts);

/**
 * @swagger
 * /api/v1/direct-messages/message/{messageId}:
 *   patch:
 *     summary: Update a direct message by id
 *     tags: [DirectMessages]
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
 *       200: { description: Direct message updated }
 *       404: { description: Direct message not found }
 *   delete:
 *     summary: Delete a direct message by id
 *     tags: [DirectMessages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Direct message deleted }
 *       404: { description: Direct message not found }
 */
router.patch("/message/:messageId", updateDirectMessageById);
router.delete("/message/:messageId", deleteDirectMessageById);

/**
 * @swagger
 * /api/v1/direct-messages/{userId}:
 *   get:
 *     summary: Get direct messages with a specific user
 *     tags: [DirectMessages]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Direct message thread }
 */
router.get("/:userId", getDirectMessages);

/**
 * @swagger
 * /api/v1/direct-messages:
 *   get:
 *     summary: Get list of users with direct message history
 *     tags: [DirectMessages]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Chat partners list }
 */
router.get("/", getDirectMessageUsers);

export default router;
