import express from "express";
import {
  getStats,
  getCommunitiesTimeSeries,
  getPostsTimeSeries,
  getActivityLogs,
} from "../controllers/AdminController";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only analytics and statistics
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get platform statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get total counts of users, communities, and posts. Admin only.
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 totalCommunities:
 *                   type: integer
 *                 totalPosts:
 *                   type: integer
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get("/stats", authenticateToken, authorizeRole(["ADMIN"]), getStats);

/**
 * @swagger
 * /api/admin/analytics/communities/time-series:
 *   get:
 *     summary: Get communities growth over time
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get time-series data showing community creation over months. Admin only.
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 24
 *         description: Number of months to include in the time series
 *     responses:
 *       200:
 *         description: Communities time series data
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
 *                       date:
 *                         type: string
 *                         example: "Dec 24"
 *                       count:
 *                         type: integer
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get(
  "/analytics/communities/time-series",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  getCommunitiesTimeSeries
);

/**
 * @swagger
 * /api/admin/analytics/posts/time-series:
 *   get:
 *     summary: Get posts growth over time
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Get time-series data showing post creation over months with optional filters. Admin only.
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *           minimum: 1
 *           maximum: 24
 *         description: Number of months to include in the time series
 *       - in: query
 *         name: communityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by community ID
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag (partial match)
 *       - in: query
 *         name: resolvedOnly
 *         schema:
 *           type: boolean
 *         description: Only include resolved posts
 *     responses:
 *       200:
 *         description: Posts time series data
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
 *                       date:
 *                         type: string
 *                         example: "Dec 24"
 *                       count:
 *                         type: integer
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get(
  "/analytics/posts/time-series",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  getPostsTimeSeries
);

/**
 * @swagger
 * /api/admin/activity-logs:
 *   get:
 *     summary: Get activity logs with filters and pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all activity logs with support for filtering by user, community, action type, date range, and sorting. Admin only.
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
 *           default: 20
 *           maximum: 100
 *         description: Number of logs per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: communityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by community ID
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: integer
 *         description: Filter by action type code
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs from this date (inclusive)
 *         example: "2024-12-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs until this date (inclusive, end of day)
 *         example: "2024-12-31"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order by date (asc = oldest first, desc = newest first)
 *     responses:
 *       200:
 *         description: Activity logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       associated_uid:
 *                         type: integer
 *                       associated_cid:
 *                         type: string
 *                       description:
 *                         type: string
 *                       action_type:
 *                         type: integer
 *                       User:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           fname:
 *                             type: string
 *                           lname:
 *                             type: string
 *                           email:
 *                             type: string
 *                       Community:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
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
 *                     filters:
 *                       type: object
 *       400:
 *         description: Invalid filter parameters
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get(
  "/activity-logs",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  getActivityLogs
);

export default router;
