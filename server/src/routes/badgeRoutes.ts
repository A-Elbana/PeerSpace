import { Router } from "express";
import {
  createBadge,
  getAllBadges,
  getBadgeById,
  getMyBadges,
  getBadgesByUserId,
  updateBadge,
  deleteBadge,
} from "../controllers/BadgeController";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import {
  validateBadgeCreate,
  validateBadgeUpdate,
  handleValidationErrors,
} from "../middleware/validationMiddleware";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Badge:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique badge identifier
 *         name:
 *           type: string
 *           description: Badge name
 *         icon_url:
 *           type: string
 *           format: uri
 *           description: URL to the badge icon
 *         _count:
 *           type: object
 *           properties:
 *             StudentBadge:
 *               type: integer
 *               description: Number of students who have this badge
 *     BadgeCreateInput:
 *       type: object
 *       required:
 *         - name
 *         - icon_url
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Badge name
 *         icon_url:
 *           type: string
 *           format: uri
 *           description: URL to the badge icon
 *     BadgeUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Badge name
 *         icon_url:
 *           type: string
 *           format: uri
 *           description: URL to the badge icon
 *     BadgePaginatedResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Badge'
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 */

/**
 * @swagger
 * /api/badges:
 *   post:
 *     summary: Create a new badge (Admin only)
 *     description: Create a new badge. Only administrators can create badges.
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BadgeCreateInput'
 *           example:
 *             name: "Top Contributor"
 *             icon_url: "https://example.com/icons/top-contributor.png"
 *     responses:
 *       201:
 *         description: Badge created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Badge created successfully"
 *                 badge:
 *                   $ref: '#/components/schemas/Badge'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       409:
 *         description: Badge with this name already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  validateBadgeCreate,
  handleValidationErrors,
  createBadge
);

/**
 * @swagger
 * /api/badges:
 *   get:
 *     summary: Get all badges
 *     description: Retrieve all badges with pagination. Accessible to all authenticated users.
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
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
 *           maximum: 50
 *         description: Badges per page
 *     responses:
 *       200:
 *         description: Badges retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadgePaginatedResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, getAllBadges);

/**
 * @swagger
 * /api/badges/me:
 *   get:
 *     summary: Get badges earned by the authenticated student
 *     description: Retrieve badges assigned to the logged-in student with pagination.
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
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
 *           maximum: 50
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Badges retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only students can view their badges
 *       500:
 *         description: Server error
 */
router.get("/me", authenticateToken, getMyBadges);

/**
 * @swagger
 * /api/badges/user/{userId}:
 *   get:
 *     summary: Get badges earned by a specific user
 *     description: Retrieve badges assigned to the given user ID with pagination.
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Target user ID
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
 *           maximum: 50
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Badges retrieved successfully
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student profile not found for the given user ID
 *       500:
 *         description: Server error
 */
router.get("/user/:userId", authenticateToken, getBadgesByUserId);

/**
 * @swagger
 * /api/badges/{id}:
 *   get:
 *     summary: Get a badge by ID
 *     description: Retrieve a specific badge by its ID. Accessible to all authenticated users.
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Badge ID
 *     responses:
 *       200:
 *         description: Badge retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Badge retrieved successfully"
 *                 badge:
 *                   $ref: '#/components/schemas/Badge'
 *       400:
 *         description: Invalid badge ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Badge not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authenticateToken, getBadgeById);

/**
 * @swagger
 * /api/badges/{id}:
 *   patch:
 *     summary: Update a badge (Admin only)
 *     description: Update badge details. Only administrators can update badges.
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Badge ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BadgeUpdateInput'
 *           example:
 *             name: "Elite Contributor"
 *             icon_url: "https://example.com/icons/elite-contributor.png"
 *     responses:
 *       200:
 *         description: Badge updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Badge updated successfully"
 *                 badge:
 *                   $ref: '#/components/schemas/Badge'
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Badge not found
 *       409:
 *         description: Badge with this name already exists
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  validateBadgeUpdate,
  handleValidationErrors,
  updateBadge
);

/**
 * @swagger
 * /api/badges/{id}:
 *   delete:
 *     summary: Delete a badge (Admin only)
 *     description: Delete a badge and all associated student badge records. Only administrators can delete badges.
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Badge ID
 *     responses:
 *       200:
 *         description: Badge deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Badge deleted successfully"
 *                 deletedCount:
 *                   type: integer
 *                   description: Number of student badge associations deleted
 *       400:
 *         description: Invalid badge ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Badge not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authenticateToken, authorizeRole(["ADMIN"]), deleteBadge);

export default router;
