import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} from "../controllers/notifications";
import { authenticateToken } from "../middleware/authMiddleware";
import { validateIdParam } from "../middleware/validationMiddleware";
import { asyncHandler } from "../middleware/errorHandler";

const router = express.Router();

// GET /api/notifications - list, supports ?page & ?pageSize
router.get("/", authenticateToken, asyncHandler(getNotifications));

// GET /api/notifications/count - unread count
router.get("/count", authenticateToken, asyncHandler(getUnreadCount));

// POST /api/notifications/:id/read - mark single read
router.post(
  "/:id/read",
  authenticateToken,
  validateIdParam("id"),
  asyncHandler(markNotificationRead)
);

// POST /api/notifications/mark-all-read - mark all as read
router.post("/mark-all-read", authenticateToken, asyncHandler(markAllRead));

export default router;
