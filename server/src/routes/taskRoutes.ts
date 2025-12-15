import { Router } from "express";
import {
  createTask,
  getMyTasks,
  getTaskById,
  getSubtasks,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskTags,
  addTaskTag,
  removeTaskTag,
  linkTaskToAssignment,
  unlinkTaskFromAssignment,
} from "../controllers/TaskController";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  requireStudentRole,
  loadTask,
  authorizeTaskAccess,
  authorizeTaskModification,
} from "../middleware/taskMiddleware";
import {
  validateTaskCreate,
  validateTaskUpdate,
  validateTaskStatusUpdate,
  handleValidationErrors,
} from "../middleware/validationMiddleware";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique task identifier
 *         title:
 *           type: string
 *           description: Task title
 *         description:
 *           type: string
 *           nullable: true
 *           description: Task description
 *         priority:
 *           type: integer
 *           nullable: true
 *           description: Task priority (0-10)
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Task start date
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Task end/due date
 *         status:
 *           type: integer
 *           description: "Task status (0: Not Started, 1: In Progress, 2: Completed, 3: On Hold, 4: Cancelled)"
 *         parent_task:
 *           type: integer
 *           nullable: true
 *           description: Parent task ID for subtasks
 *         author:
 *           type: object
 *           description: Basic author info (user data)
 *           properties:
 *             id:
 *               type: integer
 *             fname:
 *               type: string
 *             lname:
 *               type: string
 *     TaskCreateInput:
 *       type: object
 *       required:
 *         - title
 *         - status
 *       properties:
 *         title:
 *           type: string
 *           description: Task title
 *           minLength: 1
 *           maxLength: 255
 *         description:
 *           type: string
 *           description: Task description
 *         priority:
 *           type: integer
 *           minimum: 0
 *           maximum: 10
 *           description: Task priority
 *         start_date:
 *           type: string
 *           format: date-time
 *           description: Task start date (ISO 8601)
 *         end_date:
 *           type: string
 *           format: date-time
 *           description: Task end/due date (ISO 8601)
 *         status:
 *           type: integer
 *           minimum: 0
 *           maximum: 4
 *           description: "Task status (0: Not Started, 1: In Progress, 2: Completed, 3: On Hold, 4: Cancelled)"
 *         parent_task:
 *           type: integer
 *           description: Parent task ID for creating subtasks
 *         assignment_id:
 *           type: integer
 *           description: Assignment ID to link the task to
 *     TaskUpdateInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         description:
 *           type: string
 *           nullable: true
 *         priority:
 *           type: integer
 *           minimum: 0
 *           maximum: 10
 *           nullable: true
 *         start_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         end_date:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: integer
 *           minimum: 0
 *           maximum: 4
 *         parent_task:
 *           type: integer
 *           nullable: true
 *     TaskPaginatedResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Task'
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
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     description: Create a new personal task. Only students can create tasks. The author is automatically set to the authenticated user.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskCreateInput'
 *           examples:
 *             complete:
 *               summary: Complete task with all fields
 *               value:
 *                 title: "Study for Exam"
 *                 description: "Review chapters 5-10"
 *                 priority: 8
 *                 start_date: "2024-01-15T09:00:00Z"
 *                 end_date: "2024-01-20T18:00:00Z"
 *                 status: 1
 *                 parent_task: null
 *                 assignment_id: null
 *             basic:
 *               summary: Basic task (minimal)
 *               value:
 *                 title: "Complete Database Project"
 *                 description: null
 *                 priority: null
 *                 start_date: null
 *                 end_date: null
 *                 status: 0
 *                 parent_task: null
 *                 assignment_id: null
 *             subtask:
 *               summary: Subtask
 *               value:
 *                 title: "Read Chapter 5"
 *                 description: null
 *                 priority: null
 *                 start_date: null
 *                 end_date: null
 *                 status: 0
 *                 parent_task: 1
 *                 assignment_id: null
 *             linked:
 *               summary: Task linked to assignment
 *               value:
 *                 title: "Complete Assignment 1"
 *                 description: null
 *                 priority: null
 *                 start_date: null
 *                 end_date: null
 *                 status: 0
 *                 parent_task: null
 *                 assignment_id: 5
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - No token provided
 *       403:
 *         description: Forbidden - Only students can create tasks
 *       404:
 *         description: Parent task or assignment not found
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticateToken,
  requireStudentRole,
  validateTaskCreate,
  handleValidationErrors,
  createTask
);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get my tasks
 *     description: Get all tasks for the authenticated student with pagination and optional filters.
 *     tags: [Tasks]
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
 *         description: Tasks per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *           enum: [0, 1, 2, 3, 4]
 *         description: "Filter by status (0: Not Started, 1: In Progress, 2: Completed, 3: On Hold, 4: Cancelled)"
 *       - in: query
 *         name: priority
 *         schema:
 *           type: integer
 *         description: Filter by priority level
 *       - in: query
 *         name: parent_only
 *         schema:
 *           type: boolean
 *         description: Return only top-level tasks (no subtasks)
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskPaginatedResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only students can access tasks
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, requireStudentRole, getMyTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     description: Get a specific task by its ID. Only the author or an assignee can access.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid task ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to access this task
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskAccess,
  getTaskById
);

