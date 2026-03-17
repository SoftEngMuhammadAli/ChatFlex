import express from "express";
import {
  finishOidcLogin,
  getOidcConfig,
  startOidcLogin,
  updateOidcConfig,
} from "../controllers/sso.controller.js";
import { checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public login start/callback
router.get("/oidc/:workspaceId/start", startOidcLogin);
router.get("/oidc/:workspaceId/callback", finishOidcLogin);

// Workspace config (auth required)
router.get("/oidc/:workspaceId/config", checkAuth, getOidcConfig);
router.put("/oidc/:workspaceId/config", checkAuth, updateOidcConfig);

export default router;

