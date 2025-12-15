import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createAdmin,
} from "../controllers/UserController";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
// Using authorizeRole from authMiddleware to allow STUDENT or INSTRUCTOR
import {
  handleValidationErrors,
  validateUserUpdate,
  validateAdminCreate,
} from "../middleware/validationMiddleware";

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
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
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, authorizeRole(["ADMIN"]), getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authenticateToken, getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: First name (letters, spaces, hyphens, apostrophes only)
 *               lname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Last name (letters, spaces, hyphens, apostrophes only)
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: New password (must contain at least one letter and one number)
 *               currentPassword:
 *                 type: string
 *                 description: Current password (required when changing password)
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Current password is incorrect
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticateToken,
  validateUserUpdate,
  handleValidationErrors,
  updateUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authenticateToken, deleteUser);

/**
 * @swagger
 * /api/users/admin:
 *   post:
 *     summary: Create a new admin user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Create a new user with admin privileges.
 *       Only existing admins can create new admins.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fname
 *               - lname
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Admin email address
 *                 example: "admin@peerspace.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 description: Password (min 8 chars, must contain letter and number)
 *                 example: "SecurePass123"
 *               fname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: First name
 *                 example: "John"
 *               lname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Last name
 *                 example: "Doe"
 *     responses:
 *       201:
 *         description: Admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Admin created successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     fname:
 *                       type: string
 *                     lname:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: "ADMIN"
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Only admins can create other admins
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Server error
 */
router.post(
  "/admin",
  authenticateToken,
  authorizeRole(["ADMIN"]),
  validateAdminCreate,
  handleValidationErrors,
  createAdmin
);


export default router;
