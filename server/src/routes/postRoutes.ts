import express from "express";
import {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getPostsByCommunity,
  togglePostResolved,
} from "../controllers/PostController";
import { authenticateToken, optionalAuthenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Post management
 */

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new post in a community. User must be a member of the community (enrolled student or managing instructor)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - cid
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 description: Post title
 *               type:
 *                 type: string
 *                 description: Post type/category
 *               body:
 *                 type: string
 *                 description: Post content
 *               cid:
 *                 type: string
 *                 format: uuid
 *                 description: Community UUID
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid input or missing required fields
 *       403:
 *         description: User not a member of the community
 *       500:
 *         description: Server error
 */
router.post("/", authenticateToken, createPost);

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get posts by community
 *     tags: [Posts]
 *     description: Retrieve paginated posts from a community. PUBLIC communities accessible to guests; PRIVATE communities require authentication and membership
 *     security:
 *       - bearerAuth: []
 *       - {}
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of posts with pagination metadata
 *       400:
 *         description: Invalid community ID format
 *       403:
 *         description: Private community requires authentication and membership
 *       500:
 *         description: Server error
 */
router.get("/", optionalAuthenticateToken, getPostsByCommunity);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     description: Retrieve a specific post. PUBLIC community posts accessible to guests; PRIVATE community posts require authentication and membership
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post details with author information and comment count
 *       403:
 *         description: Private community requires authentication and membership
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get("/:id", optionalAuthenticateToken, getPostById);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     description: Update post details. Only the post author, community instructors, or admins allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               body:
 *                 type: string
 *               is_resolved:
 *                 type: boolean
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       403:
 *         description: Unauthorized - only author, instructors, or admins can update
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.put("/:id", authenticateToken, updatePost);
/**
 * @swagger
 * /api/posts/{id}/resolve:
 *   patch:
 *     summary: Toggle post resolution status
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     description: Toggle the resolution status of a post. Only post author, community instructors, or admins allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Resolution status toggled successfully
 *       403:
 *         description: Unauthorized - only author, instructors, or admins can resolve
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.patch("/:id/resolve", authenticateToken, togglePostResolved);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a post. Only post author, community instructors, or admins allowed
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       403:
 *         description: Unauthorized - only author, instructors, or admins can delete
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authenticateToken, deletePost);

export default router;
