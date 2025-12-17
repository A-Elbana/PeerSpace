import express from "express";
import {
  createCommunity,
  getCommunities,
  getCommunityById,
  updateCommunity,
  deleteCommunity,
  getCommunityMembers,
  shareCommunity,
  getMyCommunities,
  getCommonCommunities,
  checkUserManagerStatus,
} from "../controllers/CommunityController";
import {
  enrollInCommunity,
  leaveCommunity,
  addStudentToCommunity,
  removeStudentFromCommunity,
} from "../controllers/EnrollmentController";
import {
  authenticateToken,
  authorizeRole,
  optionalAuthenticateToken,
} from "../middleware/authMiddleware";
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
 *     description: Retrieve communities. Guests see PUBLIC only; authenticated users see PUBLIC + their PRIVATE communities; admins see all
 *     security:
 *       - bearerAuth: []
 *       - {}
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
 *         description: List of communities with pagination metadata
 *       500:
 *         description: Server error
 */
router.get("/", optionalAuthenticateToken, getCommunities);

/**
 * @swagger
 * /api/communities:
 *   post:
 *     summary: Create a new community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new community. Only INSTRUCTOR and ADMIN roles allowed. Creator is automatically added as manager.
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
 *                 maxLength: 255
 *                 description: Community name
 *               type:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *                 description: Community visibility type
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 description: Community description
 *     responses:
 *       201:
 *         description: Community created successfully (returns UUID id)
 *       400:
 *         description: Validation error (missing/invalid required fields)
 *       403:
 *         description: Only instructors and admins can create communities
 *       409:
 *         description: Community name already exists
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
 * /api/communities/mine:
 *   get:
 *     summary: Get communities for the authenticated user
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns communities related to the current user with pagination.
 *       - STUDENT: communities where the student is enrolled.
 *       - INSTRUCTOR: communities managed by the instructor.
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
 *     responses:
 *       200:
 *         description: Communities retrieved successfully with pagination metadata
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Invalid role for this endpoint
 *       500:
 *         description: Server error
 */
router.get("/mine", authenticateToken, getMyCommunities);

/**
 * @swagger
 * /api/communities/{cid}/managers/{uid}/check:
 *   get:
 *     summary: Check if a user manages a community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
  *           format: uuid
 *         description: Community ID
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to check
 *     responses:
 *       200:
 *         description: Whether the user manages the community
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isManager:
 *                   type: boolean
 *                 communityId:
 *                   type: string
 *                 userId:
 *                   type: integer
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/:cid/managers/:uid/check",
  authenticateToken,
  authorizeRole(["ADMIN", "INSTRUCTOR"]),
  checkUserManagerStatus
);

/**
 * @swagger
 * /api/communities/common/{uid}:
 *   get:
 *     summary: Get common communities between current user and target user
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
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
 *         description: Number of communities per page
 *     responses:
 *       200:
 *         description: Common communities retrieved successfully with pagination metadata
 *       400:
 *         description: Invalid target user id
 *       500:
 *         description: Server error
 */
router.get("/common/:uid", authenticateToken, getCommonCommunities);

/**
 * @swagger
 * /api/communities/{id}:
 *   get:
 *     summary: Get community by ID
 *     tags: [Communities]
 *     description: Retrieve community details. PUBLIC communities visible to everyone; PRIVATE communities require membership or admin role
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
 *     responses:
 *       200:
 *         description: Community details with member and post counts
 *       400:
 *         description: Invalid community ID format
 *       403:
 *         description: Authentication required for private communities or user is not a member
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  optionalAuthenticateToken,
  loadCommunity,
  authorizeCommunityAccess,
  getCommunityById
);

/**
 * @swagger
 * /api/communities/{id}:
 *   put:
 *     summary: Update community
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     description: Update community details. Only community managers (instructors managing this community) or admins allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               type:
 *                 type: string
 *                 enum: [PUBLIC, PRIVATE]
 *               description:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Community updated successfully
 *       400:
 *         description: Validation error or no valid fields to update
 *       403:
 *         description: Only community managers or admins can update
 *       404:
 *         description: Community not found
 *       409:
 *         description: Community name already exists
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticateToken,
  loadCommunity,
  authorizeCommunityManage,
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
 *     description: Delete a community. Only admins or community managers allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
 *     responses:
 *       200:
 *         description: Community deleted successfully
 *       400:
 *         description: Invalid community ID format
 *       403:
 *         description: Only admins or community managers can delete communities
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
  loadCommunity,
  authorizeCommunityManage,
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
 *     description: Retrieve paginated list of community members (students and instructors). Only members, managers, or admins allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
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
 *         description: List of community members with pagination
 *       400:
 *         description: Invalid community ID format
 *       403:
 *         description: Only members can view member list
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id/members",
  authenticateToken,
  loadCommunity,
  authorizeCommunityAccess,
  getCommunityMembers
);

/**
 * @swagger
 * /api/communities/{id}/enroll:
 *   post:
 *     summary: Enroll in community (Student only)
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *     description: Enroll student in community using invitation code (which is the community ID). PUBLIC communities require no code; PRIVATE communities require invitation code in body for body-based enrollment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID (invitation code for enrollment)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               communityId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional community ID for alternative enrollment (required for private communities)
 *     responses:
 *       201:
 *         description: Successfully enrolled in community
 *       400:
 *         description: Invalid community ID format or missing code for private community
 *       403:
 *         description: Only students can enroll
 *       404:
 *         description: Community not found
 *       409:
 *         description: Already enrolled in community
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/enroll",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  loadCommunity,
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
 *     description: Remove student from community enrollment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
 *     responses:
 *       200:
 *         description: Successfully left community
 *       400:
 *         description: Invalid community ID format
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
  loadCommunity,
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
 *     description: Add a student to community enrollment. Only instructors and admins allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
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
 *         description: Invalid community ID format or student ID
 *       403:
 *         description: Only instructors or admins can add students
 *       404:
 *         description: Student or community not found
 *       409:
 *         description: Student already enrolled in community
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/students",
  authenticateToken,
  loadCommunity,
  authorizeCommunityManage,
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
 *     description: Remove a student from community enrollment. Only community managers (instructors managing this community) or admins allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student user ID
 *     responses:
 *       200:
 *         description: Student removed successfully
 *       400:
 *         description: Invalid community ID format
 *       403:
 *         description: Only community managers or admins can remove students
 *       404:
 *         description: Student not enrolled or community not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id/students/:studentId",
  authenticateToken,
  loadCommunity,
  authorizeCommunityManage,
  removeStudentFromCommunity
);

/**
 * @swagger
 * /api/communities/{id}/share:
 *   get:
 *     summary: Get community invitation code
 *     tags: [Communities]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     description: Get the invitation code (community UUID) for sharing. PUBLIC communities accessible to anyone; PRIVATE communities require membership or admin role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community UUID
 *     responses:
 *       200:
 *         description: Invitation code (community ID) returned successfully
 *       400:
 *         description: Invalid community ID format
 *       401:
 *         description: Authentication required to view invitation code for private communities
 *       403:
 *         description: Only members or admins can view invitation code for private communities
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id/share",
  optionalAuthenticateToken,
  loadCommunity,
  authorizeCommunityAccess,
  shareCommunity
);

export default router;
