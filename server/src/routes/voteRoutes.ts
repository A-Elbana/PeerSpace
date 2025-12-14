import express from "express";
import {
  votePost,
  removeVote,
  getVoteInfo,
} from "../controllers/VoteController";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middleware/authMiddleware";
import {
  requireStudentRole,
  validateVoteRequest,
} from "../middleware/voteMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Votes
 *   description: Post voting management
 */

/**
 * @swagger
 * /api/votes:
 *   post:
 *     summary: Vote on a post
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Vote on a post (upvote or downvote). Only students can vote.
 *       - If the user hasn't voted, a new vote is created
 *       - If the user has voted differently, the vote is updated
 *       - If the user has voted the same way, no change occurs
 *       - For PRIVATE community posts, the student must be enrolled
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - voteType
 *             properties:
 *               postId:
 *                 type: integer
 *                 description: The ID of the post to vote on
 *                 example: 1
 *               voteType:
 *                 type: boolean
 *                 description: true for upvote, false for downvote
 *                 example: true
 *     responses:
 *       201:
 *         description: Vote recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 vote:
 *                   type: object
 *                   properties:
 *                     sid:
 *                       type: integer
 *                     pid:
 *                       type: integer
 *                     voteType:
 *                       type: boolean
 *       200:
 *         description: Vote updated or already recorded
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not a student or not enrolled in private community
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateToken,
  requireStudentRole,
  validateVoteRequest,
  votePost
);

/**
 * @swagger
 * /api/votes/{postId}:
 *   delete:
 *     summary: Remove vote from a post
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     description: Remove the current user's vote from a post. Only students who have voted can remove their vote.
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the post
 *     responses:
 *       200:
 *         description: Vote removed successfully
 *       400:
 *         description: Invalid post ID
 *       403:
 *         description: Not a student
 *       404:
 *         description: Vote not found
 *       500:
 *         description: Server error
 */
router.delete("/:postId", authenticateToken, requireStudentRole, removeVote);

/**
 * @swagger
 * /api/votes/{postId}:
 *   get:
 *     summary: Get vote information for a post
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     description: |
 *       Get vote counts (upvotes, downvotes, score) and the current user's vote if authenticated.
 *       - Public endpoint: guests can view vote counts
 *       - If authenticated as a student, also returns the user's current vote
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the post
 *     responses:
 *       200:
 *         description: Vote information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 postId:
 *                   type: integer
 *                 upvotes:
 *                   type: integer
 *                   description: Number of upvotes
 *                 downvotes:
 *                   type: integer
 *                   description: Number of downvotes
 *                 score:
 *                   type: integer
 *                   description: Upvotes minus downvotes
 *                 userVote:
 *                   type: boolean
 *                   nullable: true
 *                   description: null if not voted, true if upvoted, false if downvoted
 *       400:
 *         description: Invalid post ID
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get("/:postId", optionalAuthenticateToken, getVoteInfo);

export default router;
