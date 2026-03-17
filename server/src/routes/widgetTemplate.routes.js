import express from "express";
import {
  createWidgetTemplate,
  getWidgetTemplates,
  getWidgetTemplateScriptById,
  updateWidgetTemplateById,
  deleteWidgetTemplateById,
  getWidgetTemplateFormSubmissions,
  logoUpload,
  uploadWidgetLogo,
} from "../controllers/widgetTemplate.controller.js";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(checkAuth, authorizeRoles("owner", "admin", "super-admin"));

/**
 * @swagger
 * /api/v1/widget-templates:
 *   get:
 *     summary: Get all widget templates
 *     tags: [WidgetTemplate]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of widget templates }
 */
router.get("/", getWidgetTemplates);
router.get("/:id/form-submissions", getWidgetTemplateFormSubmissions);

/**
 * @swagger
 * /api/v1/widget-templates/{id}/script:
 *   get:
 *     summary: Get generated script for a widget template
 *     tags: [WidgetTemplate]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Script tag for the widget }
 *       404: { description: Widget template not found }
 */
router.get("/:id/script", getWidgetTemplateScriptById);

/**
 * @swagger
 * /api/v1/widget-templates:
 *   post:
 *     summary: Create a new widget template
 *     tags: [WidgetTemplate]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               brandColor: { type: string }
 *               position: { type: string, enum: [left, right] }
 *               title: { type: string }
 *               welcomeMessage: { type: string }
 *               logoUrl: { type: string }
 *               width: { type: number }
 *               height: { type: number }
 *               textColor: { type: string }
 *               backgroundColor: { type: string }
 *     responses:
 *       201: { description: Widget template created }
 */
router.post("/", createWidgetTemplate);

/**
 * @swagger
 * /api/v1/widget-templates/{id}:
 *   put:
 *     summary: Update a widget template
 *     tags: [WidgetTemplate]
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
 *               brandColor: { type: string }
 *               position: { type: string }
 *               title: { type: string }
 *               welcomeMessage: { type: string }
 *     responses:
 *       200: { description: Widget template updated }
 *       404: { description: Widget template not found }
 */
router.put("/:id", updateWidgetTemplateById);

/**
 * @swagger
 * /api/v1/widget-templates/{id}:
 *   delete:
 *     summary: Delete a widget template
 *     tags: [WidgetTemplate]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Widget template deleted }
 *       404: { description: Widget template not found }
 */
router.delete("/:id", deleteWidgetTemplateById);

/**
 * @swagger
 * /api/v1/widget-templates/{id}/logo:
 *   post:
 *     summary: Upload widget brand logo
 *     tags: [WidgetTemplate]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200: { description: Logo uploaded }
 *       400: { description: Invalid upload }
 */
router.post("/:id/logo", logoUpload.single("file"), uploadWidgetLogo);

export default router;
