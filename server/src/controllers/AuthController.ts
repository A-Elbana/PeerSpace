import { Request, Response } from "express";
import bcrypt from "bcrypt";
const jwt = require("jsonwebtoken");
import prisma from "../config/prisma";
import { Role } from "../generated/prisma/client";

// Security constants
const BCRYPT_ROUNDS = 12; // High work factor for password hashing
const ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived refresh token
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Validation regex patterns
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

// Define the expected body for registration
interface RegisterBody {
  email: string;
  password: string;
  fname: string;
  lname: string;
  role?: Role;
}

interface LoginBody {
  email: string;
  password: string;
}

// Input validation helper
const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email) && email.length <= 255;
};

const validatePassword = (password: string): boolean => {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= 128;
};

const sanitizeString = (input: string): string => {
  return input.trim().substring(0, 255);
};

// Helper function for role entry creation
const createRoleEntry = (tx: any, userId: number, role: Role) => {
  switch (role) {
    case Role.STUDENT:
      return tx.student.create({ data: { uid: userId } });
    case Role.INSTRUCTOR:
      return tx.instructor.create({ data: { uid: userId } });
    case Role.ADMIN:
      return tx.admin.create({ data: { uid: userId } });
    default:
      throw new Error(`Invalid role provided: ${role}`);
  }
};

export const registerUser = async (
  req: Request<{}, {}, RegisterBody>,
  res: Response
) => {
  const { email, password, fname, lname, role = Role.STUDENT } = req.body;

  try {
    // Validate input presence
    if (!email || !password || !fname || !lname) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate and sanitize email
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: `Password must be between ${PASSWORD_MIN_LENGTH} and 128 characters`,
      });
    }

    // Sanitize text inputs
    const sanitizedEmail = sanitizeString(email).toLowerCase();
    const sanitizedFname = sanitizeString(fname);
    const sanitizedLname = sanitizeString(lname);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    // Hash password with high work factor (secure & constant-time resistant)
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Prisma Transaction (atomic operation)
    const result = await prisma.$transaction(async (tx) => {
      // Create the main User account
      const newUser = await tx.user.create({
        data: {
          email: sanitizedEmail,
          fname: sanitizedFname,
          lname: sanitizedLname,
          role,
          hashedPassword,
        },
      });

      // Create the corresponding role entity
      await createRoleEntry(tx, newUser.id, role);

      return newUser;
    });

    // Return success WITHOUT sensitive data
    res.status(201).json({
      message: "User registered successfully. Please log in.",
      user: {
        id: result.id,
        email: result.email,
        fname: result.fname,
        lname: result.lname,
        role: result.role,
      },
    });
  } catch (error: any) {
    console.error("Registration Error:", error);

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    if (error.code === "P2003") {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Generic error (don't leak details)
    res.status(500).json({
      message: "Registration failed. Please try again later.",
    });
  }
};

export const loginUser = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const sanitizedEmail = sanitizeString(email).toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    // Use constant-time comparison to prevent timing attacks
    if (!user) {
      // Perform dummy bcrypt operation to prevent timing attacks
      await bcrypt.compare(password, "$2b$12$dummyhashtopreventtimingattack");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if account is activated
    if (!user.activated) {
      return res.status(403).json({ message: "Account not activated" });
    }

    // Verify password using constant-time comparison (bcrypt handles this)
    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate Access Token (short-lived)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: "access" },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate Refresh Token (long-lived)
    const refreshToken = jwt.sign(
      { userId: user.id, type: "refresh" },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Store refresh token hash in database for revocation capability
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { token_hash: tokenHash },
    });

    // Return tokens WITHOUT sensitive data
    res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res
      .status(500)
      .json({ message: "Authentication failed. Please try again later." });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Revoke session by clearing token hash
    await prisma.user.update({
      where: { id: userId },
      data: { token_hash: null },
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (error: any) {
    console.error("Logout Error:", error);
    res.status(500).json({ message: "Logout failed. Please try again." });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch user WITHOUT sensitive fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fname: true,
        lname: true,
        role: true,
        avatar_url: true,
        activated: true,
        // Explicitly exclude: hashedPassword, token_hash
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error("Get Current User Error:", error);
    res.status(500).json({ message: "Failed to fetch user data" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res
        .status(403)
        .json({ message: "Invalid or expired refresh token" });
    }

    // Ensure it's a refresh token
    if (decoded.type !== "refresh") {
      return res.status(403).json({ message: "Invalid token type" });
    }

    const userId = decoded.userId;

    // Fetch user and validate stored token hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.token_hash) {
      return res
        .status(403)
        .json({ message: "Session expired. Please login again." });
    }

    // Verify refresh token against stored hash
    const isTokenValid = await bcrypt.compare(refreshToken, user.token_hash);

    if (!isTokenValid) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, type: "access" },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    console.error("Refresh Token Error:", error);
    res.status(500).json({ message: "Token refresh failed" });
  }
};
