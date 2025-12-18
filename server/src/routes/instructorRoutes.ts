import express from "express";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import {
  getInstructorFeedPosts,
  getUnresolvedPosts,
  getMyCommunities,
  getMyAssignments,
  getManagedSubmissions,
  getInstructorInsights,
} from "../controllers/InstructorController";
import { loadSubmission, authorizeSubmissionManage } from "../middleware/submissionMiddleware";
import { gradeSubmission } from "../controllers/SubmissionController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Instructor
 *   description: Instructor-specific endpoints and analytics
 */

/**
 * @swagger
 * /api/instructor/communities:
 *   get:
 *     summary: Get my managed communities (paginated)
 *     tags: [Instructor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           maximum: 50
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or UUID
 *     responses:
 *       200:
 *         description: List of managed communities with counts and banner URLs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/communities",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  getMyCommunities
);

/**
 * @swagger
 * /api/instructor/assignments:
 *   get:
 *     summary: Get assignments created by the authenticated instructor
 *     tags: [Instructor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           maximum: 50
 *       - in: query
 *         name: cid
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional community UUID to filter assignments
 *     responses:
 *       200:
 *         description: Paginated assignments created by the instructor
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/assignments",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  getMyAssignments
);

/**
 * @swagger
 * /api/instructor/feed/posts:
 *   get:
 *     summary: Get feed posts from managed communities
 *     tags: [Instructor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           maximum: 50
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by post resolution status
 *       - in: query
 *         name: cid
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by community UUID (single or comma-separated)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: ['new', 'top']
 *           default: 'new'
 *         description: Sort by newest (post_date desc) or top (vote score desc)
 *     responses:
 *       200:
 *         description: Paginated posts with author, attachments, tags, and vote counts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to requested communities
 *       500:
 *         description: Server error
 */
router.get(
  "/feed/posts",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  getInstructorFeedPosts
);

/**
 * @swagger
 * /api/instructor/posts/unresolved:
 *   get:
 *     summary: Get unresolved posts from managed communities
 *     tags: [Instructor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           maximum: 50
 *       - in: query
 *         name: cid
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by community UUID
 *     responses:
 *       200:
 *         description: Paginated unresolved posts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No access to requested communities
 *       500:
 *         description: Server error
 */
router.get(
  "/posts/unresolved",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  getUnresolvedPosts
);

/**
 * @swagger
 * /api/instructor/submissions:
 *   get:
 *     summary: Get submissions across managed communities
 *     tags: [Instructor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           maximum: 50
 *       - in: query
 *         name: cid
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by community UUID
 *       - in: query
 *         name: aid
 *         schema:
 *           type: integer
 *         description: Filter by assignment ID
 *       - in: query
 *         name: graded
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by grading status
 *       - in: query
 *         name: sid
 *         schema:
 *           type: integer
 *         description: Filter by student ID
 *     responses:
 *       200:
 *         description: Paginated submissions with assignment and student details
 *       400:
 *         description: Invalid filter parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not managing requested community
 *       500:
 *         description: Server error
 */
router.get(
  "/submissions",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  getManagedSubmissions
);

/**
 * @swagger
 * /api/instructor/submissions/{id}/grade:
 *   patch:
 *     summary: Grade a submission
 *     tags: [Instructor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [grade]
 *             properties:
 *               grade:
 *                 type: number
 *                 description: Numeric grade to assign
 *               feedback:
 *                 type: string
 *                 description: Optional feedback for student
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *       400:
 *         description: Invalid submission ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not managing submission's community
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/submissions/:id/grade",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  loadSubmission,
  authorizeSubmissionManage,
  gradeSubmission
);

/**
 * @swagger
 * /api/instructor/insights:
 *   get:
 *     summary: Get analytics and insights for managed communities
 *     tags: [Instructor]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Get overview analytics across all managed communities, or detailed metrics for a specific community.
 *       Without `cid`: returns per-community summary (posts, unresolved, submissions counts).
 *       With `cid`: returns deep metrics including average grade and top students by submissions.
 *     parameters:
 *       - in: query
 *         name: cid
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Optional community UUID for detailed insights
 *     responses:
 *       200:
 *         description: |
 *           Overview (no cid): Array of communities with basic metrics.
 *           Detailed (with cid): Single community with full metrics including topStudents and averageGrade.
 *       400:
 *         description: Invalid community UUID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not managing requested community
 *       500:
 *         description: Server error
 */
router.get(
  "/insights",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  getInstructorInsights
);

export default router;
