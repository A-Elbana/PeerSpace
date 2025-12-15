import express from "express";
import {
  getStats,
  getCommunitiesTimeSeries,
  getPostsTimeSeries,
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

export default router;
