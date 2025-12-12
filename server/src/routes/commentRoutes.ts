import express from "express";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import {
  createComment,
  getCommentsByPost,
  getCommentById,
  updateComment,
  deleteComment,
  approveByInstructor,
  approveByOriginalPoster,
  getUnapprovedComments,
  getCommentCount,
} from "../controllers/CommentController";
import {
  loadComment,
  authorizeCommentOwner,
  authorizePostOwner,
  authorizeInstructorApproval,
} from "../middleware/commentMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Post comments and replies (Stack Overflow style - all comments visible, approval is badges)
 */

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create a new comment on a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pid, content]
 *             properties:
 *               pid:
 *                 type: integer
 *               content:
 *                 type: string
 *               parentCommentId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Comment created
 */
router.post("/", authenticateToken, createComment);

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get all comments for a post (always visible, sorted by date or approval)
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: pid
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: ["date", "approved"]
 *           default: date
 *         description: "date: chronological order, approved: instructor/poster approved first"
 *       - in: query
 *         name: includeReplies
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of all comments (visible regardless of approval status)
 */
router.get("/", getCommentsByPost);

/**
 * @swagger
 * /api/comments/count:
 *   get:
 *     summary: Get comment count stats for a post
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: pid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment count statistics
 */
router.get("/count", getCommentCount);

/**
 * @swagger
 * /api/comments/pending:
 *   get:
 *     summary: Get unapproved comments for instructor review (for moderation dashboard)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pid
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Comments not yet approved by instructor
 */
router.get("/pending", authenticateToken, getUnapprovedComments);

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Get a specific comment by id
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment details
 */
router.get("/:id", getCommentById);

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Update a comment (owner only)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated comment
 */
router.put(
  "/:id",
  authenticateToken,
  loadComment,
  authorizeCommentOwner,
  updateComment
);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment (owner or admin)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted
 */
router.delete(
  "/:id",
  authenticateToken,
  loadComment,
  authorizeCommentOwner,
  deleteComment
);

/**
 * @swagger
 * /api/comments/{id}/approve-inst:
 *   patch:
 *     summary: Mark comment as "Correct Answer" by instructor (like Stack Overflow checkmark)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment marked as instructor-approved (badge will show on frontend)
 */
router.patch(
  "/:id/approve-inst",
  authenticateToken,
  loadComment,
  authorizeInstructorApproval,
  approveByInstructor
);

/**
 * @swagger
 * /api/comments/{id}/approve-op:
 *   patch:
 *     summary: Mark comment as helpful by original post owner (question asker's endorsement)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment marked as poster-approved (badge will show on frontend)
 */
router.patch(
  "/:id/approve-op",
  authenticateToken,
  loadComment,
  authorizePostOwner,
  approveByOriginalPoster
);

export default router;
