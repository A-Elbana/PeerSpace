import { Request, Response, NextFunction } from "express";

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Global error handler middleware
 * Should be added as the LAST middleware in app.ts
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error("Error:", {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // Handle custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === "development" && { details: err.details }),
    });
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as any;

    // Unique constraint violation
    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: `A record with this ${
          prismaErr.meta?.target?.[0] || "field"
        } already exists`,
      });
    }

    // Record not found
    if (prismaErr.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    // Foreign key constraint violation
    if (prismaErr.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid reference: The related record does not exist",
      });
    }

    // Validation error
    if (prismaErr.code === "P2012") {
      return res.status(400).json({
        success: false,
        message: "Required field is missing",
      });
    }
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token has expired",
    });
  }

  // Handle validation errors (from express-validator if not caught earlier)
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: (err as any).details,
    });
  }

  // Handle syntax errors (malformed JSON)
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
    });
  }

  // Default 500 error
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
};

/**
 * Async error wrapper to catch errors in async route handlers
 * Usage: router.get("/route", asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
