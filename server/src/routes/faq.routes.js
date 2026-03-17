import express from "express";
import {
  getSuperAdminFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  updateFaqOrder,
  getFaqById,
  getFaqCategories,
  getFaqByCategory,
  getPublishedFaqs,
  getPublishedFaqsByCategory,
  searchFaqs,
  exportFaqCsv,
  importFaqCsv,
  getFaqVersions,
} from "../controllers/faq.controller.js";
import { authorizeRoles, checkAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes are protected and restricted to workspace managers
router.use(checkAuth);
router.use(authorizeRoles("owner", "admin", "super-admin"));

/**
 * @swagger
 * /api/v1/faq:
 *   get:
 *     summary: Get all FAQs for current workspace
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: FAQ list
 */
router.get("/", getSuperAdminFaqs);

/**
 * @swagger
 * /api/v1/faq:
 *   post:
 *     summary: Create a FAQ
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [published, unpublished]
 *     responses:
 *       201:
 *         description: FAQ created
 */
router.post("/", createFaq);

/**
 * IMPORTANT
 * This route must be BEFORE /:id
 */

/**
 * @swagger
 * /api/v1/faq/reorder:
 *   put:
 *     summary: Reorder FAQs
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: number
 *     responses:
 *       200:
 *         description: FAQ order updated
 */
router.put("/reorder", updateFaqOrder);

/**
 * @swagger
 * /api/v1/faq/categories:
 *   get:
 *     summary: Get FAQ categories
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Category list
 */
router.get("/categories", getFaqCategories);

/**
 * @swagger
 * /api/v1/faq/category/{category}:
 *   get:
 *     summary: Get FAQs by category
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: FAQs for category
 */
router.get("/category/:category", getFaqByCategory);

/**
 * @swagger
 * /api/v1/faq/published:
 *   get:
 *     summary: Get published FAQs
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Published FAQ list
 */
router.get("/published", getPublishedFaqs);

/**
 * @swagger
 * /api/v1/faq/published/category/{category}:
 *   get:
 *     summary: Get published FAQs by category
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Published FAQs for category
 */
router.get("/published/category/:category", getPublishedFaqsByCategory);

/**
 * @swagger
 * /api/v1/faq/search:
 *   get:
 *     summary: Search FAQs by query string
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", searchFaqs);
router.get("/export/csv", exportFaqCsv);
router.post("/import/csv", importFaqCsv);
router.get("/:id/versions", getFaqVersions);

/**
 * @swagger
 * /api/v1/faq/{id}:
 *   put:
 *     summary: Update a FAQ by id
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: FAQ updated
 */
router.put("/:id", updateFaq);

/**
 * @swagger
 * /api/v1/faq/{id}:
 *   get:
 *     summary: Get a FAQ by id
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ details
 *       404:
 *         description: FAQ not found
 */
router.get("/:id", getFaqById);

/**
 * @swagger
 * /api/v1/faq/{id}:
 *   delete:
 *     summary: Delete a FAQ by id
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ deleted
 */
router.delete("/:id", deleteFaq);

export default router;
