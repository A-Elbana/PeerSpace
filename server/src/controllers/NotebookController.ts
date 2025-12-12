import { Request, Response } from "express";
import prisma from "../config/prisma";

/**
 * Extended Request with notebook data
 */
interface NotebookRequest extends Request {
  notebook?: any;
}

/**
 * Create a new notebook.
 * Expects: title (string), description (string, optional)
 * owner_uid is taken from the authenticated user's token (req.userId)
 * Requires: authenticateToken + validateNotebookCreate middleware
 */
export const createNotebook = async (req: Request, res: Response) => {
  const { title, description } = req.body;
  const owner_uid = (req as any).userId;

  try {
    const notebook = await prisma.notebook.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        created_at: new Date(),
        owner_uid: owner_uid,
      },
      include: {
        User: {
          select: { id: true, fname: true, lname: true },
        },
        _count: {
          select: { Note: true },
        },
      },
    });

    return res.status(201).json(notebook);
  } catch (error) {
    console.error("Create Notebook Error:", error);
    return res.status(500).json({ message: "Failed to create notebook" });
  }
};

/**
 * Get all notebooks for the authenticated user with pagination.
 * Expects: page (optional), limit (optional)
 * Requires: authenticateToken middleware
 */
export const getMyNotebooks = async (req: Request, res: Response) => {
  const owner_uid = (req as any).userId;

  // Pagination with validation
  const pageParam = parseInt(req.query.page as string);
  const limitParam = parseInt(req.query.limit as string);

  const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
  const skip = (page - 1) * limit;

  try {
    // Get notebooks and total count in parallel
    const [notebooks, total] = await Promise.all([
      prisma.notebook.findMany({
        where: { owner_uid: owner_uid },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          _count: {
            select: { Note: true },
          },
        },
      }),
      prisma.notebook.count({ where: { owner_uid: owner_uid } }),
    ]);

    return res.status(200).json({
      data: notebooks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get My Notebooks Error:", error);
    return res.status(500).json({ message: "Failed to fetch notebooks" });
  }
};

/**
 * Get a single notebook by ID (includes its notes).
 * Expects: id (path param)
 * Requires: authenticateToken + loadNotebook + authorizeNotebookAccess middleware
 * req.notebook is set by loadNotebook middleware
 */
export const getNotebookById = async (req: NotebookRequest, res: Response) => {
  // Notebook already loaded and access authorized by middleware
  return res.status(200).json(req.notebook);
};

/**
 * Update a notebook.
 * Expects: id (path param), title (optional), description (optional)
 * Requires: authenticateToken + loadNotebook + authorizeNotebookAccess middleware
 * req.notebook is set by loadNotebook middleware
 */
export const updateNotebook = async (req: NotebookRequest, res: Response) => {
  const notebook = req.notebook;
  const { title, description } = req.body;

  const updateData: {
    title?: string;
    description?: string | null;
    updated_at?: Date;
  } = {};

  if (title !== undefined) {
    updateData.title = String(title).trim();
  }

  if (description !== undefined) {
    updateData.description = description !== null ? String(description).trim() : null;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  updateData.updated_at = new Date();

  try {
    const updatedNotebook = await prisma.notebook.update({
      where: { id: notebook.id },
      data: updateData,
      include: {
        User: {
          select: { id: true, fname: true, lname: true },
        },
        _count: {
          select: { Note: true },
        },
      },
    });

    return res.status(200).json({
      message: "Notebook updated successfully",
      notebook: updatedNotebook,
    });
  } catch (error) {
    console.error("Update Notebook Error:", error);
    return res.status(500).json({ message: "Failed to update notebook" });
  }
};

/**
 * Delete a notebook.
 * Expects: id (path param)
 * Requires: authenticateToken + loadNotebook + authorizeNotebookAccess middleware
 * req.notebook is set by loadNotebook middleware
 * Note: Deleting a notebook will also delete all notes inside it (cascade)
 */
export const deleteNotebook = async (req: NotebookRequest, res: Response) => {
  const notebook = req.notebook;

  try {
    // Notes are deleted automatically via cascade in schema
    await prisma.notebook.delete({
      where: { id: notebook.id },
    });

    return res.status(200).json({ message: "Notebook deleted successfully" });
  } catch (error) {
    console.error("Delete Notebook Error:", error);
    return res.status(500).json({ message: "Failed to delete notebook" });
  }
};
