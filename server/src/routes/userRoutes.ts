import express from "express";
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "../controllers/UserController";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import {
    handleValidationErrors,
    validateUserUpdate,
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
router.get(
    "/",
    authenticateToken,
    authorizeRole(["ADMIN"]),
    getAllUsers
);

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
 *               lname:
 *                 type: string
 *               avatar_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: unauthorized
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

export default router;
