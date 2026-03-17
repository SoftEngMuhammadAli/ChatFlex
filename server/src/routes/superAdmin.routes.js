import express from "express";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";
import {
  getGlobalModelConfig,
  getWorkspaceMonitoring,
  scanWorkspaceAbuse,
  startWorkspaceImpersonation,
  stopWorkspaceImpersonation,
  updateGlobalModelConfig,
  updateWorkspaceSuspension,
} from "../controllers/superAdmin.controller.js";

const router = express.Router();

router.use(checkAuth);

router.get("/workspaces", authorizeRoles("super-admin"), getWorkspaceMonitoring);
router.post(
  "/workspaces/:workspaceId/abuse-scan",
  authorizeRoles("super-admin"),
  scanWorkspaceAbuse,
);
router.patch(
  "/workspaces/:workspaceId/suspension",
  authorizeRoles("super-admin"),
  updateWorkspaceSuspension,
);

router.get(
  "/global-model-config",
  authorizeRoles("super-admin"),
  getGlobalModelConfig,
);
router.put(
  "/global-model-config",
  authorizeRoles("super-admin"),
  updateGlobalModelConfig,
);

router.post(
  "/impersonate",
  authorizeRoles("super-admin"),
  startWorkspaceImpersonation,
);
router.post("/impersonation/stop", stopWorkspaceImpersonation);

export default router;
