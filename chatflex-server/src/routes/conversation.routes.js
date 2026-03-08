const express = require("express");
const auth = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  listConversations,
  getConversationMessages,
  createConversation,
  assignConversation,
  updateConversation,
  addNote,
  addMessage,
  createPublicConversation,
  addPublicMessage,
  getPublicMessages
} = require("../controllers/conversation.controller");

const router = express.Router();

router.get("/", auth, listConversations);
router.post("/", auth, createConversation);
router.get("/:conversationId", auth, getConversationMessages);
router.patch("/:conversationId", auth, updateConversation);
router.patch("/:conversationId/assign", auth, allowRoles("owner", "admin", "agent"), assignConversation);
router.post("/:conversationId/notes", auth, allowRoles("owner", "admin", "agent"), addNote);
router.post("/:conversationId/messages", auth, allowRoles("owner", "admin", "agent"), addMessage);

router.post("/public/:workspaceId", createPublicConversation);
router.post("/public/:workspaceId/:conversationId/messages", addPublicMessage);
router.get("/public/:workspaceId/:conversationId/messages", getPublicMessages);

module.exports = router;
