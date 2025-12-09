import { Request, Response, NextFunction } from "express";
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  type: string;
}

/**
 * Authentication middleware to verify JWT access tokens
 * Validates token signature, expiration, and token type
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Ensure it's an access token (not refresh token)
    if (decoded.type !== "access") {
      return res.status(403).json({ message: "Invalid token type" });
    }

    // Attach user info to request object
    (req as any).userId = decoded.userId;
    (req as any).role = decoded.role;
    (req as any).email = decoded.email;

    next();
  } catch (error: any) {
    // Handle specific JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token" });
    }

    console.error("Token verification failed:", error);
    return res.status(403).json({ message: "Authentication failed" });
  }
};

/**
 * Optional authentication middleware
 * Attempts to verify JWT token if provided, but does not fail if missing
 * Allows both authenticated and unauthenticated requests
 */
export const optionalAuthenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    // No token provided - continue as unauthenticated guest
    return next();
  }

  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Ensure it's an access token (not refresh token)
    if (decoded.type !== "access") {
      // Invalid token type - continue as guest
      return next();
    }

    // Attach user info to request object
    (req as any).userId = decoded.userId;
    (req as any).role = decoded.role;
    (req as any).email = decoded.email;

    next();
  } catch (error: any) {
    // Token verification failed - continue as guest
    console.debug(
      "Optional token verification failed, continuing as guest:",
      error.message
    );
    next();
  }
};

/**
 * Role-based authorization middleware
 * Restricts access to specific roles
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).role;

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
};
