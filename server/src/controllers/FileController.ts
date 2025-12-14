import { Request, Response } from "express";
import prisma from "../config/prisma";
import cloudinary from "../config/cloudinary";
import { FileContext } from "../generated/prisma/client";

/**
 * Create a file record after successful Cloudinary upload
 */
export const createFile = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    public_id,
    secure_url,
    resource_type,
    format,
    context,
    context_id,
    is_private = false,
  } = req.body;

  const contextId = String(context_id);

  try {
    const file = await prisma.file.create({
      data: {
        public_id,
        secure_url,
        resource_type,
        format: format || null,
        context: context as FileContext,
        context_id: contextId,
        is_private: Boolean(is_private),
        uploader_id: userId,
      },
    });

    res.status(201).json({ success: true, data: file });
  } catch (error) {
    console.error("Create File Error:", error);
    res.status(500).json({ message: "Failed to create file record" });
  }
};

/**
 * Get files by context and context_id
 */
export const getFilesByContext = async (req: Request, res: Response) => {
  const { context, context_id } = req.query;

  if (!context || !context_id) {
    return res
      .status(400)
      .json({ message: "context and context_id are required" });
  }

  const contextId = String(context_id);
  if (!contextId.trim()) {
    return res
      .status(400)
      .json({ message: "context_id must be a non-empty string" });
  }

  try {
    const files = await prisma.file.findMany({
      where: {
        context: context as FileContext,
        context_id: contextId,
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        public_id: true,
        secure_url: true,
        resource_type: true,
        format: true,
        is_private: true,
        created_at: true,
        uploader_id: true,
        User: {
          select: {
            id: true,
            fname: true,
            lname: true,
          },
        },
      },
    });

    res.status(200).json({ success: true, data: files });
  } catch (error) {
    console.error("Get Files Error:", error);
    res.status(500).json({ message: "Failed to fetch files" });
  }
};

/**
 * Get a single file by ID
 */
export const getFileById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "File ID is required" });
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            fname: true,
            lname: true,
          },
        },
      },
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Generate signed URL for private files
    let signedUrl = file.secure_url;
    if (file.is_private) {
      signedUrl = cloudinary.utils.private_download_url(
        file.public_id,
        file.resource_type,
        {
          expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          attachment: false,
        }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        ...file,
        signed_url: signedUrl,
      },
    });
  } catch (error) {
    console.error("Get File Error:", error);
    res.status(500).json({ message: "Failed to fetch file" });
  }
};

/**
 * Delete a file (both from Cloudinary and database)
 */
export const deleteFile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!id) {
    return res.status(400).json({ message: "File ID is required" });
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Only uploader or admin can delete
    if (file.uploader_id !== userId && userRole !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this file" });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(file.public_id, {
        resource_type: file.resource_type as any,
        invalidate: true,
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary Delete Error:", cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await prisma.file.delete({
      where: { id },
    });

    res
      .status(200)
      .json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete File Error:", error);
    res.status(500).json({ message: "Failed to delete file" });
  }
};

/**
 * Bulk delete files by context and context_id (for cleanup)
 */
export const deleteFilesByContext = async (req: Request, res: Response) => {
  const { context, context_id } = req.body;
  const userId = (req as any).userId;
  const userRole = (req as any).role;

  if (!context || !context_id) {
    return res
      .status(400)
      .json({ message: "context and context_id are required" });
  }

  const contextId = String(context_id);
  if (!contextId.trim()) {
    return res
      .status(400)
      .json({ message: "context_id must be a non-empty string" });
  }

  try {
    const files = await prisma.file.findMany({
      where: {
        context: context as FileContext,
        context_id: contextId,
      },
    });

    // Delete each file from Cloudinary
    for (const file of files) {
      // Check authorization (uploader or admin)
      if (file.uploader_id !== userId && userRole !== "ADMIN") {
        continue; // Skip unauthorized files
      }

      try {
        await cloudinary.uploader.destroy(file.public_id, {
          resource_type: file.resource_type as any,
          invalidate: true,
        });
      } catch (cloudinaryError) {
        console.error("Cloudinary Delete Error:", cloudinaryError);
      }
    }

    // Delete from database
    const result = await prisma.file.deleteMany({
      where: {
        context: context as FileContext,
        context_id: contextId,
        OR: [
          { uploader_id: userId },
          userRole === "ADMIN" ? {} : { uploader_id: userId }, // Admin can delete all
        ],
      },
    });

    res.status(200).json({
      success: true,
      message: `${result.count} file(s) deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk Delete Files Error:", error);
    res.status(500).json({ message: "Failed to delete files" });
  }
};
