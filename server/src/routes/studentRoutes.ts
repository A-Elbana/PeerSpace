import express from "express";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middleware/authMiddleware";
import {
  getStudentDashboard,
  exploreFeed,
} from "../controllers/StudentController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student dashboard and explore feed
 */
/**
 * @swagger
 * /api/student/dashboard:
 *   get:
 *     summary: Get student dashboard data
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     description: "Returns aggregated performance metrics for the authenticated student (enrollments, upcoming assignments, badges, posts, comments, submissions, average grade)."
 *     responses:
 *       200:
 *         description: Dashboard data with student metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     enrollments:
 *                       type: integer
 *                       description: Number of courses enrolled in
 *                     upcomingAssignments:
 *                       type: integer
 *                       description: Count of upcoming assignments in enrolled courses
 *                     badges:
 *                       type: integer
 *                       description: Number of badges earned
 *                     totalPosts:
 *                       type: integer
 *                       description: Total posts created by student
 *                     totalComments:
 *                       type: integer
 *                       description: Total comments made by student
 *                     submissions:
 *                       type: object
 *                       description: Submission statistics
 *                       properties:
 *                         total:
 *                           type: integer
 *                         graded:
 *                           type: integer
 *                         pending:
 *                           type: integer
 *                         averageGrade:
 *                           type: number
 *                           nullable: true
 *                     upcomingTasks:
 *                       type: array
 *                       description: Upcoming tasks for schedule
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           status:
 *                             type: integer
 *                           priority:
 *                             type: integer
 *                             nullable: true
 *                           start_date:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           end_date:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/dashboard", authenticateToken, getStudentDashboard);

// High-performance explore feed for students (supports filters + cursor pagination)
/**
 * @swagger
 * /api/student/explore:
 *   get:
 *     summary: Explore feed for students (high-performance)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     description: "Cursor-based feed optimized for infinite scroll. Supports filters and two sort modes: new (default) and top (by vote score)."
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items to return (max 50)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [new, top]
 *           default: new
 *         description: "Sort order: new or top"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by post category/type
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags to filter by
 *     responses:
 *       200:
 *         description: Feed results with meta for pagination
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
 *                       type:
 *                         type: string
 *                       post_date:
 *                         type: string
 *                         format: date-time
 *                       body:
 *                         type: string
 *                       User:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           fname:
 *                             type: string
 *                           lname:
 *                             type: string
 *                       PostFileAttachment:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             fid:
 *                               type: string
 *                               format: uuid
 *                             File:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 public_id:
 *                                   type: string
 *                                 secure_url:
 *                                   type: string
 *                                 is_private:
 *                                   type: boolean
 *                       PostTag:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             tag:
 *                               type: string
 *                       votes:
 *                         type: object
 *                         properties:
 *                           upvotes:
 *                             type: integer
 *                           downvotes:
 *                             type: integer
 *                           score:
 *                             type: integer
 *                           userVote:
 *                             type: boolean
 *                             nullable: true
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     sort:
 *                       type: string
 *                     filters:
 *                       type: object
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get("/explore", optionalAuthenticateToken, exploreFeed);

export default router;
