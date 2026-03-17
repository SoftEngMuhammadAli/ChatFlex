import express from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  getTeamInviteDetails,
  acceptTeamInvite,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { createRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 80,
  keyPrefix: "auth",
});

router.use(authRateLimiter);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user and workspace
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               workspaceName: { type: string }
 *     responses:
 *       201: { description: Registration successful }
 *       400: { description: Validation error }
 */
router.post("/register", register);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify user email with verification token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified successfully }
 *       400: { description: Invalid or expired token }
 *   get:
 *     summary: Verify user email with verification token from query string
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Email verified successfully }
 *       400: { description: Invalid or expired token }
 */
router.post("/verify-email", verifyEmail);
router.get("/verify-email", verifyEmail);
router.get("/team-invite/details", getTeamInviteDetails);
router.post("/team-invite/accept", acceptTeamInvite);

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Verification email sent }
 */
router.post("/resend-verification", resendVerificationEmail);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       400: { description: Invalid credentials }
 *       403: { description: Email not verified }
 */
router.post("/login", login);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: If email exists, reset link sent }
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Invalid or expired token }
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout current session (cookie clear)
 *     tags: [Auth]
 *     responses:
 *       200: { description: Logout successful }
 */
router.post("/logout", logout);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200: { description: Token refreshed }
 *       401: { description: Missing or invalid refresh token }
 */
router.post("/refresh-token", refreshToken);

export default router;
