import express from "express";
import {
  authenticateToken,
  optionalAuthenticateToken,
  authorizeRole,
} from "../middleware/authMiddleware";
import {
  createSubmission,
  getSubmissionsByAssignment,
  getMySubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  gradeSubmission,
} from "../controllers/SubmissionController";
import {
  loadSubmission,
  authorizeSubmissionOwner,
  authorizeSubmissionManage,
} from "../middleware/submissionMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Assignment submissions management
 */

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Create a new submission (Student)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [aid]
 *             properties:
 *               aid:
 *                 type: integer
 *               feedback:
 *                 type: string
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of file UUIDs to attach to this submission
 *                 example: ["550e8400-e29b-41d4-a716-446655440001"]
 *     responses:
 *       201:
 *         description: Submission created
 */
router.post(
  "/",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  createSubmission
);

/**
 * @swagger
 * /api/submissions:
 *   get:
 *     summary: Get submissions for an assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: aid
 *         required: true
 *         schema:
 *           type: integer
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
 *     responses:
 *       200:
 *         description: List submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       aid:
 *                         type: integer
 *                       uid:
 *                         type: integer
 *                       feedback:
 *                         type: string
 *                       grade:
 *                         type: number
 *                       submitted_at:
 *                         type: string
 *                         format: date-time
 *                       graded_at:
 *                         type: string
 *                         format: date-time
 *                       SubmissionFileAttachment:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             subid:
 *                               type: integer
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
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 */
router.get("/", authenticateToken, getSubmissionsByAssignment);

/**
 * @swagger
 * /api/submissions/mine:
 *   get:
 *     summary: Get my submissions
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   aid:
 *                     type: integer
 *                   uid:
 *                     type: integer
 *                   feedback:
 *                     type: string
 *                   grade:
 *                     type: number
 *                   submitted_at:
 *                     type: string
 *                     format: date-time
 *                   graded_at:
 *                     type: string
 *                     format: date-time
 *                   SubmissionFileAttachment:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         subid:
 *                           type: integer
 *                         fid:
 *                           type: string
 *                           format: uuid
 *                         File:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             secure_url:
 *                               type: string
 *                             resource_type:
 *                               type: string
 *                             format:
 *                               type: string
 *                             is_private:
 *                               type: boolean
 */
router.get(
  "/mine",
  authenticateToken,
  authorizeRole(["STUDENT"]),
  getMySubmissions
);

/**
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get a submission by id
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Submission details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 aid:
 *                   type: integer
 *                 uid:
 *                   type: integer
 *                 feedback:
 *                   type: string
 *                 grade:
 *                   type: number
 *                 submitted_at:
 *                   type: string
 *                   format: date-time
 *                 graded_at:
 *                   type: string
 *                   format: date-time
 *                 SubmissionFileAttachment:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       subid:
 *                         type: integer
 *                       fid:
 *                         type: string
 *                         format: uuid
 *                       File:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           secure_url:
 *                             type: string
 *                           resource_type:
 *                             type: string
 *                           format:
 *                             type: string
 *                           is_private:
 *                             type: boolean
 */
router.get("/:id", authenticateToken, loadSubmission, authorizeSubmissionOwner, getSubmissionById);

/**
 * @swagger
 * /api/submissions/{id}:
 *   put:
 *     summary: Update a submission (owner)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feedback: { type: string }
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of file UUIDs - replaces all existing attachments
 *     responses:
 *       200:
 *         description: Updated submission
 */
router.put(
  "/:id",
  authenticateToken,
  loadSubmission,
  authorizeSubmissionOwner,
  updateSubmission
);

/**
 * @swagger
 * /api/submissions/{id}:
 *   delete:
 *     summary: Delete a submission (owner/admin)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Deleted submission
 */
router.delete(
  "/:id",
  authenticateToken,
  loadSubmission,
  authorizeSubmissionOwner,
  deleteSubmission
);

/**
 * @swagger
 * /api/submissions/{id}/grade:
 *   patch:
 *     summary: Grade a submission (Instructor/Admin)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [grade]
 *             properties:
 *               grade: { type: number }
 *               feedback: { type: string }
 *     responses:
 *       200:
 *         description: Graded submission
 */
router.patch(
  "/:id/grade",
  authenticateToken,
  loadSubmission,
  authorizeSubmissionManage,
  gradeSubmission
);

export default router;
