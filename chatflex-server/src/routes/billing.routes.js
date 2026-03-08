const express = require("express");
const auth = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  getPlans,
  getUsage,
  createCheckoutSession,
  stripeWebhook
} = require("../controllers/billing.controller");

const router = express.Router();

router.get("/plans", getPlans);
router.get("/usage", auth, allowRoles("owner", "admin"), getUsage);
router.post("/checkout", auth, allowRoles("owner"), createCheckoutSession);
router.post("/webhook", stripeWebhook);

module.exports = router;
