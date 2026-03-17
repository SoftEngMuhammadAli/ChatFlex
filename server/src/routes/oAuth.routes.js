import express from "express";
import {
  googleLogin,
  githubLogin,
  githubCodeLogin,
} from "../controllers/oAuth.controller.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();
const oauthRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  keyPrefix: "oauth",
});

router.use(oauthRateLimiter);

/**
 * @swagger
 * /api/v1/oauth/google:
 *   post:
 *     summary: Login or register using Google OAuth token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential: { type: string }
 *     responses:
 *       200: { description: Google authentication successful }
 *       400: { description: Invalid OAuth token }
 */
router.post("/google", googleLogin);

/**
 * @swagger
 * /api/v1/oauth/github:
 *   post:
 *     summary: Login or register using GitHub OAuth access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accessToken]
 *             properties:
 *               accessToken: { type: string }
 *     responses:
 *       200: { description: GitHub authentication successful }
 *       400: { description: Invalid OAuth payload }
 */
router.post("/github", githubLogin);

/**
 * @swagger
 * /api/v1/oauth/github/code:
 *   post:
 *     summary: Login or register using GitHub authorization code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *               redirectUri: { type: string }
 *     responses:
 *       200: { description: GitHub authentication successful }
 *       400: { description: Invalid OAuth code payload }
 */
router.post("/github/code", githubCodeLogin);

export default router;
