import express from "express";
import authRoutes from "./auth.routes.js";
import oAuthRoutes from "./oAuth.routes.js";
import userRoutes from "./user.routes.js";
import chatRoutes from "./chat.routes.js";
import tenantRoutes from "./tenant.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import billingRoutes from "./billing.routes.js";
import pricingRoutes from "./pricing.routes.js";
import notificationRoutes from "./notification.routes.js";
import widgetRoutes from "./widget.routes.js";
import directMessageRoutes from "./directMessage.routes.js";
import widgetTemplateRoutes from "./widgetTemplate.routes.js";
import faqRoutes from "./faq.routes.js";
import automationRoutes from "./automation.routes.js";
import integrationRoutes from "./integration.routes.js";
import superAdminRoutes from "./superAdmin.routes.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Users
 *   - name: Chat
 *   - name: Tenant
 *   - name: DirectMessages
 *   - name: Widget
 *   - name: Analytics
 *   - name: Billing
 *   - name: Pricing
 *   - name: Notifications
 *   - name: WidgetTemplate
 *   - name: FAQs
 *   - name: Automation
 *   - name: Integrations
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Paste your JWT bearer token below
 */

router.use("/auth", authRoutes);
router.use("/oauth", oAuthRoutes);
router.use("/users", userRoutes);
router.use("/chat", chatRoutes);
router.use("/tenant", tenantRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/billing", billingRoutes);
router.use("/pricing", pricingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/widget", widgetRoutes);
router.use("/widget-templates", widgetTemplateRoutes);
router.use("/direct-messages", directMessageRoutes);
router.use("/faq", faqRoutes);
router.use("/automation", automationRoutes);
router.use("/integrations", integrationRoutes);
router.use("/super-admin", superAdminRoutes);

export default router;
