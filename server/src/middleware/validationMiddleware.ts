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
 * Admin creation validation rules (same as register, but no role field)
 */
export const validateAdminCreate = [
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

  body("avatar_file_id")
    .optional()
    .isUUID()
    .withMessage("avatar_file_id must be a valid UUID"),

  body("password")
    .optional()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),

  body("currentPassword")
    .if(body("password").exists())
    .notEmpty()
    .withMessage("Current password is required when setting a new password"),
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

  body("banner_file_id")
    .optional()
    .isUUID()
    .withMessage("banner_file_id must be a valid UUID"),
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

/**
 * Assignment creation validation rules
 */
export const validateAssignmentCreate = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Assignment title is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("cid")
    .notEmpty()
    .withMessage("Community ID (cid) is required")
    .isUUID()
    .withMessage("Invalid community ID format"),

  body("due_date")
    .optional()
    .isISO8601()
    .withMessage("due_date must be a valid ISO 8601 date string"),

  body("max_points")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("max_points must be a non-negative number"),

  body("canBeLate")
    .optional()
    .isBoolean()
    .withMessage("canBeLate must be a boolean value"),
];

/**
 * Assignment update validation rules
 */
export const validateAssignmentUpdate = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("due_date")
    .optional()
    .isISO8601()
    .withMessage("due_date must be a valid ISO 8601 date string"),

  body("max_points")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("max_points must be a non-negative number"),

  body("canBeLate")
    .optional()
    .isBoolean()
    .withMessage("canBeLate must be a boolean value"),
];

/**
 * Cloudinary upload signature validation rules
 */
export const validateUploadSign = [
  body("context")
    .isIn([
      "POST",
      "SUBMISSION",
      "NOTE",
      "ASSIGNMENT",
      "COMMUNITY_BANNER",
      "USER_AVATAR",
    ])
    .withMessage(
      "context must be one of POST, SUBMISSION, NOTE, ASSIGNMENT, COMMUNITY_BANNER, USER_AVATAR"
    ),

  body("context_id")
    .isString()
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage("context_id must be a non-empty string up to 128 characters"),

  body("is_private")
    .optional()
    .isBoolean()
    .withMessage("is_private must be a boolean"),

  body("folder")
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage("folder must be a string up to 255 characters"),

  body("resource_type")
    .optional()
    .isIn(["auto", "image", "video", "raw"])
    .withMessage("resource_type must be one of auto, image, video, raw"),
];

/**
 * Note creation validation rules
 */
export const validateNoteCreate = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Note title is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("body").optional().isString().withMessage("Body must be a string"),

  body("notebook_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("notebook_id must be a positive integer"),
];

/**
 * Note update validation rules
 */
export const validateNoteUpdate = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("body").optional().isString().withMessage("Body must be a string"),

  body("notebook_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("notebook_id must be a positive integer"),
];

/**
 * Notebook creation validation rules
 */
export const validateNotebookCreate = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Notebook title is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

/**
 * Notebook update validation rules
 */
export const validateNotebookUpdate = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

/**
 * Task creation validation rules
 */
export const validateTaskCreate = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  body("priority")
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage("Priority must be an integer between 0 and 10"),

  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  body("end_date")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isInt({ min: 0, max: 4 })
    .withMessage("Status must be an integer between 0 and 4 (0: Not Started, 1: In Progress, 2: Completed, 3: On Hold, 4: Cancelled)"),

  body("parent_task")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("parent_task must be a positive integer"),

  body("assignment_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("assignment_id must be a positive integer"),
];

/**
 * Task update validation rules
 */
export const validateTaskUpdate = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Title must be between 1 and 255 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  body("priority")
    .optional({ nullable: true })
    .isInt({ min: 0, max: 10 })
    .withMessage("Priority must be an integer between 0 and 10"),

  body("start_date")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  body("end_date")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),

  body("status")
    .optional()
    .isInt({ min: 0, max: 4 })
    .withMessage("Status must be an integer between 0 and 4"),

  body("parent_task")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("parent_task must be a positive integer"),
];

/**
 * Task status update validation rules
 */
export const validateTaskStatusUpdate = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isInt({ min: 0, max: 4 })
    .withMessage("Status must be an integer between 0 and 4"),
];

/**
 * Badge creation validation rules
 */
export const validateBadgeCreate = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Badge name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Badge name must be between 1 and 255 characters"),

  body("icon_url")
    .trim()
    .notEmpty()
    .withMessage("Icon URL is required")
    .isURL()
    .withMessage("Icon URL must be a valid URL"),
];

/**
 * Badge update validation rules
 */
export const validateBadgeUpdate = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Badge name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Badge name must be between 1 and 255 characters"),

  body("icon_url")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Icon URL cannot be empty")
    .isURL()
    .withMessage("Icon URL must be a valid URL"),
];

