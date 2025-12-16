import { Request, Response } from "express";
import prisma from "../config/prisma";
import ActivityLogService from "../services/ActivityLogService";

/**
 * Extended Request with note data
 */
interface NoteRequest extends Request {
  note?: any;
}

/**
 * Create a new note.
 * Expects: title (string), body (string, optional), notebook_id (number, optional)
 * owner_uid is taken from the authenticated user's token (req.userId)
 * Requires: authenticateToken + validateNoteCreate middleware
 */
export const createNote = async (req: Request, res: Response) => {
  const { title, body, notebook_id } = req.body;
  const owner_uid = (req as any).userId;
  try {
    const note = await prisma.note.create({
      data: {
        title: String(title).trim(),
        body: body ? String(body).trim() : null,
        created_at: new Date(),
        notebook_id: notebook_id ? parseInt(notebook_id) : null,
        owner_uid: owner_uid,
      },
    });

    // Log the activity
    await ActivityLogService.logNoteCreated(owner_uid, note.title);

    return res.status(201).json(note);
  } catch (error) {
    console.error("Create Note Error:", error);
    return res.status(500).json({ message: "Failed to create a note" });
  }
};

/**
 * Get all notes for the authenticated user with pagination.
 * Expects: page (optional), limit (optional), notebook_id (optional filter)
 * Requires: authenticateToken middleware
 */
export const getMyNotes = async (req: Request, res: Response) => {
  const owner_uid = (req as any).userId;
  // Pagination with validation
  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);

  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit =
    !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

  const skip = (page - 1) * limit;

  // Build where clause with filters
  const notebookIdParam = req.query.notebook_id as string;
  const standaloneParam = req.query.standalone as string;

  const whereClause: { owner_uid: number; notebook_id?: number | null } = {
    owner_uid: owner_uid,
  };

  // Filter by notebook_id if provided
  if (notebookIdParam) {
    const notebookId = parseInt(notebookIdParam);
    if (!isNaN(notebookId)) {
      whereClause.notebook_id = notebookId;
    }
  }

  // Filter for standalone notes (not in any notebook)
  if (standaloneParam === "true") {
    whereClause.notebook_id = null;
  }

  try {
    // Get notes and total count in parallel
    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          Notebook: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      prisma.note.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      data: notes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get My Notes Error:", error);
    return res.status(500).json({ message: "Failed to fetch notes" });
  }
};

/**
 * Get a single note by ID.
 * Expects: id (path param)
 * Requires: authenticateToken + loadNote + authorizeNoteAccess middleware
 * req.note is set by loadNote middleware
 */
export const getNoteById = async (req: NoteRequest, res: Response) => {
  // note already loaded and access authorized by middleware
  res.status(200).json(req.note);
};

/**
 * Update a note.
 * Expects: id (path param), title (optional), body (optional), notebook_id (optional)
 * Requires: authenticateToken + loadNote + authorizeNoteAccess middleware
 * req.note is set by loadNote middleware
 */
export const updateNote = async (req: NoteRequest, res: Response) => {
  const note = req.note;
  const { title, body, notebook_id } = req.body;

  const updateData: {
    title?: string;
    body?: string | null;
    notebook_id?: number | null;
    updated_at?: Date;
  } = {};

  if (title !== undefined) {
    updateData.title = String(title).trim();
  }

  if (body !== undefined) {
    updateData.body = body !== null ? String(body).trim() : null;
  }

  if (notebook_id !== undefined) {
    // Allow setting notebook_id to null (remove from notebook) or to a new notebook
    updateData.notebook_id =
      notebook_id !== null ? parseInt(notebook_id) : null;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  updateData.updated_at = new Date();

  try {
    const updatedNote = await prisma.note.update({
      where: { id: note.id },
      data: updateData,
      include: {
        Notebook: {
          select: {
            id: true,
            title: true,
          },
        },
        User: {
          select: {
            id: true,
            fname: true,
            lname: true,
          },
        },
      },
    });

    // Log the activity
    await ActivityLogService.logActivity({
      userId: (req as any).userId,
      actionType: 71, // NOTE_UPDATED
      description: `Updated note "${updatedNote.title}"`,
    });

    return res.status(200).json({
      message: "Note updated successfully",
      note: updatedNote,
    });
  } catch (error) {
    console.error("Update Note Error:", error);
    return res.status(500).json({ message: "Failed to update note" });
  }
};

/**
 * Delete a note.
 * Expects: id (path param)
 * Requires: authenticateToken + loadNote + authorizeNoteAccess middleware
 * req.note is set by loadNote middleware
 */
export const deleteNote = async (req: NoteRequest, res: Response) => {
  const note = req.note;

  try {
    // Log the activity BEFORE deleting the note
    await ActivityLogService.logNoteDeleted((req as any).userId, note.title);

    await prisma.note.delete({
      where: { id: note.id },
    });

    return res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Delete Note Error:", error);
    return res.status(500).json({ message: "Failed to delete note" });
  }
};
