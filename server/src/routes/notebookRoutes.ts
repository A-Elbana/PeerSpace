import express from "express";
import {
  createNotebook,
  getMyNotebooks,
  getNotebookById,
  updateNotebook,
  deleteNotebook,
} from "../controllers/NotebookController";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  loadNotebook,
  authorizeNotebookAccess,
} from "../middleware/notebookMiddleware";
import {
  validateNotebookCreate,
  validateNotebookUpdate,
  handleValidationErrors,
} from "../middleware/validationMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notebooks
 *   description: Personal notebook management (collections of notes)
 */

/**
 * @swagger
 * /api/notebooks:
 *   post:
 *     summary: Create a notebook
 *     tags: [Notebooks]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new personal notebook.
 *       The owner_uid is automatically set from the authenticated user's token.
 *       Notebooks are containers for organizing notes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Notebook title
 *                 example: "Database Course Notes"
 *               description:
 *                 type: string
 *                 description: Notebook description (optional)
 *                 example: "All my notes for the Database Systems course"
 *     responses:
 *       201:
 *         description: Notebook created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 owner_uid:
 *                   type: integer
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateToken,
  validateNotebookCreate,
  handleValidationErrors,
  createNotebook
);

/**
 * @swagger
 * /api/notebooks:
 *   get:
 *     summary: Get my notebooks
 *     tags: [Notebooks]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve all notebooks owned by the authenticated user with pagination.
 *       Each notebook includes a count of notes it contains.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of notebooks per page
 *     responses:
 *       200:
 *         description: List of notebooks with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       owner_uid:
 *                         type: integer
 *                       _count:
 *                         type: object
 *                         properties:
 *                           Note:
 *                             type: integer
 *                             description: Number of notes in the notebook
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, getMyNotebooks);

/**
 * @swagger
 * /api/notebooks/{id}:
 *   get:
 *     summary: Get notebook by ID
 *     tags: [Notebooks]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve a specific notebook by ID.
 *       Includes a list of all notes in the notebook.
 *       Only the notebook owner or admins can view the notebook.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notebook ID
 *     responses:
 *       200:
 *         description: Notebook details with notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 owner_uid:
 *                   type: integer
 *                 User:
 *                   type: object
 *                   description: Notebook owner
 *                 Note:
 *                   type: array
 *                   description: Notes in this notebook
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 _count:
 *                   type: object
 *                   properties:
 *                     Note:
 *                       type: integer
 *       400:
 *         description: Invalid notebook ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Can only access your own notebooks
 *       404:
 *         description: Notebook not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  authenticateToken,
  loadNotebook,
  authorizeNotebookAccess,
  getNotebookById
);

/**
 * @swagger
 * /api/notebooks/{id}:
 *   put:
 *     summary: Update a notebook
 *     tags: [Notebooks]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update a notebook's details.
 *       Only the notebook owner or an admin can update it.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notebook ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Notebook title
 *                 example: "Updated Notebook Title"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Notebook description (set to null to clear)
 *                 example: "Updated description for my notebook"
 *     responses:
 *       200:
 *         description: Notebook updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 notebook:
 *                   type: object
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Can only update your own notebooks
 *       404:
 *         description: Notebook not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticateToken,
  loadNotebook,
  authorizeNotebookAccess,
  validateNotebookUpdate,
  handleValidationErrors,
  updateNotebook
);

/**
 * @swagger
 * /api/notebooks/{id}:
 *   delete:
 *     summary: Delete a notebook
 *     tags: [Notebooks]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Delete a notebook and all notes inside it.
 *       Only the notebook owner or an admin can delete it.
 *       **Warning:** This will permanently delete all notes in the notebook.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notebook ID
 *     responses:
 *       200:
 *         description: Notebook deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notebook deleted successfully"
 *       400:
 *         description: Invalid notebook ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Can only delete your own notebooks
 *       404:
 *         description: Notebook not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticateToken,
  loadNotebook,
  authorizeNotebookAccess,
  deleteNotebook
);

export default router;
