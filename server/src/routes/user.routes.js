import express from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  avatarUpload,
  uploadCurrentUserAvatar,
  deleteCurrentUserAvatar,
  deleteUserById,
  getUserByRole,
  assignRoleToUser,
} from "../controllers/user.controller.js";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(checkAuth);

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   post:
 *     summary: Assign role to a workspace user
 *     tags: [Users]
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [owner, admin, agent, viewer] }
 *     responses:
 *       200: { description: Role assigned }
 *       403: { description: Forbidden }
 *       404: { description: User not found }
 */
router.post(
  "/:id/role",
  authorizeRoles("owner", "admin", "super-admin"),
  assignRoleToUser,
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create user in current workspace
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               role: { type: string, enum: [owner, admin, agent, viewer, super-admin] }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Invalid request }
 *       403: { description: Forbidden }
 *   get:
 *     summary: Get workspace users
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User list }
 */
router.post("/", authorizeRoles("owner", "admin", "super-admin"), createUser);
router.get("/", authorizeRoles("owner", "admin", "super-admin"), getAllUsers);

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user profile }
 *   put:
 *     summary: Update current authenticated user profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               profilePictureUrl: { type: string }
 *     responses:
 *       200: { description: Profile updated }
 */
router.get("/me", getCurrentUserProfile);
router.put("/me", updateCurrentUserProfile);

/**
 * @swagger
 * /api/v1/users/me/avatar:
 *   post:
 *     summary: Upload current user avatar
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Avatar uploaded }
 *       400: { description: Invalid upload }
 *   delete:
 *     summary: Delete current user avatar
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Avatar deleted }
 */
router.post("/me/avatar", avatarUpload.single("file"), uploadCurrentUserAvatar);
router.delete("/me/avatar", deleteCurrentUserAvatar);

/**
 * @swagger
 * /api/v1/users/role/{role}:
 *   get:
 *     summary: Get workspace users by role
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Users found }
 *       404: { description: No users found for role }
 */
router.get(
  "/role/:role",
  authorizeRoles("owner", "admin", "super-admin"),
  getUserByRole,
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by id
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User found }
 *       404: { description: User not found }
 *   put:
 *     summary: Update user by id
 *     tags: [Users]
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
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 *   delete:
 *     summary: Delete user by id
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       404: { description: User not found }
 */
router.get(
  "/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  getUserById,
);
router.put(
  "/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  updateUserById,
);
router.delete(
  "/:id",
  authorizeRoles("owner", "admin", "super-admin"),
  deleteUserById,
);

export default router;
