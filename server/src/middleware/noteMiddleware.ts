import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request with note data
 */
interface NoteRequest extends Request {
  note?: any;
}

/**
 * Middleware: Load note by ID from params and attach to request.
 * Fails with 404 if note doesn't exist.
 */
export const loadNote = async (
  req: NoteRequest,
  res: Response,
  next: NextFunction
) => {
  const noteId = parseInt(req.params.id || req.params.noteId || "");

  if (isNaN(noteId)) {
    return res.status(400).json({ message: "Invalid note ID" });
  }

  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        Notebook: {
          select: { id: true, title: true },
        },
        User: {
          select: { id: true, fname: true, lname: true },
        },
        NoteFileAttachment: {
          include: {
            File: true,
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    req.note = note;
    next();
  } catch (error) {
    console.error("loadNote error:", error);
    res.status(500).json({ message: "Failed to load note" });
  }
};

/**
 * Middleware: Authorize note access.
 * Only the note owner or Admins can view/modify.
 * Must be used after loadNote.
 */
export const authorizeNoteAccess = async (
  req: NoteRequest,
  res: Response,
  next: NextFunction
) => {
  const note = req.note;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!note) {
    return res.status(500).json({ message: "Note not loaded" });
  }

  // Admins can access any note
  if (userRole === "ADMIN") {
    return next();
  }

  // Only the note owner can access their notes
  if (note.owner_uid !== userId) {
    return res
      .status(403)
      .json({ message: "You can only access your own notes" });
  }

  next();
};

/**
 * Middleware: Validate notebook ownership (if notebook_id is provided).
 * Ensures the user owns the notebook they're trying to add a note to.
 */
export const validateNotebookOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const notebookId = req.body.notebook_id;

  // If no notebook_id provided, skip validation
  if (notebookId === undefined || notebookId === null) {
    return next();
  }

  const parsedNotebookId = parseInt(notebookId);
  if (isNaN(parsedNotebookId)) {
    return res.status(400).json({ message: "Invalid notebook ID format" });
  }

  try {
    const notebook = await prisma.notebook.findUnique({
      where: { id: parsedNotebookId },
    });

    if (!notebook) {
      return res.status(404).json({ message: "Notebook not found" });
    }

    if (notebook.owner_uid !== userId) {
      return res
        .status(403)
        .json({ message: "You can only add notes to your own notebooks" });
    }

    next();
  } catch (error) {
    console.error("validateNotebookOwnership error:", error);
    res.status(500).json({ message: "Failed to validate notebook ownership" });
  }
};
