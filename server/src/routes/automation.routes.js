import express from "express";
import {
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  testAutomationRules,
  getCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  getWorkflowTasks,
  createWorkflowTask,
  processWorkflowTasksNow,
} from "../controllers/automation.controller.js";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(checkAuth);

router.get(
  "/rules",
  authorizeRoles("owner", "admin", "super-admin"),
  getAutomationRules,
);
router.post(
  "/rules",
  authorizeRoles("owner", "admin", "super-admin"),
  createAutomationRule,
);
router.patch(
  "/rules/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  updateAutomationRule,
);
router.delete(
  "/rules/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  deleteAutomationRule,
);
router.post(
  "/rules/test",
  authorizeRoles("owner", "admin", "super-admin"),
  testAutomationRules,
);

router.get(
  "/canned-responses",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  getCannedResponses,
);
router.post(
  "/canned-responses",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  createCannedResponse,
);
router.patch(
  "/canned-responses/:id",
  authorizeRoles("owner", "admin", "agent", "super-admin"),
  updateCannedResponse,
);
router.delete(
  "/canned-responses/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  deleteCannedResponse,
);

router.get(
  "/workflows/tasks",
  authorizeRoles("owner", "admin", "super-admin"),
  getWorkflowTasks,
);
router.post(
  "/workflows/tasks",
  authorizeRoles("owner", "admin", "super-admin"),
  createWorkflowTask,
);
router.post(
  "/workflows/process-now",
  authorizeRoles("owner", "admin", "super-admin"),
  processWorkflowTasksNow,
);

export default router;
