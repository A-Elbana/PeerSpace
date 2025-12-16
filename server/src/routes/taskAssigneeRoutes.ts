import express from "express";
import {
  inviteTaskAssignee,
  acceptTaskAssignee,
  getTaskAssignees,
  getPendingTaskInvitations,
  removeTaskAssignee,
  declineTaskAssignee,
} from "../controllers/TaskAssigneeController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Task Assignees
 *   description: Task assignee management and invitations
 */

/**
 * @swagger
 * /api/task-assignees/invite:
 *   post:
 *     summary: Invite a student to be a task assignee
 *     tags: [Task Assignees]
 *     security:
 *       - bearerAuth: []
 *     description: Task owner invites a student to be assigned to a task. Both students must have at least one common community.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - invitedStudentId
 *             properties:
 *               taskId:
 *                 type: integer
 *                 description: ID of the task
 *               invitedStudentId:
 *                 type: integer
 *                 description: Student ID of the person being invited
 *     responses:
 *       201:
 *         description: Student invited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tid:
 *                       type: integer
 *                     sid:
 *                       type: integer
 *                     isAccepted:
 *                       type: boolean
 *                     Student:
 *                       type: object
 *                     Task:
 *                       type: object
 *       400:
 *         description: Bad request (missing fields, already invited, no common community, etc.)
 *       403:
 *         description: Only task owner can invite assignees
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.post("/invite", authenticateToken, inviteTaskAssignee);

/**
 * @swagger
 * /api/task-assignees/accept:
 *   patch:
 *     summary: Accept a task assignee invitation
 *     tags: [Task Assignees]
 *     security:
 *       - bearerAuth: []
 *     description: Accept an invitation to be assigned to a task. Only the invited student can accept their own invitation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *             properties:
 *               taskId:
 *                 type: integer
 *                 description: ID of the task
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request or invitation already accepted
 *       404:
 *         description: Task assignment not found
 *       500:
 *         description: Server error
 */
router.patch("/accept", authenticateToken, acceptTaskAssignee);

/**
 * @swagger
 * /api/task-assignees/decline:
 *   patch:
 *     summary: Decline a task assignee invitation
 *     tags: [Task Assignees]
 *     security:
 *       - bearerAuth: []
 *     description: Decline an invitation to be assigned to a task. Only the invited student can decline their own invitation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *             properties:
 *               taskId:
 *                 type: integer
 *                 description: ID of the task
 *     responses:
 *       200:
 *         description: Invitation declined successfully
 *       404:
 *         description: Task assignment not found
 *       500:
 *         description: Server error
 */
router.patch("/decline", authenticateToken, declineTaskAssignee);

/**
 * @swagger
 * /api/task-assignees/me/pending:
 *   get:
 *     summary: Get pending task invitations for authenticated student
 *     tags: [Task Assignees]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all pending (unaccepted) task invitations for the authenticated student with pagination.
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
 *     responses:
 *       200:
 *         description: List of pending invitations with pagination metadata
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
 *                       tid:
 *                         type: integer
 *                       sid:
 *                         type: integer
 *                       isAccepted:
 *                         type: boolean
 *                       Task:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           start_date:
 *                             type: string
 *                             format: date-time
 *                           end_date:
 *                             type: string
 *                             format: date-time
 *                           priority:
 *                             type: integer
 *                           author:
 *                             type: integer
 *                           Student:
 *                             type: object
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/me/pending", authenticateToken, getPendingTaskInvitations);

/**
 * @swagger
 * /api/task-assignees/{taskId}:
 *   get:
 *     summary: Get all assignees for a task
 *     tags: [Task Assignees]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     description: Retrieve all assignees (accepted and pending) for a specific task with pagination.
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
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
 *         description: List of assignees with pagination metadata
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
 *                       tid:
 *                         type: integer
 *                       sid:
 *                         type: integer
 *                       isAccepted:
 *                         type: boolean
 *                       Student:
 *                         type: object
 *                         properties:
 *                           uid:
 *                             type: integer
 *                           fname:
 *                             type: string
 *                           lname:
 *                             type: string
 *                           email:
 *                             type: string
 *                           avatar_file_id:
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
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get("/:taskId", getTaskAssignees);

/**
 * @swagger
 * /api/task-assignees/remove:
 *   delete:
 *     summary: Remove a task assignee
 *     tags: [Task Assignees]
 *     security:
 *       - bearerAuth: []
 *     description: Remove a student from being assigned to a task. Only the task owner can remove assignees.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - studentId
 *             properties:
 *               taskId:
 *                 type: integer
 *                 description: ID of the task
 *               studentId:
 *                 type: integer
 *                 description: Student ID to remove
 *     responses:
 *       200:
 *         description: Task assignee removed successfully
 *       400:
 *         description: Bad request (missing fields)
 *       403:
 *         description: Only task owner can remove assignees
 *       404:
 *         description: Task or assignment not found
 *       500:
 *         description: Server error
 */
router.delete("/remove", authenticateToken, removeTaskAssignee);

export default router;
