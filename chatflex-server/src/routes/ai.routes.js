const express = require("express");
const auth = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const { respond, summarizeConversation } = require("../controllers/ai.controller");

const router = express.Router();

router.post("/respond", auth, allowRoles("owner", "admin", "agent"), respond);
router.get(
  "/conversations/:conversationId/summary",
  auth,
  allowRoles("owner", "admin", "agent"),
  summarizeConversation
);

module.exports = router;
