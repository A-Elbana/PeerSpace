import express from "express";
import {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getPostsByCommunity,
  togglePostResolved,
} from "../controllers/PostController";
import { authenticateToken } from "../middleware/authMiddleware";

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
 *     summary: Create a new post (requires membership)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
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
 *               type:
 *                 type: string
 *               body:
 *                 type: string
 *               cid:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Post created
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not a member
 */
router.post("/", authenticateToken, createPost);

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get posts by community (public communities accessible to guests)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: cid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Community ID
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
 *         description: List of posts
 *       403:
 *         description: Private community requires authentication
 */
router.get("/", getPostsByCommunity);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get post by ID (public posts accessible to guests)
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post details
 *       403:
 *         description: Private community requires authentication
 *       404:
 *         description: Not found
 */
router.get("/:id", getPostById);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               is_resolved:
 *                 type: boolean
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated post
 *       403:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Status toggled
 *       403:
 *         description: Unauthorized
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *       403:
 *         description: Unauthorized
 */
router.delete("/:id", authenticateToken, deletePost);

export default router;
