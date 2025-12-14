import express from "express";
import {
  createFile,
  getFilesByContext,
  getFileById,
  deleteFile,
  deleteFilesByContext,
} from "../controllers/FileController";
import { authenticateToken } from "../middleware/authMiddleware";
import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validationMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: File management with Cloudinary
 */

/**
 * Validation for file creation
 */
const validateFileCreate = [
  body("public_id").notEmpty().withMessage("public_id is required"),
  body("secure_url").isURL().withMessage("secure_url must be a valid URL"),
  body("resource_type")
    .isIn(["image", "video", "raw", "auto"])
    .withMessage("resource_type must be image, video, raw, or auto"),
  body("context")
    .isIn([
      "POST",
      "SUBMISSION",
      "NOTE",
      "ASSIGNMENT",
      "COMMUNITY_BANNER",
      "USER_AVATAR",
    ])
    .withMessage("Invalid context"),
  body("context_id")
    .isInt({ min: 1 })
    .withMessage("context_id must be a positive integer"),
  body("is_private")
    .optional()
    .isBoolean()
    .withMessage("is_private must be a boolean"),
];

/**
 * @swagger
 * /api/files:
 *   post:
 *     summary: Create a file record after Cloudinary upload
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - public_id
 *               - secure_url
 *               - resource_type
 *               - context
 *               - context_id
 *             properties:
 *               public_id:
 *                 type: string
 *               secure_url:
 *                 type: string
 *               resource_type:
 *                 type: string
 *                 enum: [image, video, raw, auto]
 *               format:
 *                 type: string
 *               context:
 *                 type: string
 *                 enum: [POST, SUBMISSION, NOTE, ASSIGNMENT, COMMUNITY_BANNER, USER_AVATAR]
 *               context_id:
 *                 type: integer
 *               is_private:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: File record created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  authenticateToken,
  validateFileCreate,
  handleValidationErrors,
  createFile
);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Get files by context and context_id
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: context
 *         required: true
 *         schema:
 *           type: string
 *           enum: [POST, SUBMISSION, NOTE, ASSIGNMENT, COMMUNITY_BANNER, USER_AVATAR]
 *       - in: query
 *         name: context_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of files
 *       400:
 *         description: Missing or invalid parameters
 */
router.get("/", authenticateToken, getFilesByContext);

/**
 * @swagger
 * /api/files/bulk-delete:
 *   post:
 *     summary: Bulk delete files by context
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - context
 *               - context_id
 *             properties:
 *               context:
 *                 type: string
 *                 enum: [POST, SUBMISSION, NOTE, ASSIGNMENT, COMMUNITY_BANNER, USER_AVATAR]
 *               context_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Files deleted successfully
 */
router.post("/bulk-delete", authenticateToken, deleteFilesByContext);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get a single file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File details with signed URL for private files
 *       404:
 *         description: File not found
 */
router.get("/:id", authenticateToken, getFileById);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete a file (Cloudinary and database)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: File not found
 */
router.delete("/:id", authenticateToken, deleteFile);

export default router;
