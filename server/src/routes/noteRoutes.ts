import express from "express";
import {
  createNote,
  getMyNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../controllers/NoteController";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  loadNote,
  authorizeNoteAccess,
  validateNotebookOwnership,
} from "../middleware/noteMiddleware";
import {
  validateNoteCreate,
  validateNoteUpdate,
  handleValidationErrors,
} from "../middleware/validationMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Personal note management
 */

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new personal note.
 *       The owner_uid is automatically set from the authenticated user's token.
 *       Notes can optionally belong to a notebook.
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
 *                 description: Note title
 *                 example: "Meeting Notes"
 *               body:
 *                 type: string
 *                 description: Note content (optional)
 *                 example: "Discussed project timeline and deliverables..."
 *               notebook_id:
 *                 type: integer
 *                 description: ID of the notebook to add this note to (optional)
 *                 example: 1
 *     responses:
 *       201:
 *         description: Note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 body:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 owner_uid:
 *                   type: integer
 *                 notebook_id:
 *                   type: integer
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Cannot add note to another user's notebook
 *       404:
 *         description: Notebook not found
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateToken,
  validateNoteCreate,
  handleValidationErrors,
  validateNotebookOwnership,
  createNote
);

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get my notes
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve all notes owned by the authenticated user with pagination.
 *       Can filter by notebook_id to get notes from a specific notebook.
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
 *         description: Number of notes per page
 *       - in: query
 *         name: notebook_id
 *         schema:
 *           type: integer
 *         description: Filter by notebook ID (optional)
 *       - in: query
 *         name: standalone
 *         schema:
 *           type: boolean
 *         description: If true, only return notes not in any notebook
 *     responses:
 *       200:
 *         description: List of notes with pagination metadata
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
 *                       body:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       owner_uid:
 *                         type: integer
 *                       notebook_id:
 *                         type: integer
 *                       Notebook:
 *                         type: object
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
router.get("/", authenticateToken, getMyNotes);

/**
 * @swagger
 * /api/notes/{id}:
 *   get:
 *     summary: Get note by ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve a specific note by ID.
 *       Only the note owner or admins can view the note.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 body:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 owner_uid:
 *                   type: integer
 *                 notebook_id:
 *                   type: integer
 *                 Notebook:
 *                   type: object
 *                   description: Notebook the note belongs to (if any)
 *                 User:
 *                   type: object
 *                   description: Note owner
 *                 NoteFileAttachment:
 *                   type: array
 *                   description: Attached files
 *       400:
 *         description: Invalid note ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Can only access your own notes
 *       404:
 *         description: Note not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  authenticateToken,
  loadNote,
  authorizeNoteAccess,
  getNoteById
);

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update a note's details.
 *       Only the note owner or an admin can update it.
 *       Can move note to a different notebook or remove from notebook by setting notebook_id to null.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Note ID
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
 *                 description: Note title
 *               body:
 *                 type: string
 *                 description: Note content
 *               notebook_id:
 *                 type: integer
 *                 nullable: true
 *                 description: Notebook ID (set to null to remove from notebook)
 *     responses:
 *       200:
 *         description: Note updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 note:
 *                   type: object
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Can only update your own notes
 *       404:
 *         description: Note not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticateToken,
  loadNote,
  authorizeNoteAccess,
  validateNoteUpdate,
  handleValidationErrors,
  validateNotebookOwnership,
  updateNote
);

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Delete a note.
 *       Only the note owner or an admin can delete it.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Note deleted successfully"
 *       400:
 *         description: Invalid note ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Can only delete your own notes
 *       404:
 *         description: Note not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticateToken,
  loadNote,
  authorizeNoteAccess,
  deleteNote
);

export default router;
