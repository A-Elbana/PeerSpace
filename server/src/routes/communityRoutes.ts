import express from "express";
import {
  createCommunity,
  getCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  getCommunityMembers,
} from "../controllers/CommunityController";
import {
  enrollInCommunity,
  leaveCommunity,
  addStudentToCommunity,
  removeStudentFromCommunity,
} from "../controllers/EnrollmentController";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import {
  validateCommunityCreate,
  validateCommunityUpdate,
  validateAddStudent,
  handleValidationErrors,
} from "../middleware/validationMiddleware";
import {
  loadCommunity,
  authorizeCommunityAccess,
  authorizeCommunityManage,
} from "../middleware/communityMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Communities
 *   description: Community management and enrollment
 */

/**
 * @swagger
 * /api/communities:
 *   get:
 *     summary: Get all communities with pagination
 *     tags: [Communities]
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
 *         description: Number of communities per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PUBLIC, PRIVATE]
 *         description: Filter by community type
 *     responses:
 *       200:
 *         description: List of communities
 *       500:
 *         description: Server error
 */
router.get("/", getCommunities);

/**
 * @swagger
 * /api/communities:
 *   post:
 *     summary: Create a new community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               banner_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Community created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Only instructors and admins can create communities
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  validateCommunityCreate,
  handleValidationErrors,
  createCommunity
);

/**
 * @swagger
 * /api/communities/{id}:
 *   get:
 *     summary: Get community by ID
 *     tags: [Communities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
 *     responses:
 *       200:
 *         description: Community details
 *       403:
 *         description: Authentication required for private communities
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getCommunityById);

/**
 * @swagger
 * /api/communities/{id}:
 *   put:
 *     summary: Update community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               banner_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Community updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Only community managers or admins can update
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticateToken,
  validateCommunityUpdate,
  handleValidationErrors,
  updateCommunity
);

/**
 * @swagger
 * /api/communities/{id}:
 *   delete:
 *     summary: Delete community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
 *     responses:
 *       200:
 *         description: Community deleted
 *       403:
 *         description: Only admins can delete communities
 *       404:
 *         description: Community not found
 *       409:
 *         description: Cannot delete community with existing relations
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  deleteCommunity
);

/**
 * @swagger
 * /api/communities/{id}/members:
 *   get:
 *     summary: Get community members
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
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
 *     responses:
 *       200:
 *         description: List of community members
 *       403:
 *         description: Only members can view member list
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.get("/:id/members", authenticateToken, getCommunityMembers);

/**
 * @swagger
 * /api/communities/{id}/enroll:
 *   post:
 *     summary: Enroll in community (Student only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
 *     responses:
 *       201:
 *         description: Successfully enrolled
 *       403:
 *         description: Only students can enroll
 *       404:
 *         description: Community not found
 *       409:
 *         description: Already enrolled
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/enroll",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  enrollInCommunity
);

/**
 * @swagger
 * /api/communities/{id}/leave:
 *   delete:
 *     summary: Leave community (Student only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
 *     responses:
 *       200:
 *         description: Successfully left community
 *       403:
 *         description: Only students can leave
 *       404:
 *         description: Not enrolled in community
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id/leave",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  leaveCommunity
);

/**
 * @swagger
 * /api/communities/{id}/students:
 *   post:
 *     summary: Add student to community (Instructor/Admin only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *             properties:
 *               studentId:
 *                 type: integer
 *                 description: Student user ID
 *     responses:
 *       201:
 *         description: Student added successfully
 *       400:
 *         description: Invalid student ID
 *       403:
 *         description: Only instructors or admins
 *       404:
 *         description: Student or community not found
 *       409:
 *         description: Student already enrolled
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/students",
  authenticateToken,
  authorizeRole(["INSTRUCTOR", "ADMIN"]),
  validateAddStudent,
  handleValidationErrors,
  addStudentToCommunity
);

/**
 * @swagger
 * /api/communities/{id}/students/{studentId}:
 *   delete:
 *     summary: Remove student from community (Manager/Admin only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student user ID
 *     responses:
 *       200:
 *         description: Student removed successfully
 *       403:
 *         description: Only community managers or admins
 *       404:
 *         description: Student not enrolled
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id/students/:studentId",
  authenticateToken,
  removeStudentFromCommunity
);

export default router;
