import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request with task and user data
 */
interface TaskRequest extends Request {
  task?: any;
  userId?: number;
  role?: string;
}

/**
 * Middleware to ensure the user is a student.
 * Must be used after authenticateToken.
 */
export const requireStudentRole = (
  req: TaskRequest,
  res: Response,
  next: NextFunction
) => {
  const userRole = (req as any).role;

  if (!userRole || userRole.toLowerCase() !== "student") {
    return res.status(403).json({ message: "Only students can perform this action" });
  }

  return next();
};

/**
 * Load a task by ID from route params.
 * Attaches the task to req.task.
 * Must be used after authenticateToken.
 */
export const loadTask = async (
  req: TaskRequest,
  res: Response,
  next: NextFunction
) => {
  const taskId = parseInt(req.params.id || "");

  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        Student: {
          include: {
            User: {
              select: { id: true, fname: true, lname: true },
            },
          },
        },
        Task: {
          select: { id: true, title: true },
        },
        TaskAssignmentRelation: {
          include: {
            Assignment: {
              select: { id: true, title: true, due_date: true },
            },
          },
        },
        TaskTag: true,
        TaskAssignees: {
          include: {
            Student: {
              include: {
                User: {
                  select: { id: true, fname: true, lname: true },
                },
              },
            },
          },
        },
        _count: {
          select: { other_Task: true, TaskAssignees: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    req.task = task;
    return next();
  } catch (error) {
    console.error("Load Task Error:", error);
    return res.status(500).json({ message: "Failed to load task" });
  }
};

/**
 * Authorize access to a task.
 * Only the task author or an assigned student can access.
 * Must be used after loadTask.
 */
export const authorizeTaskAccess = async (
  req: TaskRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const userRole = (req as any).role;
  const task = req.task;

  if (!task) {
    return res.status(500).json({ message: "Task not loaded" });
  }

  // Admin has full access
  if (userRole && userRole.toLowerCase() === "admin") {
    return next();
  }

  // Check if user is the author
  if (task.author === userId) {
    return next();
  }

  // Check if user is an assignee
  const isAssignee = task.TaskAssignees?.some(
    (assignee: any) => assignee.sid === userId
  );

  if (isAssignee) {
    return next();
  }

  return res.status(403).json({ message: "You don't have access to this task" });
};

/**
 * Authorize modification of a task.
 * Only the task author can modify.
 * Must be used after loadTask.
 */
export const authorizeTaskModification = async (
  req: TaskRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const userRole = (req as any).role;
  const task = req.task;

  if (!task) {
    return res.status(500).json({ message: "Task not loaded" });
  }

  // Admin has full access
  if (userRole && userRole.toLowerCase() === "admin") {
    return next();
  }

  // Only author can modify
  if (task.author !== userId) {
    return res.status(403).json({ message: "Only the task author can modify this task" });
  }

  return next();
};
