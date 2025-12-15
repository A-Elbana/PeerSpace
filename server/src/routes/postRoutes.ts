import express from "express";
import {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getPostsByCommunity,
  togglePostResolved,
  getAllPosts,
} from "../controllers/PostController";
import {
  authenticateToken,
  optionalAuthenticateToken,
  authorizeRole,
} from "../middleware/authMiddleware";
import {
  loadPost,
  authorizePostAccess,
  authorizePostEdit,
  requirePostMembership,
} from "../middleware/postMiddleware";

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
 *               file_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of file UUIDs to attach to this post
 *                 example: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"]
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
router.post("/", authenticateToken, requirePostMembership, createPost);

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
 *                       type:
 *                         type: string
 *                       body:
 *                         type: string
 *                       post_date:
 *                         type: string
 *                         format: date-time
 *                       PostFileAttachment:
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
 * /api/posts/all:
 *   get:
 *     summary: Get all posts with search and filters
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     description: Admin endpoint to search and filter posts across all communities
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by post ID or title
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tag (partial match)
 *       - in: query
 *         name: communityId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by community ID
 *     responses:
 *       200:
 *         description: List of posts with pagination metadata
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  "/all",
  (req, res, next) => {
    console.log("[POST /all] Route hit, query:", req.query);
    next();
  },
  authenticateToken,
  getAllPosts
);

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
 *         description: Post details with author information, comment count, votes, and attached files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 body:
 *                   type: string
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
 *                 votes:
 *                   type: object
 *                   properties:
 *                     upvotes:
 *                       type: integer
 *                     downvotes:
 *                       type: integer
 *                     score:
 *                       type: integer
 *                     userVote:
 *                       type: boolean
 *                       nullable: true
 *       403:
 *         description: Private community requires authentication and membership
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */
router.get(
  "/:id",
  optionalAuthenticateToken,
  loadPost,
  authorizePostAccess,
  getPostById
);

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
 *               file_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of file UUIDs - replaces all existing attachments
 *                 example: ["550e8400-e29b-41d4-a716-446655440001"]
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
router.put("/:id", authenticateToken, loadPost, authorizePostEdit, updatePost);
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
router.patch(
  "/:id/resolve",
  authenticateToken,
  loadPost,
  authorizePostEdit,
  togglePostResolved
);

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
router.delete(
  "/:id",
  authenticateToken,
  loadPost,
  authorizePostEdit,
  deletePost
);

export default router;
