import express from "express";
import {
  getAnalyticsSummary,
  getAnalyticsTimeSeries,
  exportAnalyticsCsv,
} from "../controllers/analytics.controller.js";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/analytics/summary:
 *   get:
 *     summary: Get analytics summary metrics
 *     description: Retrieve a summary of key analytics metrics for the workspace, including total conversations, messages, active agents, and average response times. This endpoint provides a high-level overview of support performance and activity.
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Analytics summary }
 */
router.get(
  "/summary",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  getAnalyticsSummary,
);

/**
 * @swagger
 * /api/v1/analytics/timeseries:
 *   get:
 *     summary: Get analytics time series data
 *     description: Retrieve time series data for analytics purposes over a specified date range. Accepts a `days` query parameter to specify the number of days to include in the time series (default is 30).
 *     tags: [Analytics]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Analytics time series data }
 */
router.get(
  "/timeseries",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  getAnalyticsTimeSeries,
);

router.get(
  "/export/csv",
  checkAuth,
  authorizeRoles("owner", "admin", "super-admin"),
  exportAnalyticsCsv,
);

export default router;
