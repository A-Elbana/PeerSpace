import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request with notebook data
 */
interface NotebookRequest extends Request {
  notebook?: any;
}

/**
 * Middleware: Load notebook by ID from params and attach to request.
 * Fails with 404 if notebook doesn't exist.
 */
export const loadNotebook = async (
  req: NotebookRequest,
  res: Response,
  next: NextFunction
) => {
  const notebookId = parseInt(req.params.id || req.params.notebookId || "");

  if (isNaN(notebookId)) {
    return res.status(400).json({ message: "Invalid notebook ID" });
  }

  try {
    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId },
      include: {
        User: {
          select: { id: true, fname: true, lname: true },
        },
        Note: {
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            title: true,
            created_at: true,
            updated_at: true,
          },
        },
        _count: {
          select: { Note: true },
        },
      },
    });

    if (!notebook) {
      return res.status(404).json({ message: "Notebook not found" });
    }

    req.notebook = notebook;
    next();
  } catch (error) {
    console.error("loadNotebook error:", error);
    res.status(500).json({ message: "Failed to load notebook" });
  }
};

/**
 * Middleware: Authorize notebook access.
 * Only the notebook owner or Admins can view/modify.
 * Must be used after loadNotebook.
 */
export const authorizeNotebookAccess = async (
  req: NotebookRequest,
  res: Response,
  next: NextFunction
) => {
  const notebook = req.notebook;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!notebook) {
    return res.status(500).json({ message: "Notebook not loaded" });
  }

  // Admins can access any notebook
  if (userRole === "ADMIN") {
    return next();
  }

  // Only the notebook owner can access their notebooks
  if (notebook.owner_uid !== userId) {
    return res
      .status(403)
      .json({ message: "You can only access your own notebooks" });
  }

  next();
};
