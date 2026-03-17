import express from "express";
import {
  createWorkspace,
  getWorkspaceSettings,
  updateWorkspaceSettings,
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  inviteTeamMember,
  resendTeamInvitation,
  updateTeamMember,
  deleteTeamMember,
} from "../controllers/tenant.controller.js";
import { checkAuth, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(checkAuth);

/**
 * @swagger
 * /api/v1/tenant/workspaces:
 *   post:
 *     summary: Create workspace
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ownerId: { type: string }
 *               name: { type: string }
 *               plan: { type: string }
 *               limits: { type: object }
 *               allowedDomains:
 *                 type: array
 *                 items: { type: string }
 *               settings: { type: object }
 *               aiSettings: { type: object }
 *     responses:
 *       201: { description: Workspace created }
 *       400: { description: Invalid request }
 *       403: { description: Forbidden }
 */
router.post(
  "/workspaces",
  authorizeRoles("owner", "super-admin"),
  createWorkspace,
);

/**
 * @swagger
 * /api/v1/tenant/settings:
 *   get:
 *     summary: Get workspace settings for current user workspace
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Workspace settings }
 *       404: { description: Workspace not found }
 *   put:
 *     summary: Update workspace settings
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               settings: { type: object }
 *               limits: { type: object }
 *               allowedDomains:
 *                 type: array
 *                 items: { type: string }
 *               aiSettings: { type: object }
 *               plan: { type: string }
 *     responses:
 *       200: { description: Workspace updated }
 *       403: { description: Forbidden }
 *       404: { description: Workspace not found }
 */
router.get("/settings", getWorkspaceSettings);
router.put(
  "/settings",
  authorizeRoles("owner", "admin", "super-admin"),
  updateWorkspaceSettings,
);

/**
 * @swagger
 * /api/v1/tenant/team:
 *   get:
 *     summary: Get team members in current workspace
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: includeWidgetVisitors
 *         required: false
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Team list }
 *       400: { description: Workspace missing }
 */
router.get("/team", getTeamMembers);

/**
 * @swagger
 * /api/v1/tenant/team:
 *   post:
 *     summary: Create team member directly
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [admin, agent, viewer, owner, super-admin] }
 *               password: { type: string }
 *               workspaceId: { type: string }
 *     responses:
 *       201: { description: Team member created }
 *       400: { description: Invalid request }
 *       403: { description: Forbidden }
 */
router.post(
  "/team",
  authorizeRoles("owner", "admin", "super-admin"),
  createTeamMember,
);

/**
 * @swagger
 * /api/v1/tenant/team/invite:
 *   post:
 *     summary: Invite team member via email
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [admin, agent, viewer, owner, super-admin] }
 *               workspaceId: { type: string }
 *     responses:
 *       200: { description: Invitation email sent }
 *       400: { description: Invalid request }
 *       403: { description: Forbidden }
 */
router.post(
  "/team/invite",
  authorizeRoles("owner", "admin", "super-admin"),
  inviteTeamMember,
);

/**
 * @swagger
 * /api/v1/tenant/team/{id}:
 *   get:
 *     summary: Get one team member by id
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Team member }
 *       404: { description: Team member not found }
 *   put:
 *     summary: Update team member
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [admin, agent, viewer, owner, super-admin] }
 *               password: { type: string }
 *     responses:
 *       200: { description: Team member updated }
 *       400: { description: Invalid request }
 *       403: { description: Forbidden }
 *       404: { description: Team member not found }
 *   delete:
 *     summary: Delete team member
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Team member deleted }
 *       403: { description: Forbidden }
 *       404: { description: Team member not found }
 */
router.get("/team/:id", getTeamMemberById);
router.put(
  "/team/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  updateTeamMember,
);
router.delete(
  "/team/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  deleteTeamMember,
);

/**
 * @swagger
 * /api/v1/tenant/team/{id}/resend-invite:
 *   post:
 *     summary: Resend team invitation email for pending invite
 *     tags: [Tenant]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Invitation email resent }
 *       400: { description: Invalid state or request }
 *       403: { description: Forbidden }
 *       404: { description: Team member not found }
 */
router.post(
  "/team/:id/resend-invite",
  authorizeRoles("owner", "admin", "super-admin"),
  resendTeamInvitation,
);

export default router;
