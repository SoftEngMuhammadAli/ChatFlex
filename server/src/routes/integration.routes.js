import express from "express";
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  triggerIntegrationTest,
} from "../controllers/integration.controller.js";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(checkAuth);
router.use(authorizeRoles("owner", "admin", "super-admin"));

router.get("/", getIntegrations);
router.post("/", createIntegration);
router.patch("/:id", updateIntegration);
router.delete("/:id", deleteIntegration);
router.post("/:id/test", triggerIntegrationTest);

export default router;
