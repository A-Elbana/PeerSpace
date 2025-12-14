import express from "express";
import {
  createAssignment,
  getAssignmentById,
  getAssignmentsByCommunity,
  updateAssignment,
  deleteAssignment,
} from "../controllers/AssignmentController";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  requireInstructorManagesCommunity,
  loadAssignment,
  authorizeAssignmentManage,
  authorizeAssignmentAccess,
} from "../middleware/assignmentMiddleware";
import {
  validateAssignmentCreate,
  validateAssignmentUpdate,
  handleValidationErrors,
} from "../middleware/validationMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Assignment management for communities
 */

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Create an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new assignment in a community.
 *       Only instructors who manage the community (or admins) can create assignments.
 *       The assigner_uid is automatically set from the authenticated user's token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - cid
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Assignment title
 *                 example: "Week 1 Homework"
 *               description:
 *                 type: string
 *                 description: Detailed description of the assignment (optional)
 *                 example: "Complete exercises 1-10 from chapter 3"
 *               cid:
 *                 type: string
 *                 format: uuid
 *                 description: Community UUID
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Due date in ISO 8601 format (optional)
 *                 example: "2025-12-31T23:59:59Z"
 *               max_points:
 *                 type: number
 *                 minimum: 0
 *                 description: Maximum points for the assignment (optional)
 *                 example: 100
 *               canBeLate:
 *                 type: boolean
 *                 description: Whether late submissions are allowed (defaults to true)
 *                 example: true
 *               file_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of file UUIDs to attach to this assignment
 *                 example: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 due_date:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 max_points:
 *                   type: number
 *                   nullable: true
 *                 canBeLate:
 *                   type: boolean
 *                 assigner_uid:
 *                   type: integer
 *                 cid:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only instructors who manage the community can create assignments
 *       404:
 *         description: Community not found
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateToken,
  validateAssignmentCreate,
  handleValidationErrors,
  requireInstructorManagesCommunity,
  createAssignment
);

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: Get assignments by community
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve paginated assignments for a community.
 *       Only community members (enrolled students or managing instructors) and admins can view assignments.
 *     parameters:
 *       - in: query
 *         name: cid
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
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of assignments per page
 *     responses:
 *       200:
 *         description: List of assignments with pagination metadata
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
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       due_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       max_points:
 *                         type: number
 *                         nullable: true
 *                       canBeLate:
 *                         type: boolean
 *                       assigner_uid:
 *                         type: integer
 *                       cid:
 *                         type: string
 *                       AssignmentFileAttachment:
 *                         type: array
 *                         description: Attached files
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
 *                                 secure_url:
 *                                   type: string
 *                                 resource_type:
 *                                   type: string
 *                                 format:
 *                                   type: string
 *                                 is_private:
 *                                   type: boolean
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
 *       400:
 *         description: Invalid community ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Must be a member of the community
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, getAssignmentsByCommunity);

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get assignment by ID
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieve a specific assignment by ID.
 *       Only community members (enrolled students or managing instructors) and admins can view.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                   nullable: true
 *                 due_date:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 max_points:
 *                   type: number
 *                   nullable: true
 *                 canBeLate:
 *                   type: boolean
 *                 assigner_uid:
 *                   type: integer
 *                 cid:
 *                   type: string
 *                 Instructor:
 *                   type: object
 *                   description: Instructor who created the assignment
 *                 Community:
 *                   type: object
 *                   description: Community the assignment belongs to
 *                 files:
 *                   type: array
 *                   description: Attached files
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       secure_url:
 *                         type: string
 *                       resource_type:
 *                         type: string
 *                       format:
 *                         type: string
 *                       is_private:
 *                         type: boolean
 *       400:
 *         description: Invalid assignment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Must be a member of the community
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  authenticateToken,
  loadAssignment,
  authorizeAssignmentAccess,
  getAssignmentById
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   put:
 *     summary: Update an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update an assignment's details.
 *       Only the instructor who created the assignment or an admin can update it.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment ID
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
 *                 description: Assignment title
 *               description:
 *                 type: string
 *                 description: Detailed description of the assignment
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Due date in ISO 8601 format
 *               max_points:
 *                 type: number
 *                 minimum: 0
 *                 description: Maximum points for the assignment
 *               canBeLate:
 *                 type: boolean
 *                 description: Whether late submissions are allowed
 *               file_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of file UUIDs - replaces all existing attachments
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 assignment:
 *                   type: object
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only the assignment creator or an admin can update
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticateToken,
  loadAssignment,
  authorizeAssignmentManage,
  validateAssignmentUpdate,
  handleValidationErrors,
  updateAssignment
);

/**
 * @swagger
 * /api/assignments/{id}:
 *   delete:
 *     summary: Delete an assignment
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Delete an assignment.
 *       Only the instructor who created the assignment or an admin can delete it.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Assignment deleted successfully"
 *       400:
 *         description: Invalid assignment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Only the assignment creator or an admin can delete
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticateToken,
  loadAssignment,
  authorizeAssignmentManage,
  deleteAssignment
);

export default router;
