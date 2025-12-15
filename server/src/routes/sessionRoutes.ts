import express from "express";
import {
  createSession,
  getSessionByCommunity,
  updateSession,
  deleteSession,
} from "../controllers/SessionController";
import { authenticateToken } from "../middleware/authMiddleware";
import {
  validateSessionCreate,
  validateSessionUpdate,
  handleValidationErrors,
} from "../middleware/validationMiddleware";
import { requireInstructorManagesCommunity } from "../middleware/communityMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Live session management for communities
 */

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Start a new session in a community (Instructor only)
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cid
 *               - title
 *               - start_time
 *               - meet_url
 *             properties:
 *               cid:
 *                 type: string
 *                 format: uuid
 *                 description: Community ID
 *               title:
 *                 type: string
 *                 description: Session title
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: Session start time (ISO 8601)
 *               meet_url:
 *                 type: string
 *                 format: uri
 *                 description: Meeting URL (Zoom, Google Meet, etc.)
 *     responses:
 *       201:
 *         description: Session started successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized (must be instructor managing the community)
 *       404:
 *         description: Community not found
 *       409:
 *         description: A session is already active for this community
 */
router.post(
  "/",
  authenticateToken,
  validateSessionCreate,
  handleValidationErrors,
  requireInstructorManagesCommunity,
  createSession
);

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Get active session for a community
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Community ID
 *     responses:
 *       200:
 *         description: Active session details
 *       400:
 *         description: Invalid community ID
 *       403:
 *         description: Not a member of the community
 *       404:
 *         description: Community or session not found
 */
router.get("/", authenticateToken, getSessionByCommunity);

/**
 * @swagger
 * /api/sessions/{cid}:
 *   put:
 *     summary: Update an active session (Instructor only)
 *     tags: [Sessions]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Session title
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: Session start time (ISO 8601)
 *               meet_url:
 *                 type: string
 *                 format: uri
 *                 description: Meeting URL
 *     responses:
 *       200:
 *         description: Session updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized (must be instructor managing the community)
 *       404:
 *         description: Session not found
 */
router.put(
  "/:cid",
  authenticateToken,
  validateSessionUpdate,
  handleValidationErrors,
  requireInstructorManagesCommunity,
  updateSession
);

/**
 * @swagger
 * /api/sessions/{cid}:
 *   delete:
 *     summary: End/delete an active session (Instructor only)
 *     tags: [Sessions]
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
 *     responses:
 *       200:
 *         description: Session ended successfully
 *       403:
 *         description: Not authorized (must be instructor managing the community)
 *       404:
 *         description: Session not found
 */
router.delete(
  "/:cid",
  authenticateToken,
  requireInstructorManagesCommunity,
  deleteSession
);

export default router;
