import express from "express";
import { checkAuth } from "../middleware/auth.middleware.js";
import {
  deleteMyAccount,
  deleteWorkspaceData,
  exportMyData,
} from "../controllers/privacy.controller.js";

const router = express.Router();

router.use(checkAuth);

router.get("/me/export", exportMyData);
router.delete("/me", deleteMyAccount);

// Super-admin destructive delete
router.delete("/workspace/:workspaceId", deleteWorkspaceData);

export default router;