/**
 * @swagger
 * /api/tasks/{id}/subtasks:
 *   get:
 *     summary: Get subtasks of a task
 *     description: Get all subtasks of a specific task.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent task ID
 *     responses:
 *       200:
 *         description: Subtasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id/subtasks",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskAccess,
  getSubtasks
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Update a task
 *     description: Update a task. Only the task author can update.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdateInput'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only the author can update
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskModification,
  validateTaskUpdate,
  handleValidationErrors,
  updateTask
);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Quick status update
 *     description: Quickly update just the status of a task.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 4
 *                 description: "New status (0: Not Started, 1: In Progress, 2: Completed, 3: On Hold, 4: Cancelled)"
 *           example:
 *             status: 2
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 task:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     status:
 *                       type: integer
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id/status",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskModification,
  validateTaskStatusUpdate,
  handleValidationErrors,
  updateTaskStatus
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Delete a task and all its subtasks. Only the author can delete.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only the author can delete
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskModification,
  deleteTask
);

/**
 * @swagger
 * /api/tasks/{id}/tags:
 *   get:
 *     summary: Get all tags for a task
 *     description: Retrieve all tags assigned to a task.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id/tags",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskAccess,
  getTaskTags
);

/**
 * @swagger
 * /api/tasks/{id}/tags:
 *   post:
 *     summary: Add a tag to a task
 *     description: Add a tag to a task for organization.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tag
 *             properties:
 *               tag:
 *                 type: string
 *                 description: Tag to add (will be lowercased)
 *           example:
 *             tag: "urgent"
 *     responses:
 *       201:
 *         description: Tag added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       task_id:
 *                         type: integer
 *                       tag:
 *                         type: string
 *       400:
 *         description: Tag is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       409:
 *         description: Tag already exists on this task
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/tags",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskModification,
  addTaskTag
);

/**
 * @swagger
 * /api/tasks/{id}/tags/{tag}:
 *   delete:
 *     summary: Remove a tag from a task
 *     description: Remove a specific tag from a task.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag to remove
 *     responses:
 *       200:
 *         description: Tag removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tag removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task or tag not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id/tags/:tag",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskModification,
  removeTaskTag
);

/**
 * @swagger
 * /api/tasks/{id}/assignment:
 *   post:
 *     summary: Link task to an assignment
 *     description: Link a task to an assignment. Student must be enrolled in the assignment's community.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignment_id
 *             properties:
 *               assignment_id:
 *                 type: integer
 *                 description: Assignment ID to link to
 *           example:
 *             assignment_id: 5
 *     responses:
 *       200:
 *         description: Task linked to assignment successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Assignment ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not enrolled in assignment's community
 *       404:
 *         description: Task or assignment not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/assignment",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskModification,
  linkTaskToAssignment
);

/**
 * @swagger
 * /api/tasks/{id}/assignment:
 *   delete:
 *     summary: Unlink task from assignment
 *     description: Remove the link between a task and an assignment.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task unlinked from assignment successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task unlinked from assignment successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found or not linked to any assignment
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id/assignment",
  authenticateToken,
  requireStudentRole,
  loadTask,
  authorizeTaskModification,
  unlinkTaskFromAssignment
);

export default router;
