import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * Validation error handler middleware
 * Checks for validation errors and returns formatted response
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((err: any) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }

  next();
};

/**
 * Register validation rules
 */
export const validateRegister = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email format"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),

  body("fname")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("lname")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("role")
    .optional()
    .isIn(["STUDENT", "INSTRUCTOR", "ADMIN"])
    .withMessage("Invalid role. Must be STUDENT, INSTRUCTOR, or ADMIN"),
];

/**
 * Login validation rules
 */
export const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Invalid email format"),

  body("password").notEmpty().withMessage("Password is required"),
];

/**
 * Refresh token validation rules
 */
export const validateRefreshToken = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required")
    .isJWT()
    .withMessage("Invalid refresh token format"),
];

/**
 * User update validation rules
 */
export const validateUserUpdate = [
  body("fname")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("lname")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  body("avatar_url")
    .optional()
    .isURL()
    .withMessage("Invalid avatar URL format"),
];

/**
 * Community creation validation rules
 */
export const validateCommunityCreate = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Community name is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Community name must be between 3 and 100 characters"),

  body("type")
    .notEmpty()
    .withMessage("Community type is required")
    .isIn(["PUBLIC", "PRIVATE", "public", "private"])
    .withMessage("Type must be PUBLIC or PRIVATE"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("banner_url")
    .optional()
    .isURL()
    .withMessage("Invalid banner URL format"),
];

/**
 * Community update validation rules
 */
export const validateCommunityUpdate = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Community name cannot be empty")
    .isLength({ min: 3, max: 100 })
    .withMessage("Community name must be between 3 and 100 characters"),

  body("type")
    .optional()
    .isIn(["PUBLIC", "PRIVATE", "public", "private"])
    .withMessage("Type must be PUBLIC or PRIVATE"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),

  body("banner_url")
    .optional()
    .isURL()
    .withMessage("Invalid banner URL format"),
];

/**
 * Add student to community validation
 */
export const validateAddStudent = [
  body("studentId")
    .notEmpty()
    .withMessage("Student ID is required")
    .isInt({ min: 1 })
    .withMessage("Student ID must be a positive integer"),
];
