const express = require("express");
const auth = require("../middleware/auth");
const allowRoles = require("../middleware/role");
const {
  getWorkspace,
  updateWorkspaceSettings,
  listWorkspaceUsers,
  inviteUser
} = require("../controllers/workspace.controller");

const router = express.Router();

router.get("/", auth, getWorkspace);
router.patch("/settings", auth, allowRoles("owner", "admin"), updateWorkspaceSettings);
router.get("/users", auth, allowRoles("owner", "admin"), listWorkspaceUsers);
router.post("/invite", auth, allowRoles("owner", "admin"), inviteUser);

module.exports = router;
