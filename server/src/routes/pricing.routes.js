import express from "express";
import { checkAuth, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  createPricingPlan,
  getPricingPlans,
  getPricingPlanById,
  updatePricingPlan,
  deletePricingPlan,
} from "../controllers/pricing.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Pricing
 *   description: Pricing plans management APIs
 */

/**
 * @swagger
 * /api/v1/pricing:
 *   post:
 *     summary: Create a new pricing plan
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - currency
 *               - interval
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pro Plan
 *               price:
 *                 type: number
 *                 example: 49
 *               currency:
 *                 type: string
 *                 example: USD
 *               interval:
 *                 type: string
 *                 enum: [month, year]
 *                 example: month
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - Unlimited conversations
 *                   - AI assistant
 *                   - Advanced analytics
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Pricing plan created successfully
 *       400:
 *         description: Invalid request payload
 */
router.post("/", checkAuth, authorizeRoles("super-admin"), createPricingPlan);

/**
 * @swagger
 * /api/v1/pricing:
 *   get:
 *     summary: Get all active pricing plans
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pricing plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 65f9a9f0a12bc12a22f4a2c1
 *                   name:
 *                     type: string
 *                     example: Starter Plan
 *                   price:
 *                     type: number
 *                     example: 19
 *                   currency:
 *                     type: string
 *                     example: USD
 *                   interval:
 *                     type: string
 *                     example: month
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 *                   isActive:
 *                     type: boolean
 */
router.get("/", checkAuth, getPricingPlans);

/**
 * @swagger
 * /api/v1/pricing/{id}:
 *   get:
 *     summary: Get pricing plan by ID
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Pricing plan ID
 *         schema:
 *           type: string
 *           example: 65f9a9f0a12bc12a22f4a2c1
 *     responses:
 *       200:
 *         description: Pricing plan details
 *       404:
 *         description: Pricing plan not found
 */
router.get("/:id", checkAuth, getPricingPlanById);

/**
 * @swagger
 * /api/v1/pricing/{id}:
 *   put:
 *     summary: Update pricing plan by ID
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Pricing plan ID
 *         schema:
 *           type: string
 *           example: 65f9a9f0a12bc12a22f4a2c1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pro Plan
 *               price:
 *                 type: number
 *                 example: 59
 *               currency:
 *                 type: string
 *                 example: USD
 *               interval:
 *                 type: string
 *                 enum: [month, year]
 *                 example: year
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - AI chatbot
 *                   - Live support
 *                   - Advanced analytics
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Pricing plan updated successfully
 *       404:
 *         description: Pricing plan not found
 */
router.put("/:id", checkAuth, authorizeRoles("super-admin"), updatePricingPlan);

/**
 * @swagger
 * /api/v1/pricing/{id}:
 *   delete:
 *     summary: Deactivate pricing plan by ID
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Pricing plan ID
 *         schema:
 *           type: string
 *           example: 65f9a9f0a12bc12a22f4a2c1
 *     responses:
 *       200:
 *         description: Pricing plan deactivated successfully
 *       404:
 *         description: Pricing plan not found
 */
router.delete(
  "/:id",
  checkAuth,
  authorizeRoles("super-admin"),
  deletePricingPlan,
);

export default router;
