import express from "express";
import {
  getNotificationStatus,
  createOrUpdateNotification,
  markNotificationAsRead,
  deleteNotification,
  triggerNotificationEmail,
  scheduleDailyDigest,
} from "../controllers/notification.controller.js";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management APIs
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Notification service status endpoint
 *     description: Checks whether the notification service is running.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification Service is running
 */
router.get("/", checkAuth, getNotificationStatus);

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Create or update a notification
 *     description: Creates a new notification or updates an existing one.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *                 example: message
 *               message:
 *                 type: string
 *                 example: You have received a new message
 *               read:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Notification created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification created/updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     message:
 *                       type: string
 *                     read:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request payload
 */
router.post("/", checkAuth, createOrUpdateNotification);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Updates a notification status to read.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: ID of the notification
 *         schema:
 *           type: string
 *           example: 65f9a9f0a12bc12a22f4a2c1
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification 65f9a9f0a12bc12a22f4a2c1 marked as read
 *       404:
 *         description: Notification not found
 */
router.patch("/:notificationId/read", checkAuth, markNotificationAsRead);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Deletes a notification by its ID.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: notificationId
 *         in: path
 *         required: true
 *         description: ID of the notification
 *         schema:
 *           type: string
 *           example: 65f9a9f0a12bc12a22f4a2c1
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification deleted successfully
 *       400:
 *         description: Notification ID is required
 *       404:
 *         description: Notification not found
 */
router.delete("/:notificationId", checkAuth, deleteNotification);
router.post(
  "/email",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  triggerNotificationEmail,
);
router.post(
  "/daily-digest",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  scheduleDailyDigest,
);

export default router;
