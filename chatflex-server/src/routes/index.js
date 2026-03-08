const express = require("express");
const authRoutes = require("./auth.routes");
const workspaceRoutes = require("./workspace.routes");
const conversationRoutes = require("./conversation.routes");
const faqRoutes = require("./faq.routes");
const analyticsRoutes = require("./analytics.routes");
const billingRoutes = require("./billing.routes");
const aiRoutes = require("./ai.routes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "chatflex-server" });
});

router.use("/auth", authRoutes);
router.use("/workspace", workspaceRoutes);
router.use("/conversations", conversationRoutes);
router.use("/faqs", faqRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/billing", billingRoutes);
router.use("/ai", aiRoutes);

module.exports = router;
