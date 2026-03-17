import express from "express";
import { checkAuth, authorizeRoles } from "../middleware/auth.middleware.js";
import {
  createBillingStatus,
  getBillingStatus,
  updateBillingStatus,
  deleteBillingStatus,
  createStripeCheckoutSession,
  verifyStripeCheckoutSession,
  createPortalSession,
  startFreeTrial,
} from "../controllers/billing.controller.js";

import {
  createPricingPlan,
  getPricingPlans,
  getPricingPlanById,
  updatePricingPlan,
  deletePricingPlan,
} from "../controllers/pricing.controller.js";

const router = express.Router();

/* Pricing Routes */
/**
 * @swagger
 * /api/v1/billing/pricing:
 *   post:
 *     summary: Create a new pricing plan
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, currency, interval]
 *             properties:
 *               name: { type: string }
 *               price: { type: number }
 *               currency: { type: string }
 *               interval: { type: string, enum: [month, year] }
 *               features: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Pricing plan created }
 *       400: { description: Missing fields }
 */
router.post(
  "/pricing",
  checkAuth,
  authorizeRoles("super-admin"),
  createPricingPlan,
);

/**
 * @swagger
 * /api/v1/billing/pricing:
 *   get:
 *     summary: Get all pricing plans
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of pricing plans }
 */
router.get("/pricing", checkAuth, getPricingPlans);

/**
 * @swagger
 * /api/v1/billing/pricing/{id}:
 *   get:
 *     summary: Get pricing plan by id
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pricing plan details }
 *       404: { description: Pricing plan not found }
 */
router.get("/pricing/:id", checkAuth, getPricingPlanById);

/**
 * @swagger
 * /api/v1/billing/pricing/{id}:
 *   put:
 *     summary: Update a pricing plan
 *     tags: [Billing]
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
 *     responses:
 *       200: { description: Pricing plan updated }
 *       404: { description: Pricing plan not found }
 */
router.put(
  "/pricing/:id",
  checkAuth,
  authorizeRoles("super-admin"),
  updatePricingPlan,
);

/**
 * @swagger
 * /api/v1/billing/pricing/{id}:
 *   delete:
 *     summary: Delete a pricing plan
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Pricing plan deleted }
 *       404: { description: Pricing plan not found }
 */
router.delete(
  "/pricing/:id",
  checkAuth,
  authorizeRoles("super-admin"),
  deletePricingPlan,
);

/* Billing Routes */
/**
 * @swagger
 * /api/v1/billing/billing:
 *   post:
 *     summary: Create billing status for tenant
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId]
 *             properties:
 *               planId: { type: string }
 *     responses:
 *       201: { description: Billing status created }
 *       400: { description: Missing fields }
 */
router.post("/billing", checkAuth, createBillingStatus);
router.post("/billing/trial/start", checkAuth, startFreeTrial);

/**
 * @swagger
 * /api/v1/billing/billing:
 *   get:
 *     summary: Get current billing status
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current billing status }
 *       404: { description: Billing status not found }
 */
router.get("/billing", checkAuth, getBillingStatus);

/**
 * @swagger
 * /api/v1/billing/billing/{id}:
 *   put:
 *     summary: Update billing status
 *     tags: [Billing]
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
 *             properties:
 *               status: { type: string, enum: [active, pending, canceled, past_due] }
 *               currentPeriodEnd: { type: string, format: date-time }
 *     responses:
 *       200: { description: Billing status updated }
 *       404: { description: Billing status not found }
 */
router.put("/billing/:id", checkAuth, updateBillingStatus);

/**
 * @swagger
 * /api/v1/billing/billing/{id}:
 *   delete:
 *     summary: Delete billing status
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Billing status deleted }
 *       404: { description: Billing status not found }
 */
router.delete("/billing/:id", checkAuth, deleteBillingStatus);

/* Stripe Purchase Flow */

/**
 * @swagger
 * /api/v1/billing/checkout/session:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [priceId]
 *             properties:
 *               priceId: { type: string }
 *     responses:
 *       200: { description: Checkout session created }
 */
router.post("/checkout/session", checkAuth, createStripeCheckoutSession);

/**
 * @swagger
 * /api/v1/billing/checkout/session/{sessionId}/verify:
 *   get:
 *     summary: Verify Stripe checkout session
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Session verified successfully }
 */
router.get(
  "/checkout/session/:sessionId/verify",
  checkAuth,
  verifyStripeCheckoutSession,
);

/**
 * @swagger
 * /api/v1/billing/create-portal-session:
 *   post:
 *     summary: Create Stripe Customer Portal session
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Portal session created }
 */
router.post("/create-portal-session", checkAuth, createPortalSession);

export default router;
